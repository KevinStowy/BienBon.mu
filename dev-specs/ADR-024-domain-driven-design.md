# ADR-024 : Domain-Driven Design -- bounded contexts, agregats et architecture modulaire

| Champ         | Valeur                                                                  |
|---------------|-------------------------------------------------------------------------|
| **Statut**    | Propose                                                                 |
| **Date**      | 2026-02-27                                                              |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                                     |
| **Decideurs** | Equipe technique BienBon                                                |
| **Scope**     | DDD strategique et tactique, bounded contexts, agregats, domain events, ubiquitous language, architecture hexagonale |
| **Prereqs**   | ADR-001 (stack), ADR-002 (architecture), ADR-003 (schema DB), ADR-005 (paiement), ADR-007 (ledger), ADR-008 (stock), ADR-011 (RBAC), ADR-014 (notifications), ADR-017 (state machines), ADR-018 (workflow approbation), ADR-019 (fraude) |
| **Refs**      | 206 user stories, 4 modules (consommateur, partenaire, admin, transversal) |

---

## 1. Contexte

### 1.1 Pourquoi le DDD pour BienBon

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. L'ADR-002 a choisi un monolithe modulaire NestJS avec extraction progressive. Les 16 modules NestJS envisages (`auth`, `consumers`, `partners`, `stores`, `baskets`, `reservations`, `payments`, `notifications`, `claims`, `reviews`, `favorites`, `referrals`, `gamification`, `admin`, `fraud`, `media`) doivent etre structures avec des frontieres claires.

**Le DDD est utile ici pour trois raisons concretes :**

1. **Code genere par IA.** Quand on demande a une IA de coder le module `reservations`, les bounded contexts lui donnent un cadre precis : "voici tes entites, voici tes interfaces avec les autres modules, voici les invariants a respecter". Sans DDD, l'IA produit du code couple et incoherent.

2. **Monolithe modulaire.** Le risque principal d'un monolithe est le "big ball of mud" (ADR-002, consequence negative #1). Les bounded contexts formalisent les frontieres que le linting seul ne peut pas imposer. Un import interdit est une erreur syntaxique ; une violation de bounded context est une erreur semantique.

3. **206 user stories.** Le volume fonctionnel est substantiel. Sans modele de domaine, les 206 US deviennent une liste de features decorrelee. Avec un modele, chaque US s'insere dans un bounded context avec des entites et des regles metier identifiees.

### 1.2 Ce que cette ADR couvre

| # | Question |
|---|----------|
| Q1 | Quel niveau de DDD adopter ? (strategique, tactique leger, tactique complet) |
| Q2 | Quels bounded contexts, quelles entites, quelles frontieres ? |
| Q3 | Context map : relations entre bounded contexts |
| Q4 | Agregats pour les modules critiques |
| Q5 | Convention de domain events |
| Q6 | Ubiquitous language (glossaire FR -> EN -> code) |
| Q7 | Architecture hexagonale / ports & adapters dans NestJS |
| Q8 | Structure de fichiers recommandee par module |

---

## 2. Q1 : Quel niveau de DDD adopter ?

### Niveaux possibles

| Niveau | Patterns | Effort | Valeur pour BienBon |
|--------|----------|--------|---------------------|
| **Strategique** | Bounded contexts, ubiquitous language, context map | Faible | **Elevee** -- structure les modules, clarifie les responsabilites |
| **Tactique leger** | Entities, Value Objects, Domain Events | Moyen | **Elevee** pour les modules complexes (Ordering, Payment, Catalog) |
| **Tactique complet** | Aggregates stricts, Repositories abstraits, Domain Services, Specifications | Eleve | **Overkill** pour une equipe de 2-5 devs |

### Option A : DDD strategique uniquement

On definit les bounded contexts, le ubiquitous language et la context map. Le code reste des services NestJS classiques avec Prisma, sans couche d'abstraction domaine.

**Avantages :** Minimal effort, pas de couche d'abstraction supplementaire, l'equipe code vite.
**Inconvenients :** Les invariants metier sont disperses dans les services. L'IA n'a pas de modele de domaine a respecter.

### Option B : DDD strategique + tactique leger sur les modules complexes

On applique le strategique partout. Pour les 4-5 modules ou la logique metier est dense (Ordering, Payment, Catalog, Partner, Claims), on ajoute :
- Des **entities** et **value objects** types (pas des classes lourdes, des types TypeScript)
- Des **domain events** (deja inities par ADR-017)
- Des **regles metier explicites** dans des fonctions pures testables

Les modules simples (favorites, notifications, media) restent en CRUD NestJS classique.

**Avantages :** Le modele de domaine guide l'IA sur les modules critiques. Les invariants sont testes unitairement. L'effort est concentre ou la complexite est reelle.
**Inconvenients :** Deux "styles" de code dans le meme monolithe (DDD leger vs CRUD). Necessite de la discipline pour ne pas sur-ingenierer les modules simples.

### Option C : DDD tactique complet partout

Chaque module a une couche domaine (entities, aggregates, repositories abstraits, domain services), une couche application (use cases / command handlers), et une couche infra (Prisma repos, API clients).

**Avantages :** Architecture propre, forte testabilite, decoupage clair.
**Inconvenients :** **Disproportionne.** Un module `favorites` avec un aggregate `FavoriteList`, un repository `IFavoriteRepository`, et un use case `AddToFavorites` pour wrapper un `prisma.favorite.create()` est de la ceremonie inutile. L'equipe passe plus de temps a ecrire du plumbing qu'a livrer des features.

### Evaluation

| Critere (poids) | A : Strategique seul | B : Strategique + tactique leger | C : Tactique complet |
|-----------------|:--------------------:|:--------------------------------:|:--------------------:|
| Vitesse de livraison (30%) | 5 | 4 | 2 |
| Protection des invariants (25%) | 2 | 4 | 5 |
| Guidage de l'IA (20%) | 3 | 5 | 5 |
| Maintenabilite (15%) | 3 | 4 | 4 |
| Courbe d'apprentissage (10%) | 5 | 4 | 2 |
| **Score pondere** | **3.55** | **4.15** | **3.45** |

### Decision Q1 : Option B -- DDD strategique partout + tactique leger sur les modules complexes

**Modules qui justifient du DDD tactique** (logique metier dense, state machines, invariants financiers) :
- **Ordering** (reservations, state machine 8 etats, concurrence stock)
- **Payment** (ledger double-entry, commissions, payouts, 4 PSP)
- **Catalog** (paniers, stock, recurrence, tags, creneaux)
- **Partner** (onboarding, modification requests, multi-commerce, state machine 5 etats)
- **Claims** (reclamations, state machine 4 etats, remboursements)

**Modules en CRUD NestJS classique** (logique simple, pas d'invariants complexes) :
- Favorites, Reviews, Notifications, Media, Gamification/Referrals, Admin (dashboard/config)

**Regle pragmatique :** Un module merite du DDD tactique si et seulement si il a au moins une de ces proprietes : (a) une state machine, (b) des invariants financiers, (c) des regles metier avec des gardes et des effets de bord, (d) plus de 15 user stories. Sinon, CRUD.

---

## 3. Q2 : Bounded Contexts -- identification, entites, frontieres

### 3.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BienBon.mu Domain                              │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │  Identity    │  │  Consumer   │  │  Partner    │  │   Catalog     │  │
│  │  & Access    │  │             │  │             │  │               │  │
│  │             │  │  profil     │  │  onboarding │  │  paniers      │  │
│  │  auth       │  │  preferences│  │  commerces  │  │  stock        │  │
│  │  RBAC       │  │  favoris    │  │  mod reqs   │  │  recurrence   │  │
│  │  sessions   │  │  gamification│ │  statistiques│ │  tags         │  │
│  │             │  │  parrainage │  │             │  │  categories   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬────────┘  │
│         │                │                │                │            │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴────────┐  │
│  │  Ordering   │  │  Payment    │  │  Fulfillment│  │  Review &     │  │
│  │             │  │             │  │             │  │  Claims       │  │
│  │  reservations│ │  ledger     │  │  pickup     │  │               │  │
│  │  state machine│ │  commissions│ │  QR/PIN     │  │  avis/notes   │  │
│  │  concurrence│  │  payouts    │  │  no-show    │  │  reclamations │  │
│  │             │  │  PSP adapters│ │             │  │  remboursement│  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────┘  │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │ Notification │  │   Fraud     │  │   Admin     │                     │
│  │             │  │             │  │             │                     │
│  │  push       │  │  regles     │  │  dashboard  │                     │
│  │  email      │  │  compteurs  │  │  moderation │                     │
│  │  in-app     │  │  alertes    │  │  config     │                     │
│  │  preferences│  │  suspension │  │  audit      │                     │
│  └─────────────┘  └─────────────┘  └─────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Bounded Contexts detailles

---

#### BC-1 : Identity & Access

**Responsabilite :** Authentification, autorisation, gestion des sessions et des roles.

**Entites :**
| Entite | Description | Table(s) DB |
|--------|-------------|-------------|
| `User` | Identite Supabase Auth (email, phone, OAuth) | `auth.users` (Supabase) |
| `Role` | Role(s) de l'utilisateur (`consumer`, `partner`, `admin`, `super_admin`) | `app_metadata.roles[]` |
| `Permission` | Permission contextuelle (RBAC ADR-011) | `role_permissions` |

**Frontieres :** Ce BC ne connait pas les concepts metier (panier, reservation). Il expose une identite (`userId`, `roles[]`, `permissions[]`) que les autres BC consomment.

**Modules NestJS :** `auth`

**Communication sortante :** Fournit un JWT et un contexte d'autorisation. Tous les autres BC en dependent (upstream de tous).

---

#### BC-2 : Consumer

**Responsabilite :** Profil consommateur, preferences, favoris, gamification (badges, impact), parrainage.

**Entites :**
| Entite | Description | Table(s) DB |
|--------|-------------|-------------|
| `ConsumerProfile` | Profil metier du consommateur (nom, prenom, photo, preferences) | `profiles` |
| `Favorite` | Association consommateur/commerce | `favorites` |
| `Badge` | Definition d'un badge (seuil, nom, icone) | `badges` |
| `UserBadge` | Badge obtenu par un consommateur | `user_badges` |
| `Referral` | Relation parrain/filleul + statut + recompenses | `referrals` |
| `ImpactStats` | Stats agregees (paniers sauves, economies) -- vue calculee | (calcule depuis `reservations`) |

**Frontieres :** Ce BC possede le profil et les preferences. Il ne possede PAS les reservations ni les paiements -- il les interroge par ID pour calculer les stats d'impact. Les favoris referencent un `storeId` (pas un objet Store).

**Modules NestJS :** `consumers`, `favorites`, `gamification`, `referrals`

**Communication :**
- **Lit** (par ID) : Store (Catalog), Reservation (Ordering) -- pour les stats d'impact
- **Ecoute** (events) : `ReservationPickedUp` -> incrementer compteur paniers sauves, verifier badges
- **Ecoute** (events) : `ReferralFirstPickup` -> attribuer recompenses parrain/filleul

---

#### BC-3 : Partner

**Responsabilite :** Onboarding partenaire, gestion multi-commerce, modification requests, statistiques partenaire, state machine partenaire (PENDING -> ACTIVE -> SUSPENDED -> BANNED).

**Entites :**
| Entite | Description | Table(s) DB |
|--------|-------------|-------------|
| `Partner` | Responsable du commerce (nom, email, BRN, status) | `partners` |
| `Store` | Commerce physique (nom, adresse, GPS, horaires, photos, FDL) | `stores` |
| `StoreModificationRequest` | Demande de modification avec JSON diff old/new (ADR-018) | `store_modification_requests` |
| `StorePhoto` | Photo du commerce avec ordre et statut principal | `store_photos` |
| `OpeningHours` | Horaires d'ouverture par jour | `opening_hours` |
| `PartnerDocument` | BRN, Food Dealer's Licence (numero, expiration, statut verification) | `partner_documents` |

**Frontieres :** Ce BC possede tout ce qui concerne le partenaire et ses commerces. Il ne possede PAS les paniers (Catalog) ni les reservations (Ordering). La state machine du partenaire (ADR-017 section 2.4) vit ici. Les modification requests avec approbation admin (ADR-018) vivent ici.

**Modules NestJS :** `partners`, `stores`

**Communication :**
- **Emet** : `PartnerActivated`, `PartnerSuspended`, `PartnerBanned`, `StoreModificationApproved`, `StoreModificationRejected`
- **Lit** (par ID) : Rien -- ce BC est relativement autonome
- **Ecoute** (events) : `AdminApprovePartner` (depuis Admin via workflow)

---

#### BC-4 : Catalog

**Responsabilite :** Gestion des paniers (creation, publication, stock, tags, categories), modeles recurrents, creneaux de retrait, recherche et decouverte.

**Entites :**
| Entite | Description | Table(s) DB |
|--------|-------------|-------------|
| `Basket` | Panier surprise (titre, prix, valeur initiale, stock, creneau, statut) | `baskets` |
| `BasketTag` | Association panier/tag (type, preferences alimentaires) | `basket_tags` |
| `Tag` | Tag predifini (Sucre, Sale, Vegetarien, Halal...) | `tags` |
| `Category` | Categorie de commerce (Boulangerie, Restaurant, Supermarche...) | `categories` |
| `RecurringTemplate` | Modele de panier recurrent (jours, horaires, auto-publication) | `recurring_templates` |

**Frontieres :** Ce BC possede le panier et son cycle de vie (state machine ADR-017 section 2.3). Le stock est gere ici (decrement atomique ADR-008). Le panier reference un `storeId` (pas un objet Store). Le prix, la valeur initiale, et la regle des 50% de reduction sont des invariants de ce BC.

**Invariants critiques :**
- `basket.price <= basket.originalValue / 2` (reduction minimum 50%)
- `basket.stock >= 0` (jamais negatif, garanti par le decrement atomique)
- `basket.pickupStart > NOW() + 1h` (creneau dans le futur)
- `basket.pickupEnd - basket.pickupStart >= 30min` (duree minimum)

**Modules NestJS :** `baskets`

**Communication :**
- **Emet** : `BasketPublished`, `BasketSoldOut`, `BasketStockRestored`, `BasketCancelled`, `BasketPickupWindowStarted`, `BasketEnded`
- **Lit** (par ID) : Store (Partner) -- pour valider que le commerce est actif
- **Consomme** (appel direct) : Stock decrement/increment (interne)

---

#### BC-5 : Ordering

**Responsabilite :** Reservations, state machine de reservation (8 etats, ADR-017 section 2.1), concurrence et hold de stock, orchestration reservation/paiement.

**Entites :**
| Entite | Description | Table(s) DB |
|--------|-------------|-------------|
| `Reservation` | Reservation d'un consommateur sur un panier | `reservations` |
| `PickupCode` | QR code + PIN associes a une reservation | (colonnes dans `reservations` ou table dediee) |

**Frontieres :** Ce BC est le coeur du business. Il orchestre le flux reservation -> paiement -> retrait. Il ne possede PAS le panier (Catalog) ni le paiement (Payment) -- il les appelle par interface. La state machine de reservation (ADR-017) vit ici. Le hold de 5 minutes et le decrement atomique (ADR-008) sont commandes depuis ici mais executes sur Catalog (stock) et Payment (pre-auth).

**Invariants critiques :**
- Une reservation ne peut etre annulee qu'avant le debut du creneau de retrait
- Le stock est decremente atomiquement AVANT le paiement (strategy stock-first, ADR-008)
- Le hold expire apres 5 minutes si le paiement echoue
- Le no-show est detecte 5 minutes apres la fin du creneau

**Modules NestJS :** `reservations`

**Communication :**
- **Emet** : `ReservationConfirmed`, `ReservationCancelledByConsumer`, `ReservationCancelledByPartner`, `ReservationReady`, `ReservationPickedUp`, `ReservationNoShow`, `ReservationExpired`
- **Appelle** (synchrone) : Catalog.decrementStock(), Payment.preAuthorize(), Payment.capture(), Payment.reversal()
- **Ecoute** : `BasketPickupWindowStarted` -> transition CONFIRMED -> READY en masse, `BasketCancelled` -> transition CONFIRMED -> CANCELLED_PARTNER en masse

---

#### BC-6 : Payment

**Responsabilite :** Ledger double-entry (ADR-007), commissions, payouts, integration PSP (Peach Payments), 4 methodes de paiement, remboursements, reconciliation.

**Entites :**
| Entite | Description | Table(s) DB |
|--------|-------------|-------------|
| `LedgerAccount` | Compte du plan comptable (GATEWAY, REVENUE, COMMISSION, PARTNER:uuid, REFUND...) | `ledger_accounts` |
| `LedgerEntry` | Ecriture comptable immuable (debit/credit) | `ledger_entries` |
| `Transaction` | Transaction de paiement (pre-auth, capture, refund) liee a un PSP | `payment_transactions` |
| `PayoutBatch` | Lot de reversements mensuels aux partenaires | `payout_batches` |
| `PayoutItem` | Reversement individuel a un partenaire dans un lot | `payout_items` |
| `PaymentMethod` | Moyen de paiement enregistre par un consommateur (token carte, wallet) | `payment_methods` |

**Frontieres :** Ce BC possede tout ce qui touche a l'argent. Il ne connait pas les concepts "panier" ou "commerce" -- il recoit des commandes de paiement avec un montant, un consumerId, un orderId. L'invariant fondamental du ledger est : `SUM(debits) = SUM(credits)` pour chaque transaction. Aucun autre module ne lit ou ecrit dans les tables du ledger directement.

**Invariants critiques :**
- Double-entry : chaque mouvement a un debit et un credit de meme montant
- Immutabilite : aucune ecriture du ledger n'est modifiee ou supprimee
- Commission = max(taux * montant, fee minimum) -- configurable par partenaire (ADR-007)
- Un remboursement ne peut pas depasser le montant capture

**Modules NestJS :** `payments`

**Communication :**
- **Expose** (interface/port) : `preAuthorize(orderId, amount, method)`, `capture(orderId)`, `reversal(orderId)`, `refund(orderId, amount)`, `getBalance(partnerId)`
- **Emet** : `PaymentCaptured`, `PaymentRefunded`, `PayoutCompleted`
- **Ecoute** : `ReservationConfirmed` -> ecriture ledger, `ClaimResolvedWithRefund` -> remboursement + ajustement ledger

---

#### BC-7 : Fulfillment

**Responsabilite :** Validation du retrait (scan QR / saisie PIN), detection du no-show, rappels avant retrait.

**Entites :**

Ce BC n'a pas d'entite propre persistee. Il opere sur la `Reservation` (Ordering) en validant le retrait. C'est un BC "processus" qui orchestre la transition READY -> PICKED_UP.

**Frontieres :** Ce BC est un orchestrateur de pickup. Il valide le QR/PIN, commande la transition de la reservation, et planifie les jobs de no-show. Dans un monolithe, il peut etre un sous-module de Ordering. L'extraction en BC separe se justifie si le processus de retrait se complexifie (ex: retrait en consigne, retrait par tiers).

**Decision pragmatique :** Dans un premier temps, Fulfillment est un **sous-module de Ordering** (`reservations/fulfillment/`). Il n'a pas besoin d'etre un module NestJS separe. Si le processus de retrait se complexifie, il sera extrait.

**Modules NestJS :** Sous-module de `reservations`

---

#### BC-8 : Review & Claims

**Responsabilite :** Avis/notes post-retrait, reclamations avec state machine (ADR-017 section 2.2), moderation des avis, remboursements lies aux reclamations.

**Entites :**
| Entite | Description | Table(s) DB |
|--------|-------------|-------------|
| `Review` | Avis avec note (1-5 etoiles) + commentaire optionnel | `reviews` |
| `Claim` | Reclamation post-retrait (motif, commentaire, photos, statut) | `claims` |
| `ClaimPhoto` | Photo jointe a une reclamation | `claim_photos` |

**Frontieres :** Ce BC possede les avis et les reclamations. La state machine des claims (OPEN -> IN_REVIEW -> RESOLVED/REJECTED) vit ici. Un avis reference un `reservationId` et un `storeId` par ID. Une reclamation reference un `reservationId` par ID.

**Invariants critiques :**
- Un avis ne peut etre laisse que dans les 24h apres PICKED_UP
- Un avis est modifiable pendant 24h apres creation
- Une reclamation ne peut etre ouverte que dans les 24h apres PICKED_UP
- Une note est entre 1 et 5 (entier)

**Modules NestJS :** `reviews`, `claims`

**Communication :**
- **Emet** : `ReviewCreated`, `ClaimOpened`, `ClaimResolved`, `ClaimRejected`
- **Ecoute** : `ReservationPickedUp` -> ouvrir la fenetre de notation et de reclamation (24h)
- **Appelle** (synchrone) : Payment.refund() quand un claim est resolu avec remboursement

---

#### BC-9 : Notification

**Responsabilite :** Envoi de notifications push (FCM), emails (Resend), centre de notifications in-app, preferences utilisateur, rappels schedules.

**Entites :**
| Entite | Description | Table(s) DB |
|--------|-------------|-------------|
| `Notification` | Notification in-app (type, titre, body, deep link, lu/non-lu) | `notifications` |
| `NotificationPreference` | Preferences par type et canal (toggle on/off) | `notification_preferences` |
| `DeviceToken` | Token FCM d'un device | `device_tokens` |

**Frontieres :** Ce BC est downstream de tous les autres. Il ne prend aucune decision metier. Il recoit des evenements et les transforme en notifications via les canaux configures. Il ne connait pas les concepts "panier" ou "reservation" -- il recoit un template, des variables, et une audience.

**Modules NestJS :** `notifications`

**Communication :**
- **Ecoute** (tous les events) : `ReservationConfirmed`, `ReservationCancelledByPartner`, `ClaimResolved`, `PartnerActivated`, `BasketPublished` (favoris), `BadgeUnlocked`, etc.
- **N'emet rien** vers le domaine (terminal)

---

#### BC-10 : Fraud

**Responsabilite :** Detection de patterns suspects, compteurs par acteur, evaluation de regles configurables (ADR-019), suspension automatique, alertes admin.

**Entites :**
| Entite | Description | Table(s) DB |
|--------|-------------|-------------|
| `FraudRule` | Regle configurable (seuil, fenetre, action) | `fraud_rules` |
| `FraudAlert` | Alerte generee (acteur, regle, severite, statut) | `fraud_alerts` |
| `FraudCounter` | Compteur par acteur et metrique (cache Redis + SQL) | `fraud_counters` + Redis |

**Frontieres :** Ce BC ne modifie pas directement les entites des autres BC. Il evalue des metriques, genere des alertes, et en cas de suspension automatique, emet un evenement `FraudAutoSuspend` que Partner consomme.

**Modules NestJS :** `fraud`

**Communication :**
- **Ecoute** : `ReservationNoShow` -> incrementer compteur no-show, `ClaimOpened` -> incrementer compteur claims, `ReservationCancelledByConsumer` -> incrementer compteur annulations
- **Emet** : `FraudAlertCreated`, `FraudAutoSuspend`
- **Lit** (par ID) : Stats de reservation (Ordering) pour le calcul des taux

---

#### BC-11 : Admin

**Responsabilite :** Dashboard KPI, moderation (file d'attente approbation), configuration plateforme (seuils, taux, categories, tags, jours feries), audit trail.

**Entites :**
| Entite | Description | Table(s) DB |
|--------|-------------|-------------|
| `AppSetting` | Parametre configurable de la plateforme (cle/valeur type) | `app_settings` |
| `AuditLog` | Trace d'audit (acteur, action, entite, diff, metadata) | `audit_logs` |
| `Holiday` | Jour ferie mauricien (impact sur les creneaux) | `holidays` |

**Frontieres :** Le BC Admin est un consommateur de donnees des autres BC pour le dashboard. Il ne possede que les parametres de configuration et l'audit trail. Les actions admin (approuver un partenaire, resoudre un claim) sont des commandes envoyees AUX BC concernes, pas des actions du BC Admin lui-meme.

**Modules NestJS :** `admin`

**Communication :**
- **Lit** (aggregation) : Donnees de tous les BC pour le dashboard
- **Commande** : Partner.approve(), Claim.resolve(), Fraud.investigate() -- appels directs dans le monolithe
- **N'emet rien** (les BC cibles emettent les events resultants)

---

### 3.3 Mapping Bounded Context -> Modules NestJS

| Bounded Context | Module(s) NestJS | DDD tactique ? |
|----------------|-----------------|----------------|
| Identity & Access | `auth` | Non (delegue a Supabase Auth + RBAC) |
| Consumer | `consumers`, `favorites`, `gamification`, `referrals` | Non (CRUD) |
| Partner | `partners`, `stores` | **Oui** (state machine, mod requests) |
| Catalog | `baskets` | **Oui** (state machine, stock, invariants prix) |
| Ordering | `reservations` (+ sous-module fulfillment) | **Oui** (state machine, orchestration, concurrence) |
| Payment | `payments` | **Oui** (ledger, commissions, PSP) |
| Fulfillment | Sous-module de `reservations` | Inclu dans Ordering |
| Review & Claims | `reviews`, `claims` | **Oui** pour Claims (state machine), Non pour Reviews (CRUD) |
| Notification | `notifications` | Non (infrastructure) |
| Fraud | `fraud` | Non (regles + compteurs, pas de domaine riche) |
| Admin | `admin` | Non (orchestration + dashboard) |

---

## 4. Q3 : Context Map -- relations entre bounded contexts

### 4.1 Diagramme de la Context Map

```
                         ┌──────────────────┐
                         │                  │
                         │  Identity &      │
                         │  Access          │
                         │  (upstream de    │
                         │   tous)          │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
              ┌─────▼─────┐ ┌────▼────┐ ┌──────▼──────┐
              │           │ │         │ │             │
              │ Consumer  │ │ Partner │ │   Admin     │
              │           │ │         │ │             │
              └─────┬─────┘ └────┬────┘ └──────┬──────┘
                    │            │              │
                    │      ┌─────▼─────┐       │
                    │      │           │       │
                    │      │  Catalog  │       │
                    │      │  (paniers)│       │
                    │      └─────┬─────┘       │
                    │            │              │
                    │      ┌─────▼─────┐       │
                    └──────►           ◄───────┘
                           │ Ordering  │
                           │(reserv.)  │
                           └──┬──┬──┬──┘
                              │  │  │
                    ┌─────────┘  │  └─────────┐
                    │            │            │
              ┌─────▼─────┐ ┌───▼───┐ ┌──────▼──────┐
              │           │ │       │ │             │
              │ Payment   │ │Fulfill│ │ Review &    │
              │           │ │ment   │ │ Claims      │
              └─────┬─────┘ └───────┘ └──────┬──────┘
                    │                        │
                    │    ┌─────────────┐      │
                    └────►             ◄──────┘
                         │ Notification│
                         │ (downstream │
                         │  de tous)   │
                         └──────┬──────┘
                                │
                         ┌──────▼──────┐
                         │             │
                         │   Fraud     │
                         │ (observe    │
                         │  les events)│
                         └─────────────┘
```

### 4.2 Relations detaillees

| Upstream | Downstream | Type de relation | Mecanisme | Justification |
|----------|-----------|-----------------|-----------|---------------|
| Identity & Access | Tous les BC | **Published Language** | JWT + contexte d'auth | Tous les BC consomment le token et les permissions. Le format JWT est un contrat publie. |
| Catalog | Ordering | **Customer-Supplier** | Appel direct (interface) | Ordering appelle `Catalog.decrementStock()` et `Catalog.getBasket()`. Catalog fournit un service a Ordering. |
| Ordering | Payment | **Customer-Supplier** | Appel direct (interface) | Ordering appelle `Payment.preAuthorize()`, `Payment.capture()`, etc. Payment fournit un service financier a Ordering. |
| Ordering | Review & Claims | **Customer-Supplier** | Domain events | Claims ecoute `ReservationPickedUp` pour ouvrir la fenetre de reclamation. Ordering n'a pas besoin de connaitre Claims. |
| Ordering | Consumer | **Customer-Supplier** | Domain events | Consumer ecoute `ReservationPickedUp` pour les stats d'impact et les badges. |
| Partner | Catalog | **Customer-Supplier** | Appel direct (interface) | Catalog valide que le commerce est actif via `Partner.isStoreActive(storeId)`. |
| Claims | Payment | **Customer-Supplier** | Appel direct (interface) | Claims appelle `Payment.refund()` quand un claim est resolu avec remboursement. |
| Fraud | Partner | **Customer-Supplier** | Domain events | Fraud emet `FraudAutoSuspend`, Partner ecoute et execute la suspension. |
| Tous les BC | Notification | **Conformist** | Domain events via BullMQ | Notification se conforme au format des events emis par les autres BC. Il n'influence pas leur format. |
| Tous les BC emetteurs | Fraud | **Conformist** | Domain events | Fraud se conforme aux events emis (no-show, claims, annulations) pour alimenter ses compteurs. |
| Admin | Partner, Claims, Fraud | **Open Host** | Appels directs (commandes) | Admin envoie des commandes d'action aux BC cibles (approve, reject, suspend, resolve). |
| Ordering | Catalog | **Shared Kernel** (minime) | `BasketStatus`, `BasketId` | Ordering doit connaitre le statut et l'ID du panier pour orchestrer. C'est un shared kernel minimal. |

### 4.3 Types de communication dans le monolithe

| Type | Quand l'utiliser | Implementation NestJS |
|------|-----------------|----------------------|
| **Appel direct (synchrone)** | Le BC appelant a besoin du resultat immediatement pour continuer son flux (ex: Payment.preAuthorize dans le flow de reservation) | Injection de dependance via interface (port). Le BC importe le module et appelle le service. |
| **Domain event (asynchrone)** | Le BC emetteur n'a pas besoin de savoir ce qui se passe ensuite (ex: ReservationPickedUp -> notification, badges, stats) | `EventEmitter2` de NestJS (in-process) ou BullMQ (queue) pour les effets lourds |
| **Shared Kernel** | Deux BC partagent un concept commun minimal (IDs, enums de statut) | Types partages dans `src/shared/types/` -- strictement limite aux IDs et enums |

**Regle : appel direct pour le chemin critique, events pour les effets de bord.**

Un consommateur clique "Reserver" → la reservation, le decrement stock, et la pre-auth sont synchrones (le consommateur attend). La notification, l'increment du compteur gamification, et le check fraude sont asynchrones (le consommateur n'attend pas).

---

## 5. Q4 : Agregats

### 5.1 Principes d'agregats pour BienBon

Les agregats formalisent les frontieres de consistance transactionnelle. Dans un monolithe avec PostgreSQL, la regle est :

1. **Un agregat = une transaction.** Toutes les modifications a l'interieur d'un agregat sont dans la meme transaction SQL.
2. **References entre agregats par ID.** Un `Reservation` reference un `basketId` (UUID), pas un objet `Basket`.
3. **Taille minimale.** Un agregat ne doit contenir que les entites necessaires pour maintenir ses invariants. Plus l'agregat est petit, moins il y a de contention.
4. **L'agregat root est le seul point d'entree.** On ne modifie pas directement une entite enfant -- on passe par la root.

### 5.2 Agregats par Bounded Context

---

#### Agregat : Reservation (BC Ordering)

```
┌─────────────────────────────────────────────────┐
│ Reservation (Aggregate Root)                     │
│                                                  │
│  id: UUID                                        │
│  consumerId: UUID  ──────► (ref par ID)          │
│  basketId: UUID    ──────► (ref par ID)          │
│  storeId: UUID     ──────► (ref par ID)          │
│  quantity: number                                │
│  unitPrice: Money                                │
│  totalPrice: Money                               │
│  status: ReservationStatus (enum 8 etats)        │
│  qrCode: string                                  │
│  pin: string                                     │
│  expiresAt: DateTime (hold 5 min)                │
│  confirmedAt?: DateTime                          │
│  pickedUpAt?: DateTime                           │
│  noShowAt?: DateTime                             │
│  cancelledAt?: DateTime                          │
│  pickupMethod?: 'QR' | 'PIN'                    │
│                                                  │
│  ┌─ Invariants ─────────────────────────────┐    │
│  │ - status transitions via ADR-017 table   │    │
│  │ - cancel only before pickup window       │    │
│  │ - quantity > 0                            │    │
│  │ - totalPrice = quantity * unitPrice       │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

**Pourquoi cet agregat est minimal :** La reservation ne contient pas les details du panier ni du consommateur. Elle reference par ID. Le QR/PIN est interne a la reservation (genere a la confirmation, valide au retrait). Le status et ses transitions sont l'invariant principal.

**Taille DB :** Une seule table `reservations` (pas d'entites enfant). Agregat "document-style".

---

#### Agregat : Basket (BC Catalog)

```
┌─────────────────────────────────────────────────┐
│ Basket (Aggregate Root)                          │
│                                                  │
│  id: UUID                                        │
│  storeId: UUID     ──────► (ref par ID)          │
│  title: string                                   │
│  description?: string                            │
│  photo?: URL                                     │
│  originalValue: Money                            │
│  price: Money                                    │
│  stock: number                                   │
│  initialStock: number                            │
│  pickupStart: DateTime                           │
│  pickupEnd: DateTime                             │
│  status: BasketStatus (enum 8 etats)             │
│  recurringTemplateId?: UUID                      │
│                                                  │
│  tags: BasketTag[]  ──── (entites enfant)         │
│    ┌──────────────────────────────────┐          │
│    │  tagId: UUID (ref par ID)        │          │
│    └──────────────────────────────────┘          │
│                                                  │
│  ┌─ Invariants ────────────────────────────┐     │
│  │ - price <= originalValue / 2            │     │
│  │ - stock >= 0                            │     │
│  │ - pickupEnd - pickupStart >= 30min      │     │
│  │ - pickupStart > NOW() + 1h (creation)   │     │
│  │ - status transitions via ADR-017 table  │     │
│  └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

**Pourquoi tags dans l'agregat :** Les tags sont des entites enfant du panier, modifiables meme si des reservations existent (US-P015). Ils n'ont pas de cycle de vie independant.

**Note sur le stock :** Le decrement atomique (`UPDATE ... SET stock = stock - $1 WHERE stock >= $1`) est une operation a la base qui bypasse l'agregat en memoire. C'est une concession pragmatique au pattern DDD : l'invariant `stock >= 0` est garanti par PostgreSQL, pas par le code domaine.

---

#### Agregat : Store (BC Partner)

```
┌─────────────────────────────────────────────────┐
│ Store (Aggregate Root)                           │
│                                                  │
│  id: UUID                                        │
│  partnerId: UUID   ──────► (ref par ID)          │
│  name: string                                    │
│  description: string                             │
│  type: StoreType                                 │
│  address: Address (Value Object)                 │
│  gpsCoordinates: GeoPoint (Value Object)         │
│  phone: PhoneNumber (Value Object)               │
│  fdlNumber: string                               │
│  status: StoreStatus                             │
│                                                  │
│  photos: StorePhoto[]  ──── (entites enfant)     │
│    ┌──────────────────────────────────┐          │
│    │  url: URL, order: number,        │          │
│    │  isPrimary: boolean              │          │
│    └──────────────────────────────────┘          │
│                                                  │
│  openingHours: OpeningHours[]                    │
│    ┌──────────────────────────────────┐          │
│    │  dayOfWeek: 0-6, open: Time,     │          │
│    │  close: Time, isClosed: boolean  │          │
│    └──────────────────────────────────┘          │
│                                                  │
│  ┌─ Invariants ────────────────────────────┐     │
│  │ - au moins 1 photo                      │     │
│  │ - 1 seule photo principale              │     │
│  │ - max 10 photos                         │     │
│  │ - FDL number format valide              │     │
│  └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

**Pourquoi photos et horaires dans l'agregat :** Les photos et les horaires n'existent pas sans le commerce. Modifier les photos necessite une validation admin (meme flux). L'agregat garantit les invariants (au moins 1 photo, max 10, 1 seule principale).

**StoreModificationRequest est un agregat separe :** Les modification requests ont leur propre cycle de vie (PENDING -> APPROVED/REJECTED) et ne partagent pas de transaction avec le Store. A l'approbation, les changements sont appliques au Store dans une nouvelle transaction.

---

#### Agregat : LedgerTransaction (BC Payment)

```
┌─────────────────────────────────────────────────┐
│ LedgerTransaction (Aggregate Root)               │
│                                                  │
│  id: UUID                                        │
│  orderId: UUID     ──────► (ref par ID)          │
│  type: TransactionType                           │
│  description: string                             │
│  occurredAt: DateTime                            │
│                                                  │
│  entries: LedgerEntry[]  ──── (entites enfant)   │
│    ┌──────────────────────────────────┐          │
│    │  accountId: UUID                 │          │
│    │  amount: Money (Value Object)    │          │
│    │  direction: 'DEBIT' | 'CREDIT'  │          │
│    └──────────────────────────────────┘          │
│                                                  │
│  ┌─ Invariants ────────────────────────────┐     │
│  │ - SUM(debits) = SUM(credits)            │     │
│  │ - au moins 2 entries par transaction    │     │
│  │ - immutable apres creation              │     │
│  │ - amount > 0                            │     │
│  └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

**Pourquoi un agregat pour la transaction ledger :** L'invariant de double-entry (`SUM(debits) = SUM(credits)`) doit etre verifie dans une seule transaction. Les entries n'existent pas sans la transaction. L'immutabilite interdit toute modification apres creation -- pas d'UPDATE, pas de DELETE.

---

#### Agregat : Claim (BC Review & Claims)

```
┌─────────────────────────────────────────────────┐
│ Claim (Aggregate Root)                           │
│                                                  │
│  id: UUID                                        │
│  reservationId: UUID ──────► (ref par ID)        │
│  consumerId: UUID    ──────► (ref par ID)        │
│  storeId: UUID       ──────► (ref par ID)        │
│  reason: ClaimReason (enum)                      │
│  comment: string (min 20 chars)                  │
│  status: ClaimStatus (OPEN, IN_REVIEW,           │
│          RESOLVED, REJECTED)                     │
│  assignedAdminId?: UUID                          │
│  resolutionType?: 'full_refund' | 'partial_refund'│
│                    | 'rejected'                  │
│  refundAmount?: Money                            │
│  adminComment?: string                           │
│  openedAt: DateTime                              │
│  inReviewAt?: DateTime                           │
│  resolvedAt?: DateTime                           │
│                                                  │
│  photos: ClaimPhoto[]  ──── (entites enfant)     │
│    ┌──────────────────────────────────┐          │
│    │  url: URL, uploadedAt: DateTime  │          │
│    └──────────────────────────────────┘          │
│                                                  │
│  ┌─ Invariants ────────────────────────────┐     │
│  │ - max 5 photos                          │     │
│  │ - comment min 20 caracteres             │     │
│  │ - status transitions via ADR-017        │     │
│  │ - refundAmount <= reservation.totalPrice│     │
│  │ - ouverture dans les 24h post-retrait   │     │
│  └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

---

#### Agregat : Partner (BC Partner)

```
┌─────────────────────────────────────────────────┐
│ Partner (Aggregate Root)                         │
│                                                  │
│  id: UUID                                        │
│  userId: UUID      ──────► (ref par ID, auth)    │
│  firstName: string                               │
│  lastName: string                                │
│  email: Email (Value Object)                     │
│  phone: PhoneNumber (Value Object)               │
│  brnNumber: string                               │
│  status: PartnerStatus (PENDING, ACTIVE,         │
│          REJECTED, SUSPENDED, BANNED)            │
│  activatedAt?: DateTime                          │
│  suspendedAt?: DateTime                          │
│  suspensionReason?: string                       │
│                                                  │
│  documents: PartnerDocument[]                    │
│    ┌──────────────────────────────────┐          │
│    │  type: 'BRN' | 'FDL'            │          │
│    │  number: string                  │          │
│    │  expiresAt?: DateTime            │          │
│    │  verified: boolean               │          │
│    └──────────────────────────────────┘          │
│                                                  │
│  ┌─ Invariants ────────────────────────────┐     │
│  │ - status transitions via ADR-017        │     │
│  │ - BRN unique sur la plateforme          │     │
│  │ - email unique                          │     │
│  │ - suspension requires motif             │     │
│  └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

**Note :** Partner et Store sont des agregats distincts. Un Partner peut avoir N Stores. La relation est par `partnerId` dans Store. Modifier un Store ne verrouille pas le Partner (transactions independantes).

---

### 5.3 Recapitulatif des agregats

| Agregat | BC | Entites incluses | Taille DB | Invariant principal |
|---------|-----|-----------------|-----------|---------------------|
| Reservation | Ordering | Reservation (seul) | 1 table | State machine, cancel avant creneau |
| Basket | Catalog | Basket + BasketTag[] | 2 tables | stock >= 0, reduction >= 50% |
| Store | Partner | Store + StorePhoto[] + OpeningHours[] | 3 tables | min 1 photo, max 10 |
| Partner | Partner | Partner + PartnerDocument[] | 2 tables | State machine, BRN unique |
| LedgerTransaction | Payment | LedgerTransaction + LedgerEntry[] | 2 tables | SUM(debits) = SUM(credits), immutable |
| Claim | Claims | Claim + ClaimPhoto[] | 2 tables | State machine, max 5 photos |
| StoreModificationRequest | Partner | ModRequest (seul) | 1 table | JSON diff valide, statut workflow |

---

## 6. Q5 : Convention de Domain Events

### 6.1 Naming convention

```
{AggregateType}{PastParticiple}
```

Exemples : `ReservationConfirmed`, `BasketPublished`, `ClaimResolved`, `PartnerSuspended`.

**Regles :**
- Toujours au **passe** (c'est un fait qui s'est produit, pas une commande)
- Toujours en **anglais** (code en anglais, meme si le domaine est en francais)
- Prefixe par le **type d'agregat** (pas le BC, pas le module)
- Pas de verbe a l'infinitif (`ReservationConfirm` est une commande, pas un event)

### 6.2 Payload standard

```typescript
interface DomainEvent<T = unknown> {
  /** UUID unique de l'event (pour deduplication et tracing) */
  eventId: string;

  /** Type de l'event (discriminant) */
  eventType: string;

  /** ID de l'agregat source */
  aggregateId: string;

  /** Type de l'agregat source */
  aggregateType: string;

  /** Timestamp de l'occurrence (pas de l'emission) */
  occurredAt: Date;

  /** Donnees metier specifiques a l'event */
  payload: T;

  /** Metadonnees techniques */
  metadata: {
    /** ID de l'acteur (userId ou 'system') */
    actorId: string;
    /** Type d'acteur */
    actorType: 'consumer' | 'partner' | 'admin' | 'system';
    /** Correlation ID pour le tracing (request ID) */
    correlationId: string;
    /** Causation ID (eventId de l'event qui a cause celui-ci) */
    causationId?: string;
  };
}
```

### 6.3 Catalogue des events par BC

#### BC Ordering (Reservation)

| Event | Payload | Emis quand | Consommateurs |
|-------|---------|-----------|---------------|
| `ReservationConfirmed` | `{ reservationId, consumerId, basketId, storeId, quantity, totalPrice, qrCode, pin }` | Paiement pre-autorise OK (R1) | Notification, Consumer (stats) |
| `ReservationCancelledByConsumer` | `{ reservationId, consumerId, basketId, quantity }` | Consommateur annule (R4) | Notification, Catalog (stock restore), Fraud (compteur) |
| `ReservationCancelledByPartner` | `{ reservationId, consumerId, basketId, quantity, reason }` | Partenaire annule le panier (R5) | Notification, Payment (refund) |
| `ReservationReady` | `{ reservationId, consumerId, basketId, storeId }` | Debut du creneau de retrait (R6) | Notification |
| `ReservationPickedUp` | `{ reservationId, consumerId, basketId, storeId, pickupMethod }` | Scan QR/PIN valide (R7) | Notification, Consumer (badges), Claims (fenetre 24h), Reviews (fenetre 24h) |
| `ReservationNoShow` | `{ reservationId, consumerId, basketId, storeId }` | Fin creneau + 5min sans retrait (R8) | Notification, Fraud (compteur no-show) |
| `ReservationExpired` | `{ reservationId, consumerId, basketId, quantity }` | Hold 5min expire ou echec paiement (R2/R3) | Catalog (stock restore) |

#### BC Catalog (Basket)

| Event | Payload | Emis quand | Consommateurs |
|-------|---------|-----------|---------------|
| `BasketPublished` | `{ basketId, storeId, title, price, stock, pickupStart, pickupEnd }` | Panier publie (B1) | Notification (favoris), Consumer (recherche) |
| `BasketSoldOut` | `{ basketId, storeId }` | Stock tombe a 0 (B2) | (interne Catalog) |
| `BasketStockRestored` | `{ basketId, storeId, newStock }` | Stock re-incremente (B3) | (interne Catalog) |
| `BasketCancelled` | `{ basketId, storeId, reason, affectedReservationIds }` | Partenaire annule (B4) | Ordering (cancel reservations en masse) |
| `BasketPickupWindowStarted` | `{ basketId, storeId, reservationIds }` | Debut creneau (B5/B6) | Ordering (transition CONFIRMED -> READY) |
| `BasketEnded` | `{ basketId, storeId }` | Fin creneau + traitement no-show (B7) | (interne Catalog) |

#### BC Payment

| Event | Payload | Emis quand | Consommateurs |
|-------|---------|-----------|---------------|
| `PaymentPreAuthorized` | `{ transactionId, orderId, amount, method }` | Pre-auth reussie | Ordering (confirmer reservation) |
| `PaymentCaptured` | `{ transactionId, orderId, amount, commission, partnerNet }` | Capture au debut du creneau | Ledger (ecritures), Partner (stats) |
| `PaymentRefunded` | `{ transactionId, orderId, amount, reason }` | Remboursement (annulation ou claim) | Notification, Ledger (ecritures compensatoires) |
| `PayoutCompleted` | `{ payoutBatchId, partnerId, amount, period }` | Virement mensuel execute | Notification (partenaire) |

#### BC Partner

| Event | Payload | Emis quand | Consommateurs |
|-------|---------|-----------|---------------|
| `PartnerActivated` | `{ partnerId, storeId }` | Admin approuve l'inscription (P1) | Notification |
| `PartnerRejected` | `{ partnerId, reason }` | Admin rejette (P2) | Notification |
| `PartnerSuspended` | `{ partnerId, reason }` | Admin ou auto-suspension fraude (P3) | Notification, Catalog (retirer paniers), Ordering (annuler reservations) |
| `PartnerBanned` | `{ partnerId, reason }` | Admin bannit (P5/P6) | Notification, Catalog, Ordering |
| `StoreModificationApproved` | `{ requestId, storeId, approvedFields }` | Admin approuve modification | Notification (partenaire) |
| `StoreModificationRejected` | `{ requestId, storeId, rejectedFields, reason }` | Admin rejette modification | Notification (partenaire) |

#### BC Review & Claims

| Event | Payload | Emis quand | Consommateurs |
|-------|---------|-----------|---------------|
| `ReviewCreated` | `{ reviewId, reservationId, storeId, consumerId, rating }` | Consommateur laisse un avis | (interne -- calcul note moyenne) |
| `ClaimOpened` | `{ claimId, reservationId, consumerId, storeId, reason }` | Consommateur ouvre une reclamation (C1) | Notification (admin), Fraud (compteur) |
| `ClaimResolved` | `{ claimId, resolutionType, refundAmount }` | Admin resout le claim (C2/C3) | Payment (refund), Notification (consommateur + partenaire) |
| `ClaimRejected` | `{ claimId, reason }` | Admin rejette le claim (C4) | Notification (consommateur) |

#### BC Fraud

| Event | Payload | Emis quand | Consommateurs |
|-------|---------|-----------|---------------|
| `FraudAlertCreated` | `{ alertId, actorId, actorType, ruleSlug, severity }` | Regle de fraude declenchee | Notification (admin) |
| `FraudAutoSuspend` | `{ actorId, actorType, ruleSlug, reason }` | Suspension automatique | Partner (si partenaire), Auth (si consommateur) |

#### BC Consumer

| Event | Payload | Emis quand | Consommateurs |
|-------|---------|-----------|---------------|
| `BadgeUnlocked` | `{ consumerId, badgeId, badgeName }` | Seuil de badge atteint | Notification |
| `ReferralValidated` | `{ referralId, referrerId, referredId }` | Filleul fait son premier retrait | Consumer (recompenses), Notification |

### 6.4 Event bus : strategie en 2 phases

| Phase | Mecanisme | Quand |
|-------|-----------|-------|
| **Phase 1 (MVP)** | `EventEmitter2` NestJS (in-process, synchrone dans le meme thread) pour les events legers + BullMQ pour les events lourds (notifications, PDF, fraud check) | 0-1000 utilisateurs |
| **Phase 2 (croissance)** | BullMQ pour tous les events inter-modules. L'EventEmitter2 reste pour les events intra-module. | 1000-10000 utilisateurs |
| **Phase 3 (si necessaire)** | Message broker dedie (NATS, RabbitMQ) si extraction de services. | >10000 utilisateurs |

**Pas d'event sourcing.** ADR-003 a ecarte l'event sourcing. Les events servent au decouplage inter-modules, pas a la reconstruction d'etat. L'etat fait autorite (tables SQL), pas les events.

---

## 7. Q6 : Ubiquitous Language -- glossaire FR/EN/code

### 7.1 Le probleme linguistique de BienBon

BienBon est un produit francophone (marche mauricien). Les specs, les US, et les interactions utilisateur sont en francais. Le code est en anglais (convention TypeScript, noms de tables SQL, noms de types). Ce gap linguistique est une source d'ambiguites, surtout quand une IA genere du code a partir de specs en francais.

**Regle :** Le code est en anglais. Les noms de tables, les noms de types, les noms de variables sont en anglais. Mais chaque terme anglais a un mapping explicite vers le terme francais des specs, et ce mapping est documente ici.

### 7.2 Glossaire

| Terme francais (specs) | Terme anglais (code) | Type dans le code | Notes |
|------------------------|---------------------|-------------------|-------|
| Panier (surprise) | Basket | `Basket` | Pas "bag", pas "box", pas "bundle" |
| Commerce | Store | `Store` | Pas "shop", pas "business". Un partenaire a N commerces |
| Partenaire | Partner | `Partner` | Le responsable legal (personne physique). A N commerces |
| Consommateur | Consumer | `Consumer` / `ConsumerProfile` | Pas "customer", pas "user" (trop generique) |
| Reservation | Reservation | `Reservation` | Pas "order", pas "booking". "Reservation" est le terme du domaine |
| Retrait | Pickup | `pickup` | L'action de venir chercher le panier. "Retrait" en francais |
| Creneau de retrait | Pickup Window / Pickup Slot | `pickupStart`, `pickupEnd` | Periode pendant laquelle le consommateur vient chercher |
| Reclamation | Claim | `Claim` | Pas "complaint", pas "dispute". "Claim" = reclamation formelle |
| Avis / Note | Review / Rating | `Review` (objet), `rating` (champ 1-5) | "Avis" = review + rating ensemble |
| Valeur initiale | Original Value | `originalValue` | Le prix normal des produits avant reduction |
| Prix de vente | Price | `price` | Ce que le consommateur paie |
| Stock | Stock | `stock` | Nombre de paniers disponibles |
| No-show | No-Show | `NO_SHOW` (enum) | Le consommateur ne s'est pas presente |
| Favori | Favorite | `Favorite` | Association consommateur/commerce |
| Parrainage | Referral | `Referral` | Programme parrain/filleul |
| Parrain | Referrer | `referrerId` | Le consommateur qui invite |
| Filleul | Referred / Referee | `referredId` | Le consommateur invite |
| Badge | Badge | `Badge` | Element de gamification |
| Commission | Commission | `commission` | Part de BienBon sur chaque vente |
| Reversement | Payout | `Payout` | Virement mensuel au partenaire |
| Releve | Statement | `PayoutStatement` | Document PDF du reversement |
| Ledger | Ledger | `Ledger` | Journal comptable double-entry |
| Ecriture | Entry | `LedgerEntry` | Une ligne du journal |
| Pre-autorisation | Pre-authorization | `preAuth` | Blocage du montant sans debit |
| Capture | Capture | `capture` | Debit effectif du montant bloque |
| Remboursement | Refund | `refund` | Retour d'argent au consommateur |
| BRN | BRN | `brnNumber` | Business Registration Number (Maurice) |
| FDL | FDL | `fdlNumber` | Food Dealer's Licence (Maurice) |
| Fiche commerce | Store Profile | `Store` (entite) | La page publique du commerce |
| Modification en attente | Pending Modification | `StoreModificationRequest` (status: PENDING) | Modification soumise a validation admin |
| Tableau de bord | Dashboard | (pas de type, c'est une vue) | Vue aggregee pour l'admin ou le partenaire |
| Alerte fraude | Fraud Alert | `FraudAlert` | Signal de comportement suspect |
| Suspension | Suspension | `SUSPENDED` (statut) | Desactivation temporaire |
| Bannissement | Ban | `BANNED` (statut) | Desactivation definitive |
| Modele recurrent | Recurring Template | `RecurringTemplate` | Panier publie automatiquement selon un planning |
| QR code / Code PIN | QR Code / PIN | `qrCode`, `pin` | Methodes de validation du retrait |
| Moyen de paiement | Payment Method | `PaymentMethod` | Carte, MCB Juice, Blink, my.t money |
| Jour ferie | Holiday | `Holiday` | Impact sur les creneaux |
| Journal d'audit | Audit Log | `AuditLog` | Trace de toutes les actions |

### 7.3 Comment utiliser ce glossaire avec l'IA

Quand on donne une instruction a l'IA pour coder un module, on inclut le glossaire pertinent dans le prompt :

```
Tu travailles dans le module Ordering (bounded context Ordering).
Termes du domaine :
- Reservation (pas "order") -> type Reservation
- Retrait -> pickup (pickupStart, pickupEnd)
- No-show -> NO_SHOW (enum ReservationStatus)
- Creneau de retrait -> pickup window
```

Cela evite que l'IA invente `Order`, `Booking`, `Appointment`, `TimeSlot` ou tout autre synonyme qui fragmente le ubiquitous language.

---

## 8. Q7 : Architecture hexagonale / ports & adapters dans NestJS

### 8.1 Le debat : hexagonal complet vs pragmatique

L'architecture hexagonale (ports & adapters) separe :
- **Domain layer** : entites, value objects, regles metier -- zero dependance framework
- **Application layer** : use cases / command handlers -- orchestre le domaine
- **Infrastructure layer** : Prisma repos, API clients, queues -- implementations des ports

NestJS avec son injection de dependances s'y prete naturellement. La question est : **a quel point etre strict ?**

### 8.2 Options

#### Option A : Hexagonal strict

```
module/
  domain/                    # ZERO import de NestJS, Prisma, ou lib externe
    entities/
    value-objects/
    events/
    ports/                   # Interfaces abstraites
      repository.port.ts     # IBasketRepository
      payment-gateway.port.ts
    services/                # Domain services (logique pure)
  application/
    commands/                # CreateBasketCommand, PublishBasketCommand
    queries/                 # GetBasketQuery, SearchBasketsQuery
    handlers/                # CommandHandler, QueryHandler
  infrastructure/
    persistence/
      prisma-basket.repository.ts  # implements IBasketRepository
    adapters/
      peach-payment.adapter.ts     # implements IPaymentGateway
    controllers/
      basket.controller.ts         # HTTP endpoints
```

**Avantages :** Testabilite maximale du domaine (mock les ports), independance du framework, CQRS naturel.
**Inconvenients :** **Enormement de boilerplate.** Un CRUD simple necessite : entity, repository port, repository impl, command, handler, controller. Pour un module `favorites`, c'est 6 fichiers pour un `prisma.favorite.create()`.

#### Option B : Hexagonal pragmatique (ports pour les integrations externes uniquement)

```
module/
  domain/                    # Types, invariants, events
    basket.entity.ts         # Type + validation (pas une classe abstraite)
    basket.events.ts         # Domain events
    basket.rules.ts          # Fonctions pures de validation
  services/
    basket.service.ts        # NestJS service (orchestre le domaine + infra)
  ports/                     # Interfaces pour les dependances EXTERNES
    payment-gateway.port.ts  # Pour les PSP (Peach, MCB Juice...)
    storage.port.ts          # Pour le stockage de fichiers (S3, Minio...)
    notification-sender.port.ts  # Pour les providers (FCM, Resend...)
  adapters/
    peach-payment.adapter.ts
  basket.controller.ts
  basket.module.ts
```

**Avantages :** Les ports sont la ou ils apportent de la valeur : isoler les dependances externes (PSP, storage, notification providers). Le service NestJS accede directement a Prisma (pas d'abstraction repository inutile). Le domaine est des types et des fonctions pures, pas des classes abstraites.
**Inconvenients :** Le service NestJS melange orchestration et acces DB. Moins "propre" en theorie.

#### Option C : NestJS vanilla (pas de ports)

```
module/
  basket.service.ts          # Tout dedans : validation, Prisma, logique
  basket.controller.ts
  basket.module.ts
  basket.dto.ts
```

**Avantages :** Minimum de fichiers, maximum de vitesse de livraison.
**Inconvenients :** Impossible de mocker un PSP dans les tests. Pas de separation domaine/infra. La logique metier est noyee dans le code Prisma.

### 8.3 Evaluation

| Critere (poids) | A : Hexagonal strict | B : Hexagonal pragmatique | C : NestJS vanilla |
|-----------------|:--------------------:|:-------------------------:|:------------------:|
| Vitesse de livraison (30%) | 2 | 4 | 5 |
| Testabilite (25%) | 5 | 4 | 2 |
| Maintenabilite (20%) | 4 | 4 | 3 |
| Guidage IA (15%) | 5 | 4 | 2 |
| Simplicite onboarding (10%) | 2 | 4 | 5 |
| **Score pondere** | **3.45** | **4.00** | **3.30** |

### 8.4 Decision Q7 : Option B -- hexagonal pragmatique

**Les ports sont obligatoires pour :**
- `PaymentGateway` (4 PSP : carte, MCB Juice, Blink, my.t money)
- `StorageProvider` (S3/Minio/R2 -- photos, PDF)
- `NotificationSender` (FCM, Resend, in-app)
- `PdfGenerator` (React-pdf ou Puppeteer)
- `GeocodingProvider` (si geocoding externe)

**Les ports sont optionnels/inutiles pour :**
- Prisma (PAS d'abstraction IRepository sur Prisma -- c'est du boilerplate sans valeur. On teste avec une DB de test, pas avec des mocks de repository)
- BullMQ (injection directe du module `@nestjs/bullmq`)
- Redis (injection directe)

**Le domaine est des types et des fonctions pures :**
```typescript
// basket.rules.ts (domain layer - zero dependance)
export function validateBasketPrice(price: number, originalValue: number): boolean {
  return price <= originalValue / 2;
}

export function canCancelReservation(reservation: Reservation): boolean {
  return reservation.status === 'CONFIRMED'
    && new Date() < reservation.basket.pickupStart;
}
```

Testable unitairement sans NestJS, Prisma, ni aucune dependance.

---

## 9. Q8 : Structure de fichiers recommandee par module

### 9.1 Module complexe (DDD tactique) -- ex: `reservations`

```
backend/
  src/
    modules/
      reservations/
        domain/
          reservation.entity.ts          # Type Reservation + ReservationStatus enum
          reservation.events.ts          # ReservationConfirmed, ReservationPickedUp, etc.
          reservation.rules.ts           # Fonctions pures de validation (canCancel, canPickup, etc.)
          reservation.errors.ts          # Erreurs domaine (ReservationNotCancellable, StockInsufficient)
          value-objects/
            money.vo.ts                  # Value object Money (amount + currency)
            pickup-code.vo.ts            # Value object QR + PIN
        state-machine/
          reservation.states.ts          # Enum ReservationStatus + ReservationEvent
          reservation.transitions.ts     # Table de transitions (ADR-017)
          reservation.guards.ts          # Gardes (canCancel, isPickupWindowActive, etc.)
          reservation.effects.ts         # Effets de bord par transition
        services/
          reservation.service.ts         # Service principal (orchestration)
          reservation-scheduler.service.ts # Jobs planifies (hold timeout, no-show, rappel)
        fulfillment/
          fulfillment.service.ts         # Validation QR/PIN
          fulfillment.controller.ts      # POST /pickups/validate
        controllers/
          reservation.controller.ts      # REST endpoints consommateur
          reservation-partner.controller.ts # REST endpoints partenaire (vue reservations)
        dto/
          create-reservation.dto.ts
          cancel-reservation.dto.ts
        listeners/
          basket-events.listener.ts      # Ecoute BasketPickupWindowStarted, BasketCancelled
        reservation.module.ts
```

### 9.2 Module complexe (DDD tactique) -- ex: `payments`

```
      payments/
        domain/
          ledger-transaction.entity.ts   # Type LedgerTransaction + LedgerEntry
          ledger.rules.ts                # validateDoubleEntry, calculateCommission
          payment.events.ts              # PaymentCaptured, PaymentRefunded, etc.
          value-objects/
            money.vo.ts                  # (partage ou duplique depuis shared)
        ports/
          payment-gateway.port.ts        # Interface IPaymentGateway
        adapters/
          peach-payments.adapter.ts      # Implements IPaymentGateway (cartes)
          mcb-juice.adapter.ts           # Implements IPaymentGateway (mobile money)
          blink.adapter.ts              # Implements IPaymentGateway (mobile money)
          myt-money.adapter.ts          # Implements IPaymentGateway (mobile money)
        services/
          payment.service.ts             # Orchestration pre-auth/capture/refund
          ledger.service.ts              # Ecritures ledger double-entry
          payout.service.ts              # Reversements mensuels
          commission.service.ts          # Calcul commissions
        controllers/
          payment.controller.ts          # Webhooks PSP, endpoints consommateur
          payout.controller.ts           # Endpoints admin (payouts)
        listeners/
          reservation-events.listener.ts # Ecoute ReservationConfirmed -> ecriture ledger
          claim-events.listener.ts       # Ecoute ClaimResolved -> refund
        payment.module.ts
```

### 9.3 Module simple (CRUD) -- ex: `favorites`

```
      favorites/
        favorite.service.ts              # CRUD direct via Prisma
        favorite.controller.ts           # REST endpoints
        favorite.dto.ts                  # DTO validation
        favorite.module.ts
```

Pas de domain/, pas de ports/, pas de state-machine/. Quatre fichiers suffisent.

### 9.4 Module simple (CRUD) -- ex: `reviews`

```
      reviews/
        review.service.ts
        review.controller.ts
        review.dto.ts
        review.module.ts
        listeners/
          reservation-events.listener.ts # Ecoute ReservationPickedUp -> ouvrir fenetre notation
```

### 9.5 Shared (types partages entre modules)

```
    shared/
      types/
        ids.ts                           # Types UUID brandes: BasketId, ReservationId, StoreId...
        money.ts                         # Money value object partage
        pagination.ts                    # PaginatedResult<T>
      state-machine/
        state-machine.service.ts         # Service generique StateMachine<S, E> (ADR-017)
        state-machine.types.ts           # Types generiques TransitionTable, Guard, Effect
      events/
        domain-event.interface.ts        # Interface DomainEvent<T>
        event-metadata.ts               # Metadata (actorId, correlationId, etc.)
      decorators/
        audit.decorator.ts              # @Auditable() pour tracer dans audit_logs
      interceptors/
        audit.interceptor.ts            # Interceptor NestJS pour audit trail (ADR-003)
      guards/
        roles.guard.ts                  # Guard RBAC (ADR-011)
        permissions.guard.ts
```

### 9.6 Regle d'imports entre modules

```
                       ┌──────────────┐
                       │    shared/   │  Importable par TOUS
                       └──────┬───────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
          ┌─────▼──────┐ ┌───▼───┐ ┌───────▼──────┐
          │ module A   │ │ mod B │ │ module C     │
          │            │ │       │ │              │
          │ Peut       │ │       │ │ Peut         │
          │ importer : │ │       │ │ importer :   │
          │ - shared/  │ │       │ │ - shared/    │
          │ - ports de │ │       │ │ - ports de B │
          │   B et C   │ │       │ │              │
          │            │ │       │ │ NE peut PAS  │
          │ NE peut    │ │       │ │ importer :   │
          │ PAS        │ │       │ │ - services   │
          │ importer : │ │       │ │   internes   │
          │ - services │ │       │ │   de A       │
          │   internes │ │       │ │              │
          │   de B ou C│ │       │ │              │
          └────────────┘ └───────┘ └──────────────┘
```

**Regle stricte :** Un module peut importer d'un autre module :
1. Son **module NestJS** (pour l'injection de dependances)
2. Ses **types publics** (entites, DTOs, events)
3. Ses **ports** (interfaces)

Un module **ne doit jamais** importer directement un **service interne** d'un autre module. Toujours passer par l'interface publique du module (exportee dans le `*.module.ts`).

**Enforcement :** `eslint-plugin-boundaries` ou convention de review. Les imports `../other-module/services/internal.service` sont interdits.

---

## 10. Synthese des decisions

| # | Decision | Justification |
|---|----------|---------------|
| D1 | DDD strategique partout + tactique leger sur 5 modules complexes | Equilibre effort/valeur pour une equipe de 2-5 devs |
| D2 | 11 bounded contexts mappes sur les modules NestJS | Correspondance 1:1 sauf Fulfillment (sous-module de Ordering) |
| D3 | Communication : appels directs sur le chemin critique, events pour les effets de bord | Pragmatique dans un monolithe |
| D4 | 7 agregats identifies avec invariants explicites | Focus sur les entites avec des regles metier, pas sur le CRUD |
| D5 | Events au passe, payload standard avec metadata | Convention claire pour l'IA et l'equipe |
| D6 | Ubiquitous language documente (FR -> EN -> code) | Elimine les ambiguites dans les prompts IA et le code |
| D7 | Architecture hexagonale pragmatique (ports pour les integrations externes uniquement) | Pas de repository abstract sur Prisma, pas de CQRS formel |
| D8 | Structure de fichiers differenciee (DDD complet vs CRUD simple) | Pas de ceremonie inutile sur les modules simples |

---

## 11. Consequences

### Consequences positives

1. **L'IA code mieux.** Avec un bounded context documente (entites, invariants, events, glossaire), les instructions sont precises : "Implemente le service ReservationService dans le BC Ordering. La reservation reference basketId et consumerId par UUID. Les transitions sont dans reservation.transitions.ts. Emet ReservationConfirmed apres le paiement."

2. **Le monolithe reste modulaire.** Les frontieres de BC empechent le couplage accidentel. Un dev qui ajoute une feature dans Ordering sait exactement quels modules il peut appeler et comment.

3. **Les invariants sont documentes et testables.** `basket.price <= basket.originalValue / 2` est dans `basket.rules.ts`, teste unitairement, et reference dans l'ADR. Pas dans un commentaire perdu dans un service de 500 lignes.

4. **Les domain events decouplent les modules.** Quand une reservation est completee (PICKED_UP), 5 choses se passent (notification, badges, fenetre reclamation, fenetre avis, stats). Grace aux events, le module Ordering n'a pas besoin de connaitre ces 5 modules.

5. **L'extraction progressive (ADR-002) est facilitee.** Si un jour on extrait Notification en service separe, les events sont deja definis. Il suffit de remplacer EventEmitter2 par un message broker.

### Consequences negatives

1. **Deux styles de code.** Les modules DDD (domain/, state-machine/, ports/) sont structures differemment des modules CRUD (4 fichiers). Cela peut surprendre un nouveau dev. Mitigation : ce document explique quand utiliser quel style.

2. **Maintenance du glossaire.** Le ubiquitous language doit etre maintenu quand de nouveaux termes apparaissent. Mitigation : le glossaire est dans cette ADR, pas dans un wiki separe. Il est versionne avec le code.

3. **Risque de sur-ingenierie.** Un dev motive pourrait vouloir ajouter des ports et des events partout, y compris dans `favorites`. Mitigation : la regle est claire -- DDD tactique seulement si state machine OU invariants financiers OU >15 US.

4. **Overhead initial.** Mettre en place la structure de fichiers, les types, les events, prend 1-2 jours de plus que du NestJS vanilla. Mitigation : cet investissement est rentabilise des la deuxieme feature du module.

---

## 12. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|------------|
| L'equipe ne respecte pas les frontieres de BC | Moyenne | Eleve | Linting strict (`eslint-plugin-boundaries`), code reviews sur les imports inter-modules |
| Le glossaire diverge du code | Moyenne | Moyen | Review ADR a chaque ajout de terme metier. Script de verification automatique (grep les noms de types) |
| Sur-ingenierie des modules simples | Faible | Moyen | Regle explicite : DDD tactique si et seulement si state machine / invariants financiers / >15 US |
| Les domain events deviennent un spaghetti | Moyenne | Eleve | Catalogue d'events dans cette ADR. Chaque event a un BC emetteur unique. Pas d'events "generiques" |
| Performance des events in-process (EventEmitter2) | Faible | Faible | Les events lourds (notification, fraud) passent par BullMQ. Les events legers (compteurs) sont synchrones |

---

## 13. References

- ADR-002 : Architecture applicative (monolithe modulaire, modules NestJS)
- ADR-003 : Schema base de donnees (tables, audit trail)
- ADR-005 : Architecture de paiement (Peach Payments, pre-auth/capture)
- ADR-007 : Ledger et commissions (double-entry bookkeeping)
- ADR-008 : Double-booking et stock (decrement atomique, hold pattern)
- ADR-011 : Modele d'autorisation RBAC
- ADR-014 : Notifications multicanal (BullMQ, FCM, Resend)
- ADR-017 : State machines (transition tables, gardes, effets)
- ADR-018 : Workflow d'approbation admin (modification requests)
- ADR-019 : Detection de fraude (regles configurables, compteurs)
- Eric Evans, "Domain-Driven Design: Tackling Complexity in the Heart of Software" (2003)
- Vaughn Vernon, "Implementing Domain-Driven Design" (2013) -- chapitre "Aggregates"
- Vaughn Vernon, "Domain-Driven Design Distilled" (2016) -- bounded contexts et context maps
- Martin Fowler, "BoundedContext" : https://martinfowler.com/bliki/BoundedContext.html
- User Stories BienBon : `dev-specs/us/` (206 US, 4 modules)
