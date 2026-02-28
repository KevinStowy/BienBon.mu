# ADR-007 : Modele de commission, ledger et reconciliation

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-001 (stack backend), ADR-002 (architecture applicative), ADR-005 (architecture de paiement)

---

## Contexte

ADR-005 a decide l'architecture de paiement de BienBon.mu :
- **Gateway** : Peach Payments unique
- **Pre-autorisation** : modele hybride (PA/CP pour cartes, DB pour mobile money)
- **Ledger** : double-entry bookkeeping
- **Payouts** : virements bancaires mensuels

ADR-005 a defini le schema SQL du ledger et les comptes de base (`GATEWAY`, `REVENUE`, `REFUND`, `PARTNER:<uuid>`), mais n'a pas tranche les questions suivantes :
1. Structure detaillee et granularite des comptes du ledger (plan comptable complet)
2. Modele de commission : taux configurable, fee minimum, granularite de configuration
3. Cycle de payout aux partenaires : frequence, seuils, gestion des soldes negatifs
4. Reconciliation entre le ledger interne et Peach Payments
5. Gestion des remboursements en cascade (reclamation -> remboursement -> ajustement commission -> ajustement payout)
6. Reporting financier (releves partenaire, dashboard admin, exports)
7. TVA / taxes mauriciennes et leur impact sur le ledger

Cette ADR repond a ces questions et fournit un modele operationnel complet.

### Pourquoi cette decision est necessaire maintenant

Le modele de commission et le cycle de payout sont au coeur du modele economique de BienBon. Les partenaires signent un contrat avec un taux de commission et un calendrier de reversement. Le schema du ledger, les formules de calcul et les tables SQL doivent etre figes avant le debut du developpement backend, car ils conditionnent :
- Le schema de base de donnees (migrations Prisma)
- Les services NestJS de calcul de commission et de generation des releves
- Les dashboards admin et partenaire
- La conformite fiscale (TVA sur commission)

---

## Recherche : TVA a Maurice

### Taux et seuil d'enregistrement

| Element | Valeur |
|---------|--------|
| Taux standard de TVA | **15%** |
| Seuil d'enregistrement obligatoire | **Rs 3 000 000** (3M MUR) de CA annuel, abaisse depuis le 1er octobre 2025 (ancien seuil : Rs 6M) |
| Declaration | Mensuelle si CA > Rs 10M, trimestrielle sinon |

Sources :
- [MRA - Communique changement seuil VAT (sept. 2025)](https://www.mra.mu/download/VATReg120925.pdf)
- [PwC Mauritius Budget 2025-2026](https://www.pwc.com/mu/en/events/budget/taxation.html)
- [PwC - Mauritius Corporate Other Taxes](https://taxsummaries.pwc.com/mauritius/corporate/other-taxes)

### Application de la TVA a BienBon

**Principe fondamental** : BienBon est un intermediaire de marketplace. BienBon ne vend pas de nourriture -- BienBon fournit un **service d'intermediation** entre le partenaire (vendeur) et le consommateur (acheteur). La supply taxable de BienBon est sa **commission de service**, pas le prix du panier.

| Acteur | Supply taxable | TVA applicable |
|--------|---------------|---------------|
| **Partenaire** (vendeur) | Le panier alimentaire vendu au consommateur | TVA sur le prix du panier **si le partenaire est enregistre a la TVA** (seuil Rs 3M CA). Beaucoup de petits commercants seront sous le seuil. Les produits alimentaires de base sont souvent zero-rated ou exempts (Fifth Schedule du VAT Act). |
| **BienBon** (plateforme) | Le service d'intermediation (commission) | TVA a 15% sur la commission **des que BienBon atteint Rs 3M de CA annuel** (CA = total des commissions, pas total des transactions). |
| **Consommateur** | N/A (il achete un panier) | Le consommateur paie le prix affiche TTC. |

### Decision sur la TVA pour le MVP

**Hypothese de lancement** : BienBon est une startup en demarrage. Le CA en commissions sera tres probablement inferieur a Rs 3M la premiere annee. A titre d'exemple, pour generer Rs 3M de commissions a 25% de taux moyen, il faudrait Rs 12M de ventes de paniers, soit ~80 000 paniers a Rs 150 en moyenne. Ce volume est peu probable la premiere annee sur le marche mauricien.

**Recommandation** :
1. **Phase 1 (lancement)** : BienBon n'est probablement pas enregistre a la TVA. La commission est HT. Le ledger stocke les montants HT.
2. **Phase 2 (croissance, CA > Rs 3M)** : BienBon s'enregistre a la TVA. La commission devient TTC (commission HT + 15% TVA). Le ledger doit pouvoir gerer les deux regimes.
3. **Le schema du ledger est concu DES MAINTENANT pour supporter la TVA**, meme si elle n'est pas activee au lancement. Un champ `vat_rate` et `vat_amount` sont presents dans les ecritures. Un flag `vat_registered` sur la configuration plateforme active le calcul.

**Impact sur le consommateur** : le prix du panier affiche au consommateur est le prix final TTC (TVA incluse si applicable). Le consommateur ne voit jamais de TVA separee. La TVA de BienBon porte sur la commission, pas sur le prix du panier. Donc l'activation de la TVA BienBon n'augmente PAS le prix du panier pour le consommateur -- elle reduit la part nette de BienBon (ou BienBon augmente son taux de commission pour compenser).

---

## Decision 1 : Structure des comptes du ledger

### Plan comptable

Le ledger utilise un plan de comptes a deux niveaux : **comptes systeme** (crees au deploiement, un seul exemplaire) et **comptes entite** (crees dynamiquement, un par partenaire).

```
COMPTES DU LEDGER BIENBON

ACTIFS (normal debit)
  GATEWAY                    Fonds detenus chez Peach Payments
  GATEWAY_FEES               Frais de processing Peach Payments (contra-asset)
  PAYOUT_TRANSIT             Fonds en transit lors des virements de payout

PASSIFS (normal credit)
  PARTNER_PAYABLE:<uuid>     Montant du au partenaire <uuid>
  REFUND_PENDING             Remboursements inities, en attente de confirmation Peach
  VAT_COLLECTED              TVA collectee sur les commissions (quand applicable)

REVENUS (normal credit)
  PLATFORM_REVENUE           Commissions HT percues par BienBon
  PLATFORM_REVENUE_ADJUSTMENT  Ajustements de commission (remboursements)

CHARGES (normal debit)
  PROCESSING_FEES            Frais Peach Payments / frais bancaires
```

### Regles de conception

| Regle | Description |
|-------|-------------|
| **Un compte `PARTNER_PAYABLE` par partenaire** | Cree automatiquement lors de la validation du partenaire. Nom : `PARTNER_PAYABLE:<partner_uuid>`. Le solde de ce compte = le montant exact a reverser. |
| **Pas de compte par consommateur** | Le consommateur n'a pas de compte dans le ledger. Les mouvements consommateur transitent par le compte `GATEWAY` (paiement entrant) et `REFUND_PENDING` (remboursement sortant). |
| **Comptes systeme uniques** | `GATEWAY`, `PLATFORM_REVENUE`, `REFUND_PENDING`, `VAT_COLLECTED`, etc. sont des singletons. |
| **Comptes immuables** | Un compte n'est jamais supprime, meme si le partenaire est desactive. Son solde doit etre a zero pour le desactiver. |

### Pourquoi pas de compte par consommateur ?

Dans un modele de marketplace classique, le consommateur paie, recoit un bien, et c'est termine. Il n'a pas de solde persistant chez BienBon (pas de wallet). Le seul flux consommateur est :
- **Entrant** : paiement (carte ou mobile money) -> `GATEWAY`
- **Sortant** : remboursement -> `GATEWAY` -> moyen de paiement d'origine

Creer un compte par consommateur (potentiellement des milliers) ajouterait de la complexite sans valeur. Si un wallet consommateur est introduit en Phase 2 (credits, cadeaux), on ajoutera alors un type de compte `CONSUMER_WALLET:<uuid>`.

---

## Decision 2 : Modele de commission

### Structure de la commission

Le modele de commission est **configurable a trois niveaux**, du plus general au plus specifique :

```
Niveau 1 : Configuration globale plateforme
  └─ Niveau 2 : Override par partenaire
      └─ Niveau 3 : Override par type de panier (futur, pas au MVP)
```

**Resolution** : pour une transaction donnee, le systeme cherche la commission dans l'ordre :
1. Override du partenaire pour ce type de panier -> si existe, l'utiliser
2. Override global du partenaire -> si existe, l'utiliser
3. Configuration globale plateforme -> valeur par defaut

### Parametres de commission

| Parametre | Description | Valeur par defaut (US-A027) | Configurable par partenaire ? |
|-----------|-------------|:---------------------------:|:----------------------------:|
| `commission_rate` | Taux de commission en % du prix de vente | 25% | Oui (US-A027 : "Les partenaires ayant une configuration specifique ne sont pas affectes par les changements globaux") |
| `fee_minimum` | Commission minimum par **transaction** (plancher en Rs) | Rs 50 | Oui (US-P043 : "fee minimum par transaction (50 Rs par defaut, surchargeable par partenaire)") |

### Formule de calcul

Pour un panier vendu au prix `P` (prix paye par le consommateur) :

```
commission_calculee = P * commission_rate
commission_effective = MAX(commission_calculee, fee_minimum)
net_partenaire = P - commission_effective
```

**Contrainte** : `commission_effective` ne peut jamais depasser `P`. Si `fee_minimum > P`, alors `commission_effective = P` et `net_partenaire = 0`.

### Formule avec TVA (quand BienBon est enregistre a la TVA)

```
commission_effective_ht = MAX(P * commission_rate, fee_minimum)
tva_commission = commission_effective_ht * vat_rate          -- 15% a Maurice
commission_effective_ttc = commission_effective_ht + tva_commission

-- La TVA est prelevee sur la commission BienBon, pas sur le prix du panier
-- Le consommateur paie toujours P (inchange)
-- La TVA est a la charge de BienBon (reduit sa marge) OU reportee dans le taux de commission

net_partenaire = P - commission_effective_ht
-- Le partenaire paie la commission HT, pas TTC
-- BienBon collecte la TVA et la reverse a la MRA
```

**Important** : le `fee_minimum` est exprime en HT. Quand la TVA est active, le plancher effectif pour BienBon (en TTC) est `fee_minimum * 1.15`. Mais pour le calcul du net partenaire, c'est toujours le montant HT qui est deduit.

### Exemples chiffres

#### Exemple 1 : Panier Rs 200, commission 25%, fee minimum Rs 50 (sans TVA)

```
commission_calculee = 200 * 0.25 = Rs 50.00
fee_minimum = Rs 50
commission_effective = MAX(50, 50) = Rs 50.00
net_partenaire = 200 - 50 = Rs 150.00

Resultat : BienBon percoit Rs 50, partenaire percoit Rs 150.
Le fee minimum n'est PAS applique (la commission calculee >= fee minimum).
```

#### Exemple 2 : Panier Rs 150, commission 25%, fee minimum Rs 50 (sans TVA)

```
commission_calculee = 150 * 0.25 = Rs 37.50
fee_minimum = Rs 50
commission_effective = MAX(37.50, 50) = Rs 50.00  (fee minimum applique)
net_partenaire = 150 - 50 = Rs 100.00

Resultat : BienBon percoit Rs 50 (fee minimum), partenaire percoit Rs 100.
```

#### Exemple 3 : Panier Rs 100, commission 25%, fee minimum Rs 50 (sans TVA)

```
commission_calculee = 100 * 0.25 = Rs 25.00
fee_minimum = Rs 50
commission_effective = MAX(25, 50) = Rs 50.00  (fee minimum applique)
net_partenaire = 100 - 50 = Rs 50.00

Resultat : BienBon percoit Rs 50 (fee minimum), partenaire percoit Rs 50.
Note : la commission effective est de 50%, ce qui est eleve.
Le ratio de reduction minimum (US-A027, 50%) garantit que le prix de vente
est deja a au moins -50% de la valeur initiale.
Ex: valeur initiale Rs 200, prix BienBon Rs 100 maximum.
```

#### Exemple 4 : Panier Rs 30, commission 25%, fee minimum Rs 50 (sans TVA)

```
commission_calculee = 30 * 0.25 = Rs 7.50
fee_minimum = Rs 50
commission_effective = MIN(MAX(7.50, 50), 30) = Rs 30.00  (plafonne au prix du panier)
net_partenaire = 30 - 30 = Rs 0.00

Resultat : BienBon percoit Rs 30, partenaire percoit Rs 0.
ALERTE : ce scenario est economiquement non viable pour le partenaire.
Le systeme devrait afficher un avertissement au partenaire lors de la
creation du panier si le fee minimum > prix de vente * seuil_alerte (ex: 60%).
```

#### Exemple 5 : Panier Rs 200, commission 25%, fee minimum Rs 50 (avec TVA 15%)

```
commission_ht = MAX(200 * 0.25, 50) = Rs 50.00
tva_commission = 50 * 0.15 = Rs 7.50
commission_ttc = 50 + 7.50 = Rs 57.50

-- Du point de vue des flux d'argent :
consommateur paie    : Rs 200.00
partenaire recoit    : Rs 150.00  (200 - 50 HT)
BienBon percoit      : Rs 50.00  (commission brute HT)
  dont TVA reversee  : Rs 7.50
  dont marge nette   : Rs 42.50

-- La TVA est prelevee sur la commission de BienBon, pas sur le panier.
-- Le partenaire ne voit pas de changement (il recoit toujours Rs 150).
```

#### Exemple 6 : Partenaire avec taux negocie a 20%, fee minimum Rs 40

```
Panier Rs 150 :
  commission_calculee = 150 * 0.20 = Rs 30.00
  fee_minimum = Rs 40
  commission_effective = MAX(30, 40) = Rs 40.00  (fee minimum applique)
  net_partenaire = 150 - 40 = Rs 110.00

Panier Rs 250 :
  commission_calculee = 250 * 0.20 = Rs 50.00
  fee_minimum = Rs 40
  commission_effective = MAX(50, 40) = Rs 50.00  (taux applique)
  net_partenaire = 250 - 50 = Rs 200.00
```

---

## Decision 3 : Ecritures du ledger par flux

### Flux 1 : Reservation + capture (cas nominal)

**Scenario** : consommateur reserve un panier a Rs 150, commission 25%, fee minimum Rs 50.

#### Phase A : Reservation (PA carte ou DB mobile money)

**Carte (pre-autorisation)** : aucune ecriture ledger. La PA n'est pas un mouvement de fonds (conforme ADR-005).

**Mobile money (debit immediat)** : ecriture de transit dans le ledger au moment du DB :

| # | Debit | Credit | Montant | Description |
|---|-------|--------|---------|-------------|
| 1 | GATEWAY | CONSUMER_HOLDING | Rs 150 | Debit mobile money -- fonds recus, en attente de capture |

> **Nouveau compte : `CONSUMER_HOLDING`** (passif). Les fonds debites par mobile money sont en "holding" jusqu'au debut du creneau de retrait. Ce compte distingue les fonds reserves (qui pourraient etre rembourses) des fonds captures (acquis). A la capture, les fonds sont transferes de `CONSUMER_HOLDING` vers les comptes finaux.

#### Phase B : Capture (debut du creneau de retrait -- job CRON)

**Carte** :

| # | Debit | Credit | Montant | Description |
|---|-------|--------|---------|-------------|
| 1 | GATEWAY | PLATFORM_REVENUE | Rs 50.00 | Commission BienBon (25% de Rs 200, = fee min) |
| 2 | GATEWAY | PARTNER_PAYABLE:xxx | Rs 150.00 | Net partenaire |

> Pour un panier a Rs 200, commission Rs 50, net Rs 150.

**Mobile money** (fonds deja chez Peach -- on transfere du holding) :

| # | Debit | Credit | Montant | Description |
|---|-------|--------|---------|-------------|
| 1 | CONSUMER_HOLDING | PLATFORM_REVENUE | Rs 50.00 | Commission BienBon |
| 2 | CONSUMER_HOLDING | PARTNER_PAYABLE:xxx | Rs 150.00 | Net partenaire |

#### Phase B (variante avec TVA active)

| # | Debit | Credit | Montant | Description |
|---|-------|--------|---------|-------------|
| 1 | GATEWAY | PLATFORM_REVENUE | Rs 43.48 | Commission HT (50 / 1.15) |
| 2 | GATEWAY | VAT_COLLECTED | Rs 6.52 | TVA 15% sur commission |
| 3 | GATEWAY | PARTNER_PAYABLE:xxx | Rs 150.00 | Net partenaire |

> Note : dans ce cas, BienBon declare Rs 43.48 de revenu net et reverse Rs 6.52 de TVA a la MRA. Le partenaire percoit toujours Rs 150.

> Alternative (TVA sur la marge, pas incluse dans le fee minimum) : si le fee minimum de Rs 50 est considere HT, alors la commission HT = Rs 50, TVA = Rs 7.50, et BienBon percoit Rs 50 en revenue + Rs 7.50 en VAT collectee, prelevee sur sa propre marge. Le net partenaire reste Rs 150.

**Decision retenue** : le fee minimum et le taux de commission sont exprimes **HT**. La TVA est calculee en sus et imputee au compte `VAT_COLLECTED`. Le net partenaire est calcule sur la commission HT. Cette approche est la plus simple et la plus transparente pour le partenaire.

### Flux 2 : Annulation consommateur avant le creneau

#### Carte (reversal de PA)

Aucune ecriture ledger. La PA n'avait genere aucune ecriture (conforme ADR-005). Le RV (reversal) est gratuit et ne declenche aucun mouvement de fonds.

#### Mobile money (remboursement du DB)

| # | Debit | Credit | Montant | Description |
|---|-------|--------|---------|-------------|
| 1 | CONSUMER_HOLDING | GATEWAY | Rs 150 | Remboursement mobile money -- liberation des fonds en holding |

> Les fonds sont retournes de `CONSUMER_HOLDING` vers `GATEWAY` (car Peach Payments va effectuer le remboursement a partir des fonds chez le gateway). Le solde de `CONSUMER_HOLDING` revient a zero pour cette reservation.

### Flux 3 : Annulation partenaire (toutes les reservations du panier)

Le partenaire annule son panier. Toutes les reservations actives sont remboursees.

**Pour chaque reservation :**

Si la capture n'a PAS eu lieu (avant le creneau) :
- Carte : reversal (RV) -- aucune ecriture ledger
- Mobile money : memes ecritures que le Flux 2

Si la capture a DEJA eu lieu (creneau en cours ou passe) :
- Remboursement total (voir Flux 5 ci-dessous avec `montant_rembourse = prix total`)

### Flux 4 : No-show

**Aucune action financiere supplementaire.** Le montant a deja ete capture au debut du creneau (Flux 1 Phase B). La commission et le net partenaire sont deja dans le ledger. Le partenaire et BienBon conservent leur part.

Seul changement : `reservation.status = 'no_show'`.

### Flux 5 : Reclamation validee -- remboursement total

**Scenario** : panier Rs 200, commission Rs 50 (25%), net partenaire Rs 150. Le consommateur reclame et l'admin accorde un remboursement total de Rs 200.

| # | Debit | Credit | Montant | Description |
|---|-------|--------|---------|-------------|
| 1 | REFUND_PENDING | GATEWAY | Rs 200.00 | Remboursement consommateur initie |
| 2 | PLATFORM_REVENUE_ADJUSTMENT | REFUND_PENDING | Rs 50.00 | Annulation commission BienBon |
| 3 | PARTNER_PAYABLE:xxx | REFUND_PENDING | Rs 150.00 | Reduction du montant du au partenaire |

**Verification d'equilibre** :
- `REFUND_PENDING` : debite Rs 200, credite Rs 50 + Rs 150 = Rs 200. Solde net = 0. OK.
- `GATEWAY` : credite Rs 200 (l'argent sort de Peach vers le consommateur).
- `PLATFORM_REVENUE_ADJUSTMENT` : debite Rs 50 (BienBon perd sa commission). Ce compte est un contra-revenue qui vient en deduction de `PLATFORM_REVENUE`.
- `PARTNER_PAYABLE:xxx` : debite Rs 150 (le partenaire perd Rs 150 sur son solde a reverser).

### Flux 6 : Reclamation validee -- remboursement partiel

**Scenario** : panier Rs 200, commission Rs 50 (25%), net partenaire Rs 150. L'admin accorde un remboursement partiel de Rs 80.

**Calcul de la repartition** : le remboursement partiel est reparti entre BienBon et le partenaire au prorata de la transaction originale.

```
ratio_commission = commission_effective / prix_panier = 50 / 200 = 0.25
ratio_partenaire = net_partenaire / prix_panier = 150 / 200 = 0.75

ajustement_commission = montant_rembourse * ratio_commission = 80 * 0.25 = Rs 20.00
ajustement_partenaire = montant_rembourse * ratio_partenaire = 80 * 0.75 = Rs 60.00

-- Verification : 20 + 60 = 80. OK.
```

| # | Debit | Credit | Montant | Description |
|---|-------|--------|---------|-------------|
| 1 | REFUND_PENDING | GATEWAY | Rs 80.00 | Remboursement partiel consommateur |
| 2 | PLATFORM_REVENUE_ADJUSTMENT | REFUND_PENDING | Rs 20.00 | Ajustement commission (prorata) |
| 3 | PARTNER_PAYABLE:xxx | REFUND_PENDING | Rs 60.00 | Ajustement net partenaire (prorata) |

**Apres remboursement** :
- BienBon a percu Rs 50 - Rs 20 = Rs 30 de commission nette
- Le partenaire a percu Rs 150 - Rs 60 = Rs 90 de net
- Le consommateur a ete rembourse Rs 80 sur les Rs 200 initiaux

### Flux 6 (variante avec TVA active)

Si la TVA est active, l'ajustement de commission inclut un ajustement de TVA :

```
ajustement_commission_ht = Rs 20.00
ajustement_tva = 20 * 0.15 = Rs 3.00
ajustement_commission_ttc = Rs 23.00
```

| # | Debit | Credit | Montant | Description |
|---|-------|--------|---------|-------------|
| 1 | REFUND_PENDING | GATEWAY | Rs 80.00 | Remboursement partiel consommateur |
| 2 | PLATFORM_REVENUE_ADJUSTMENT | REFUND_PENDING | Rs 20.00 | Ajustement commission HT |
| 3 | VAT_COLLECTED | REFUND_PENDING | Rs 3.00 | Ajustement TVA sur commission |
| 4 | PARTNER_PAYABLE:xxx | REFUND_PENDING | Rs 57.00 | Ajustement net partenaire |

> Note : avec la TVA, le partenaire porte Rs 57 au lieu de Rs 60, car la TVA ajustee (Rs 3) est retiree du pot commun.

### Flux 7 : Payout partenaire (reversement mensuel)

**Scenario** : le 1er du mois, le solde de `PARTNER_PAYABLE:partner_123` est Rs 12 500 (cumulant un mois de transactions nettes et ajustements).

| # | Debit | Credit | Montant | Description |
|---|-------|--------|---------|-------------|
| 1 | PARTNER_PAYABLE:partner_123 | PAYOUT_TRANSIT | Rs 12 500 | Payout initie -- virement en cours |

Quand le virement bancaire est confirme (confirmation manuelle par admin ou webhook bancaire en Phase 2) :

| # | Debit | Credit | Montant | Description |
|---|-------|--------|---------|-------------|
| 2 | PAYOUT_TRANSIT | GATEWAY | Rs 12 500 | Payout confirme -- fonds sortis de Peach/banque |

> Le compte `PAYOUT_TRANSIT` est un passif temporaire qui represente les fonds en cours de transfert. Son solde doit etre a zero une fois que tous les virements sont confirmes. Un solde non-nul dans `PAYOUT_TRANSIT` pendant plus de 5 jours ouvrables declenche une alerte.

### Flux 8 : Frais de processing Peach Payments

Les frais Peach Payments (ex: 2.5% sur les cartes, 1.5% + Rs 3.50 sur MCB Juice) sont enregistres a la reconciliation quotidienne, quand les rapports Peach sont disponibles.

| # | Debit | Credit | Montant | Description |
|---|-------|--------|---------|-------------|
| 1 | PROCESSING_FEES | GATEWAY | Rs X.XX | Frais Peach Payments sur transactions du [date] |

> Les frais de processing sont a la charge de BienBon. Ils sont enregistres dans un compte de charges (`PROCESSING_FEES`). Le net effectif de BienBon est : `PLATFORM_REVENUE - PLATFORM_REVENUE_ADJUSTMENT - PROCESSING_FEES`.

---

## Decision 4 : Cycle de payout aux partenaires

### Frequence et calendrier

| Parametre | Decision | Justification |
|-----------|----------|---------------|
| **Frequence** | **Mensuelle** | Conforme aux specs (US-P043 : "releve de reversement mensuel", US-A028 : "generation automatique le 1er de chaque mois"). Reduit la charge administrative et les frais bancaires. |
| **Date de generation du releve** | **Le 1er du mois suivant** (ou le premier jour ouvrable) | Conforme US-A028. Le releve couvre le mois M-1. |
| **Date de virement** | **Le 5 du mois suivant** (ou le premier jour ouvrable suivant) | Laisse 4 jours pour verification admin et resolution des anomalies. Conforme au mockup US-P043 ("Date de virement : 05/02/2026"). |
| **Seuil minimum de payout** | **Rs 500** | Pas de seuil dans les specs, mais un virement pour Rs 20 est disproportionne (les frais bancaires le mangeraient). Si le solde est < Rs 500, il est reporte au mois suivant. Le partenaire est informe. |
| **Mode de payout** | **Virement bancaire** (transfert batch via portail bancaire) | Phase 1 : l'admin initie les virements manuellement. Phase 2 : automatisation via API bancaire ou Peach Payments Payouts. |

### Diagramme du cycle de payout

```
Mois M (ex: Janvier 2026)
  |
  | [Transactions quotidiennes]
  | Chaque transaction -> ecritures ledger (Flux 1)
  | Remboursements eventuels -> ecritures compensatoires (Flux 5, 6)
  |
  v
1er Fevrier 2026 (J+0) : GENERATION DES RELEVES
  |
  | Job CRON "PayoutStatementGenerator" :
  | 1. Pour chaque partenaire ayant un solde > 0 dans PARTNER_PAYABLE :
  |    a. Calculer le solde au 31/01/2026 23:59:59
  |    b. Si solde < seuil_minimum (Rs 500) :
  |       -> Marquer "Reporte au mois prochain"
  |       -> Notifier le partenaire
  |    c. Si solde >= seuil_minimum :
  |       -> Generer le releve de reversement (PDF)
  |       -> Envoyer par email au partenaire (US-P043)
  |       -> Notifier le partenaire (push + email)
  |    d. Si solde < 0 (cas remboursement > ventes) :
  |       -> Marquer "Solde negatif -- report"
  |       -> Notifier l'admin pour review
  | 2. Generer le recapitulatif admin (US-A028)
  |
  v
2-4 Fevrier : VERIFICATION ADMIN
  |
  | L'admin revoit les releves :
  | - Verifie les anomalies (soldes negatifs, montants eleves)
  | - Corrige les erreurs eventuelles (via ecritures compensatoires)
  | - Valide les virements a effectuer
  |
  v
5 Fevrier (J+4) : EXECUTION DES VIREMENTS
  |
  | L'admin execute les virements bancaires :
  | Phase 1 : Manuellement via le portail bancaire (batch)
  | Phase 2 : Via API bancaire ou Peach Payments Payouts
  |
  | Pour chaque virement :
  | -> Ecriture ledger Flux 7 (PARTNER_PAYABLE -> PAYOUT_TRANSIT)
  | -> Statut releve : "En attente" -> "Vire"
  |
  v
5-10 Fevrier : CONFIRMATION
  |
  | A reception de la confirmation bancaire :
  | -> Ecriture ledger Flux 7 bis (PAYOUT_TRANSIT -> GATEWAY)
  | -> Statut releve : "Vire" -> "Confirme"
  | -> Si echec virement : statut "Erreur", notification admin
  |
  v
Fin du cycle. Le solde PARTNER_PAYABLE est remis a zero
(sauf les transactions de fevrier qui s'accumulent deja).
```

### Gestion des soldes negatifs

Un solde negatif dans `PARTNER_PAYABLE:xxx` survient quand les remboursements d'un mois depassent les ventes nettes. Cela peut arriver si :
- Le partenaire a eu beaucoup d'annulations ou de reclamations validees
- Le partenaire a ete inactif (zero vente) mais des reclamations de mois precedents ont ete validees

**Decision** : le solde negatif est **reporte au mois suivant**. Il est deduit automatiquement des ventes futures. Pas de prelevement direct chez le partenaire.

| Scenario | Solde PARTNER_PAYABLE | Action |
|----------|:---------------------:|--------|
| Solde >= seuil (Rs 500) | Rs 12 500 | Virement normal |
| 0 < Solde < seuil (Rs 500) | Rs 320 | Report au mois suivant. Notification partenaire : "Votre solde de Rs 320 est inferieur au seuil de virement (Rs 500). Il sera reporte au prochain cycle." |
| Solde = 0 | Rs 0 | Aucun releve genere (US-P043 : "Si aucune transaction n'a eu lieu durant le mois, aucun releve n'est genere") |
| Solde < 0 | Rs -250 | Report au mois suivant. Notification admin + partenaire. Le solde negatif sera compense par les ventes du mois suivant. Si le solde est negatif pendant 3 mois consecutifs, l'admin est alerte pour action (desactivation du partenaire, contact commercial). |

### Parametres configurables du payout

| Parametre | Valeur par defaut | Configurable par | Stockage |
|-----------|:-----------------:|:----------------:|----------|
| `payout_frequency` | `monthly` | Admin (global) | `platform_config` |
| `payout_generation_day` | `1` | Admin (global) | `platform_config` |
| `payout_execution_day` | `5` | Admin (global) | `platform_config` |
| `payout_minimum_threshold` | `500` (Rs) | Admin (global) | `platform_config` |
| `negative_balance_alert_months` | `3` | Admin (global) | `platform_config` |

---

## Decision 5 : Reconciliation

### Principes

La reconciliation verifie que le ledger interne BienBon correspond aux mouvements reels chez Peach Payments. Trois niveaux de reconciliation :

| Niveau | Quoi | Quand | Comment |
|--------|------|-------|---------|
| **Temps reel** | Chaque transaction individuelle | A chaque webhook Peach | Comparer le statut/montant du webhook avec la `payment_transaction` en base |
| **Quotidien** | Solde du compte `GATEWAY` vs rapport Peach | Job CRON quotidien a 6h | Telecharger le rapport de settlement Peach Payments (API ou fichier CSV), comparer avec le solde net du compte `GATEWAY` |
| **Mensuel** | Audit complet du ledger | Le 1er du mois avant generation des releves | Verifier l'invariant `SUM(debits) = SUM(credits)`, verifier les soldes de chaque compte, croiser avec l'extract bancaire |

### Reconciliation temps reel (webhook)

```
Webhook Peach Payments recu
  |
  v
1. Verifier la signature HMAC
2. Trouver la payment_transaction par provider_tx_id
3. Comparer :
   - Montant webhook == montant transaction interne ?
   - Statut webhook mappe sur un statut coherent ?
4. Si match -> mettre a jour le statut interne
5. Si divergence :
   a. Logger l'anomalie dans une table `reconciliation_alerts`
   b. Alerter l'admin (notification + email)
   c. NE PAS mettre a jour le ledger automatiquement
   d. L'admin revoit et resout manuellement
```

### Reconciliation quotidienne

```sql
-- Solde theorique du compte GATEWAY dans le ledger
SELECT
  SUM(CASE WHEN debit_account_id = gateway_account_id THEN amount ELSE 0 END) -
  SUM(CASE WHEN credit_account_id = gateway_account_id THEN amount ELSE 0 END)
  AS gateway_balance_ledger
FROM ledger_entries
WHERE created_at < '2026-02-01';

-- Comparer avec le settlement report Peach Payments
-- Difference acceptable : < Rs 1.00 (arrondi centimes)
-- Si difference > Rs 1.00 : alerte reconciliation
```

### Actions en cas de divergence

| Type de divergence | Cause probable | Action |
|-------------------|---------------|--------|
| Transaction dans Peach absente du ledger | Webhook perdu, bug d'ecriture | Creer les ecritures manquantes via un script de correction (ecritures compensatoires, jamais de modification) |
| Transaction dans le ledger absente de Peach | Double ecriture, transaction fantome | Creer des ecritures compensatoires pour annuler les ecritures en trop. Investiguer la cause. |
| Montant divergent | Conversion de devise, arrondi, frais non comptabilises | Creer une ecriture de frais (`PROCESSING_FEES`) ou d'ajustement pour combler la difference |
| Statut divergent | Webhook en retard, timeout | Attendre 24h, puis forcer la mise a jour du statut si le rapport Peach confirme |

### Table `reconciliation_alerts`

```sql
CREATE TABLE reconciliation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'balance_mismatch',       -- solde GATEWAY != settlement Peach
    'transaction_missing',    -- transaction Peach non trouvee dans le ledger
    'transaction_extra',      -- ecriture ledger sans correspondance Peach
    'amount_mismatch',        -- montant divergent sur une transaction
    'status_mismatch',        -- statut divergent
    'ledger_imbalance'        -- SUM(debits) != SUM(credits)
  )),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  details JSONB NOT NULL,     -- provider_tx_id, montant attendu, montant reel, etc.
  payment_transaction_id UUID REFERENCES payment_transactions(id),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,           -- admin_id
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recon_alerts_unresolved ON reconciliation_alerts(resolved, created_at)
  WHERE resolved = FALSE;
```

### Job de verification d'equilibre du ledger

```sql
-- Ce job tourne quotidiennement et verifie l'invariant fondamental
-- de la comptabilite en partie double
SELECT
  SUM(amount) AS total_debits,
  SUM(amount) AS total_credits,
  -- Pour chaque ecriture, le debit et le credit sont le meme montant
  -- L'equilibre est garanti par construction si on utilise toujours des paires
  -- Mais on verifie quand meme par securite :
  (SELECT SUM(amount) FROM ledger_entries) AS total_entries,
  (SELECT COUNT(*) FROM ledger_entries WHERE amount <= 0) AS invalid_entries
FROM ledger_entries;

-- Verification par compte : le solde de chaque compte doit correspondre
-- a la somme de ses debits moins la somme de ses credits
SELECT
  la.id,
  la.code,
  la.name,
  COALESCE(d.total, 0) AS total_debits,
  COALESCE(c.total, 0) AS total_credits,
  COALESCE(d.total, 0) - COALESCE(c.total, 0) AS computed_balance
FROM ledger_accounts la
LEFT JOIN (
  SELECT debit_account_id AS account_id, SUM(amount) AS total
  FROM ledger_entries GROUP BY debit_account_id
) d ON d.account_id = la.id
LEFT JOIN (
  SELECT credit_account_id AS account_id, SUM(amount) AS total
  FROM ledger_entries GROUP BY credit_account_id
) c ON c.account_id = la.id;

-- Invariant global : SUM(tous les soldes debiteurs) = SUM(tous les soldes crediteurs)
-- Autrement dit : Assets + Expenses = Liabilities + Revenue
```

---

## Decision 6 : Reporting financier

### Releve de reversement partenaire (US-P043, US-P044, US-P045)

**Contenu** (conforme aux specs) :

```
RELEVE DE REVERSEMENT
=====================

En-tete :
  - BienBon Ltd, Port-Louis, Ile Maurice, BRN : C07098765
  - Partenaire : [nom], [adresse], BRN : [brn]
  - N° releve : REV-[AAAA]-[MM]-[sequence]
  - Periode : [mois] [annee]

Tableau des transactions :
  Pour chaque transaction capturee sur le mois :
  | Date | Panier | Qte | PU (Rs) | Total brut | Commission | Fee min? | Net |
  Exclure les transactions annulees/remboursees integralement.
  Pour les remboursements partiels : afficher une ligne d'ajustement.

Totaux :
  - Total ventes brutes : Rs X
  - Total commissions : Rs Y (taux % + mention "fee minimum applique sur Z transactions")
  - Total ajustements (remboursements) : Rs -W
  - Montant net reverse : Rs (X - Y - W)
  - Date de virement prevue : JJ/MM/AAAA
  - Coordonnees bancaires : [banque] ****[4 derniers chiffres]

Si TVA active :
  - Total commission HT : Rs Y
  - TVA (15%) : Rs V
  - Total commission TTC : Rs (Y + V)
  - Note : "TVA applicable sur la commission BienBon uniquement"

Informations complementaires :
  - Taux de commission applicable : X% (ou "taux specifique : X%")
  - Fee minimum par transaction : Rs F
  - "Comment sont calculees les commissions ? -> aide.bienbon.mu/commissions"
```

**Format de sortie** :
- Affichage web dans le dashboard partenaire (US-P043, US-P044)
- Export PDF telechargeale (US-P045)
- Envoi par email en piece jointe PDF (US-A028)

**Nom du fichier PDF** : `BienBon_Reversement_[AAAA-MM]_[NomCommerce].pdf` (conforme US-P045)

### Dashboard financier admin (US-A030)

**Metriques** :
- CA total (somme des transactions capturees) : `SUM(amount) FROM payment_transactions WHERE type IN ('capture', 'debit') AND status = 'success'`
- Revenu BienBon (commissions) : solde du compte `PLATFORM_REVENUE` - solde du compte `PLATFORM_REVENUE_ADJUSTMENT`
- Marge moyenne : revenu BienBon / CA total
- Nombre de transactions
- Montant moyen par transaction
- Total remboursements : somme des montants rembourses
- Total payouts effectues : somme des virements confirmes
- Solde en attente de reversement : somme des soldes `PARTNER_PAYABLE:*`

**Filtres** : par periode (aujourd'hui, semaine, mois, trimestre, annee, personnalise), par partenaire.

**Repartition par partenaire** : tableau triable par CA, nombre de transactions, commissions, montant en attente de reversement.

**Export** : CSV (toutes les donnees filtrables), PDF (resume mensuel).

### Requetes SQL pour le reporting

```sql
-- CA mensuel + commissions + net partenaire (agrege)
SELECT
  DATE_TRUNC('month', pt.created_at) AS mois,
  COUNT(*) AS nb_transactions,
  SUM(pt.amount) AS ca_brut,
  SUM(pt.commission_amount) AS total_commissions,
  SUM(pt.partner_net_amount) AS total_net_partenaires,
  SUM(CASE WHEN pt.fee_minimum_applied THEN 1 ELSE 0 END) AS nb_fee_minimum_applique,
  AVG(pt.commission_amount / NULLIF(pt.amount, 0) * 100) AS taux_commission_effectif_moyen
FROM payment_transactions pt
WHERE pt.type IN ('capture', 'debit')
  AND pt.status = 'success'
GROUP BY DATE_TRUNC('month', pt.created_at)
ORDER BY mois DESC;

-- Solde de chaque partenaire (montant a reverser)
SELECT
  la.entity_id AS partner_id,
  la.code,
  COALESCE(c.total, 0) - COALESCE(d.total, 0) AS balance  -- passif = credit - debit
FROM ledger_accounts la
LEFT JOIN (
  SELECT credit_account_id, SUM(amount) AS total
  FROM ledger_entries GROUP BY credit_account_id
) c ON c.credit_account_id = la.id
LEFT JOIN (
  SELECT debit_account_id, SUM(amount) AS total
  FROM ledger_entries GROUP BY debit_account_id
) d ON d.debit_account_id = la.id
WHERE la.code LIKE 'PARTNER_PAYABLE:%';

-- Detail des transactions d'un partenaire sur un mois (pour le releve)
SELECT
  pt.created_at,
  r.basket_title,
  r.quantity,
  pt.amount AS prix_vente,
  pt.commission_rate,
  pt.commission_amount,
  pt.fee_minimum_applied,
  pt.partner_net_amount
FROM payment_transactions pt
JOIN reservations r ON r.id = pt.reservation_id
WHERE pt.partner_id = :partner_id
  AND pt.type IN ('capture', 'debit')
  AND pt.status = 'success'
  AND pt.created_at >= :debut_mois
  AND pt.created_at < :fin_mois
ORDER BY pt.created_at;
```

---

## Decision 7 : Gestion des remboursements post-payout

### Probleme

Si un remboursement est accorde **apres** que le payout du mois a ete effectue, BienBon a deja vire le net au partenaire. Comment recuperer la part du partenaire ?

### Decision : deduction sur le prochain payout

```
Scenario :
  - Janvier : panier Rs 200 capture. Net partenaire Rs 150.
  - 5 Fevrier : payout de janvier effectue. Le partenaire recoit Rs 150 (entre autres).
  - 15 Fevrier : reclamation validee. Remboursement total Rs 200.

Ecritures au 15 Fevrier :
  REFUND_PENDING debit Rs 200 / GATEWAY credit Rs 200
  PLATFORM_REVENUE_ADJUSTMENT debit Rs 50 / REFUND_PENDING credit Rs 50
  PARTNER_PAYABLE:xxx debit Rs 150 / REFUND_PENDING credit Rs 150

Resultat :
  Le solde de PARTNER_PAYABLE:xxx est maintenant NEGATIF de Rs 150
  (car les Rs 150 du payout de janvier ont deja ete virees).

  Au payout de fevrier, le solde negatif sera automatiquement deduit :
  Si le partenaire a genere Rs 2 000 de net en fevrier :
    Solde = Rs 2 000 - Rs 150 = Rs 1 850 a virer.

  Le releve de fevrier affichera :
    Total ventes nettes fevrier : Rs 2 000
    Ajustement remboursement (reclamation #XYZ) : -Rs 150
    Montant net reverse : Rs 1 850
```

**Aucun prelevement direct** sur le compte bancaire du partenaire. BienBon absorbe le risque temporaire et compense sur le prochain payout.

Si le partenaire quitte la plateforme avec un solde negatif, c'est une perte pour BienBon (a gerer par les conditions contractuelles -- le contrat partenaire doit prevoir une clause de retention ou de compensation).

---

## Schema SQL complet du ledger

Ce schema **complete et raffine** le schema de ADR-005. Les tables `payment_transactions`, `refunds` et `saved_payment_methods` sont deja definies dans ADR-005 et ne sont pas repetees ici.

```sql
-- ============================================
-- COMPTES DU LEDGER (complete ADR-005)
-- ============================================
CREATE TABLE ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('asset', 'liability', 'revenue', 'expense')),
  normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  entity_type VARCHAR(20) CHECK (entity_type IN ('system', 'partner')),
  entity_id UUID,                     -- partner_id pour les comptes PARTNER_PAYABLE
  currency VARCHAR(3) DEFAULT 'MUR',
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comptes systeme (seed au deploiement)
INSERT INTO ledger_accounts (code, name, type, normal_balance, entity_type, description) VALUES
  ('GATEWAY',                    'Fonds Peach Payments',             'asset',     'debit',  'system', 'Fonds detenus chez le payment gateway (Peach Payments)'),
  ('CONSUMER_HOLDING',           'Fonds consommateurs en attente',   'liability', 'credit', 'system', 'Fonds debites par mobile money, en attente de capture (avant debut du creneau)'),
  ('PLATFORM_REVENUE',           'Commissions BienBon',              'revenue',   'credit', 'system', 'Commissions HT percues sur les transactions capturees'),
  ('PLATFORM_REVENUE_ADJUSTMENT','Ajustements de commission',        'revenue',   'debit',  'system', 'Contra-revenue : commissions annulees suite a des remboursements'),
  ('VAT_COLLECTED',              'TVA collectee',                    'liability', 'credit', 'system', 'TVA collectee sur les commissions (quand BienBon est enregistre TVA)'),
  ('REFUND_PENDING',             'Remboursements en attente',        'liability', 'credit', 'system', 'Remboursements inities, en attente de confirmation'),
  ('PAYOUT_TRANSIT',             'Payouts en transit',               'liability', 'credit', 'system', 'Fonds en cours de virement vers les partenaires'),
  ('PROCESSING_FEES',            'Frais de processing',              'expense',   'debit',  'system', 'Frais Peach Payments et frais bancaires');

-- Les comptes PARTNER_PAYABLE:<uuid> sont crees dynamiquement :
-- INSERT INTO ledger_accounts (code, name, type, normal_balance, entity_type, entity_id)
-- VALUES ('PARTNER_PAYABLE:' || partner_id, 'Partenaire - ' || partner_name,
--         'liability', 'credit', 'partner', partner_id);

-- ============================================
-- ECRITURES DU LEDGER (complete ADR-005)
-- ============================================
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL,               -- regroupe les ecritures d'une meme operation
  transaction_id UUID REFERENCES payment_transactions(id),  -- nullable pour les ecritures manuelles (frais, corrections)
  sequence_number BIGINT NOT NULL,        -- numero sequentiel global (audit trail)
  debit_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  credit_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'MUR',
  -- TVA
  vat_rate DECIMAL(5,4) DEFAULT 0,        -- 0.1500 = 15%, 0 si pas de TVA
  vat_amount DECIMAL(10,2) DEFAULT 0,
  -- Metadata
  description TEXT NOT NULL,
  entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN (
    'capture',                -- capture de paiement (carte ou mobile money)
    'commission',             -- prelevement de commission
    'partner_credit',         -- credit du net partenaire
    'holding_debit',          -- debit mobile money en attente
    'holding_release',        -- liberation du holding (capture ou annulation)
    'refund_consumer',        -- remboursement consommateur
    'refund_commission_adj',  -- ajustement commission suite a remboursement
    'refund_partner_adj',     -- ajustement net partenaire suite a remboursement
    'refund_vat_adj',         -- ajustement TVA suite a remboursement
    'payout_initiate',        -- initiation de payout partenaire
    'payout_confirm',         -- confirmation de payout partenaire
    'processing_fee',         -- frais de processing gateway
    'manual_adjustment'       -- correction manuelle (admin)
  )),
  reservation_id UUID,                    -- denormalise pour faciliter les requetes par reservation
  partner_id UUID,                        -- denormalise pour faciliter les requetes par partenaire
  created_by VARCHAR(50) DEFAULT 'system', -- 'system', 'cron:capture', 'admin:<uuid>'
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- PAS de updated_at : les ecritures sont IMMUABLES
);

-- Sequence globale pour le numero d'audit
CREATE SEQUENCE ledger_entry_seq;

-- ============================================
-- CONFIGURATION DES COMMISSIONS
-- ============================================
CREATE TABLE commission_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('global', 'partner', 'partner_basket_type')),
  partner_id UUID,                        -- NULL si scope = 'global'
  basket_type_id UUID,                    -- NULL si scope != 'partner_basket_type' (futur)
  commission_rate DECIMAL(5,4) NOT NULL,  -- 0.2500 = 25%
  fee_minimum DECIMAL(10,2) NOT NULL,     -- Rs 50
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,               -- NULL = toujours actif
  created_by UUID NOT NULL,               -- admin_id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  CONSTRAINT valid_rate CHECK (commission_rate >= 0 AND commission_rate <= 1),
  CONSTRAINT valid_fee CHECK (fee_minimum >= 0)
);

-- Index pour la resolution de la commission
CREATE INDEX idx_commission_global ON commission_configs(scope, effective_from)
  WHERE scope = 'global' AND effective_to IS NULL;
CREATE INDEX idx_commission_partner ON commission_configs(partner_id, scope, effective_from)
  WHERE scope = 'partner' AND effective_to IS NULL;

-- ============================================
-- RELEVES DE REVERSEMENT (PAYOUT STATEMENTS)
-- ============================================
CREATE TABLE payout_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_number VARCHAR(30) UNIQUE NOT NULL,  -- REV-2026-01-0042
  partner_id UUID NOT NULL,
  period_start DATE NOT NULL,             -- premier jour du mois
  period_end DATE NOT NULL,               -- dernier jour du mois
  -- Montants agreges
  total_sales_gross DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_commission DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_vat_on_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_refunds DECIMAL(12,2) NOT NULL DEFAULT 0,       -- montant total rembourse aux consommateurs
  total_commission_adjustments DECIMAL(12,2) NOT NULL DEFAULT 0, -- commission annulee
  total_partner_adjustments DECIMAL(12,2) NOT NULL DEFAULT 0,    -- net partenaire annule
  net_payout_amount DECIMAL(12,2) NOT NULL,               -- montant a virer
  previous_balance DECIMAL(12,2) NOT NULL DEFAULT 0,      -- report du mois precedent (si < seuil ou negatif)
  -- Commission applicable
  commission_rate DECIMAL(5,4) NOT NULL,
  fee_minimum DECIMAL(10,2) NOT NULL,
  fee_minimum_applied_count INT NOT NULL DEFAULT 0,
  -- Statut
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'draft',        -- en cours de generation
    'generated',    -- genere, en attente de validation
    'validated',    -- valide par l'admin
    'payout_initiated', -- virement initie
    'paid',         -- virement confirme
    'error',        -- erreur de virement
    'deferred'      -- reporte (sous seuil ou solde negatif)
  )),
  -- Virement
  payout_date DATE,                       -- date de virement prevue
  payout_executed_at TIMESTAMPTZ,         -- date de virement effectif
  payout_reference VARCHAR(100),          -- reference bancaire
  bank_account_display VARCHAR(50),       -- "MCB ****1234"
  -- PDF
  pdf_url TEXT,                           -- URL du PDF genere (Supabase Storage)
  -- Audit
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, period_start)        -- un seul releve par partenaire par mois
);

-- Detail des transactions du releve
CREATE TABLE payout_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES payout_statements(id),
  payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id),
  reservation_id UUID NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL,
  basket_title VARCHAR(200) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,    -- quantite * prix unitaire
  commission_rate DECIMAL(5,4) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  fee_minimum_applied BOOLEAN DEFAULT FALSE,
  net_amount DECIMAL(10,2) NOT NULL,      -- gross - commission
  line_type VARCHAR(20) NOT NULL CHECK (line_type IN (
    'sale',           -- transaction normale
    'refund_full',    -- remboursement total
    'refund_partial', -- remboursement partiel (ajustement)
    'adjustment'      -- correction manuelle
  )),
  refund_id UUID REFERENCES refunds(id),  -- si type = refund_*
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONFIGURATION PLATEFORME (PARAMETRES FINANCIERS)
-- ============================================
CREATE TABLE platform_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  value_type VARCHAR(20) NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valeurs par defaut
INSERT INTO platform_config (key, value, value_type, description) VALUES
  ('commission_rate_default', '0.25', 'number', 'Taux de commission global par defaut (25%)'),
  ('fee_minimum_default', '50', 'number', 'Fee minimum par transaction par defaut (Rs 50)'),
  ('reduction_ratio_minimum', '0.50', 'number', 'Ratio de reduction minimum (50%)'),
  ('payout_frequency', 'monthly', 'string', 'Frequence des payouts'),
  ('payout_generation_day', '1', 'number', 'Jour de generation des releves (1er du mois)'),
  ('payout_execution_day', '5', 'number', 'Jour d''execution des virements (5 du mois)'),
  ('payout_minimum_threshold', '500', 'number', 'Seuil minimum de payout (Rs 500)'),
  ('vat_registered', 'false', 'boolean', 'BienBon est-il enregistre a la TVA ?'),
  ('vat_rate', '0.15', 'number', 'Taux de TVA applicable (15%)'),
  ('negative_balance_alert_months', '3', 'number', 'Nombre de mois de solde negatif avant alerte');

-- ============================================
-- ALERTES DE RECONCILIATION
-- ============================================
CREATE TABLE reconciliation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'balance_mismatch',
    'transaction_missing',
    'transaction_extra',
    'amount_mismatch',
    'status_mismatch',
    'ledger_imbalance'
  )),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  details JSONB NOT NULL,
  payment_transaction_id UUID REFERENCES payment_transactions(id),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEX SUPPLEMENTAIRES
-- ============================================
CREATE INDEX idx_ledger_entries_journal ON ledger_entries(journal_id);
CREATE INDEX idx_ledger_entries_type ON ledger_entries(entry_type);
CREATE INDEX idx_ledger_entries_partner ON ledger_entries(partner_id, created_at);
CREATE INDEX idx_ledger_entries_reservation ON ledger_entries(reservation_id);
CREATE INDEX idx_ledger_entries_date ON ledger_entries(created_at);
CREATE INDEX idx_payout_statements_partner ON payout_statements(partner_id, period_start);
CREATE INDEX idx_payout_statements_status ON payout_statements(status);
CREATE INDEX idx_payout_statement_lines_stmt ON payout_statement_lines(statement_id);
CREATE INDEX idx_recon_alerts_unresolved ON reconciliation_alerts(resolved, created_at)
  WHERE resolved = FALSE;
```

---

## Module NestJS : architecture des services

Ce module **complete** le module `payments/` defini dans ADR-005 en ajoutant les sous-modules commission, payout et reconciliation.

```
src/modules/payments/
  # --- Services existants (ADR-005) ---
  services/
    payment-orchestrator.service.ts
    capture-scheduler.service.ts
    refund.service.ts
  gateway/
    peach-payments.client.ts
    peach-payments.webhook.ts

  # --- NOUVEAUX : Commission ---
  commission/
    commission-calculator.service.ts    # Resolution de la config + calcul
    commission-config.service.ts        # CRUD des configs (global, par partenaire)
    commission-config.controller.ts     # POST /admin/commission-config

  # --- NOUVEAUX : Ledger ---
  ledger/
    ledger.service.ts                   # Operations atomiques du ledger (writeEntries)
    ledger-accounts.service.ts          # Gestion des comptes (creation, soldes)
    ledger-balance.service.ts           # Calcul des soldes en temps reel
    ledger-audit.service.ts             # Job CRON d'audit d'equilibre
    ledger.seed.ts                      # Seed des comptes systeme

  # --- NOUVEAUX : Payout ---
  payout/
    payout-statement.service.ts         # Generation des releves mensuels
    payout-statement-pdf.service.ts     # Generation PDF (via @react-pdf ou pdfmake)
    payout-execution.service.ts         # Initiation et confirmation des virements
    payout-scheduler.service.ts         # Job CRON : generation le 1er du mois
    payout.controller.ts                # GET /admin/payouts, POST /admin/payouts/:id/execute

  # --- NOUVEAUX : Reconciliation ---
  reconciliation/
    reconciliation.service.ts           # Reconciliation quotidienne (Peach vs ledger)
    reconciliation-scheduler.service.ts # Job CRON quotidien
    reconciliation-alert.service.ts     # Gestion des alertes
    reconciliation.controller.ts        # GET /admin/reconciliation/alerts

  # --- NOUVEAUX : Reporting ---
  reporting/
    finance-dashboard.service.ts        # Metriques pour le dashboard admin (US-A030)
    partner-finance.service.ts          # Metriques pour le dashboard partenaire
    finance-export.service.ts           # Export CSV / PDF
    reporting.controller.ts             # GET /admin/finance/dashboard, GET /partner/finance
```

### Service de calcul de commission

```typescript
// commission-calculator.service.ts (pseudo-code)

interface CommissionResult {
  rate: number;              // 0.25
  calculatedAmount: number;  // 37.50
  feeMinimum: number;        // 50
  feeMinimumApplied: boolean; // true
  effectiveAmount: number;    // 50 (apres fee minimum)
  vatRate: number;            // 0.15 ou 0
  vatAmount: number;          // 7.50 ou 0
  partnerNetAmount: number;   // 100
}

async calculateCommission(
  partnerId: string,
  saleAmount: number,
  basketTypeId?: string,
): Promise<CommissionResult> {
  // 1. Resoudre la config (partner override > global)
  const config = await this.resolveCommissionConfig(partnerId, basketTypeId);

  // 2. Calculer la commission
  const calculatedAmount = saleAmount * config.commissionRate;
  const feeMinimumApplied = calculatedAmount < config.feeMinimum;
  const effectiveAmount = Math.min(
    Math.max(calculatedAmount, config.feeMinimum),
    saleAmount  // ne jamais depasser le prix du panier
  );

  // 3. Calculer la TVA si applicable
  const platformConfig = await this.getPlatformConfig();
  const vatRate = platformConfig.vatRegistered ? platformConfig.vatRate : 0;
  const vatAmount = roundToTwo(effectiveAmount * vatRate);

  // 4. Net partenaire
  const partnerNetAmount = roundToTwo(saleAmount - effectiveAmount);

  return {
    rate: config.commissionRate,
    calculatedAmount: roundToTwo(calculatedAmount),
    feeMinimum: config.feeMinimum,
    feeMinimumApplied,
    effectiveAmount: roundToTwo(effectiveAmount),
    vatRate,
    vatAmount,
    partnerNetAmount,
  };
}
```

### Service d'ecriture du ledger

```typescript
// ledger.service.ts (pseudo-code)

interface LedgerEntryInput {
  debitAccountCode: string;
  creditAccountCode: string;
  amount: number;
  description: string;
  entryType: string;
  vatRate?: number;
  vatAmount?: number;
}

// Toutes les ecritures d'une operation sont ecrites atomiquement
// dans une seule transaction PostgreSQL
async writeEntries(
  journalId: string,
  transactionId: string | null,
  entries: LedgerEntryInput[],
  metadata: { reservationId?: string; partnerId?: string; createdBy: string },
): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    for (const entry of entries) {
      const debitAccount = await tx.ledgerAccounts.findUnique({
        where: { code: entry.debitAccountCode },
      });
      const creditAccount = await tx.ledgerAccounts.findUnique({
        where: { code: entry.creditAccountCode },
      });

      if (!debitAccount || !creditAccount) {
        throw new Error(`Account not found: ${entry.debitAccountCode} or ${entry.creditAccountCode}`);
      }

      const seqNumber = await tx.$queryRaw`SELECT nextval('ledger_entry_seq')`;

      await tx.ledgerEntries.create({
        data: {
          journalId,
          transactionId,
          sequenceNumber: seqNumber,
          debitAccountId: debitAccount.id,
          creditAccountId: creditAccount.id,
          amount: entry.amount,
          description: entry.description,
          entryType: entry.entryType,
          vatRate: entry.vatRate ?? 0,
          vatAmount: entry.vatAmount ?? 0,
          reservationId: metadata.reservationId,
          partnerId: metadata.partnerId,
          createdBy: metadata.createdBy,
        },
      });
    }
  });
}
```

---

## Synthese des parametres configurables

| Parametre | Valeur par defaut | Niveau de config | Description |
|-----------|:-----------------:|:----------------:|-------------|
| `commission_rate_default` | 25% | Global (admin) | Taux de commission par defaut |
| `fee_minimum_default` | Rs 50 | Global (admin) | Fee minimum par transaction |
| `reduction_ratio_minimum` | 50% | Global (admin) | Ratio de reduction minimum pour publier un panier |
| Commission par partenaire | -- | Par partenaire (admin) | Override du taux et/ou du fee minimum |
| `payout_frequency` | Mensuel | Global (admin) | Frequence des payouts |
| `payout_generation_day` | 1 | Global (admin) | Jour de generation des releves |
| `payout_execution_day` | 5 | Global (admin) | Jour d'execution des virements |
| `payout_minimum_threshold` | Rs 500 | Global (admin) | Seuil minimum de payout |
| `vat_registered` | false | Global (admin) | BienBon enregistre a la TVA ? |
| `vat_rate` | 15% | Global (admin) | Taux de TVA |
| `negative_balance_alert_months` | 3 | Global (admin) | Alerte apres N mois de solde negatif |

---

## Consequences

### Positives

1. **Modele de commission transparent et flexible** : le systeme supporte un taux global avec override par partenaire, un fee minimum, et est prepare pour un override par type de panier en Phase 2. Les formules sont claires et les exemples chiffres couvrent tous les cas.

2. **Ledger complet et auditable** : le plan de comptes couvre tous les flux financiers (capture, remboursement, commission, TVA, payout, frais de processing). Chaque roupie est tracable de bout en bout. L'invariant comptable (debits = credits) est verifiable par un job automatique.

3. **Reconciliation a trois niveaux** : temps reel (webhook), quotidienne (settlement Peach vs ledger), mensuelle (audit complet). Les divergences sont detectees, alertees et tracees.

4. **TVA-ready des le jour 1** : le schema supporte la TVA meme si elle n'est pas activee au lancement. L'activation se fait par un flag de configuration, sans migration de schema.

5. **Remboursements post-payout resolus** : la deduction sur le prochain payout est un pattern standard de l'industrie (utilise par Too Good To Go, Uber Eats, Deliveroo). Simple a implementer, pas de prelevement a gerer.

6. **Releves de reversement conformes** : le schema `payout_statements` + `payout_statement_lines` mappe directement sur les exigences des US-P043, US-P044, US-P045 et US-A028.

### Negatives

1. **Complexite du ledger** : 8 types de comptes, 13 types d'ecritures, des ecritures atomiques en transaction PostgreSQL. L'equipe doit comprendre la comptabilite en partie double. Mitigation : documentation interne, exemples chiffres, tests exhaustifs.

2. **Risque du fee minimum eleve** : avec un fee minimum a Rs 50 et des paniers a Rs 30-50, certains partenaires pourraient percevoir Rs 0 par transaction. Mitigation : avertissement au partenaire lors de la creation du panier si le fee minimum represente > 60% du prix de vente. Le ratio de reduction minimum (50%) limite deja les paniers trop bon marche.

3. **Solde negatif non recouvrable** : si un partenaire quitte avec un solde negatif, BienBon absorbe la perte. Mitigation : clause contractuelle de compensation. Alerte a 3 mois de solde negatif pour agir en amont.

4. **Payout mensuel = tresorerie mobilisee** : BienBon detient les fonds des partenaires pendant 1 a 5 semaines. C'est un avantage de tresorerie pour BienBon mais un inconvenient pour les partenaires (surtout les petits commercants). Mitigation : le payout mensuel est le standard de l'industrie. Un payout hebdomadaire pourra etre envisage en Phase 2 si la demande est forte (le schema le supporte via `payout_frequency`).

---

## Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Le fee minimum rend certains paniers non rentables pour les partenaires | Moyenne | Moyen | Alerte visuelle lors de la creation du panier. L'admin peut ajuster le fee minimum par partenaire. Documentation claire dans l'aide contextuelle (US-P012). |
| Erreur de calcul de commission (arrondi, race condition) | Faible | Eleve | Tous les montants en `DECIMAL(12,2)`. Arrondi `ROUND_HALF_UP` systematique. Tests unitaires avec des dizaines de cas limites. Le ledger est la source de verite, pas les champs de `payment_transactions`. |
| Le job CRON de generation des releves echoue le 1er du mois | Faible | Moyen | BullMQ avec retry + dead-letter queue. Possibilite de generation manuelle par l'admin (US-A028). Monitoring + alerte. |
| La reconciliation detecte une anomalie majeure (ecart > Rs 10 000) | Faible | Critique | Alerte immediate a l'admin (email + Slack). Blocage automatique des payouts en attente jusqu'a resolution. Procedure d'escalade documentee. |
| Un partenaire a un solde negatif persistant (> 3 mois) | Faible | Moyen | Alerte automatique a l'admin. Contact commercial avec le partenaire. En dernier recours, desactivation du partenaire et passage en recouvrement (clause contractuelle). |
| BienBon depasse Rs 3M de CA et doit s'enregistrer a la TVA | Moyenne (a 2-3 ans) | Moyen | Le schema est TVA-ready. L'activation est un flag de configuration. Un comptable mauricien doit etre consulte pour la mise en conformite (declaration MRA, facturation). L'impact sur les partenaires est nul (la TVA porte sur la commission BienBon). |
| Un litige comptable avec un partenaire sur un releve de reversement | Moyenne | Faible | Le ledger est immuable et auditable. Chaque ecriture est liee a une transaction Peach Payments avec un ID unique. Le releve detaille (US-P044) montre chaque transaction. En cas de litige, l'admin peut regenerer le releve a partir du ledger. |

---

## Plan de validation

1. **Prototype du service de commission (1 jour)** : implementer `CommissionCalculatorService` avec les cas : taux global, override partenaire, fee minimum, fee minimum > prix du panier. Tests unitaires couvrant les 6 exemples chiffres de cette ADR.

2. **Prototype du ledger (2 jours)** : implementer `LedgerService.writeEntries()` avec les 8 flux decrits. Verifier l'equilibre comptable apres chaque operation. Test de bout en bout : reservation -> capture -> remboursement partiel -> payout -> verification que tous les comptes sont equilibres.

3. **Prototype de generation de releve (1 jour)** : implementer `PayoutStatementService` qui genere un releve a partir des ecritures du ledger. Verifier que le total correspond au solde du compte `PARTNER_PAYABLE:xxx`.

4. **Prototype de reconciliation (1 jour)** : implementer le job quotidien qui compare le solde `GATEWAY` avec un fichier CSV de test (simulant un settlement report Peach).

5. **Consultation comptable (en parallele)** : consulter un expert-comptable mauricien pour valider :
   - Le traitement TVA sur la commission (commission HT + TVA en sus)
   - Le format des releves de reversement (conformite legale)
   - Les obligations declaratives quand BienBon atteindra le seuil de Rs 3M

---

## References

### ADRs BienBon
- ADR-001 : Choix de la stack backend (NestJS + Prisma + PostgreSQL)
- ADR-002 : Architecture applicative
- ADR-005 : Architecture de paiement (Peach Payments, modele hybride, ledger double-entry)

### User Stories BienBon
- US-A027 : Configurer les parametres globaux de commission
- US-A028 : Generer les releves de reversement mensuels
- US-A029 : Historique des reversements par partenaire
- US-A030 : Chiffre d'affaires total de la plateforme
- US-P043 : Consulter le releve de reversement mensuel
- US-P044 : Detail des transactions du reversement
- US-P045 : Telecharger le releve au format PDF
- US-C049 : Recevoir la resolution de ma reclamation (remboursement)

### TVA Maurice
- [MRA - Communique changement seuil VAT (sept. 2025)](https://www.mra.mu/download/VATReg120925.pdf)
- [PwC Mauritius Budget 2025-2026 Taxation](https://www.pwc.com/mu/en/events/budget/taxation.html)
- [PwC - Mauritius Corporate Other Taxes](https://taxsummaries.pwc.com/mauritius/corporate/other-taxes)
- [MRA - VAT Information Leaflet (produits exempts)](https://www.mra.mu/download/VATLeaflet1-301214.pdf)
- [MRA - VAT FAQ (sept. 2025)](https://www.mra.mu/download/VATFAQs.pdf)
- [Mauritius VAT on foreign digital services (Jan 2026)](https://www.vatcalc.com/mauritius/mauritius-vat-on-foreign-digital-services/)
- [VAT Act Mauritius (consolidated Jan 2026)](https://www.mra.mu/download/VATAct.pdf)

### Double-entry bookkeeping dans les systemes de paiement
- [Uber Engineering: Double-Entry Bookkeeping at Scale](https://www.uber.com/blog/accounting/)
- [Square: How We Built a Ledger](https://developer.squareup.com/blog/books-an-immutable-double-entry-accounting-database-service/)
- [Modern Treasury: What is Double-Entry Accounting?](https://www.moderntreasury.com/learn/double-entry-accounting)
- [Stripe: Financial Accounting for Developers](https://stripe.com/guides/accounting-for-developers)
