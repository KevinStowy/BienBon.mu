# ADR-003 : Strategie de base de donnees -- schema, audit trail, partitionnement

## Statut : Proposition

**Date** : 2026-02-27
**Derniere mise a jour** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-001 (stack backend), ADR-002 (architecture applicative), ADR-005 (paiement), ADR-008 (stock/reservations), ADR-010 (authentification), ADR-011 (RBAC), ADR-017 (state machines), ADR-018 (workflow approbation), ADR-019 (detection fraude), ADR-021 (conformite DPA)

> **Ce document est la reference unique et consolidee du schema de base de donnees BienBon.mu.**
> Les tables, enums et index definis ici incorporent les decisions de toutes les ADR du projet.
> En cas de divergence avec une autre ADR, c'est ADR-003 qui fait foi pour le schema.

---

## Contexte

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. L'architecture backend retenue (ADR-001, ADR-002) est un monolithe modulaire NestJS + Prisma + PostgreSQL heberge par Supabase, avec Supabase Auth pour l'authentification.

Le modele de donnees doit supporter 206 user stories reparties en 4 modules (consommateur, partenaire, admin, transversal). Les decisions deja prises dans les ADR precedentes contraignent certaines parties du schema :

- **ADR-005** : Ledger en double-entry bookkeeping avec tables `ledger_accounts` et `ledger_entries` immuables. Transactions financieres liees aux reservations.
- **ADR-007** : Modele de commission configurable, releves de reversement (payout statements), reconciliation Peach Payments.
- **ADR-008** : Decrement atomique du stock (`UPDATE baskets SET stock = stock - $1 WHERE id = $2 AND stock >= $1`), hold/claim de 5 minutes, table `reservations` avec statuts alignes sur les machines a etats.
- **ADR-010** : Supabase Auth gere les identites dans `auth.users`. Comptes multi-role via `app_metadata.roles[]`. Profils metier dans des tables `public`.
- **ADR-011** : Modele utilisateur unifie (`users`) avec roles multiples (`user_roles`), profils par type (`consumer_profiles`, `partner_profiles`, `admin_profiles`), multi-commerce (`partner_stores`).
- **ADR-017** : Machines a etats formelles pour reservations, reclamations, paniers et partenaires. Enums et statuts definis avec precision.
- **ADR-018** : Workflow d'approbation admin pour inscriptions partenaires et modifications commerce (`store_modification_requests`, `partner_registration_requests`).
- **ADR-019** : Detection de fraude avec regles configurables (`fraud_rules`), fingerprinting (`device_fingerprints`), suspensions automatiques (`fraud_suspensions`).
- **ADR-021** : Conformite DPA 2017 -- consentements (`consent_records`), anonymisation, retention des donnees.

### Volumetrie estimee (horizon 3 ans)

| Entite | Volume estime | Croissance |
|--------|--------------|------------|
| Utilisateurs (consommateurs) | 10 000 - 50 000 | +2 000/mois apres lancement |
| Partenaires | 50 - 500 | +10-20/mois |
| Stores (commerces) | 50 - 600 | ~1.2 par partenaire |
| Paniers publies/jour | 50 - 500 | Proportionnel aux partenaires |
| Reservations/jour | 100 - 2 000 | Proportionnel aux consommateurs |
| Ledger entries/jour | 300 - 6 000 | ~3 entries par reservation |
| Notifications/jour | 500 - 10 000 | ~5 par reservation |
| Audit logs/jour | 1 000 - 20 000 | Proportionnel a l'activite |

A horizon 3 ans, les tables les plus volumineuses seraient : `audit_logs` (~15M lignes), `notifications` (~5M, avec purge 30 jours), `ledger_entries` (~3M), `reservations` (~1.5M). Ces volumes sont modestes pour PostgreSQL.

---

## Questions a trancher

| # | Question |
|---|----------|
| Q1 | CRUD classique + audit table vs Event Sourcing complet ? |
| Q2 | Schema PostgreSQL unique vs multi-schema ? |
| Q3 | Soft delete global vs hard delete + archive ? |
| Q4 | Strategie de partitionnement ? |
| Q5 | Gestion des donnees geospatiales (PostGIS) ? |
| Q6 | Strategie de migration (Prisma Migrate vs alternatives) ? |

---

## Q1 : CRUD + audit table vs Event Sourcing

### Option 1A : CRUD classique + table `audit_logs` dediee

Chaque entite est stockee dans une table relationnelle classique avec `created_at` et `updated_at`. Toutes les mutations sont tracees dans une table `audit_logs` centralisee, separee des donnees metier.

```sql
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID,                -- users.id (persiste apres suppression)
  actor_type    TEXT NOT NULL,        -- 'consumer', 'partner', 'admin', 'system'
  action        TEXT NOT NULL,        -- 'reservation.created', 'basket.updated', ...
  entity_type   TEXT NOT NULL,        -- 'reservation', 'basket', 'partner', ...
  entity_id     UUID,                -- ID de l'entite concernee
  changes       JSONB,               -- { before: {...}, after: {...} }
  metadata      JSONB,               -- ip, user_agent, page_source, admin_id, ...
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- PAS de updated_at : les audit logs sont IMMUABLES
);
```

**Avantages** :
- Simple a implementer : un interceptor NestJS capture toutes les mutations et insere une ligne
- Separation claire entre donnees operationnelles (tables metier) et historique (audit)
- Les requetes metier ne sont pas alourdies par l'historique
- Le champ `changes` JSONB stocke le diff avant/apres (conforme US-A035 : "donnees avant/apres")
- Compatible avec la retention 2 ans (purge par `created_at`)
- Le ledger financier est deja immuable (ADR-005), donc la finance est deja "event-sourced"
- Les requetes d'audit (filtrage par utilisateur, type, periode) sont efficaces avec les bons index

**Inconvenients** :
- La table `audit_logs` peut devenir volumineuse (~15M lignes en 3 ans)
- Le diff before/after depend de la discipline du code applicatif (il faut capturer l'etat "avant")
- Pas de replay d'evenements possible (on ne peut pas reconstruire l'etat d'une entite depuis les logs)

### Option 1B : Event Sourcing complet

Chaque mutation est stockee comme un evenement immuable. L'etat courant est reconstruit par projection des evenements.

**Avantages** :
- Auditabilite maximale : chaque changement est un evenement atomique et immuable
- Possibilite de reconstruire l'etat a n'importe quel point dans le temps (time-travel debugging)

**Inconvenients** :
- **Complexite disproportionnee** : Event Sourcing introduit des concepts lourds (event store, projections, eventual consistency, snapshots, versioning des evenements) qui multiplient par 3-5x le temps de developpement
- **Pas de support natif dans Prisma** : Prisma est un ORM CRUD-first
- **Le ledger financier couvre deja le besoin** : les transactions financieres sont tracees en double-entry (ADR-005)
- **Les specs n'exigent pas de time-travel** : l'audit trail demande "qui a fait quoi, quand, depuis ou"

### Option 1C : CRUD + audit trigger PostgreSQL

Utiliser des triggers PostgreSQL pour capturer automatiquement chaque INSERT/UPDATE/DELETE.

**Inconvenients** :
- Les triggers ne connaissent pas le contexte applicatif (qui est l'utilisateur ? depuis quelle page ? quelle IP ?)
- Impossible de tester les triggers dans les tests unitaires NestJS

### Evaluation Q1

| Critere (poids) | 1A : CRUD + audit table | 1B : Event Sourcing | 1C : CRUD + triggers |
|-----------------|:-----------------------:|:-------------------:|:--------------------:|
| Simplicite d'implementation (30%) | 5 | 1 | 4 |
| Qualite de l'audit trail (25%) | 4 | 5 | 3 |
| Compatibilite Prisma/NestJS (20%) | 5 | 2 | 3 |
| Performance (15%) | 5 | 3 | 4 |
| Maintenabilite (10%) | 4 | 2 | 3 |
| **Score pondere** | **4.60** | **2.30** | **3.45** |

### Decision Q1 : Option 1A -- CRUD classique + table `audit_logs` applicative

**Justification** : Le ledger financier est deja en double-entry (ADR-005), ce qui couvre le besoin d'immutabilite pour les flux d'argent. Pour le reste du domaine, un CRUD classique avec une table d'audit centralisee est largement suffisant. L'Event Sourcing est un overkill pour un projet de cette taille. L'audit via trigger est ecarte car il ne capture pas le contexte applicatif exige par les specs (US-A035).

**Implementation recommandee** : Un interceptor NestJS `AuditInterceptor` qui :
1. Capture l'etat "avant" pour les UPDATE/DELETE (via un SELECT prealable)
2. Apres la mutation, insere une ligne dans `audit_logs` avec le diff, l'acteur, l'IP, le user-agent
3. Les INSERT ne necessitent pas de "before" (le before est null)
4. Les actions sensibles (paiements, suspensions, bannissements) incluent l'IP et le user-agent

---

## Q2 : Schema unique vs multi-schema PostgreSQL

### Decision Q2 : Schema unique `public`

**Justification** : La compatibilite Prisma est le facteur decisif. Tant que `multiSchema` est en `preview`, utiliser plusieurs schemas en production est un risque inutile. Le schema `public` avec une convention de nommage claire est suffisant pour ~45 tables et une equipe de 2-5 developpeurs.

Le schema `auth` est gere exclusivement par Supabase et n'est pas touche par Prisma. Les tables metier vivent dans `public`.

**Convention de nommage retenue** :

| Prefixe/groupement | Tables |
|--------------------|--------|
| (core) | `users`, `user_roles`, `consumer_profiles`, `partner_profiles`, `admin_profiles`, `stores`, `partner_stores`, `store_photos`, `store_hours` |
| (baskets) | `baskets`, `categories`, `tags`, `basket_tags`, `recurring_templates`, `recurring_exceptions` |
| (reservations) | `reservations`, `reservation_status_history` |
| (payments) | `ledger_accounts`, `ledger_entries`, `payment_transactions`, `commission_configs`, `payout_statements`, `payout_statement_lines`, `reconciliation_alerts` |
| (social) | `reviews`, `favorites` |
| (claims) | `claims`, `claim_photos`, `claim_reasons`, `claim_status_history` |
| (notifications) | `notifications` |
| (gamification) | `badges`, `user_badges`, `referrals` |
| (admin/approval) | `store_modification_requests`, `partner_registration_requests`, `support_tickets` |
| (fraud) | `fraud_rules`, `fraud_alerts`, `fraud_suspensions`, `device_fingerprints` |
| (system) | `audit_logs`, `app_settings`, `email_templates`, `holidays`, `consent_records` |

---

## Q3 : Soft delete vs hard delete + archive

### Decision Q3 : Strategie mixte par entite

| Entite | Strategie | Justification |
|--------|-----------|---------------|
| `users` | Soft delete (`status = 'DELETED'`) + anonymisation a J+30 | DPA 2017 : droit a l'effacement. 30 jours de grace pour annuler. |
| `partner_profiles` | Soft delete (`status = 'BANNED'` ou archive) | Donnees historiques necessaires pour la comptabilite |
| `stores` | Soft delete (`status = 'INACTIVE'` ou `SUSPENDED`) | Paniers et reservations historiques references |
| `baskets` | Soft delete (`status = 'archived'`) | Un panier expire ou annule reste consultable dans l'historique |
| `reservations` | Jamais supprimees | Les reservations sont des faits comptables lies au ledger |
| `ledger_entries` | Jamais supprimees | Immuables par design (ADR-005). Les corrections se font par ecriture compensatoire |
| `reviews` | Hard delete possible (moderation admin) | Un avis supprime par l'admin est physiquement supprime. L'action est tracee dans `audit_logs` |
| `notifications` | Hard delete apres 30 jours | Job CRON qui purge `WHERE created_at < NOW() - INTERVAL '30 days'` |
| `audit_logs` | Hard delete apres 2 ans | Job CRON qui purge `WHERE created_at < NOW() - INTERVAL '2 years'` |
| `favorites` | Hard delete | Un favori retire est physiquement supprime (aucune valeur historique) |
| `claims` | Jamais supprimees | Les reclamations ont une valeur legale et d'audit |
| `fraud_alerts` | Jamais supprimees | Historique de detection necessaire pour les patterns |
| `device_fingerprints` | Hard delete apres 90 jours | DPA 2017 : retention limitee (ADR-021) |
| `consent_records` | Jamais supprimees | Preuve de consentement exigee par le DPA 2017 |

**Implementation de l'anonymisation des comptes (ADR-021, Q6)** :

```sql
-- Job execute quotidiennement par BullMQ
-- Anonymise les utilisateurs supprimes depuis plus de 30 jours
UPDATE users
SET
  first_name = 'Utilisateur',
  last_name = 'Supprime',
  email = 'anon_' || LEFT(MD5(id::text), 8) || '@deleted.bienbon.mu',
  phone = NULL,
  avatar_url = NULL,
  status = 'DELETED',
  anonymized_at = NOW()
WHERE status = 'DELETED'
  AND deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '30 days'
  AND anonymized_at IS NULL;
```

---

## Q4 : Strategie de partitionnement

### Decision Q4 : Partitionnement differe

**Justification** : La volumetrie estimee (15M lignes max pour `audit_logs` en 3 ans) est bien geree par PostgreSQL sans partitionnement. Un index sur `created_at` et un job de purge par batch suffisent.

**Plan de partitionnement futur** (a activer quand la table depasse 50M lignes) :

| Table | Strategie | Cle | Granularite |
|-------|-----------|-----|-------------|
| `audit_logs` | Range | `created_at` | Trimestrielle |
| `notifications` | Range | `created_at` | Mensuelle |
| `ledger_entries` | Range | `created_at` | Trimestrielle |

**Job de purge recommande** (BullMQ, quotidien a 3h du matin) :

```typescript
async function purgeOldAuditLogs() {
  const TWO_YEARS_AGO = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
  let deletedCount = 0;
  do {
    const result = await prisma.$executeRaw`
      DELETE FROM audit_logs
      WHERE id IN (
        SELECT id FROM audit_logs
        WHERE created_at < ${TWO_YEARS_AGO}
        LIMIT 10000
      )
    `;
    deletedCount = result;
  } while (deletedCount === 10000);
}
```

---

## Q5 : Gestion des donnees geospatiales

### Decision Q5 : PostGIS `GEOMETRY(Point, 4326)` avec cast `::geography` pour les distances

PostGIS est deja disponible dans Supabase. L'index GiST rend les requetes par rayon instantanees. Le type `GEOMETRY` est plus flexible que `GEOGRAPHY` et le cast `::geography` pour les calculs de distance est une pratique courante.

Les colonnes `latitude`/`longitude` (Prisma) sont synchronisees vers la colonne `location` (PostGIS) via un trigger :

```sql
CREATE OR REPLACE FUNCTION update_location_from_lat_lng()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON stores
  FOR EACH ROW EXECUTE FUNCTION update_location_from_lat_lng();
```

---

## Q6 : Strategie de migration

### Decision Q6 : Prisma Migrate + SQL brut

Prisma Migrate comme outil principal. Le SQL brut est ajoute dans les fichiers de migration generes pour les elements que Prisma ne gere pas (triggers PostGIS, index GiST, extension `postgis`, policies RLS).

| Element | SQL |
|---------|-----|
| Extension PostGIS | `CREATE EXTENSION IF NOT EXISTS postgis;` |
| Colonne `location` | `ALTER TABLE stores ADD COLUMN location GEOMETRY(Point, 4326);` |
| Index GiST | `CREATE INDEX idx_stores_location ON stores USING GIST (location);` |
| Trigger sync `location` | `CREATE TRIGGER sync_location ...` |
| Index partiels | `CREATE INDEX idx_baskets_published ON baskets (id) WHERE status = 'published';` |
| Index GIN sur JSONB | `CREATE INDEX idx_audit_logs_changes ON audit_logs USING GIN (changes);` |

---

## Enums -- Alignes avec ADR-017 (state machines)

Les enums suivants sont la source de verite pour les statuts dans toute l'application. Ils correspondent exactement aux etats definis dans les machines a etats (ADR-017).

### ReservationStatus (ADR-017, section 2.1)

```
PENDING_PAYMENT    -> Stock decremente, en attente de paiement (hold 5 min)
CONFIRMED          -> Paiement recu (pre-auth ou debit), en attente de retrait
READY              -> Creneau de retrait en cours, paiement capture (capture pre-auth)
PICKED_UP          -> Retrait valide par le partenaire (scan QR ou PIN) -- etat terminal nominal
NO_SHOW            -> Le consommateur ne s'est pas presente (fin de creneau + 5 min) -- etat terminal
CANCELLED_CONSUMER -> Annule par le consommateur (avant debut du creneau) -- etat terminal
CANCELLED_PARTNER  -> Annule par le partenaire (tous les consommateurs rembourses) -- etat terminal
EXPIRED            -> Le hold de 5 min a expire sans paiement -- etat terminal
```

### BasketStatus (ADR-017, section 2.3)

```
DRAFT              -> Brouillon cree par le partenaire, non visible
PUBLISHED          -> Publie et visible par les consommateurs (ex 'active' dans les versions precedentes)
SOLD_OUT           -> Stock epuise (toutes les unites reservees)
PICKUP_WINDOW      -> Creneau de retrait en cours
ENDED              -> Creneau de retrait termine (ex 'expired' dans les versions precedentes)
CANCELLED          -> Annule par le partenaire (avec impact sur les reservations existantes)
ARCHIVED           -> Archive manuellement par le partenaire -- etat terminal
```

### ClaimStatus (ADR-017, section 2.2)

```
OPEN               -> Reclamation ouverte par le consommateur
IN_REVIEW          -> En cours de traitement par un admin
RESOLVED           -> Resolue (remboursement total, partiel, ou credit commercial)
REJECTED           -> Rejetee par l'admin avec motif
```

### PartnerStatus (ADR-017, section 2.4)

```
PENDING            -> Inscription soumise, en attente de validation admin
ACTIVE             -> Valide par admin, peut operer
SUSPENDED          -> Desactive temporairement par admin
REJECTED           -> Inscription rejetee par admin (peut resoumettre)
BANNED             -> Exclu definitivement
```

### UserStatus (ADR-011)

```
ACTIVE             -> Compte actif
PENDING_VERIFICATION -> Email/telephone non verifie
SUSPENDED          -> Suspendu par admin ou par fraude automatique
BANNED             -> Exclu definitivement
DELETED            -> Soft-delete (DPA compliance, anonymisation a J+30)
```

### StoreStatus (ADR-011)

```
ACTIVE             -> Commerce actif et visible
INACTIVE           -> Desactive par le partenaire
SUSPENDED          -> Suspension admin (heritee du partenaire)
```

### ApprovalStatus (ADR-018)

```
PENDING            -> Soumis, en attente de traitement
IN_REVIEW          -> Un admin a pris le dossier
APPROVED           -> Approuve (tous les champs ou une partie)
REJECTED           -> Rejete avec motif
CANCELLED          -> Annule par le partenaire avant traitement
SUPERSEDED         -> Remplace par une nouvelle request (resoumission)
```

---

## ERD -- Diagramme Entite-Relation

```
                                    ┌─────────────────────┐
                                    │    auth.users        │  (Supabase Auth)
                                    │─────────────────────│
                                    │  id (UUID) PK       │
                                    │  email              │
                                    │  phone              │
                                    │  app_metadata:      │
                                    │    roles[]          │
                                    │    partner_status?  │
                                    │  created_at         │
                                    └──────────┬──────────┘
                                               │ 1 (supabase_id)
                                               │
                                               ▼ 1
                                    ┌─────────────────────┐
                                    │    users             │ (ADR-011)
                                    │─────────────────────│
                                    │  id UUID PK          │
                                    │  supabase_id UQ      │
                                    │  email UQ?           │
                                    │  phone UQ?           │
                                    │  first_name          │
                                    │  last_name           │
                                    │  avatar_url?         │
                                    │  status (UserStatus) │
                                    │  deleted_at?         │
                                    │  anonymized_at?      │
                                    │  created_at          │
                                    │  updated_at          │
                                    └──┬──────┬───────┬───┘
                                       │      │       │
                          ┌────────────┘      │       └────────────┐
                          │                   │                    │
                          ▼ *                  ▼ 0..1              ▼ *
               ┌──────────────────┐  ┌────────────────────┐  ┌───────────────────┐
               │   user_roles     │  │ consumer_profiles  │  │   favorites       │
               │──────────────────│  │────────────────────│  │───────────────────│
               │  id UUID PK      │  │ id UUID PK         │  │ id UUID PK        │
               │  user_id FK      │  │ user_id FK UQ      │  │ user_id FK        │
               │  role (enum)     │  │ dietary_prefs []   │  │ store_id FK       │
               │  granted_at      │  │ referral_code UQ?  │  │ created_at        │
               │  granted_by?     │  │ notification_prefs │  └───────────────────┘
               │  revoked_at?     │  │ created_at         │
               │  UQ(user_id,role)│  └────────────────────┘
               └──────────────────┘
                                              ┌────────────────────┐
                                    0..1 ◄──  │  partner_profiles  │
                                              │────────────────────│
                                              │  id UUID PK        │
                                              │  user_id FK UQ     │
                                              │  status (Partner   │
                                              │    Status)         │
                                              │  status_reason?    │
                                              │  status_changed_at?│
                                              │  status_changed_by?│
                                              │  submitted_at      │
                                              │  validated_at?     │
                                              │  validated_by?     │
                                              │  registration_     │
                                              │    channel         │
                                              │  created_at        │
                                              └────────┬───────────┘
                                                       │
                                                  1:N  │
                                                       ▼
                                              ┌──────────────────┐       ┌──────────────┐
                                              │ partner_stores   │──N:1──│   stores      │
                                              │──────────────────│       │──────────────│
                                              │ id UUID PK       │       │ id UUID PK   │
                                              │ partner_id FK    │       │ name         │
                                              │ store_id FK      │       │ type (enum)  │
                                              │ store_role (enum)│       │ address      │
                                              │ granted_at       │       │ city         │
                                              │ granted_by?      │       │ postal_code? │
                                              │ revoked_at?      │       │ latitude     │
                                              │ UQ(partner,store)│       │ longitude    │
                                              └──────────────────┘       │ location     │
                                                                         │   (PostGIS)  │
                                              ┌────────────────────┐     │ description  │
                                    0..1 ◄──  │  admin_profiles    │     │ phone        │
                                              │────────────────────│     │ brn          │
                                              │  id UUID PK        │     │ food_licence?│
                                              │  user_id FK UQ     │     │ avg_rating   │
                                              │  department?       │     │ total_reviews│
                                              │  created_at        │     │ status (enum)│
                                              │  created_by?       │     │ created_at   │
                                              └────────────────────┘     │ updated_at   │
                                                                         └──────┬───────┘
                                                                                │ 1
                                                                      ┌─────────┼──────────┐
                                                                      │         │          │
                                                                      ▼ *       ▼ *        ▼ *
                                                               ┌────────────┐┌───────────┐┌───────────────┐
                                                               │store_hours ││store_     ││store_modifica-│
                                                               │────────────││photos     ││tion_requests  │
                                                               │id UUID PK  ││───────────││───────────────│
                                                               │store_id FK ││id UUID PK ││id UUID PK     │
                                                               │day_of_week ││store_id FK││store_id FK    │
                                                               │open_time   ││url TEXT   ││submitted_by FK│
                                                               │close_time  ││position   ││request_type   │
                                                               │is_closed   ││created_at ││field_changes  │
                                                               │            ││           ││  JSONB        │
                                                               └────────────┘└───────────┘│status (Appro- │
                                                                                          │  valStatus)   │
                                                                                          │reviewed_by? FK│
                                                                                          │decision JSONB?│
                                                                                          │previous_      │
                                                                                          │  request_id?  │
                                                                                          │created_at     │
                                                                                          └───────────────┘


   ┌──────────────────────────────────────────────────┐
   │   baskets                                        │
   │──────────────────────────────────────────────────│
   │  id UUID PK                                      │
   │  store_id FK                                     │
   │  template_id FK? (lien vers recurring_template)  │
   │  title VARCHAR(60)                               │
   │  description TEXT?                               │
   │  original_price DECIMAL(10,2)                    │
   │  selling_price DECIMAL(10,2)                     │
   │  quantity INT (total initial)                    │
   │  stock INT (restant, decremente atomiquement)    │
   │  category_id FK                                  │
   │  photo_url TEXT?                                 │
   │  pickup_start TIMESTAMPTZ                        │
   │  pickup_end TIMESTAMPTZ                          │
   │  status (BasketStatus: draft/published/sold_out/ │
   │    pickup_window/ended/cancelled/archived)       │
   │  created_at                                      │
   │  updated_at                                      │
   └────────┬─────────────────────────┬───────────────┘
            │ 1                       │
            │                         ▼ *
            │                ┌────────────────────┐
            │                │  basket_tags (M2M)  │
            │                │────────────────────│
            │                │  basket_id FK       │
            │                │  tag_id FK          │
            │                │  PK(basket_id,      │
            │                │     tag_id)          │
            │                └────────────────────┘
            │
            ▼ *
   ┌──────────────────────────────────────┐
   │   reservations                       │
   │──────────────────────────────────────│
   │  id UUID PK                          │
   │  basket_id FK                        │
   │  consumer_id FK (users.id)           │
   │  quantity INT DEFAULT 1              │
   │  unit_price DECIMAL(10,2)            │
   │  total_price DECIMAL(10,2)           │
   │  status (ReservationStatus:          │
   │    pending_payment, confirmed, ready,│
   │    picked_up, no_show,               │
   │    cancelled_consumer,               │
   │    cancelled_partner, expired)       │
   │  qr_code TEXT                        │
   │  pin_code VARCHAR(6)                 │
   │  expires_at TIMESTAMPTZ?             │
   │  confirmed_at TIMESTAMPTZ?           │
   │  ready_at TIMESTAMPTZ?               │
   │  picked_up_at TIMESTAMPTZ?           │
   │  cancelled_at TIMESTAMPTZ?           │
   │  no_show_at TIMESTAMPTZ?             │
   │  expired_at TIMESTAMPTZ?             │
   │  created_at                          │
   │  updated_at                          │
   └──────┬──────────┬──────────┬─────────┘
          │ 1        │ 1        │ 1
          │          │          │
          ▼ *        ▼ 0..1    ▼ *
   ┌──────────────┐ ┌────────┐ ┌──────────────────────────┐
   │ payment_     │ │reviews │ │ reservation_status_       │
   │ transactions │ │────────│ │ history (ADR-017)         │
   │──────────────│ │id PK   │ │──────────────────────────│
   │  id UUID PK  │ │reserv- │ │ id UUID PK               │
   │  reserv-     │ │ation_id│ │ reservation_id FK         │
   │   ation_id FK│ │  FK UQ │ │ from_status TEXT          │
   │  type (enum) │ │consum- │ │ to_status TEXT            │
   │  status      │ │ er_id  │ │ event TEXT                │
   │  amount      │ │partner_│ │ actor_id?                 │
   │  currency    │ │ id FK  │ │ actor_role TEXT            │
   │  payment_    │ │rating  │ │ metadata JSONB             │
   │   method     │ │  (1-5) │ │ created_at                │
   │  provider_   │ │editable│ └──────────────────────────┘
   │   tx_id      │ │  _until│
   │  provider_   │ │created │
   │   status     │ │  _at   │
   │  metadata    │ │updated │       ┌──────────────────────────┐
   │   JSONB      │ │  _at   │       │   claims                 │
   │  created_at  │ └────────┘       │──────────────────────────│
   └──────────────┘                  │  id UUID PK              │
          │ *                        │  reservation_id FK       │
          │                          │  consumer_id FK           │
          ▼                          │  reason_slug FK           │
   ┌──────────────────────┐          │  description TEXT         │
   │   ledger_entries     │          │  status (ClaimStatus:     │
   │   (ADR-007)          │          │    open, in_review,       │
   │──────────────────────│          │    resolved, rejected)    │
   │  id UUID PK          │          │  resolution_type?         │
   │  journal_id UUID     │          │    (full_refund, partial  │
   │  transaction_id FK?  │          │     _refund, rejected)    │
   │  sequence_number     │          │  resolution_amount DEC?   │
   │  debit_account_id FK │          │  admin_comment TEXT?       │
   │  credit_account_id FK│          │  resolved_by FK?          │
   │  amount DEC(12,2)    │          │  resolved_at TSTZ?        │
   │  currency VARCHAR(3) │          │  created_at               │
   │  vat_rate DEC(5,4)   │          │  updated_at               │
   │  vat_amount DEC(10,2)│          └──────────┬───────────────┘
   │  description TEXT     │                    │ 1
   │  entry_type VARCHAR   │          ┌─────────┼──────────┐
   │  reservation_id?      │          │         │          │
   │  partner_id?          │          ▼ *       ▼ *        ▼ *
   │  created_by           │   ┌────────────┐┌───────────┐┌───────────────┐
   │  created_at           │   │claim_photos││claim_     ││claim_status_  │
   │  -- IMMUABLE --       │   │────────────││status_    ││history        │
   └──────────────────────┘   │id UUID PK  ││history    ││(ADR-017)      │
                              │claim_id FK ││(ADR-017)  ││               │
   ┌──────────────────────┐   │url TEXT    ││───────────│└───────────────┘
   │   ledger_accounts    │   │position   ││id UUID PK │
   │   (ADR-007)          │   │created_at ││claim_id FK│
   │──────────────────────│   └────────────┘│from_status│
   │  id UUID PK          │                 │to_status  │
   │  code VARCHAR UQ     │                 │event      │
   │  name TEXT           │                 │actor_id?  │
   │  type (asset,        │                 │actor_role │
   │    liability,        │                 │metadata   │
   │    revenue, expense) │                 │created_at │
   │  normal_balance      │                 └───────────┘
   │  entity_type         │
   │  entity_id?          │
   │  currency            │
   │  is_active           │
   │  description?        │
   │  created_at          │
   │  updated_at          │
   └──────────────────────┘


   ─── COMMISSIONS & PAYOUTS (ADR-007) ───

   ┌──────────────────────────────────────┐
   │  commission_configs                  │
   │──────────────────────────────────────│
   │  id UUID PK                          │
   │  scope (global/partner/              │
   │    partner_basket_type)              │
   │  partner_id UUID?                    │
   │  basket_type_id UUID?               │
   │  commission_rate DECIMAL(5,4)        │
   │  fee_minimum DECIMAL(10,2)           │
   │  effective_from TIMESTAMPTZ          │
   │  effective_to TIMESTAMPTZ?           │
   │  created_by UUID                     │
   │  created_at                          │
   │  notes TEXT?                         │
   └──────────────────────────────────────┘

   ┌──────────────────────────────────────┐
   │  payout_statements                   │
   │──────────────────────────────────────│
   │  id UUID PK                          │
   │  statement_number VARCHAR UQ         │
   │  partner_id UUID                     │
   │  period_start DATE                   │
   │  period_end DATE                     │
   │  total_sales_gross DEC(12,2)         │
   │  total_commission DEC(12,2)          │
   │  total_vat_on_commission DEC(10,2)   │
   │  total_refunds DEC(12,2)            │
   │  total_commission_adjustments        │
   │    DEC(12,2)                         │
   │  total_partner_adjustments DEC(12,2) │
   │  net_payout_amount DEC(12,2)         │
   │  previous_balance DEC(12,2)          │
   │  commission_rate DEC(5,4)            │
   │  fee_minimum DEC(10,2)              │
   │  fee_minimum_applied_count INT       │
   │  status (draft/generated/validated/  │
   │    payout_initiated/paid/error/      │
   │    deferred)                         │
   │  payout_date DATE?                   │
   │  payout_executed_at TSTZ?            │
   │  payout_reference VARCHAR?           │
   │  bank_account_display VARCHAR?       │
   │  pdf_url TEXT?                       │
   │  generated_at TSTZ                   │
   │  validated_by UUID?                  │
   │  validated_at TSTZ?                  │
   │  created_at                          │
   │  updated_at                          │
   │  UQ(partner_id, period_start)        │
   └────────┬─────────────────────────────┘
            │ 1
            ▼ *
   ┌──────────────────────────────────────┐
   │  payout_statement_lines              │
   │──────────────────────────────────────│
   │  id UUID PK                          │
   │  statement_id FK                     │
   │  payment_transaction_id FK           │
   │  reservation_id UUID                 │
   │  transaction_date TSTZ               │
   │  basket_title VARCHAR                │
   │  quantity INT                        │
   │  unit_price DEC(10,2)               │
   │  gross_amount DEC(10,2)             │
   │  commission_rate DEC(5,4)           │
   │  commission_amount DEC(10,2)        │
   │  fee_minimum_applied BOOLEAN         │
   │  net_amount DEC(10,2)               │
   │  line_type (sale/refund_full/        │
   │    refund_partial/adjustment)        │
   │  refund_id UUID?                     │
   │  created_at                          │
   └──────────────────────────────────────┘

   ┌──────────────────────────────────────┐
   │  reconciliation_alerts (ADR-007)     │
   │──────────────────────────────────────│
   │  id UUID PK                          │
   │  type (balance_mismatch/transaction_ │
   │    missing/transaction_extra/amount_ │
   │    mismatch/status_mismatch/         │
   │    ledger_imbalance)                 │
   │  severity (low/medium/high/critical) │
   │  description TEXT                    │
   │  details JSONB                       │
   │  payment_transaction_id FK?          │
   │  resolved BOOLEAN                    │
   │  resolved_at TSTZ?                   │
   │  resolved_by UUID?                   │
   │  resolution_notes TEXT?              │
   │  created_at                          │
   └──────────────────────────────────────┘


   ─── RECURRING TEMPLATES ───

   ┌──────────────────────────────────────┐
   │  recurring_templates                  │
   │──────────────────────────────────────│
   │  id UUID PK                          │
   │  store_id FK                         │
   │  title VARCHAR(60)                   │
   │  description TEXT?                   │
   │  original_price DECIMAL(10,2)        │
   │  selling_price DECIMAL(10,2)         │
   │  quantity_per_day INT                │
   │  category_id FK                      │
   │  photo_url TEXT?                     │
   │  pickup_start_time TIME              │
   │  pickup_end_time TIME                │
   │  days_of_week INT[] (0=lun..6=dim)   │
   │  status (active / inactive)          │
   │  created_at                          │
   │  updated_at                          │
   └──────────┬───────────────────────────┘
              │ 1
              ▼ *
   ┌──────────────────────────────────────┐
   │  recurring_exceptions                │
   │──────────────────────────────────────│
   │  id UUID PK                          │
   │  template_id FK                      │
   │  exception_date DATE                 │
   │  is_cancelled BOOLEAN                │
   │  created_at                          │
   └──────────────────────────────────────┘


   ─── NOTIFICATIONS & AUDIT ───

   ┌──────────────────────────────────────┐      ┌──────────────────────────┐
   │  notifications                       │      │  audit_logs              │
   │──────────────────────────────────────│      │──────────────────────────│
   │  id UUID PK                          │      │  id UUID PK             │
   │  recipient_id FK (users.id)          │      │  actor_id UUID?         │
   │  type (enum: 9 types)               │      │  actor_type TEXT        │
   │  title TEXT                          │      │  action TEXT            │
   │  body TEXT                           │      │  entity_type TEXT       │
   │  data JSONB                          │      │  entity_id UUID?       │
   │  read_at TIMESTAMPTZ?               │      │  changes JSONB         │
   │  created_at                          │      │  metadata JSONB        │
   │  -- purge a 30 jours --              │      │  created_at            │
   └──────────────────────────────────────┘      │  -- purge a 2 ans --   │
                                                 └──────────────────────────┘


   ─── GAMIFICATION ───

   ┌────────────────┐  ┌──────────────────┐  ┌───────────────────┐
   │   badges       │  │  user_badges     │  │   referrals       │
   │────────────────│  │──────────────────│  │───────────────────│
   │ id UUID PK     │  │ id UUID PK       │  │ id UUID PK        │
   │ slug UNIQUE    │  │ user_id FK       │  │ referrer_id FK    │
   │ names_fr/en    │  │ badge_id FK      │  │ referral_code     │
   │ threshold      │  │ earned_at        │  │ referee_id FK?    │
   │ threshold_type │  └──────────────────┘  │ status            │
   │ icon_url       │                        │ reward_granted_at │
   └────────────────┘                        │ created_at        │
                                             └───────────────────┘


   ─── FRAUD DETECTION (ADR-019) ───

   ┌──────────────────────────┐    ┌──────────────────────────┐
   │  fraud_rules             │    │  fraud_alerts            │
   │──────────────────────────│    │──────────────────────────│
   │  id UUID PK              │    │  id UUID PK              │
   │  slug TEXT UQ            │    │  alert_type TEXT         │
   │  name_fr TEXT            │    │  actor_type TEXT         │
   │  name_en TEXT?           │    │  actor_id FK             │
   │  description_fr TEXT?    │    │  severity (low/med/      │
   │  description_en TEXT?    │    │    high/critical)        │
   │  actor_type TEXT         │    │  details JSONB           │
   │  metric TEXT             │    │  status (new/            │
   │  operator TEXT           │    │    investigated/         │
   │  threshold DECIMAL       │    │    false_positive/       │
   │  window_days INT?        │    │    resolved)             │
   │  window_hours INT?       │    │  admin_comment TEXT?     │
   │  window_minutes INT?     │    │  resolved_by FK?         │
   │  min_sample_size INT     │    │  rule_id FK?             │
   │  action TEXT             │    │  metric_value DEC?       │
   │  severity TEXT           │    │  threshold_value DEC?    │
   │  is_active BOOLEAN       │    │  action_taken TEXT?      │
   │  cooldown_hours INT      │    │  auto_suspension_id?     │
   │  created_at              │    │  created_at              │
   │  updated_at              │    │  updated_at              │
   └──────────────────────────┘    └──────────────────────────┘

   ┌──────────────────────────┐    ┌──────────────────────────┐
   │  fraud_suspensions       │    │  device_fingerprints     │
   │  (ADR-019)               │    │  (ADR-019)               │
   │──────────────────────────│    │──────────────────────────│
   │  id UUID PK              │    │  id UUID PK              │
   │  user_id FK              │    │  user_id FK              │
   │  alert_id FK             │    │  ip_hash TEXT            │
   │  rule_id FK              │    │  device_id_hash TEXT?    │
   │  suspension_type TEXT    │    │  user_agent TEXT?        │
   │  duration_hours INT?     │    │  screen_info TEXT?       │
   │  reason_fr TEXT          │    │  locale TEXT?            │
   │  reason_en TEXT?         │    │  event_type TEXT         │
   │  status (active/lifted/  │    │  created_at              │
   │    escalated_to_ban)     │    │  -- purge a 90 jours --  │
   │  lifted_at TSTZ?         │    └──────────────────────────┘
   │  lifted_by UUID?         │
   │  lift_comment TEXT?      │
   │  reservations_cancelled  │
   │  refunds_issued          │
   │  created_at              │
   │  updated_at              │
   └──────────────────────────┘


   ─── APPROVAL WORKFLOW (ADR-018) ───

   ┌────────────────────────────────────────┐
   │  partner_registration_requests         │
   │  (ADR-018)                             │
   │────────────────────────────────────────│
   │  id UUID PK                            │
   │  user_id FK                            │
   │  business_data JSONB                   │
   │  document_urls JSONB                   │
   │  registration_channel (enum)           │
   │  status (ApprovalStatus)               │
   │  reviewed_by FK?                       │
   │  assigned_at TSTZ?                     │
   │  rejection_reasons TEXT[]              │
   │  admin_comment TEXT?                   │
   │  internal_note TEXT?                   │
   │  resolved_at TSTZ?                     │
   │  previous_request_id FK?              │
   │  created_at                            │
   │  updated_at                            │
   └────────────────────────────────────────┘


   ─── TABLES DE REFERENCE (systeme) ───

   ┌──────────────────────────┐  ┌──────────────────────────┐
   │  categories              │  │  tags                    │
   │──────────────────────────│  │──────────────────────────│
   │  id UUID PK              │  │  id UUID PK              │
   │  slug UNIQUE             │  │  slug UNIQUE             │
   │  names_fr TEXT           │  │  names_fr TEXT           │
   │  names_en TEXT?          │  │  names_en TEXT?          │
   │  names_kr TEXT?          │  │  names_kr TEXT?          │
   │  icon TEXT?              │  │  icon TEXT?              │
   │  is_active BOOLEAN       │  │  description TEXT?       │
   │  created_at              │  │  is_active BOOLEAN       │
   │  updated_at              │  │  created_at              │
   └──────────────────────────┘  │  updated_at              │
                                 └──────────────────────────┘

   ┌──────────────────────────┐  ┌──────────────────────────┐
   │  app_settings            │  │  holidays                │
   │──────────────────────────│  │──────────────────────────│
   │  key TEXT PK             │  │  id UUID PK              │
   │  value JSONB             │  │  date DATE               │
   │  description TEXT        │  │  name_fr TEXT            │
   │  updated_by FK?          │  │  name_en TEXT?           │
   │  updated_at              │  │  is_recurring BOOLEAN    │
   └──────────────────────────┘  │  created_at              │
                                 └──────────────────────────┘

   ┌──────────────────────────┐  ┌──────────────────────────┐
   │  claim_reasons           │  │  email_templates         │
   │──────────────────────────│  │──────────────────────────│
   │  slug TEXT PK            │  │  id UUID PK              │
   │  label_fr TEXT           │  │  slug UNIQUE             │
   │  label_en TEXT?          │  │  subject_fr TEXT         │
   │  label_kr TEXT?          │  │  subject_en TEXT?        │
   │  is_active BOOLEAN       │  │  body_fr TEXT            │
   │  position INT            │  │  body_en TEXT?           │
   │  created_at              │  │  variables JSONB         │
   └──────────────────────────┘  │  updated_at              │
                                 └──────────────────────────┘

   ┌──────────────────────────┐  ┌──────────────────────────┐
   │  consent_records         │  │  support_tickets         │
   │  (ADR-021)               │  │──────────────────────────│
   │──────────────────────────│  │  id UUID PK              │
   │  id UUID PK              │  │  user_id FK              │
   │  user_id FK              │  │  subject TEXT            │
   │  type TEXT               │  │  description TEXT        │
   │    (terms_of_service,    │  │  screenshots JSONB       │
   │     privacy_policy,      │  │  status (open, closed)   │
   │     dietary_preferences, │  │  created_at              │
   │     marketing_notifs,    │  │  updated_at              │
   │     analytics_cookies,   │  └──────────────────────────┘
   │     marketing_cookies)   │
   │  version TEXT?           │
   │  choice BOOLEAN          │
   │  ip TEXT?                │
   │  user_agent TEXT?        │
   │  created_at              │
   └──────────────────────────┘
```

---

## Index critiques

### Index de performance primaires

```sql
-- === RESERVATIONS (table la plus sollicitee) ===

-- Recherche des reservations par consommateur (historique)
CREATE INDEX idx_reservations_consumer ON reservations (consumer_id, created_at DESC);

-- Recherche des reservations par panier (verification de stock, listing partenaire)
CREATE INDEX idx_reservations_basket_status ON reservations (basket_id, status);

-- Job d'expiration des holds de 5 minutes (ADR-008)
CREATE INDEX idx_reservations_pending_expires ON reservations (expires_at)
  WHERE status = 'pending_payment';

-- Reservations actives d'un panier (pour le comptage temps reel)
CREATE INDEX idx_reservations_basket_active ON reservations (basket_id)
  WHERE status IN ('pending_payment', 'confirmed', 'ready');

-- Historique de transitions
CREATE INDEX idx_reservation_status_history ON reservation_status_history (reservation_id, created_at);


-- === PANIERS ===

-- Paniers publies d'un store (listing partenaire)
CREATE INDEX idx_baskets_store_status ON baskets (store_id, status, pickup_start);

-- Paniers publies pour la recherche consommateur
CREATE INDEX idx_baskets_published_pickup ON baskets (pickup_start, pickup_end)
  WHERE status = 'published' AND stock > 0;

-- Recherche par categorie
CREATE INDEX idx_baskets_category ON baskets (category_id)
  WHERE status = 'published';


-- === GEOSPATIAL ===

-- Recherche par proximite (PostGIS GiST index)
CREATE INDEX idx_stores_location ON stores USING GIST (location);

-- Stores actifs seulement
CREATE INDEX idx_stores_active_location ON stores USING GIST (location)
  WHERE status = 'active';


-- === LEDGER (ADR-005, ADR-007) ===

-- Entries par journal (groupement des ecritures d'une meme operation)
CREATE INDEX idx_ledger_entries_journal ON ledger_entries (journal_id);

-- Entries par type
CREATE INDEX idx_ledger_entries_type ON ledger_entries (entry_type);

-- Entries par compte (calcul de solde, releves)
CREATE INDEX idx_ledger_entries_account_date ON ledger_entries (debit_account_id, created_at);
CREATE INDEX idx_ledger_entries_credit_date ON ledger_entries (credit_account_id, created_at);

-- Entries par partenaire (releves mensuels)
CREATE INDEX idx_ledger_entries_partner ON ledger_entries (partner_id, created_at);

-- Entries par reservation
CREATE INDEX idx_ledger_entries_reservation ON ledger_entries (reservation_id);

-- Entries par date (purge)
CREATE INDEX idx_ledger_entries_date ON ledger_entries (created_at);

-- Comptes par entite (trouver le compte d'un partenaire)
CREATE INDEX idx_ledger_accounts_entity ON ledger_accounts (entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

-- Commission : resolution du taux applicable
CREATE INDEX idx_commission_global ON commission_configs (scope, effective_from)
  WHERE scope = 'global' AND effective_to IS NULL;
CREATE INDEX idx_commission_partner ON commission_configs (partner_id, scope, effective_from)
  WHERE scope = 'partner' AND effective_to IS NULL;


-- === PAYOUT STATEMENTS (ADR-007) ===

CREATE INDEX idx_payout_statements_partner ON payout_statements (partner_id, period_start);
CREATE INDEX idx_payout_statements_status ON payout_statements (status);
CREATE INDEX idx_payout_statement_lines_stmt ON payout_statement_lines (statement_id);


-- === RECONCILIATION (ADR-007) ===

CREATE INDEX idx_recon_alerts_unresolved ON reconciliation_alerts (resolved, created_at)
  WHERE resolved = FALSE;


-- === AUDIT LOGS ===

-- Filtre par utilisateur (US-A032)
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id, created_at DESC);

-- Filtre par type d'action (US-A033)
CREATE INDEX idx_audit_logs_action ON audit_logs (action, created_at DESC);

-- Filtre par entite (timeline d'un objet)
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id, created_at DESC);


-- === NOTIFICATIONS ===

-- Notifications non lues d'un utilisateur (badge compteur)
CREATE INDEX idx_notifications_unread ON notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL;

-- Purge des notifications > 30 jours
CREATE INDEX idx_notifications_created ON notifications (created_at);


-- === FAVORIS ===

-- Favoris d'un consommateur
CREATE INDEX idx_favorites_user ON favorites (user_id);

-- Unicite (un seul favori par couple consommateur/store)
CREATE UNIQUE INDEX idx_favorites_unique ON favorites (user_id, store_id);


-- === REVIEWS ===

-- Avis par store (calcul de moyenne sur 12 mois)
CREATE INDEX idx_reviews_store ON reviews (partner_id, created_at DESC);


-- === FRAUD (ADR-019) ===

-- Alertes non resolues
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts (status, created_at DESC)
  WHERE status NOT IN ('false_positive', 'resolved');

-- Cooldown (eviter les doublons de regles)
CREATE UNIQUE INDEX idx_fraud_alerts_cooldown
  ON fraud_alerts (rule_id, actor_id, created_at DESC)
  WHERE status = 'new';

-- Suspensions actives d'un utilisateur
CREATE INDEX idx_fraud_suspensions_user ON fraud_suspensions (user_id)
  WHERE status = 'active';

-- Fingerprints par device (detection multi-comptes)
CREATE INDEX idx_fingerprints_device ON device_fingerprints (device_id_hash, created_at DESC)
  WHERE device_id_hash IS NOT NULL;

-- Fingerprints par IP (inscriptions en masse)
CREATE INDEX idx_fingerprints_ip_signup ON device_fingerprints (ip_hash, created_at DESC)
  WHERE event_type = 'signup';

-- Purge des fingerprints > 90 jours
CREATE INDEX idx_fingerprints_created ON device_fingerprints (created_at);


-- === APPROVAL WORKFLOW (ADR-018) ===

-- Demandes de modification par store et statut
CREATE INDEX idx_store_mod_requests_store ON store_modification_requests (store_id, status);

-- File d'attente admin
CREATE INDEX idx_store_mod_requests_status ON store_modification_requests (status, created_at);
CREATE INDEX idx_partner_reg_requests_status ON partner_registration_requests (status, created_at);

-- Assignation admin
CREATE INDEX idx_store_mod_requests_reviewer ON store_modification_requests (reviewed_by);
CREATE INDEX idx_partner_reg_requests_reviewer ON partner_registration_requests (reviewed_by);


-- === PAYMENT TRANSACTIONS ===

-- Transactions par reservation
CREATE INDEX idx_payment_tx_reservation ON payment_transactions (reservation_id, created_at);

-- Reconciliation avec Peach Payments
CREATE INDEX idx_payment_tx_provider ON payment_transactions (provider_tx_id)
  WHERE provider_tx_id IS NOT NULL;


-- === USER ROLES (ADR-011) ===

CREATE INDEX idx_user_roles_user ON user_roles (user_id);

-- === PARTNER STORES (ADR-011) ===

CREATE INDEX idx_partner_stores_partner ON partner_stores (partner_id);
CREATE INDEX idx_partner_stores_store ON partner_stores (store_id);


-- === CONSENT RECORDS (ADR-021) ===

CREATE INDEX idx_consent_records_user ON consent_records (user_id, created_at DESC);


-- === CLAIM STATUS HISTORY (ADR-017) ===

CREATE INDEX idx_claim_status_history ON claim_status_history (claim_id, created_at);
```

### Contraintes d'integrite supplementaires

```sql
-- Le prix de vente doit etre <= 50% du prix initial (regle metier)
ALTER TABLE baskets ADD CONSTRAINT chk_baskets_price
  CHECK (selling_price <= original_price * 0.50);

-- Le stock ne peut pas etre negatif
ALTER TABLE baskets ADD CONSTRAINT chk_baskets_stock
  CHECK (stock >= 0);

-- Le rating doit etre entre 1 et 5
ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating
  CHECK (rating >= 1 AND rating <= 5);

-- Les montants du ledger doivent etre positifs (ADR-005)
ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_amount
  CHECK (amount > 0);

-- Un debit ne peut pas etre sur le meme compte qu'un credit
ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_different_accounts
  CHECK (debit_account_id <> credit_account_id);

-- Commission rate doit etre entre 0 et 1
ALTER TABLE commission_configs ADD CONSTRAINT chk_commission_rate
  CHECK (commission_rate >= 0 AND commission_rate <= 1);

-- Fee minimum doit etre >= 0
ALTER TABLE commission_configs ADD CONSTRAINT chk_commission_fee
  CHECK (fee_minimum >= 0);

-- Les photos de reclamation sont limitees a 5
-- (applique en code applicatif, pas en contrainte SQL)

-- Fraud rules : seuils valides
ALTER TABLE fraud_rules ADD CONSTRAINT chk_fraud_rules_threshold
  CHECK (threshold > 0);
ALTER TABLE fraud_rules ADD CONSTRAINT chk_fraud_rules_cooldown
  CHECK (cooldown_hours >= 1);
```

---

## Decisions resumees

| # | Question | Decision | Justification |
|---|----------|----------|---------------|
| Q1 | Audit trail | CRUD + table `audit_logs` applicative | Le ledger couvre la finance. L'audit table couvre le reste. Event Sourcing est overkill. |
| Q2 | Schema | Schema unique `public` | Prisma `multiSchema` est en preview. Un schema suffit pour ~45 tables. |
| Q3 | Suppression | Strategie mixte par entite | Soft delete pour les entites archivables, hard delete + anonymisation pour les comptes (DPA), jamais de suppression pour les faits comptables. |
| Q4 | Partitionnement | Differe (prepare, pas active) | 15M lignes en 3 ans ne justifient pas le partitionnement. Purge par batch suffisante. Plan documente pour activation future. |
| Q5 | Geospatial | PostGIS `GEOMETRY(Point, 4326)` + trigger sync | Standard de l'industrie, index GiST, compatible Supabase. Trigger pour synchroniser lat/lng (Prisma) vers location (PostGIS). |
| Q6 | Migrations | Prisma Migrate + SQL brut | Prisma pour le schema principal, SQL brut dans les migrations pour PostGIS, triggers, index GiST. |

---

## Consequences

### Positives

1. **Simplicite** : un schema unique, un ORM, un outil de migration. L'equipe n'a pas besoin d'apprendre Event Sourcing ni de gerer des schemas multiples.
2. **Conformite DPA** : la strategie de suppression par entite respecte le Data Protection Act 2017 de Maurice (anonymisation reelle, pas de soft delete perpetuel). Les `consent_records` tracent les preuves de consentement.
3. **Performance** : les index sont cibles sur les requetes critiques (recherche geo, stock temps reel, audit filtrage). La volumetrie estimee est largement geree par PostgreSQL sans partitionnement.
4. **Auditabilite** : l'audit trail couvre les 80+ types d'evenements exiges par US-A031 a US-A037. Le ledger double-entry (ADR-005, ADR-007) couvre l'auditabilite financiere. Les `reservation_status_history` et `claim_status_history` (ADR-017) tracent chaque transition d'etat.
5. **Evolutivite** : le schema est "partition-ready" si les volumes le justifient un jour.
6. **Coherence** : les enums sont alignes avec les machines a etats (ADR-017), le modele utilisateur est unifie (ADR-011), les workflows d'approbation ont leurs tables dediees (ADR-018), la detection de fraude est configurable (ADR-019).

### Negatives

1. **SQL brut pour PostGIS** : les requetes spatiales echappent a la type-safety de Prisma. Mitigation : encapsulation dans un `GeoService` dedie.
2. **Discipline requise** : l'audit trail applicatif depend de la discipline du code. Mitigation : tests d'integration sur chaque mutation critique.
3. **Schema `public` dense** : avec ~45 tables dans un seul schema, les outils d'exploration montrent tout en vrac. Mitigation : convention de nommage claire.
4. **Jobs de purge critiques** : si les jobs echouent, les tables gonflent. Mitigation : monitoring du volume + alertes.

---

## Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Prisma ne supporte pas une requete complexe | Moyenne | Faible | `prisma.$queryRaw`. Eventuel ajout de Kysely. |
| L'audit trail manque des evenements | Moyenne | Moyen | Tests d'integration. Revue de code systematique. |
| La purge par batch est trop lente a >50M lignes | Faible | Moyen | Activation du partitionnement (plan documente). |
| PostGIS non compatible avec une future migration | Tres faible | Faible | PostGIS est standard, disponible partout. |
| Desynchronisation enums ADR-003 vs code | Moyenne | Moyen | Tests automatises verifiant la concordance schema Prisma / ADR-003. |
| Le trigger PostGIS est desynchronise avec Prisma | Faible | Faible | Trigger versionne dans la migration Prisma. |

---

## Annexes

### A. Table `app_settings` -- cles de configuration

| Cle | Type | Valeur par defaut | Description | Source |
|-----|------|-------------------|-------------|--------|
| `commission_rate` | number | `0.25` | Taux de commission plateforme (25%) | ADR-007 |
| `commission_fee_minimum` | number | `50` | Fee minimum en MUR | ADR-007 |
| `reservation_hold_minutes` | number | `5` | Duree du hold de reservation | ADR-008 |
| `claim_window_hours` | number | `24` | Fenetre pour ouvrir une reclamation apres retrait | |
| `review_edit_window_hours` | number | `24` | Fenetre d'edition d'un avis apres retrait | |
| `notification_retention_days` | number | `30` | Retention des notifications | |
| `audit_retention_years` | number | `2` | Retention des audit logs | |
| `min_discount_percent` | number | `0.50` | Reduction minimum obligatoire (50%) | |
| `referral_reward_type` | string | `'discount'` | Type de recompense parrainage | |
| `referral_reward_amount` | number | `50` | Montant/pourcentage de la recompense | |
| `fraud_noshow_threshold` | number | `0.40` | Seuil no-show (40%) pour alerte fraude | ADR-019 |
| `fraud_claim_threshold` | number | `0.30` | Seuil reclamations (30%) pour alerte fraude | ADR-019 |
| `fraud_cancel_threshold` | number | `0.15` | Seuil annulations partenaire (15%) | ADR-019 |
| `fraud_mass_cancel_count` | number | `5` | Nombre d'annulations en masse declenchant alerte | ADR-019 |
| `fraud_mass_cancel_hours` | number | `1` | Fenetre temporelle pour les annulations en masse | ADR-019 |
| `fraud_payment_failure_count` | number | `10` | Nombre d'echecs paiement declenchant alerte | ADR-019 |
| `fraud_payment_failure_minutes` | number | `30` | Fenetre temporelle pour les echecs paiement | ADR-019 |
| `fraud_auto_suspend_duration_hours` | number | `168` | Duree de la suspension automatique (7 jours) | ADR-019 |
| `fraud_auto_suspend_noshow_count` | number | `3` | No-shows declenchant suspension auto | ADR-019 |
| `fraud_auto_suspend_cancel_count` | number | `6` | Annulations declenchant suspension auto | ADR-019 |
| `fraud_batch_interval_minutes` | number | `15` | Intervalle du CRON batch fraude | ADR-019 |
| `fraud_fingerprint_retention_days` | number | `90` | Retention des fingerprints | ADR-019 |
| `approval_reminder_hours` | number | `24` | Delai avant premier rappel admin | ADR-018 |
| `approval_urgent_hours` | number | `48` | Delai avant escalation a tous les admins | ADR-018 |
| `approval_escalation_hours` | number | `72` | Delai avant escalation au super_admin | ADR-018 |

### B. Types de notifications (US-C062)

```
favorite_new_basket    -> Un partenaire favori a publie un panier (US-C063)
reservation_confirmed  -> Reservation confirmee (US-C064)
pickup_reminder        -> Rappel avant creneau de retrait (US-C065)
partner_cancelled      -> Le partenaire a annule le panier (US-C066)
refund_processed       -> Remboursement effectue (US-C067)
no_show                -> Retrait non effectue (US-C068)
claim_resolved         -> Reclamation resolue (US-C069)
referral_validated     -> Parrainage valide (US-C070)
badge_earned           -> Badge debloque (US-C059)
```

### C. Seeds pour les donnees de reference

```typescript
// prisma/seed.ts
async function main() {
  // Categories de paniers (US-A042)
  await prisma.category.createMany({
    data: [
      { slug: 'repas-complet', namesFr: 'Repas complet', namesEn: 'Full meal', namesKr: 'Repa konple', icon: 'utensils' },
      { slug: 'viennoiseries', namesFr: 'Viennoiseries', namesEn: 'Pastries', namesKr: 'Vienwazon', icon: 'croissant' },
      { slug: 'patisseries', namesFr: 'Patisseries', namesEn: 'Cakes & desserts', namesKr: 'Patisri', icon: 'cake' },
      { slug: 'salades-frais', namesFr: 'Salades & Frais', namesEn: 'Salads & Fresh', namesKr: 'Salad ek Fre', icon: 'salad' },
      { slug: 'panier-mixte', namesFr: 'Panier mixte', namesEn: 'Mixed basket', namesKr: 'Panye mikse', icon: 'basket' },
      { slug: 'boissons', namesFr: 'Boissons', namesEn: 'Beverages', namesKr: 'Bwason', icon: 'cup' },
    ],
    skipDuplicates: true,
  });

  // Tags alimentaires (US-A043)
  await prisma.tag.createMany({
    data: [
      { slug: 'halal', namesFr: 'Halal', namesEn: 'Halal', namesKr: 'Halal', icon: 'halal' },
      { slug: 'vegetarien', namesFr: 'Vegetarien', namesEn: 'Vegetarian', namesKr: 'Vejetaryen', icon: 'leaf' },
      { slug: 'vegan', namesFr: 'Vegan', namesEn: 'Vegan', namesKr: 'Vegan', icon: 'seedling' },
      { slug: 'sans-gluten', namesFr: 'Sans gluten', namesEn: 'Gluten-free', namesKr: 'San gliten', icon: 'wheat-off' },
      { slug: 'sans-lactose', namesFr: 'Sans lactose', namesEn: 'Lactose-free', namesKr: 'San laktoz', icon: 'milk-off' },
    ],
    skipDuplicates: true,
  });

  // Comptes ledger systeme (ADR-005, ADR-007)
  await prisma.ledgerAccount.createMany({
    data: [
      { code: 'GATEWAY', name: 'Fonds Peach Payments', type: 'asset', normalBalance: 'debit', entityType: 'system' },
      { code: 'CONSUMER_HOLDING', name: 'Fonds consommateurs en attente', type: 'liability', normalBalance: 'credit', entityType: 'system' },
      { code: 'PLATFORM_REVENUE', name: 'Commissions BienBon', type: 'revenue', normalBalance: 'credit', entityType: 'system' },
      { code: 'PLATFORM_REVENUE_ADJUSTMENT', name: 'Ajustements de commission', type: 'revenue', normalBalance: 'debit', entityType: 'system' },
      { code: 'VAT_COLLECTED', name: 'TVA collectee', type: 'liability', normalBalance: 'credit', entityType: 'system' },
      { code: 'REFUND_PENDING', name: 'Remboursements en attente', type: 'liability', normalBalance: 'credit', entityType: 'system' },
      { code: 'PAYOUT_TRANSIT', name: 'Payouts en transit', type: 'liability', normalBalance: 'credit', entityType: 'system' },
      { code: 'PROCESSING_FEES', name: 'Frais de processing', type: 'expense', normalBalance: 'debit', entityType: 'system' },
    ],
    skipDuplicates: true,
  });
}
```

### D. Nombre de tables par module

| Module | Tables | Nombre |
|--------|--------|:------:|
| Core / Utilisateurs | `users`, `user_roles`, `consumer_profiles`, `partner_profiles`, `admin_profiles`, `stores`, `partner_stores`, `store_photos`, `store_hours` | 9 |
| Paniers | `baskets`, `categories`, `tags`, `basket_tags`, `recurring_templates`, `recurring_exceptions` | 6 |
| Reservations | `reservations`, `reservation_status_history` | 2 |
| Paiements & Ledger | `payment_transactions`, `ledger_accounts`, `ledger_entries`, `commission_configs`, `payout_statements`, `payout_statement_lines`, `reconciliation_alerts` | 7 |
| Social | `reviews`, `favorites` | 2 |
| Reclamations | `claims`, `claim_photos`, `claim_reasons`, `claim_status_history` | 4 |
| Notifications | `notifications` | 1 |
| Gamification | `badges`, `user_badges`, `referrals` | 3 |
| Approbation admin | `store_modification_requests`, `partner_registration_requests`, `support_tickets` | 3 |
| Fraude | `fraud_rules`, `fraud_alerts`, `fraud_suspensions`, `device_fingerprints` | 4 |
| Systeme | `audit_logs`, `app_settings`, `email_templates`, `holidays`, `consent_records` | 5 |
| **Total** | | **46** |

### E. Nombre d'index

| Categorie | Nombre |
|-----------|:------:|
| Reservations | 5 |
| Paniers | 3 |
| Geospatial (PostGIS GiST) | 2 |
| Ledger & Paiements | 11 |
| Payout statements | 3 |
| Reconciliation | 1 |
| Audit logs | 3 |
| Notifications | 2 |
| Favoris | 2 |
| Reviews | 1 |
| Fraude | 6 |
| Approbation admin | 6 |
| Payment transactions | 2 |
| User roles | 1 |
| Partner stores | 2 |
| Consent records | 1 |
| Claim status history | 1 |
| **Total** | **52** |

### F. Correspondance tables ADR-003 (ancien) vs ADR-003 (consolide)

| Ancien nom (ADR-003 v1) | Nouveau nom | Source du changement |
|--------------------------|-------------|---------------------|
| `profiles` | `users` | ADR-011 (modele utilisateur unifie) |
| `commerces` | `stores` | ADR-011, ADR-018 (alignement nommage) |
| `commerce_hours` | `store_hours` | Renommage coherent avec `stores` |
| `commerce_photos` | `store_photos` | Renommage coherent avec `stores` |
| `partner_mod_requests` | `store_modification_requests` | ADR-018 (workflow approbation) |
| *(n'existait pas)* | `user_roles` | ADR-011 (RBAC) |
| *(n'existait pas)* | `consumer_profiles` | ADR-011 (profils par type) |
| *(n'existait pas)* | `partner_profiles` | ADR-011 (profils par type) |
| *(n'existait pas)* | `admin_profiles` | ADR-011 (profils par type) |
| *(n'existait pas)* | `partner_stores` | ADR-011 (multi-commerce) |
| *(n'existait pas)* | `reservation_status_history` | ADR-017 (state machines) |
| *(n'existait pas)* | `claim_status_history` | ADR-017 (state machines) |
| *(n'existait pas)* | `partner_registration_requests` | ADR-018 (workflow approbation) |
| *(n'existait pas)* | `commission_configs` | ADR-007 (commissions) |
| *(n'existait pas)* | `payout_statements` | ADR-007 (reversements) |
| *(n'existait pas)* | `payout_statement_lines` | ADR-007 (reversements) |
| *(n'existait pas)* | `reconciliation_alerts` | ADR-007 (reconciliation) |
| *(n'existait pas)* | `fraud_rules` | ADR-019 (detection fraude) |
| *(n'existait pas)* | `fraud_suspensions` | ADR-019 (suspensions auto) |
| *(n'existait pas)* | `device_fingerprints` | ADR-019 (fingerprinting) |
| *(n'existait pas)* | `consent_records` | ADR-021 (conformite DPA) |

---

## References

### PostgreSQL et Prisma
- [Prisma Multi-Schema Support (Preview)](https://www.prisma.io/docs/orm/prisma-schema/data-model/multi-schema)
- [Prisma Raw Queries](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries)
- [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate)
- [PostgreSQL Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)

### PostGIS
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Supabase PostGIS Extension](https://supabase.com/docs/guides/database/extensions/postgis)

### Audit Trail
- [Martin Fowler - Audit Log](https://martinfowler.com/eaaDev/AuditLog.html)

### ADR internes consolidees
- ADR-005 : Architecture de paiement (pre-auth, capture, refund, `payment_transactions`)
- ADR-007 : Ledger et commissions (`ledger_accounts`, `ledger_entries`, `commission_configs`, `payout_statements`, `payout_statement_lines`, `reconciliation_alerts`)
- ADR-008 : Stock et reservations (decrement atomique, hold 5 min)
- ADR-010 : Authentification (Supabase Auth, `auth.users`)
- ADR-011 : RBAC (`users`, `user_roles`, `consumer_profiles`, `partner_profiles`, `admin_profiles`, `partner_stores`)
- ADR-017 : State machines (enums `ReservationStatus`, `BasketStatus`, `ClaimStatus`, `PartnerStatus` ; tables `reservation_status_history`, `claim_status_history`)
- ADR-018 : Workflow approbation (`store_modification_requests`, `partner_registration_requests`)
- ADR-019 : Detection fraude (`fraud_rules`, `fraud_alerts` enrichie, `fraud_suspensions`, `device_fingerprints`)
- ADR-021 : Conformite DPA (`consent_records`, politique d'anonymisation)

### Conformite
- [Data Protection Act 2017 Maurice](https://dataprotection.govmu.org/Pages/The%20Law/Data-Protection-Act-2017.aspx)
- [GDPR Right to Erasure - Implementation Patterns](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/individual-rights/right-to-erasure/)
