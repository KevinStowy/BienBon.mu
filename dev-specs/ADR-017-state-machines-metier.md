# ADR-017 : Machines a etats pour les reservations, reclamations, paniers et partenaires

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-001 (stack backend), ADR-002 (architecture applicative), ADR-003 (schema DB), ADR-005 (paiement), ADR-007 (ledger/commissions), ADR-008 (stock/double-booking), ADR-012 (offline-first/cache), ADR-014 (notifications), ADR-019 (detection fraude)
**US associees** : US-C024, US-C025, US-C027, US-C028, US-C029, US-C036, US-C039, US-C042, US-C045, US-C047, US-C048, US-C049, US-P025, US-P026, US-P027, US-P029, US-P031, US-A005, US-A006, US-A013, US-A014, US-A015, US-A023, US-A024, US-A025

---

## 1. Contexte

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. Quatre entites metier centrales ont des cycles de vie complexes avec des transitions qui declenchent des effets de bord critiques :

1. **Reservation** -- entite la plus complexe, coeur du business. Chaque transition touche au paiement, au stock, au ledger et aux notifications.
2. **Reclamation (claim)** -- litige post-retrait. Une mauvaise transition = remboursement non effectue ou perte de confiance.
3. **Panier (basket)** -- cycle de publication a archivage, avec des contraintes liees aux reservations existantes.
4. **Partenaire** -- cycle d'inscription, activation, suspension, bannissement.

### 1.1 Pourquoi cette decision est necessaire maintenant

Les ADR precedentes ont pose les bases techniques (stack, schema, paiement, ledger, stock, notifications) mais n'ont pas formalise la **gouvernance des transitions d'etat**. Or :

- **Un etat invalide = perte d'argent.** Si une reservation passe de `NO_SHOW` a `CANCELLED_CONSUMER`, le consommateur est rembourse a tort alors qu'il ne s'est pas presente.
- **Les effets de bord sont critiques.** Chaque transition declenche entre 1 et 5 operations liees (stock, ledger, paiement, notification, QR code). Oublier un effet = incoherence du systeme.
- **La concurrence est reelle.** Le consommateur annule, le partenaire annule, le timer expire -- tout peut arriver en meme temps sur la meme reservation. Sans serialisation, des race conditions produisent des etats impossibles.
- **Le nombre de timers est eleve.** Hold 5 min, rappel 1h avant retrait, no-show 5 min apres fin de creneau, fenetre reclamation 24h, fenetre edition avis 24h. Il faut une strategie unifiee.

### 1.2 Statuts existants dans le schema (ADR-003)

ADR-003 a defini les enums suivants :

**Reservation** : `pending_payment`, `confirmed`, `picked_up`, `no_show`, `cancelled_consumer`, `cancelled_partner`, `expired`

**Panier** : `draft`, `active`, `sold_out`, `expired`, `archived`

**Reclamation** : non explicitement defini dans ADR-003 (table `claims` avec un champ status)

**Partenaire** : implicitement `pending`, `active`, `suspended`, `banned` (derive des US-A005 a US-A015)

Cette ADR enrichit ces enums et formalise les transitions, gardes et effets de bord pour chacun.

---

## 2. Diagrammes d'etats complets

### 2.1 Reservation

```
                                 annulation consommateur
                                 (avant debut creneau)
                                 US-C027
                        ┌────────────────────────┐
                        │                        │
                        │                        ▼
  ┌──────────────┐    ┌─┴──────────┐    ┌──────────────────────┐
  │              │    │            │    │                      │
  │ PENDING_     ├───►│ CONFIRMED  │    │ CANCELLED_CONSUMER   │
  │ PAYMENT      │    │            │    │                      │
  │              │    └──┬───┬─────┘    └──────────────────────┘
  └──┬───────────┘       │   │
     │                   │   │ annulation partenaire
     │                   │   │ US-P029
     │                   │   │
     │ timeout 5 min     │   ▼
     │ ou echec paiement │   ┌──────────────────────┐
     │                   │   │                      │
     ▼                   │   │ CANCELLED_PARTNER    │
  ┌──────────────┐       │   │                      │
  │              │       │   └──────────────────────┘
  │ EXPIRED      │       │
  │              │       │ debut du creneau de retrait
  └──────────────┘       │ (capture paiement)
                         │
                         ▼
                    ┌───────────┐
                    │           │
                    │  READY    │
                    │           │
                    └──┬────┬───┘
                       │    │
      scan QR/PIN      │    │ fin creneau + 5 min
      US-P026/P027     │    │ sans retrait
                       │    │ US-C042/P031
                       ▼    ▼
                ┌──────────┐  ┌──────────┐
                │          │  │          │
                │ PICKED_UP│  │ NO_SHOW  │
                │          │  │          │
                └────┬─────┘  └──────────┘
                     │
                     │ automatique (meme transaction)
                     ▼
                ┌──────────┐
                │          │
                │ COMPLETED│
                │          │
                └────┬─────┘
                     │
                     │ reclamation dans les 24h
                     │ US-C047
                     ▼
                ┌──────────┐
                │          │
                │ CLAIMED  │
                │          │
                └──────────┘
```

**Note sur PICKED_UP vs COMPLETED** : Dans les specs, le scan QR/PIN valide le retrait (PICKED_UP) et le processus se termine (COMPLETED). Deux options :

- **Option A** : PICKED_UP et COMPLETED sont un seul etat (`PICKED_UP` = terminal sauf reclamation). Plus simple.
- **Option B** : PICKED_UP est transitoire, COMPLETED est pose par un job batch (ex: fin de journee) ou immediatement. Permet des logiques futures (partenaire signale un probleme post-retrait).

**Decision : Option A.** PICKED_UP est l'etat terminal nominal. On supprime COMPLETED du schema pour eviter la complexite inutile. Si une reclamation est ouverte, le statut de la reservation reste `PICKED_UP` et la reclamation est une entite separee avec son propre cycle de vie (voir section 2.2).

**Schema d'etats final de la reservation :**

```
PENDING_PAYMENT ──► CONFIRMED ──► READY ──► PICKED_UP
       │                │             │          │
       │                │             │          └──► (claim ouvert = entite separee)
       │                │             │
       │                │             ├──► PICKED_UP_PENDING_SYNC ──► PICKED_UP
       │                │             │    (validation offline,         (sync reussie)
       │                │             │     ADR-012 section 6)
       │                │             │
       │                ├──► CANCELLED_CONSUMER
       │                └──► CANCELLED_PARTNER
       │
       └──► EXPIRED

READY ──► NO_SHOW
```

**Etats terminaux** : `EXPIRED`, `CANCELLED_CONSUMER`, `CANCELLED_PARTNER`, `PICKED_UP`, `NO_SHOW`

**Etat transitoire** : `PICKED_UP_PENDING_SYNC` -- retrait valide offline par le partenaire, en attente de synchronisation serveur (ADR-012). Cet etat existe localement sur le terminal partenaire et, une fois synchronise, est converti en `PICKED_UP` cote serveur. Le no-show timer **ne doit pas declencher** si une validation offline est en queue (garde `notPendingOfflineSync`).

**Discriminant `payment_method_type`** : la reservation porte un champ `payment_method_type: 'card' | 'mobile_money'` qui conditionne les effets de bord financiers des transitions R1, R3, R4, R5, R6 (voir section 3.1.0 pour le detail).

### 2.2 Reclamation (Claim)

```
  ┌──────────┐    admin prend en charge    ┌──────────────┐
  │          ├────────────────────────────►│              │
  │  OPEN    │           US-A024           │  IN_REVIEW   │
  │          │                             │              │
  └──────────┘                             └──┬────────┬──┘
                                              │        │
                         remboursement        │        │  rejet avec
                         total ou partiel     │        │  explication
                         US-A025              │        │  US-A025
                                              │        │
                                              ▼        ▼
                                      ┌──────────┐  ┌──────────┐
                                      │          │  │          │
                                      │ RESOLVED │  │ REJECTED │
                                      │          │  │          │
                                      └──────────┘  └──────────┘
```

**Etats terminaux** : `RESOLVED`, `REJECTED`

**Note** : `RESOLVED` couvre les trois cas (remboursement total, partiel, ou credit commercial). Le type de resolution est stocke dans des champs complementaires (`resolution_type`, `refund_amount`) plutot que dans le statut.

### 2.3 Panier (Basket)

```
  ┌──────────┐                    ┌──────────────┐
  │          │   publication      │              │
  │  DRAFT   ├───────────────────►│  PUBLISHED   │
  │          │                    │              │
  └──────────┘                    └──┬───┬───┬───┘
                                     │   │   │
                    stock atteint 0  │   │   │ annulation partenaire
                    (auto)           │   │   │ US-P029
                                     │   │   │
                                     ▼   │   ▼
                            ┌──────────┐ │ ┌───────────┐
                            │          │ │ │           │
                            │ SOLD_OUT │ │ │ CANCELLED │
                            │          │ │ │           │
                            └────┬─────┘ │ └───────────┘
                                 │       │
              stock re-incremente│       │ debut creneau retrait
              (annulation)       │       │ (auto)
                                 │       │
                                 ▼       ▼
                            ┌──────────┐
                            │  retour  │ ┌────────────────┐
                            │ PUBLISHED│ │                │
                            │  (si >0) │ │ PICKUP_WINDOW  │
                            └──────────┘ │                │
                                         └───────┬────────┘
                                                 │
                                                 │ fin creneau + traitement
                                                 │ no-show (auto)
                                                 ▼
                                         ┌──────────────┐
                                         │              │
                                         │    ENDED     │
                                         │              │
                                         └──────┬───────┘
                                                │
                                                │ archivage auto
                                                │ (24h ou batch nocturne)
                                                ▼
                                         ┌──────────────┐
                                         │              │
                                         │  ARCHIVED    │
                                         │              │
                                         └──────────────┘
```

**Note sur l'enum ADR-003** : Le schema actuel definit `draft`, `active`, `sold_out`, `expired`, `archived`. Cette ADR affine en renommant/ajoutant :
- `active` → `PUBLISHED` (plus explicite)
- Ajout de `PICKUP_WINDOW` (creneau en cours)
- Ajout de `CANCELLED` (annulation partenaire avec reservations)
- `expired` → `ENDED` (fin du creneau, plus clair que "expired" qui pourrait se confondre avec le expired des reservations)

**Etats terminaux** : `CANCELLED`, `ARCHIVED`

**Transition speciale SOLD_OUT → PUBLISHED** : Quand un consommateur annule sa reservation, le stock est re-incremente. Si le panier etait `SOLD_OUT`, il repasse a `PUBLISHED` (le panier redevient visible et reservable). Cette transition est automatique et conditionnelle (`stock > 0`).

### 2.4 Partenaire

```
  ┌──────────┐    validation admin    ┌──────────┐
  │          ├───────────────────────►│          │
  │ PENDING  │       US-A005          │  ACTIVE  │◄─────────────────────┐
  │          │                        │          │  reactivation admin  │
  └──┬───────┘                        └──┬────┬──┘  US-A014             │
     │                                   │    │                        │
     │ rejet admin                       │    │                        │
     │ US-A006                           │    │                        │
     │                                   │    │                        │
     ▼                                   │    │                        │
  ┌──────────┐                           │    │                ┌───────┴───┐
  │          │          suspension admin  │    │                │           │
  │ REJECTED │                           │    │                │ SUSPENDED │
  │          │                           │    └───────────────►│           │
  └──────────┘                           │       US-A013       └─────┬─────┘
                                         │                          │
                                         │ bannissement admin       │ bannissement
                                         │ US-A015                  │ depuis suspension
                                         │                          │ US-A015
                                         ▼                          │
                                    ┌──────────┐                    │
                                    │          │◄───────────────────┘
                                    │  BANNED  │
                                    │          │
                                    └──────────┘
```

**Etats terminaux** : `REJECTED`, `BANNED` (le bannissement ne peut etre leve que par un super-admin, cas exceptionnel non modelise dans la machine a etats standard)

**Note** : `REJECTED` n'est pas strictement terminal -- le partenaire peut resoumettre une nouvelle demande (US-P003), mais c'est une nouvelle entite `inscription`, pas une transition sur le meme partenaire.

---

## 3. Tables de transitions completes

### 3.1 Reservation

#### 3.1.0 Discriminant `payment_method_type`

Chaque reservation porte un champ `payment_method_type: 'card' | 'mobile_money'` (derive de la table `payment_transactions.payment_method`, ADR-005). Ce discriminant conditionne le comportement de plusieurs transitions, car **les cartes bancaires et le mobile money ont des flux fondamentalement differents** (ADR-005, decision B1 -- modele hybride) :

| Aspect | Carte bancaire (Visa/MC) | Mobile money (MCB Juice, Blink, MauCAS) |
|--------|--------------------------|------------------------------------------|
| A la reservation | **Pre-autorisation (PA)** -- montant bloque, pas debite | **Debit immediat (DB)** -- montant preleve du wallet |
| Ecriture ledger a la reservation | Aucune (la PA n'est pas un mouvement de fonds) | Debit `GATEWAY` / Credit `CONSUMER_HOLDING` (ADR-007) |
| A la capture (debut creneau) | **Capture (CP)** -- conversion PA en debit effectif | Transfert comptable de `CONSUMER_HOLDING` vers comptes finaux (fonds deja debites) |
| Annulation avant creneau | **Reversal (RV)** -- instantane, cout Rs 0 | **Remboursement (RF)** -- delai 3-10 jours ouvrables, cout non nul |
| Expiration du hold 5 min | **Reversal (RV)** de la PA si elle a ete initiee | **Remboursement (RF)** du DB si le debit a abouti |
| No-show | Capture (CP) effectuee au debut creneau, maintenue | Debit (DB) deja effectue, maintenu |

> **Justification** : ADR-005 a decide le modele hybride (decision B1) car les wallets mobile money mauriciens (MCB Juice, Blink, my.t money via MauCAS) ne supportent **pas** la pre-autorisation (uniquement le debit immediat `DB`). Ne pas distinguer ces flux dans la machine a etats conduirait a des erreurs de paiement (tentative de reversal sur un debit mobile money, tentative de remboursement sur une PA non capturee, etc.).

#### 3.1.1 Table de transitions

| # | Etat source | Evenement | Garde (condition) | Etat cible | Effets de bord |
|---|------------|-----------|-------------------|-----------|----------------|
| R1 | `PENDING_PAYMENT` | `PAYMENT_SUCCESS` | PA reussie (carte) ou DB reussi (mobile money) | `CONFIRMED` | **Carte** : 1. Aucune ecriture ledger (la PA n'est pas un mouvement de fonds, conforme ADR-005/ADR-007). **Mobile money** : 1. Ecriture ledger : Debit `GATEWAY` / Credit `CONSUMER_HOLDING` Rs X (fonds recus, en attente de capture -- ADR-007 flux 1 phase A). **Commun** : 2. Stockage `payment_method_type` sur la reservation 3. Generation QR code (payload chiffre AES-256, conforme ADR-012 section 5) + PIN 4-6 chiffres 4. Notification push + email confirmation (ADR-014 #2) 5. Planification BullMQ delayed job `notification:pickup-reminder` (1h avant `basket.pickup_start`) 6. Enregistrement `confirmed_at` 7. Annulation du job `reservation:expire-hold` (le paiement est arrive a temps) |
| R2 | `PENDING_PAYMENT` | `PAYMENT_FAILED` | Echec explicite du PSP (Peach Payments) | `EXPIRED` | 1. Stock re-incremente `+quantity` via `UPDATE baskets SET stock = stock + qty WHERE id = basket_id` (ADR-008, decrementation atomique inverse) 2. Pas d'ecriture ledger (carte : pas de PA reussie ; mobile money : pas de DB reussi) 3. Notification erreur paiement a l'ecran avec message adapte au type d'echec (US-C036) 4. Annulation du job `reservation:expire-hold` 5. Enregistrement `expired_at` |
| R3 | `PENDING_PAYMENT` | `HOLD_TIMEOUT` | `NOW() > reservation.expires_at` (5 min apres creation, conforme ADR-008 section hold temporaire) | `EXPIRED` | 1. Stock re-incremente `+quantity` (ADR-008) 2. **Carte** : Reversal (RV) de la PA si elle avait ete initiee (appel Peach `POST /v1/payments/{paId}` avec `paymentType: 'RV'`) -- cout Rs 0. **Mobile money** : Remboursement (RF) du DB si le debit avait abouti (appel Peach `POST /v1/payments/{dbId}` avec `paymentType: 'RF'`) -- creation `refund` en table `refunds` avec `status: 'pending'` 3. Ecriture ledger (mobile money uniquement, si DB avait abouti) : Debit `CONSUMER_HOLDING` / Credit `GATEWAY` Rs X (liberation des fonds en holding -- ADR-007 flux 2) 4. Annulation du job BullMQ `notification:pickup-reminder` 5. Enregistrement `expired_at` 6. Si panier etait `SOLD_OUT` → verifier retour a `PUBLISHED` (transition B3) |
| R4 | `CONFIRMED` | `CONSUMER_CANCEL` | Creneau de retrait non commence : `NOW() < basket.pickup_start` (US-C027) | `CANCELLED_CONSUMER` | 1. Stock re-incremente `+quantity` (ADR-008) 2. **Carte** : Reversal (RV) de la PA -- cout Rs 0, instantane. Pas d'ecriture ledger (la PA n'avait pas genere d'ecriture). **Mobile money** : Remboursement (RF) du DB -- delai 3-10 jours ouvrables. Ecriture ledger compensatoire : Debit `CONSUMER_HOLDING` / Credit `GATEWAY` Rs X (ADR-007 flux 2). Creation entree table `refunds` (`status: 'pending'`). 3. Notification push + email annulation (ADR-014 #4) -- le message differe selon `payment_method_type` : carte → "Montant debloque immediatement" ; mobile money → "Remboursement initie, delai 3-10 jours ouvrables" 4. Annulation du job BullMQ `notification:pickup-reminder` 5. Enregistrement `cancelled_at` 6. Si panier etait `SOLD_OUT` → verifier retour a `PUBLISHED` (transition B3) 7. Increment compteur fraude `fraud:cancel:{consumerId}` (ADR-019, regle C5) |
| R5 | `CONFIRMED` | `PARTNER_CANCEL` | Panier annule par le partenaire (US-P029) -- applique en masse a toutes les reservations `CONFIRMED` du panier | `CANCELLED_PARTNER` | 1. Stock re-incremente `+quantity` (ADR-008) 2. **Carte** : Reversal (RV) de la PA. **Mobile money** : Remboursement (RF) du DB + ecriture ledger compensatoire Debit `CONSUMER_HOLDING` / Credit `GATEWAY` Rs X (ADR-007 flux 2). 3. Notification push + email consommateur (ADR-014 #5) 4. Annulation de tous les jobs BullMQ associes (`pickup-reminder`, `expire-hold`) 5. Enregistrement `cancelled_at` 6. Trace dans `audit_logs` avec motif partenaire 7. Si panier etait `SOLD_OUT` → verifier retour a `PUBLISHED` (transition B3) |
| R6 | `CONFIRMED` | `PICKUP_WINDOW_START` | `NOW() >= basket.pickup_start` (job CRON + BullMQ delayed job `basket:capture-payments`) | `READY` | 1. **Carte** : Capture (CP) du paiement (appel Peach `POST /v1/payments/{paId}` avec `paymentType: 'CP'`, `amount: X`). Si capture echoue : retry BullMQ 3x avec backoff exponentiel + notification admin. Ecritures ledger : Debit `GATEWAY` Rs X / Credit `PLATFORM_REVENUE` Rs commission_effective / Credit `PARTNER_PAYABLE:<partner_uuid>` Rs net_partenaire (ADR-007, flux 1 phase B carte). **Mobile money** : Pas d'appel Peach (fonds deja debites). Transfert comptable : Debit `CONSUMER_HOLDING` Rs X / Credit `PLATFORM_REVENUE` Rs commission_effective / Credit `PARTNER_PAYABLE:<partner_uuid>` Rs net_partenaire (ADR-007, flux 1 phase B mobile money). 2. Calcul commission : `commission_effective = MAX(X * commission_rate, fee_minimum)` ; `net_partenaire = X - commission_effective` (ADR-007 decision 2). 3. Enregistrement `ready_at` 4. Planification BullMQ delayed job `basket:detect-no-shows` a `basket.pickup_end + 5 min` |
| R7 | `READY` | `PICKUP_VALIDATED` | Scan QR ou saisie PIN valide (US-P026/P027) ET validation en ligne (reseau disponible) | `PICKED_UP` | 1. Enregistrement `picked_up_at` + `pickup_method` ('qr' ou 'pin') + `pickup_validated_by` (partner_user_id) 2. Notification push consommateur "Retrait valide" 3. Planification BullMQ delayed job fenetre reclamation (24h apres `picked_up_at`) 4. Planification BullMQ delayed job fenetre edition avis (24h) 5. Annulation du job `basket:detect-no-shows` pour cette reservation (ou la garde `notAlreadyPickedUp` le neutralisera) 6. Prompt de notation au consommateur (US-C045) |
| R7b | `READY` | `PICKUP_VALIDATED_OFFLINE` | Scan QR ou saisie PIN valide localement sur le terminal partenaire, MAIS reseau indisponible (ADR-012 section 6) | `PICKED_UP_PENDING_SYNC` | **Cote terminal partenaire (Flutter, Drift DB locale)** : 1. Validation locale optimiste : format QR/PIN valide, reservation connue en cache local (pre-chargee via `prefetchTodayReservations`), statut local = 'reserved', creneau en cours 2. Affichage "Retrait valide" avec mention "(en attente de synchronisation)" 3. Enregistrement dans `OfflineActionQueue` (Drift) : `actionType: 'validate_pickup'`, `payloadJson: { reservationId, qrPayload, pinCode, validatedAt, partnerUserId }`, `status: 'pending'` 4. Enregistrement local `picked_up_at` + `pickup_method` 5. **Aucun appel serveur** -- le retrait physique a eu lieu, le systeme s'ajustera a la synchronisation |
| R7c | `PICKED_UP_PENDING_SYNC` | `OFFLINE_SYNC_SUCCESS` | Le `SyncWorker` (ADR-012 section 6.2) a reussi a `POST /pickups/validate` et le serveur a retourne 200 | `PICKED_UP` | 1. Mise a jour `picked_up_at` serveur (le timestamp de la validation offline est transmis) 2. Memes effets que R7 (notification consommateur, job fenetre reclamation/avis, annulation job no-show) 3. Mise a jour statut `OfflineActionQueue` → `synced` |
| R7d | `PICKED_UP_PENDING_SYNC` | `OFFLINE_SYNC_CONFLICT` | Le serveur retourne 409 (reservation annulee entre-temps) ou 410 (reservation expiree) | `PICKED_UP` | **Principe ADR-012 section 6.4 : le retrait physique prime.** Le panier a ete remis au consommateur, la transaction est consideree comme effectuee. 1. Le serveur annule le no-show ou l'annulation si applicable 2. Le serveur cree une entree `audit_logs` avec `action: 'pickup_conflict_resolved'`, `metadata: { offline_validated_at, sync_conflict_type }` 3. Notification admin (alerte pour verification manuelle) 4. Mise a jour statut `OfflineActionQueue` → `conflict_resolved` |
| R8 | `READY` | `NO_SHOW_TIMEOUT` | `NOW() > basket.pickup_end + 5 min` ET `reservation.picked_up_at IS NULL` ET `reservation.status != 'picked_up_pending_sync'` (verifie qu'aucune validation offline n'est en cours) | `NO_SHOW` | 1. Paiement capture maintenu (pas de remboursement -- le debit/capture a eu lieu en R6) 2. Enregistrement `no_show_at` 3. Notification push + email consommateur (ADR-014 #8, US-C042) 4. Notification synthese partenaire en fin de creneau (US-P031) 5. Increment compteur fraude Redis `fraud:noshow:{consumerId}` via BullMQ job `fraud-check` (ADR-019, regle C1 `consumer_noshow_auto` -- seuil 3 no-shows/30 jours → auto-suspension) 6. Evaluation immediate des regles a seuil absolu (ADR-019 section 5.2) |
| R9 | `PICKED_UP` | `CLAIM_OPENED` | `NOW() < picked_up_at + 24h` (fenetre de reclamation, US-C047) | *(pas de changement d'etat reservation)* | 1. Creation d'une entite `Claim` en etat `OPEN` liee a cette reservation (voir machine 3.2) 2. Notification email confirmation reclamation avec numero de reference 3. Increment compteur fraude Redis `fraud:claim:{consumerId}` via BullMQ job `fraud-check` (ADR-019, regle C3 `consumer_claim_rate` -- seuil 30% claims/pickups sur 30 jours, min 5 retraits → alerte haute) |

#### 3.1.2 Flux de paiement par transition (resume visuel)

```
FLUX CARTE BANCAIRE (payment_method_type = 'card')
─────────────────────────────────────────────────
R1 : PA (pre-auth)           → pas d'ecriture ledger
R3 : Expiration hold         → RV (reversal PA) gratuit
R4 : Annulation conso        → RV (reversal PA) gratuit, pas d'ecriture ledger
R5 : Annulation partenaire   → RV (reversal PA) gratuit, pas d'ecriture ledger
R6 : Debut creneau           → CP (capture)
                                 Debit GATEWAY / Credit PLATFORM_REVENUE + PARTNER_PAYABLE:<uuid>
R8 : No-show                 → (rien, capture deja faite en R6)


FLUX MOBILE MONEY (payment_method_type = 'mobile_money')
────────────────────────────────────────────────────────
R1 : DB (debit immediat)     → Debit GATEWAY / Credit CONSUMER_HOLDING
R3 : Expiration hold         → RF (remboursement 3-10j)
                                 Debit CONSUMER_HOLDING / Credit GATEWAY
R4 : Annulation conso        → RF (remboursement 3-10j)
                                 Debit CONSUMER_HOLDING / Credit GATEWAY
R5 : Annulation partenaire   → RF (remboursement 3-10j)
                                 Debit CONSUMER_HOLDING / Credit GATEWAY
R6 : Debut creneau           → (pas d'appel Peach, fonds deja debites)
                                 Debit CONSUMER_HOLDING / Credit PLATFORM_REVENUE + PARTNER_PAYABLE:<uuid>
R8 : No-show                 → (rien, debit deja fait en R1, capture comptable en R6)
```

#### 3.1.3 Transitions interdites explicitement (exemples non exhaustifs)

| Depuis | Vers | Raison |
|--------|------|--------|
| `EXPIRED` | tout sauf `EXPIRED` | Etat terminal |
| `NO_SHOW` | `CANCELLED_CONSUMER` | On ne peut pas annuler apres un no-show |
| `NO_SHOW` | `PICKED_UP` | Le retrait n'a pas eu lieu (exception : sync offline, voir R7d qui resout le conflit) |
| `PICKED_UP` | `CANCELLED_CONSUMER` | Trop tard, le retrait a eu lieu |
| `CANCELLED_CONSUMER` | `CONFIRMED` | Une annulation est irreversible |
| `READY` | `CANCELLED_CONSUMER` | Le creneau a commence, annulation impossible (US-C027) |
| `PENDING_PAYMENT` | `READY` | Doit passer par CONFIRMED |
| `PENDING_PAYMENT` | `PICKED_UP` | Impossible sans paiement |
| `PICKED_UP_PENDING_SYNC` | `NO_SHOW` | Le retrait a eu lieu physiquement, le no-show est impossible |
| `PICKED_UP_PENDING_SYNC` | `CANCELLED_CONSUMER` | Le retrait a eu lieu, annulation impossible |

### 3.2 Reclamation (Claim)

| # | Etat source | Evenement | Garde | Etat cible | Effets de bord |
|---|------------|-----------|-------|-----------|----------------|
| C1 | `OPEN` | `ADMIN_TAKE_CHARGE` | Admin authentifie (role `admin` ou `super_admin`, ADR-011), reclamation non assignee (`assigned_admin_id IS NULL`) | `IN_REVIEW` | 1. Assignation de l'admin traitant (`assigned_admin_id`) 2. Enregistrement `in_review_at` 3. Notification push consommateur "Reclamation en cours de traitement" (US-C048) 4. Ecriture `claim_status_history` |
| C2 | `IN_REVIEW` | `ADMIN_RESOLVE_FULL_REFUND` | Montant > 0, admin authentifie, `assigned_admin_id = actorId` | `RESOLVED` | 1. Remboursement total sur le moyen de paiement original : **Carte** : Refund (RF) via Peach `POST /v1/payments/{cpId}` avec `paymentType: 'RF'` (remboursement de la capture). **Mobile money** : Refund (RF) via Peach `POST /v1/payments/{dbId}` avec `paymentType: 'RF'`. 2. Ecritures ledger compensatoires (ADR-007 flux 3 -- reclamation avec remboursement) : Debit `PLATFORM_REVENUE` Rs commission_effective / Credit `REFUND_PENDING` Rs commission_effective (annulation commission BienBon) ; Debit `PARTNER_PAYABLE:<partner_uuid>` Rs net_partenaire / Credit `REFUND_PENDING` Rs net_partenaire (ajustement payout partenaire) ; A la confirmation Peach du remboursement : Debit `REFUND_PENDING` Rs X / Credit `GATEWAY` Rs X. 3. Recalcul et ajustement commission BienBon (US-A025, ADR-007 decision 2) 4. Ajustement payout partenaire (le solde `PARTNER_PAYABLE` est reduit) 5. Notification push + email consommateur (resolution + montant + delai estime : carte ~ immediatement, mobile money ~ 3-10 jours ouvrables) 6. Notification push + email partenaire (reclamation + resolution + impact sur payout) 7. Enregistrement `resolved_at` + `resolution_type = 'full_refund'` + `refund_amount` 8. Increment compteur fraude `fraud:refund:{consumerId}` (ADR-019, regle C4 `consumer_refund_abuse` -- seuil 4 remboursements/30 jours → alerte haute) 9. Trace `audit_logs` + `claim_status_history` |
| C3 | `IN_REVIEW` | `ADMIN_RESOLVE_PARTIAL_REFUND` | `0 < montant < total_price`, admin authentifie, `assigned_admin_id = actorId` | `RESOLVED` | Memes effets que C2 avec montant partiel. La formule de calcul : `refund_commission = montant_rembourse * commission_rate_effective` ; ajustement `PLATFORM_REVENUE` et `PARTNER_PAYABLE` au prorata. Enregistrement `resolution_type = 'partial_refund'`. |
| C4 | `IN_REVIEW` | `ADMIN_RESOLVE_CREDIT` | Montant > 0, admin authentifie | `RESOLVED` | 1. Credit commercial (si wallet consommateur implemente en Phase 2). Au MVP : pas de credit commercial, uniquement remboursement. 2. Enregistrement `resolution_type = 'credit'` + `credit_amount` 3. Notification push + email consommateur (credit accorde) 4. Trace `audit_logs` + `claim_status_history` |
| C5 | `IN_REVIEW` | `ADMIN_REJECT` | Motif obligatoire, admin authentifie, `assigned_admin_id = actorId` | `REJECTED` | 1. Notification push + email consommateur (rejet + motif detaille) 2. Enregistrement `resolved_at` + `resolution_type = 'rejected'` 3. Trace `audit_logs` + `claim_status_history` |
| C6 | `OPEN` | `AUTO_EXPIRE` | `NOW() > claim.created_at + 30 jours` ET aucun admin n'a pris en charge | `REJECTED` | 1. Rejet automatique avec motif "Reclamation non traitee dans le delai imparti" 2. Notification push + email consommateur 3. Alerte admin (une reclamation a expire sans traitement -- indicateur de surcharge) 4. Trace `audit_logs` + `claim_status_history` |

**Note sur le lien avec ADR-019 (detection fraude)** : Chaque reclamation ouverte (R9/C1) et chaque remboursement accorde (C2/C3) incremente les compteurs fraude Redis. Les regles ADR-019 sont evaluees en temps reel pour les seuils absolus (`consumer_refund_abuse` : 4 remboursements/30 jours) et en batch pour les ratios (`consumer_claim_rate` : 30% claims/pickups). Une auto-suspension du consommateur par ADR-019 n'annule pas les reclamations en cours -- elles continuent d'etre traitees normalement.

### 3.3 Panier (Basket)

| # | Etat source | Evenement | Garde | Etat cible | Effets de bord |
|---|------------|-----------|-------|-----------|----------------|
| B1 | `DRAFT` | `PUBLISH` | Champs obligatoires remplis, prix valide (reduction >= 50%), creneau dans le futur | `PUBLISHED` | 1. Panier visible par les consommateurs 2. Notification push favoris "Nouveau panier chez [commerce]" (ADR-014 #1) |
| B2 | `PUBLISHED` | `STOCK_ZERO` | `stock = 0` (decremente par une reservation) | `SOLD_OUT` | 1. Panier retire de l'affichage "disponible" 2. Reste visible avec mention "Epuise" |
| B3 | `SOLD_OUT` | `STOCK_RESTORED` | `stock > 0` (suite a annulation consommateur ou expiration hold) | `PUBLISHED` | 1. Panier de nouveau visible comme disponible |
| B4 | `PUBLISHED` | `PARTNER_CANCEL` | Au moins une reservation active (sinon c'est une suppression, pas une annulation) | `CANCELLED` | 1. Toutes les reservations `CONFIRMED` → `CANCELLED_PARTNER` (transition R5 en masse) 2. Toutes les reservations `PENDING_PAYMENT` → `EXPIRED` 3. Panier retire de l'affichage 4. Motif enregistre (US-P029) 5. Trace audit log |
| B5 | `PUBLISHED` | `PICKUP_WINDOW_START` | `NOW() >= pickup_start` | `PICKUP_WINDOW` | 1. Declenchement des captures de paiement pour toutes les reservations `CONFIRMED` (transition R6 en masse) |
| B6 | `SOLD_OUT` | `PICKUP_WINDOW_START` | `NOW() >= pickup_start` | `PICKUP_WINDOW` | Meme que B5 |
| B7 | `PICKUP_WINDOW` | `PICKUP_WINDOW_END` | `NOW() >= pickup_end + 5 min` (delai grace no-show) | `ENDED` | 1. Toutes les reservations `READY` sans retrait → `NO_SHOW` (transition R8 en masse) 2. Notification synthese partenaire |
| B8 | `ENDED` | `ARCHIVE` | Batch nocturne ou 24h apres fin | `ARCHIVED` | 1. Panier deplace dans l'historique 2. Non visible dans les recherches |
| B9 | `DRAFT` | `DELETE` | Aucune reservation | *(suppression physique ou soft delete)* | Le panier n'a jamais ete publie, aucune trace necessaire |

### 3.4 Partenaire

| # | Etat source | Evenement | Garde | Etat cible | Effets de bord |
|---|------------|-----------|-------|-----------|----------------|
| P1 | `PENDING` | `ADMIN_VALIDATE` | Admin authentifie, documents verifies | `ACTIVE` | 1. Acces dashboard debloque 2. Email + push bienvenue (US-P002) 3. Redirection vers onboarding premiere connexion 4. Trace audit log |
| P2 | `PENDING` | `ADMIN_REJECT` | Motif obligatoire | `REJECTED` | 1. Email avec motif + lien re-soumission (US-P003) 2. Trace audit log |
| P3 | `ACTIVE` | `ADMIN_SUSPEND` | Motif obligatoire, confirmation admin | `SUSPENDED` | 1. Tous les paniers actifs retires de la visibilite 2. Toutes les reservations en cours annulees → remboursements en masse (US-A013) 3. Modeles recurrents desactives 4. Connexion dashboard bloquee 5. Email avec motif de suspension 6. Trace audit log |
| P4 | `SUSPENDED` | `ADMIN_REACTIVATE` | Admin authentifie | `ACTIVE` | 1. Acces dashboard restore 2. Publication de paniers re-autorisee 3. Modeles recurrents NON reactives auto (US-A014) 4. Email + push reactivation 5. Trace audit log |
| P5 | `ACTIVE` | `ADMIN_BAN` | Motif obligatoire, double confirmation | `BANNED` | Memes effets que P3 + blocage BRN/email/telephone pour reinscription (US-A015) |
| P6 | `SUSPENDED` | `ADMIN_BAN` | Motif obligatoire, double confirmation | `BANNED` | Blocage reinscription BRN/email/telephone, email avec motif, trace audit |

---

## 4. Decision d'implementation

### 4.1 Analyse des options

#### Option A : Librairie de state machine (XState, typescript-fsm, @xstate/fsm)

**Avantages** :
- Formalisme mathematique garanti (impossible de coder une transition invalide)
- Visualisation automatique des diagrammes
- XState a un ecosysteme riche (inspecteur, testing utilities)

**Inconvenients** :
- XState est concu pour le frontend (React/Vue). Le portage backend existe (`@xstate/fsm`) mais l'ecosysteme NestJS ne l'integre pas nativement.
- XState v5 pese ~45 KB et embarque beaucoup de fonctionnalites inutiles cote serveur (parallel states, history states, invocations).
- La logique metier (effets de bord) finit quand meme dans du code NestJS -- XState ne fait que valider la transition et appeler un callback.
- Courbe d'apprentissage pour l'equipe (2-5 devs) sur une abstraction qui n'est pas necessaire a cette echelle.
- Debugger un probleme en production necessite de comprendre le modele XState + le code NestJS, pas juste le code NestJS.

#### Option B : Pattern "transition table" maison

**Description** : Une map typee `Record<State, Record<Event, { target: State; guard?: () => boolean; effects: Effect[] }>>` dans un fichier de configuration par entite. Un service generique `StateMachine<S, E>` lit la table, verifie la transition, execute les gardes, et delegue les effets.

**Avantages** :
- Zero dependance externe
- Totalement lisible : la table des transitions EST la documentation
- TypeScript donne le meme niveau de type-safety qu'une lib (enums pour les etats, discriminated unions pour les events)
- L'equipe comprend le code en 5 minutes
- Le service generique fait ~100 lignes, testable a 100%
- Les effets sont decouples (voir section 4.2)

**Inconvenients** :
- Pas de visualisation automatique (mais les diagrammes ASCII de cette ADR suffisent)
- Pas de parallel states ou history states (on n'en a pas besoin)
- Responsabilite de l'equipe de maintenir la coherence table ↔ code

#### Option C : Transitions codees dans les services NestJS (if/switch)

**Description** : Chaque service (`ReservationService`, `ClaimService`) contient la logique de transition dans des methodes avec des if/switch.

**Avantages** :
- Simplicite brute : pas d'abstraction
- Code lineaire facile a debugger

**Inconvenients** :
- Duplication du code de validation (chaque methode re-verifie l'etat courant)
- Pas de vision globale des transitions (il faut lire tout le service pour comprendre le cycle de vie)
- Risque eleve de transition invalide oubliee (rien n'empeche d'ajouter un `if (status === 'NO_SHOW') { status = 'CONFIRMED' }`)
- Testabilite degradee : il faut tester chaque methode avec chaque etat source possible
- La dette technique s'accumule vite quand on ajoute des etats ou des transitions

### 4.2 Decision : Option B -- Transition table maison

**Justification** :

1. **C'est le bon niveau de formalisme pour 2-5 devs.** XState est un outil puissant mais surdimensionne pour notre cas. Nos machines ont 5-7 etats et 8-10 transitions. Une table de configuration fait le travail.
2. **Zero dependance = zero dette.** Pas de risque de breaking change sur une mise a jour de lib, pas de probleme de compatibilite avec NestJS, pas de size bundle inutile.
3. **La table EST la documentation.** Un nouveau dev ouvre `reservation.transitions.ts`, lit la table, et comprend le cycle de vie en 30 secondes.
4. **TypeScript couvre la type-safety.** Les enums d'etats et d'evenements sont verifies au compile-time. Une transition non declaree dans la table leve une erreur explicite au runtime.
5. **Les effets sont decouples naturellement** (voir section suivante).

---

## 5. Architecture d'implementation

### 5.1 Structure des fichiers

```
backend/
  src/
    shared/
      state-machine/
        state-machine.service.ts      # Service generique StateMachine<S, E>
        state-machine.types.ts        # Types generiques
        state-machine.spec.ts         # Tests unitaires du moteur

    modules/
      reservations/
        reservation.states.ts         # Enum ReservationStatus + Event
        reservation.transitions.ts    # Table de transitions
        reservation.guards.ts         # Fonctions de garde
        reservation.effects.ts        # Handlers d'effets (delegation)
        reservation.service.ts        # Service NestJS

      claims/
        claim.states.ts
        claim.transitions.ts
        claim.guards.ts
        claim.effects.ts
        claim.service.ts

      baskets/
        basket.states.ts
        basket.transitions.ts
        basket.guards.ts
        basket.effects.ts
        basket.service.ts

      partners/
        partner.states.ts
        partner.transitions.ts
        partner.guards.ts
        partner.effects.ts
        partner.service.ts
```

### 5.2 Types generiques

```typescript
// shared/state-machine/state-machine.types.ts

/**
 * Contexte passe a chaque garde et effet.
 * Contient l'entite, l'acteur et les metadonnees de la transition.
 */
export interface TransitionContext<TEntity> {
  entity: TEntity;
  actorId: string;        // UUID de l'utilisateur ou 'SYSTEM' pour les timers
  actorRole: 'consumer' | 'partner' | 'admin' | 'system';
  metadata?: Record<string, unknown>;  // donnees additionnelles (motif annulation, montant, etc.)
  timestamp: Date;
  // Pour les entites Reservation : le type de moyen de paiement conditionne
  // les effets financiers (ADR-005 decision B1, ADR-007 flux 1/2/3).
  // Disponible via entity.paymentMethodType pour les gardes et effets.
}

/**
 * Definition d'une transition dans la table.
 */
export interface TransitionDef<TState, TEvent, TEntity> {
  target: TState;
  guards?: Array<(ctx: TransitionContext<TEntity>) => boolean | Promise<boolean>>;
  effects?: Array<(ctx: TransitionContext<TEntity>) => Promise<void>>;
  description: string;   // documentation inline
}

/**
 * Table de transitions : map de {etat_source, event} → definition.
 */
export type TransitionTable<TState extends string, TEvent extends string, TEntity> = {
  [S in TState]?: {
    [E in TEvent]?: TransitionDef<TState, TEvent, TEntity>;
  };
};
```

### 5.3 Service generique StateMachine

```typescript
// shared/state-machine/state-machine.service.ts

import { TransitionTable, TransitionContext } from './state-machine.types';

export class StateMachineError extends Error {
  constructor(
    public readonly currentState: string,
    public readonly event: string,
    message: string,
  ) {
    super(message);
    this.name = 'StateMachineError';
  }
}

export class StateMachine<
  TState extends string,
  TEvent extends string,
  TEntity extends { status: TState },
> {
  constructor(
    private readonly table: TransitionTable<TState, TEvent, TEntity>,
    private readonly entityName: string,
  ) {}

  /**
   * Tente une transition. Retourne le nouvel etat si reussie.
   * Lance StateMachineError si la transition est invalide ou une garde echoue.
   */
  async transition(
    currentState: TState,
    event: TEvent,
    ctx: TransitionContext<TEntity>,
  ): Promise<TState> {
    // 1. Verifier que la transition existe
    const stateTransitions = this.table[currentState];
    if (!stateTransitions) {
      throw new StateMachineError(
        currentState,
        event,
        `${this.entityName}: aucune transition definie depuis l'etat '${currentState}'`,
      );
    }

    const def = stateTransitions[event];
    if (!def) {
      throw new StateMachineError(
        currentState,
        event,
        `${this.entityName}: transition '${event}' interdite depuis l'etat '${currentState}'`,
      );
    }

    // 2. Evaluer les gardes
    if (def.guards) {
      for (const guard of def.guards) {
        const allowed = await guard(ctx);
        if (!allowed) {
          throw new StateMachineError(
            currentState,
            event,
            `${this.entityName}: garde echouee pour '${currentState}' + '${event}' (${def.description})`,
          );
        }
      }
    }

    // 3. Executer les effets de bord
    // NOTE : les effets sont executes APRES la validation mais AVANT le commit.
    // Le service appelant wrappe le tout dans une transaction DB.
    if (def.effects) {
      for (const effect of def.effects) {
        await effect(ctx);
      }
    }

    return def.target;
  }

  /**
   * Retourne les evenements possibles depuis un etat donne.
   * Utile pour l'UI (afficher/masquer les boutons d'action).
   */
  availableEvents(currentState: TState): TEvent[] {
    const stateTransitions = this.table[currentState];
    if (!stateTransitions) return [];
    return Object.keys(stateTransitions) as TEvent[];
  }
}
```

### 5.4 Exemple concret : Reservation

```typescript
// modules/reservations/reservation.states.ts

export enum ReservationStatus {
  PENDING_PAYMENT = 'pending_payment',
  CONFIRMED = 'confirmed',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  PICKED_UP_PENDING_SYNC = 'picked_up_pending_sync', // validation offline (ADR-012)
  NO_SHOW = 'no_show',
  CANCELLED_CONSUMER = 'cancelled_consumer',
  CANCELLED_PARTNER = 'cancelled_partner',
  EXPIRED = 'expired',
}

export enum ReservationEvent {
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  HOLD_TIMEOUT = 'hold_timeout',
  CONSUMER_CANCEL = 'consumer_cancel',
  PARTNER_CANCEL = 'partner_cancel',
  PICKUP_WINDOW_START = 'pickup_window_start',
  PICKUP_VALIDATED = 'pickup_validated',
  PICKUP_VALIDATED_OFFLINE = 'pickup_validated_offline',   // ADR-012
  OFFLINE_SYNC_SUCCESS = 'offline_sync_success',           // ADR-012
  OFFLINE_SYNC_CONFLICT = 'offline_sync_conflict',         // ADR-012
  NO_SHOW_TIMEOUT = 'no_show_timeout',
}

/**
 * Type de moyen de paiement. Conditionne les effets de bord financiers
 * des transitions R1, R3, R4, R5, R6 (voir ADR-005 decision B1).
 */
export type PaymentMethodType = 'card' | 'mobile_money';
```

```typescript
// modules/reservations/reservation.transitions.ts

import { TransitionTable } from '../../shared/state-machine/state-machine.types';
import { ReservationStatus as S, ReservationEvent as E } from './reservation.states';
import { Reservation } from './reservation.entity';
import * as guards from './reservation.guards';
import * as effects from './reservation.effects';

export const reservationTransitions: TransitionTable<S, E, Reservation> = {
  [S.PENDING_PAYMENT]: {
    [E.PAYMENT_SUCCESS]: {
      target: S.CONFIRMED,
      guards: [guards.paymentIsValid],
      effects: [
        effects.writeLedgerEntryByPaymentType, // carte: aucune ecriture ; mobile money: GATEWAY→CONSUMER_HOLDING
        effects.storePaymentMethodType,        // persiste 'card' | 'mobile_money' sur la reservation
        effects.generateQrAndPin,
        effects.sendConfirmationNotification,
        effects.schedulePickupReminder,
        effects.cancelHoldExpirationJob,       // le paiement est arrive a temps
      ],
      description: 'PA/DB reussi → reservation confirmee. Ledger conditionne par payment_method_type.',
    },
    [E.PAYMENT_FAILED]: {
      target: S.EXPIRED,
      effects: [
        effects.restoreStock,
        effects.cancelHoldExpirationJob,
        effects.notifyPaymentFailed,
      ],
      description: 'Echec paiement explicite → stock restaure',
    },
    [E.HOLD_TIMEOUT]: {
      target: S.EXPIRED,
      guards: [guards.holdHasExpired],
      effects: [
        effects.restoreStock,                  // ADR-008: +quantity atomique
        effects.reverseOrRefundByPaymentType,  // carte: RV (gratuit) ; mobile money: RF (3-10j)
        effects.writeLedgerHoldExpiry,          // mobile money: CONSUMER_HOLDING→GATEWAY ; carte: rien
        effects.cancelScheduledJobs,
        effects.checkBasketSoldOutRecovery,
      ],
      description: 'Timeout 5 min (ADR-008) → stock restaure, PA/DB annulee selon payment_method_type',
    },
  },

  [S.CONFIRMED]: {
    [E.CONSUMER_CANCEL]: {
      target: S.CANCELLED_CONSUMER,
      guards: [guards.pickupWindowNotStarted],
      effects: [
        effects.restoreStock,
        effects.reverseOrRefundByPaymentType,  // carte: RV ; mobile money: RF + ledger CONSUMER_HOLDING→GATEWAY
        effects.writeLedgerCancelByPaymentType, // carte: rien ; mobile money: CONSUMER_HOLDING→GATEWAY
        effects.sendCancellationNotification,   // message adapte selon payment_method_type
        effects.cancelScheduledJobs,
        effects.checkBasketSoldOutRecovery,
        effects.incrementCancelFraudCounter,    // ADR-019 regle C5
      ],
      description: 'Annulation conso avant debut creneau → reversal/remboursement selon payment_method_type',
    },
    [E.PARTNER_CANCEL]: {
      target: S.CANCELLED_PARTNER,
      effects: [
        effects.restoreStock,
        effects.reverseOrRefundByPaymentType,
        effects.writeLedgerCancelByPaymentType,
        effects.sendPartnerCancelNotification,
        effects.cancelScheduledJobs,
        effects.logPartnerCancellationReason,
        effects.checkBasketSoldOutRecovery,
      ],
      description: 'Annulation partenaire → reversal/remboursement auto selon payment_method_type',
    },
    [E.PICKUP_WINDOW_START]: {
      target: S.READY,
      effects: [
        effects.captureByPaymentType,          // carte: CP Peach ; mobile money: transfert comptable
        effects.writeLedgerCapture,            // carte: GATEWAY→PLATFORM_REVENUE+PARTNER_PAYABLE
                                               // mobile money: CONSUMER_HOLDING→PLATFORM_REVENUE+PARTNER_PAYABLE
        effects.scheduleNoShowTimer,
      ],
      description: 'Debut creneau retrait → capture/transfert comptable selon payment_method_type',
    },
  },

  [S.READY]: {
    [E.PICKUP_VALIDATED]: {
      target: S.PICKED_UP,
      guards: [guards.qrOrPinIsValid],
      effects: [
        effects.recordPickupTimestamp,
        effects.sendPickupConfirmation,
        effects.scheduleClaimWindow,
        effects.scheduleReviewEditWindow,
        effects.cancelNoShowTimer,
      ],
      description: 'Scan QR ou saisie PIN (en ligne) → retrait valide',
    },
    [E.PICKUP_VALIDATED_OFFLINE]: {
      target: S.PICKED_UP_PENDING_SYNC,
      guards: [guards.qrOrPinIsValidLocal],   // validation locale, donnees pre-chargees (ADR-012)
      effects: [
        effects.recordPickupTimestampLocal,    // enregistre localement dans Drift
        effects.enqueueOfflineAction,          // OfflineActionQueue (ADR-012 section 6.2)
      ],
      description: 'Scan QR/PIN offline → retrait valide localement, en attente de sync (ADR-012)',
    },
    [E.NO_SHOW_TIMEOUT]: {
      target: S.NO_SHOW,
      guards: [guards.pickupWindowEnded, guards.notAlreadyPickedUp, guards.notPendingOfflineSync],
      effects: [
        effects.recordNoShowTimestamp,
        effects.sendNoShowNotification,
        effects.sendPartnerNoShowSummary,
        effects.incrementNoShowFraudCounter,   // ADR-019 regle C1 : ZADD fraud:noshow:{consumerId}
        effects.enqueueFraudCheck,             // BullMQ job 'fraud-check' (ADR-019 section 5.2)
      ],
      description: 'Fin creneau + 5 min sans retrait → paiement maintenu, fraude evaluee',
    },
  },

  [S.PICKED_UP_PENDING_SYNC]: {
    [E.OFFLINE_SYNC_SUCCESS]: {
      target: S.PICKED_UP,
      effects: [
        effects.recordPickupTimestamp,         // timestamp serveur = timestamp offline transmis
        effects.sendPickupConfirmation,
        effects.scheduleClaimWindow,
        effects.scheduleReviewEditWindow,
        effects.cancelNoShowTimer,
        effects.markOfflineActionSynced,       // OfflineActionQueue status → 'synced'
      ],
      description: 'Sync offline reussie → retrait confirme cote serveur',
    },
    [E.OFFLINE_SYNC_CONFLICT]: {
      target: S.PICKED_UP,
      effects: [
        effects.resolveOfflineConflict,        // annule no-show/annulation si applicable (ADR-012 section 6.4)
        effects.recordPickupTimestamp,
        effects.notifyAdminOfflineConflict,     // alerte admin pour verification manuelle
        effects.markOfflineActionConflictResolved,
        effects.writeAuditLogConflict,
      ],
      description: 'Conflit sync offline → le retrait physique prime (ADR-012 section 6.4)',
    },
  },

  // Etats terminaux : pas de transitions sortantes
  [S.PICKED_UP]: {},
  [S.NO_SHOW]: {},
  [S.CANCELLED_CONSUMER]: {},
  [S.CANCELLED_PARTNER]: {},
  [S.EXPIRED]: {},
};
```

### 5.5 Exemple de gardes

```typescript
// modules/reservations/reservation.guards.ts

import { TransitionContext } from '../../shared/state-machine/state-machine.types';
import { Reservation } from './reservation.entity';

/**
 * Verifie que le creneau de retrait n'a pas encore commence.
 * Garde pour l'annulation consommateur (US-C027).
 */
export function pickupWindowNotStarted(ctx: TransitionContext<Reservation>): boolean {
  const basket = ctx.entity.basket;
  return ctx.timestamp < basket.pickupStart;
}

/**
 * Verifie que le hold de 5 min a bien expire.
 */
export function holdHasExpired(ctx: TransitionContext<Reservation>): boolean {
  return ctx.entity.expiresAt !== null && ctx.timestamp >= ctx.entity.expiresAt;
}

/**
 * Verifie que la fenetre de retrait est terminee + delai de grace.
 */
export function pickupWindowEnded(ctx: TransitionContext<Reservation>): boolean {
  const basket = ctx.entity.basket;
  const graceMs = 5 * 60 * 1000; // 5 minutes
  return ctx.timestamp >= new Date(basket.pickupEnd.getTime() + graceMs);
}

/**
 * Verifie que le retrait n'a pas deja ete valide.
 * Protege contre un race condition timer vs scan.
 */
export function notAlreadyPickedUp(ctx: TransitionContext<Reservation>): boolean {
  return ctx.entity.pickedUpAt === null;
}

/**
 * Verifie la validite du QR code ou PIN.
 */
export function qrOrPinIsValid(ctx: TransitionContext<Reservation>): boolean {
  const { qrCode, pinCode } = ctx.metadata as { qrCode?: string; pinCode?: string };
  if (qrCode) return ctx.entity.qrCode === qrCode;
  if (pinCode) return ctx.entity.pinCode === pinCode;
  return false;
}

/**
 * Verifie que le paiement a ete confirme par le PSP (Peach Payments).
 * Couvre les deux cas : PA reussie (carte) et DB reussi (mobile money).
 */
export function paymentIsValid(ctx: TransitionContext<Reservation>): boolean {
  const { paymentConfirmed } = ctx.metadata as { paymentConfirmed: boolean };
  return paymentConfirmed === true;
}

/**
 * Verifie qu'aucune validation offline n'est en cours pour cette reservation.
 * Protege contre le cas ou le partenaire a valide offline mais le sync n'est
 * pas encore arrive -- le timer no-show ne doit pas declencher.
 * Le serveur ne peut pas connaitre directement l'etat du terminal partenaire,
 * mais si le statut est PICKED_UP_PENDING_SYNC (apres un sync partiel ou
 * un etat hybride), le no-show est bloque.
 */
export function notPendingOfflineSync(ctx: TransitionContext<Reservation>): boolean {
  // Si le statut a ete mis a jour vers PICKED_UP_PENDING_SYNC par un sync partiel,
  // cette garde bloque le no-show. En pratique, cote serveur, le statut reste READY
  // tant que le sync n'est pas arrive, donc cette garde sert de filet de securite
  // pour le CRON de rattrapage.
  return ctx.entity.status !== 'picked_up_pending_sync';
}

/**
 * Validation locale du QR/PIN pour le mode offline (ADR-012 section 6).
 * Utilise les donnees pre-chargees dans le cache Drift du terminal partenaire.
 */
export function qrOrPinIsValidLocal(ctx: TransitionContext<Reservation>): boolean {
  const { qrCode, pinCode, localReservationCache } = ctx.metadata as {
    qrCode?: string;
    pinCode?: string;
    localReservationCache: { expectedQrPayload: string; expectedPin: string; status: string };
  };
  // Verification contre le cache local (pre-charge via prefetchTodayReservations)
  if (!localReservationCache) return false;
  if (localReservationCache.status !== 'reserved' && localReservationCache.status !== 'ready') return false;
  if (qrCode) return localReservationCache.expectedQrPayload === qrCode;
  if (pinCode) return localReservationCache.expectedPin === pinCode;
  return false;
}
```

### 5.6 Utilisation dans le service NestJS

```typescript
// modules/reservations/reservation.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { StateMachine } from '../../shared/state-machine/state-machine.service';
import { ReservationStatus, ReservationEvent } from './reservation.states';
import { reservationTransitions } from './reservation.transitions';
import { Reservation } from './reservation.entity';

@Injectable()
export class ReservationService {
  private readonly sm = new StateMachine<
    ReservationStatus,
    ReservationEvent,
    Reservation
  >(reservationTransitions, 'Reservation');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Annulation par le consommateur (US-C027).
   */
  async cancelByConsumer(reservationId: string, consumerId: string): Promise<Reservation> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Verrouiller la reservation (SELECT FOR UPDATE)
      const reservation = await tx.reservation.findUniqueOrThrow({
        where: { id: reservationId },
        include: { basket: true },
      });

      // 2. Verifier que le consommateur est bien le proprietaire
      if (reservation.consumerId !== consumerId) {
        throw new Error('Acces non autorise');
      }

      // 3. Tenter la transition
      const newStatus = await this.sm.transition(
        reservation.status as ReservationStatus,
        ReservationEvent.CONSUMER_CANCEL,
        {
          entity: reservation as Reservation,
          actorId: consumerId,
          actorRole: 'consumer',
          timestamp: new Date(),
        },
      );

      // 4. Persister le nouvel etat
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: newStatus,
          cancelledAt: new Date(),
        },
      });

      // 5. Ecrire dans l'historique des transitions
      await tx.reservationStatusHistory.create({
        data: {
          reservationId,
          fromStatus: reservation.status,
          toStatus: newStatus,
          event: ReservationEvent.CONSUMER_CANCEL,
          actorId: consumerId,
          actorRole: 'consumer',
        },
      });

      return updated as Reservation;
    });
  }

  /**
   * Retourne les actions possibles pour une reservation donnee.
   * Utilise par l'API pour activer/desactiver les boutons dans l'UI.
   */
  getAvailableActions(reservation: Reservation): ReservationEvent[] {
    return this.sm.availableEvents(reservation.status as ReservationStatus);
  }
}
```

---

## 6. Effets de bord : strategie de decouplage

### 6.1 Analyse

Les effets de bord se repartissent en deux categories :

| Categorie | Exemples | Exigence de coherence |
|-----------|----------|----------------------|
| **Synchrones / transactionnels** | Stock, ledger, update etat | **ACID** -- doivent reussir ou rollback avec la transition |
| **Asynchrones / eventuels** | Notifications push, emails, jobs planifies | **Eventually consistent** -- peuvent echouer et etre retries |

### 6.2 Decision : effets synchrones dans la transaction, effets asynchrones via EventEmitter + BullMQ

```
┌─────────────────────────────────────────────────────────────┐
│  Transaction PostgreSQL (Prisma $transaction)               │
│                                                             │
│  1. SELECT FOR UPDATE (verrou reservation)                  │
│  2. StateMachine.transition() → valide + execute gardes     │
│  3. Effets synchrones :                                     │
│     - UPDATE stock (ADR-008)                                │
│     - INSERT ledger_entries (ADR-007)                       │
│     - UPDATE reservation.status + timestamps                │
│     - INSERT reservation_status_history                     │
│  4. COMMIT                                                  │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ apres commit reussi
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  NestJS EventEmitter (in-process)                           │
│                                                             │
│  emit('reservation.status_changed', {                       │
│    reservationId, fromStatus, toStatus, event, actorId,     │
│    timestamp, metadata                                      │
│  })                                                         │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ listeners
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Handlers asynchrones                                       │
│                                                             │
│  NotificationHandler:                                       │
│    → enqueue BullMQ job 'send-push' (ADR-014)              │
│    → enqueue BullMQ job 'send-email' (ADR-014)             │
│                                                             │
│  SchedulerHandler:                                          │
│    → enqueue BullMQ delayed job 'pickup-reminder' (1h)     │
│    → enqueue BullMQ delayed job 'no-show-check' (X min)    │
│    → cancel BullMQ job si annulation                        │
│                                                             │
│  FraudHandler (ADR-019):                                    │
│    → enqueue BullMQ job 'fraud-check' avec :               │
│      { eventType: 'NO_SHOW' | 'CANCEL' | 'CLAIM_OPENED' | │
│        'REFUND', actorType, actorId, reservationId }       │
│    → le FraudCheckWorker (ADR-019 section 5.2) :           │
│      1. ZADD Redis sorted set (compteur temps reel)        │
│      2. Evalue regles a seuil absolu (auto_suspend)        │
│      3. Si declenche : cree fraud_alert + suspension auto  │
│                                                             │
│  OfflineSyncHandler (ADR-012 section 6):                   │
│    → si l'evenement est OFFLINE_SYNC_SUCCESS ou            │
│      OFFLINE_SYNC_CONFLICT :                               │
│      resout le conflit eventuel (no-show vs pickup offline) │
│      notifie l'admin si conflit                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Justification** :

1. **Les operations financieres (stock, ledger) sont transactionnelles.** Si la capture du paiement echoue, la transition ne doit pas avoir lieu. Tout est dans la meme transaction PostgreSQL.
2. **Les notifications et jobs sont asynchrones.** Si l'envoi d'un push echoue, la reservation est quand meme confirmee. BullMQ gere les retries automatiquement.
3. **L'EventEmitter NestJS est un mecanisme de decouplage in-process.** Il evite que le service `ReservationService` connaisse les details de `NotificationService` ou `SchedulerService`. Quand on extrait le module notifications en worker dedie (ADR-002 Phase 2), on remplace l'EventEmitter par un message sur Redis sans toucher au code metier.

### 6.3 Repartition des effets par transition

| Transition | Effets synchrones (dans la transaction) | Effets asynchrones (via event/BullMQ) |
|------------|----------------------------------------|--------------------------------------|
| R1 `PENDING → CONFIRMED` | **Carte** : aucune ecriture ledger. **Mobile money** : Debit `GATEWAY` / Credit `CONSUMER_HOLDING` Rs X (ADR-007). QR/PIN generation, stockage `payment_method_type`. | Push + email confirmation, job rappel 1h, annulation job expire-hold |
| R2 `PENDING → EXPIRED` (echec) | Stock +qty (ADR-008), enregistrement `expired_at` | Notification erreur ecran (US-C036), annulation job expire-hold |
| R3 `PENDING → EXPIRED` (timeout 5 min, ADR-008) | Stock +qty. **Carte** : aucune ecriture ledger. **Mobile money** : Debit `CONSUMER_HOLDING` / Credit `GATEWAY` (liberation holding). | **Carte** : RV (reversal PA, gratuit). **Mobile money** : RF (remboursement 3-10j, creation `refunds`). Annulation jobs. Check basket recovery. |
| R4 `CONFIRMED → CANCELLED_CONSUMER` | Stock +qty. **Carte** : aucune ecriture ledger (PA annulee). **Mobile money** : Debit `CONSUMER_HOLDING` / Credit `GATEWAY`. | **Carte** : RV. **Mobile money** : RF (3-10j). Push + email (message adapte). Annulation jobs. Check basket recovery. Fraud counter `cancel`. |
| R5 `CONFIRMED → CANCELLED_PARTNER` | Stock +qty. Meme logique ledger que R4 selon `payment_method_type`. | **Carte** : RV. **Mobile money** : RF. Push + email. Annulation jobs. Audit log + motif. |
| R6 `CONFIRMED → READY` | **Carte** : CP Peach + Debit `GATEWAY` / Credit `PLATFORM_REVENUE` + `PARTNER_PAYABLE:<uuid>`. **Mobile money** : Debit `CONSUMER_HOLDING` / Credit `PLATFORM_REVENUE` + `PARTNER_PAYABLE:<uuid>`. Calcul commission (ADR-007). | Job no-show timer (`basket.pickup_end + 5 min`) |
| R7 `READY → PICKED_UP` | Timestamp `picked_up_at`, `pickup_method` | Push confirmation, job claim window 24h, job review window 24h, annulation job no-show |
| R7b `READY → PICKED_UP_PENDING_SYNC` | *(Cote terminal partenaire uniquement)* : timestamp local, insertion `OfflineActionQueue` | *(Aucun effet serveur -- le serveur n'est pas joignable)* |
| R7c `PENDING_SYNC → PICKED_UP` | Timestamp serveur, memes ecritures que R7 | Push confirmation, job claim/review, annulation job no-show, `OfflineActionQueue` → `synced` |
| R7d `PENDING_SYNC → PICKED_UP` (conflit) | Resolution conflit, timestamp, audit log | Push admin (alerte conflit), `OfflineActionQueue` → `conflict_resolved` |
| R8 `READY → NO_SHOW` | Timestamp `no_show_at` | Push + email no-show (consommateur + synthese partenaire). BullMQ `fraud-check` : ZADD `fraud:noshow:{id}` + evaluation regles ADR-019. |
| R9 `PICKED_UP` → claim | *(Pas de changement d'etat reservation)* | Creation entite `Claim` OPEN. BullMQ `fraud-check` : ZADD `fraud:claim:{id}`. |

---

## 7. Validation des transitions

### 7.1 Couches de protection

Trois couches de defense en profondeur pour empecher les transitions invalides :

```
┌───────────────────────────────────────────────────┐
│  Couche 1 : Applicative (StateMachine service)    │
│  → Table de transitions + gardes                  │
│  → Leve StateMachineError si transition invalide  │
│  → PREMIERE LIGNE DE DEFENSE                      │
├───────────────────────────────────────────────────┤
│  Couche 2 : Base de donnees (CHECK constraint)    │
│  → Contrainte sur les valeurs d'enum              │
│  → FILET DE SECURITE si un bug bypass la couche 1 │
├───────────────────────────────────────────────────┤
│  Couche 3 : Historique des transitions            │
│  → Table reservation_status_history               │
│  → AUDIT + DETECTION post-hoc                     │
└───────────────────────────────────────────────────┘
```

### 7.2 Contrainte en base (CHECK)

```sql
-- Contrainte sur les valeurs d'enum de reservation
ALTER TABLE reservations
ADD CONSTRAINT chk_reservation_status
CHECK (status IN (
  'pending_payment', 'confirmed', 'ready', 'picked_up',
  'picked_up_pending_sync',  -- validation offline (ADR-012)
  'no_show', 'cancelled_consumer', 'cancelled_partner', 'expired'
));

-- Contrainte sur les valeurs d'enum de claim
ALTER TABLE claims
ADD CONSTRAINT chk_claim_status
CHECK (status IN ('open', 'in_review', 'resolved', 'rejected'));

-- Contrainte sur les valeurs d'enum de basket
ALTER TABLE baskets
ADD CONSTRAINT chk_basket_status
CHECK (status IN (
  'draft', 'published', 'sold_out', 'pickup_window',
  'ended', 'cancelled', 'archived'
));

-- Contrainte sur les valeurs d'enum de partner
ALTER TABLE partners
ADD CONSTRAINT chk_partner_status
CHECK (status IN ('pending', 'active', 'suspended', 'rejected', 'banned'));
```

**Note** : Prisma gere les enums via le schema Prisma. Ces CHECK constraints sont un filet de securite supplementaire, pas le mecanisme principal. On ne met PAS de trigger de validation des transitions en base -- la logique metier reste dans l'applicatif pour etre testable et lisible.

### 7.3 Contrainte sur les timestamps de coherence

```sql
-- Un no_show ne peut pas avoir un picked_up_at
ALTER TABLE reservations
ADD CONSTRAINT chk_no_show_not_picked_up
CHECK (NOT (status = 'no_show' AND picked_up_at IS NOT NULL));

-- Un picked_up doit avoir un confirmed_at et un picked_up_at
ALTER TABLE reservations
ADD CONSTRAINT chk_picked_up_has_timestamps
CHECK (NOT (status = 'picked_up' AND (confirmed_at IS NULL OR picked_up_at IS NULL)));

-- Un cancelled doit avoir un cancelled_at
ALTER TABLE reservations
ADD CONSTRAINT chk_cancelled_has_timestamp
CHECK (NOT (
  status IN ('cancelled_consumer', 'cancelled_partner')
  AND cancelled_at IS NULL
));
```

---

## 8. Horodatage des transitions

### 8.1 Decision : les deux approches (timestamps denormalises + table d'historique)

**Champs denormalises sur la table `reservations`** (deja dans ADR-003) :

```sql
confirmed_at     TIMESTAMPTZ  -- quand le paiement a ete confirme
ready_at         TIMESTAMPTZ  -- quand le creneau a commence (capture paiement)
picked_up_at     TIMESTAMPTZ  -- quand le retrait a ete valide
cancelled_at     TIMESTAMPTZ  -- quand l'annulation a ete effectuee
no_show_at       TIMESTAMPTZ  -- quand le no-show a ete declare
expired_at       TIMESTAMPTZ  -- quand le hold a expire
```

**Pourquoi les garder** : requetes rapides sans jointure. "Quelle est la date de retrait ?" → `reservation.picked_up_at`. Pas besoin de scanner une table d'historique.

**Table `reservation_status_history`** (nouvelle) :

```sql
CREATE TABLE reservation_status_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  from_status   VARCHAR(30) NOT NULL,
  to_status     VARCHAR(30) NOT NULL,
  event         VARCHAR(50) NOT NULL,
  actor_id      UUID,                    -- NULL si acteur = SYSTEM (timer)
  actor_role    VARCHAR(20) NOT NULL,     -- 'consumer', 'partner', 'admin', 'system'
  metadata      JSONB DEFAULT '{}',       -- motif annulation, montant, etc.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rsh_reservation ON reservation_status_history (reservation_id, created_at);
```

**Pourquoi la garder** : audit trail complet. "Qui a annule cette reservation, quand, et pourquoi ?" → query sur l'historique. Indispensable pour le support client, la detection fraude, et les litiges.

**Meme pattern pour les claims** :

```sql
CREATE TABLE claim_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id    UUID NOT NULL REFERENCES claims(id),
  from_status VARCHAR(20) NOT NULL,
  to_status   VARCHAR(20) NOT NULL,
  event       VARCHAR(50) NOT NULL,
  actor_id    UUID,
  actor_role  VARCHAR(20) NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_csh_claim ON claim_status_history (claim_id, created_at);
```

**Pour les paniers et partenaires** : pas de table d'historique dediee. L'`audit_logs` generique (ADR-003) suffit car ces entites ont moins de transitions et les besoins d'analyse sont moindres.

---

## 9. Strategie des timers

### 9.1 Inventaire des timers

| Timer | Duree | Declencheur | Action a l'expiration | Criticite | BullMQ Job |
|-------|-------|-------------|----------------------|-----------|------------|
| Hold de reservation | **5 min** (configurable via `app_settings.hold_duration_seconds`, defaut 300s, conforme ADR-008 section hold temporaire) | Creation reservation (`PENDING_PAYMENT`) | Transition `HOLD_TIMEOUT` → `EXPIRED`. Effets : stock +qty, **carte** : RV (gratuit) / **mobile money** : RF (3-10j) + ledger `CONSUMER_HOLDING` → `GATEWAY`. | **CRITIQUE** (stock bloque + argent potentiellement en jeu pour le mobile money) | `reservation:expire-hold` |
| Rappel avant retrait | 1h avant `basket.pickup_start` | Reservation confirmee (`CONFIRMED`) | Notification push + email rappel (ADR-014) | Moyenne | `notification:pickup-reminder` |
| Capture paiement | `basket.pickup_start` | Panier atteint `pickup_start` | Transition `PICKUP_WINDOW_START` → `READY`. Effets : **carte** : CP Peach + ledger `GATEWAY` → `PLATFORM_REVENUE` + `PARTNER_PAYABLE`. **Mobile money** : transfert comptable `CONSUMER_HOLDING` → `PLATFORM_REVENUE` + `PARTNER_PAYABLE`. | **CRITIQUE** (paiement + ledger) | `basket:capture-payments` |
| No-show detection | `basket.pickup_end + 5 min` | Panier atteint fin de creneau | Transition `NO_SHOW_TIMEOUT` → `NO_SHOW` (avec garde `notPendingOfflineSync`). Paiement maintenu. Fraud counter incremente (ADR-019). | **CRITIQUE** (statut final + fraude) | `basket:detect-no-shows` |
| Fenetre reclamation | 24h apres `picked_up_at` | Retrait valide (`PICKED_UP`) | Desactivation bouton "Reclamer" (US-C047) | Faible (UI only, lazy check) | *(pas de job -- verification a la demande)* |
| Fenetre edition avis | 24h apres `picked_up_at` | Retrait valide (`PICKED_UP`) | Note figee (US-C045) | Faible (UI only, lazy check) | *(pas de job -- verification a la demande)* |
| Sync offline timeout | 30 min apres validation offline | Validation offline (`PICKED_UP_PENDING_SYNC` localement) | Si le sync n'a pas abouti apres 30 min, notification partenaire "Actions en attente de synchronisation" (ADR-012 section 6) | Moyenne | *(gere localement par le SyncWorker Flutter, pas BullMQ serveur)* |
| Levee auto-suspension fraude | 168h (7 jours) apres suspension | Suspension automatique par ADR-019 | Levee de la suspension, reactivation du compte consommateur (ADR-019 section 5.3) | Haute | `fraud-auto-lift` |

### 9.2 Decision : BullMQ delayed jobs pour les timers critiques, verification a la demande pour les timers non critiques

```
┌─────────────────────────────────────────────────────────────┐
│                   Timers critiques                           │
│                   → BullMQ delayed jobs                      │
│                                                             │
│  1. Hold 5 min         → job 'reservation:expire-hold'      │
│  2. Capture paiement   → job 'basket:capture-payments'      │
│  3. No-show detection  → job 'basket:detect-no-shows'       │
│  4. Rappel retrait     → job 'notification:pickup-reminder' │
│                                                             │
│  Tous avec : retry 3x, backoff exponentiel, dead-letter     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Timers non critiques                       │
│                   → Verification a la demande (lazy check)   │
│                                                             │
│  5. Fenetre reclamation 24h                                 │
│     → Quand le consommateur ouvre l'ecran "Reclamer" :      │
│       IF NOW() > picked_up_at + 24h THEN desactiver bouton  │
│     → Pas de job, pas de timer, juste un check en temps reel│
│                                                             │
│  6. Fenetre edition avis 24h                                │
│     → Quand le consommateur tente de modifier sa note :     │
│       IF NOW() > picked_up_at + 24h THEN refuser            │
│     → Meme approche : check a la demande                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 Implementation BullMQ

```typescript
// modules/reservations/reservation-jobs.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ReservationService } from './reservation.service';

@Processor('reservation')
export class ReservationJobProcessor extends WorkerHost {
  constructor(private readonly reservationService: ReservationService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'expire-hold':
        await this.reservationService.expireHold(job.data.reservationId);
        break;

      case 'detect-no-show':
        await this.reservationService.detectNoShow(job.data.reservationId);
        break;

      default:
        throw new Error(`Job inconnu: ${job.name}`);
    }
  }
}
```

```typescript
// modules/reservations/reservation.service.ts (extrait)

/**
 * Planifie le job d'expiration du hold.
 * Appele apres la creation d'une reservation en PENDING_PAYMENT.
 */
async scheduleHoldExpiration(reservationId: string, expiresAt: Date): Promise<void> {
  const delay = expiresAt.getTime() - Date.now();
  await this.reservationQueue.add(
    'expire-hold',
    { reservationId },
    {
      delay: Math.max(delay, 0),
      jobId: `expire-hold:${reservationId}`,  // idempotent
      removeOnComplete: true,
      removeOnFail: 5,                          // garder 5 echecs pour debug
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  );
}

/**
 * Annule le job d'expiration (si le paiement reussit avant le timeout).
 */
async cancelHoldExpiration(reservationId: string): Promise<void> {
  const job = await this.reservationQueue.getJob(`expire-hold:${reservationId}`);
  if (job) await job.remove();
}

/**
 * Traite l'expiration d'un hold. Appele par le worker BullMQ.
 */
async expireHold(reservationId: string): Promise<void> {
  // La transaction + SELECT FOR UPDATE protege contre le cas ou
  // le paiement reussit entre le declenchement du job et son execution.
  try {
    await this.transitionReservation(
      reservationId,
      ReservationEvent.HOLD_TIMEOUT,
      { actorId: 'SYSTEM', actorRole: 'system' },
    );
  } catch (error) {
    if (error instanceof StateMachineError) {
      // La reservation n'est plus en PENDING_PAYMENT (paiement reussi entretemps)
      // → rien a faire, transition ignoree silencieusement
      return;
    }
    throw error;
  }
}
```

### 9.4 CRON de rattrapage (safety net)

En plus des delayed jobs, un job CRON tourne toutes les minutes pour rattraper les timers manques (crash Redis, job perdu) :

```typescript
// modules/reservations/reservation-cron.service.ts

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ReservationService } from './reservation.service';

@Injectable()
export class ReservationCronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationService: ReservationService,
  ) {}

  /**
   * Rattrapage des holds expires.
   * Toute reservation PENDING_PAYMENT dont expires_at < NOW() est expiree.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireStaleHolds(): Promise<void> {
    const staleReservations = await this.prisma.reservation.findMany({
      where: {
        status: 'pending_payment',
        expiresAt: { lt: new Date() },
      },
      select: { id: true },
      take: 100,  // batch de 100 pour limiter la charge
    });

    for (const { id } of staleReservations) {
      try {
        await this.reservationService.expireHold(id);
      } catch {
        // Log et continue : le prochain cycle rattrapera
      }
    }
  }

  /**
   * Rattrapage des no-shows.
   * Toute reservation READY dont le creneau est termine depuis > 5 min.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async detectStaleNoShows(): Promise<void> {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const staleReservations = await this.prisma.reservation.findMany({
      where: {
        status: 'ready',
        basket: {
          pickupEnd: { lt: fiveMinAgo },
        },
      },
      select: { id: true },
      take: 100,
    });

    for (const { id } of staleReservations) {
      try {
        await this.reservationService.detectNoShow(id);
      } catch {
        // Log et continue
      }
    }
  }

  /**
   * Capture des paiements pour les creneaux qui commencent.
   * Toute reservation CONFIRMED dont le creneau a commence.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async capturePaymentsForStartedSlots(): Promise<void> {
    const now = new Date();
    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: 'confirmed',
        basket: {
          pickupStart: { lte: now },
        },
      },
      select: { id: true },
      take: 100,
    });

    for (const { id } of reservations) {
      try {
        await this.reservationService.startPickupWindow(id);
      } catch {
        // Log et continue
      }
    }
  }
}
```

**Pourquoi les deux (BullMQ + CRON) ?**

- **BullMQ delayed jobs** : declenchement precis au timestamp voulu. Le hold expire exactement 5 min apres la creation, pas 5 min + 59 secondes.
- **CRON de rattrapage** : filet de securite. Si Redis crash et perd les jobs, le CRON les rattrape en < 1 min. Les gardes dans la state machine garantissent l'idempotence (un hold deja expire ne sera pas expire deux fois).

---

## 10. Gestion de la concurrence entre transitions

### 10.1 Probleme

Plusieurs transitions peuvent arriver simultanement sur la meme reservation :

| Scenario | Race condition |
|----------|---------------|
| Consommateur annule + partenaire annule | Deux remboursements ? Double credit stock ? |
| Consommateur paie + hold expire | Paiement accepte mais reservation expiree ? |
| Partenaire scanne QR + timer no-show | Retrait valide ET no-show ? |
| Deux admins resolvent la meme reclamation | Double remboursement ? |

### 10.2 Decision : SELECT FOR UPDATE avec serialisation pessimiste

Chaque transition sur une reservation est wrappee dans une transaction PostgreSQL avec `SELECT FOR UPDATE` sur la ligne de la reservation :

```typescript
// modules/reservations/reservation.service.ts (methode generique)

async transitionReservation(
  reservationId: string,
  event: ReservationEvent,
  opts: { actorId: string; actorRole: string; metadata?: Record<string, unknown> },
): Promise<Reservation> {
  return this.prisma.$transaction(async (tx) => {
    // 1. Verrouiller la ligne (SELECT FOR UPDATE)
    // → Toute autre transaction sur cette reservation attend ici
    const reservation = await tx.$queryRaw<Reservation[]>`
      SELECT r.*, b.pickup_start, b.pickup_end
      FROM reservations r
      JOIN baskets b ON r.basket_id = b.id
      WHERE r.id = ${reservationId}
      FOR UPDATE OF r
    `.then(rows => rows[0]);

    if (!reservation) {
      throw new Error(`Reservation ${reservationId} non trouvee`);
    }

    // 2. Tenter la transition (gardes + effets synchrones)
    const newStatus = await this.sm.transition(
      reservation.status as ReservationStatus,
      event,
      {
        entity: reservation,
        actorId: opts.actorId,
        actorRole: opts.actorRole as any,
        metadata: opts.metadata,
        timestamp: new Date(),
      },
    );

    // 3. Persister le nouvel etat + timestamps
    const updated = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: newStatus,
        ...this.getTimestampFields(newStatus),
      },
    });

    // 4. Ecrire l'historique
    await tx.reservationStatusHistory.create({
      data: {
        reservationId,
        fromStatus: reservation.status,
        toStatus: newStatus,
        event,
        actorId: opts.actorId === 'SYSTEM' ? null : opts.actorId,
        actorRole: opts.actorRole,
        metadata: opts.metadata ?? {},
      },
    });

    return updated as Reservation;
  }, {
    isolationLevel: 'ReadCommitted',  // suffisant avec FOR UPDATE
    timeout: 10_000,                   // 10s max par transaction
  });
}

private getTimestampFields(status: ReservationStatus): Record<string, Date> {
  const now = new Date();
  switch (status) {
    case ReservationStatus.CONFIRMED: return { confirmedAt: now };
    case ReservationStatus.READY: return { readyAt: now };
    case ReservationStatus.PICKED_UP: return { pickedUpAt: now };
    case ReservationStatus.CANCELLED_CONSUMER:
    case ReservationStatus.CANCELLED_PARTNER: return { cancelledAt: now };
    case ReservationStatus.NO_SHOW: return { noShowAt: now };
    case ReservationStatus.EXPIRED: return { expiredAt: now };
    default: return {};
  }
}
```

### 10.3 Resolution des scenarios de race condition

| Scenario | Resolution avec SELECT FOR UPDATE |
|----------|----------------------------------|
| **Consommateur annule + partenaire annule** | T1 prend le verrou, passe a `CANCELLED_CONSUMER`, commit. T2 prend le verrou, voit `CANCELLED_CONSUMER`, la transition `PARTNER_CANCEL` n'existe pas depuis cet etat → `StateMachineError` → T2 retourne une erreur "reservation deja annulee". |
| **Consommateur paie + hold expire (5 min, ADR-008)** | T1 (paiement) prend le verrou, voit `PENDING_PAYMENT`, transition `PAYMENT_SUCCESS` → `CONFIRMED`, commit. T2 (timer) prend le verrou, voit `CONFIRMED`, la transition `HOLD_TIMEOUT` n'existe pas depuis `CONFIRMED` → erreur ignoree silencieusement. OU l'inverse : le timer passe en premier, le paiement echoue sur `EXPIRED` → le PSP est notifie de la reversal. **Note** : pour les cartes, le RV est gratuit. Pour le mobile money, le RF prend 3-10 jours -- le consommateur est notifie (US-C036). |
| **Scan QR + timer no-show** | T1 (scan) prend le verrou, voit `READY`, transition `PICKUP_VALIDATED` → `PICKED_UP`. T2 (timer) prend le verrou, voit `PICKED_UP`, la garde `notAlreadyPickedUp` echoue → no-show annule. OU l'inverse : le no-show passe en premier et le scan QR echoue → le partenaire voit "Creneau de retrait termine" (cas rare, delai de grace de 5 min prevu pour eviter ca). |
| **Sync offline + timer no-show** | Le partenaire valide offline (terminal local → `PICKED_UP_PENDING_SYNC` localement). Le timer no-show cote serveur voit `READY` (le sync n'est pas encore arrive). Deux cas : (a) Le sync arrive AVANT le timer : la transition `OFFLINE_SYNC_SUCCESS` passe le serveur a `PICKED_UP`, le timer no-show echoue avec `StateMachineError`. (b) Le sync arrive APRES le timer : le serveur est en `NO_SHOW`. Le sync arrive et le serveur retourne 409. La transition `OFFLINE_SYNC_CONFLICT` est traitee : le retrait physique prime (ADR-012 section 6.4), le serveur annule le no-show et passe a `PICKED_UP`. L'admin est notifie. |
| **Sync offline + annulation consommateur** | Le consommateur a annule entre le moment du scan offline et le sync. Le serveur est en `CANCELLED_CONSUMER`. Le sync arrive et le serveur retourne 409. La transition `OFFLINE_SYNC_CONFLICT` est traitee : le retrait physique a eu lieu, le partenaire a donne le panier. L'admin est notifie pour resolution manuelle (remboursement annule, ou compensation partenaire). |
| **Deux admins resolvent la meme reclamation** | Meme principe : le premier commit gagne, le second voit `RESOLVED` et echoue (garde `assigned_admin_id = actorId` ou etat deja terminal). |
| **Suspension auto (ADR-019) pendant un creneau actif** | La suspension auto d'un consommateur (3 no-shows) annule ses reservations `CONFIRMED` mais PAS ses reservations `READY` (le paiement est deja capture). Le consommateur peut encore retirer ses paniers du creneau en cours. Seules les futures reservations sont bloquees. |

### 10.4 Performance du verrouillage

Le `SELECT FOR UPDATE` verrouille **une seule ligne** (`reservations` filtree par `id`). La duree du verrou est le temps de la transaction (< 100ms en conditions normales : validation gardes + quelques INSERTs/UPDATEs).

Pour le volume BienBon (ile Maurice, ~1000 reservations/jour au pic), la contention est quasi nulle. Meme deux consommateurs reservant le meme dernier panier ne se retrouvent pas en conflit sur la meme reservation -- ils ont chacun cree leur propre reservation avec le decrementage atomique du stock (ADR-008).

La seule contention reelle est le scenario "annulation partenaire de toutes les reservations d'un panier" (US-P029), qui verrouille sequentiellement chaque reservation. Pour un panier avec 10 reservations, ca prend ~1 seconde. Acceptable.

---

## 11. Ajustement du schema Prisma

Les tables ajoutees et les modifications d'enum par rapport a ADR-003 :

```prisma
// schema.prisma (extraits des modifications)

enum ReservationStatus {
  pending_payment
  confirmed
  ready                    // NOUVEAU (ADR-017) : creneau en cours, paiement capture
  picked_up
  picked_up_pending_sync   // NOUVEAU (ADR-017/ADR-012) : retrait valide offline, sync en attente
  no_show
  cancelled_consumer
  cancelled_partner
  expired
}

// Type de moyen de paiement -- conditionne les effets de bord financiers (ADR-005 decision B1)
enum PaymentMethodType {
  card           // Visa/Mastercard -- pre-autorisation (PA) puis capture (CP)
  mobile_money   // MCB Juice, Blink, MauCAS QR -- debit immediat (DB)
}

enum BasketStatus {
  draft
  published        // renomme depuis 'active'
  sold_out
  pickup_window    // NOUVEAU : creneau en cours
  ended            // renomme depuis 'expired' pour eviter confusion
  cancelled        // NOUVEAU : annulation partenaire
  archived
}

enum ClaimStatus {
  open
  in_review
  resolved
  rejected
}

enum PartnerStatus {
  pending
  active
  suspended
  rejected
  banned
}

model ReservationStatusHistory {
  id            String   @id @default(uuid())
  reservationId String   @map("reservation_id")
  reservation   Reservation @relation(fields: [reservationId], references: [id])
  fromStatus    String   @map("from_status")
  toStatus      String   @map("to_status")
  event         String
  actorId       String?  @map("actor_id")
  actorRole     String   @map("actor_role")
  metadata      Json     @default("{}")
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([reservationId, createdAt])
  @@map("reservation_status_history")
}

model ClaimStatusHistory {
  id         String   @id @default(uuid())
  claimId    String   @map("claim_id")
  claim      Claim    @relation(fields: [claimId], references: [id])
  fromStatus String   @map("from_status")
  toStatus   String   @map("to_status")
  event      String
  actorId    String?  @map("actor_id")
  actorRole  String   @map("actor_role")
  metadata   Json     @default("{}")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([claimId, createdAt])
  @@map("claim_status_history")
}

// Ajout de champs sur Reservation
model Reservation {
  // ... champs existants (ADR-003) ...
  readyAt            DateTime?          @map("ready_at")                // NOUVEAU (ADR-017)
  expiredAt          DateTime?          @map("expired_at")              // NOUVEAU (ADR-017)
  paymentMethodType  PaymentMethodType  @map("payment_method_type")    // NOUVEAU (ADR-017/ADR-005)
  pickupMethod       String?            @map("pickup_method")          // NOUVEAU : 'qr' | 'pin'
  pickupValidatedBy  String?            @map("pickup_validated_by")    // NOUVEAU : partner_user_id
  offlineSyncedAt    DateTime?          @map("offline_synced_at")      // NOUVEAU (ADR-012)
  // ... relation vers ReservationStatusHistory
  statusHistory ReservationStatusHistory[]
}
```

---

## 12. Testabilite

### 12.1 Tests unitaires de la machine a etats

Le service generique `StateMachine` et chaque table de transitions sont testables independamment :

```typescript
// reservation.transitions.spec.ts

import { StateMachine } from '../../shared/state-machine/state-machine.service';
import { ReservationStatus as S, ReservationEvent as E } from './reservation.states';
import { reservationTransitions } from './reservation.transitions';

describe('Reservation state machine', () => {
  const sm = new StateMachine(reservationTransitions, 'Reservation');

  describe('transitions valides', () => {
    it('PENDING_PAYMENT + PAYMENT_SUCCESS → CONFIRMED', async () => {
      const result = await sm.transition(S.PENDING_PAYMENT, E.PAYMENT_SUCCESS, mockCtx());
      expect(result).toBe(S.CONFIRMED);
    });

    it('CONFIRMED + CONSUMER_CANCEL → CANCELLED_CONSUMER (si creneau non commence)', async () => {
      const ctx = mockCtx({ basket: { pickupStart: futureDate() } });
      const result = await sm.transition(S.CONFIRMED, E.CONSUMER_CANCEL, ctx);
      expect(result).toBe(S.CANCELLED_CONSUMER);
    });
  });

  describe('transitions invalides', () => {
    it('NO_SHOW + CONSUMER_CANCEL → erreur', async () => {
      await expect(
        sm.transition(S.NO_SHOW, E.CONSUMER_CANCEL, mockCtx()),
      ).rejects.toThrow(StateMachineError);
    });

    it('EXPIRED + PAYMENT_SUCCESS → erreur', async () => {
      await expect(
        sm.transition(S.EXPIRED, E.PAYMENT_SUCCESS, mockCtx()),
      ).rejects.toThrow(StateMachineError);
    });

    it('READY + CONSUMER_CANCEL → erreur (creneau commence)', async () => {
      await expect(
        sm.transition(S.READY, E.CONSUMER_CANCEL, mockCtx()),
      ).rejects.toThrow(StateMachineError);
    });
  });

  describe('gardes', () => {
    it('CONFIRMED + CONSUMER_CANCEL echoue si creneau deja commence', async () => {
      const ctx = mockCtx({ basket: { pickupStart: pastDate() } });
      await expect(
        sm.transition(S.CONFIRMED, E.CONSUMER_CANCEL, ctx),
      ).rejects.toThrow(StateMachineError);
    });
  });

  describe('exhaustivite', () => {
    it('tous les etats terminaux n\'ont aucune transition sortante', () => {
      const terminalStates = [S.PICKED_UP, S.NO_SHOW, S.CANCELLED_CONSUMER, S.CANCELLED_PARTNER, S.EXPIRED];
      for (const state of terminalStates) {
        const events = sm.availableEvents(state);
        expect(events).toEqual([]);
      }
    });
  });

  describe('payment_method_type branching', () => {
    it('R1 carte : aucune ecriture ledger (PA)', async () => {
      const ctx = mockCtx({ paymentMethodType: 'card', paymentConfirmed: true });
      await sm.transition(S.PENDING_PAYMENT, E.PAYMENT_SUCCESS, ctx);
      expect(mockLedgerService.writeLedgerEntry).not.toHaveBeenCalled();
    });

    it('R1 mobile money : ecriture GATEWAY→CONSUMER_HOLDING', async () => {
      const ctx = mockCtx({ paymentMethodType: 'mobile_money', paymentConfirmed: true });
      await sm.transition(S.PENDING_PAYMENT, E.PAYMENT_SUCCESS, ctx);
      expect(mockLedgerService.writeLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({ debit: 'GATEWAY', credit: 'CONSUMER_HOLDING' }),
      );
    });

    it('R3 carte : reversal PA gratuit, pas de ledger', async () => {
      const ctx = mockCtx({ paymentMethodType: 'card', expiresAt: pastDate() });
      await sm.transition(S.PENDING_PAYMENT, E.HOLD_TIMEOUT, ctx);
      expect(mockPaymentService.reversePreAuth).toHaveBeenCalled();
      expect(mockPaymentService.refund).not.toHaveBeenCalled();
    });

    it('R3 mobile money : RF + ledger CONSUMER_HOLDING→GATEWAY', async () => {
      const ctx = mockCtx({ paymentMethodType: 'mobile_money', expiresAt: pastDate() });
      await sm.transition(S.PENDING_PAYMENT, E.HOLD_TIMEOUT, ctx);
      expect(mockPaymentService.refund).toHaveBeenCalled();
      expect(mockLedgerService.writeLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({ debit: 'CONSUMER_HOLDING', credit: 'GATEWAY' }),
      );
    });

    it('R6 carte : CP Peach + ledger GATEWAY→PLATFORM_REVENUE+PARTNER_PAYABLE', async () => {
      const ctx = mockCtx({ paymentMethodType: 'card', basket: { pickupStart: pastDate() } });
      await sm.transition(S.CONFIRMED, E.PICKUP_WINDOW_START, ctx);
      expect(mockPaymentService.capturePayment).toHaveBeenCalled();
    });

    it('R6 mobile money : pas d\'appel Peach, transfert CONSUMER_HOLDING→comptes finaux', async () => {
      const ctx = mockCtx({ paymentMethodType: 'mobile_money', basket: { pickupStart: pastDate() } });
      await sm.transition(S.CONFIRMED, E.PICKUP_WINDOW_START, ctx);
      expect(mockPaymentService.capturePayment).not.toHaveBeenCalled();
      expect(mockLedgerService.writeLedgerEntry).toHaveBeenCalledWith(
        expect.objectContaining({ debit: 'CONSUMER_HOLDING' }),
      );
    });
  });

  describe('offline pickup flow (ADR-012)', () => {
    it('READY + PICKUP_VALIDATED_OFFLINE → PICKED_UP_PENDING_SYNC', async () => {
      const ctx = mockCtx({ localReservationCache: { expectedQrPayload: 'abc', expectedPin: '1234', status: 'ready' }, qrCode: 'abc' });
      const result = await sm.transition(S.READY, E.PICKUP_VALIDATED_OFFLINE, ctx);
      expect(result).toBe(S.PICKED_UP_PENDING_SYNC);
    });

    it('PICKED_UP_PENDING_SYNC + OFFLINE_SYNC_SUCCESS → PICKED_UP', async () => {
      const result = await sm.transition(S.PICKED_UP_PENDING_SYNC, E.OFFLINE_SYNC_SUCCESS, mockCtx());
      expect(result).toBe(S.PICKED_UP);
    });

    it('PICKED_UP_PENDING_SYNC + OFFLINE_SYNC_CONFLICT → PICKED_UP (retrait physique prime)', async () => {
      const result = await sm.transition(S.PICKED_UP_PENDING_SYNC, E.OFFLINE_SYNC_CONFLICT, mockCtx());
      expect(result).toBe(S.PICKED_UP);
    });

    it('NO_SHOW_TIMEOUT bloque si PICKED_UP_PENDING_SYNC', async () => {
      const ctx = mockCtx({ status: 'picked_up_pending_sync' });
      await expect(
        sm.transition(S.READY, E.NO_SHOW_TIMEOUT, ctx),
      ).rejects.toThrow(StateMachineError);
    });
  });
});
```

### 12.2 Tests d'integration

Les tests d'integration verifient le flux complet (transition + effets + persistance) avec une base PostgreSQL de test :

```typescript
// reservation.integration.spec.ts

describe('Reservation lifecycle (integration)', () => {
  it('complete flow: PENDING → CONFIRMED → READY → PICKED_UP', async () => {
    // 1. Creer une reservation (PENDING_PAYMENT)
    const reservation = await service.createReservation(basketId, consumerId, 1, paymentMethodId);
    expect(reservation.status).toBe('pending_payment');

    // 2. Simuler le paiement reussi → CONFIRMED
    await service.confirmPayment(reservation.id, { paymentConfirmed: true });
    const confirmed = await repo.findById(reservation.id);
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.confirmedAt).toBeDefined();
    expect(confirmed.qrCode).toBeDefined();

    // 3. Avancer le temps au debut du creneau → READY
    await service.startPickupWindow(reservation.id);
    const ready = await repo.findById(reservation.id);
    expect(ready.status).toBe('ready');

    // 4. Scanner le QR code → PICKED_UP
    await service.validatePickup(reservation.id, { qrCode: confirmed.qrCode });
    const pickedUp = await repo.findById(reservation.id);
    expect(pickedUp.status).toBe('picked_up');
    expect(pickedUp.pickedUpAt).toBeDefined();

    // 5. Verifier l'historique
    const history = await historyRepo.findByReservationId(reservation.id);
    expect(history).toHaveLength(3); // 3 transitions
    expect(history.map(h => h.toStatus)).toEqual(['confirmed', 'ready', 'picked_up']);
  });
});
```

---

## 13. Exposition API : actions disponibles

Le frontend (Flutter) doit savoir quels boutons afficher selon l'etat de la reservation. L'API expose cette information :

```typescript
// Reponse GET /reservations/:id
{
  "id": "uuid",
  "status": "confirmed",
  "confirmedAt": "2026-02-27T10:00:00Z",
  "basket": { ... },
  "qrCode": "...",
  "pinCode": "4827",
  "availableActions": ["consumer_cancel"],  // genere par sm.availableEvents()
  // ...
}
```

Le frontend utilise `availableActions` pour :
- Afficher/masquer le bouton "Annuler" (`consumer_cancel` present ? oui : non)
- Afficher/masquer le QR code (status = `confirmed` ou `ready`)
- Afficher/masquer "Reclamer" (status = `picked_up` ET `NOW() < picked_up_at + 24h`)

---

## 14. Resume des decisions

| Question | Decision | Justification |
|----------|----------|---------------|
| **Formalisme** | Transition table maison (Option B) | Bon equilibre formalisme / simplicite pour 2-5 devs. Zero dependance. La table EST la doc. |
| **Flux de paiement** | Discriminant `payment_method_type: 'card' \| 'mobile_money'` conditionnant les transitions R1, R3, R4, R5, R6 | ADR-005 decision B1 (hybride) : PA/CP pour cartes, DB pour mobile money. Les wallets mauriciens ne supportent pas la pre-autorisation. |
| **Comptes ledger** | Terminologie alignee sur ADR-007 : `GATEWAY`, `CONSUMER_HOLDING`, `PLATFORM_REVENUE`, `PARTNER_PAYABLE:<uuid>`, `REFUND_PENDING` | Source unique de verite : ADR-007 decision 1. |
| **Validation offline** | Etat transitoire `PICKED_UP_PENDING_SYNC` + evenements `PICKUP_VALIDATED_OFFLINE`, `OFFLINE_SYNC_SUCCESS`, `OFFLINE_SYNC_CONFLICT` | ADR-012 section 6 : le retrait doit fonctionner meme sans reseau. Le retrait physique prime. |
| **Effets de bord** | Synchrones dans la transaction, asynchrones via EventEmitter + BullMQ | Les operations critiques (stock, ledger) sont ACID. Les notifications sont eventually consistent. |
| **Validation transitions** | 3 couches : applicative (StateMachine) + CHECK constraints DB + historique | Defense en profondeur. La couche applicative est la premiere ligne ; la DB est le filet de securite. |
| **Horodatage** | Timestamps denormalises (requetes rapides) + table `*_status_history` (audit) | Les deux sont necessaires pour des raisons differentes. |
| **Timers** | BullMQ delayed jobs (precision) + CRON minutaire (rattrapage). Hold 5 min (ADR-008) explicitement documente avec effets differencies carte/mobile money. | BullMQ pour la precision, CRON pour la resilience. Les gardes garantissent l'idempotence. |
| **Concurrence** | `SELECT FOR UPDATE` par reservation. Scenarios offline ajoutes (sync vs no-show, sync vs annulation). | Serialisation pessimiste sur une ligne unique. Resolution des conflits offline conforme ADR-012 section 6.4. |
| **Fraude** | Chaque transition pertinente (no-show, annulation, reclamation, remboursement) incremente les compteurs Redis et enqueue un job `fraud-check` (ADR-019). | Coherence avec le catalogue de regles ADR-019. Les regles a seuil absolu declenchent une suspension auto immediate. |
| **PICKED_UP vs COMPLETED** | Fusion en un seul etat (`PICKED_UP` terminal) | Simplicite. La reclamation est une entite separee, pas un sous-etat de la reservation. |
| **Enums basket** | `published` (ex `active`), ajout `pickup_window`, `cancelled`, `ended` (ex `expired`) | Plus explicite et alignee avec les transitions reelles. |
| **Historique basket/partenaire** | Via `audit_logs` generique (pas de table dediee) | Moins de transitions, moins de besoins d'analyse specifique. |

---

## 15. Consequences

### Consequences positives

1. **Les transitions invalides sont impossibles.** La table de transitions est exhaustive : si une transition n'est pas declaree, elle est refusee. Plus de `if (status === 'no_show') { status = 'confirmed' }` accidentel.
2. **Les effets de bord sont explicites et tracables.** Chaque transition liste ses effets dans la table avec la distinction carte/mobile money. Un nouveau dev peut voir en une lecture quels systemes sont impactes par une annulation et comment le comportement varie selon le moyen de paiement.
3. **Les flux financiers sont corrects par construction.** Le discriminant `payment_method_type` garantit que les cartes passent par PA/CP/RV et le mobile money par DB/RF. Les comptes ledger (`GATEWAY`, `CONSUMER_HOLDING`, `PLATFORM_REVENUE`, `PARTNER_PAYABLE`) sont utilises avec la bonne semantique a chaque transition.
4. **Le mode offline est gere.** L'etat `PICKED_UP_PENDING_SYNC` et les transitions de synchronisation garantissent que le retrait fonctionne meme sans reseau, avec une resolution de conflits deterministe (le retrait physique prime, conforme ADR-012).
5. **L'historique est complet.** La table `reservation_status_history` fournit un audit trail granulaire pour le support client, la detection fraude, et les litiges legaux.
6. **La concurrence est resolue.** Le `SELECT FOR UPDATE` elimine toutes les race conditions identifiees (y compris les scenarios offline), avec un cout de performance negligeable.
7. **Les timers sont fiables.** Le double mecanisme BullMQ + CRON garantit qu'aucun timer n'est manque, meme en cas de crash Redis. Le hold 5 min (ADR-008) est explicitement documente avec ses effets differencies.
8. **La fraude est tracee.** Chaque transition pertinente (no-show, annulation, reclamation, remboursement) alimente les compteurs ADR-019, garantissant une detection coherente.
9. **L'API est declarative.** Le frontend recoit `availableActions` et n'a pas besoin de reimplementer la logique d'etat.

### Consequences negatives

1. **Responsabilite de maintenance accrue.** La table de transitions est plus complexe avec la distinction carte/mobile money et les transitions offline. Ajouter un nouvel etat ou une nouvelle transition necessite de mettre a jour la table, les gardes, les effets, et les tests.
2. **Pas de visualisation automatique.** Contrairement a XState, pas d'inspecteur graphique. Les diagrammes ASCII de cette ADR sont la reference, a maintenir manuellement.
3. **Deux tables supplementaires.** `reservation_status_history` et `claim_status_history` ajoutent du volume en base. A la volumetrie BienBon (~100K reservations/an), c'est negligeable.
4. **Complexite des effets conditionnels.** Les effets de bord branches par `payment_method_type` ajoutent des chemins de code a tester. Mitigation : chaque branche est une fonction isolee, testable unitairement.

---

## 16. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Table de transitions desynchronisee avec le code** | Moyenne | Eleve | Tests exhaustifs qui verifient chaque transition. Code review obligatoire pour tout changement de la table. |
| **Effets de bord oublies lors d'un ajout de transition** | Moyenne | Eleve | Checklist dans le PR template : "Quels effets cette transition declenche-t-elle ? Stock ? Ledger ? Notification ? Fraude ? Quelle branche carte/mobile money ?" |
| **Branche carte/mobile money non testee** | Moyenne | Eleve | Chaque transition avec branche `payment_method_type` doit avoir des tests pour les deux chemins. Matrice de test : {transition} x {card, mobile_money}. |
| **Sync offline arrive trop tard (apres no-show)** | Moyenne | Moyen | Le conflit est gere par la transition `OFFLINE_SYNC_CONFLICT` (le retrait physique prime, ADR-012 section 6.4). L'admin est notifie. Le consommateur n'est pas penalise a tort. |
| **Deadlock PostgreSQL sur SELECT FOR UPDATE** | Faible | Moyen | Les transactions verrouillent une seule entite a la fois. L'annulation partenaire (N reservations) les verrouille sequentiellement, pas en parallele. Timeout de 10s sur les transactions. |
| **BullMQ perd un job (crash Redis) -- notamment le hold 5 min** | Faible | Eleve | CRON de rattrapage toutes les minutes. Redis en mode AOF (append-only file) pour minimiser la perte. Le CRON `expireStaleHolds` rattrape les holds expires en < 1 min. |
| **Remboursement mobile money echoue apres annulation** | Moyenne | Moyen | Table `refunds` avec `status: 'pending'` → retry automatique 3x (ADR-005). Si echec definitif : alerte admin + suivi manuel. Le consommateur est notifie du delai. |
| **Performance du CRON avec beaucoup de reservations** | Faible | Faible | Le CRON est batche (LIMIT 100) et indexe. A 1000 reservations/jour, meme le pire cas (toutes pendantes) est traite en < 1s. |
| **Le pattern ne scale pas a des machines plus complexes** | Faible | Moyen | Si un jour on a besoin de parallel states ou de machines hierarchiques, on pourra migrer vers XState. La table de transitions se traduit mecaniquement en config XState. |
| **Faux positif de suspension auto (ADR-019) pendant un creneau actif** | Faible | Moyen | La suspension auto n'annule que les reservations `CONFIRMED`, pas `READY`. Le consommateur peut retirer ses paniers du creneau en cours. |

---

## 17. Migration depuis ADR-003

ADR-003 definit les enums de reservation comme `pending_payment`, `confirmed`, `picked_up`, `no_show`, `cancelled_consumer`, `cancelled_partner`, `expired`. Cette ADR enrichit significativement le schema. Les modifications requises :

1. **Ajout des etats `ready` et `picked_up_pending_sync`** a l'enum `ReservationStatus` dans le schema Prisma
2. **Ajout de l'enum `PaymentMethodType`** (`card`, `mobile_money`) -- conditionne les effets financiers (ADR-005)
3. **Ajout des champs sur `reservations`** : `ready_at`, `expired_at`, `payment_method_type`, `pickup_method`, `pickup_validated_by`, `offline_synced_at`
4. **Ajout de la table** `reservation_status_history`
5. **Ajout de la table** `claim_status_history`
6. **Modification de l'enum basket** : renommage `active` → `published`, `expired` → `ended`, ajout `pickup_window`, `cancelled`
7. **Ajout de l'enum** `ClaimStatus` et `PartnerStatus`
8. **Ajout de l'etat `C6` (auto-expire)** sur les reclamations (30 jours sans traitement)

Ces modifications sont retrocompatibles et seront effectuees dans une migration Prisma avant le debut du developpement backend.

---

## 18. References

- User stories : `dev-specs/us/01-consommateur/reservation.md`, `reclamations.md`, `retrait-qr.md`, `paiement.md`, `avis-notes.md`
- User stories : `dev-specs/us/02-partenaire/paniers-manuels.md`, `reservations-retraits.md`
- User stories : `dev-specs/us/03-admin/moderation.md`, `gestion-partenaires.md`
- ADR-003 : Schema de base de donnees
- ADR-005 : Architecture de paiement -- decision B1 (hybride PA/CP pour cartes, DB pour mobile money), decision C1 (capture au debut du creneau), Peach Payments comme gateway unique
- ADR-007 : Ledger et commissions -- plan comptable (`GATEWAY`, `CONSUMER_HOLDING`, `PLATFORM_REVENUE`, `PARTNER_PAYABLE:<uuid>`, `REFUND_PENDING`), ecritures par flux, modele de commission
- ADR-008 : Prevention double-booking et stock -- decrement atomique, hold 5 min, restauration stock
- ADR-012 : Strategie offline-first et cache -- section 6 (validation pickup offline, OfflineActionQueue, SyncWorker, resolution de conflits)
- ADR-014 : Notifications multi-canal
- ADR-019 : Detection de fraude et suspension automatique -- regles C1-C7 (consommateur), P1-P5 (partenaire), S1-S7 (plateforme), compteurs Redis, FraudCheckWorker, suspension auto
- Fowler, Martin. "State Machine" : https://martinfowler.com/eaaDev/State.html
- XState documentation (considere et rejete) : https://stately.ai/docs
