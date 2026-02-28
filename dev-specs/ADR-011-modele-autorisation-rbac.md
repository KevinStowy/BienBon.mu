# ADR-011 : Modele d'autorisation -- RBAC hybride avec permissions contextuelles

| Champ         | Valeur                                                    |
|---------------|-----------------------------------------------------------|
| **Statut**    | Propose                                                   |
| **Date**      | 2026-02-27                                                |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                       |
| **Decideurs** | Equipe technique BienBon                                  |
| **Scope**     | Autorisation, roles, permissions, multi-commerce, mode invite |
| **Prereqs**   | ADR-001 (stack backend), ADR-002 (architecture), ADR-010 (authentification) |
| **Refs**      | US-C013, US-P001-P003, US-P007, US-A004-A017, US-A018-A022, US-A027-A043, US-T001 |

---

## 1. Contexte

L'ADR-010 a tranche les questions d'authentification : Supabase Auth avec JWT, `app_metadata.roles[]` pour le multi-role. Cette ADR traite de l'autorisation -- c'est-a-dire, une fois l'utilisateur authentifie, **que peut-il faire ?**

BienBon.mu a trois types d'acteurs avec des niveaux de permissions tres differents :

**Consommateur (69 US)** : browse, reserver, payer, retirer, avis, reclamations, favoris, profil, notifications, gamification, parrainage. Certaines actions sont accessibles en mode invite (browse sans inscription).

**Partenaire (45 US)** : gerer N commerces, creer/modifier/archiver des paniers, valider les pickups (QR/PIN), consulter ses analytics et reversements. Toute modification de fiche commerce necessite une approbation admin. L'inscription elle-meme passe par un workflow de validation en 4 etapes.

**Admin (43 US)** : dashboard KPI, validation inscriptions et modifications, suspension/bannissement, resolution reclamations, moderation avis, gestion financiere (commission, ledger, payouts), configuration systeme, audit trail. L'US-A015 et US-A022 mentionnent explicitement un "super-admin" capable de lever un bannissement.

### Contraintes identifiees dans les specs

| Contrainte | Source | Description |
|------------|--------|-------------|
| Multi-role | ADR-010, section 3.4 | Un meme compte peut etre consumer + partner (restaurateur qui achete aussi des paniers) |
| Multi-commerce | US-P007 | Un partenaire peut gerer N commerces, avec selecteur pour basculer |
| Statuts partenaire | US-P001, US-A013-A015 | `pending`, `active`, `suspended`, `banned` -- conditionnent l'acces |
| Statuts consommateur | US-A020-A022 | `active`, `suspended`, `banned` -- conditionnent l'acces |
| Mode invite | US-C013 | Browse sans JWT, mais pas de reservation/favoris/avis |
| Super-admin | US-A015, US-A022 | Seul un "super-admin" peut lever un bannissement |
| Validation admin requise | US-P007, US-A007-A008 | Les modifications de fiche commerce passent par un workflow d'approbation |
| Audit trail complet | US-A031-A037 | Chaque action admin est tracee avec l'identite de l'admin |
| Check statut a chaque requete | US-T001 | Verification du statut du compte (suspension/bannissement) a chaque requete authentifiee |

---

## 2. Questions a trancher

| #  | Question |
|----|----------|
| Q1 | Un user peut-il etre consommateur ET partenaire ? Si oui, un ou deux comptes ? |
| Q2 | Granularite des permissions admin : un role unique ou des sous-roles ? |
| Q3 | Multi-commerce : permissions par commerce ? Delegation a des employes ? |
| Q4 | Mode invite : comment modeliser l'absence d'authentification ? |
| Q5 | Quel modele d'autorisation : RBAC simple, RBAC+permissions, ABAC, RLS ? |
| Q6 | Ou vivent les permissions : `app_metadata` Supabase, table BD, ou les deux ? |

---

## 3. Options evaluees

### 3.1 Modele d'autorisation

#### Option A : RBAC simple (Role-Based Access Control)

Trois roles fixes : `consumer`, `partner`, `admin`. Chaque role a un set fixe de permissions implicites. Les guards NestJS verifient le role.

**Avantages :**
- Trivial a implementer : un decorateur `@Roles('admin')` sur le controller suffit
- Zero table supplementaire : les roles vivent dans `app_metadata.roles[]`
- Rapide a verifier (O(1) : le role est dans le JWT)
- Suffisant pour 80% des cas d'usage

**Inconvenients :**
- Pas de granularite : un "admin" peut tout faire, impossible d'avoir un "moderateur" qui ne voit pas la finance
- Le multi-commerce n'est pas couvert (quel partenaire a acces a quel commerce ?)
- Le statut du partenaire (`pending`, `suspended`, etc.) n'est pas un role -- il faut un check supplementaire
- L'US-A015 mentionne explicitement un "super-admin" : le RBAC simple ne le distingue pas d'un admin normal

#### Option B : RBAC + permissions granulaires

Roles + permissions fines associees. Ex : un admin a les permissions `partners:validate`, `claims:resolve`, `payouts:approve`. Un sous-role "moderateur" n'aurait que `claims:resolve` et `reviews:moderate`.

**Avantages :**
- Permet les sous-roles admin (super-admin, moderateur, finance, support)
- Extensible : ajouter une permission = ajouter une entree en base
- Conforme a l'US-A015 ("seul un super-admin peut lever un bannissement")
- Auditabilite : on sait exactement quelle permission a ete utilisee

**Inconvenients :**
- Plus de code : table `permissions`, table `role_permissions`, logique de resolution
- Check plus lent (lecture BD ou cache) vs un simple check de role dans le JWT
- Risque de sur-ingenierie si l'equipe n'a que 2-3 admins au lancement
- Les permissions doivent etre synchronisees entre le JWT et la base

#### Option C : ABAC (Attribute-Based Access Control)

Permissions basees sur une combinaison d'attributs : role + statut + propriete de la ressource + contexte.
Ex : "peut modifier un panier SI role=partner ET partner.status=active ET panier.commerce_id IN partner.commerces ET panier.has_no_reservations".

**Avantages :**
- Extremement puissant et flexible
- Couvre nativement le multi-commerce, les statuts, les regles metier complexes
- Un seul moteur de regles pour tout

**Inconvenients :**
- **Complexite disproportionnee** pour une startup de 2-5 devs
- Necessite un moteur de regles (CASL, Casbin, ou custom) -- courbe d'apprentissage significative
- Debugging difficile : "pourquoi l'acces est-il refuse ?" necessite de tracer toutes les conditions
- Performances : chaque requete evalue N conditions potentiellement couteuses
- Overhead de maintenance : chaque nouvelle feature necessite de definir ses regles ABAC

#### Option D : RLS Supabase + Guards NestJS (double couche)

Row Level Security dans PostgreSQL pour les acces directs a la DB (Supabase Realtime, PostgREST si utilise). Guards NestJS pour l'API backend.

**Avantages :**
- Defense en profondeur : meme si un bug dans le backend expose des donnees, le RLS bloque au niveau SQL
- RLS est gratuit en performance (evalue par PostgreSQL avant de retourner les lignes)
- Coherent avec l'ecosysteme Supabase (les RLS policies utilisent `auth.jwt()`)
- Le Realtime Supabase (utilise pour la synchro de stock) necessite le RLS de toute facon

**Inconvenients :**
- Deux systemes d'autorisation a maintenir (RLS + Guards) -- risque de divergence
- Le RLS est puissant mais verbeux pour les cas complexes (multi-commerce, workflows d'approbation)
- Le debugging RLS est moins ergonomique que le debugging code
- Les regles metier complexes (workflow de validation, statuts) sont plus claires dans le code NestJS

---

### 3.2 Multi-role : un compte ou deux ?

| Option | Description | Evaluation |
|--------|-------------|------------|
| **MR1 : Un compte, multiple roles** | `app_metadata.roles: ["consumer", "partner"]`. Le user switch de contexte dans l'UI sans se deconnecter. | **Recommande.** Decide dans l'ADR-010 (section 3.4). Un restaurateur qui achete des paniers chez d'autres = un seul compte. Pas de duplication, pas de confusion. |
| MR2 : Deux comptes separes | Meme email, deux comptes distincts avec des roles differents. | Rejete : UX catastrophique, duplication de donnees, impossible de lier l'historique. |

### 3.3 Granularite admin

| Option | Description | Evaluation |
|--------|-------------|------------|
| GA1 : Admin unique tout-puissant | Un seul role `admin`, zero granularite. | Insuffisant : les specs mentionnent "super-admin" (US-A015, US-A022). Au lancement avec 2 admins ca fonctionne, mais c'est une dette technique immediate. |
| **GA2 : Admin + super-admin, extensible** | Deux niveaux au lancement (`admin`, `super_admin`). Les permissions fines sont definies en code (enum) mais pas encore en base. Extensible vers des sous-roles (moderateur, finance) quand le besoin se presente. | **Recommande.** Pragmatique : 2 niveaux suffisent au lancement. L'extension vers des permissions granulaires est possible sans migration de schema. |
| GA3 : Sous-roles admin complets (super-admin, moderateur, finance, support) | 4+ sous-roles avec des matrices de permissions en base. | Premature : les specs ne demandent que "super-admin" vs "admin". Avec 2-5 admins au lancement, 4 sous-roles est de la sur-ingenierie. |

### 3.4 Mode invite

| Option | Description | Evaluation |
|--------|-------------|------------|
| **MI1 : Pas de JWT, endpoints publics** | Les endpoints de browse (liste paniers, fiche partenaire, carte, filtres) sont publics et ne necessitent aucun token. Les endpoints d'action (reserver, ajouter favori, laisser un avis) exigent un JWT valide et retournent un 401 si absent. | **Recommande.** Le plus simple. Aucun JWT anonyme a gerer. Le client Flutter affiche un ecran de connexion quand il recoit un 401. Conforme a US-C013. |
| MI2 : JWT anonyme (Supabase anonymous auth) | Creer un user anonyme avec un JWT sans roles. Le JWT est upgrade en vrai user a l'inscription. | Over-engineered : Supabase supporte le anonymous auth, mais ca cree des lignes fantomes dans `auth.users`. Pas de benefice reel pour BienBon -- le mode invite ne fait que du browse en lecture seule. |
| MI3 : Token temporaire custom | Generer un token non-Supabase pour les invites. | Complexe sans valeur ajoutee. Les endpoints de browse sont en lecture seule, pas besoin de token. |

---

## 4. Decision

### Modele d'autorisation : RBAC pragmatique avec contexte metier (Option B simplifiee + Option D pour le Realtime)

Ni un RBAC pur (trop simpliste), ni un ABAC complet (trop complexe). Un **RBAC ou les guards NestJS integrent le contexte metier** (statut du compte, propriete du commerce) de facon explicite et lisible dans le code.

**Concretement :**

1. **Les roles** (`consumer`, `partner`, `admin`, `super_admin`) vivent dans `app_metadata.roles[]` du JWT Supabase et sont dupliques dans la table `user_roles` en base.

2. **Le statut du compte** (`active`, `pending`, `suspended`, `banned`) est verifie a chaque requete authentifiee par un middleware global NestJS (conforme a US-T001).

3. **Les permissions admin** sont definies comme un enum TypeScript. Au lancement, `admin` a toutes les permissions sauf `unban_user` et `manage_admins`, reservees a `super_admin`. L'extension vers des sous-roles se fera quand le besoin se presente.

4. **Le multi-commerce** est gere par une table de liaison `partner_stores` avec un role par store (`owner`, `manager`, `staff`). Les guards verifient que le partenaire a un lien actif avec le commerce vise.

5. **Le RLS Supabase** est active pour les tables accedees via Supabase Realtime (stock paniers, reservations) comme filet de securite. La logique d'autorisation principale reste dans les guards NestJS.

6. **Le mode invite** = endpoints publics sans JWT. Pas de token anonyme.

---

## 5. Modele de donnees

### 5.1 Schema Prisma

```prisma
// ============================================================
// ROLES & PERMISSIONS
// ============================================================

model User {
  id              String           @id @default(uuid())
  supabaseId      String           @unique @map("supabase_id")
  email           String?          @unique
  phone           String?          @unique
  firstName       String           @map("first_name")
  lastName        String           @map("last_name")
  avatarUrl       String?          @map("avatar_url")
  status          UserStatus       @default(ACTIVE)
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")

  // Relations
  roles           UserRole[]
  consumerProfile ConsumerProfile?
  partnerProfile  PartnerProfile?
  adminProfile    AdminProfile?
  auditLogs       AuditLog[]       @relation("AuditActor")

  @@map("users")
}

enum UserStatus {
  ACTIVE
  PENDING_VERIFICATION  // email/phone non verifie
  SUSPENDED
  BANNED
  DELETED               // soft-delete (DPA compliance)
}

model UserRole {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  role      Role
  grantedAt DateTime @default(now()) @map("granted_at")
  grantedBy String?  @map("granted_by") // admin qui a attribue le role (null si auto)
  revokedAt DateTime? @map("revoked_at")

  user      User     @relation(fields: [userId], references: [id])

  @@unique([userId, role])
  @@index([userId])
  @@map("user_roles")
}

enum Role {
  CONSUMER
  PARTNER
  ADMIN
  SUPER_ADMIN
}

// ============================================================
// CONSUMER
// ============================================================

model ConsumerProfile {
  id                String   @id @default(uuid())
  userId            String   @unique @map("user_id")
  dietaryPrefs      String[] @map("dietary_prefs") // tags: halal, vegan, etc.
  referralCode      String?  @unique @map("referral_code")
  notificationPrefs Json     @default("{}") @map("notification_prefs")
  createdAt         DateTime @default(now()) @map("created_at")

  user              User     @relation(fields: [userId], references: [id])

  @@map("consumer_profiles")
}

// ============================================================
// PARTNER & MULTI-COMMERCE
// ============================================================

model PartnerProfile {
  id              String          @id @default(uuid())
  userId          String          @unique @map("user_id")
  status          PartnerStatus   @default(PENDING)
  statusReason    String?         @map("status_reason") // motif suspension/bannissement/rejet
  statusChangedAt DateTime?       @map("status_changed_at")
  statusChangedBy String?         @map("status_changed_by") // admin_id
  submittedAt     DateTime        @default(now()) @map("submitted_at")
  validatedAt     DateTime?       @map("validated_at")
  validatedBy     String?         @map("validated_by") // admin_id
  registrationChannel RegistrationChannel @default(WEB) @map("registration_channel")
  createdAt       DateTime        @default(now()) @map("created_at")

  user            User            @relation(fields: [userId], references: [id])
  storeLinks      PartnerStore[]

  @@map("partner_profiles")
}

enum PartnerStatus {
  PENDING    // inscription soumise, en attente de validation admin
  ACTIVE     // valide par admin, peut operer
  SUSPENDED  // desactive temporairement par admin
  BANNED     // exclu definitivement
  REJECTED   // inscription rejetee par admin
}

enum RegistrationChannel {
  WEB       // auto-inscription depuis bienbon.mu
  ADMIN     // inscrit manuellement par un admin (US-A009)
  FIELD_KIT // inscrit via le kit terrain tablette (US-A010)
}

model Store {
  id              String          @id @default(uuid())
  name            String
  type            StoreType
  description     String
  address         String
  city            String
  postalCode      String?         @map("postal_code")
  latitude        Float
  longitude       Float
  phone           String
  brn             String          // Business Registration Number
  foodLicence     String?         @map("food_licence") // Food Dealer's Licence (si applicable)
  status          StoreStatus     @default(ACTIVE)
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  // Relations
  partnerLinks    PartnerStore[]

  @@map("stores")
}

enum StoreStatus {
  ACTIVE
  INACTIVE     // desactive par le partenaire
  SUSPENDED    // suspension admin heritee du partenaire
}

enum StoreType {
  RESTAURANT
  HOTEL
  SUPERMARKET
  BAKERY       // boulangerie
  PATISSERIE
  CATERER      // traiteur
  FLORIST      // fleuriste
  GROCERY      // epicerie
  OTHER
}

// Table de liaison : un partenaire peut avoir N commerces,
// un commerce appartient a un partenaire (et potentiellement,
// dans le futur, des employes avec des roles differents)
model PartnerStore {
  id              String          @id @default(uuid())
  partnerId       String          @map("partner_id")
  storeId         String          @map("store_id")
  storeRole       StoreRole       @default(OWNER) @map("store_role")
  grantedAt       DateTime        @default(now()) @map("granted_at")
  grantedBy       String?         @map("granted_by") // null si auto (creation)
  revokedAt       DateTime?       @map("revoked_at")

  partner         PartnerProfile  @relation(fields: [partnerId], references: [id])
  store           Store           @relation(fields: [storeId], references: [id])

  @@unique([partnerId, storeId])
  @@index([partnerId])
  @@index([storeId])
  @@map("partner_stores")
}

enum StoreRole {
  OWNER    // le responsable qui a cree le commerce, tous les droits
  MANAGER  // peut gerer les paniers, voir les stats, valider les pickups
  STAFF    // peut uniquement valider les pickups (scan QR / saisir PIN)
}

// ============================================================
// ADMIN
// ============================================================

model AdminProfile {
  id              String          @id @default(uuid())
  userId          String          @unique @map("user_id")
  department      String?         // ex: "moderation", "finance", "support"
  createdAt       DateTime        @default(now()) @map("created_at")
  createdBy       String?         @map("created_by") // super_admin qui a cree ce compte

  user            User            @relation(fields: [userId], references: [id])

  @@map("admin_profiles")
}

// ============================================================
// AUDIT LOG
// ============================================================

model AuditLog {
  id              String          @id @default(uuid())
  actorId         String?         @map("actor_id") // null pour les actions systeme
  actorRole       Role?           @map("actor_role")
  action          String          // ex: "partner.validate", "claim.resolve"
  resourceType    String?         @map("resource_type") // ex: "partner", "basket", "claim"
  resourceId      String?         @map("resource_id")
  details         Json            @default("{}") // before/after, motif, etc.
  ipAddress       String?         @map("ip_address")
  userAgent       String?         @map("user_agent")
  createdAt       DateTime        @default(now()) @map("created_at")

  actor           User?           @relation("AuditActor", fields: [actorId], references: [id])

  @@index([actorId])
  @@index([action])
  @@index([resourceType, resourceId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### 5.2 Diagramme ER simplifie

```
┌────────────────────┐
│   auth.users       │  (Supabase -- source de verite auth)
│   (GoTrue)         │
│                    │
│  app_metadata:     │
│    roles: [...]    │
│    partner_status   │
└─────────┬──────────┘
          │ supabase_id
          │
┌─────────v──────────┐       ┌──────────────────┐
│   users            │       │   user_roles     │
│                    │──1:N──│                  │
│  id (PK)           │       │  user_id (FK)    │
│  supabase_id (UQ)  │       │  role (enum)     │
│  status (enum)     │       │  granted_at      │
│  ...               │       │  granted_by      │
└─────────┬──────────┘       └──────────────────┘
          │
     ┌────┼────────────────┐
     │    │                │
     v    v                v
┌────────────┐  ┌────────────────┐  ┌───────────────┐
│ consumer_  │  │ partner_       │  │ admin_        │
│ profiles   │  │ profiles       │  │ profiles      │
│            │  │                │  │               │
│ dietary_   │  │ status (enum)  │  │ department    │
│ prefs      │  │ validated_at   │  │ created_by    │
│ referral_  │  │ validated_by   │  └───────────────┘
│ code       │  │ reg_channel    │
└────────────┘  └───────┬────────┘
                        │
                   1:N  │
                        v
                ┌──────────────────┐       ┌──────────────┐
                │ partner_stores   │──N:1──│   stores     │
                │                  │       │              │
                │ partner_id (FK)  │       │ id (PK)      │
                │ store_id (FK)    │       │ name         │
                │ store_role (enum)│       │ type         │
                │ granted_at       │       │ brn          │
                └──────────────────┘       │ status       │
                                           └──────────────┘
```

### 5.3 Synchronisation `app_metadata` <-> table `user_roles`

Le JWT Supabase contient les roles dans `app_metadata.roles[]`. C'est la source de verite pour l'authentification (le JWT est verifie par le guard NestJS sans appel BD). La table `user_roles` est la source de verite pour les requetes et l'historique.

**Strategie de synchronisation :**

```
Inscription consommateur :
  1. Supabase cree le user dans auth.users
  2. Webhook "user.created" → NestJS cree le user dans public.users
     + ajoute le role CONSUMER dans user_roles
  3. NestJS appelle supabase.auth.admin.updateUserById() pour
     set app_metadata.roles = ["consumer"]

Validation partenaire par admin :
  1. Admin valide dans le backoffice → endpoint NestJS
  2. NestJS ajoute le role PARTNER dans user_roles
  3. NestJS met a jour partner_profiles.status = ACTIVE
  4. NestJS appelle supabase.auth.admin.updateUserById() pour
     ajouter "partner" a app_metadata.roles
  5. Le prochain JWT emis par Supabase contient le role partner

Suspension :
  1. Admin suspend → endpoint NestJS
  2. NestJS met a jour users.status = SUSPENDED
  3. NestJS appelle supabase.auth.admin.updateUserById() pour
     set app_metadata.status = "suspended"
  4. Le middleware global NestJS verifie le statut a chaque requete
     et retourne 403 si suspended/banned
```

**Pourquoi cette dualite ?**
- Le JWT contient les roles pour les verifications rapides (zero BD) dans les guards
- La table `user_roles` contient l'historique (qui a attribue le role, quand, revocation)
- Le RLS Supabase utilise le JWT (`auth.jwt() -> app_metadata.roles`) pour les politiques de securite sur les tables accedees directement par le client

---

## 6. Implementation NestJS

### 6.1 Enum des permissions admin

```typescript
// src/auth/permissions.enum.ts

export enum AdminPermission {
  // -- Partenaires --
  PARTNERS_VIEW          = 'partners:view',
  PARTNERS_VALIDATE      = 'partners:validate',
  PARTNERS_REJECT        = 'partners:reject',
  PARTNERS_EDIT          = 'partners:edit',
  PARTNERS_SUSPEND       = 'partners:suspend',
  PARTNERS_REACTIVATE    = 'partners:reactivate',
  PARTNERS_BAN           = 'partners:ban',
  PARTNERS_UNBAN         = 'partners:unban',        // super_admin uniquement
  PARTNERS_REGISTER      = 'partners:register',     // inscription manuelle/kit terrain
  PARTNERS_COMMISSION    = 'partners:commission',

  // -- Store modifications --
  STORE_MODS_VIEW        = 'store_mods:view',
  STORE_MODS_VALIDATE    = 'store_mods:validate',
  STORE_MODS_REJECT      = 'store_mods:reject',

  // -- Consommateurs --
  CONSUMERS_VIEW         = 'consumers:view',
  CONSUMERS_SUSPEND      = 'consumers:suspend',
  CONSUMERS_REACTIVATE   = 'consumers:reactivate',
  CONSUMERS_BAN          = 'consumers:ban',
  CONSUMERS_UNBAN        = 'consumers:unban',       // super_admin uniquement

  // -- Moderation --
  CLAIMS_VIEW            = 'claims:view',
  CLAIMS_RESOLVE         = 'claims:resolve',
  REVIEWS_VIEW           = 'reviews:view',
  REVIEWS_DELETE         = 'reviews:delete',

  // -- Finance --
  FINANCE_VIEW           = 'finance:view',
  FINANCE_COMMISSION     = 'finance:commission',    // modifier les params globaux
  FINANCE_PAYOUTS        = 'finance:payouts',       // generer les releves

  // -- Anti-fraude --
  FRAUD_VIEW             = 'fraud:view',
  FRAUD_INVESTIGATE      = 'fraud:investigate',
  FRAUD_MERGE_ACCOUNTS   = 'fraud:merge_accounts',

  // -- Systeme --
  SETTINGS_VIEW          = 'settings:view',
  SETTINGS_EDIT          = 'settings:edit',         // categories, tags, jours feries
  AUDIT_VIEW             = 'audit:view',
  AUDIT_EXPORT           = 'audit:export',

  // -- Admin management --
  ADMINS_CREATE          = 'admins:create',         // super_admin uniquement
  ADMINS_DEACTIVATE      = 'admins:deactivate',     // super_admin uniquement
}
```

### 6.2 Mapping role → permissions (en code, pas en base)

```typescript
// src/auth/role-permissions.map.ts

import { Role } from '@prisma/client';
import { AdminPermission } from './permissions.enum';

/**
 * Mapping role -> permissions.
 *
 * Au lancement, on a deux niveaux admin. Si le besoin de sous-roles
 * emerge (moderateur, finance), on migrera ce mapping vers une table
 * role_permissions en base. Le code applicatif (guards) ne changera pas
 * car il verifie les permissions, pas les roles directement.
 */
export const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  [Role.ADMIN]: [
    // Partenaires (tout sauf unban)
    AdminPermission.PARTNERS_VIEW,
    AdminPermission.PARTNERS_VALIDATE,
    AdminPermission.PARTNERS_REJECT,
    AdminPermission.PARTNERS_EDIT,
    AdminPermission.PARTNERS_SUSPEND,
    AdminPermission.PARTNERS_REACTIVATE,
    AdminPermission.PARTNERS_BAN,
    AdminPermission.PARTNERS_REGISTER,
    AdminPermission.PARTNERS_COMMISSION,

    // Store modifications
    AdminPermission.STORE_MODS_VIEW,
    AdminPermission.STORE_MODS_VALIDATE,
    AdminPermission.STORE_MODS_REJECT,

    // Consommateurs (tout sauf unban)
    AdminPermission.CONSUMERS_VIEW,
    AdminPermission.CONSUMERS_SUSPEND,
    AdminPermission.CONSUMERS_REACTIVATE,
    AdminPermission.CONSUMERS_BAN,

    // Moderation
    AdminPermission.CLAIMS_VIEW,
    AdminPermission.CLAIMS_RESOLVE,
    AdminPermission.REVIEWS_VIEW,
    AdminPermission.REVIEWS_DELETE,

    // Finance (lecture seule pour admin standard)
    AdminPermission.FINANCE_VIEW,

    // Anti-fraude (lecture + investigation)
    AdminPermission.FRAUD_VIEW,
    AdminPermission.FRAUD_INVESTIGATE,

    // Systeme (lecture seule)
    AdminPermission.SETTINGS_VIEW,
    AdminPermission.AUDIT_VIEW,
    AdminPermission.AUDIT_EXPORT,
  ],

  [Role.SUPER_ADMIN]: [
    // Toutes les permissions admin
    ...Object.values(AdminPermission),
  ],
};
```

### 6.3 Decorateurs et Guards

```typescript
// src/auth/decorators/roles.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// src/auth/decorators/permissions.decorator.ts

import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from '../permissions.enum';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: AdminPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

```typescript
// src/auth/decorators/public.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```typescript
// src/auth/guards/jwt-auth.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Endpoints publics (mode invite) : pas de verification JWT
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    try {
      const { data: { user }, error } = await this.supabase
        .getAdminClient()
        .auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Token invalide');
      }

      // Attacher le user au request pour les guards suivants
      request.user = {
        id: user.id,
        email: user.email,
        roles: user.app_metadata?.roles ?? [],
        partnerStatus: user.app_metadata?.partner_status ?? null,
        status: user.app_metadata?.status ?? 'active',
      };

      return true;
    } catch {
      throw new UnauthorizedException('Token invalide ou expire');
    }
  }

  private extractToken(request: any): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
```

```typescript
// src/auth/guards/status.guard.ts
// Middleware global : verifie le statut du compte a CHAQUE requete (US-T001)

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return true; // pas de user = le JwtAuthGuard a deja rejete

    if (user.status === 'suspended') {
      throw new ForbiddenException(
        'Votre compte est suspendu. Contactez le support BienBon.',
      );
    }

    if (user.status === 'banned') {
      throw new ForbiddenException(
        'Votre compte a ete banni de la plateforme.',
      );
    }

    return true;
  }
}
```

```typescript
// src/auth/guards/roles.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const userRoles: string[] = user.roles ?? [];

    // SUPER_ADMIN a acces a tout ce qui requiert ADMIN
    const hasRole = requiredRoles.some(
      (role) =>
        userRoles.includes(role.toLowerCase()) ||
        (role === Role.ADMIN && userRoles.includes('super_admin')),
    );

    if (!hasRole) {
      throw new ForbiddenException('Acces refuse : role insuffisant');
    }

    return true;
  }
}
```

```typescript
// src/auth/guards/permissions.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminPermission } from '../permissions.enum';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLE_PERMISSIONS } from '../role-permissions.map';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      AdminPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const userRoles: string[] = user.roles ?? [];

    // Resoudre les permissions de l'utilisateur a partir de ses roles
    const userPermissions = new Set<AdminPermission>();
    for (const role of userRoles) {
      const perms = ROLE_PERMISSIONS[role.toUpperCase()] ?? [];
      perms.forEach((p) => userPermissions.add(p));
    }

    // Verifier que TOUTES les permissions requises sont presentes
    const hasAllPermissions = requiredPermissions.every((p) =>
      userPermissions.has(p),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Acces refuse : permission insuffisante');
    }

    return true;
  }
}
```

```typescript
// src/auth/guards/partner-status.guard.ts
// Verifie que le partenaire est en statut ACTIVE pour les actions partenaire

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class ActivePartnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user.roles?.includes('partner')) {
      return true; // pas un partenaire, ce guard ne s'applique pas
    }

    if (user.partnerStatus === 'pending') {
      throw new ForbiddenException(
        'Votre inscription est en attente de validation par BienBon.',
      );
    }

    if (user.partnerStatus === 'rejected') {
      throw new ForbiddenException(
        'Votre inscription a ete rejetee. Consultez votre email pour les details.',
      );
    }

    // suspended et banned sont deja geres par AccountStatusGuard

    return true;
  }
}
```

```typescript
// src/auth/guards/store-access.guard.ts
// Verifie que le partenaire a acces au commerce vise
// et le bon role (OWNER, MANAGER, STAFF)

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { StoreRole } from '@prisma/client';

export const STORE_ROLES_KEY = 'storeRoles';
export const RequireStoreRoles = (...roles: StoreRole[]) =>
  SetMetadata(STORE_ROLES_KEY, roles);

@Injectable()
export class StoreAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();

    // Ce guard ne s'applique qu'aux partenaires
    if (!user.roles?.includes('partner')) return true;

    const request = context.switchToHttp().getRequest();
    const storeId =
      request.params.storeId ||
      request.body?.storeId ||
      request.query?.storeId;

    if (!storeId) return true; // pas de store_id dans la requete

    // Verifier le lien partenaire-commerce
    const link = await this.prisma.partnerStore.findFirst({
      where: {
        partner: { userId: user.id },
        storeId,
        revokedAt: null, // lien actif
      },
    });

    if (!link) {
      throw new ForbiddenException(
        'Vous n\'avez pas acces a ce commerce.',
      );
    }

    // Verifier le role minimal requis sur ce commerce
    const requiredStoreRoles = this.reflector.getAllAndOverride<StoreRole[]>(
      STORE_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredStoreRoles && requiredStoreRoles.length > 0) {
      const roleHierarchy: Record<StoreRole, number> = {
        [StoreRole.OWNER]: 3,
        [StoreRole.MANAGER]: 2,
        [StoreRole.STAFF]: 1,
      };

      const userLevel = roleHierarchy[link.storeRole];
      const requiredLevel = Math.min(
        ...requiredStoreRoles.map((r) => roleHierarchy[r]),
      );

      if (userLevel < requiredLevel) {
        throw new ForbiddenException(
          'Votre role sur ce commerce ne permet pas cette action.',
        );
      }
    }

    // Attacher le lien au request pour le controller
    request.storeLink = link;
    return true;
  }
}
```

### 6.4 Registration des guards (global)

```typescript
// src/app.module.ts (extrait)

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AccountStatusGuard } from './auth/guards/status.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';

@Module({
  providers: [
    // Ordre d'execution des guards globaux :
    // 1. JwtAuthGuard : verifie le JWT (sauf endpoints @Public())
    // 2. AccountStatusGuard : rejette les comptes suspended/banned
    // 3. RolesGuard : verifie le role si @Roles() est present
    // 4. PermissionsGuard : verifie la permission si @RequirePermissions()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AccountStatusGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
```

### 6.5 Exemples d'utilisation dans les controllers

```typescript
// ================================================================
// ENDPOINTS PUBLICS (mode invite) -- US-C013
// ================================================================

@Controller('baskets')
export class BasketsController {
  @Public() // Pas de JWT requis
  @Get()
  findAvailable(@Query() filters: BasketFiltersDto) {
    // Accessible par tout le monde, meme les visiteurs non inscrits
    return this.basketsService.findAvailable(filters);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.basketsService.findOne(id);
  }
}

@Controller('stores')
export class StoresController {
  @Public()
  @Get()
  findNearby(@Query() query: NearbyStoresDto) {
    return this.storesService.findNearby(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storesService.findOne(id);
  }
}

// ================================================================
// ENDPOINTS CONSOMMATEUR -- requierent role CONSUMER
// ================================================================

@Controller('reservations')
@Roles(Role.CONSUMER)
export class ReservationsController {
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReservationDto) {
    // Le @Roles(CONSUMER) garantit que seul un consumer authentifie
    // peut reserver. Le AccountStatusGuard a deja verifie qu'il
    // n'est pas suspended/banned.
    return this.reservationsService.create(user.id, dto);
  }
}

@Controller('favorites')
@Roles(Role.CONSUMER)
export class FavoritesController {
  @Post(':storeId')
  addFavorite(
    @CurrentUser() user: JwtPayload,
    @Param('storeId') storeId: string,
  ) {
    return this.favoritesService.add(user.id, storeId);
  }
}

// ================================================================
// ENDPOINTS PARTENAIRE -- requierent role PARTNER + statut ACTIVE
// ================================================================

@Controller('partner/stores/:storeId/baskets')
@Roles(Role.PARTNER)
@UseGuards(ActivePartnerGuard, StoreAccessGuard)
export class PartnerBasketsController {
  // Creer un panier : requiert OWNER ou MANAGER sur ce commerce
  @Post()
  @RequireStoreRoles(StoreRole.OWNER, StoreRole.MANAGER)
  create(
    @Param('storeId') storeId: string,
    @Body() dto: CreateBasketDto,
  ) {
    return this.basketsService.createForStore(storeId, dto);
  }

  // Modifier un panier : requiert OWNER ou MANAGER
  @Patch(':basketId')
  @RequireStoreRoles(StoreRole.OWNER, StoreRole.MANAGER)
  update(
    @Param('storeId') storeId: string,
    @Param('basketId') basketId: string,
    @Body() dto: UpdateBasketDto,
  ) {
    return this.basketsService.update(storeId, basketId, dto);
  }
}

// Validation de pickup : STAFF suffit (scan QR / saisie PIN)
@Controller('partner/stores/:storeId/pickups')
@Roles(Role.PARTNER)
@UseGuards(ActivePartnerGuard, StoreAccessGuard)
export class PartnerPickupsController {
  @Post('validate')
  @RequireStoreRoles(StoreRole.STAFF) // STAFF, MANAGER et OWNER ont acces
  validatePickup(
    @Param('storeId') storeId: string,
    @Body() dto: ValidatePickupDto,
  ) {
    return this.pickupsService.validate(storeId, dto);
  }
}

// ================================================================
// ENDPOINTS ADMIN -- requierent role ADMIN + permission specifique
// ================================================================

@Controller('admin/partners')
@Roles(Role.ADMIN)
export class AdminPartnersController {
  // Voir les demandes en attente -- US-A004
  @Get('pending')
  @RequirePermissions(AdminPermission.PARTNERS_VIEW)
  findPending() {
    return this.adminPartnersService.findPending();
  }

  // Valider une inscription -- US-A005
  @Post(':partnerId/validate')
  @RequirePermissions(AdminPermission.PARTNERS_VALIDATE)
  validate(
    @CurrentUser() admin: JwtPayload,
    @Param('partnerId') partnerId: string,
    @Body() dto: ValidatePartnerDto,
  ) {
    return this.adminPartnersService.validate(partnerId, admin.id, dto);
  }

  // Rejeter une inscription -- US-A006
  @Post(':partnerId/reject')
  @RequirePermissions(AdminPermission.PARTNERS_REJECT)
  reject(
    @CurrentUser() admin: JwtPayload,
    @Param('partnerId') partnerId: string,
    @Body() dto: RejectPartnerDto,
  ) {
    return this.adminPartnersService.reject(partnerId, admin.id, dto);
  }

  // Suspendre un partenaire -- US-A013
  @Post(':partnerId/suspend')
  @RequirePermissions(AdminPermission.PARTNERS_SUSPEND)
  suspend(
    @CurrentUser() admin: JwtPayload,
    @Param('partnerId') partnerId: string,
    @Body() dto: SuspendPartnerDto,
  ) {
    return this.adminPartnersService.suspend(partnerId, admin.id, dto);
  }

  // Bannir un partenaire -- US-A015
  @Post(':partnerId/ban')
  @RequirePermissions(AdminPermission.PARTNERS_BAN)
  ban(
    @CurrentUser() admin: JwtPayload,
    @Param('partnerId') partnerId: string,
    @Body() dto: BanPartnerDto,
  ) {
    return this.adminPartnersService.ban(partnerId, admin.id, dto);
  }

  // Lever un bannissement -- US-A015 : SUPER_ADMIN uniquement
  @Post(':partnerId/unban')
  @RequirePermissions(AdminPermission.PARTNERS_UNBAN)
  unban(
    @CurrentUser() admin: JwtPayload,
    @Param('partnerId') partnerId: string,
    @Body() dto: UnbanPartnerDto,
  ) {
    return this.adminPartnersService.unban(partnerId, admin.id, dto);
  }
}

// Gestion financiere -- US-A027, US-A028
@Controller('admin/finance')
@Roles(Role.ADMIN)
export class AdminFinanceController {
  // Lecture : tout admin
  @Get('overview')
  @RequirePermissions(AdminPermission.FINANCE_VIEW)
  getOverview(@Query() query: FinanceOverviewDto) {
    return this.financeService.getOverview(query);
  }

  // Modifier la commission globale : super_admin uniquement
  @Patch('commission')
  @RequirePermissions(AdminPermission.FINANCE_COMMISSION)
  updateCommission(
    @CurrentUser() admin: JwtPayload,
    @Body() dto: UpdateCommissionDto,
  ) {
    return this.financeService.updateGlobalCommission(admin.id, dto);
  }

  // Generer les releves : super_admin uniquement
  @Post('payouts/generate')
  @RequirePermissions(AdminPermission.FINANCE_PAYOUTS)
  generatePayouts(
    @CurrentUser() admin: JwtPayload,
    @Body() dto: GeneratePayoutsDto,
  ) {
    return this.financeService.generateMonthlyPayouts(admin.id, dto);
  }
}
```

---

## 7. Matrice des permissions par role et par ressource

### 7.1 Ressources publiques (mode invite -- US-C013)

| Ressource | Invite (pas de JWT) | Consumer | Partner | Admin |
|-----------|:-------------------:|:--------:|:-------:|:-----:|
| Liste des paniers disponibles | Lecture | Lecture | Lecture | Lecture |
| Detail d'un panier | Lecture | Lecture | Lecture | Lecture |
| Carte des partenaires | Lecture | Lecture | Lecture | Lecture |
| Fiche partenaire publique | Lecture | Lecture | Lecture | Lecture |
| Filtres (jour, heure, type, prefs) | Lecture | Lecture | Lecture | Lecture |
| Recherche par nom | Lecture | Lecture | Lecture | Lecture |

### 7.2 Ressources consommateur

| Ressource | Invite | Consumer | Partner (role consumer) | Admin |
|-----------|:------:|:--------:|:----------------------:|:-----:|
| Reserver un panier | -- | Creer | Creer | -- |
| Annuler une reservation | -- | Si proprietaire | Si proprietaire | -- |
| Historique des reservations | -- | Les siennes | Les siennes | Lecture (via fiche) |
| Ajouter un favori | -- | Creer | Creer | -- |
| Laisser un avis (note) | -- | Creer | Creer | -- |
| Ouvrir une reclamation | -- | Creer | Creer | -- |
| Profil et preferences | -- | CRUD les siens | CRUD les siens | Lecture |
| Notifications | -- | Config les siennes | Config les siennes | -- |
| Parrainage | -- | Envoyer | Envoyer | -- |
| Suppression de compte | -- | Demander | Demander | Executer |

### 7.3 Ressources partenaire

| Ressource | Consumer | Partner OWNER | Partner MANAGER | Partner STAFF | Admin |
|-----------|:--------:|:------------:|:---------------:|:------------:|:-----:|
| Switch entre commerces | -- | Oui | Oui | Oui | -- |
| Creer un panier | -- | Creer | Creer | -- | -- |
| Modifier un panier | -- | Modifier | Modifier | -- | Modifier (direct) |
| Archiver un panier | -- | Archiver | Archiver | -- | Archiver |
| Voir les reservations du commerce | -- | Lecture | Lecture | Lecture | Lecture |
| Valider un pickup (QR/PIN) | -- | Valider | Valider | Valider | -- |
| Modifier la fiche commerce | -- | Soumettre modif | Soumettre modif | -- | Modifier (direct) |
| Voir les statistiques | -- | Lecture | Lecture | -- | Lecture |
| Voir les reversements | -- | Lecture | -- | -- | Lecture |
| Ajouter un commerce | -- | Creer | -- | -- | -- |
| Inviter un employe* | -- | Inviter | -- | -- | -- |
| Modifier les infos responsable | -- | CRUD les siennes | -- | -- | Modifier (direct) |

*Delegation d'employe : pas dans les specs V1, mais la structure le permet (voir section 8).

### 7.4 Ressources admin

| Ressource | Admin standard | Super-admin |
|-----------|:--------------:|:-----------:|
| Dashboard KPI (US-A001-A003) | Lecture | Lecture |
| Demandes inscription partenaire (US-A004-A006) | Voir, Valider, Rejeter | Voir, Valider, Rejeter |
| Modifications fiche commerce (US-A007-A008) | Voir, Valider, Rejeter | Voir, Valider, Rejeter |
| Inscription manuelle partenaire (US-A009-A010) | Creer | Creer |
| Fiche partenaire (US-A011-A012) | Voir, Modifier | Voir, Modifier |
| Suspendre partenaire (US-A013) | Suspendre | Suspendre |
| Reactiver partenaire (US-A014) | Reactiver | Reactiver |
| Bannir partenaire (US-A015) | Bannir | Bannir |
| **Lever bannissement partenaire** (US-A015) | **--** | **Lever** |
| Commission partenaire specifique (US-A016) | Voir | Modifier |
| Historique des prix (US-A017) | Voir | Voir |
| Liste consommateurs (US-A018-A019) | Voir | Voir |
| Suspendre consommateur (US-A020) | Suspendre | Suspendre |
| Reactiver consommateur (US-A021) | Reactiver | Reactiver |
| Bannir consommateur (US-A022) | Bannir | Bannir |
| **Lever bannissement consommateur** (US-A022) | **--** | **Lever** |
| Reclamations (US-A023-A025) | Voir, Resoudre | Voir, Resoudre |
| Moderation avis (US-A026) | Voir, Supprimer | Voir, Supprimer |
| **Commission globale** (US-A027) | Voir | **Modifier** |
| **Releves reversement** (US-A028) | Voir | **Generer** |
| CA plateforme (US-A030) | Voir | Voir |
| Audit log (US-A031-A037) | Voir, Exporter | Voir, Exporter |
| Anti-fraude (US-A038-A041) | Voir, Investiguer | Voir, Investiguer, **Fusionner comptes** |
| Categories et tags (US-A042-A043) | Voir | Modifier |
| **Gestion des admins** | **--** | **Creer, Desactiver** |

**Legendes :** Les actions en **gras** sont reservees au super-admin.

### 7.5 Matrice des statuts et acces

| Statut | Peut se connecter | Peut browse | Peut agir (role specifique) |
|--------|:-----------------:|:-----------:|:---------------------------:|
| `active` | Oui | Oui | Oui |
| `pending_verification` | Oui (limites) | Oui | Non (verification email/phone requise) |
| `pending` (partenaire) | Oui | Oui (en tant que consumer) | Non (attente validation admin) |
| `suspended` | Non | Non | Non |
| `banned` | Non | Non | Non |
| `deleted` | Non | Non | Non |
| Invite (pas de compte) | N/A | Oui (public) | Non |

---

## 8. Gestion du multi-commerce

### 8.1 Modele actuel (specs V1)

D'apres les specs (US-P007), un partenaire peut gerer **plusieurs commerces** et basculer entre eux via un selecteur. Au lancement, le "responsable" est le seul utilisateur lie au commerce. Il est `OWNER` par defaut.

```
Partenaire A (Marie) ──OWNER──> Commerce 1 (Le Chamarel)
                      ──OWNER──> Commerce 2 (Le Chamarel Express)

Partenaire B (Raj)   ──OWNER──> Commerce 3 (Chez Ravi)
```

### 8.2 Extension future : delegation (non requise dans les specs V1)

La structure `partner_stores` avec le `store_role` prepare la delegation sans l'implementer. Quand le besoin se presentera :

```
Partenaire A (Marie) ──OWNER────> Commerce 1 (Le Chamarel)
Partenaire C (Jean)  ──MANAGER──> Commerce 1 (Le Chamarel)  [invite par Marie]
Partenaire D (Priya) ──STAFF────> Commerce 1 (Le Chamarel)  [invite par Marie]
```

**Fonctionnement de la delegation (future V2) :**

1. Le `OWNER` d'un commerce invite un utilisateur (par email ou telephone) avec un role (`MANAGER` ou `STAFF`).
2. L'invite recoit un lien d'invitation. S'il n'a pas de compte, il s'inscrit et recoit automatiquement le role `PARTNER`.
3. Une entree `partner_stores` est creee avec le `store_role` appropriate.
4. Le `OWNER` peut revoquer l'acces a tout moment (`revokedAt = now()`).

**Hierarchie des roles par commerce :**

| Action | STAFF | MANAGER | OWNER |
|--------|:-----:|:-------:|:-----:|
| Scanner un QR / saisir un PIN | Oui | Oui | Oui |
| Voir les reservations du jour | Oui | Oui | Oui |
| Creer / modifier / archiver un panier | -- | Oui | Oui |
| Creer un modele recurrent | -- | Oui | Oui |
| Modifier la fiche commerce | -- | Oui | Oui |
| Voir les statistiques | -- | Oui | Oui |
| Voir les reversements | -- | -- | Oui |
| Inviter / revoquer un membre | -- | -- | Oui |
| Ajouter un nouveau commerce | -- | -- | Oui |

### 8.3 Implementation V1 (simplifiee)

Au lancement, on ne construit PAS l'interface d'invitation. On cree la structure de donnees (table `partner_stores` avec `store_role`) mais on n'expose que le cas `OWNER`. Cela signifie :

- A l'inscription du partenaire, le premier commerce est cree avec un lien `partner_stores(store_role = OWNER)`.
- Le partenaire peut ajouter des commerces : chaque nouveau commerce cree un lien `OWNER`.
- Le `StoreAccessGuard` est implemente et fonctionnel (il verifie le lien `partner_stores`).
- Les roles `MANAGER` et `STAFF` existent dans l'enum mais ne sont pas exposees dans l'interface utilisateur V1.

**Cout de cette approche :** zero overhead au lancement (un seul role par commerce), zero refactoring pour ajouter la delegation plus tard (le guard et la table sont deja en place).

---

## 9. Row Level Security (RLS) Supabase

Le RLS est utilise en complement des guards NestJS, principalement pour les acces **directs** du client Flutter a Supabase (Realtime subscriptions pour la synchro de stock).

### 9.1 Policies essentielles

```sql
-- ============================================================
-- PANIERS : lecture publique (mode invite), ecriture partenaire
-- ============================================================

-- Tout le monde peut lire les paniers disponibles (y compris les invites)
CREATE POLICY "baskets_select_public" ON public.baskets
  FOR SELECT
  USING (
    status = 'available'
    AND pickup_end > now()
    AND quantity_remaining > 0
  );

-- Un partenaire peut inserer un panier pour son propre commerce
CREATE POLICY "baskets_insert_partner" ON public.baskets
  FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT ps.store_id
      FROM public.partner_stores ps
      JOIN public.partner_profiles pp ON pp.id = ps.partner_id
      WHERE pp.user_id = auth.uid()
        AND ps.revoked_at IS NULL
        AND ps.store_role IN ('OWNER', 'MANAGER')
    )
  );

-- ============================================================
-- RESERVATIONS : un consumer voit les siennes, un partenaire
-- voit celles de ses commerces
-- ============================================================

CREATE POLICY "reservations_select_consumer" ON public.reservations
  FOR SELECT
  USING (
    consumer_id = auth.uid()
  );

CREATE POLICY "reservations_select_partner" ON public.reservations
  FOR SELECT
  USING (
    store_id IN (
      SELECT ps.store_id
      FROM public.partner_stores ps
      JOIN public.partner_profiles pp ON pp.id = ps.partner_id
      WHERE pp.user_id = auth.uid()
        AND ps.revoked_at IS NULL
    )
  );

-- ============================================================
-- FICHES COMMERCE : lecture publique, modification par le partenaire
-- ============================================================

CREATE POLICY "stores_select_public" ON public.stores
  FOR SELECT
  USING (status = 'ACTIVE');

CREATE POLICY "stores_update_partner" ON public.stores
  FOR UPDATE
  USING (
    id IN (
      SELECT ps.store_id
      FROM public.partner_stores ps
      JOIN public.partner_profiles pp ON pp.id = ps.partner_id
      WHERE pp.user_id = auth.uid()
        AND ps.revoked_at IS NULL
        AND ps.store_role IN ('OWNER', 'MANAGER')
    )
  );

-- ============================================================
-- PROFILS : un user voit et modifie son propre profil
-- ============================================================

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  USING (supabase_id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (supabase_id = auth.uid());

-- ============================================================
-- ADMIN : les admins voient tout
-- ============================================================

CREATE POLICY "admin_select_all" ON public.users
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ?| array['admin', 'super_admin']
  );
```

### 9.2 Limites du RLS et delegation au backend NestJS

Le RLS couvre la **securite de base** (isolation des donnees). Les regles metier complexes restent dans NestJS :

| Regle metier | RLS ? | NestJS Guard ? | Justification |
|--------------|:-----:|:--------------:|---------------|
| Un invite peut browse les paniers | RLS : policy SELECT publique | `@Public()` | Le RLS autorise le SELECT sans auth pour les paniers disponibles |
| Un consumer peut reserver | Non (action = logique metier) | `@Roles(CONSUMER)` | La reservation implique un check de stock, un paiement, une notification -- tout dans NestJS |
| Un partenaire ne voit que ses commerces | RLS : `store_id IN partner_stores` | `StoreAccessGuard` | Double protection |
| Un partenaire pending ne peut pas creer de panier | Non (trop contextuel) | `ActivePartnerGuard` | Le RLS ne connait pas le statut du partenaire |
| Seul un super_admin peut lever un bannissement | Non | `@RequirePermissions(PARTNERS_UNBAN)` | Logique purement admin |
| La modification de fiche commerce passe par un workflow | Non | Service NestJS (`PendingModificationService`) | Workflow multi-etape avec validation admin |

---

## 10. Flux d'autorisation -- diagramme de sequence

### 10.1 Requete authentifiee standard

```
Client Flutter                    API NestJS                         Supabase PostgreSQL
      |                               |                                      |
      | 1. GET /partner/stores/X/baskets                                     |
      |   Authorization: Bearer <JWT>  |                                     |
      |------------------------------>|                                      |
      |                               |                                      |
      |          2. JwtAuthGuard       |                                      |
      |          - Decode JWT          |                                      |
      |          - Extraire roles,     |                                      |
      |            partnerStatus       |                                      |
      |          - Attacher au request |                                      |
      |                               |                                      |
      |          3. AccountStatusGuard |                                      |
      |          - status != suspended |                                      |
      |          - status != banned    |                                      |
      |                               |                                      |
      |          4. RolesGuard         |                                      |
      |          - user.roles includes |                                      |
      |            "partner"           |                                      |
      |                               |                                      |
      |          5. ActivePartnerGuard |                                      |
      |          - partnerStatus ==    |                                      |
      |            "active"            |                                      |
      |                               |                                      |
      |          6. StoreAccessGuard   |                                      |
      |          - Verifier que le     |                                      |
      |            user a un lien      |                                      |
      |            avec store X        |-------- SELECT partner_stores ------>|
      |          - Verifier store_role |<------------ result ------------------|
      |            >= MANAGER          |                                      |
      |                               |                                      |
      |          7. Controller         |                                      |
      |          - Logique metier      |-------- SELECT baskets ------------->|
      |                               |<------------ result ------------------|
      |                               |                                      |
      |<----- 200 OK (baskets) -------|                                      |
```

### 10.2 Mode invite (pas de JWT)

```
Client Flutter                    API NestJS                         Supabase PostgreSQL
      |                               |                                      |
      | 1. GET /baskets?lat=-20&lng=57                                       |
      |   (pas de header Authorization)|                                     |
      |------------------------------>|                                      |
      |                               |                                      |
      |          2. JwtAuthGuard       |                                      |
      |          - @Public() detecte   |                                      |
      |          - skip auth           |                                      |
      |                               |                                      |
      |          3. Controller         |                                      |
      |          - Logique metier      |-------- SELECT baskets ------------->|
      |                               |<------------ result ------------------|
      |                               |                                      |
      |<----- 200 OK (baskets) -------|                                      |
```

### 10.3 Tentative d'action sans inscription

```
Client Flutter                    API NestJS
      |                               |
      | 1. POST /reservations          |
      |   (pas de header Authorization)|
      |------------------------------>|
      |                               |
      |          2. JwtAuthGuard       |
      |          - @Public() absent    |
      |          - Pas de token        |
      |          - 401 Unauthorized    |
      |                               |
      |<----- 401 "Token manquant" ---|
      |                               |
      | 3. Flutter affiche l'ecran     |
      |    d'inscription/connexion     |
      |    (conforme a US-C013)        |
```

---

## 11. Reponses aux questions specifiques

### Q1 : Un user peut-il etre consommateur ET partenaire ?

**Oui. Un seul compte avec deux roles.**

Decide dans l'ADR-010 et confirme ici. Un restaurateur qui utilise l'app pour acheter des paniers chez d'autres commerces a `app_metadata.roles: ["consumer", "partner"]`. L'interface Flutter propose un switch de contexte (profil consommateur / dashboard partenaire) sans re-authentification.

Le role `consumer` est attribue a l'inscription. Le role `partner` est ajoute apres validation admin de l'inscription partenaire. Les deux roles coexistent sur le meme JWT.

### Q2 : Granularite des permissions admin

**Deux niveaux au lancement : `admin` et `super_admin`. Extensible.**

Les permissions sont definies comme un enum TypeScript (`AdminPermission`). Le mapping role-permissions est en code (pas en base). Cela permet :
- Au lancement : `admin` peut tout faire sauf lever un bannissement, gerer les admins, et modifier les parametres financiers globaux. `super_admin` peut tout faire.
- Plus tard : si un sous-role "moderateur" emerge, on ajoute une entree dans `ROLE_PERMISSIONS` avec seulement `claims:*` et `reviews:*`. Zero migration de base.
- Encore plus tard : si la granularite par-admin est necessaire (ex: "Admin Kevin peut valider des partenaires mais pas resoudre des reclamations"), on migre le mapping vers une table `role_permissions` en base. Le code des guards ne change pas (il verifie des permissions, pas des roles).

### Q3 : Multi-commerce et delegation

**Multi-commerce supporte des le jour 1. Delegation preparee mais pas implementee en V1.**

- Table `partner_stores` avec `store_role` enum (`OWNER`, `MANAGER`, `STAFF`).
- Au lancement : seul le cas `OWNER` est utilise. Le partenaire est automatiquement `OWNER` de chaque commerce qu'il cree.
- Le `StoreAccessGuard` est implemente et verifie le lien + le role.
- L'interface d'invitation (inviter un employe avec un role) sera construite quand les partenaires en exprimeront le besoin.

### Q4 : Mode invite

**Pas de JWT. Endpoints publics via `@Public()`.**

Les endpoints de browse (paniers, carte, fiches partenaires, filtres) sont decores `@Public()` et accessibles sans aucun token. Les endpoints d'action (reserver, ajouter favori, laisser avis) requierent un JWT et retournent 401 si absent. Le client Flutter gere le 401 en affichant l'ecran d'inscription/connexion avec le message "Inscrivez-vous pour reserver votre panier" (conforme a US-C013).

Pas de JWT anonyme, pas de Supabase anonymous auth, pas de token temporaire. La simplicite l'emporte.

### Q5 : Modele d'autorisation

**RBAC pragmatique avec contexte metier.**

Ni RBAC pur (insuffisant pour le multi-commerce et les statuts), ni ABAC (trop complexe). Les guards NestJS combinent :
- Verification du role (JWT) via `@Roles()`
- Verification du statut du compte (JWT) via `AccountStatusGuard`
- Verification du statut partenaire (JWT) via `ActivePartnerGuard`
- Verification de l'acces au commerce (BD) via `StoreAccessGuard`
- Verification de la permission admin (en memoire) via `@RequirePermissions()`

Le RLS Supabase est le filet de securite pour les acces directs a la BD (Realtime, PostgREST).

### Q6 : Ou vivent les permissions ?

**Les deux.** Le JWT contient les roles (`app_metadata.roles[]`) et le statut (`app_metadata.partner_status`, `app_metadata.status`). C'est suffisant pour les guards rapides (zero BD). La table `user_roles` contient l'historique et les metadata (qui a attribue, quand). La synchronisation est assuree par le backend NestJS a chaque changement de role.

---

## 12. Structure de `app_metadata` dans Supabase Auth

```jsonc
// Consommateur standard
{
  "roles": ["consumer"],
  "status": "active"
}

// Partenaire en attente de validation
{
  "roles": ["consumer", "partner"],
  "status": "active",
  "partner_status": "pending",
  "partner_id": "uuid-xxx"
}

// Partenaire valide
{
  "roles": ["consumer", "partner"],
  "status": "active",
  "partner_status": "active",
  "partner_id": "uuid-xxx"
}

// Partenaire suspendu
{
  "roles": ["consumer", "partner"],
  "status": "suspended",
  "partner_status": "suspended",
  "partner_id": "uuid-xxx"
}

// Admin standard
{
  "roles": ["admin"],
  "status": "active"
}

// Super-admin
{
  "roles": ["super_admin"],
  "status": "active"
}

// Cas special : restaurateur qui est aussi consommateur et admin
{
  "roles": ["consumer", "partner", "admin"],
  "status": "active",
  "partner_status": "active",
  "partner_id": "uuid-xxx"
}
```

---

## 13. Plan d'implementation

### Phase 1 -- Fondations (Sprint 1-2, avec l'auth)

| Tache | Priorite | Effort |
|-------|----------|--------|
| Schema Prisma : tables `users`, `user_roles`, `consumer_profiles`, `partner_profiles`, `admin_profiles`, `partner_stores`, `stores`, `audit_logs` | P0 | 2j |
| Enum `Role`, `AdminPermission`, `StoreRole` | P0 | 0.5j |
| Guards globaux : `JwtAuthGuard`, `AccountStatusGuard`, `RolesGuard` | P0 | 2j |
| Decorateur `@Public()` + endpoints de browse publics | P0 | 0.5j |
| Middleware d'audit logging (interceptor NestJS) | P1 | 1j |
| Synchronisation `app_metadata` <-> `user_roles` via webhook | P0 | 1j |

### Phase 2 -- Partenaire et multi-commerce (Sprint 3-4)

| Tache | Priorite | Effort |
|-------|----------|--------|
| `ActivePartnerGuard` | P0 | 0.5j |
| `StoreAccessGuard` + `@RequireStoreRoles()` | P0 | 1j |
| Workflow d'inscription partenaire (statut `pending` → `active`/`rejected`) | P0 | 2j |
| CRUD commerce avec liens `partner_stores` | P0 | 1j |
| RLS Supabase : policies de base (paniers, reservations, profils) | P1 | 1j |

### Phase 3 -- Admin (Sprint 5-6)

| Tache | Priorite | Effort |
|-------|----------|--------|
| `PermissionsGuard` + `@RequirePermissions()` | P0 | 1j |
| Mapping `ROLE_PERMISSIONS` (admin vs super_admin) | P0 | 0.5j |
| Endpoints admin : validation/rejet partenaire | P0 | 1j |
| Endpoints admin : suspension/bannissement | P0 | 1j |
| Endpoints admin : lever un bannissement (super_admin) | P1 | 0.5j |
| Creation de comptes admin depuis le backoffice | P0 | 1j |
| Endpoints admin : moderation, reclamations, finance | P0 | 3j |

### Phase 4 -- Renforcement (Sprint 7+, si besoin)

| Tache | Priorite | Effort |
|-------|----------|--------|
| Delegation multi-commerce (invitation employe, roles MANAGER/STAFF) | P2 | 3j |
| Sous-roles admin (moderateur, finance, support) -- migration mapping vers BD | P2 | 2j |
| Interface de gestion des permissions admin dans le backoffice | P2 | 2j |
| RLS avancees (policies par role de commerce) | P2 | 1j |

---

## 14. Risques et mitigations

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Desynchronisation `app_metadata` <-> `user_roles` | Moyenne | Eleve | Le backend NestJS est le seul a modifier les deux. Jamais de modification directe du JWT. En cas de doute, la table `user_roles` fait foi et un endpoint de resync est prevu. |
| Le JWT cache contient un role revoque (delai de 1h avant expiration) | Moyenne | Moyen | Le `AccountStatusGuard` peut optionnellement faire un check BD du statut pour les actions sensibles (paiement, suspension). Pour la plupart des actions, le delai de 1h est acceptable. Alternative : blackliste Redis des tokens revoques. |
| Un admin standard tente une action super_admin | Faible | Eleve | Le `PermissionsGuard` bloque au niveau de l'API. Le frontend React ne montre pas les boutons non autorises (double protection). L'action est loguee dans l'audit trail. |
| Le RLS Supabase diverge des guards NestJS | Moyenne | Moyen | Tests d'integration verifiant que les deux couches sont coherentes. Le RLS est le filet de securite -- s'il est plus restrictif que le guard, c'est bien. L'inverse serait un probleme. |
| Le `StoreAccessGuard` fait un appel BD a chaque requete partenaire | Faible | Faible | Les liens `partner_stores` sont peu nombreux par user (2-5 commerces max). L'index sur `partner_id` rend la requete O(1). Si necessaire : cache Redis de 5 min. |
| Les specs evoluent vers des sous-roles admin avant la V2 | Moyenne | Faible | Le mapping `ROLE_PERMISSIONS` est en code. Ajouter un sous-role = ajouter une entree dans le mapping + un enum. Zero migration de schema, zero changement de guard. |
| Le mode invite est exploite pour du scraping | Faible | Faible | Rate limiting global sur les endpoints publics (Cloudflare, NestJS ThrottlerModule). Les donnees publiques sont... publiques. Pas de donnees sensibles dans les endpoints `@Public()`. |

---

## 15. Decisions reportees

| Sujet | Raison du report | Quand revisiter |
|-------|------------------|-----------------|
| Delegation multi-commerce (MANAGER, STAFF) | Les specs V1 ne le demandent pas explicitement. La structure de donnees est prete. | Quand des partenaires avec des employes en font la demande (estimation : post-lancement, mois 6+) |
| Sous-roles admin granulaires (moderateur, finance, support) | 2-3 admins au lancement. Pas besoin de 4 sous-roles. | Quand l'equipe admin depasse 5 personnes ou quand un besoin d'isolation emerge |
| Migration du mapping permissions vers une table BD | Le mapping en code est suffisant pour 2 niveaux. | Quand on a plus de 3 sous-roles admin ou quand on veut des permissions par-admin |
| OAuth scopes pour des apps tierces | Pas d'API publique prevue | Si BienBon ouvre une API a des partenaires tiers |
| MFA obligatoire pour les admins | Bonne pratique de securite, mais pas dans les specs V1 | Sprint 5-6, en meme temps que le backoffice admin |

---

## 16. References

### Patterns d'autorisation
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [NestJS Authorization Guide](https://docs.nestjs.com/security/authorization)

### Supabase Auth & RLS
- [Supabase Auth Custom Claims / app_metadata](https://supabase.com/docs/guides/auth/jwts)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth Admin Methods](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)

### NestJS Authorization Patterns
- [Custom Decorators in NestJS](https://docs.nestjs.com/custom-decorators)
- [Prisma with NestJS Guide](https://docs.nestjs.com/recipes/prisma)

### ADRs prerequis
- [ADR-001 : Choix de la stack backend](./ADR-001-backend-stack.md) -- NestJS + Prisma + Supabase
- [ADR-002 : Architecture applicative](./ADR-002-architecture-applicative.md) -- Monolithe modulaire
- [ADR-010 : Strategie d'authentification](./ADR-010-strategie-authentification.md) -- Supabase Auth, JWT, multi-role
