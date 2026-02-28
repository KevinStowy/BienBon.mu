# ADR-019 : Detection de fraude et suspension automatique

| Champ         | Valeur                                                      |
|---------------|-------------------------------------------------------------|
| **Statut**    | Propose                                                     |
| **Date**      | 2026-02-27                                                  |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                         |
| **Decideurs** | Equipe technique BienBon                                    |
| **Scope**     | Detection de fraude, suspension automatique, alertes admin, compteurs, device fingerprinting |
| **Prereqs**   | ADR-001 (stack backend), ADR-003 (schema DB), ADR-005 (paiement), ADR-008 (stock/double-booking), ADR-011 (RBAC), ADR-014 (notifications), ADR-017 (state machines), ADR-022 (securite OWASP) |
| **Refs**      | US-A038, US-A039, US-A040, US-A041, US-A020, US-A021, US-A022, US-C060 |

---

## 1. Contexte

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice (1.3M habitants). Comme toute marketplace, elle est exposee a des comportements frauduleux ou abusifs de la part des deux cotes du marche :

**Cote consommateur :**
- No-shows repetitifs (reserve puis ne se presente pas -- le partenaire a prepare un panier pour rien)
- Reclamations systematiques pour obtenir des remboursements abusifs
- Creation de faux comptes pour exploiter le programme de parrainage (US-C060)
- Reservation/annulation repetitive pour bloquer le stock malveillantement
- Reservation repetee sans finalisation du paiement (hold expiration attack : le stock est bloque 5 min a chaque tentative, cf. ADR-008)
- Exploitation du programme de parrainage avec rafales de parrainages et filleuls fantomes

**Cote partenaire :**
- Gonflement artificiel de la valeur initiale (prix barre gonfle pour donner l'illusion d'une meilleure affaire)
- Annulations en masse de paniers ayant des reservations
- Taux de reclamations anormalement eleve (problemes de qualite recurrents)
- Creneaux de retrait incoherents avec les horaires d'ouverture

**Risques plateforme :**
- Pics d'echecs de paiement (probleme de provider ou attaque)
- Pic de no-shows (probleme systemique ou bug)
- Inscriptions en masse depuis un meme device/IP (bots)
- Indisponibilite d'un partenaire majeur (impact business)
- Abus specifiques au mobile money : remboursements en rafale (debit immediat puis annulation), velocity anormale sur les wallets (MCB Juice, Blink, my.t money)

### 1.1 Pourquoi cette decision est necessaire maintenant

Les ADR precedentes ont pose les bases :
- **ADR-003** definit la table `fraud_alerts` et les cles `app_settings` pour les seuils (`fraud_noshow_threshold`, `fraud_claim_threshold`, etc.)
- **ADR-011** definit les permissions `fraud:view`, `fraud:investigate`, `fraud:merge_accounts`
- **ADR-014** definit le canal de notification admin
- **ADR-017** mentionne un `effects.incrementFraudCounter` dans la transition `READY -> NO_SHOW` et un `FraudHandler` qui enqueue un job BullMQ `fraud-check`

Mais **aucune ADR ne formalise** :
- Quel moteur de regles utiliser et comment les regles sont evaluees
- Comment les compteurs sont maintenus (Redis ? SQL ? Table dediee ?)
- Quelles regles declenchent une suspension automatique vs une alerte manuelle
- Le flow complet de suspension automatique (notification, annulation des reservations en cours, appel)
- La strategie de device fingerprinting et ses implications DPA
- Les seuils par defaut et la fenetre temporelle de chaque regle
- Le flow d'appel/reactivation apres suspension automatique

### 1.2 Volumetrie et calibrage

| Metrique | Estimation (an 1) | Estimation (an 3) |
|----------|:------------------:|:------------------:|
| Reservations/jour | 100 - 500 | 500 - 2 000 |
| No-shows/jour | 5 - 25 (5-10%) | 25 - 100 |
| Reclamations/jour | 2 - 10 (2-5%) | 10 - 50 |
| Inscriptions/jour | 20 - 100 | 50 - 200 |
| Parrainages/semaine | 10 - 50 | 50 - 200 |
| Partenaires actifs | 50 - 150 | 200 - 500 |
| Evaluations de regles/jour | 200 - 1 000 | 1 000 - 5 000 |

**Implication** : ces volumes sont faibles. Un moteur de regles sophistique (ML, scoring temps reel, streaming) serait disproportionne. La solution doit etre simple, configurable, et tournee vers la minimisation des faux positifs.

---

## 2. Questions a trancher

| # | Question |
|---|----------|
| Q1 | Moteur de regles : code en dur, regles configurables en base, moteur externe, ou ML ? |
| Q2 | Quand evaluer les regles : temps reel, batch, ou hybride ? |
| Q3 | Comment maintenir les compteurs et fenetres temporelles ? |
| Q4 | Quelles regles declenchent une suspension automatique vs une alerte manuelle ? |
| Q5 | Quelle strategie de device fingerprinting, et quelles implications DPA ? |

---

## Q1 : Moteur de regles

### Option A : Regles codees en dur (if/then dans le service NestJS)

```typescript
// fraud.service.ts
async checkNoShowRule(consumerId: string) {
  const stats = await this.getConsumerStats(consumerId, 30); // 30 jours
  if (stats.noShowRate > 0.40 && stats.totalReservations >= 10) {
    await this.createAlert('NO_SHOW_RECURRENT', 'consumer', consumerId, stats);
  }
}
```

**Avantages :**
- Zero complexite additionnelle
- Testable unitairement
- Performant (pas de deserialisation JSON, pas d'interpretation de regles)

**Inconvenients :**
- Chaque changement de regle necessite un redeploy
- L'admin ne peut pas ajuster les seuils sans intervention technique
- Rigide : ajouter une nouvelle regle = modifier le code

### Option B : Regles configurables en base (table `fraud_rules` + seuils dans `app_settings`)

```typescript
// Structure d'une regle en base
interface FraudRule {
  id: string;
  slug: string;                    // 'no_show_recurrent', 'claim_abuse', ...
  actor_type: 'consumer' | 'partner';
  metric: string;                  // 'no_show_rate', 'claim_rate', ...
  operator: 'gt' | 'lt' | 'gte' | 'lte';
  threshold: number;               // 0.40
  window_days: number;             // 30
  min_sample_size: number;         // 10 (minimum de reservations pour evaluer)
  action: 'alert' | 'auto_suspend';
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_active: boolean;
  cooldown_hours: number;          // eviter les alertes en boucle
}
```

L'admin edite les seuils et fenetres depuis le backoffice. Le code generique evalue les regles :

```typescript
async evaluateRules(actorType: string, actorId: string, metric: string) {
  const rules = await this.getRulesForMetric(actorType, metric);
  for (const rule of rules) {
    const value = await this.computeMetric(actorId, rule.metric, rule.window_days);
    const sampleSize = await this.getSampleSize(actorId, rule.window_days);
    if (sampleSize < rule.min_sample_size) continue; // pas assez de donnees
    if (this.compare(value, rule.operator, rule.threshold)) {
      if (!await this.isInCooldown(rule.id, actorId, rule.cooldown_hours)) {
        await this.executeAction(rule, actorId, value);
      }
    }
  }
}
```

**Avantages :**
- L'admin peut ajuster les seuils, fenetres, et niveaux d'action sans redeploy (conforme US-A038/A039/A041)
- Le `min_sample_size` protege contre les faux positifs (un consommateur avec 1 reservation et 1 no-show n'est pas flagge a 100% de no-show)
- Le `cooldown_hours` evite le spam d'alertes
- Les regles peuvent etre desactivees individuellement
- Evolutif : ajouter un nouveau type de regle = ajouter une ligne en base + une fonction de calcul de metrique

**Inconvenients :**
- Plus complexe a implementer que le code en dur
- Les regles complexes (patterns multi-metriques, correlations) ne sont pas exprimables dans un format aussi simple
- L'admin pourrait configurer des regles incoherentes (seuil a 0%, fenetre de 0 jours)

### Option C : Moteur de regles externe (json-rules-engine)

Utiliser une librairie comme `json-rules-engine` qui permet de definir des regles en JSON avec des conditions composees (AND/OR), des operateurs multiples, et un systeme d'evenements.

**Avantages :**
- Regles composees (ex: "no-show > 40% ET plus de 3 no-shows ET inscrit depuis moins de 7 jours")
- Separation complete entre la logique de regles et le code applicatif
- Format JSON standardise

**Inconvenients :**
- **Dependance externe pour un besoin simple.** La librairie `json-rules-engine` est maintenue par un seul contributeur principal. Le risque d'abandon est non negligeable.
- **Surcharge cognitive** : les regles JSON composees sont difficiles a debugger et a comprendre pour un admin non-technique
- **Les regles composees ne sont pas necessaires au lancement.** Les US-A038 a A041 decrivent des regles simples (seuil sur une metrique, fenetre temporelle). Les correlations multi-metriques sont un besoin futur.
- **Performance identique** a l'option B pour les volumes BienBon (la librairie n'apporte pas d'optimisation pertinente)

### Option D : ML / scoring

Un modele de machine learning qui attribue un score de risque a chaque acteur.

**Avantages :**
- Detection de patterns subtils non previsibles par des regles statiques
- Adaptation automatique aux evolutions de comportement

**Inconvenients :**
- **Completement disproportionne.** Avec 100-500 reservations/jour, il n'y a pas assez de donnees pour entrainer un modele pertinent. Le ratio signal/bruit serait catastrophique.
- **Boite noire** : impossible d'expliquer a un consommateur suspendu pourquoi il a ete flagge (obligation de transparence DPA)
- **Cout de maintenance** : un modele ML necessite un pipeline de donnees, un entrainement regulier, un monitoring de drift. C'est un projet en soi.
- **Faux positifs probables** : sur un petit echantillon, un modele ML surevalue les outliers

### Evaluation Q1

| Critere (poids) | A : Code en dur | B : Regles en base | C : json-rules-engine | D : ML |
|-----------------|:---------------:|:-------------------:|:---------------------:|:------:|
| Configurabilite admin (30%) | 1 | 5 | 4 | 1 |
| Simplicite d'implementation (25%) | 5 | 3 | 2 | 1 |
| Protection faux positifs (20%) | 3 | 5 | 5 | 2 |
| Maintenabilite (15%) | 4 | 4 | 3 | 1 |
| Evolutivite (10%) | 2 | 4 | 5 | 5 |
| **Score pondere** | **2.85** | **4.30** | **3.55** | **1.55** |

### Decision Q1 : Option B -- Regles configurables en base

**Justification** : Les specs exigent explicitement que les seuils soient configurables par l'admin (US-A038 : "seuils de detection configurables dans les parametres de la plateforme"). Le code en dur (option A) ne satisfait pas cette exigence. Le moteur externe (option C) est une dependance inutile pour des regles simples. Le ML (option D) est absurde pour la volumetrie. L'option B offre le meilleur equilibre entre simplicite et configurabilite.

**Garde-fous contre les faux positifs :**
- `min_sample_size` : une regle ne se declenche que si l'acteur a un minimum d'activite
- `cooldown_hours` : pas de double alerte pour le meme acteur et la meme regle dans la fenetre
- Validation en code : l'admin ne peut pas configurer un seuil a 0% ou une fenetre de 0 jours

---

## Q2 : Quand evaluer les regles

### Option A : Temps reel pur (a chaque evenement)

Chaque evenement metier (no-show, reclamation, inscription, annulation) declenche immediatement l'evaluation de toutes les regles pertinentes.

**Avantages :**
- Detection immediate
- Pas de latence entre le comportement suspect et l'alerte

**Inconvenients :**
- Ajoute de la latence a chaque transition de la state machine (meme si c'est async via BullMQ, le job doit etre enqueue)
- Les metriques "ratio" (no-show/reservations) necessitent une requete SQL a chaque evenement
- Les patterns coordonnes (meme device, meme IP) sont difficiles a detecter evenement par evenement

### Option B : Batch pur (CRON periodique)

Un job CRON (ex: toutes les 15 min ou toutes les heures) scanne la base, recalcule les metriques de tous les acteurs, et genere les alertes.

**Avantages :**
- Simple a implementer (un seul job qui fait tout)
- Pas d'impact sur la latence des transactions

**Inconvenients :**
- Latence de detection (jusqu'a 15-60 min)
- Les alertes de seuil temps reel (US-A041 : "pic de no-shows sur les 3 dernieres heures") sont approximatives
- Le scan de tous les acteurs a chaque iteration est inefficace si la majorite n'a pas change

### Option C : Hybride -- compteurs temps reel + analyse batch

**Temps reel (via BullMQ, sur evenement) :**
- Les compteurs simples sont incrementes/mis a jour dans Redis
- Les regles a seuil absolu (ex: "5 inscriptions en 10 min depuis meme IP") sont evaluees immediatement
- Les suspensions automatiques (no-show count >= N) sont evaluees immediatement

**Batch (CRON toutes les 15 min) :**
- Les metriques de ratio (no_show_rate, claim_rate) sont recalculees depuis la base PostgreSQL
- Les patterns coordonnes (device fingerprint, IP) sont analyses
- Les metriques partenaire (gonflement prix, annulations avec reservations) sont analysees
- Les alertes de seuil plateforme (pic de no-shows, pic de reclamations) sont evaluees

```
Evenement metier          BullMQ job temps reel        CRON batch (15 min)
(no-show, claim, etc.)    (compteurs Redis,            (ratios SQL,
                           regles a seuil absolu)       patterns, alertes
                                                        plateforme)
         │                         │                         │
         ▼                         ▼                         ▼
   state machine             fraud-check               fraud-batch
   (ADR-017)                (BullMQ worker)            (BullMQ repeatable)
         │                         │                         │
         └──── enqueue ───────────►│                         │
                                   │                         │
                                   ├── increment compteur    │
                                   ├── evaluer regles        │
                                   │   a seuil absolu        │
                                   │                         │
                                   ▼                         ▼
                              ┌──────────────────────────────────┐
                              │   fraud_alerts (PostgreSQL)       │
                              │   + notifications admin           │
                              │   + suspension auto si applicable │
                              └──────────────────────────────────┘
```

**Avantages :**
- Detection immediate pour les cas urgents (suspension automatique, alertes de seuil)
- Pas de surcharge sur la base pour les metriques de ratio (calcul batch, pas a chaque evenement)
- Les patterns coordonnes sont mieux detectes en batch (vue d'ensemble)
- Compatible avec l'architecture BullMQ deja en place (ADR-014)

**Inconvenients :**
- Deux mecanismes d'evaluation a maintenir (temps reel + batch)
- La latence batch de 15 min est acceptable pour les ratios, mais les alertes de seuil plateforme pourraient beneficier d'un mecanisme Redis Pub/Sub

### Decision Q2 : Option C -- Hybride

**Justification** : L'approche hybride est la seule qui satisfait les deux types de detection requis par les specs : les suspensions automatiques qui doivent etre immediates (US-A020 : "3 no-shows en 30 jours -> suspension") et les metriques de ratio qui necessitent un calcul sur un historique (US-A038 : "ratio no-shows/reservations sur les 10 dernieres reservations"). Le batch pur serait trop lent pour les suspensions ; le temps reel pur serait trop couteux pour les ratios.

---

## Q3 : Compteurs et fenetres temporelles

### Option A : Requetes SQL a chaque evaluation

```sql
-- Compter les no-shows sur les 30 derniers jours
SELECT COUNT(*) FROM reservations
WHERE consumer_id = $1
  AND status = 'no_show'
  AND no_show_at >= NOW() - INTERVAL '30 days';
```

**Avantages :**
- Source de verite unique (la base de donnees)
- Pas de synchronisation Redis <-> PostgreSQL
- Les fenetres glissantes sont naturelles (filtre sur `created_at`)

**Inconvenients :**
- Requete SQL a chaque evaluation en temps reel (ajout de latence)
- Charge sur PostgreSQL pour les evaluations frequentes

### Option B : Compteurs Redis (sorted sets)

```typescript
// A chaque no-show, ajouter un membre au sorted set avec le timestamp comme score
await redis.zadd(`fraud:noshow:${consumerId}`, Date.now(), reservationId);

// Pour evaluer : compter les membres dans la fenetre
const windowStart = Date.now() - 30 * 24 * 60 * 60 * 1000;
const count = await redis.zcount(`fraud:noshow:${consumerId}`, windowStart, '+inf');
```

**Avantages :**
- Lecture en O(log N), tres rapide
- Les fenetres glissantes sont naturelles avec les sorted sets
- Pas de charge sur PostgreSQL pour les evaluations temps reel

**Inconvenients :**
- **Double source de verite** : si Redis crashe ou perd des donnees, les compteurs sont faux. Il faut un mecanisme de reconciliation.
- Surcout memoire Redis (chaque acteur a N sorted sets, un par metrique)
- Complexite de nettoyage (TTL sur les sorted sets, ou purge des anciens membres)

### Option C : Hybride -- Redis pour le temps reel, SQL pour le batch

- **Temps reel** : les compteurs absolus (nombre de no-shows, nombre d'inscriptions depuis meme IP) sont maintenus dans Redis via sorted sets. Ils sont utilises pour les regles a seuil absolu et les suspensions automatiques.
- **Batch** : les metriques de ratio (no_show_rate, claim_rate) sont calculees en SQL a chaque iteration du CRON. PostgreSQL est la source de verite.
- **Reconciliation** : le batch CRON reconcilie les compteurs Redis avec la base a chaque iteration (ecrase le compteur Redis par le calcul SQL). Cela garantit que meme en cas de perte Redis, les compteurs sont corrects apres le prochain batch.

### Decision Q3 : Option C -- Hybride Redis + SQL

**Justification** : Coherent avec la decision Q2. Redis offre la vitesse necessaire pour les evaluations temps reel (suspension automatique apres un no-show). PostgreSQL reste la source de verite pour les calculs de ratio. La reconciliation batch toutes les 15 minutes elimine le risque de desynchronisation durable.

**Estimation memoire Redis** : avec 50 000 consommateurs et 3 sorted sets par consommateur (no-shows, claims, cancellations), chaque sorted set contenant en moyenne 5 membres : 50 000 * 3 * 5 * ~100 octets = ~75 MB. C'est negligeable.

---

## Q4 : Suspension automatique vs alerte manuelle

### Principe de categorisation

La categorisation d'une regle (auto-suspension vs alerte) depend de deux criteres :

1. **Confiance du signal** : le signal est-il un fait objectif mesurable (nombre de no-shows) ou une interpretation (gonflement de prix) ?
2. **Urgence** : le comportement cause-t-il un dommage immediat (blocage de stock) ou un prejudice differe (fausse bonne affaire) ?

| Confiance \ Urgence | Urgente | Differee |
|---------------------|---------|----------|
| **Haute** (fait objectif) | Suspension automatique | Alerte haute priorite |
| **Basse** (interpretation) | Alerte critique | Alerte standard |

### Categorisation des regles

| Regle | Signal | Confiance | Urgence | Action |
|-------|--------|-----------|---------|--------|
| No-shows recurrents (consommateur) | Nombre absolu de no-shows dans la fenetre | Haute | Urgente | **Auto-suspension** |
| Reservation/annulation repetitive | Nombre absolu d'annulations dans la fenetre | Haute | Urgente | **Auto-suspension** |
| Inscriptions en masse (meme IP/device) | Nombre d'inscriptions dans une courte fenetre | Haute | Urgente | **Auto-suspension** des comptes crees |
| Holds expires repetitifs (hold expiration attack) | Nombre de holds expires (ADR-008, transition R3) | Haute | Urgente | **Alerte** (>3) puis **blocage reservation** (>5, cooldown 30 min) |
| Rafale de parrainages | Nombre de parrainages emis en 24h | Haute | Urgente | **Blocage parrainage** |
| Pattern remboursement mobile money | Annulations systematiques post-debit mobile money | Haute | Differee | **Alerte haute** |
| Velocity mobile money | Volume anormal de transactions mobile money en 1h | Haute | Urgente | **Alerte critique** |
| Reclamations systematiques | Ratio reclamations/retraits | Haute | Differee | **Alerte haute** |
| Abus de remboursements | Nombre de remboursements dans la fenetre | Haute | Differee | **Alerte haute** |
| Comptes multiples (meme device) | Fingerprint match | Moyenne | Differee | **Alerte standard** |
| Gonflement prix partenaire | Ecart par rapport a la moyenne du type de commerce | Basse | Differee | **Alerte standard** |
| Annulations partenaire avec reservations | Ratio annulations/publications | Haute | Urgente | **Alerte critique** (pas d'auto-suspension car impact trop large) |
| Taux de reclamations partenaire | Ratio reclamations/retraits | Haute | Differee | **Alerte haute** |
| Horaires incoherents partenaire | Creneau hors horaires d'ouverture | Basse | Differee | **Alerte standard** |
| Pic de no-shows plateforme | Taux global > seuil | Haute | Urgente | **Alerte critique** (plateforme, pas individuel) |
| Pic de reclamations plateforme | Nombre global > seuil | Haute | Urgente | **Alerte critique** |
| Pic d'echecs de paiement | Nombre global > seuil | Haute | Urgente | **Alerte critique** |
| Chute de reservations | Comparaison semaine precedente | Moyenne | Urgente | **Alerte critique** |
| Indisponibilite partenaire majeur | Pas de panier publie depuis N jours | Moyenne | Differee | **Alerte standard** |

**Principe** : seules les regles a **haute confiance ET urgentes** declenchent une suspension automatique, et uniquement cote consommateur. Les partenaires ne sont **jamais** suspendus automatiquement car l'impact (annulation de toutes les reservations en cours, perte de revenus) est trop eleve pour un faux positif. Un partenaire suspect recoit une alerte critique que l'admin doit traiter manuellement.

### Decision Q4 : Categorisation ci-dessus

**Justification** : Le risque d'un faux positif sur un partenaire (annulation de dizaines de reservations, perte de revenus, atteinte a la reputation) est disproportionne par rapport au gain de temps de l'auto-suspension. Pour le consommateur, le risque d'un faux positif est limite (il ne peut plus reserver temporairement, mais il n'y a pas de perte financiere). La reactivation est rapide (US-A021) et le consommateur est notifie.

---

## Q5 : Device fingerprinting et DPA

### Donnees collectees

| Donnee | Finalite | Stockage | Retention |
|--------|----------|----------|-----------|
| Adresse IP | Detection d'inscriptions en masse, multi-comptes | Table `device_fingerprints` (hashee) | 90 jours |
| User-Agent | Correlation multi-comptes (meme navigateur/appareil) | Table `device_fingerprints` | 90 jours |
| Device ID natif (IDFV iOS, Android ID) | Detection multi-comptes (meme appareil physique) | Table `device_fingerprints` (hashe) | 90 jours |
| Taille d'ecran + langue | Fingerprint supplementaire (combinaison) | Table `device_fingerprints` | 90 jours |

**Ce qui n'est PAS collecte :**
- Pas de cookies tiers ou de tracking cross-site
- Pas de geolocalisation precise pour la detection de fraude (la geoloc est reservee a la recherche de partenaires, US-C017)
- Pas de donnees biometriques
- Pas d'IMEI ou de numero de serie de l'appareil

### Conformite DPA (Data Protection Act 2017, Maurice)

Le DPA mauricien est inspire du RGPD et impose les principes suivants :

1. **Base legale** : le device fingerprinting pour la detection de fraude releve de l'**interet legitime** du responsable de traitement (prevenir les abus, proteger les utilisateurs). C'est la base legale la plus appropriee (pas besoin de consentement, mais obligation de transparence).

2. **Transparence** : la politique de confidentialite doit mentionner explicitement :
   - Quelles donnees sont collectees (IP, device ID, User-Agent)
   - Pourquoi (detection de fraude et protection de la plateforme)
   - Combien de temps elles sont conservees (90 jours)
   - Le droit d'acces et de rectification

3. **Minimisation** : seules les donnees strictement necessaires a la detection de fraude sont collectees. Les donnees sont hashees (IP, Device ID) pour limiter l'exposition en cas de fuite.

4. **Retention limitee** : 90 jours. Au-dela, les fingerprints sont purges (job CRON quotidien). Ce delai couvre la fenetre d'analyse la plus longue (30 jours glissants) avec une marge de securite.

5. **Droit d'acces** : l'utilisateur peut demander l'export de ses donnees personnelles, y compris les fingerprints associes a son compte.

### Strategie de hashage

```typescript
// Le device ID et l'IP sont hashes avec SHA-256 + salt applicatif
// Cela permet la comparaison (meme hash = meme device/IP) sans stocker
// les valeurs en clair.
import { createHash } from 'crypto';

const FINGERPRINT_SALT = process.env.FINGERPRINT_SALT; // secret, en env var

function hashFingerprint(value: string): string {
  return createHash('sha256')
    .update(FINGERPRINT_SALT + value)
    .digest('hex');
}

// Stockage : hash(IP), hash(deviceId), user_agent (en clair, pas sensible)
```

**Pourquoi le User-Agent n'est pas hashe** : le User-Agent n'est pas une donnee personnelle sensible (il est envoye en clair dans chaque requete HTTP). Le garder en clair permet de l'afficher dans l'interface admin pour le contexte.

### Decision Q5 : Fingerprinting minimaliste avec hashage, retention 90 jours

**Justification** : La detection de multi-comptes necessite un identifiant d'appareil. Le DPA autorise cette collecte sous base d'interet legitime, a condition de transparence et de minimisation. Le hashage et la retention limitee a 90 jours sont des mesures de protection proportionnees.

---

## 3. Catalogue de regles de fraude

### 3.1 Regles consommateur

| # | Slug | Signal | Metrique | Seuil defaut | Fenetre | Min. echantillon | Action | Cooldown |
|---|------|--------|----------|:------------:|:-------:|:----------------:|--------|:--------:|
| C1 | `consumer_noshow_auto` | No-shows recurrents | Nombre absolu de no-shows | **3** | 30 jours | -- | Auto-suspension | 24h |
| C2 | `consumer_noshow_rate` | Taux de no-show eleve | `no_shows / total_reservations` | **40%** | 10 dernieres reservations | 10 | Alerte haute | 72h |
| C3 | `consumer_claim_rate` | Reclamations systematiques | `claims / pickups` | **30%** | 30 jours | 5 retraits | Alerte haute | 72h |
| C4 | `consumer_refund_abuse` | Abus de remboursements | Nombre de remboursements | **4** | 30 jours | -- | Alerte haute | 72h |
| C5 | `consumer_cancel_pattern` | Reservation/annulation repetitive | Nombre d'annulations par le consommateur | **6** | 7 jours | -- | Auto-suspension | 24h |
| C6 | `consumer_multi_account` | Comptes multiples (meme device) | Nombre de comptes avec meme `device_fingerprint` | **2** | 90 jours | -- | Alerte standard | 168h (7j) |
| C7 | `consumer_referral_abuse` | Abus de parrainage | Parrainages depuis meme device/IP | **3** | 30 jours | -- | Alerte haute | 168h (7j) |
| C8 | `consumer_hold_expiry_alert` | Holds expires repetitifs | Nombre de holds expires (transition R3 `PENDING_PAYMENT -> EXPIRED` via `HOLD_TIMEOUT`, ADR-017) | **3** | 24h | -- | Alerte haute | 24h |
| C9 | `consumer_hold_expiry_block` | Attaque par expiration de hold | Nombre de holds expires (meme transition R3) | **5** | 24h | -- | Auto-suspension (cooldown reservation 30 min) | 1h |
| C10 | `consumer_referral_velocity` | Rafale de parrainages | Nombre de parrainages emis par le meme parrain | **5** | 24h | -- | Auto-suspension (blocage parrainage) | 24h |
| C11 | `consumer_referral_inactive_godchild` | Filleul inactif apres bonus | Filleul avec 1 seule commande + inactif depuis 30 jours | **1** | 30 jours | -- | Alerte haute | 168h (7j) |
| C12 | `consumer_mm_refund_pattern` | Pattern remboursement mobile money suspect | Commandes mobile money suivies d'annulations systematiques | **3** | 7 jours | -- | Alerte haute | 72h |
| C13 | `consumer_mm_velocity` | Velocity check mobile money | Nombre de transactions mobile money (debit immediat) | **8** | 1h | -- | Alerte critique | 2h |

**Notes sur les seuils :**
- **C1 (3 no-shows en 30 jours)** : c'est le seuil mentionne dans les specs. A 100-500 reservations/jour, un consommateur typique fait 2-4 reservations/mois. 3 no-shows est un signal fort.
- **C2 (40% de taux de no-show)** : conforme a la valeur dans `app_settings` (ADR-003 : `fraud_noshow_threshold = 0.40`). Le `min_sample_size = 10` protege contre les faux positifs sur les nouveaux utilisateurs.
- **C3 (30% de taux de reclamation)** : conforme a ADR-003 (`fraud_claim_threshold = 0.30`). Un consommateur avec 1 reclamation sur 3 retraits n'est pas flagge (min = 5 retraits).
- **C5 (6 annulations en 7 jours)** : un consommateur qui annule 6 fois en une semaine bloque probablement du stock intentionnellement.
- **C6 (2 comptes, meme device)** : un couple au meme domicile peut avoir 2 comptes sur le meme appareil. C'est une alerte, pas une suspension.
- **C8/C9 (holds expires)** : attaque par expiration de hold (cf. ADR-008, hold de 5 min). Un utilisateur reserve des paniers de maniere repetee sans jamais finaliser le paiement, ce qui bloque le stock pendant 5 minutes a chaque tentative (transition R3 `PENDING_PAYMENT -> EXPIRED` via `HOLD_TIMEOUT`, ADR-017). A 3 holds expires en 24h, une alerte est generee. A 5 holds expires en 24h, la capacite de reservation est bloquee temporairement (cooldown de 30 min). Ce blocage n'est pas une suspension de compte : l'utilisateur peut toujours consulter l'app et ses commandes existantes, mais la creation de nouvelles reservations est interdite pendant 30 minutes. Le compteur Redis est `fraud:hold_expired:{consumerId}`.
- **C10 (rafale de parrainages)** : >5 parrainages emis par le meme parrain en 24h est un signal fort d'abus (creation de comptes fantomes). Declenchement d'un blocage de la capacite de parrainage (pas de suspension de compte complete).
- **C11 (filleul inactif)** : un filleul qui ne fait qu'une seule commande (juste pour le bonus du parrain) puis devient inactif pendant 30 jours est suspect. Cette regle est evaluee en batch et genere une alerte pour investigation manuelle.
- **C12 (pattern remboursement mobile money)** : specifique au mobile money (MCB Juice, Blink, my.t money). Le debit est immediat (ADR-005/ADR-017, transition R1), contrairement aux cartes bancaires (pre-autorisation). Un consommateur qui passe des commandes en mobile money puis les annule systematiquement avant le creneau de retrait (transition R4 `CONFIRMED -> CANCELLED_CONSUMER`) obtient des remboursements (RF) a repetition. Seuil : 3 annulations mobile money en 7 jours.
- **C13 (velocity mobile money)** : le debit mobile money etant immediat, un volume eleve de transactions en peu de temps (>8 en 1h) est anormal et potentiellement frauduleux (carte SIM volee, compte compromis). Contrairement aux cartes bancaires ou la pre-autorisation limite l'exposition, le mobile money debite immediatement le wallet du consommateur.

### 3.2 Regles partenaire

| # | Slug | Signal | Metrique | Seuil defaut | Fenetre | Min. echantillon | Action | Cooldown |
|---|------|--------|----------|:------------:|:-------:|:----------------:|--------|:--------:|
| P1 | `partner_price_inflation` | Gonflement valeur initiale | `original_price / moyenne_type_commerce` | **> 2.0x** | 30 jours | 10 paniers | Alerte standard | 168h (7j) |
| P2 | `partner_cancel_with_reservations` | Annulations avec reservations | `cancelled_with_res / total_published` | **15%** | 30 jours | 10 paniers publies | Alerte haute | 72h |
| P3 | `partner_claim_rate` | Taux de reclamations | `claims_received / pickups` | **20%** | 30 jours | 10 retraits | Alerte haute | 72h |
| P4 | `partner_hours_mismatch` | Horaires incoherents | Creneau hors horaires d'ouverture | presence | -- | -- | Alerte standard | 168h (7j) |
| P5 | `partner_price_volatility` | Variations de prix extremes | Ecart-type des prix / moyenne | **> 0.50** | 14 jours | 5 paniers | Alerte standard | 168h (7j) |

**Notes :**
- **P1 (2x la moyenne)** : si un boulanger declare une valeur initiale de Rs 600 pour un panier similaire a ceux des concurrents a Rs 250, c'est suspect. Le ratio 2x est conservateur pour eviter les faux positifs (certains commerces haut de gamme ont legitimement des prix plus eleves).
- **P2 (15%)** : conforme a ADR-003 (`fraud_cancel_threshold = 0.15`).
- **P3 (20%)** : un partenaire qui recoit des reclamations sur 20% de ses retraits a probablement un probleme de qualite recurrent.

### 3.3 Regles plateforme (alertes de seuil, US-A041)

| # | Slug | Signal | Seuil defaut | Fenetre | Action |
|---|------|--------|:------------:|:-------:|--------|
| S1 | `platform_mass_cancel` | Annulations partenaire en masse | **5** annulations avec reservations | 1h | Alerte critique |
| S2 | `platform_claim_spike` | Pic de reclamations | **20** reclamations ouvertes | 2h | Alerte critique |
| S3 | `platform_payment_failure` | Pic d'echecs de paiement | **10** echecs | 30 min | Alerte critique |
| S4 | `platform_noshow_spike` | Pic de no-shows | **50%** de taux de no-show | 3h | Alerte critique |
| S5 | `platform_reservation_drop` | Chute de reservations | **-70%** vs meme tranche semaine precedente | 3h | Alerte critique |
| S6 | `platform_signup_spike` | Inscriptions suspectes | **5** inscriptions depuis meme IP/device | 10 min | Alerte critique + auto-suspension |
| S7 | `platform_major_partner_inactive` | Indisponibilite partenaire majeur | Partenaire > **10%** du CA, 0 paniers | 3 jours | Alerte standard |

**Notes :**
- Les seuils S1 a S6 sont conformes aux valeurs par defaut mentionnees dans US-A041.
- S6 combine alerte critique et auto-suspension : les comptes crees dans le pic sont suspendus automatiquement (probablement des bots).

---

## 4. Modele de donnees

### 4.1 Nouvelles tables

```sql
-- =============================================
-- Table : fraud_rules (regles configurables)
-- =============================================
CREATE TABLE fraud_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,        -- 'consumer_noshow_auto', 'partner_price_inflation', ...
  name_fr         TEXT NOT NULL,               -- Nom affiche dans le backoffice
  name_en         TEXT,
  description_fr  TEXT,                        -- Description pour l'admin
  description_en  TEXT,
  actor_type      TEXT NOT NULL,               -- 'consumer', 'partner', 'platform'
  metric          TEXT NOT NULL,               -- 'noshow_count', 'noshow_rate', 'claim_rate', ...
  operator        TEXT NOT NULL DEFAULT 'gte', -- 'gt', 'lt', 'gte', 'lte', 'eq'
  threshold       DECIMAL NOT NULL,            -- 3, 0.40, 0.30, ...
  window_days     INT,                         -- 30, 7, NULL pour les seuils plateforme avec fenetre en heures
  window_hours    INT,                         -- pour les seuils plateforme (1h, 2h, 3h)
  window_minutes  INT,                         -- pour les seuils plateforme (10 min, 30 min)
  min_sample_size INT DEFAULT 0,               -- minimum d'evenements pour evaluer
  action          TEXT NOT NULL,               -- 'alert', 'auto_suspend'
  severity        TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  is_active       BOOLEAN NOT NULL DEFAULT true,
  cooldown_hours  INT NOT NULL DEFAULT 72,     -- heures entre deux alertes pour le meme acteur
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_fraud_rules_actor CHECK (actor_type IN ('consumer', 'partner', 'platform')),
  CONSTRAINT chk_fraud_rules_action CHECK (action IN ('alert', 'auto_suspend')),
  CONSTRAINT chk_fraud_rules_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT chk_fraud_rules_operator CHECK (operator IN ('gt', 'lt', 'gte', 'lte', 'eq')),
  CONSTRAINT chk_fraud_rules_threshold CHECK (threshold > 0),
  CONSTRAINT chk_fraud_rules_cooldown CHECK (cooldown_hours >= 1)
);

-- =============================================
-- Table : fraud_alerts (enrichissement de la table existante ADR-003)
-- La table fraud_alerts existante dans ADR-003 est enrichie
-- avec une FK vers fraud_rules et des champs supplementaires
-- =============================================
-- Schema existant dans ADR-003 :
--   id, alert_type, actor_type, actor_id, severity, details,
--   status, admin_comment, resolved_by, created_at, updated_at
--
-- Ajouts :
ALTER TABLE fraud_alerts ADD COLUMN rule_id UUID REFERENCES fraud_rules(id);
ALTER TABLE fraud_alerts ADD COLUMN metric_value DECIMAL;   -- valeur observee (ex: 0.48)
ALTER TABLE fraud_alerts ADD COLUMN threshold_value DECIMAL; -- seuil qui a declenche (ex: 0.40)
ALTER TABLE fraud_alerts ADD COLUMN action_taken TEXT;       -- 'none', 'auto_suspended', 'manually_suspended', 'banned'
ALTER TABLE fraud_alerts ADD COLUMN auto_suspension_id UUID; -- FK vers l'entree dans reservation_status_history ou audit_logs qui a declenche la suspension auto

-- Index pour le cooldown (eviter les doublons)
CREATE UNIQUE INDEX idx_fraud_alerts_cooldown
  ON fraud_alerts (rule_id, actor_id, created_at DESC)
  WHERE status = 'new';

-- =============================================
-- Table : device_fingerprints
-- =============================================
CREATE TABLE device_fingerprints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ip_hash         TEXT NOT NULL,             -- SHA-256 de l'IP + salt
  device_id_hash  TEXT,                      -- SHA-256 du device ID natif + salt (null si webapp)
  user_agent      TEXT,                      -- en clair (pas sensible)
  screen_info     TEXT,                      -- "{width}x{height}" (optionnel)
  locale          TEXT,                      -- "fr-MU", "en-MU" (optionnel)
  event_type      TEXT NOT NULL,             -- 'signup', 'login', 'reservation'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour la detection de multi-comptes (meme device, comptes differents)
CREATE INDEX idx_fingerprints_device ON device_fingerprints (device_id_hash, created_at DESC)
  WHERE device_id_hash IS NOT NULL;

-- Index pour la detection d'inscriptions en masse (meme IP, courte fenetre)
CREATE INDEX idx_fingerprints_ip_signup ON device_fingerprints (ip_hash, created_at DESC)
  WHERE event_type = 'signup';

-- Index pour la purge des fingerprints > 90 jours
CREATE INDEX idx_fingerprints_created ON device_fingerprints (created_at);

-- =============================================
-- Table : fraud_suspensions (historique des suspensions automatiques)
-- =============================================
CREATE TABLE fraud_suspensions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  alert_id        UUID NOT NULL REFERENCES fraud_alerts(id),
  rule_id         UUID NOT NULL REFERENCES fraud_rules(id),
  suspension_type TEXT NOT NULL,              -- 'temporary', 'permanent'
  duration_hours  INT,                       -- NULL si permanente
  reason_fr       TEXT NOT NULL,              -- message affiche au consommateur
  reason_en       TEXT,
  status          TEXT NOT NULL DEFAULT 'active', -- 'active', 'lifted', 'escalated_to_ban'
  lifted_at       TIMESTAMPTZ,
  lifted_by       UUID,                      -- admin_id qui a leve la suspension
  lift_comment    TEXT,
  reservations_cancelled INT DEFAULT 0,      -- nombre de reservations annulees
  refunds_issued  INT DEFAULT 0,             -- nombre de remboursements emis
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_fraud_suspensions_type CHECK (suspension_type IN ('temporary', 'permanent')),
  CONSTRAINT chk_fraud_suspensions_status CHECK (status IN ('active', 'lifted', 'escalated_to_ban'))
);

-- Index pour trouver les suspensions actives d'un utilisateur
CREATE INDEX idx_fraud_suspensions_user ON fraud_suspensions (user_id)
  WHERE status = 'active';
```

### 4.2 Cles `app_settings` additionnelles

Les cles existantes dans ADR-003 (`fraud_noshow_threshold`, `fraud_claim_threshold`, etc.) sont conservees comme valeurs par defaut pour le seed initial. Les regles vivent desormais dans `fraud_rules` qui est la source de verite pour les seuils.

| Cle | Type | Valeur defaut | Description |
|-----|------|:-------------:|-------------|
| `fraud_auto_suspend_duration_hours` | number | `168` (7 jours) | Duree de la suspension automatique |
| `fraud_auto_suspend_noshow_count` | number | `3` | Nombre de no-shows declenchant la suspension auto |
| `fraud_auto_suspend_cancel_count` | number | `6` | Nombre d'annulations declenchant la suspension auto |
| `fraud_batch_interval_minutes` | number | `15` | Intervalle du CRON batch |
| `fraud_fingerprint_retention_days` | number | `90` | Retention des fingerprints |
| `fraud_alert_admin_notification` | boolean | `true` | Envoyer une notification push/email aux admins |
| `fraud_hold_expiry_cooldown_minutes` | number | `30` | Duree du cooldown de reservation apres une attaque par hold expiration (regle C9) |
| `fraud_referral_max_per_day` | number | `5` | Nombre maximum de parrainages par jour avant blocage (regle C10) |
| `fraud_mm_velocity_window_minutes` | number | `60` | Fenetre de la velocity check mobile money (regle C13) |

### 4.3 Schema Prisma (extrait)

```prisma
model FraudRule {
  id            String   @id @default(uuid())
  slug          String   @unique
  nameFr        String   @map("name_fr")
  nameEn        String?  @map("name_en")
  descriptionFr String?  @map("description_fr")
  descriptionEn String?  @map("description_en")
  actorType     String   @map("actor_type")       // 'consumer', 'partner', 'platform'
  metric        String                             // 'noshow_count', 'noshow_rate', ...
  operator      String   @default("gte")
  threshold     Decimal
  windowDays    Int?     @map("window_days")
  windowHours   Int?     @map("window_hours")
  windowMinutes Int?     @map("window_minutes")
  minSampleSize Int      @default(0) @map("min_sample_size")
  action        String                             // 'alert', 'auto_suspend'
  severity      String   @default("medium")
  isActive      Boolean  @default(true) @map("is_active")
  cooldownHours Int      @default(72) @map("cooldown_hours")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  alerts        FraudAlert[]
  suspensions   FraudSuspension[]

  @@map("fraud_rules")
}

model FraudAlert {
  id              String    @id @default(uuid())
  alertType       String    @map("alert_type")
  actorType       String    @map("actor_type")
  actorId         String    @map("actor_id")
  severity        String
  details         Json
  status          String    @default("new")        // 'new', 'investigated', 'false_positive', 'resolved'
  adminComment    String?   @map("admin_comment")
  resolvedBy      String?   @map("resolved_by")
  ruleId          String?   @map("rule_id")
  metricValue     Decimal?  @map("metric_value")
  thresholdValue  Decimal?  @map("threshold_value")
  actionTaken     String?   @map("action_taken")
  autoSuspensionId String?  @map("auto_suspension_id")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  rule            FraudRule? @relation(fields: [ruleId], references: [id])
  suspension      FraudSuspension?

  @@index([status, createdAt(sort: Desc)])
  @@map("fraud_alerts")
}

model DeviceFingerprint {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  ipHash        String   @map("ip_hash")
  deviceIdHash  String?  @map("device_id_hash")
  userAgent     String?  @map("user_agent")
  screenInfo    String?  @map("screen_info")
  locale        String?
  eventType     String   @map("event_type")
  createdAt     DateTime @default(now()) @map("created_at")

  user          Profile  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([deviceIdHash, createdAt(sort: Desc)])
  @@index([ipHash, createdAt(sort: Desc)])
  @@map("device_fingerprints")
}

model FraudSuspension {
  id                    String    @id @default(uuid())
  userId                String    @map("user_id")
  alertId               String    @unique @map("alert_id")
  ruleId                String    @map("rule_id")
  suspensionType        String    @map("suspension_type")
  durationHours         Int?      @map("duration_hours")
  reasonFr              String    @map("reason_fr")
  reasonEn              String?   @map("reason_en")
  status                String    @default("active")
  liftedAt              DateTime? @map("lifted_at")
  liftedBy              String?   @map("lifted_by")
  liftComment           String?   @map("lift_comment")
  reservationsCancelled Int       @default(0) @map("reservations_cancelled")
  refundsIssued         Int       @default(0) @map("refunds_issued")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  user                  Profile   @relation(fields: [userId], references: [id])
  alert                 FraudAlert @relation(fields: [alertId], references: [id])
  rule                  FraudRule  @relation(fields: [ruleId], references: [id])

  @@index([userId])
  @@map("fraud_suspensions")
}
```

### 4.4 Compteurs Redis

```
fraud:noshow:{consumerId}        -> Sorted Set (score = timestamp, member = reservationId)
fraud:cancel:{consumerId}        -> Sorted Set (score = timestamp, member = reservationId)
fraud:claim:{consumerId}         -> Sorted Set (score = timestamp, member = claimId)
fraud:refund:{consumerId}        -> Sorted Set (score = timestamp, member = claimId)
fraud:hold_expired:{consumerId}  -> Sorted Set (score = timestamp, member = reservationId)
fraud:referral:{consumerId}      -> Sorted Set (score = timestamp, member = referralId)
fraud:mm_cancel:{consumerId}     -> Sorted Set (score = timestamp, member = reservationId)
fraud:mm_tx:{consumerId}         -> Sorted Set (score = timestamp, member = transactionId)
fraud:signup_ip:{ipHash}         -> Sorted Set (score = timestamp, member = userId)
fraud:signup_device:{deviceHash} -> Sorted Set (score = timestamp, member = userId)
```

TTL : chaque sorted set a un TTL de 90 jours (align sur la retention des fingerprints). Les membres plus anciens que la fenetre sont purges par le batch CRON (`ZREMRANGEBYSCORE`).

---

## 5. Architecture du systeme

### 5.1 Diagramme d'architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION NESTJS                                   │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ ReservationSvc   │    │ ClaimService     │    │ AuthService     │         │
│  │ (state machine   │    │ (state machine   │    │ (inscription)   │         │
│  │  ADR-017)        │    │  ADR-017)        │    │                 │         │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬────────┘         │
│           │                       │                       │                  │
│           │ evenement:            │ evenement:            │ evenement:       │
│           │ NO_SHOW,              │ CLAIM_OPENED,         │ SIGNUP,          │
│           │ CANCELLED_CONSUMER,   │ CLAIM_RESOLVED        │ REFERRAL_CREATED │
│           │ HOLD_TIMEOUT,         │ (avec remboursement)  │                  │
│           │ MM_CONSUMER_CANCEL,   │                       │                  │
│           │ MM_TRANSACTION        │                       │                  │
│           └───────────┬───────────┘───────────┬───────────┘                  │
│                       │                       │                              │
│                       ▼                       ▼                              │
│           ┌──────────────────────────────────────────────┐                   │
│           │           FraudEventEmitter                   │                   │
│           │  (EventEmitter NestJS -- decouplage interne)  │                   │
│           └──────────────────────┬───────────────────────┘                   │
│                                  │                                           │
│                                  ▼                                           │
│           ┌──────────────────────────────────────────────┐                   │
│           │           FraudProducer                       │                   │
│           │  enqueue BullMQ job 'fraud-check'            │                   │
│           │  { eventType, actorType, actorId, metadata } │                   │
│           └──────────────────────┬───────────────────────┘                   │
│                                  │                                           │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │         REDIS (BullMQ)       │
                    │                              │
                    │  Queue: 'fraud-check'        │
                    │  ┌────────────────────┐      │
                    │  │ job: {             │      │
                    │  │   eventType,       │      │
                    │  │   actorType,       │      │
                    │  │   actorId,         │      │
                    │  │   metadata         │      │
                    │  │ }                  │      │
                    │  └────────────────────┘      │
                    │                              │
                    │  Queue: 'fraud-batch'        │
                    │  (repeatable, every 15 min)  │
                    │                              │
                    │  Sorted Sets:                │
                    │  fraud:noshow:{id}           │
                    │  fraud:cancel:{id}           │
                    │  fraud:signup_ip:{hash}      │
                    │  ...                         │
                    │                              │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │      FRAUD WORKERS           │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │ FraudCheckWorker        │  │
                    │  │ (temps reel)            │  │
                    │  │                         │  │
                    │  │ 1. Increment compteur   │  │
                    │  │    Redis                │  │
                    │  │ 2. Charger regles       │  │
                    │  │    action=auto_suspend  │  │
                    │  │    pour le metric        │  │
                    │  │ 3. Evaluer seuils       │  │
                    │  │    absolus              │  │
                    │  │ 4. Si declenche :       │  │
                    │  │    → creer fraud_alert  │  │
                    │  │    → si auto_suspend :  │  │
                    │  │      suspendre          │  │
                    │  │    → notifier admin     │  │
                    │  └────────────────────────┘  │
                    │                              │
                    │  ┌────────────────────────┐  │
                    │  │ FraudBatchWorker        │  │
                    │  │ (CRON toutes les 15min) │  │
                    │  │                         │  │
                    │  │ 1. Charger regles       │  │
                    │  │    action=alert         │  │
                    │  │ 2. Pour chaque regle :  │  │
                    │  │    → calculer metrique  │  │
                    │  │      SQL                │  │
                    │  │    → comparer seuil     │  │
                    │  │    → verifier cooldown  │  │
                    │  │    → creer fraud_alert  │  │
                    │  │      si declenche       │  │
                    │  │ 3. Reconcilier          │  │
                    │  │    compteurs Redis      │  │
                    │  │ 4. Purger sorted sets   │  │
                    │  │    anciens              │  │
                    │  └────────────────────────┘  │
                    │                              │
                    └──────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │       POSTGRESQL              │
                    │                              │
                    │  fraud_rules                 │
                    │  fraud_alerts                │
                    │  fraud_suspensions           │
                    │  device_fingerprints         │
                    │  reservations (source)       │
                    │  claims (source)             │
                    │  profiles (cible suspension) │
                    │  audit_logs (trace)          │
                    └──────────────────────────────┘
```

### 5.2 Sequence de suspension automatique (regle C1 : 3 no-shows en 30 jours)

```
   Creneau de retrait expire (+5 min)
                │
                ▼
   ┌──────────────────────┐
   │ ReservationService    │
   │ transition:           │
   │ READY → NO_SHOW       │
   │ (ADR-017, R8)        │
   └───────────┬──────────┘
               │
               │ 1. Effets de bord (ADR-017) :
               │    - paiement maintenu
               │    - notification push no-show
               │    - increment fraud counter
               │
               ▼
   ┌──────────────────────┐
   │ FraudEventEmitter     │
   │ emit('fraud.event', { │
   │   eventType: 'NO_SHOW'│
   │   actorType: 'consumer│
   │   actorId: '...',     │
   │   reservationId: '...'│
   │ })                    │
   └───────────┬──────────┘
               │
               ▼
   ┌──────────────────────┐
   │ FraudProducer         │
   │ enqueue BullMQ job    │
   │ 'fraud-check'         │
   └───────────┬──────────┘
               │
               ▼
   ┌──────────────────────┐
   │ FraudCheckWorker      │
   │                       │
   │ 2. ZADD              │
   │    fraud:noshow:{id}  │
   │    timestamp resId    │
   │                       │
   │ 3. ZCOUNT             │
   │    fraud:noshow:{id}  │
   │    30 jours → count=3 │
   │                       │
   │ 4. Charger regle C1   │
   │    threshold=3,       │
   │    action=auto_suspend│
   │                       │
   │ 5. count >= threshold │
   │    → DECLENCHE        │
   │                       │
   │ 6. Verifier cooldown  │
   │    (pas d'alerte < 24h│
   │    pour meme regle +  │
   │    meme acteur)       │
   │                       │
   │ 7. Creer fraud_alert  │
   │    status = 'new'     │
   │    action_taken =     │
   │    'auto_suspended'   │
   └───────────┬──────────┘
               │
               ▼
   ┌──────────────────────────────────────────┐
   │ FraudSuspensionService.autoSuspend()     │
   │                                          │
   │ 8.  UPDATE profiles                      │
   │     SET status = 'SUSPENDED'             │
   │     WHERE id = consumerId                │
   │                                          │
   │ 9.  Supabase Auth:                       │
   │     admin.updateUserById(userId,         │
   │     { app_metadata: {                    │
   │       status: 'suspended' } })           │
   │     (ADR-011 : dualite JWT + DB)         │
   │                                          │
   │ 10. Annuler reservations en cours :      │
   │     SELECT * FROM reservations           │
   │     WHERE consumer_id = consumerId       │
   │       AND status IN ('confirmed','ready')│
   │     → pour chaque :                      │
   │       Si status = 'confirmed' :          │
   │         transition CONSUMER_CANCEL       │
   │         (ADR-017, R4 : stock restore,    │
   │          reversal/remboursement)          │
   │       Si status = 'ready' :              │
   │         pas d'annulation possible         │
   │         (capture deja effectuee, R6).    │
   │         Le panier reste en READY, le     │
   │         no-show sera enregistre           │
   │         normalement (R8).                │
   │     Note : ADR-017 ne definit pas de     │
   │     transition SYSTEM_CANCEL. On reutilise│
   │     CONSUMER_CANCEL (R4) avec un champ   │
   │     `cancelled_by: 'system'` dans les    │
   │     audit_logs pour tracer l'origine.    │
   │                                          │
   │ 11. Creer fraud_suspensions              │
   │     duration_hours = 168 (7 jours)       │
   │     reason_fr = 'Votre compte a ete      │
   │       temporairement suspendu en raison   │
   │       de 3 retraits non effectues en     │
   │       30 jours.'                         │
   │                                          │
   │ 12. Planifier job BullMQ                 │
   │     'fraud-auto-lift'                    │
   │     delayed: 168h (7 jours)              │
   │     payload: { suspensionId }            │
   │                                          │
   │ 13. Notification au consommateur :       │
   │     - Push : 'Votre compte est suspendu' │
   │     - Email : details + lien support     │
   │     (ADR-014, canal transactionnel)      │
   │                                          │
   │ 14. Notification aux admins :            │
   │     - Push backoffice                    │
   │     - Email si configure                 │
   │                                          │
   │ 15. Audit log :                          │
   │     action = 'consumer.auto_suspended'   │
   │     actor_type = 'system'                │
   │     entity_type = 'profile'              │
   │     entity_id = consumerId               │
   │     changes = { before: { status:        │
   │       'active' }, after: { status:       │
   │       'suspended' } }                    │
   │     metadata = { rule_slug:              │
   │       'consumer_noshow_auto',            │
   │       alert_id: '...',                   │
   │       no_show_count: 3,                  │
   │       reservations_cancelled: 1 }        │
   └──────────────────────────────────────────┘
```

### 5.3 Flow de levee de suspension automatique

```
   ┌────────────────────────────────────────────────┐
   │ Deux chemins possibles :                        │
   │                                                │
   │ A) Timer expire (7 jours)                      │
   │    → BullMQ job 'fraud-auto-lift'              │
   │    → FraudSuspensionService.autoLift()         │
   │                                                │
   │ B) Admin leve manuellement (US-A021)           │
   │    → endpoint POST /admin/consumers/:id/       │
   │      reactivate                                │
   │    → permission: consumers:reactivate          │
   │    → FraudSuspensionService.manualLift()       │
   └─────────────────────┬──────────────────────────┘
                         │
                         ▼
   ┌──────────────────────────────────────────┐
   │ FraudSuspensionService.lift()            │
   │                                          │
   │ 1. UPDATE fraud_suspensions              │
   │    SET status = 'lifted',                │
   │        lifted_at = NOW(),                │
   │        lifted_by = adminId (ou 'system') │
   │                                          │
   │ 2. UPDATE profiles                       │
   │    SET status = 'ACTIVE'                 │
   │                                          │
   │ 3. Supabase Auth:                        │
   │    admin.updateUserById(userId,          │
   │    { app_metadata: {                     │
   │      status: 'active' } })              │
   │                                          │
   │ 4. Notification au consommateur :        │
   │    - Push + email : 'Votre compte est    │
   │      reactiv.' (ADR-014)                │
   │                                          │
   │ 5. Audit log :                           │
   │    action = 'consumer.reactivated'       │
   │    actor_type = 'system' ou 'admin'      │
   │                                          │
   │ Note : les compteurs Redis ne sont PAS   │
   │ remis a zero. Le consommateur a un       │
   │ "casier" qui se vide naturellement       │
   │ quand les evenements sortent de la       │
   │ fenetre glissante.                       │
   └──────────────────────────────────────────┘
```

---

## 6. Integration avec les ADR existantes

### 6.1 Integration ADR-017 (state machines)

La table de transitions de la reservation (ADR-017, section 3) definit deja un effet `incrementFraudCounter` sur la transition `R8 : READY -> NO_SHOW`. Cette ADR-019 precise ce que fait cet effet :

```typescript
// Dans la transition table (ADR-017)
{
  from: 'READY',
  event: 'NO_SHOW_TIMEOUT',
  to: 'NO_SHOW',
  effects: [
    effects.recordNoShowTimestamp,
    effects.sendNoShowNotification,
    effects.incrementFraudCounter,  // ← defini par ADR-019
  ],
}

// Implementation de incrementFraudCounter (ADR-019)
async function incrementFraudCounter(context: TransitionContext) {
  await this.fraudEventEmitter.emit('fraud.event', {
    eventType: 'NO_SHOW',
    actorType: 'consumer',
    actorId: context.reservation.consumerId,
    reservationId: context.reservation.id,
    metadata: {
      basketId: context.reservation.basketId,
      partnerId: context.reservation.partnerId,
    },
  });
}
```

**Autres transitions qui emettent un evenement fraude :**

| Transition (ADR-017) | Evenement fraude | Regle(s) concernee(s) |
|----------------------|------------------|----------------------|
| R3 : `PENDING_PAYMENT -> EXPIRED` (via `HOLD_TIMEOUT`) | `HOLD_TIMEOUT` | C8 (alerte hold expire), C9 (blocage reservation) |
| R4 : `CONFIRMED -> CANCELLED_CONSUMER` | `CONSUMER_CANCEL` | C5 (annulations repetitives), C12 (si `payment_method_type = 'mobile_money'`) |
| R8 : `READY -> NO_SHOW` | `NO_SHOW` | C1 (auto-suspend), C2 (taux no-show) |
| R1 : `PENDING_PAYMENT -> CONFIRMED` (si mobile money) | `MM_TRANSACTION` | C13 (velocity mobile money) |
| R9 (reservation) : `PICKED_UP` + ouverture reclamation → creation Claim en etat `OPEN` | `CLAIM_OPENED` | C3 (taux reclamations) |
| C2 (claim) : `IN_REVIEW -> RESOLVED` (remboursement) | `REFUND_GRANTED` | C4 (abus remboursements) |
| B5 (basket) : `PUBLISHED -> CANCELLED` | `PARTNER_CANCEL_WITH_RES` | P2 (annulations partenaire) |
| P3 (partner) : `ACTIVE -> SUSPENDED` par admin | `PARTNER_SUSPENDED` | *(pas de regle, c'est l'action)* |
| Referral : creation d'un parrainage | `REFERRAL_CREATED` | C10 (rafale parrainages), C7 (abus parrainage device/IP) |

### 6.2 Integration ADR-011 (RBAC)

ADR-011 definit 3 permissions anti-fraude :

| Permission | Utilisation dans cette ADR |
|------------|---------------------------|
| `fraud:view` | Voir la liste des alertes, les fiches de suspension, le dashboard anti-fraude |
| `fraud:investigate` | Marquer une alerte comme "investiguee" ou "faux positif", ajouter un commentaire |
| `fraud:merge_accounts` | Fusionner deux comptes identifies comme doublons (US-A040) -- super_admin uniquement |

**Permissions existantes utilisees par le flow de suspension :**

| Permission | Utilisation |
|------------|-------------|
| `consumers:suspend` | Suspension manuelle d'un consommateur (US-A020). La suspension automatique est faite par `actor_type = 'system'` sans permission (le systeme a tous les droits). |
| `consumers:reactivate` | Levee manuelle d'une suspension (US-A021) |
| `consumers:ban` | Escalade d'une suspension vers un bannissement (US-A022) |
| `consumers:unban` | Levee d'un bannissement -- super_admin uniquement |

**Nouvelle permission necessaire :**

| Permission | Description | admin | super_admin |
|------------|-------------|:-----:|:-----------:|
| `fraud:configure` | Modifier les seuils des regles, activer/desactiver des regles | -- | Oui |

**Justification** : la modification des seuils anti-fraude a un impact direct sur les suspensions automatiques. Un seuil trop bas = vague de faux positifs. Seul un super_admin devrait pouvoir modifier ces parametres.

### 6.3 Integration ADR-014 (notifications)

Les notifications anti-fraude utilisent le systeme BullMQ + canaux existants (ADR-014) :

| Notification | Destinataire | Canal | Type |
|-------------|-------------|-------|------|
| Suspension automatique | Consommateur concerne | Push + Email | Transactionnel (non desactivable) |
| Reactivation | Consommateur concerne | Push + Email | Transactionnel |
| Alerte anti-fraude | Admins | Push backoffice + Email (configurable) | Admin |
| Alerte critique plateforme | Admins | Push backoffice + Email + banniere backoffice | Admin urgent |

**Template email de suspension automatique :**

```
Objet : Votre compte BienBon a ete temporairement suspendu

Bonjour {prenom},

Votre compte BienBon a ete temporairement suspendu pour la raison suivante :
{raison_fr}

Cette suspension est effective pour une duree de {duree_jours} jours
(jusqu'au {date_fin}).

Pendant cette periode, vous ne pouvez pas effectuer de reservations.
{nombre_reservations_annulees} reservation(s) en cours ont ete annulees
et remboursees.

Si vous pensez que cette suspension est une erreur, contactez notre support :
support@bienbon.mu

L'equipe BienBon
```

### 6.4 Integration ADR-003 (schema DB)

Cette ADR ajoute 3 tables au schema :

| Table | Module | Description |
|-------|--------|-------------|
| `fraud_rules` | Admin | Regles de detection configurables |
| `device_fingerprints` | Admin | Fingerprints d'appareils (hashees) |
| `fraud_suspensions` | Admin | Historique des suspensions automatiques |

La table `fraud_alerts` existante (ADR-003) est enrichie avec les colonnes `rule_id`, `metric_value`, `threshold_value`, `action_taken`, `auto_suspension_id`.

**Mise a jour du decompte des tables :**

| Module | Avant ADR-019 | Apres ADR-019 |
|--------|:-------------:|:-------------:|
| Admin | 3 (fraud_alerts, partner_mod_requests, support_tickets) | 6 (+fraud_rules, +device_fingerprints, +fraud_suspensions) |
| **Total** | **31** | **34** |

### 6.5 Integration ADR-022 (securite applicative -- OWASP)

ADR-022 couvre la securite applicative (OWASP Top 10, hardening). Plusieurs points de cette ADR-019 s'intersectent avec ADR-022 :

| Sujet ADR-022 | Lien avec ADR-019 | Reference ADR-022 |
|---------------|-------------------|-------------------|
| **A04 -- Insecure Design** (business logic bypass) | Les regles de fraude protegent contre le contournement de la logique metier (hold expiration attack, abus parrainage, annulations abusives) | ADR-022 section 2.2 A04 |
| **A07 -- Auth Failures** (brute force, credential stuffing) | La detection d'inscriptions en masse (regle S6) et le device fingerprinting completent le rate limiting auth d'ADR-022 | ADR-022 section 2.2 A07 |
| **Rate limiting** | Les velocity checks mobile money (C13) et les limites de parrainage (C10) sont des rate limits metier, complementaires du rate limiting technique (Throttler NestJS, ADR-022) | ADR-022 section 3 |
| **Root/jailbreak detection** | ADR-022 mentionne que les checks root/jailbreak/tampering doivent alerter le systeme anti-fraude (ADR-019). Concretement : un appareil root/jailbreake incremente un compteur dans `device_fingerprints` (`is_rooted: true`) et eleve la severite des alertes associees a ce device. | ADR-022 section sur la securite mobile |
| **Abus de parrainage** | ADR-022 mentionne explicitement le risque d'exploitation du programme de parrainage avec de faux comptes, mitige par le device fingerprinting (ADR-019) et les regles C7/C10/C11 | ADR-022 section 2.2 A04 |
| **Logging** | Les evenements de fraude (alertes, suspensions, levees) doivent etre logges conformement a la strategie de logging structuree d'ADR-022 (format JSON, niveau WARN pour les alertes, rotation, pas de donnees sensibles dans les logs) | ADR-022 section 2.2 A09 |

**Reference croisee dans ADR-022** : ADR-022 liste ADR-019 dans ses prereqs et reference la detection de fraude comme mitigation pour A04 (Insecure Design). Les deux ADR sont coherentes sur le principe que les controles metier (ADR-019) completent les controles techniques (ADR-022).

### 6.6 Integration ADR-008 (double-booking et stock)

ADR-008 definit le mecanisme de hold temporaire de 5 minutes pour le stock (decision 2 : patron Hold/Claim). Ce mecanisme cree un vecteur d'attaque couvert par les regles C8/C9 de cette ADR :

| Mecanisme ADR-008 | Vecteur d'abus | Regle ADR-019 |
|-------------------|---------------|---------------|
| Hold 5 min (`PENDING_PAYMENT`, expiration via `reservation:expire-hold`) | Hold expiration attack : reserver puis laisser expirer pour bloquer le stock | C8 (alerte a 3 holds expires/24h), C9 (blocage reservation a 5 holds expires/24h) |
| Stock re-incremente apres expiration (transition R3) | Le stock est libere mais le consommateur peut re-reserver immediatement | C9 bloque la capacite de reservation pendant 30 min (cooldown) |

La transition R3 (`PENDING_PAYMENT -> EXPIRED` via `HOLD_TIMEOUT`, ADR-017) est le point d'integration : elle doit emettre un evenement fraude `HOLD_TIMEOUT` vers le `FraudEventEmitter` en plus de ses effets de bord existants (stock restore, reversal/remboursement).

---

## 7. Module NestJS

### 7.1 Structure des fichiers

```
src/
  modules/
    fraud/
      fraud.module.ts               -- Module NestJS
      fraud.controller.ts           -- Endpoints admin (alertes, regles, suspensions)
      fraud-event.emitter.ts        -- EventEmitter interne
      fraud.producer.ts             -- Enqueue BullMQ jobs
      workers/
        fraud-check.worker.ts       -- Worker temps reel (evenements)
        fraud-batch.worker.ts       -- Worker CRON (ratios, patterns)
        fraud-auto-lift.worker.ts   -- Worker de levee automatique
      services/
        fraud-rule.service.ts       -- CRUD regles + evaluation
        fraud-alert.service.ts      -- CRUD alertes
        fraud-suspension.service.ts -- Suspension auto + levee
        fraud-counter.service.ts    -- Compteurs Redis
        fraud-metric.service.ts     -- Calcul metriques SQL
        fraud-fingerprint.service.ts -- Device fingerprinting
        fraud-duplicate.service.ts  -- Detection de doublons (US-A040)
      dto/
        update-fraud-rule.dto.ts
        investigate-alert.dto.ts
        configure-thresholds.dto.ts
      guards/
        fraud-configure.guard.ts    -- Permission fraud:configure
```

### 7.2 Endpoints admin

```typescript
@Controller('admin/fraud')
@Roles(Role.ADMIN)
export class FraudController {

  // === ALERTES ===

  @Get('alerts')
  @RequirePermissions(AdminPermission.FRAUD_VIEW)
  listAlerts(@Query() filters: ListAlertsDto) {
    // Filtres : actorType, alertType, severity, status, dateRange
    // Pagination
    return this.fraudAlertService.list(filters);
  }

  @Get('alerts/:id')
  @RequirePermissions(AdminPermission.FRAUD_VIEW)
  getAlert(@Param('id') id: string) {
    return this.fraudAlertService.getById(id);
  }

  @Post('alerts/:id/investigate')
  @RequirePermissions(AdminPermission.FRAUD_INVESTIGATE)
  investigateAlert(
    @CurrentUser() admin: JwtPayload,
    @Param('id') id: string,
    @Body() dto: InvestigateAlertDto,
  ) {
    // dto.status = 'investigated' | 'false_positive' | 'resolved'
    // dto.comment (requis)
    return this.fraudAlertService.investigate(id, admin.id, dto);
  }

  // === REGLES ===

  @Get('rules')
  @RequirePermissions(AdminPermission.FRAUD_VIEW)
  listRules() {
    return this.fraudRuleService.list();
  }

  @Patch('rules/:id')
  @RequirePermissions(AdminPermission.FRAUD_CONFIGURE)
  updateRule(
    @CurrentUser() admin: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFraudRuleDto,
  ) {
    // Seuls threshold, windowDays/Hours/Minutes, minSampleSize,
    // cooldownHours, isActive sont modifiables
    // Le slug, metric, operator, action ne sont PAS modifiables par l'admin
    // (ils font partie de la logique metier)
    return this.fraudRuleService.update(id, admin.id, dto);
  }

  // === SUSPENSIONS ===

  @Get('suspensions')
  @RequirePermissions(AdminPermission.FRAUD_VIEW)
  listSuspensions(@Query() filters: ListSuspensionsDto) {
    return this.fraudSuspensionService.list(filters);
  }

  @Post('suspensions/:id/lift')
  @RequirePermissions(AdminPermission.CONSUMERS_REACTIVATE)
  liftSuspension(
    @CurrentUser() admin: JwtPayload,
    @Param('id') id: string,
    @Body() dto: LiftSuspensionDto,
  ) {
    return this.fraudSuspensionService.manualLift(id, admin.id, dto);
  }

  @Post('suspensions/:id/escalate')
  @RequirePermissions(AdminPermission.CONSUMERS_BAN)
  escalateToBan(
    @CurrentUser() admin: JwtPayload,
    @Param('id') id: string,
    @Body() dto: EscalateToBanDto,
  ) {
    // Escalade d'une suspension temporaire vers un bannissement permanent
    return this.fraudSuspensionService.escalateToBan(id, admin.id, dto);
  }

  // === DOUBLONS (US-A040) ===

  @Get('duplicates')
  @RequirePermissions(AdminPermission.FRAUD_VIEW)
  listDuplicates(@Query() filters: ListDuplicatesDto) {
    return this.fraudDuplicateService.list(filters);
  }

  @Post('duplicates/:id/merge')
  @RequirePermissions(AdminPermission.FRAUD_MERGE_ACCOUNTS)
  mergeAccounts(
    @CurrentUser() admin: JwtPayload,
    @Param('id') id: string,
    @Body() dto: MergeAccountsDto,
  ) {
    // dto.primaryAccountId, dto.secondaryAccountId
    return this.fraudDuplicateService.merge(id, admin.id, dto);
  }

  @Post('duplicates/:id/dismiss')
  @RequirePermissions(AdminPermission.FRAUD_INVESTIGATE)
  dismissDuplicate(
    @CurrentUser() admin: JwtPayload,
    @Param('id') id: string,
    @Body() dto: DismissDuplicateDto,
  ) {
    // Marquer comme faux positif
    return this.fraudDuplicateService.dismiss(id, admin.id, dto);
  }
}
```

### 7.3 Worker temps reel (FraudCheckWorker)

```typescript
@Processor('fraud-check')
export class FraudCheckWorker extends WorkerHost {
  constructor(
    private readonly counterService: FraudCounterService,
    private readonly ruleService: FraudRuleService,
    private readonly alertService: FraudAlertService,
    private readonly suspensionService: FraudSuspensionService,
  ) {
    super();
  }

  async process(job: Job<FraudCheckPayload>) {
    const { eventType, actorType, actorId, metadata } = job.data;

    // 1. Increment compteur Redis
    const counterKey = this.getCounterKey(eventType, actorId);
    await this.counterService.increment(counterKey, metadata.entityId);

    // 2. Charger les regles auto_suspend applicables a ce metric
    const metric = this.eventToMetric(eventType); // NO_SHOW → 'noshow_count'
    const rules = await this.ruleService.getActiveRules({
      actorType,
      metric,
      action: 'auto_suspend',
    });

    // 3. Evaluer chaque regle
    for (const rule of rules) {
      const count = await this.counterService.getCount(
        counterKey,
        this.windowToMs(rule),
      );

      if (count >= rule.threshold) {
        // 4. Verifier cooldown
        const inCooldown = await this.alertService.isInCooldown(
          rule.id,
          actorId,
          rule.cooldownHours,
        );
        if (inCooldown) continue;

        // 5. Creer alerte + suspension
        const alert = await this.alertService.create({
          alertType: rule.slug,
          actorType,
          actorId,
          severity: rule.severity,
          ruleId: rule.id,
          metricValue: count,
          thresholdValue: rule.threshold,
          details: { eventType, metadata, count, window: rule.windowDays },
        });

        await this.suspensionService.autoSuspend(actorId, alert, rule);
      }
    }
  }

  private eventToMetric(eventType: string): string {
    const map: Record<string, string> = {
      NO_SHOW: 'noshow_count',
      CONSUMER_CANCEL: 'cancel_count',
      CLAIM_OPENED: 'claim_count',
      REFUND_GRANTED: 'refund_count',
      SIGNUP: 'signup_count',
      HOLD_TIMEOUT: 'hold_expired_count',
      REFERRAL_CREATED: 'referral_count',
      MM_CONSUMER_CANCEL: 'mm_cancel_count',
      MM_TRANSACTION: 'mm_tx_count',
    };
    return map[eventType] ?? eventType;
  }
}
```

### 7.4 Worker batch (FraudBatchWorker)

```typescript
@Processor('fraud-batch')
export class FraudBatchWorker extends WorkerHost {
  constructor(
    private readonly ruleService: FraudRuleService,
    private readonly metricService: FraudMetricService,
    private readonly alertService: FraudAlertService,
    private readonly counterService: FraudCounterService,
  ) {
    super();
  }

  async process() {
    // 1. Charger toutes les regles actives de type 'alert'
    const alertRules = await this.ruleService.getActiveRules({ action: 'alert' });

    // 2. Evaluer les regles consommateur (ratios)
    const consumerRules = alertRules.filter(r => r.actorType === 'consumer');
    await this.evaluateConsumerRules(consumerRules);

    // 3. Evaluer les regles partenaire
    const partnerRules = alertRules.filter(r => r.actorType === 'partner');
    await this.evaluatePartnerRules(partnerRules);

    // 4. Evaluer les regles plateforme (seuils globaux)
    const platformRules = alertRules.filter(r => r.actorType === 'platform');
    await this.evaluatePlatformRules(platformRules);

    // 5. Reconcilier compteurs Redis
    await this.counterService.reconcileWithDatabase();

    // 6. Purger sorted sets anciens
    await this.counterService.purgeOldEntries();
  }

  private async evaluateConsumerRules(rules: FraudRule[]) {
    // Optimisation : ne scanner que les consommateurs avec une activite
    // recente (au lieu de scanner tous les 50 000)
    const activeConsumerIds = await this.metricService.getRecentlyActiveConsumers(
      Math.max(...rules.map(r => r.windowDays ?? 30)),
    );

    for (const consumerId of activeConsumerIds) {
      for (const rule of rules) {
        const value = await this.metricService.computeConsumerMetric(
          consumerId,
          rule.metric,
          rule.windowDays ?? 30,
        );
        const sampleSize = await this.metricService.getConsumerSampleSize(
          consumerId,
          rule.windowDays ?? 30,
        );

        if (sampleSize < rule.minSampleSize) continue;

        if (this.compare(value, rule.operator, Number(rule.threshold))) {
          const inCooldown = await this.alertService.isInCooldown(
            rule.id,
            consumerId,
            rule.cooldownHours,
          );
          if (inCooldown) continue;

          await this.alertService.create({
            alertType: rule.slug,
            actorType: 'consumer',
            actorId: consumerId,
            severity: rule.severity,
            ruleId: rule.id,
            metricValue: value,
            thresholdValue: Number(rule.threshold),
            details: {
              metric: rule.metric,
              sampleSize,
              window: rule.windowDays,
            },
          });
        }
      }
    }
  }
}
```

---

## 8. Gestion des appels et reactivation

### 8.1 Processus complet post-suspension automatique

```
   Suspension automatique
          │
          ▼
   ┌──────────────────────────────────────────┐
   │ ETAT : SUSPENDU (auto)                   │
   │                                          │
   │ Le consommateur recoit :                 │
   │ - Push notification                      │
   │ - Email avec :                           │
   │   - Raison de la suspension              │
   │   - Duree (7 jours par defaut)           │
   │   - Date de reactivation prevue          │
   │   - Lien vers support@bienbon.mu         │
   │   - Lien vers la politique d'utilisation  │
   └───────────────────┬──────────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
   ┌────────────┐ ┌────────┐ ┌──────────────┐
   │ Pas de     │ │ Contact│ │ Timer expire │
   │ contestat. │ │ support│ │ (7 jours)    │
   │            │ │        │ │              │
   │ Attend     │ │ Email  │ │ Job BullMQ   │
   │ 7 jours    │ │ a      │ │ fraud-auto-  │
   └─────┬──────┘ │ supp.  │ │ lift         │
         │        └───┬────┘ └──────┬───────┘
         │            │             │
         │            ▼             │
         │   ┌────────────────┐    │
         │   │ Admin examine  │    │
         │   │ le dossier     │    │
         │   │ (fraud:view +  │    │
         │   │  fraud:invest.)│    │
         │   └───┬──────┬─────┘    │
         │       │      │          │
         │       ▼      ▼          │
         │  ┌───────┐ ┌───────┐   │
         │  │ Faux  │ │ Conf. │   │
         │  │ positif│ │ fraude│   │
         │  └───┬───┘ └───┬───┘   │
         │      │         │       │
         │      ▼         ▼       │
         │  ┌───────┐ ┌───────┐   │
         │  │ Levee │ │ Esc.  │   │
         │  │ immed.│ │ → ban │   │
         │  │       │ │       │   │
         │  └───┬───┘ └───┬───┘   │
         │      │         │       │
         ▼      ▼         │       ▼
   ┌──────────────────┐   │  ┌────────────────┐
   │ REACTIV AUTO     │   │  │ REACTIV AUTO   │
   │ (timer ou admin) │   │  │ (timer expire) │
   │                  │   │  │                │
   │ - Statut ACTIVE  │   │  │ - Statut ACTIVE│
   │ - Notif push     │   │  │ - Notif push   │
   │ - Email          │   │  │ - Email        │
   │ - Audit log      │   │  │ - Audit log    │
   │                  │   │  │                │
   │ Note : les       │   │  │ Note : les     │
   │ compteurs        │   │  │ compteurs      │
   │ persistent.      │   │  │ persistent.    │
   │ Re-suspension    │   │  │ Si recidive,   │
   │ possible si      │   │  │ re-suspension  │
   │ recidive.        │   │  │ automatique.   │
   └──────────────────┘   │  └────────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │ BANNI        │
                  │              │
                  │ - Statut     │
                  │   BANNED     │
                  │ - Pas de     │
                  │   timer      │
                  │ - Seul       │
                  │   super_admin│
                  │   peut lever │
                  │   (ADR-011)  │
                  └──────────────┘
```

### 8.2 Politique d'escalade

| Occurrence | Suspension | Duree | Escalade possible |
|:----------:|-----------|:-----:|:-----------------:|
| 1ere suspension auto | Temporaire | 7 jours | Non |
| 2eme suspension auto (meme regle) | Temporaire | 14 jours | Oui (alerte admin) |
| 3eme suspension auto (meme regle) | Temporaire | 30 jours + alerte critique | Oui (recommandation de ban) |
| 4eme+ | Auto-ban recommande a l'admin | -- | Admin decide |

**Implementation :**

```typescript
async function computeSuspensionDuration(
  userId: string,
  ruleId: string,
): Promise<{ durationHours: number; shouldEscalate: boolean }> {
  const previousSuspensions = await prisma.fraudSuspension.count({
    where: { userId, ruleId, status: { not: 'active' } },
  });

  switch (previousSuspensions) {
    case 0: return { durationHours: 168,  shouldEscalate: false }; // 7 jours
    case 1: return { durationHours: 336,  shouldEscalate: true };  // 14 jours
    case 2: return { durationHours: 720,  shouldEscalate: true };  // 30 jours
    default: return { durationHours: 720, shouldEscalate: true };  // 30 jours + alerte critique
  }
}
```

---

## 9. Protection contre l'abus de parrainage (US-C060)

Le programme de parrainage est un vecteur de fraude classique. La detection repose sur deux mecanismes complementaires :

### 9.1 Validations preventives (dans le flow de parrainage)

| Validation | Description | Implementation |
|-----------|-------------|----------------|
| Auto-parrainage | Le filleul ne peut pas avoir le meme email ou telephone que le parrain | Check SQL avant creation du lien |
| Compte existant | Le filleul ne peut pas utiliser un email ou telephone deja utilise (meme supprime) | Check sur `profiles` incluant les `deleted_at IS NOT NULL` |
| Meme device | Le filleul s'inscrit depuis le meme device que le parrain | Check `device_fingerprints.device_id_hash` |
| Meme IP | Le filleul s'inscrit depuis la meme IP que le parrain dans les 24h | Check `device_fingerprints.ip_hash` |
| First purchase required | La recompense n'est attribuee qu'apres le premier retrait effectif du filleul (`PICKED_UP`, pas seulement `CONFIRMED`) | Logique dans `ReferralService` |
| Numero virtuel/temporaire | Detection des numeros de telephone virtuels ou temporaires (prefixes connus, services VoIP) | Liste de prefixes suspects + verification HLR si disponible (voir note ci-dessous) |
| Rate limit parrainage | Maximum 5 parrainages emis par parrain par 24h | Rate limiting dans `ReferralService`, compteur Redis `fraud:referral:{consumerId}` |

**Note sur la detection des numeros temporaires/virtuels** : la verification HLR (Home Location Register) permet de determiner si un numero est rattache a un operateur mobile physique (Emtel, my.t, MTML) ou a un service VoIP/virtuel. Cette verification a un cout par requete (~ $0.005-0.01/requete). Au MVP, on se limite a une liste de prefixes suspects (numeros hors indicatif +230, numeros avec formats atypiques). La verification HLR est envisageable en Phase 2 si le volume d'abus le justifie.

### 9.2 Detection post-hoc (regles C7, C10, C11)

La detection d'abus de parrainage s'appuie sur trois regles complementaires :

**Regle C7 (`consumer_referral_abuse`)** -- meme device/IP :
- 3+ parrainages depuis le meme device ou la meme IP en 30 jours
- Detecte les cas ou parrain et filleul partagent le meme appareil ou la meme connexion internet
- Genere une alerte pour investigation manuelle

**Regle C10 (`consumer_referral_velocity`)** -- rafale de parrainages :
- 5+ parrainages emis par le meme parrain en 24h
- Signal fort de creation de comptes fantomes pour accumuler les bonus
- Declenchement d'un blocage temporaire de la capacite de parrainage (pas de suspension de compte complete)
- Le parrain ne peut plus emettre de codes de parrainage pendant 24h

**Regle C11 (`consumer_referral_inactive_godchild`)** -- filleul inactif :
- Un filleul qui ne fait qu'une seule commande (le minimum pour declencher le bonus) puis n'a aucune activite pendant 30 jours
- Evaluee en batch (CRON) : requete SQL sur les filleuls ayant exactement 1 reservation `PICKED_UP` et aucune activite depuis 30 jours
- Genere une alerte haute pour investigation manuelle
- Si un parrain a plus de 50% de filleuls inactifs (min 3 filleuls), l'alerte est escaladee en critique

L'admin peut alors :
1. Examiner les comptes des filleuls (activite reelle ou comptes fantomes)
2. Verifier les signaux croises : meme device (C7), rafale (C10), filleuls inactifs (C11)
3. Revoquer les recompenses si fraude confirmee (UPDATE `referrals SET status = 'revoked'`)
4. Suspendre ou bannir le parrain
5. Suspendre les comptes filleuls fantomes identifies

---

## 9bis. Regles specifiques au mobile money (MCB Juice, Blink, my.t money)

Le mobile money a des caracteristiques fondamentalement differentes des cartes bancaires (cf. ADR-005, decision B1 -- modele hybride ; ADR-017, section 3.1.0) qui justifient des regles de fraude dediees :

| Aspect | Carte bancaire | Mobile money | Implication fraude |
|--------|---------------|-------------|-------------------|
| A la reservation | Pre-autorisation (PA), pas de debit | Debit immediat (DB) du wallet | Le consommateur perd l'argent immediatement |
| Annulation | Reversal gratuit et instantane | Remboursement (RF), delai 3-10 jours | Potentiel d'abus : le consommateur recupere l'argent en 3-10 jours mais le stock est bloque pendant le hold |
| Creneau de retrait | Capture (CP) de la PA | Pas d'appel Peach (fonds deja debites) | Moins de risque cote capture, mais le debit initial est irreversible rapidement |
| Velocity | Limitee par la banque emettrice | Limitee uniquement par le solde du wallet | Plus vulnerable aux transactions en rafale |

### 9bis.1 Pattern de remboursement suspect (regle C12)

**Scenario d'attaque** : un consommateur passe des commandes en mobile money (debit immediat), puis annule systematiquement avant le debut du creneau de retrait (transition R4 `CONFIRMED -> CANCELLED_CONSUMER`). A chaque annulation, un remboursement (RF) est initie. Le consommateur peut ainsi :
- Bloquer du stock pendant la periode entre la reservation et l'annulation
- Generer des couts de remboursement pour la plateforme (frais Peach par RF)
- Tester les limites du systeme de paiement

**Detection** : la regle C12 (`consumer_mm_refund_pattern`) detecte ce pattern en filtrant les annulations sur `payment_method_type = 'mobile_money'`. Le compteur Redis est `fraud:mm_cancel:{consumerId}`.

**Seuil** : 3 annulations mobile money en 7 jours → alerte haute. L'admin verifie manuellement si les annulations sont legitimes (probleme de creneau, erreur de commande) ou abusives.

**Implementation** : dans la transition R4 (`CONFIRMED -> CANCELLED_CONSUMER`, ADR-017), ajouter un effet conditionnel :

```typescript
// Dans les effets de R4 (ADR-017)
if (context.reservation.paymentMethodType === 'mobile_money') {
  await this.fraudEventEmitter.emit('fraud.event', {
    eventType: 'MM_CONSUMER_CANCEL',
    actorType: 'consumer',
    actorId: context.reservation.consumerId,
    metadata: {
      reservationId: context.reservation.id,
      paymentMethodType: 'mobile_money',
      refundAmount: context.reservation.totalPrice,
    },
  });
}
```

### 9bis.2 Velocity check mobile money (regle C13)

**Scenario** : le debit mobile money est immediat et irreversible a court terme. Un volume anormal de transactions mobile money en peu de temps peut indiquer :
- Une carte SIM volee ou un compte mobile money compromis
- Un bot qui exploite une faille
- Un test de limites avant une attaque plus large

**Detection** : la regle C13 (`consumer_mm_velocity`) compte les transactions mobile money (transition R1 `PENDING_PAYMENT -> CONFIRMED` avec `payment_method_type = 'mobile_money'`). Le compteur Redis est `fraud:mm_tx:{consumerId}`.

**Seuil** : 8 transactions mobile money en 1h → alerte critique. Ce seuil est calibre pour la volumetrie BienBon : un consommateur typique fait 1-2 reservations par jour. 8 en 1h est anormal.

**Action** : alerte critique aux admins. Pas d'auto-suspension (pour eviter de bloquer un consommateur qui commande pour un groupe), mais investigation immediate requise. Si le pattern est confirme, l'admin peut suspendre manuellement.

### 9bis.3 Coherence avec les transitions ADR-017

Les regles mobile money s'appuient sur les transitions existantes de la machine a etats reservation (ADR-017) :
- **C12** : declenchee par la transition R4 (`CONFIRMED -> CANCELLED_CONSUMER`) uniquement quand `payment_method_type = 'mobile_money'`
- **C13** : declenchee par la transition R1 (`PENDING_PAYMENT -> CONFIRMED`) uniquement quand `payment_method_type = 'mobile_money'`

Le discriminant `payment_method_type` est stocke sur la reservation lors de la transition R1 (ADR-017, section 3.1.0). Il est disponible dans le `TransitionContext` pour les effets de bord.

---

## 10. Detection de doublons (US-A040)

### 10.1 Criteres de detection

| Critere | Score de confiance | Implementation |
|---------|:------------------:|----------------|
| Meme email exact | 95% | Requete SQL directe |
| Email avec variations Gmail (points, +alias) | 90% | Normalisation : `john.doe+test@gmail.com` → `johndoe@gmail.com` |
| Meme telephone | 95% | Requete SQL directe (normalise avec indicatif +230) |
| Meme device ID (hash) | 80% | Join sur `device_fingerprints.device_id_hash` |
| Meme IP (hash) + inscription < 24h | 60% | Join sur `device_fingerprints.ip_hash` |

### 10.2 Job de detection (batch)

Le batch CRON (FraudBatchWorker) inclut une etape de detection de doublons :

```sql
-- Doublons par email Gmail normalise
SELECT
  normalize_gmail(p1.email) AS normalized_email,
  ARRAY_AGG(p1.id) AS account_ids,
  COUNT(*) AS account_count
FROM profiles p1
WHERE p1.email LIKE '%@gmail.com'
  AND p1.deleted_at IS NULL
GROUP BY normalize_gmail(p1.email)
HAVING COUNT(*) > 1;

-- Doublons par device fingerprint
SELECT
  df.device_id_hash,
  ARRAY_AGG(DISTINCT df.user_id) AS account_ids,
  COUNT(DISTINCT df.user_id) AS account_count
FROM device_fingerprints df
WHERE df.device_id_hash IS NOT NULL
  AND df.created_at >= NOW() - INTERVAL '90 days'
GROUP BY df.device_id_hash
HAVING COUNT(DISTINCT df.user_id) > 1;
```

Les resultats sont stockes comme `fraud_alerts` de type `consumer_multi_account` avec un score de confiance dans `details`.

### 10.3 Fusion de comptes

La fusion (US-A040) est une operation irreversible, reservee au super_admin (`fraud:merge_accounts`). Elle transfere toutes les donnees du compte secondaire vers le compte principal :

```typescript
async merge(primaryId: string, secondaryId: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Transferer les reservations
    await tx.reservation.updateMany({
      where: { consumerId: secondaryId },
      data: { consumerId: primaryId },
    });

    // 2. Transferer les reclamations
    await tx.claim.updateMany({
      where: { consumerId: secondaryId },
      data: { consumerId: primaryId },
    });

    // 3. Transferer les favoris (en evitant les doublons)
    // ... (UPSERT ou INSERT ON CONFLICT DO NOTHING)

    // 4. Transferer les avis
    // ... (attention : un seul avis par couple consommateur/partenaire/reservation)

    // 5. Transferer les parrainages
    await tx.referral.updateMany({
      where: { referrerId: secondaryId },
      data: { referrerId: primaryId },
    });

    // 6. Desactiver le compte secondaire
    await tx.profile.update({
      where: { id: secondaryId },
      data: { status: 'BANNED', deletedAt: new Date() },
    });

    // 7. Bloquer la reinscription avec le meme email/telephone
    // (le bannissement empeche deja la reinscription, ADR-017 P5)

    // 8. Audit log
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        actorType: 'admin',
        action: 'account.merged',
        entityType: 'profile',
        entityId: primaryId,
        changes: {
          merged_from: secondaryId,
          merged_to: primaryId,
        },
        metadata: { admin_ip: '...', admin_user_agent: '...' },
      },
    });

    // 9. Notifier l'utilisateur
    // Email : "Vos comptes ont ete fusionnes..."
  });
}
```

---

## 11. Decisions resumees

| # | Question | Decision | Justification |
|---|----------|----------|---------------|
| Q1 | Moteur de regles | Regles configurables en base (`fraud_rules`) | Les specs exigent des seuils configurables par l'admin. Le code en dur ne le permet pas. Le ML est disproportionne. |
| Q2 | Quand evaluer | Hybride : temps reel (BullMQ) pour les seuils absolus + batch CRON (15 min) pour les ratios et patterns | Suspension immediate pour les cas urgents, calculs lourds en batch. |
| Q3 | Compteurs | Redis sorted sets (temps reel) + SQL (batch, source de verite) avec reconciliation | Vitesse Redis pour les evaluations immediates, fiabilite SQL pour les ratios. |
| Q4 | Auto vs alerte | Auto-suspension uniquement pour les regles a haute confiance et urgentes (no-shows, annulations repetitives, bots). Jamais de suspension automatique des partenaires. | Minimiser les faux positifs. Le risque d'un partenaire suspendu a tort est disproportionne. |
| Q5 | Device fingerprinting | Hash (SHA-256 + salt) de IP et device ID, User-Agent en clair. Retention 90 jours. Base legale : interet legitime (DPA 2017). | Minimisation des donnees, transparence, retention limitee. |
| Q6 | Hold expiration attack | Regles C8 (alerte a 3 holds expires/24h) + C9 (blocage reservation 30 min a 5 holds expires/24h). Cooldown de reservation, pas de suspension de compte. | Le hold de 5 min (ADR-008) est un vecteur d'attaque. Le cooldown de reservation est proportionnel et limite les faux positifs (mauvaise connexion mobile a Maurice). |
| Q7 | Abus parrainage avance | Regles C7 (device/IP), C10 (rafale 5/24h), C11 (filleul inactif). Validations preventives + detection post-hoc. | Couverture multi-angle : meme device, velocity, comportement post-inscription. |
| Q8 | Mobile money specifics | Regles C12 (pattern remboursement 3 annulations mobile money/7j) + C13 (velocity 8 tx/1h). | Le debit immediat du mobile money (vs pre-autorisation carte) cree des vecteurs d'abus specifiques. |
| Q9 | Coherence ADR-017/ADR-022 | Integration avec les transitions de la machine a etats (R3 pour HOLD_TIMEOUT, R4 pour MM_CONSUMER_CANCEL, R1 pour MM_TRANSACTION). References croisees OWASP. | Pas d'invention de transitions (SYSTEM_CANCEL remplace par CONSUMER_CANCEL + `cancelled_by: 'system'` dans audit_logs). |

---

## 12. Seed initial des regles

```typescript
// prisma/seed.ts (ajout au seed existant)

await prisma.fraudRule.createMany({
  data: [
    // === CONSOMMATEUR ===
    {
      slug: 'consumer_noshow_auto',
      nameFr: 'No-shows recurrents (suspension auto)',
      nameEn: 'Recurring no-shows (auto suspend)',
      descriptionFr: 'Suspend automatiquement un consommateur apres N no-shows dans la fenetre',
      actorType: 'consumer',
      metric: 'noshow_count',
      operator: 'gte',
      threshold: 3,
      windowDays: 30,
      minSampleSize: 0,
      action: 'auto_suspend',
      severity: 'high',
      cooldownHours: 24,
    },
    {
      slug: 'consumer_noshow_rate',
      nameFr: 'Taux de no-show eleve',
      nameEn: 'High no-show rate',
      descriptionFr: 'Alerte quand le taux de no-show depasse le seuil sur les N dernieres reservations',
      actorType: 'consumer',
      metric: 'noshow_rate',
      operator: 'gte',
      threshold: 0.40,
      windowDays: 30,
      minSampleSize: 10,
      action: 'alert',
      severity: 'high',
      cooldownHours: 72,
    },
    {
      slug: 'consumer_claim_rate',
      nameFr: 'Reclamations systematiques',
      nameEn: 'Systematic claims',
      descriptionFr: 'Alerte quand le ratio reclamations/retraits depasse le seuil',
      actorType: 'consumer',
      metric: 'claim_rate',
      operator: 'gte',
      threshold: 0.30,
      windowDays: 30,
      minSampleSize: 5,
      action: 'alert',
      severity: 'high',
      cooldownHours: 72,
    },
    {
      slug: 'consumer_refund_abuse',
      nameFr: 'Abus de remboursements',
      nameEn: 'Refund abuse',
      descriptionFr: 'Alerte quand le nombre de remboursements obtenus depasse le seuil',
      actorType: 'consumer',
      metric: 'refund_count',
      operator: 'gte',
      threshold: 4,
      windowDays: 30,
      minSampleSize: 0,
      action: 'alert',
      severity: 'high',
      cooldownHours: 72,
    },
    {
      slug: 'consumer_cancel_pattern',
      nameFr: 'Annulations repetitives (suspension auto)',
      nameEn: 'Repetitive cancellations (auto suspend)',
      descriptionFr: 'Suspend automatiquement un consommateur apres N annulations en 7 jours',
      actorType: 'consumer',
      metric: 'cancel_count',
      operator: 'gte',
      threshold: 6,
      windowDays: 7,
      minSampleSize: 0,
      action: 'auto_suspend',
      severity: 'high',
      cooldownHours: 24,
    },
    {
      slug: 'consumer_multi_account',
      nameFr: 'Comptes multiples (meme appareil)',
      nameEn: 'Multiple accounts (same device)',
      descriptionFr: 'Alerte quand plusieurs comptes sont detectes sur le meme appareil',
      actorType: 'consumer',
      metric: 'device_account_count',
      operator: 'gte',
      threshold: 2,
      windowDays: 90,
      minSampleSize: 0,
      action: 'alert',
      severity: 'medium',
      cooldownHours: 168,
    },
    {
      slug: 'consumer_referral_abuse',
      nameFr: 'Abus de parrainage',
      nameEn: 'Referral abuse',
      descriptionFr: 'Alerte quand des parrainages multiples proviennent du meme appareil ou IP',
      actorType: 'consumer',
      metric: 'referral_same_device',
      operator: 'gte',
      threshold: 3,
      windowDays: 30,
      minSampleSize: 0,
      action: 'alert',
      severity: 'high',
      cooldownHours: 168,
    },
    {
      slug: 'consumer_hold_expiry_alert',
      nameFr: 'Holds expires repetitifs (alerte)',
      nameEn: 'Repeated hold expirations (alert)',
      descriptionFr: 'Alerte quand un consommateur laisse expirer N+ holds en 24h (transition R3 PENDING_PAYMENT -> EXPIRED via HOLD_TIMEOUT, ADR-008/ADR-017)',
      actorType: 'consumer',
      metric: 'hold_expired_count',
      operator: 'gte',
      threshold: 3,
      windowHours: 24,
      minSampleSize: 0,
      action: 'alert',
      severity: 'high',
      cooldownHours: 24,
    },
    {
      slug: 'consumer_hold_expiry_block',
      nameFr: 'Attaque par expiration de hold (blocage)',
      nameEn: 'Hold expiration attack (block)',
      descriptionFr: 'Bloque la capacite de reservation pendant 30 min quand un consommateur laisse expirer N+ holds en 24h',
      actorType: 'consumer',
      metric: 'hold_expired_count',
      operator: 'gte',
      threshold: 5,
      windowHours: 24,
      minSampleSize: 0,
      action: 'auto_suspend',
      severity: 'high',
      cooldownHours: 1,
    },
    {
      slug: 'consumer_referral_velocity',
      nameFr: 'Rafale de parrainages',
      nameEn: 'Referral velocity',
      descriptionFr: 'Blocage du parrainage quand un parrain emet N+ parrainages en 24h',
      actorType: 'consumer',
      metric: 'referral_count',
      operator: 'gte',
      threshold: 5,
      windowHours: 24,
      minSampleSize: 0,
      action: 'auto_suspend',
      severity: 'high',
      cooldownHours: 24,
    },
    {
      slug: 'consumer_referral_inactive_godchild',
      nameFr: 'Filleul inactif apres bonus',
      nameEn: 'Inactive godchild after bonus',
      descriptionFr: 'Alerte quand un filleul ne fait qu\'une seule commande puis devient inactif pendant 30 jours',
      actorType: 'consumer',
      metric: 'inactive_godchild_count',
      operator: 'gte',
      threshold: 1,
      windowDays: 30,
      minSampleSize: 0,
      action: 'alert',
      severity: 'high',
      cooldownHours: 168,
    },
    {
      slug: 'consumer_mm_refund_pattern',
      nameFr: 'Pattern remboursement mobile money suspect',
      nameEn: 'Suspicious mobile money refund pattern',
      descriptionFr: 'Alerte quand un consommateur annule systematiquement des commandes mobile money (debit immediat puis remboursement)',
      actorType: 'consumer',
      metric: 'mm_cancel_count',
      operator: 'gte',
      threshold: 3,
      windowDays: 7,
      minSampleSize: 0,
      action: 'alert',
      severity: 'high',
      cooldownHours: 72,
    },
    {
      slug: 'consumer_mm_velocity',
      nameFr: 'Velocity mobile money',
      nameEn: 'Mobile money velocity',
      descriptionFr: 'Alerte critique quand un consommateur effectue un volume anormal de transactions mobile money en 1h',
      actorType: 'consumer',
      metric: 'mm_tx_count',
      operator: 'gte',
      threshold: 8,
      windowHours: 1,
      minSampleSize: 0,
      action: 'alert',
      severity: 'critical',
      cooldownHours: 2,
    },

    // === PARTENAIRE ===
    {
      slug: 'partner_price_inflation',
      nameFr: 'Gonflement de la valeur initiale',
      nameEn: 'Initial value inflation',
      descriptionFr: 'Alerte quand le prix initial est significativement superieur a la moyenne du type de commerce',
      actorType: 'partner',
      metric: 'price_ratio_vs_category',
      operator: 'gte',
      threshold: 2.0,
      windowDays: 30,
      minSampleSize: 10,
      action: 'alert',
      severity: 'medium',
      cooldownHours: 168,
    },
    {
      slug: 'partner_cancel_with_reservations',
      nameFr: 'Annulations avec reservations',
      nameEn: 'Cancellations with reservations',
      descriptionFr: 'Alerte quand le ratio annulations (avec reservations) / publications depasse le seuil',
      actorType: 'partner',
      metric: 'cancel_with_res_rate',
      operator: 'gte',
      threshold: 0.15,
      windowDays: 30,
      minSampleSize: 10,
      action: 'alert',
      severity: 'high',
      cooldownHours: 72,
    },
    {
      slug: 'partner_claim_rate',
      nameFr: 'Taux de reclamations partenaire',
      nameEn: 'Partner claim rate',
      descriptionFr: 'Alerte quand le ratio reclamations/retraits du partenaire depasse le seuil',
      actorType: 'partner',
      metric: 'claim_rate',
      operator: 'gte',
      threshold: 0.20,
      windowDays: 30,
      minSampleSize: 10,
      action: 'alert',
      severity: 'high',
      cooldownHours: 72,
    },
    {
      slug: 'partner_hours_mismatch',
      nameFr: 'Horaires de retrait incoherents',
      nameEn: 'Pickup hours mismatch',
      descriptionFr: 'Alerte quand un creneau de retrait est en dehors des horaires d\'ouverture declares',
      actorType: 'partner',
      metric: 'hours_mismatch',
      operator: 'gte',
      threshold: 1,
      minSampleSize: 0,
      action: 'alert',
      severity: 'low',
      cooldownHours: 168,
    },
    {
      slug: 'partner_price_volatility',
      nameFr: 'Variations de prix extremes',
      nameEn: 'Extreme price variations',
      descriptionFr: 'Alerte quand l\'ecart-type des prix est anormalement eleve',
      actorType: 'partner',
      metric: 'price_stddev_ratio',
      operator: 'gte',
      threshold: 0.50,
      windowDays: 14,
      minSampleSize: 5,
      action: 'alert',
      severity: 'medium',
      cooldownHours: 168,
    },

    // === PLATEFORME ===
    {
      slug: 'platform_mass_cancel',
      nameFr: 'Annulations partenaire en masse',
      nameEn: 'Mass partner cancellations',
      descriptionFr: 'Alerte quand un partenaire annule plus de N paniers avec reservations en 1h',
      actorType: 'platform',
      metric: 'mass_cancel_count',
      operator: 'gte',
      threshold: 5,
      windowHours: 1,
      minSampleSize: 0,
      action: 'alert',
      severity: 'critical',
      cooldownHours: 1,
    },
    {
      slug: 'platform_claim_spike',
      nameFr: 'Pic de reclamations',
      nameEn: 'Claim spike',
      descriptionFr: 'Alerte quand le nombre de reclamations ouvertes depasse N en 2h',
      actorType: 'platform',
      metric: 'claim_spike_count',
      operator: 'gte',
      threshold: 20,
      windowHours: 2,
      minSampleSize: 0,
      action: 'alert',
      severity: 'critical',
      cooldownHours: 2,
    },
    {
      slug: 'platform_payment_failure',
      nameFr: 'Pic d\'echecs de paiement',
      nameEn: 'Payment failure spike',
      descriptionFr: 'Alerte quand le nombre d\'echecs de paiement depasse N en 30 min',
      actorType: 'platform',
      metric: 'payment_failure_count',
      operator: 'gte',
      threshold: 10,
      windowMinutes: 30,
      minSampleSize: 0,
      action: 'alert',
      severity: 'critical',
      cooldownHours: 1,
    },
    {
      slug: 'platform_noshow_spike',
      nameFr: 'Pic de no-shows',
      nameEn: 'No-show spike',
      descriptionFr: 'Alerte quand le taux global de no-show depasse N% sur 3h',
      actorType: 'platform',
      metric: 'noshow_spike_rate',
      operator: 'gte',
      threshold: 0.50,
      windowHours: 3,
      minSampleSize: 0,
      action: 'alert',
      severity: 'critical',
      cooldownHours: 3,
    },
    {
      slug: 'platform_reservation_drop',
      nameFr: 'Chute brutale des reservations',
      nameEn: 'Reservation drop',
      descriptionFr: 'Alerte quand les reservations chutent de N% vs meme tranche horaire la semaine precedente',
      actorType: 'platform',
      metric: 'reservation_drop_rate',
      operator: 'lte',
      threshold: -0.70,
      windowHours: 3,
      minSampleSize: 0,
      action: 'alert',
      severity: 'critical',
      cooldownHours: 6,
    },
    {
      slug: 'platform_signup_spike',
      nameFr: 'Inscriptions suspectes en masse',
      nameEn: 'Suspicious signup spike',
      descriptionFr: 'Alerte + suspension auto quand N+ inscriptions proviennent de la meme IP/device en 10 min',
      actorType: 'platform',
      metric: 'signup_same_source_count',
      operator: 'gte',
      threshold: 5,
      windowMinutes: 10,
      minSampleSize: 0,
      action: 'auto_suspend',
      severity: 'critical',
      cooldownHours: 1,
    },
    {
      slug: 'platform_major_partner_inactive',
      nameFr: 'Indisponibilite partenaire majeur',
      nameEn: 'Major partner inactive',
      descriptionFr: 'Alerte quand un partenaire representant plus de N% du CA n\'a pas publie de panier depuis N jours',
      actorType: 'platform',
      metric: 'major_partner_inactive_days',
      operator: 'gte',
      threshold: 3,
      windowDays: 30,
      minSampleSize: 0,
      action: 'alert',
      severity: 'medium',
      cooldownHours: 72,
    },
  ],
  skipDuplicates: true,
});
```

---

## 13. Jobs BullMQ

| Queue | Job | Type | Declencheur | Description |
|-------|-----|------|-------------|-------------|
| `fraud-check` | `fraud.check` | On-demand | Evenement metier (no-show, claim, cancel, signup) | Increment compteur Redis, evalue regles temps reel |
| `fraud-batch` | `fraud.batch` | Repeatable (15 min) | CRON | Evalue toutes les regles de ratio/pattern, reconcilie Redis, purge |
| `fraud-auto-lift` | `fraud.lift` | Delayed | Suspension automatique | Leve la suspension apres expiration du timer |
| `fraud-fingerprint-purge` | `fraud.purge-fp` | Repeatable (quotidien, 4h) | CRON | Purge les fingerprints > 90 jours |
| `fraud-hold-cooldown` | `fraud.hold-cooldown` | Delayed (30 min) | Regle C9 declenchee | Leve le blocage de reservation apres le cooldown de 30 min |
| `fraud-referral-cooldown` | `fraud.referral-cooldown` | Delayed (24h) | Regle C10 declenchee | Leve le blocage de parrainage apres le cooldown de 24h |

---

## 14. Priorites d'implementation

| Priorite | Composant | Effort | Dependances |
|:--------:|-----------|:------:|-------------|
| P0 | Table `fraud_rules` + seed + CRUD admin | 2j | ADR-003 |
| P0 | `FraudCheckWorker` (temps reel, no-show + cancel) | 2j | ADR-017, BullMQ |
| P0 | `FraudSuspensionService` (auto-suspend + auto-lift) | 2j | ADR-011, ADR-017 |
| P0 | Compteurs Redis (sorted sets) | 1j | Redis |
| P0 | Notifications de suspension (push + email) | 1j | ADR-014 |
| P1 | `FraudBatchWorker` (ratios consommateur + partenaire) | 3j | PostgreSQL |
| P1 | Device fingerprinting (collecte, hashage, stockage) | 2j | ADR-010 |
| P1 | Detection de doublons (batch + UI admin) | 2j | Device fingerprints |
| P1 | Regles plateforme (alertes de seuil, US-A041) | 2j | Batch worker |
| P2 | Fusion de comptes (US-A040) | 3j | Detection doublons |
| P2 | Dashboard anti-fraude (graphiques, evolution) | 2j | Toutes les tables |
| P2 | Politique d'escalade (durees progressives) | 1j | Suspension service |
| P2 | Reconciliation Redis <-> PostgreSQL | 1j | Batch worker |
| P1 | Hold expiration attack (regles C8/C9, cooldown reservation) | 1j | FraudCheckWorker, ADR-008 |
| P1 | Regles mobile money (C12/C13, velocity + refund pattern) | 1.5j | FraudCheckWorker, ADR-005 |
| P1 | Detection abus parrainage avancee (C10/C11, rafale + filleul inactif) | 1.5j | FraudBatchWorker, ReferralService |
| P2 | Integration root/jailbreak detection (ADR-022) avec alertes fraude | 0.5j | DeviceFingerprint, ADR-022 |
| | **Total** | **28.5j** | |

---

## 15. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Faux positif : un bon client est suspendu a tort | Moyenne | Eleve | `min_sample_size` protege les nouveaux utilisateurs. Le cooldown evite les suspensions en boucle. La reactivation auto apres 7 jours limite l'impact. Le support est joignable par email. |
| Redis perd des compteurs (crash, restart) | Faible | Faible | La reconciliation batch (toutes les 15 min) recalcule les compteurs depuis PostgreSQL. Le pire scenario est un delai de 15 min avant que les compteurs soient corrects. |
| L'admin configure un seuil dangereux (ex: 1 no-show = suspension) | Faible | Eleve | Seul le super_admin peut modifier les regles (`fraud:configure`). Validation en code : le seuil ne peut pas etre inferieur a une valeur plancher (ex: min 2 pour les no-shows). |
| Contournement du fingerprinting (VPN, reset device ID) | Moyenne | Moyen | Le fingerprinting est un signal complementaire, pas le seul. Les compteurs de no-show et de reclamation fonctionnent independamment du device. Le fingerprinting detecte les abus grossiers (auto-parrainage), pas les attaquants sophistiques. |
| Le batch CRON de 15 min manque un pic (pic entre deux iterations) | Faible | Moyen | Les regles les plus urgentes (no-show count, inscriptions en masse) sont evaluees en temps reel, pas en batch. Le batch couvre les ratios et les patterns, qui sont par nature des metriques "lentes". |
| Le volume d'alertes sature les admins | Moyenne | Moyen | Le cooldown evite les doublons. Les severites permettent de prioriser. A terme, un filtrage et un tableau de bord dedies (P2) faciliteront le triage. |
| La suspension automatique annule des reservations en cascade (ex: consommateur avec 5 reservations confirmees) | Faible | Moyen | Le nombre de reservations annulees est trace dans `fraud_suspensions.reservations_cancelled`. Si ce nombre est > 0, une alerte supplementaire est envoyee a l'admin pour verification. |
| Incompatibilite DPA avec le device fingerprinting | Faible | Eleve | Hashage des donnees sensibles, retention limitee a 90 jours, transparence dans la politique de confidentialite, base legale d'interet legitime. Consultation juridique recommandee avant le deploiement. |
| Faux positif hold expiration (mauvaise connexion mobile) | Moyenne | Moyen | A Maurice, les connexions mobiles peuvent etre instables (3G/4G), causant des timeouts de paiement involontaires. Le seuil de 3 holds expires pour l'alerte et 5 pour le blocage laisse une marge. Le cooldown de 30 min (et non une suspension de compte) limite l'impact sur les utilisateurs legitimes. |
| Abus mobile money non detectable (carte SIM secondaire) | Moyenne | Moyen | Un attaquant peut utiliser plusieurs cartes SIM / wallets mobile money pour contourner la velocity check (C13). Le fingerprinting du device (C6) et la detection multi-comptes (section 10) sont des signaux complementaires. |
| Contournement detection parrainage (VPN + device different) | Moyenne | Moyen | Un attaquant sophistique avec un VPN et un appareil different pour chaque filleul echappe aux regles C7/C10. La regle C11 (filleul inactif) reste efficace car elle analyse le comportement post-inscription, independamment du device. |

---

## 16. References

### Specs
- US-A038 : Signaux anti-fraude consommateur
- US-A039 : Signaux anti-fraude partenaire
- US-A040 : Detection de doublons de comptes et fusion
- US-A041 : Alertes de seuil (notifications admin urgentes)
- US-A020/A021/A022 : Suspendre, reactiver, bannir un consommateur
- US-C060 : Programme de parrainage

### ADR associees
- ADR-001 : Stack backend (NestJS, Redis, BullMQ)
- ADR-003 : Schema DB (table `fraud_alerts` existante, `app_settings`)
- ADR-005 : Paiement (modele hybride carte/mobile money, pre-autorisation vs debit immediat)
- ADR-008 : Double-booking et stock (hold temporaire 5 min, patron Hold/Claim -- vecteur hold expiration attack)
- ADR-011 : RBAC (permissions `fraud:view`, `fraud:investigate`, `fraud:merge_accounts`)
- ADR-014 : Notifications multi-canal (BullMQ workers, canaux)
- ADR-017 : State machines (transitions, effets de bord `incrementFraudCounter`, discriminant `payment_method_type`)
- ADR-022 : Securite applicative OWASP (rate limiting, A04 Insecure Design, root/jailbreak detection, logging securise)

### Legislation
- Data Protection Act 2017 (Maurice) -- sections 24-27 (base legale, minimisation, retention)
- Guide du Data Protection Office (DPO) de Maurice sur le profilage et la prise de decision automatisee
