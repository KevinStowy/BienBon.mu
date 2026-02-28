# ADR-008 : Prevention du double-booking et synchronisation du stock en temps reel

- **Statut** : Propose
- **Date** : 2026-02-27
- **Auteur** : Equipe Architecture BienBon
- **Derniere mise a jour** : 2026-02-27
- **US associees** : US-C024, US-C025, US-C036, US-T012, US-P015, US-P025, US-P029

---

## 1. Contexte

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. Les partenaires (commercants) publient un nombre limite de paniers surprise (ex: 5 paniers a Rs 50), et les consommateurs les reservent en ligne puis viennent les retirer en magasin.

### 1.1 Le probleme fondamental

Le stock est une **ressource finie et critique**. Lorsqu'un partenaire publie 5 paniers, exactement 5 consommateurs doivent pouvoir reserver -- ni plus, ni moins. Le scenario de concurrence critique est le suivant :

```
Temps    Consommateur A             Consommateur B             Stock
─────    ──────────────             ──────────────             ─────
t0       Ouvre fiche panier         Ouvre fiche panier           1
t1       Voit "1 disponible"        Voit "1 disponible"          1
t2       Clique "Confirmer"         Clique "Confirmer"           1
t3       ???                        ???                         ???
```

Sans mecanisme de protection, les deux consommateurs pourraient reserver le meme dernier panier, provoquant une **sur-reservation** (overbooking). C'est inacceptable car :
- Le partenaire n'a pas assez de paniers physiques a distribuer
- Un consommateur sera refuse au retrait apres avoir paye
- La confiance dans la plateforme est irremediablement degradee

### 1.2 Exigences extraites des specs

D'apres les user stories du projet, les contraintes sont :

| Ref | Exigence | Source |
|-----|----------|--------|
| E1 | Le stock est decremente **immediatement apres confirmation** de la reservation | US-C024 |
| E2 | La verification du stock se fait **au moment du clic sur "Confirmer"**, pas au chargement | US-C025, US-T012 |
| E3 | Si stock = 0 pendant le checkout : message clair + suggestions d'alternatives | US-C025 |
| E4 | Si stock a diminue mais reste > 0 : ajustement automatique de la quantite | US-C025, US-T012 |
| E5 | Annulation par consommateur = stock re-incremente immediatement | US-C027 |
| E6 | Le partenaire peut augmenter la quantite meme si des reservations existent | US-P015 |
| E7 | Le partenaire peut annuler un panier entier = toutes reservations annulees + remboursements | US-P029 |
| E8 | Le panier reste reserve 5 min apres un echec de paiement | US-C036 |
| E9 | La pre-autorisation intervient apres confirmation de la reservation | US-C024, US-C031 |
| E10 | Les reservations du partenaire se mettent a jour en temps reel | US-P025 |
| E11 | Aucun montant bloque si la reservation echoue | US-C025 |
| E12 | Le processus de reservation est atomique pour eviter les race conditions | US-T012 |

### 1.3 Volumetrie

| Metrique | Demarrage | Cible 18 mois | Pic theorique |
|----------|-----------|---------------|---------------|
| Partenaires actifs | ~30 | ~200 | ~500 |
| Consommateurs inscrits | ~500 | ~10 000 | ~50 000 |
| Reservations/jour | ~50 | ~1 000 | ~5 000 |
| Reservations simultanees sur 1 panier | 2-3 | 10-20 | 50-100 |
| Paniers actifs simultanes | ~30 | ~200 | ~1 000 |

Les pics de charge se concentrent sur deux creneaux : **midi (11h30-13h)** et **fin de journee (17h-19h)**. A Maurice (1,3M habitants), la concurrence sur un seul panier reste modeste comparee a des systemes de billetterie, mais les garanties de consistance doivent etre absolues.

---

## 2. Enonce de decision

Cette ADR couvre trois decisions architecturales interdependantes :

1. **Mecanisme de reservation atomique** : comment garantir qu'on ne vend jamais plus que le stock disponible
2. **Orchestration reservation/paiement** : dans quel ordre decrementer le stock et effectuer la pre-autorisation
3. **Synchronisation du stock en temps reel** : comment maintenir l'affichage a jour sur tous les clients

---

## 3. Options evaluees

### 3.1 Reservation atomique

#### Option A : Verrouillage optimiste (Optimistic Locking)

Chaque ligne de panier porte un `version` counter. La reservation fait :

```sql
BEGIN;
  SELECT stock, version FROM baskets WHERE id = $1;
  -- Logique applicative : verifier stock >= quantite_demandee
  UPDATE baskets
    SET stock = stock - $2, version = version + 1
    WHERE id = $1 AND version = $3;
  -- Si 0 rows affected : conflit, retry
COMMIT;
```

**Avantages** : Pas de lock en base, bon throughput en lecture, pattern bien connu.
**Inconvenients** : Retry storms possibles si forte concurrence sur un panier populaire ; logique de retry a implementer cote serveur ; le nombre de retries peut exploser si N clients concurrent sur le dernier panier.

#### Option B : Verrouillage pessimiste (Pessimistic Locking)

```sql
BEGIN;
  SELECT stock FROM baskets WHERE id = $1 FOR UPDATE;
  -- La ligne est verrouillee, les autres transactions attendent
  IF stock >= requested_quantity THEN
    UPDATE baskets SET stock = stock - $2 WHERE id = $1;
    INSERT INTO reservations (...);
  END IF;
COMMIT;
```

**Avantages** : Garantie forte, pas de retry applicatif, simple a raisonner.
**Inconvenients** : Contention sous charge (les transactions se serialisent sur la ligne) ; risque de deadlock si multi-tables mal ordonnees ; temps d'attente perceptible sous haute concurrence.

#### Option C : Queue de reservation (Serialized Processing)

Les demandes de reservation sont envoyees dans une queue (Redis Stream, RabbitMQ, SQS) partitionnee par `basket_id`. Un worker unique par partition traite les demandes sequentiellement.

```
Client --> API --> Queue[basket_42] --> Worker --> DB
                                         |
                                    Resultat via WebSocket/polling
```

**Avantages** : Garantie absolue de serialisation, zero race condition, decoupage clair.
**Inconvenients** : Latence ajoutee (async) ; complexite operationnelle (queue + worker + mecanisme de reponse) ; surdimensionne pour la volumetrie initiale ; le consommateur attend le resultat de maniere asynchrone, degradant l'UX.

#### Option D : Decrement conditionnel atomique (Conditional Atomic Decrement)

```sql
UPDATE baskets
  SET stock = stock - $2
  WHERE id = $1 AND stock >= $2
  RETURNING stock;
```

Si `RETURNING` renvoie une ligne : la reservation a reussi, le nouveau stock est connu.
Si aucune ligne renvoyee : le stock etait insuffisant.

**Avantages** : Une seule instruction SQL, atomique par nature dans PostgreSQL (row-level lock implicite le temps de l'UPDATE) ; pas de retry applicatif ; pas de lock explicite ; pas de version counter ; ultra-simple ; la plus performante des options.
**Inconvenients** : Moins flexible si la logique de reservation se complexifie beaucoup ; la verification et la modification sont couplees dans une seule requete.

#### Option E : Reservation temporaire (Hold/Claim Pattern)

Le consommateur "claim" un panier pour N minutes. Le stock est decremente au moment du claim. Si le paiement n'aboutit pas dans le delai, un job expire le claim et re-incremente le stock.

```
t0: Claim  --> stock decremente, reservation en statut "pending_payment"
t1: Paiement pre-auth --> reservation en statut "confirmed"
    OU
t1: Timeout (5 min) --> stock re-incremente, reservation en statut "expired"
```

**Avantages** : Le consommateur ne perd pas "son" panier pendant le checkout ; meilleure UX pour le flux de paiement ; compatible avec les redirections mobile wallet (MCB Juice, Blink, my.t money).
**Inconvenients** : Complexite accrue (job d'expiration, etats supplementaires) ; un consommateur peut bloquer du stock sans payer (DoS potentiel) ; necessite un mecanisme anti-abus.

---

### 3.2 Synchronisation temps reel du stock

#### Option W : WebSocket

Connexion bidirectionnelle persistante entre le client et le serveur. Le serveur push les mises a jour de stock en temps reel.

**Avantages** : Latence minimale (<100ms) ; bidirectionnel ; ideal pour le temps reel.
**Inconvenients** : Complexite serveur (gestion des connexions, rooms/channels, reconnexion) ; consommation memoire par connexion ; overkill si le seul besoin est le push de stock.

#### Option S : Server-Sent Events (SSE)

Connexion HTTP unidirectionnelle persistante, le serveur envoie des evenements au client.

**Avantages** : Plus simple que WebSocket ; reconnexion automatique native ; fonctionne sur HTTP/2 standard ; suffisant pour du push unidirectionnel (stock updates).
**Inconvenients** : Unidirectionnel seulement ; limite a ~6 connexions par domaine en HTTP/1.1 (non-probleme en HTTP/2) ; moins repandu dans les ecosystemes mobile.

#### Option P : Polling court (Short Polling, 5-10s)

Le client interroge le serveur toutes les N secondes pour obtenir le stock a jour.

```
Client: GET /api/baskets/42/stock  (toutes les 5s)
Server: { "stock": 3 }
```

**Avantages** : Trivial a implementer ; stateless ; fonctionne partout ; aucune infrastructure supplementaire.
**Inconvenients** : Latence (jusqu'a 5-10s de retard) ; charge serveur proportionnelle au nombre de clients x frequence ; gaspillage de bande passante quand le stock ne change pas.

#### Option L : Long Polling

Le client envoie une requete, le serveur la maintient ouverte jusqu'a ce qu'il y ait un changement ou timeout.

**Avantages** : Meilleure reactivity que le polling court ; moins de requetes inutiles.
**Inconvenients** : Complexite intermediaire ; connexions ouvertes cote serveur ; timeout a gerer ; moins efficace que SSE.

---

### 3.3 Orchestration reservation/paiement

#### Strategie 1 : Stock-first, then Pay (Decrementer puis pre-autoriser)

```
1. Decrementer le stock (atomique)
2. Tenter la pre-autorisation bancaire
3a. Si pre-auth OK --> reservation confirmee
3b. Si pre-auth KO --> re-incrementer le stock
```

#### Strategie 2 : Pay-first, then Stock (Pre-autoriser puis decrementer)

```
1. Tenter la pre-autorisation bancaire
2. Decrementer le stock (atomique)
2a. Si stock OK --> reservation confirmee
2b. Si stock KO --> annuler la pre-autorisation
```

#### Strategie 3 : Claim-Pay-Confirm (Hold temporaire + paiement + confirmation)

```
1. Claim temporaire (stock decremente, hold 5 min)
2. Tenter la pre-autorisation bancaire
3a. Si pre-auth OK --> reservation confirmee
3b. Si pre-auth KO --> stock re-incremente (ou 2e tentative dans le delai)
3c. Si timeout 5 min --> stock re-incremente automatiquement
```

---

## 4. Matrice de decision

### 4.1 Reservation atomique

| Critere (poids) | A. Optimistic Lock | B. Pessimistic Lock | C. Queue | D. Atomic Decrement | E. Hold/Claim |
|---|---|---|---|---|---|
| **Simplicite** (25%) | 3/5 - Retry logic | 4/5 - Simple | 2/5 - Infra lourde | **5/5 - 1 requete** | 3/5 - Job expiration |
| **Consistance** (30%) | 4/5 - OK avec retry | 5/5 - Forte | 5/5 - Serialisee | **5/5 - Atomique natif** | 4/5 - Depend du job |
| **Performance** (20%) | 3/5 - Retry storms | 3/5 - Contention | 2/5 - Latence async | **5/5 - Minimal** | 4/5 - Correct |
| **Scalabilite** (15%) | 4/5 | 3/5 - Lock contention | 5/5 - Horizontale | **4/5 - Verticale DB** | 4/5 |
| **Impact UX** (10%) | 3/5 - Retries transparents | 4/5 - Attente possible | 2/5 - Asynchrone | **5/5 - Instantane** | 5/5 - Panier "reserve" |
| **Score pondere** | **3.45** | **3.85** | **3.30** | **4.85** | **3.85** |

### 4.2 Synchronisation temps reel

| Critere (poids) | W. WebSocket | S. SSE | P. Polling court | L. Long Polling |
|---|---|---|---|---|
| **Simplicite** (30%) | 2/5 | **4/5** | 5/5 | 3/5 |
| **Reactivity** (25%) | 5/5 | **5/5** | 2/5 | 3/5 |
| **Scalabilite** (20%) | 3/5 | **4/5** | 3/5 | 3/5 |
| **Compatibilite** (15%) | 4/5 | **4/5** | 5/5 | 4/5 |
| **Cout operationnel** (10%) | 2/5 | **4/5** | 5/5 | 3/5 |
| **Score pondere** | **3.25** | **4.25** | **3.75** | **3.15** |

### 4.3 Orchestration reservation/paiement

| Critere | S1. Stock-first | S2. Pay-first | S3. Claim-Pay-Confirm |
|---|---|---|---|
| **Risque de sur-reservation** | Nul | Possible (entre pay et decrement) | Nul |
| **Risque de pre-auth orpheline** | Nul (on pre-auth seulement si stock OK) | Oui (pre-auth reussie mais stock epuise) | Nul (claim reserve le stock) |
| **UX echec de paiement** | Moyen (stock bloque ~secondes, puis libere) | Bon (pas de stock bloque) | Excellent (5 min pour retenter) |
| **Compatibilite mobile wallet** | Faible (redirection = stock bloque longtemps) | Bonne | Excellente (hold pendant redirection) |
| **Complexite** | Faible | Faible | Moyenne (job expiration) |

---

## 5. Decisions

### Decision 1 : Decrement conditionnel atomique (Option D) comme mecanisme de base

**Choix : Option D (Atomic Decrement) combineee avec Option E (Hold/Claim) pour le flux de paiement.**

Le mecanisme de reservation repose sur un `UPDATE` conditionnel atomique PostgreSQL :

```sql
UPDATE baskets
  SET stock = stock - $1
  WHERE id = $2 AND stock >= $1
  RETURNING id, stock;
```

Cette operation est :
- **Atomique** : PostgreSQL prend un row-level lock implicite le temps du `UPDATE`, ce qui garantit que deux `UPDATE` concurrents ne peuvent pas lire le meme stock et le decrementer chacun.
- **Sans retry** : Pas besoin de version counter ni de logique de retry applicatif.
- **Performante** : Une seule instruction SQL, pas de round-trips multiples.
- **Simple** : La verification (`stock >= $1`) et la modification (`stock - $1`) sont dans la meme instruction.

**Justification** : Pour la volumetrie de BienBon (max 50-100 reservations simultanees sur un panier en scenario extreme), le row-level lock implicite de PostgreSQL est largement suffisant. Les transactions seront serialisees au niveau de la ligne pendant quelques millisecondes, ce qui est imperceptible. Cette approche elimine toute une classe de bugs liee aux retries, aux race conditions entre SELECT et UPDATE, et aux deadlocks.

### Decision 2 : Patron Hold/Claim de 5 minutes pour le flux de paiement

**Choix : Strategie S3 (Claim-Pay-Confirm) avec un hold de 5 minutes.**

Le flux complet de reservation est :

```
1. Le consommateur clique "Confirmer la reservation"
2. Le serveur execute le decrement atomique (Decision 1)
3. Si stock OK : creation d'une reservation en statut "pending_payment" avec expiration = now() + 5 min
4. Le serveur initie la pre-autorisation bancaire / redirection mobile wallet
5a. Pre-auth OK --> reservation passe en statut "confirmed"
5b. Pre-auth KO --> le consommateur peut retenter dans les 5 min (US-C036)
5c. Timeout 5 min sans paiement --> job d'expiration re-incremente le stock, reservation "expired"
```

**Justification** :
- **US-C036 l'exige explicitement** : "Le panier reste reserve pendant 5 minutes apres un echec de paiement pour laisser le temps au consommateur de corriger".
- **Les mobile wallets l'imposent** : MCB Juice, Blink et my.t money impliquent une redirection vers une app externe. Pendant cette redirection (qui peut prendre 30s a 2min), le stock doit etre reserve.
- **Anti-frustration** : Sans hold, un consommateur dont la carte est refusee verrait son panier repris par quelqu'un d'autre pendant qu'il corrige ses informations.

**Mecanisme d'expiration** :

```sql
-- Job planifie toutes les 30 secondes (ou cron-like)
UPDATE baskets b
  SET stock = b.stock + r.quantity
  FROM reservations r
  WHERE r.basket_id = b.id
    AND r.status = 'pending_payment'
    AND r.expires_at < NOW()
  RETURNING r.id;

-- Puis marquer les reservations expirees
UPDATE reservations
  SET status = 'expired'
  WHERE id = ANY($1);
```

**Protection anti-abus** : Limiter a 1 reservation `pending_payment` par consommateur par panier. Un consommateur ne peut pas "bloquer" N paniers en parallele sur le meme partenaire.

### Decision 3 : Server-Sent Events (SSE) pour la synchronisation du stock

**Choix : Option S (SSE) des le MVP, avec polling court (Option P) en fallback.**

Architecture :

```
                   ┌──────────────────────────────────────────┐
                   │             Serveur API                   │
                   │                                          │
  Reservation -->  │  UPDATE stock  ──>  Publish event        │
                   │                     "stock_changed"       │
                   │                          |                │
                   │                          v                │
                   │                   Event Bus interne       │
                   │                  (PostgreSQL LISTEN/      │
                   │                   NOTIFY ou Redis         │
                   │                   Pub/Sub)                │
                   │                          |                │
                   │                          v                │
                   │                   SSE Endpoint            │
                   │                   /api/baskets/:id/       │
                   │                        stock-stream       │
                   └────────────┬─────────────────────────────┘
                                |
                    ┌───────────┴───────────┐
                    |                       |
               Client A (SSE)         Client B (SSE)
               "Plus que 2!"          "Plus que 2!"
```

**Implementation** :

```
GET /api/baskets/{id}/stock-stream
Accept: text/event-stream

-- Reponse (stream) --
event: stock_update
data: {"basket_id": 42, "stock": 3, "total": 5}

event: stock_update
data: {"basket_id": 42, "stock": 2, "total": 5}

event: stock_update
data: {"basket_id": 42, "stock": 0, "total": 5}
```

**Justification** :
- **Reactivity identique a WebSocket** pour du push unidirectionnel (notre seul besoin ici).
- **Plus simple que WebSocket** : pas de protocole de handshake specifique, pas de gestion de "rooms", reconnexion automatique native via `EventSource` API.
- **Compatible HTTP/2** : multiplexage natif, pas de limite de connexions.
- **Fallback polling** : Pour les rares clients qui ne supporteraient pas SSE, un endpoint REST classique `GET /api/baskets/{id}/stock` repond au polling toutes les 5s.

**Quand migrer vers WebSocket** : Si un besoin bidirectionnel fort emerge (ex: chat en direct entre partenaire et consommateur, encheres en temps reel). Pour le simple push de stock, SSE est suffisant a toute echelle envisageable.

---

## 6. Flux detailles

### 6.1 Flux nominal : Reservation reussie (carte bancaire)

```
Consommateur                    API BienBon                    PostgreSQL              PSP (Stripe, etc.)
     |                               |                              |                        |
     |  POST /reservations           |                              |                        |
     |  {basket_id, qty, payment}    |                              |                        |
     |------------------------------>|                              |                        |
     |                               |  UPDATE baskets              |                        |
     |                               |  SET stock = stock - qty     |                        |
     |                               |  WHERE id=X AND stock >= qty |                        |
     |                               |----------------------------->|                        |
     |                               |                              |                        |
     |                               |  RETURNING stock (OK, 1 row) |                        |
     |                               |<-----------------------------|                        |
     |                               |                              |                        |
     |                               |  INSERT reservation          |                        |
     |                               |  (status=pending_payment,    |                        |
     |                               |   expires_at=now()+5min)     |                        |
     |                               |----------------------------->|                        |
     |                               |                              |                        |
     |                               |  NOTIFY 'stock_changed'      |                        |
     |                               |----------------------------->|                        |
     |                               |                              |                        |
     |                               |  Pre-autorisation            |                        |
     |                               |----------------------------------------------------->|
     |                               |                              |                        |
     |                               |  Pre-auth OK                 |                        |
     |                               |<-----------------------------------------------------|
     |                               |                              |                        |
     |                               |  UPDATE reservation          |                        |
     |                               |  SET status='confirmed'      |                        |
     |                               |----------------------------->|                        |
     |                               |                              |                        |
     |  201 Created                  |                              |                        |
     |  {reservation, qr_code, pin}  |                              |                        |
     |<------------------------------|                              |                        |
     |                               |                              |                        |
     |                               |  SSE: stock_update           |                        |
     |                               |  broadcast to all clients    |                        |
     |<------------------------------|  on basket X                 |                        |
```

### 6.2 Flux concurrent : Deux consommateurs, un seul panier restant

```
Consommateur A                  API BienBon                    PostgreSQL
     |                               |                              |
Consommateur B                       |                              |
     |                               |                              |
     |  POST /reservations (qty=1)   |                              |
     |------------------------------>|                              |
     |                               |                              |
     |         POST /reservations (qty=1)                           |
     |         --------------------->|                              |
     |                               |                              |
     |                               |  [Transaction A]             |
     |                               |  UPDATE baskets              |
     |                               |  SET stock = stock - 1       |
     |                               |  WHERE id=X AND stock >= 1   |
     |                               |----------------------------->|
     |                               |                              | -- Row lock acquired
     |                               |                              |    par Transaction A
     |                               |  [Transaction B]             |
     |                               |  UPDATE baskets              |
     |                               |  SET stock = stock - 1       |
     |                               |  WHERE id=X AND stock >= 1   |
     |                               |------ BLOCKED (attend) ----->|
     |                               |                              |
     |                               |  [Transaction A commit]      |
     |                               |  RETURNING stock = 0 (OK!)   |
     |                               |<-----------------------------|
     |                               |                              | -- Row lock released
     |                               |                              |
     |                               |  [Transaction B reprend]     |
     |                               |  stock = 0, condition        |
     |                               |  stock >= 1 est FALSE        |
     |                               |  --> 0 rows returned         |
     |                               |<-----------------------------|
     |                               |                              |
     |  201 Created (reservation OK) |                              |
     |<------------------------------|                              |
     |                               |                              |
     |         409 Conflict          |                              |
     |         "Desole, ce panier    |                              |
     |          vient d'etre reserve"|                              |
     |         <---------------------|                              |
     |                               |                              |
     |                               |  SSE: stock_update {stock:0} |
     |<------------------------------|  broadcast                   |
     |         <---------------------|                              |
```

**Point cle** : La Transaction B est bloquee pendant quelques millisecondes (le temps que A commit). Quand elle reprend, elle evalue la condition `WHERE stock >= 1` sur la valeur **apres** le commit de A (stock = 0). La condition echoue, 0 rows sont affectees. **Aucune sur-reservation n'est possible.**

### 6.3 Flux d'echec de paiement avec hold de 5 minutes

```
Consommateur                    API BienBon                    PostgreSQL              PSP
     |                               |                              |                    |
     |  POST /reservations           |                              |                    |
     |------------------------------>|                              |                    |
     |                               |  Decrement atomique (OK)     |                    |
     |                               |----------------------------->|                    |
     |                               |  Reservation pending_payment |                    |
     |                               |  expires_at = +5min          |                    |
     |                               |----------------------------->|                    |
     |                               |                              |                    |
     |                               |  Pre-autorisation            |                    |
     |                               |------------------------------------------------->|
     |                               |  Pre-auth ECHEC (fonds insuf)|                    |
     |                               |<-------------------------------------------------|
     |                               |                              |                    |
     |  200 OK                       |                              |                    |
     |  {status: "payment_failed",   |                              |                    |
     |   retry_until: "+5min",       |                              |                    |
     |   message: "Fonds insuf..."}  |                              |                    |
     |<------------------------------|                              |                    |
     |                               |                              |                    |
     |  (Consommateur change de      |                              |                    |
     |   moyen de paiement)          |                              |                    |
     |                               |                              |                    |
     |  POST /reservations/:id/retry |                              |                    |
     |------------------------------>|                              |                    |
     |                               |  Verifier expires_at > now() |                    |
     |                               |----------------------------->|                    |
     |                               |  OK, encore 3 min            |                    |
     |                               |                              |                    |
     |                               |  Pre-autorisation (new card) |                    |
     |                               |------------------------------------------------->|
     |                               |  Pre-auth OK                 |                    |
     |                               |<-------------------------------------------------|
     |                               |                              |                    |
     |                               |  UPDATE reservation          |                    |
     |                               |  SET status='confirmed'      |                    |
     |                               |----------------------------->|                    |
     |                               |                              |                    |
     |  201 Created                  |                              |                    |
     |<------------------------------|                              |                    |
```

### 6.4 Flux d'expiration du hold (timeout 5 minutes)

```
                                API BienBon                    PostgreSQL
                                     |                              |
                                     |  [Cron job / toutes les 30s] |
                                     |                              |
                                     |  SELECT r.id, r.basket_id,   |
                                     |         r.quantity            |
                                     |  FROM reservations r          |
                                     |  WHERE status='pending_payment|
                                     |    AND expires_at < NOW()     |
                                     |----------------------------->|
                                     |                              |
                                     |  Resultats: [{id:99,         |
                                     |    basket_id:42, qty:1}]     |
                                     |<-----------------------------|
                                     |                              |
                                     |  UPDATE baskets              |
                                     |  SET stock = stock + 1       |
                                     |  WHERE id = 42               |
                                     |----------------------------->|
                                     |                              |
                                     |  UPDATE reservations         |
                                     |  SET status = 'expired'      |
                                     |  WHERE id = 99               |
                                     |----------------------------->|
                                     |                              |
                                     |  NOTIFY 'stock_changed'      |
                                     |----------------------------->|
                                     |                              |
                                     |  SSE: stock_update           |
                                     |  broadcast {stock: 1}        |
                                     |  (le panier redevient dispo!)|
```

### 6.5 Flux : Annulation par le consommateur

```
Consommateur                    API BienBon                    PostgreSQL              PSP
     |                               |                              |                    |
     |  DELETE /reservations/:id     |                              |                    |
     |------------------------------>|                              |                    |
     |                               |  Verifier : creneau non      |                    |
     |                               |  commence (heure MUT UTC+4)  |                    |
     |                               |----------------------------->|                    |
     |                               |                              |                    |
     |                               |  UPDATE baskets              |                    |
     |                               |  SET stock = stock + 1       |                    |
     |                               |  WHERE id = basket_id        |                    |
     |                               |----------------------------->|                    |
     |                               |                              |                    |
     |                               |  UPDATE reservations         |                    |
     |                               |  SET status =                |                    |
     |                               |  'cancelled_by_consumer'     |                    |
     |                               |----------------------------->|                    |
     |                               |                              |                    |
     |                               |  Annuler pre-autorisation    |                    |
     |                               |------------------------------------------------->|
     |                               |  Pre-auth annulee OK         |                    |
     |                               |<-------------------------------------------------|
     |                               |                              |                    |
     |                               |  NOTIFY 'stock_changed'      |                    |
     |                               |----------------------------->|                    |
     |                               |                              |                    |
     |  200 OK                       |                              |                    |
     |  {status: "cancelled"}        |                              |                    |
     |<------------------------------|                              |                    |
     |                               |                              |                    |
     |                               |  SSE: stock_update           |                    |
     |                               |  broadcast {stock: +1}       |                    |
```

### 6.6 Flux : Annulation d'un panier entier par le partenaire (US-P029)

```
Partenaire                      API BienBon                    PostgreSQL              PSP
     |                               |                              |                    |
     |  POST /baskets/:id/cancel     |                              |                    |
     |  {reason: "Panne four"}       |                              |                    |
     |------------------------------>|                              |                    |
     |                               |                              |                    |
     |                               |  BEGIN TRANSACTION           |                    |
     |                               |                              |                    |
     |                               |  UPDATE baskets              |                    |
     |                               |  SET status = 'cancelled',   |                    |
     |                               |      stock = 0               |                    |
     |                               |  WHERE id = X                |                    |
     |                               |----------------------------->|                    |
     |                               |                              |                    |
     |                               |  SELECT reservations         |                    |
     |                               |  WHERE basket_id = X         |                    |
     |                               |  AND status IN ('confirmed', |                    |
     |                               |    'pending_payment')        |                    |
     |                               |----------------------------->|                    |
     |                               |                              |                    |
     |                               |  Pour chaque reservation :   |                    |
     |                               |  UPDATE SET status =         |                    |
     |                               |  'cancelled_by_partner'      |                    |
     |                               |----------------------------->|                    |
     |                               |                              |                    |
     |                               |  COMMIT                      |                    |
     |                               |                              |                    |
     |                               |  Pour chaque reservation :   |                    |
     |                               |  Annuler pre-auth /          |                    |
     |                               |  Initier remboursement       |                    |
     |                               |------------------------------------------------->|
     |                               |                              |                    |
     |                               |  Envoyer notifications push  |                    |
     |                               |  a chaque consommateur       |                    |
     |                               |                              |                    |
     |  200 OK                       |                              |                    |
     |  {cancelled_reservations: 4,  |                              |                    |
     |   refunds_initiated: 4}       |                              |                    |
     |<------------------------------|                              |                    |
     |                               |                              |                    |
     |                               |  SSE: basket_cancelled       |                    |
     |                               |  broadcast to all clients    |                    |
```

### 6.7 Flux : Reservation avec redirection mobile wallet (MCB Juice)

```
Consommateur                    API BienBon                    MCB Juice
     |                               |                              |
     |  POST /reservations           |                              |
     |  {payment: "mcb_juice"}       |                              |
     |------------------------------>|                              |
     |                               |                              |
     |                               |  Decrement atomique (OK)     |
     |                               |  Reservation pending_payment |
     |                               |  expires_at = +5min          |
     |                               |                              |
     |                               |  Initier pre-auth MCB Juice  |
     |                               |----------------------------->|
     |                               |  Redirect URL                |
     |                               |<-----------------------------|
     |                               |                              |
     |  302 Redirect                 |                              |
     |  --> MCB Juice App            |                              |
     |<------------------------------|                              |
     |                               |                              |
     |  [Consommateur valide         |                              |
     |   dans l'app MCB Juice]       |                              |
     |  (peut prendre 30s a 2min)    |                              |
     |------------------------------>|                              |
     |                               |                              |
     |                               |  Webhook: payment_authorized |
     |                               |<-----------------------------|
     |                               |                              |
     |  Redirect back to BienBon     |                              |
     |  GET /reservations/:id/return |                              |
     |------------------------------>|                              |
     |                               |  Reservation -> confirmed    |
     |                               |                              |
     |  200 OK (confirmation page)   |                              |
     |<------------------------------|                              |
```

**Le hold de 5 minutes est critique ici** : la redirection vers MCB Juice, Blink ou my.t money peut prendre 1 a 2 minutes. Sans hold, le stock serait libere avant que le consommateur ait eu le temps de valider dans l'app externe.

---

## 7. Schema de base de donnees (partiel, lie a cette ADR)

```sql
-- Table des paniers
CREATE TABLE baskets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id      UUID NOT NULL REFERENCES partners(id),
    title           VARCHAR(60) NOT NULL,
    stock           INTEGER NOT NULL CHECK (stock >= 0),
    total_quantity  INTEGER NOT NULL CHECK (total_quantity > 0),
    price           DECIMAL(10,2) NOT NULL,
    original_value  DECIMAL(10,2) NOT NULL,
    pickup_start    TIMESTAMPTZ NOT NULL,
    pickup_end      TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'sold_out', 'pickup_in_progress',
                                       'completed', 'cancelled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les requetes de stock
CREATE INDEX idx_baskets_stock ON baskets(id, stock) WHERE status = 'active';

-- Table des reservations
CREATE TABLE reservations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    basket_id       UUID NOT NULL REFERENCES baskets(id),
    consumer_id     UUID NOT NULL REFERENCES consumers(id),
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    total_price     DECIMAL(10,2) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending_payment'
                    CHECK (status IN ('pending_payment', 'confirmed', 'pickup_done',
                                       'no_show', 'cancelled_by_consumer',
                                       'cancelled_by_partner', 'expired')),
    qr_code         VARCHAR(255),
    pin_code        VARCHAR(6),
    expires_at      TIMESTAMPTZ,  -- NULL si confirmed, set si pending_payment
    payment_method  VARCHAR(20),
    preauth_id      VARCHAR(255), -- Reference pre-autorisation PSP
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Un consommateur ne peut avoir qu'une reservation pending_payment par panier
    CONSTRAINT unique_pending_per_consumer_basket
        EXCLUDE USING gist (
            consumer_id WITH =,
            basket_id WITH =
        ) WHERE (status = 'pending_payment')
);

-- Index pour le job d'expiration
CREATE INDEX idx_reservations_expiring
    ON reservations(expires_at)
    WHERE status = 'pending_payment';

-- Index pour les requetes partenaire
CREATE INDEX idx_reservations_basket_status
    ON reservations(basket_id, status);

-- Trigger pour mettre a jour le statut du panier quand stock = 0
CREATE OR REPLACE FUNCTION update_basket_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock = 0 AND OLD.stock > 0 THEN
        NEW.status := 'sold_out';
    ELSIF NEW.stock > 0 AND OLD.stock = 0 THEN
        NEW.status := 'active';
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_basket_status
    BEFORE UPDATE OF stock ON baskets
    FOR EACH ROW
    EXECUTE FUNCTION update_basket_status();

-- Notification PostgreSQL pour SSE
CREATE OR REPLACE FUNCTION notify_stock_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.stock IS DISTINCT FROM NEW.stock THEN
        PERFORM pg_notify('stock_changed',
            json_build_object(
                'basket_id', NEW.id,
                'stock', NEW.stock,
                'total', NEW.total_quantity,
                'status', NEW.status
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_stock
    AFTER UPDATE OF stock ON baskets
    FOR EACH ROW
    EXECUTE FUNCTION notify_stock_change();
```

---

## 8. Gestion des cas limites

### 8.1 Partenaire augmente la quantite (US-P015)

```sql
-- Le partenaire veut ajouter 3 paniers supplementaires
UPDATE baskets
  SET stock = stock + 3,
      total_quantity = total_quantity + 3
  WHERE id = $1
    AND total_quantity + 3 >= total_quantity  -- overflow check
  RETURNING stock, total_quantity;
```

Cela re-declenche le trigger `notify_stock_change` et tous les clients SSE voient la mise a jour. Si le panier etait `sold_out`, le trigger `update_basket_status` le repasse en `active`.

### 8.2 Race condition : expiration du hold vs paiement tardif

Scenario : le job d'expiration s'execute exactement au moment ou le webhook de paiement arrive.

**Solution** : utiliser une transaction avec un `SELECT FOR UPDATE` sur la reservation pour serialiser l'acces :

```sql
-- Cote webhook de paiement
BEGIN;
  SELECT status FROM reservations WHERE id = $1 FOR UPDATE;
  -- Si status = 'pending_payment' : continuer
  -- Si status = 'expired' : rejeter, annuler la pre-auth
  UPDATE reservations SET status = 'confirmed' WHERE id = $1 AND status = 'pending_payment';
COMMIT;

-- Cote job d'expiration
BEGIN;
  SELECT status FROM reservations WHERE id = $1 FOR UPDATE;
  -- Si status = 'confirmed' : ne rien faire (le paiement est passe avant)
  -- Si status = 'pending_payment' : expirer
  UPDATE reservations SET status = 'expired' WHERE id = $1 AND status = 'pending_payment';
  UPDATE baskets SET stock = stock + qty WHERE id = basket_id;
COMMIT;
```

Le `FOR UPDATE` garantit que l'un des deux (webhook ou job) attend l'autre. Le premier qui acquiert le lock gagne et change le statut. Le second voit le nouveau statut et agit en consequence.

### 8.3 Crash du serveur pendant une reservation

Si le serveur crash entre le decrement du stock et la creation de la reservation, le stock est decremente sans reservation correspondante (stock "perdu").

**Solution** : Les deux operations sont dans la **meme transaction SQL** :

```sql
BEGIN;
  UPDATE baskets SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING stock;
  INSERT INTO reservations (basket_id, consumer_id, quantity, status, expires_at)
    VALUES ($2, $3, $1, 'pending_payment', NOW() + INTERVAL '5 minutes');
COMMIT;
```

Si le serveur crash avant le `COMMIT`, PostgreSQL rollback automatiquement. Ni le stock ni la reservation ne sont modifies. Le consommateur recoit une erreur reseau (US-T010) et peut retenter.

### 8.4 Double-clic du consommateur

Si le consommateur clique deux fois sur "Confirmer", deux requetes arrivent au serveur.

**Solution** : Cle d'idempotence. Le client genere un `idempotency_key` (UUID) et l'envoie dans le header. Le serveur stocke le resultat de la premiere requete et retourne le meme resultat pour la seconde.

```sql
-- Contrainte d'unicite
CREATE UNIQUE INDEX idx_reservations_idempotency
    ON reservations(idempotency_key)
    WHERE idempotency_key IS NOT NULL;
```

### 8.5 Stock negatif (defensive programming)

Meme si le `WHERE stock >= $1` devrait prevenir tout stock negatif, une contrainte CHECK en base sert de filet de securite :

```sql
CHECK (stock >= 0)
```

Toute transaction qui tenterait de passer le stock en negatif echouerait avec une erreur PostgreSQL, meme si un bug applicatif contournait la clause WHERE.

---

## 9. Strategie de migration et evolutivite

### 9.1 Phase 1 : MVP (Mois 1-3)

- Decrement atomique PostgreSQL (Decision 1)
- Hold/Claim 5 minutes (Decision 2)
- SSE via `pg_notify` (Decision 3)
- Job d'expiration via un cron applicatif (setInterval toutes les 30s)
- 1 instance serveur

### 9.2 Phase 2 : Croissance (Mois 4-12)

- Ajout de Redis Pub/Sub comme bus d'evenements inter-instances (remplacement de `pg_notify` qui est intra-connexion)
- Plusieurs instances serveur derriere un load balancer
- Job d'expiration via un scheduler distribue (ex: BullMQ, ou `pg_cron`)
- Monitoring des metriques de concurrence (temps d'attente sur les row locks, taux de 409 Conflict)

### 9.3 Phase 3 : Haute charge (Mois 12+)

Si la charge depasse les capacites de PostgreSQL pour le row-level locking (improbable pour BienBon, mais en planification) :

- Migration vers une queue de reservation (Option C) pour les paniers "flash" a forte concurrence
- Cache Redis pour le stock en lecture (avec invalidation via les evenements stock_changed)
- Read replicas PostgreSQL pour les requetes de listing

**Critere de declenchement** : Si le p99 de latence sur `POST /reservations` depasse 500ms, investiguer la contention sur les row locks.

---

## 10. Observabilite et metriques

### 10.1 Metriques a collecter

| Metrique | Description | Alerte si |
|----------|-------------|-----------|
| `reservation.conflict.count` | Nombre de 409 Conflict (stock insuffisant au moment du commit) | > 50/min (signe de forte concurrence) |
| `reservation.hold.expired.count` | Reservations expirees apres 5 min sans paiement | > 20% du total (UX ou PSP defaillant) |
| `reservation.latency.p99` | Latence p99 de `POST /reservations` | > 500ms |
| `stock.mismatch.count` | Ecart entre stock calcule et stock en base (reconciliation) | > 0 (bug critique) |
| `sse.connections.active` | Nombre de connexions SSE actives | > 10 000 (dimensionnement infra) |
| `basket.stock_lock.wait_time` | Temps d'attente sur le row-level lock | > 100ms en p95 |

### 10.2 Reconciliation quotidienne

Un job quotidien (3h du matin, heure MUT) verifie la coherence :

```sql
-- Pour chaque panier actif, verifier que :
-- total_quantity - SUM(reservations actives) = stock
SELECT b.id, b.total_quantity, b.stock,
       COALESCE(SUM(r.quantity) FILTER (
           WHERE r.status IN ('confirmed', 'pending_payment')
       ), 0) AS reserved_qty
FROM baskets b
LEFT JOIN reservations r ON r.basket_id = b.id
WHERE b.status IN ('active', 'sold_out', 'pickup_in_progress')
GROUP BY b.id
HAVING b.stock != b.total_quantity - COALESCE(SUM(r.quantity) FILTER (
    WHERE r.status IN ('confirmed', 'pending_payment')
), 0);
```

Si des incoherences sont detectees, une alerte est envoyee a l'equipe technique et le stock est corrige automatiquement (avec log d'audit).

---

## 11. Impact sur l'UX (reference aux specs)

### 11.1 Cote consommateur

| Situation | Comportement | Ref spec |
|-----------|-------------|----------|
| Stock en cours de diminution | Badge "Plus que X !" mis a jour en temps reel via SSE | US-C025 |
| Stock = 0 pendant le browsing | Badge "Epuise" + bouton "Reserver" desactive, en temps reel | US-T012 |
| Stock = 0 au moment du checkout | Message "Desole, ce panier vient d'etre reserve..." + suggestions | US-C025 |
| Quantite demandee > stock restant | "Il ne reste que X panier(s). Souhaitez-vous ajuster ?" | US-C025, US-T012 |
| Echec de paiement | Panier reserve 5 min, retenter avec un autre moyen | US-C036 |
| Expiration du hold (5 min) | Message "Votre reservation a expire. Le panier a ete remis en vente." | US-C036 |
| Annulation reussie | "Reservation annulee. Le panier a ete remis en vente." | US-C027 |
| Annulation par le partenaire | Notification push + email + remboursement automatique | US-P029 |

### 11.2 Cote partenaire

| Situation | Comportement | Ref spec |
|-----------|-------------|----------|
| Nouvelle reservation | Apparait en temps reel dans la liste des reservations | US-P025 |
| Annulation consommateur | Disparait / passe en "Annule" en temps reel, stock re-incremente | US-P025 |
| Modification quantite a la hausse | Champ debloque, mise a jour immediate du stock affiche | US-P015 |
| Annulation du panier entier | Tous les consommateurs rembourses, panier passe en "Annule" | US-P029 |

---

## 12. Risques et mitigations

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|------------|
| Stock negatif (bug) | Tres faible | Critique | CHECK constraint + reconciliation quotidienne + alertes |
| Attaque par reservation/expiration (blocage de stock) | Faible | Moyen | Limite 1 pending par consommateur par panier + rate limiting |
| Latence `pg_notify` sous charge | Faible | Faible | Migration vers Redis Pub/Sub en Phase 2 |
| PSP timeout pendant le hold | Moyen | Moyen | Le hold de 5 min couvre les timeouts PSP ; retry possible |
| Perte de connexion SSE | Moyen | Faible | Reconnexion automatique EventSource + fallback polling |
| Job d'expiration en retard | Faible | Moyen | Le hold est une soft-limit ; un check supplementaire au moment du webhook protege contre les expirations en retard |
| Double traitement par le job d'expiration | Faible | Moyen | `WHERE status = 'pending_payment'` dans l'UPDATE est idempotent ; le SELECT FOR UPDATE serialise l'acces |

---

## 13. Decisions connexes

| ADR | Sujet | Interaction avec ADR-008 |
|-----|-------|--------------------------|
| ADR-005 (a creer) | Strategie de pre-autorisation de paiement | Le hold de 5 min (Decision 2) est directement lie a la strategie de pre-auth. L'ADR-005 definira quel PSP utiliser et le mecanisme exact de pre-auth/capture/annulation. |
| ADR-xxx (a creer) | Architecture temps reel (SSE/events) | L'ADR-008 choisit SSE pour le stock, mais le pattern event-driven est reutilisable pour les notifications, le suivi de retrait, etc. Une ADR dediee pourrait generaliser. |
| ADR-xxx (a creer) | Schema de base de donnees global | Le schema partiel de l'ADR-008 (section 7) devra etre consolide avec le schema complet de l'application. |

---

## 14. Resume des decisions

| # | Decision | Choix | Alternative rejetee principale | Raison |
|---|----------|-------|-------------------------------|--------|
| D1 | Mecanisme de reservation atomique | Decrement conditionnel PostgreSQL (`UPDATE ... WHERE stock >= N`) | Queue de reservation (trop complexe), Optimistic locking (retry storms) | Simplicite maximale, atomicite native, zero retry, performance optimale pour la volumetrie BienBon |
| D2 | Orchestration reservation/paiement | Hold/Claim 5 min (stock decremente d'abord, paiement ensuite) | Stock-first sans hold (incompatible avec mobile wallets et US-C036) | Exige par les specs (5 min de retry), necessaire pour les redirections MCB Juice/Blink/my.t money |
| D3 | Synchronisation temps reel du stock | Server-Sent Events (SSE) avec `pg_notify` | WebSocket (overkill pour du push unidirectionnel), Polling (latence inacceptable) | Reactivity equivalente a WebSocket, simplicite superieure, reconnexion native, compatible HTTP/2 |

---

## 15. Questions resolues par cette ADR

| Question | Reponse |
|----------|---------|
| Faut-il un hold/claim temporaire ou un checkout instantane ? | **Hold temporaire de 5 minutes**, impose par US-C036 et la compatibilite mobile wallets. |
| Quelle duree pour le hold ? | **5 minutes**, conformement a US-C036 ("le panier reste reserve pendant 5 minutes"). |
| Le paiement se fait-il avant ou apres le decrement de stock ? | **Apres**. Le stock est decremente d'abord (pour le reserver), puis le paiement est tente. Si le paiement echoue, le consommateur a 5 min pour retenter. |
| Comment gerer "pre-auth reussie mais stock epuise entre-temps" ? | **Ce scenario ne peut pas se produire** avec notre design. Le stock est decremente AVANT la pre-auth. Si le decrement echoue (stock insuffisant), on ne tente jamais la pre-auth. |
| Faut-il WebSocket ou SSE ? | **SSE**, car le seul besoin est du push serveur-vers-client. Pas de communication bidirectionnelle requise pour le stock. |
| Comment gerer la concurrence entre le job d'expiration et un paiement tardif ? | **SELECT FOR UPDATE** sur la reservation. Le premier qui acquiert le lock (job ou webhook) gagne. Le second s'adapte au nouveau statut. |
