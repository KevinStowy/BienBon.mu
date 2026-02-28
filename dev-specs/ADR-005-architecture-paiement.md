# ADR-005 : Architecture de paiement

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-001 (stack backend), ADR-002 (architecture applicative)

---

## Contexte

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. Le flux financier est central au produit :

1. Le **consommateur** reserve un panier et paie en ligne (ex: Rs 150)
2. **BienBon** preleve une commission configurable (ex: 25%, fee minimum Rs 50)
3. Le **partenaire** recoit le montant net (ex: Rs 112.50) via un reversement mensuel programme
4. En cas de reclamation validee : remboursement total ou partiel au consommateur, avec ajustement de la commission et du payout

### Methodes de paiement exigees (US-C031 a US-C034)

| Methode | Type | Popularite a Maurice | Poids estime des transactions |
|---------|------|---------------------|-------------------------------|
| Visa / Mastercard | Carte bancaire | Standard | ~30-40% |
| MCB Juice | Mobile wallet (MCB) | 420K+ abonnes, 7M+ tx/mois | ~30-40% |
| Blink by Emtel | Mobile wallet (Emtel) | Croissant | ~10-15% |
| my.t money | Mobile wallet (Mauritius Telecom) | Croissant | ~10-15% |

### Exigences fonctionnelles cles

- **Pre-autorisation/capture differee** : le montant est bloque a la reservation, debite au debut du creneau de retrait (US-C024)
- **Tokenisation** des donnees de carte -- conformite PCI DSS (US-C031)
- **Annulation consommateur** avant le creneau : levee de la pre-autorisation, zero debit (US-C027)
- **Annulation partenaire** : remboursement automatique de tous les consommateurs concernes (US-P029)
- **No-show** : le montant est maintenu -- le consommateur est debite (US-P031)
- **Remboursement sur reclamation** : total ou partiel, declenche par l'admin (US-C049)
- **Suivi du statut de remboursement** en temps reel (US-C038)
- **Messages d'erreur detailles** par type d'echec (US-C036)
- **Recu telechargeale** en PDF (US-C037)
- **Commission configurable** avec fee minimum par transaction (US-A027)
- **Releves de reversement mensuels** avec detail par transaction (US-A028, US-P043)

### Pourquoi cette decision est necessaire maintenant

L'architecture de paiement conditionne le schema de base de donnees (ledger), le choix des prestataires, le modele de pre-autorisation, et les flux de remboursement. Ces choix sont difficiles et couteux a changer une fois en production. La decouverte des contraintes reelles des APIs locales (voir recherche ci-dessous) a un impact majeur sur l'architecture retenue.

---

## Recherche : etat reel des APIs de paiement a Maurice

### Constat fondamental : Peach Payments comme gateway unifie

La recherche web revele que **Peach Payments** est l'acteur central de l'ecosysteme de paiement en ligne a Maurice. C'est un orchestrateur de paiement africain (siege en Afrique du Sud) avec une **presence physique a Maurice** et des partenariats directs avec les providers locaux :

- **MCB Juice** : integre via Peach Payments (partenariat officiel MCB x Peach, avril 2024)
- **Blink by Emtel** : integre via Peach Payments (partenariat officiel Emtel x Peach, avril 2023)
- **MauCAS QR** : integre via Peach Payments (partenariat via Blink, juillet 2025) -- couvre potentiellement **tous les wallets MauCAS** (MCB Juice, Blink, my.t money) via un QR code universel
- **Cartes Visa/Mastercard** : integrees nativement via Peach Payments avec acquirer MCB

### Capacites confirmees par methode de paiement (Peach Payments)

| Methode | Code Peach | Payment Types supportes | Pre-autorisation (PA) | Capture (CP) | Refund (RF) | Tokenisation |
|---------|-----------|------------------------|:---------------------:|:------------:|:-----------:|:------------:|
| **Visa/Mastercard** | `CARD` | DB, RF, RG, PA, CP, RV | **Oui** | **Oui** (7 jours max) | **Oui** (total + partiel) | **Oui** |
| **MCB Juice** | `MCBJUICE` | DB uniquement | **Non** | N/A | A confirmer* | Non |
| **Blink by Emtel** | `BLINKBYEMTEL` | DB uniquement | **Non** | N/A | A confirmer* | Non |
| **MauCAS QR** | `MAUCAS` | DB uniquement | **Non** | N/A | A confirmer* | Non |

> *Les remboursements (RF) pour les methodes mobile money ne sont pas documentes publiquement dans l'API Peach Payments. Il faudra confirmer avec Peach Payments lors de l'integration.

### Decouverte critique : pas de pre-autorisation pour le mobile money

**Les wallets mobile money (MCB Juice, Blink, my.t money) ne supportent que le debit immediat (DB).** La pre-autorisation/capture differee n'est disponible que pour les cartes Visa/Mastercard.

C'est une contrainte technique incontournable qui impacte l'architecture entiere. Les user stories US-C032, US-C033, US-C034 mentionnent une "pre-autorisation via l'API [wallet]", mais **cette fonctionnalite n'existe pas** chez ces providers. L'ADR doit definir un fallback credible.

### Pre-autorisation carte : details techniques (Peach Payments)

- **Delai de capture** : 7 jours maximum apres la pre-autorisation
- **Capture partielle** : supportee (le total des captures ne doit pas exceder le montant PA)
- **Reversal** : possible (annule la PA sans debiter)
- **Capture multiple** : possible contre une meme PA
- **Refund sur PA** : interdit -- il faut d'abord capturer, puis rembourser
- **Refund sur debit (DB)** : supporte (total et partiel), delai de 14 jours ouvrables

### Stripe a Maurice

**Stripe n'est pas officiellement disponible a Maurice.** Il existe des contournements (LLC americaine), mais ce n'est pas viable pour une startup locale qui accepte des paiements en MUR et doit integrer les wallets mobile money locaux.

### MIPS (Multiple Internet Payment System)

MIPS est un orchestrateur de paiement local mauricien, concurrent de Peach Payments. Il offre des integrations e-commerce et mobile. Cependant, sa documentation publique est moins detaillee, et Peach Payments a l'avantage des partenariats directs avec MCB Juice et Blink, plus une documentation developer-first superieure.

### Tarification indicative

| Methode via Peach | Frais estime |
|-------------------|-------------|
| Cartes Visa/MC | ~2.5-3.5% (a negocier, depend du volume et de l'acquirer MCB) |
| MCB Juice (SME) | 1.50% + MUR 3.50 par transaction |
| Blink / MauCAS QR | ~1-2% (tarification sur devis, generalement inferieure aux cartes) |
| Peach setup fee | Sur devis (varie selon le plan SME ou Enterprise) |

### PCI DSS

Peach Payments est **PCI DSS Level 1 compliant**. En utilisant leur Hosted Checkout ou COPYandPAY (widget JavaScript), BienBon ne touche jamais aux donnees de carte et est eligible au **SAQ-A** (22 exigences seulement, le niveau de compliance le plus simple). La tokenisation est geree entierement par Peach.

---

## Options considerees

### A. Gateway / Orchestration

#### Option A1 : Peach Payments comme gateway unique

**Description** : Utiliser Peach Payments pour TOUTES les methodes de paiement (cartes + MCB Juice + Blink + MauCAS QR). Une seule integration, une seule API, un seul dashboard.

**Avantages** :
- Une seule API REST a integrer (`developer.peachpayments.com`)
- Tous les wallets locaux deja integres (MCB Juice, Blink, MauCAS)
- Cartes Visa/MC avec pre-autorisation/capture native
- Tokenisation et PCI DSS Level 1 geres par Peach
- Dashboard unifie pour le suivi des transactions
- Support Peach avec presence physique a Maurice
- Webhooks unifies pour toutes les methodes
- Hosted Checkout ou COPYandPAY pour le PCI SAQ-A

**Inconvenients** :
- Dependance a un seul provider (risque de panne, changement de tarif)
- my.t money n'est pas directement disponible via Peach (accessible via MauCAS QR uniquement)
- Les tarifs entreprise ne sont pas publics (negociation requise)
- Pas de marketplace/connected accounts natif (a la Stripe Connect)

#### Option A2 : Peach Payments (cartes + MCB Juice + Blink) + integration directe my.t money

**Description** : Peach Payments pour la majorite des methodes, avec une integration directe de l'API my.t money (ou via MIPS) pour couvrir ce wallet specifiquement.

**Avantages** :
- Couverture explicite de my.t money
- Redondance partielle (si Peach tombe, my.t money reste disponible)

**Inconvenients** :
- Deux integrations a maintenir au lieu d'une
- my.t money ne dispose pas de documentation API publique accessible
- Complexite operationnelle supplementaire (2 dashboards, 2 systemes de webhooks, 2 reconciliations)
- my.t money peut etre atteint via MauCAS QR sur Peach de toute facon

#### Option A3 : MIPS comme gateway unique

**Description** : Utiliser MIPS, l'orchestrateur local mauricien, pour toutes les methodes.

**Avantages** :
- Provider 100% local (connaissance du marche)
- Integrations locales potentiellement plus profondes

**Inconvenients** :
- Documentation developer moins mature que Peach Payments
- Pas de documentation publique d'API REST accessible aux developpeurs
- Moins de track record d'integration e-commerce documente publiquement
- Pas de confirmation de support pre-autorisation pour les cartes
- Absence d'evidence d'integrations MCB Juice / Blink via MIPS

#### Option A4 : Abstraction maison multi-provider

**Description** : Construire une couche d'abstraction interne avec des adaptateurs pour chaque provider (Peach pour les cartes, API directe MCB Juice, API directe Blink, API directe my.t money).

**Avantages** :
- Independance totale des providers
- Possibilite de negocier les tarifs directement avec chaque acteur

**Inconvenients** :
- **Aucune API publique developer n'est disponible pour MCB Juice, Blink ou my.t money en direct** -- ces wallets ne sont accessibles qu'a travers des gateways comme Peach Payments
- Complexite d'integration x4 au lieu de x1
- Gestion PCI DSS sans gateway = SAQ D (le niveau le plus complexe) pour les cartes
- Irealiste pour une petite equipe

### Evaluation gateway

| Critere (poids) | A1 : Peach unique | A2 : Peach + my.t direct | A3 : MIPS unique | A4 : Abstraction maison |
|-----------------|:-----------------:|:------------------------:|:----------------:|:----------------------:|
| Simplicite d'integration (25%) | 5 | 3 | 2 | 1 |
| Couverture des methodes de paiement (20%) | 4* | 5 | 3 | 2 |
| Conformite PCI DSS (15%) | 5 | 4 | 3 | 1 |
| Fiabilite / support (15%) | 4 | 3.5 | 3 | 2 |
| Cout (10%) | 4 | 3 | 4 | 3 |
| Independance / pas de lock-in (10%) | 2 | 3 | 3 | 5 |
| Documentation / DX (5%) | 5 | 3.5 | 2 | 1 |
| **Score pondere** | **4.20** | **3.50** | **2.75** | **1.85** |

> *my.t money est accessible via MauCAS QR, donc la couverture est quasi-complete (4/5 et non 5/5 car l'experience utilisateur MauCAS QR est differente d'un flux my.t money dedie).

---

### B. Modele de pre-autorisation

Le probleme central : **les wallets mobile money ne supportent pas la pre-autorisation**. Trois approches possibles.

#### Option B1 : Hybride -- auth/capture pour cartes, debit immediat + remboursement pour mobile money

**Description** :
- **Cartes Visa/MC** : pre-autorisation (PA) a la reservation. Capture (CP) au debut du creneau de retrait. Reversal (RV) si annulation avant le creneau.
- **Mobile money (MCB Juice, Blink, MauCAS)** : debit immediat (DB) a la reservation. Remboursement (RF) en cas d'annulation avant le creneau.

**Flux carte :**
```
Reservation  ──> PA (montant bloque)  ──> Debut creneau ──> CP (debit effectif)
                                       └─> Annulation    ──> RV (montant debloque, zero cout)
                                       └─> No-show       ──> CP (debit effectif, apres fin creneau)
```

**Flux mobile money :**
```
Reservation  ──> DB (debit immediat)  ──> Debut creneau ──> (rien, deja debite)
                                       └─> Annulation    ──> RF (remboursement, delai 3-10 jours)
                                       └─> No-show       ──> (rien, deja debite)
```

**Avantages** :
- Meilleure experience pour les cartes : pas de debit avant le retrait, pas de mouvement bancaire si annulation
- Exploite les capacites reelles de chaque methode de paiement
- Le no-show est naturellement gere (le debit est deja fait pour le mobile money, la capture est faite pour les cartes)
- Modele economiquement optimal : pas de frais de remboursement sur les annulations carte (un RV est gratuit)

**Inconvenients** :
- Deux flux differents a implementer et tester
- Le consommateur mobile money voit un debit immediat (difference d'experience perceptible)
- Le remboursement mobile money prend 3-10 jours ouvrables (vs instantane pour un RV carte)
- Les user stories mentionnent "pre-autorisation" pour les wallets -- il faut mettre a jour les specs

#### Option B2 : Debit immediat pour tous + remboursement si annulation

**Description** : Debiter immediatement tous les moyens de paiement (cartes incluses, en mode DB au lieu de PA) a la reservation. En cas d'annulation, rembourser.

**Avantages** :
- Un seul flux pour tous les moyens de paiement (simplicite)
- Pas de gestion de fenetre de capture (7 jours max pour les PA)
- Le fonds est securise immediatement (zero risque de PA expiree)

**Inconvenients** :
- **Mauvaise experience consommateur** : le debit apparait immediatement sur le releve bancaire, meme si le retrait est dans 12 heures
- **Cout de remboursement** : chaque annulation genere des frais de transaction (debit + remboursement = 2 operations facturees)
- **Confiance brisee** : les specs UI indiquent "Le montant sera bloque mais pas debite" (mockup US-C024). Un debit immediat contredit cette promesse.
- Probleme reputationnel si le taux d'annulation est eleve (les consommateurs verront des debits/remboursements frequents)

#### Option B3 : Escrow interne (BienBon collecte, retient, reverse)

**Description** : BienBon debite immediatement tous les consommateurs et retient les fonds dans un compte escrow interne. Les fonds ne sont "attribues" au partenaire qu'au moment du retrait. En cas d'annulation, BienBon cree un credit interne.

**Avantages** :
- Controle total du flux financier
- Possibilite de credit instantane (wallet interne BienBon)

**Inconvenients** :
- **Reglementation** : a Maurice, detenir des fonds clients dans un escrow necessite potentiellement une licence de la Bank of Mauritius (Payment Intermediary Services). C'est un risque reglementaire majeur pour une startup.
- Complexite comptable significative
- Le consommateur est debite immediatement (meme inconvenient que B2)
- Cout de developpement d'un systeme de wallet interne disproportionne pour le MVP

### Evaluation pre-autorisation

| Critere (poids) | B1 : Hybride | B2 : Debit immediat | B3 : Escrow interne |
|-----------------|:------------:|:-------------------:|:-------------------:|
| Experience consommateur (25%) | 4 | 2 | 2 |
| Simplicite d'implementation (25%) | 3.5 | 5 | 2 |
| Cout par transaction (20%) | 5 | 3 | 4 |
| Conformite reglementaire (15%) | 5 | 5 | 2 |
| Gestion des no-shows (10%) | 5 | 5 | 4 |
| Flexibilite (5%) | 4 | 3 | 5 |
| **Score pondere** | **4.20** | **3.65** | **2.70** |

---

### C. Moment de la capture

Le debit effectif (capture pour les cartes, ou confirmation que le debit mobile money est "acquis" pour le partenaire) doit intervenir a un moment precis.

#### Option C1 : Capture au debut du creneau de retrait

**Description** : Un job CRON declenche la capture (CP) pour toutes les reservations actives au moment ou le creneau de retrait commence.

**Flux :** `Reservation (PA) --> debut creneau 17h30 --> CP automatique --> retrait valide par scan QR`

**Avantages** :
- Coherent avec les specs (US-C024 : "Le debit effectif intervient automatiquement au moment du debut du creneau de retrait")
- Le consommateur ne peut plus annuler une fois le creneau commence (US-C027) -- le debit intervient au bon moment
- Le no-show est naturellement gere : le debit a deja eu lieu, pas d'action supplementaire (US-P031)

**Inconvenients** :
- Job CRON critique : s'il echoue, les captures n'ont pas lieu
- Risque de capturer alors que le partenaire a un imprevue et n'a pas encore annule

#### Option C2 : Capture au moment du scan QR (retrait)

**Description** : La capture n'est effectuee que quand le partenaire scanne le QR code du consommateur (US-P026).

**Avantages** :
- Debit uniquement si le retrait a reellement lieu
- Zero risque de debiter un consommateur qui n'a rien recu

**Inconvenients** :
- **Gestion des no-shows** : si le consommateur ne vient pas, il n'y a jamais de capture. Il faut un second mecanisme (job apres la fin du creneau) pour capturer les no-shows, sinon la PA expire apres 7 jours et le partenaire perd le revenu.
- Les specs disent que le no-show est debite (US-P031 : "le montant de la transaction est maintenu, le consommateur est debite"). Avec C2, il faut donc un job post-creneau pour capturer les PA non retirees.
- Complexite : deux chemins de capture (retrait + no-show)

#### Option C3 : Capture a la fin du creneau de retrait

**Description** : Un job s'execute a la fin du creneau et capture toutes les reservations non annulees (retirees + no-shows).

**Avantages** :
- Un seul point de capture pour tout
- Le partenaire a jusqu'a la fin du creneau pour annuler

**Inconvenients** :
- Le consommateur a deja retire le panier mais le debit n'a pas encore eu lieu (fenetre de vulnerabilite : si la PA est reverser par la banque entre le retrait et la fin du creneau, le partenaire perd le revenu)
- Decoherent avec les specs (le debit devrait intervenir au debut du creneau, pas a la fin)
- Complexite de gestion si le creneau dure plusieurs heures

### Decision sur le moment de capture

**Option C1 retenue** (capture au debut du creneau). C'est l'option la plus alignee avec les specs et la plus simple. Le job CRON est fiabilise via BullMQ avec retry et dead-letter queue.

Pour les cartes avec PA, un job de securite supplementaire s'execute a J+6 pour capturer toute PA residuelle (protection contre les PA qui expireraient a J+7).

---

### D. Ledger interne

#### Option D1 : Simple transaction log

**Description** : Une table `transactions` avec un enregistrement par evenement (paiement, capture, remboursement) et les champs de reconciliation.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  type VARCHAR(20) NOT NULL,  -- 'pre_auth', 'capture', 'debit', 'refund', 'reversal'
  status VARCHAR(20) NOT NULL, -- 'pending', 'success', 'failed'
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MUR',
  payment_method VARCHAR(20) NOT NULL, -- 'card', 'mcb_juice', 'blink', 'maucas'
  provider_tx_id VARCHAR(255),  -- ID de transaction Peach Payments
  provider_status VARCHAR(50),
  consumer_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(10,2),
  partner_net_amount DECIMAL(10,2),
  fee_minimum_applied BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Avantages** :
- Simple a implementer et a comprendre
- Suffisant pour generer les releves de reversement mensuels
- Facile a requeter pour les dashboards admin

**Inconvenients** :
- Pas d'auditabilite comptable stricte (un UPDATE peut perdre l'historique)
- La reconciliation repose sur des requetes ad-hoc
- Pas de garantie d'equilibre comptable (les debits et credits ne sont pas formellement lies)

#### Option D2 : Double-entry bookkeeping

**Description** : Chaque mouvement financier est enregistre comme une paire debit/credit entre des comptes internes. Rien ne se perd, rien ne se cree, tout se transforme.

**Comptes internes :**
```
CONSUMER_RECEIVABLE  -- ce que le consommateur doit / a paye
BIENBON_REVENUE      -- commission BienBon
PARTNER_PAYABLE      -- ce que BienBon doit au partenaire
PAYMENT_GATEWAY      -- fonds transites via Peach Payments
REFUND_PAYABLE       -- remboursements a effectuer
```

**Schema :**
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,  -- 'asset', 'liability', 'revenue', 'expense'
  entity_type VARCHAR(20),    -- 'system', 'partner', 'consumer'
  entity_id UUID,             -- NULL pour les comptes systeme, partner_id ou consumer_id
  balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL,  -- relie a la transaction metier
  debit_account_id UUID NOT NULL REFERENCES accounts(id),
  credit_account_id UUID NOT NULL REFERENCES accounts(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- PAS de updated_at : les entrees du ledger sont IMMUABLES
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MUR',
  payment_method VARCHAR(20) NOT NULL,
  provider_tx_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Exemple : reservation Rs 150, commission 25% (= Rs 37.50, > fee min Rs 50 non applicable) :**

| Evenement | Debit | Credit | Montant |
|-----------|-------|--------|---------|
| PA carte creee | CONSUMER_RECEIVABLE | (pas d'entree -- PA n'est pas un mouvement de fonds) | - |
| Capture au debut creneau | PAYMENT_GATEWAY | CONSUMER_RECEIVABLE | Rs 150 |
| Repartition commission | PAYMENT_GATEWAY | BIENBON_REVENUE | Rs 37.50 |
| Repartition partenaire | PAYMENT_GATEWAY | PARTNER_PAYABLE:partner_123 | Rs 112.50 |
| Reversement mensuel | PARTNER_PAYABLE:partner_123 | PAYMENT_GATEWAY | Rs 112.50 |

**Exemple : remboursement partiel Rs 75 sur reclamation :**

| Evenement | Debit | Credit | Montant |
|-----------|-------|--------|---------|
| Remboursement consommateur | REFUND_PAYABLE | PAYMENT_GATEWAY | Rs 75 |
| Ajustement commission | BIENBON_REVENUE | REFUND_PAYABLE | Rs 18.75 |
| Ajustement partenaire | PARTNER_PAYABLE:partner_123 | REFUND_PAYABLE | Rs 56.25 |

**Avantages** :
- **Auditabilite totale** : chaque roupie est tracable de bout en bout
- **Equilibre garanti** : la somme des debits = la somme des credits (invariant verifiable par une requete SQL)
- **Immuabilite** : les corrections se font par des ecritures compensatoires, jamais par des UPDATEs
- Les releves de reversement sont simplement la somme des ecritures du compte `PARTNER_PAYABLE:partner_X` sur le mois
- Le CA plateforme est la somme du compte `BIENBON_REVENUE`
- La reconciliation avec Peach Payments se fait en comparant le solde du compte `PAYMENT_GATEWAY` avec l'extract Peach
- Prepare l'eventuel audit comptable ou reglementaire

**Inconvenients** :
- Plus complexe a implementer (couche d'abstraction ledger necessaire)
- Requetes un peu plus verbeuses pour les cas simples
- Overhead cognitif pour l'equipe (comprendre la comptabilite en partie double)

#### Option D3 : Service "wallet" interne

**Description** : Un systeme de wallet interne ou chaque acteur (consommateur, partenaire, BienBon) a un solde virtuel. Les paiements alimentent le wallet, les retraits le debitent.

**Avantages** :
- Remboursements instantanes (credit wallet interne)
- Possibilite d'un wallet BienBon pour les consommateurs (credit utilisable pour les prochains achats)

**Inconvenients** :
- **Reglementation** : un wallet interne est potentiellement un service de monnaie electronique, reglemente par la Bank of Mauritius
- Complexite disproportionnee pour le MVP
- Probleme de retrait : les consommateurs veulent leur argent, pas du credit BienBon
- Risque de fraude supplementaire (manipulation de soldes)

### Evaluation ledger

| Critere (poids) | D1 : Transaction log | D2 : Double-entry | D3 : Wallet interne |
|-----------------|:--------------------:|:------------------:|:-------------------:|
| Auditabilite / reconciliation (30%) | 3 | 5 | 4 |
| Simplicite d'implementation (25%) | 5 | 3 | 2 |
| Generation des releves (US-A028) (20%) | 3 | 5 | 4 |
| Conformite reglementaire (15%) | 3 | 5 | 2 |
| Flexibilite (10%) | 3 | 4 | 5 |
| **Score pondere** | **3.55** | **4.40** | **3.15** |

---

## Decision recommandee

### Synthese des choix

| Decision | Choix | Justification |
|----------|-------|---------------|
| **Gateway** | **Peach Payments unique (A1)** | Seul provider qui integre nativement cartes + MCB Juice + Blink + MauCAS en une seule API. PCI DSS Level 1. Presence locale a Maurice. |
| **Pre-autorisation** | **Hybride (B1)** | Auth/capture pour cartes, debit immediat pour mobile money. Exploite les capacites reelles de chaque methode. |
| **Moment de capture** | **Debut du creneau de retrait (C1)** | Aligne avec les specs. Job CRON fiabilise avec BullMQ + retry. |
| **Ledger** | **Double-entry bookkeeping (D2)** | Auditabilite totale, reconciliation native, releves de reversement "gratuits" par requete. Le surcout d'implementation est raisonnable et se rentabilise des que les flux financiers sont en production. |
| **Conformite PCI** | **SAQ-A via Hosted Checkout / COPYandPAY** | BienBon ne touche jamais les donnees de carte. Peach Payments gere la tokenisation. |
| **Payouts partenaires** | **Virement bancaire mensuel (hors Peach)** | Les reversements mensuels sont des virements bancaires manuels ou semi-automatiques. Peach Payments Payouts peut etre envisage en Phase 2 pour automatiser. |

### Pourquoi Peach Payments et pas une abstraction maison ?

La decouverte cle de cette recherche est que **MCB Juice, Blink et my.t money n'ont pas d'API publique developer-accessible en direct**. Ils sont accessibles uniquement a travers des gateways partenaires (Peach Payments, potentiellement MIPS). Construire des adaptateurs directs est tout simplement impossible.

Peach Payments est le choix naturel car :
1. Il couvre **toutes les methodes exigees** en une seule integration
2. Il gere **PCI DSS, tokenisation, webhooks** de facon unifiee
3. Il a une **presence physique a Maurice** et des partenariats directs avec MCB et Emtel
4. Sa **documentation developer** est moderne et complete (REST API, Postman collections, sandbox)
5. Il offre le **Hosted Checkout** qui minimise le scope PCI pour BienBon

### Pourquoi le modele hybride de pre-autorisation ?

Le modele hybride (B1) est le seul qui respecte a la fois les contraintes techniques (pas de PA mobile money) et les promesses UX des specs ("le montant sera bloque mais pas debite" pour les cartes). Le fallback en debit immediat pour le mobile money est le pattern standard de l'industrie (c'est ce que Too Good To Go fait dans les marches ou le mobile money est utilise).

**Mise a jour des specs recommandee** : les US-C032, US-C033, US-C034 doivent etre ajustees pour remplacer "La pre-autorisation est effectuee via l'API [wallet]" par "Le paiement est effectue immediatement via [wallet]. En cas d'annulation avant le creneau, un remboursement est initie."

Le message UI pour le mobile money doit aussi etre ajuste : au lieu de "Le montant sera bloque mais pas debite", afficher "Le paiement sera effectue immediatement. Annulation gratuite avec remboursement sous 3-10 jours ouvrables."

### Pourquoi le double-entry bookkeeping ?

Les releves de reversement (US-A028, US-P043) sont le coeur du modele economique de BienBon. Avec un simple log de transactions, generer ces releves necessite des requetes complexes et fragiles. Avec un ledger double-entry :

- Le solde du compte `PARTNER_PAYABLE:partner_X` EST le montant a reverser
- Le solde du compte `BIENBON_REVENUE` EST le CA BienBon
- La reconciliation avec Peach est une simple comparaison de solde
- Les remboursements sont naturellement refletes dans les comptes (ecritures compensatoires)
- L'historique est immuable et auditable

Le surcout d'implementation est estime a **3-5 jours** par rapport a un simple log. C'est un investissement qui se rembourse des le premier mois de facturation.

---

## Architecture technique detaillee

### Schema de base de donnees (simplifie)

```sql
-- ============================================
-- COMPTES DU LEDGER
-- ============================================
CREATE TABLE ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,   -- ex: 'GATEWAY', 'REVENUE', 'PARTNER:uuid'
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('asset', 'liability', 'revenue', 'expense')),
  entity_type VARCHAR(20),            -- 'system', 'partner'
  entity_id UUID,                     -- partner_id pour les comptes partenaires
  currency VARCHAR(3) DEFAULT 'MUR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comptes systeme crees au deploiement :
-- GATEWAY (asset)        : fonds chez Peach Payments
-- REVENUE (revenue)      : commissions BienBon
-- REFUND (liability)     : remboursements a traiter
-- PARTNER:<uuid> (liability) : fonds dus a chaque partenaire

-- ============================================
-- ECRITURES DU LEDGER (immuables)
-- ============================================
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES payment_transactions(id),
  debit_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  credit_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- Pas de updated_at : IMMUABLE
);

-- ============================================
-- TRANSACTIONS DE PAIEMENT
-- ============================================
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  type VARCHAR(20) NOT NULL CHECK (type IN (
    'pre_auth', 'capture', 'debit', 'refund', 'reversal', 'void'
  )),
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'pending', 'processing', 'success', 'failed', 'expired'
  )),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MUR',
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN (
    'card', 'mcb_juice', 'blink', 'maucas'
  )),
  -- Reference Peach Payments
  provider VARCHAR(20) DEFAULT 'peach',
  provider_tx_id VARCHAR(255),
  provider_result_code VARCHAR(20),
  provider_result_description TEXT,
  -- Informations de paiement (tokenisees)
  payment_token VARCHAR(255),           -- token Peach pour le moyen de paiement enregistre
  payment_display VARCHAR(50),          -- "**** 1234" ou "MCB Juice ****5678"
  -- Commission
  commission_rate DECIMAL(5,4),         -- 0.2500 = 25%
  commission_amount DECIMAL(10,2),
  partner_net_amount DECIMAL(10,2),
  fee_minimum_applied BOOLEAN DEFAULT FALSE,
  -- Relations
  consumer_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  parent_tx_id UUID REFERENCES payment_transactions(id), -- pour lier capture->PA, refund->capture
  -- Metadata
  metadata JSONB DEFAULT '{}',
  idempotency_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REMBOURSEMENTS
-- ============================================
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id), -- la tx d'origine (capture ou debit)
  refund_transaction_id UUID REFERENCES payment_transactions(id),           -- la tx de remboursement
  type VARCHAR(20) NOT NULL CHECK (type IN ('full', 'partial')),
  reason VARCHAR(50) NOT NULL CHECK (reason IN (
    'consumer_cancellation', 'partner_cancellation', 'claim_resolution', 'admin_override'
  )),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'initiated', 'processing', 'completed', 'failed'
  )),
  claim_id UUID,                        -- si lie a une reclamation
  initiated_by UUID NOT NULL,           -- admin_id, system, consumer_id
  consumer_notified BOOLEAN DEFAULT FALSE,
  estimated_completion_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MOYENS DE PAIEMENT ENREGISTRES
-- ============================================
CREATE TABLE saved_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id UUID NOT NULL REFERENCES consumers(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('card', 'mcb_juice', 'blink', 'maucas')),
  provider_token VARCHAR(255) NOT NULL,  -- token Peach Payments (registrationId)
  display_name VARCHAR(100) NOT NULL,    -- "Visa **** 1234", "MCB Juice"
  brand VARCHAR(20),                     -- 'visa', 'mastercard' (pour les cartes)
  last_four VARCHAR(4),                  -- 4 derniers chiffres (cartes)
  expiry_month SMALLINT,                -- (cartes)
  expiry_year SMALLINT,                 -- (cartes)
  is_default BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  has_active_preauth BOOLEAN DEFAULT FALSE,  -- empeche la suppression si PA active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(consumer_id, provider_token)
);

-- ============================================
-- INDEX
-- ============================================
CREATE INDEX idx_payment_tx_reservation ON payment_transactions(reservation_id);
CREATE INDEX idx_payment_tx_consumer ON payment_transactions(consumer_id);
CREATE INDEX idx_payment_tx_partner ON payment_transactions(partner_id);
CREATE INDEX idx_payment_tx_status ON payment_transactions(status);
CREATE INDEX idx_payment_tx_provider ON payment_transactions(provider_tx_id);
CREATE INDEX idx_ledger_entries_tx ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_debit ON ledger_entries(debit_account_id);
CREATE INDEX idx_ledger_entries_credit ON ledger_entries(credit_account_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_saved_pm_consumer ON saved_payment_methods(consumer_id);
```

### Module NestJS : architecture des services

```
src/modules/payments/
  payments.module.ts              # Module NestJS, importe les sous-modules

  # --- Orchestration ---
  services/
    payment-orchestrator.service.ts  # Orchestre le flux complet (reserve->pay->capture->refund)
    capture-scheduler.service.ts     # Job CRON : capture au debut des creneaux
    capture-safety-net.service.ts    # Job CRON J+6 : capture les PA residuelles
    refund.service.ts                # Logique de remboursement (declenchement, suivi)

  # --- Gateway Peach Payments ---
  gateway/
    peach-payments.client.ts         # Client HTTP Peach Payments (auth, endpoints)
    peach-payments.mapper.ts         # Mapping Peach -> modele interne
    peach-payments.webhook.ts        # Handler de webhooks Peach
    types/
      peach-payments.types.ts        # Types TypeScript des reponses/requetes Peach

  # --- Ledger ---
  ledger/
    ledger.service.ts                # Operations du ledger double-entry
    ledger.reconciliation.ts         # Reconciliation avec Peach Payments
    accounts.seed.ts                 # Creation des comptes systeme

  # --- Commission ---
  commission/
    commission-calculator.service.ts # Calcul : taux, fee minimum, config par partenaire
    payout-statement.service.ts      # Generation des releves de reversement mensuels

  # --- Stored Payment Methods ---
  stored-methods/
    payment-methods.service.ts       # CRUD des moyens de paiement enregistres
    tokenization.service.ts          # Gestion des tokens Peach

  # --- DTOs & Types ---
  dto/
    create-payment.dto.ts
    refund-request.dto.ts
    payment-response.dto.ts

  # --- Controllers ---
  controllers/
    payments.controller.ts           # POST /payments, POST /payments/:id/refund
    payment-methods.controller.ts    # CRUD /payment-methods
    webhooks.controller.ts           # POST /webhooks/peach (verification signature)
    admin-finance.controller.ts      # GET /admin/finance, POST /admin/payouts
```

### Flux detailles

#### Flux 1 : Reservation avec paiement carte

```
1. Consommateur clique "Confirmer la reservation" (US-C024)
2. Frontend POST /api/payments/authorize
   { reservationId, paymentMethodId, amount: 150, currency: 'MUR' }
3. PaymentOrchestrator:
   a. Verifie le stock en temps reel (US-C025)
   b. Verifie le moyen de paiement (token Peach valide, non expire)
   c. Recupere le registrationId du token enregistre
   d. Appelle Peach Payments POST /v1/payments
      { paymentType: 'PA', amount: 150, currency: 'MUR', registrationId: 'xxx' }
   e. Peach retourne le PA ID + status
   f. Cree payment_transaction (type: 'pre_auth', status: 'success')
   g. Pas d'ecriture ledger (la PA n'est pas un mouvement de fonds)
   h. Decremente le stock du panier
   i. Retourne la confirmation au frontend
4. Consommateur voit l'ecran de confirmation avec QR code et PIN
```

#### Flux 2 : Capture au debut du creneau

```
1. CaptureScheduler (CRON toutes les minutes) :
   a. Requete : SELECT reservations ou pickup_window_start <= NOW()
      AND status = 'reserved' AND payment_status = 'pre_authorized'
   b. Pour chaque reservation :
      - Recupere la PA transaction
      - Determine le type de capture :
        * Carte : POST Peach /v1/payments/{paId} { paymentType: 'CP', amount: 150 }
        * Mobile money : deja debite, marquer comme 'captured'
      - Cree payment_transaction (type: 'capture', status: 'success', parent: PA)
      - Ecritures ledger :
        * GATEWAY debit 150 / CONSUMER_RECEIVABLE credit 150
        * GATEWAY debit 37.50 / REVENUE credit 37.50  (commission 25%)
        * GATEWAY debit 112.50 / PARTNER:xxx credit 112.50 (net partenaire)
      - Met a jour reservation.payment_status = 'captured'
   c. Si echec capture : retry 3x avec backoff, puis alerte admin
```

#### Flux 3 : Annulation consommateur avant le creneau

```
1. Consommateur clique "Annuler la reservation" (US-C027)
2. PaymentOrchestrator:
   a. Verifie que le creneau n'a pas commence
   b. Determine le type d'annulation :
      * Carte (PA en cours) :
        - POST Peach /v1/payments/{paId} { paymentType: 'RV' }
        - Cree payment_transaction (type: 'reversal', parent: PA)
        - Pas d'ecriture ledger (la PA n'avait pas d'ecriture)
        - Cout : Rs 0 (un reversal est gratuit)
      * Mobile money (DB effectue) :
        - POST Peach /v1/payments/{dbId} { paymentType: 'RF', amount: 150 }
        - Cree payment_transaction (type: 'refund', parent: DB)
        - Ecritures ledger compensatoires
        - Cree refund (status: 'initiated', reason: 'consumer_cancellation')
        - Cout : frais de transaction du remboursement
   c. Re-incremente le stock du panier
   d. Met a jour reservation.status = 'cancelled_by_consumer'
   e. Envoie notification push + email
```

#### Flux 4 : Annulation partenaire (US-P029)

```
1. Partenaire clique "Annuler ce panier" avec motif
2. PaymentOrchestrator (en batch pour toutes les reservations du panier) :
   a. Pour chaque reservation active :
      * Carte (PA en cours) : RV (reversal)
      * Carte (deja capturee) : RF (refund)
      * Mobile money (DB effectue) : RF (refund)
   b. Ecritures ledger compensatoires pour chaque remboursement
   c. Notification push + email a chaque consommateur concerne
   d. Trace dans le journal d'activite (admin visible)
3. Le panier est marque "annule par le partenaire"
```

#### Flux 5 : Remboursement sur reclamation (US-C049)

```
1. Admin valide la reclamation et choisit : total ou partiel (montant X)
2. RefundService:
   a. Recupere la transaction capturee (ou debitee) d'origine
   b. POST Peach /v1/payments/{txId} { paymentType: 'RF', amount: X }
   c. Cree payment_transaction (type: 'refund', parent: capture/debit)
   d. Cree refund (status: 'initiated', reason: 'claim_resolution', amount: X)
   e. Ecritures ledger :
      * REFUND debit X / GATEWAY credit X (remboursement sortant)
      * REVENUE debit (X * commission_rate) / REFUND credit ... (ajustement commission)
      * PARTNER:xxx debit (X * (1 - commission_rate)) / REFUND credit ... (ajustement partenaire)
   f. Notification push + email au consommateur (US-C038)
3. Webhook Peach -> met a jour refund.status = 'processing' / 'completed'
4. A chaque changement de statut : notification push au consommateur
```

#### Flux 6 : No-show (US-P031)

```
1. NoShowScheduler (CRON a la fin de chaque creneau) :
   a. Requete : SELECT reservations ou pickup_window_end <= NOW()
      AND status = 'reserved' AND pickup_status IS NULL
   b. Pour chaque reservation non retiree :
      - reservation.status = 'no_show'
      - Pas d'action de paiement (la capture a deja eu lieu au debut du creneau)
      - Le montant est acquis (partenaire et BienBon conservent leur part)
   c. Notification push au partenaire (synthese des no-shows)
```

### Gestion des erreurs de paiement (US-C036)

Le `peach-payments.mapper.ts` mappe les codes de resultat Peach vers des messages utilisateur :

```typescript
const ERROR_MESSAGES: Record<string, PaymentError> = {
  // Carte expiree
  '800.100.151': {
    code: 'CARD_EXPIRED',
    userMessage: 'Votre carte {display} a expire. Veuillez mettre a jour votre carte ou choisir un autre moyen de paiement.',
    actions: ['change_method', 'update_card'],
  },
  // Fonds insuffisants
  '800.100.152': {
    code: 'INSUFFICIENT_FUNDS',
    userMessage: 'Le paiement a ete refuse. Verifiez votre solde ou essayez un autre moyen de paiement.',
    actions: ['change_method'],
  },
  // Carte refusee generique
  '800.100.100': {
    code: 'CARD_DECLINED',
    userMessage: 'Le paiement a ete refuse par votre banque. Veuillez reessayer ou utiliser un autre moyen de paiement.',
    actions: ['retry', 'change_method'],
  },
  // Timeout
  '900.100.100': {
    code: 'TIMEOUT',
    userMessage: 'Le paiement n\'a pas pu aboutir (probleme de connexion). Veuillez reessayer.',
    actions: ['retry'],
  },
  // ... autres codes Peach
};
```

### Webhooks Peach Payments

```typescript
// webhooks.controller.ts
@Post('webhooks/peach')
async handlePeachWebhook(@Body() body: PeachWebhookPayload, @Headers() headers) {
  // 1. Verifier la signature HMAC du webhook
  this.peachClient.verifySignature(body, headers['x-peach-signature']);

  // 2. Idempotence : verifier si le webhook a deja ete traite
  const existing = await this.txRepo.findByProviderTxId(body.id);
  if (existing?.status === body.result.code) return; // deja traite

  // 3. Mettre a jour la transaction
  await this.paymentOrchestrator.handleProviderUpdate({
    providerTxId: body.id,
    status: this.peachMapper.mapStatus(body.result.code),
    resultCode: body.result.code,
    resultDescription: body.result.description,
  });

  // 4. Si c'est un changement de statut de remboursement -> notifier le consommateur (US-C038)
  if (body.paymentType === 'RF') {
    await this.refundService.updateRefundStatus(body.id, body.result.code);
  }
}
```

### Integration Hosted Checkout (PCI SAQ-A)

Pour minimiser le scope PCI, BienBon utilise le **Hosted Checkout** de Peach Payments pour l'ajout de nouvelles cartes et le **COPYandPAY** (widget JavaScript) pour le paiement inline. Les donnees de carte ne transitent jamais par les serveurs BienBon.

```
Consommateur -> [Widget COPYandPAY dans l'app] -> Peach Payments (PCI L1)
                                                        |
                                                   Token retourne
                                                        |
Consommateur <- Token (registrationId) <- App BienBon <-+
                                                        |
App BienBon -> POST /api/payment-methods/save { token } -> Backend BienBon
                                                            (stocke le token, jamais les donnees carte)
```

---

## Consequences

### Positives

1. **Une seule integration** : Peach Payments couvre les 4 methodes de paiement via une seule API REST. L'equipe integre une API, pas quatre.

2. **PCI DSS simplifie** : en utilisant Hosted Checkout / COPYandPAY, BienBon est eligible au SAQ-A (22 exigences au lieu de 300+). Pas besoin de serveurs dans un environnement PCI-certifie.

3. **Reconciliation native** : le ledger double-entry permet de generer les releves de reversement (US-A028, US-P043) par une simple requete sur les comptes partenaires. La reconciliation avec Peach est une comparaison de soldes.

4. **Remboursements traceables** : chaque remboursement est un ensemble d'ecritures compensatoires dans le ledger. Le statut est suivi en temps reel via les webhooks Peach (US-C038).

5. **Modele economique clair** : la commission et le fee minimum sont calcules et enregistres dans le ledger a chaque transaction. Le chiffre d'affaires BienBon est toujours consultable en temps reel (US-A030).

6. **Erreurs de paiement granulaires** : le mapping des codes Peach Payments vers des messages utilisateur localises couvre tous les cas de US-C036.

### Negatives

1. **Dependance a Peach Payments** : si Peach tombe ou change ses conditions, toutes les methodes de paiement sont impactees simultanement. Mitigation : le module `gateway/` est isole derriere une interface. Un changement de provider necessite un nouvel adaptateur, pas une reecriture du metier.

2. **Deux flux de paiement** : le modele hybride (PA pour cartes, DB pour mobile money) cree deux chemins de code avec des comportements differents pour les annulations. Mitigation : l'orchestrateur abstrait cette difference derriere une interface unifiee. Les tests couvrent les deux chemins.

3. **Surcout du ledger double-entry** : ~3-5 jours de developpement supplementaires par rapport a un simple log. Le retour sur investissement est cependant rapide (des le premier releve de reversement).

4. **my.t money via MauCAS QR** : my.t money n'est pas directement integre comme methode de paiement nommee dans Peach Payments. Il est accessible via le QR code MauCAS universel, ce qui change legerement l'experience utilisateur. Mitigation : presenter MauCAS QR comme "my.t money / MauCAS" dans l'interface, ou contacter Peach Payments pour une integration my.t money directe (en cours chez Peach selon les indications).

5. **Remboursement mobile money lent** : un remboursement MCB Juice ou Blink prend 3-10 jours ouvrables (vs quasi-instantane pour un reversal carte). L'experience consommateur est degradee. Mitigation : communiquer clairement les delais (US-C038 le prevoit deja), et encourager l'utilisation de la carte pour les consommateurs qui veulent une annulation sans friction.

---

## Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Peach Payments en panne prolongee (>1h) | Faible | Critique | Monitoring Peach via health checks. Circuit breaker avec message "Paiement temporairement indisponible". File d'attente BullMQ pour les retries. Pas de fallback provider au MVP (le cout de maintenance d'un second provider n'est pas justifie). |
| Peach Payments augmente ses frais significativement | Faible | Eleve | Le module gateway est derriere une interface. Migration vers MIPS ou un autre provider possible en 2-4 semaines. Clause contractuelle a negocier. |
| Les remboursements mobile money echouent | Moyenne | Moyen | Retry automatique 3x avec backoff exponentiel. Si echec definitif : alerte admin + suivi manuel. Table `refunds` avec statut pour le tracking. |
| Le job CRON de capture echoue | Faible | Critique | BullMQ avec retry + dead-letter queue. Monitoring + alerte si une PA a plus de 6 jours sans capture. Job de securite a J+6 en filet de secours. |
| La PA expire (>7 jours) sans capture | Tres faible | Eleve | Le job de securite J+6 capture toutes les PA residuelles. Alert admin si une PA approche J+7. Si expiration quand meme : creer un nouveau debit (DB) pour capturer le montant. |
| Un consommateur conteste un debit mobile money (annulation tardive) | Moyenne | Faible | Politique claire : annulation gratuite avant le creneau, aucun remboursement apres le debut du creneau (sauf reclamation validee). CGV signees a l'inscription. |
| Le ledger double-entry a un bug d'equilibre | Faible | Eleve | Check d'equilibre : `SUM(debits) = SUM(credits)` en base. Job CRON quotidien de verification. Alerte immediate si desequilibre. Toutes les ecritures dans une transaction PostgreSQL atomique. |
| Un partenaire conteste un releve de reversement | Moyenne | Faible | Le ledger est immuable et auditable. Chaque ecriture est liee a une transaction avec un ID Peach Payments. La transparence du releve detaille (US-P044) reduit les disputes. |

---

## Mise a jour des specs requise

Les user stories suivantes doivent etre ajustees suite a cette ADR :

| US | Modification |
|----|-------------|
| US-C032 | Remplacer "La pre-autorisation est effectuee via l'API MCB Juice" par "Le paiement est effectue immediatement via MCB Juice" |
| US-C033 | Remplacer "La pre-autorisation est effectuee via l'API Blink" par "Le paiement est effectue immediatement via Blink" |
| US-C034 | Remplacer "La pre-autorisation est effectuee via l'API my.t money" par "Le paiement est effectue immediatement via MauCAS QR" |
| US-C024 | Ajouter une note : "Pour les paiements par mobile money, le montant est debite immediatement (pas de pre-autorisation). Le message UI est ajuste en consequence." |
| US-C027 | Ajouter une note : "Pour les paiements par mobile money, l'annulation declenche un remboursement (delai 3-10 jours) au lieu d'une simple levee de pre-autorisation." |

---

## Plan de validation

1. **Sandbox Peach Payments (1-2 jours)** : creer un compte sandbox, tester les flux PA, CP, RV, DB, RF pour les cartes. Tester le flux DB pour MCB Juice (sandbox disponible). Verifier les webhooks.
2. **Prototype ledger (1 jour)** : implementer le service ledger avec 3 operations (capture, remboursement, reversement). Verifier l'equilibre comptable sur des scenarios reels.
3. **Prototype capture scheduler (0.5 jour)** : tester le job BullMQ qui capture les PA au debut du creneau, avec retry et alertes.
4. **Contact Peach Payments (en parallele)** : confirmer les tarifs Mauritius, la disponibilite des remboursements pour MCB Juice et Blink, et la possibilite d'une integration my.t money directe.

---

## References

### Documentation Peach Payments
- [Peach Payments Developer Hub](https://developer.peachpayments.com/)
- [Payments API Flows](https://developer.peachpayments.com/docs/payments-api-flows)
- [Payment Methods (Mauritius)](https://developer.peachpayments.com/docs/pp-payment-methods)
- [Card Pre-authorization & Capture](https://developer.peachpayments.com/docs/card-manage-payments)
- [Checkout Refund](https://developer.peachpayments.com/docs/checkout-refund)
- [Peach Payments Tokenisation](https://support.peachpayments.com/support/solutions/articles/47001159225-getting-started-with-tokenisation)
- [Pre-authorization & Capture Scenario](https://support.peachpayments.com/support/solutions/articles/47001240819-pre-authorization-pa-and-capture-cp-scenario)

### Partenariats Peach Payments a Maurice
- [MCB x Peach Payments (MCB Juice e-commerce)](https://mcbgroup.com/news/article/ecommerce-partnership-with-peach-payments-for-mcb-juice)
- [Blink by Emtel x Peach Payments](https://platformafrica.com/2023/04/28/blink-by-emtel-and-peach-payments-bring-instant-contactless-payments-to-online-businesses-in-mauritius/)
- [Peach Payments integre MauCAS QR](https://platformafrica.com/2025/07/14/peach-payments-integrates-maucas-to-empower-online-merchants-to-offer-a-range-of-payments-on-e-commerce-checkout/)
- [Peach Payments expansion Mauritius](https://www.peachpayments.com/scale/peach-payments-mauritius/)
- [MCB Juice 5.0](https://platformafrica.com/2025/09/05/mcb-juice-5-0-a-new-era-for-digital-payments-in-mauritius/)

### Ecosysteme de paiement mauricien
- [MauCAS - Instant Payment System](https://www.transfi.com/blog/mauritiuss-payment-rails-how-they-work---maucas-instant-transfers-digital-wallets)
- [MIPS - Orchestrating Payments in Mauritius](https://www.mips.mu/)
- [Stripe Mauritius availability](https://persuasion-nation.com/is-stripe-available-in-mauritius/)
- [MCB Juice Pricing (SME)](https://www.peachpayments.com/mcb-juice)
- [Blink by Emtel](https://www.peachpayments.com/payment-methods-directory/blink-by-emtel)

### PCI DSS
- [SAQ-A Eligibility (PCI DSS 4.0)](https://hyperproof.io/resource/pci-dss-4-0-update-new-saq-a-eligibility-criteria/)
- [PCI DSS Compliance via Stripe (applicable concepts)](https://stripe.com/guides/pci-compliance)
- [PCI DSS Tokenization Guidelines](https://www.pcisecuritystandards.org/documents/Tokenization_Guidelines_Info_Supplement.pdf)

### User Stories BienBon.mu
- `dev-specs/us/01-consommateur/paiement.md` (US-C031 a US-C038)
- `dev-specs/us/01-consommateur/reservation.md` (US-C024, US-C025, US-C027)
- `dev-specs/us/01-consommateur/reclamations.md` (US-C047, US-C048, US-C049)
- `dev-specs/us/02-partenaire/reservations-retraits.md` (US-P025 a US-P031)
- `dev-specs/us/02-partenaire/facturation-reversements.md` (US-P043 a US-P045)
- `dev-specs/us/03-admin/facturation.md` (US-A027 a US-A030)
