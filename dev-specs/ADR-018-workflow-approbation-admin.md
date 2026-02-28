# ADR-018 : Workflow d'approbation admin -- inscription partenaire, modifications commerce, file d'attente

| Champ         | Valeur                                                                |
|---------------|-----------------------------------------------------------------------|
| **Statut**    | Propose                                                               |
| **Date**      | 2026-02-27                                                            |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                                   |
| **Decideurs** | Equipe technique BienBon                                              |
| **Scope**     | Inscription partenaire, modification fiche commerce, file d'attente admin, documents, resoumission |
| **Prereqs**   | ADR-001 (stack), ADR-002 (architecture), ADR-003 (schema DB), ADR-011 (RBAC), ADR-014 (notifications), ADR-017 (state machines) |
| **Refs**      | US-P001, US-P002, US-P003, US-P007, US-P008, US-P009, US-P010, US-P011, US-A004, US-A005, US-A006, US-A007, US-A008, US-A009, US-A010, US-A011, US-A012 |

---

## 1. Contexte

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. Deux flux metier critiques necessitent une approbation administrative avant d'impacter les donnees publiques :

1. **L'inscription partenaire** (US-P001 a US-P003, US-A004 a US-A006) : un formulaire en 4 etapes (responsable, commerce, photos, CGU) soumis a validation admin. L'admin approuve, rejette avec motif, ou le partenaire corrige et resoumet.

2. **Les modifications de fiche commerce** (US-P007 a US-P010, US-A007, US-A008) : le partenaire modifie des champs (photos, horaires, description, coordonnees...), les anciennes donnees restent live pendant la validation, et l'admin peut approuver ou rejeter champ par champ.

Ces deux flux partagent une logique commune : un acteur soumet des donnees, un admin les revoit, les donnees ne deviennent effectives qu'apres approbation. Mais ils different sur un point fondamental : l'inscription cree une entite nouvelle (partenaire + commerce), tandis que la modification met a jour une entite existante sans interrompre sa visibilite publique.

### 1.1 Decisions prealables qui contraignent cette ADR

- **ADR-003** : La table `partner_mod_requests` est deja esquissee dans le schema (champs `field_changes JSONB`, `status`, `admin_comment`, `reviewed_by`, `reviewed_at`). Cette ADR la formalise completement.
- **ADR-011** : Le RBAC definit `admin` et `super_admin`. Les actions de validation/rejet sont des permissions admin. Le statut `PartnerStatus` inclut `PENDING`, `ACTIVE`, `REJECTED`, `SUSPENDED`, `BANNED`.
- **ADR-017** : La machine a etats du partenaire definit les transitions P1 (`PENDING` -> `ACTIVE`), P2 (`PENDING` -> `REJECTED`). Cette ADR etend la machine pour couvrir la resoumission.
- **ADR-014** : Les notifications partenaire incluent le type "Modification approuvee/rejetee" (Push + In-app). L'inscription validee/rejetee genere des notifications email + push (US-P002, US-P003).

### 1.2 Volumetrie estimee

| Entite | Volume estime (3 ans) | Frequence |
|--------|-----------------------|-----------|
| Inscriptions partenaires | 200-600 | 5-20/mois |
| Modifications commerce | 500-3 000 | 15-80/mois |
| Resoumissions apres rejet | 50-200 | ~30% des rejets |
| File d'attente admin (backlog moyen) | 3-15 dossiers | Traitement sous 24-48h |

Ces volumes sont modestes. La complexite n'est pas dans la scalabilite mais dans la **coherence des etats** et la **qualite de l'UX** (le partenaire ne doit jamais etre bloque sans feedback clair).

---

## 2. Questions a trancher

| #  | Question |
|----|----------|
| Q1 | Modele de donnees pour les modifications commerce : staging/production, versioning, ou JSON diff ? |
| Q2 | Workflow d'approbation : simple, multi-etapes, ou avec assignation ? |
| Q3 | Timeout et auto-approbation : faut-il un mecanisme automatique ? |
| Q4 | Matrice des champs : lesquels necessitent approbation admin vs modification immediate ? |
| Q5 | Verification des documents (BRN, Food Dealer's Licence) : manuelle, automatique, stockage, expiration ? |
| Q6 | Resoumission apres rejet : flux, feedback structure ou libre, historique ? |

---

## 3. Q1 : Modele de donnees pour les modifications commerce

### Besoin

Quand un partenaire modifie sa fiche commerce, les **anciennes donnees restent live** (US-P007). L'admin voit un diff avant/apres (US-A007). L'admin peut accepter ou rejeter **champ par champ** (US-A008). Le partenaire ne peut pas modifier un champ deja en attente (US-P007).

### Option A : Dual-write -- table `stores` (live) + table `store_modification_requests` (staging)

La table `stores` contient les donnees en production. Une table separee `store_modification_requests` stocke les demandes de modification en attente. A l'approbation, les changements approuves sont appliques sur `stores`.

```
stores (live)                        store_modification_requests (staging)
┌─────────────────────┐              ┌──────────────────────────────┐
│ id: uuid            │              │ id: uuid                     │
│ name: "Le Chamarel" │              │ store_id: FK → stores        │
│ description: "..."  │◄── approuve ─│ field_changes: JSONB         │
│ phone: "+230 5789"  │              │   { "description": {         │
│ ...                 │              │       "old": "...",          │
│ updated_at          │              │       "new": "..."           │
└─────────────────────┘              │   }}                         │
                                     │ status: pending/approved/... │
                                     │ submitted_by: FK             │
                                     │ reviewed_by: FK?             │
                                     │ ...                          │
                                     └──────────────────────────────┘
```

**Avantages :**
- **Separation claire** entre donnees live et donnees en attente. Les requetes consommateur ne touchent jamais la table de staging.
- **Pas de risque de corruption** des donnees live : meme un bug dans le workflow d'approbation ne peut pas modifier les donnees en production (elles sont dans une table separee).
- **Approbation partielle naturelle** : le JSONB `field_changes` est un dictionnaire de champs. L'admin peut approuver certaines cles et rejeter d'autres. Les cles approuvees sont appliquees sur `stores`, les rejetees restent dans la request avec un statut par champ.
- **Historique complet** : chaque `store_modification_request` est un enregistrement immutable. L'historique des modifications est une simple requete sur cette table, sans reconstruction depuis des diffs.
- **Conforme a ADR-003** : la table `partner_mod_requests` est deja esquissee dans le schema existant. Cette option l'affine et la renomme en `store_modification_requests` (liee au commerce, pas au partenaire).
- **Simple a requeter** : "Y a-t-il des modifications en attente pour ce commerce ?" = `WHERE store_id = $1 AND status = 'pending'`.
- **Compatible avec l'audit trail** (ADR-003) : l'approbation genere un audit log avec le diff avant/apres en JSONB.

**Inconvenients :**
- **Logique d'application du diff** : il faut un service qui lit le JSONB, mappe chaque cle vers la colonne correspondante de `stores`, et applique la mise a jour. Ce code n'est pas complexe (~50 lignes) mais doit etre rigoureux (validation de types, champs autorises).
- **Coherence du JSONB** : le schema du JSONB `field_changes` doit etre valide en TypeScript (interfaces typees). Si on ajoute un champ a `stores`, il faut mettre a jour la validation du JSONB.
- **Deux sources de verite temporaires** : pendant la periode de validation, la "vraie" description est dans `stores` (live) mais la "future" description est dans `store_modification_requests`. Le dashboard partenaire doit afficher les deux (live + en attente).

### Option B : Versioning -- nouvelle version dans la meme table

Chaque modification cree une nouvelle ligne dans `stores` avec un champ `version` incremente et un champ `is_live` (boolean). L'approbation bascule `is_live` de l'ancienne vers la nouvelle version.

```
stores
┌─────────────────────────────────┐
│ id: uuid                        │
│ store_base_id: uuid (identifie  │
│   le commerce a travers les     │
│   versions)                     │
│ version: int                    │
│ is_live: boolean                │
│ name: "Le Chamarel"             │
│ description: "..."              │
│ ...                             │
│ status: draft/live/archived     │
└─────────────────────────────────┘
```

**Avantages :**
- Chaque version est une snapshot complete du commerce, facile a comparer.
- Pas de logique d'application de diff : l'approbation fait un `UPDATE SET is_live = true`.

**Inconvenients :**
- **Complexite des jointures** : toutes les requetes (paniers, reservations, favoris) doivent filtrer sur `is_live = true`. Un oubli = affichage de donnees non approuvees.
- **Duplication de donnees** : chaque modification (meme d'un seul champ) duplique toute la ligne `stores`.
- **Approbation partielle impossible** : la version est un bloc. L'admin ne peut pas approuver la description et rejeter la photo dans la meme version. Il faudrait creer une troisieme version.
- **Les FK existantes (baskets, reservations) pointent vers `stores.id`** : si l'id change a chaque version, il faut un `store_base_id` stable et toutes les FK doivent pointer dessus. Migration lourde du schema ADR-003.
- **Incompatible avec l'approche d'ADR-003** : le schema existant n'a pas de versioning sur `stores`. L'implementer necessiterait une refonte significative.

### Option C : JSON diff inline -- la request stocke `{ field: { old, new } }`

Identique a l'option A dans son principe (table de requests separee), mais le JSONB est structure en diff explicite :

```json
{
  "description": {
    "old": "Restaurant creole au coeur de Port-Louis",
    "new": "Restaurant creole authentique au coeur de Chamarel. Specialites : curry cerf, rougaille."
  },
  "phone": {
    "old": "+230 5789 0123",
    "new": "+230 5789 9999"
  }
}
```

**Avantages :**
- Le diff est auto-documente : on voit immediatement l'ancien et le nouveau.
- L'UI admin (vue comparative avant/apres, US-A007) se construit directement depuis le JSONB sans requete supplementaire.
- L'old value sert de verification d'integrite : au moment de l'approbation, on verifie que `field_changes.description.old === stores.description`. Si ce n'est pas le cas, les donnees ont ete modifiees entre-temps (par un admin, US-A012) et la request est invalide.

**Inconvenients :**
- La valeur `old` est stockee deux fois (dans `stores` et dans `field_changes.old`). Ce n'est pas une denormalisation grave car les requests sont ephemeres.
- Le stockage des photos dans le JSONB diff est moins naturel (les URLs sont des chaines, mais le diff pour une reordonnance de photos est un tableau).

### Evaluation Q1

| Critere (poids) | A : Dual-write | B : Versioning | C : JSON diff |
|-----------------|:--------------:|:--------------:|:-------------:|
| Compatibilite schema existant (25%) | 5 | 1 | 5 |
| Approbation partielle (20%) | 5 | 1 | 5 |
| Simplicite d'implementation (20%) | 4 | 2 | 4 |
| Integrite des donnees live (15%) | 5 | 3 | 5 |
| UX admin (vue diff) (10%) | 3 | 4 | 5 |
| Historique des modifications (10%) | 5 | 4 | 5 |
| **Score pondere** | **4.55** | **1.95** | **4.75** |

### Decision Q1 : Option C -- JSON diff inline dans une table `store_modification_requests`

**Justification** : L'option C est une variante de l'option A avec un JSONB mieux structure. Le diff `{ old, new }` par champ offre trois avantages decisifs :

1. L'UI admin construit la vue comparative (US-A007) directement depuis le JSONB, sans requete supplementaire sur `stores`.
2. La verification d'integrite (l'old value correspond-elle encore a la donnee live ?) est triviale.
3. L'approbation partielle est native : chaque cle du JSONB est approuvee ou rejetee independamment.

Le versioning (option B) est ecarte car il est incompatible avec le schema ADR-003 et rend l'approbation partielle impossible.

---

## 4. Q2 : Workflow d'approbation -- simple, multi-etapes ou avec assignation ?

### Besoin

Les specs (US-A004 a US-A008) decrivent :
- Une liste de demandes en attente avec tri et filtres (US-A004)
- L'admin approuve ou rejette (US-A005, US-A006, US-A008)
- Pas de mention explicite d'assignation, mais US-A024 (reclamations) mentionne "en cours de traitement" pour signaler aux autres admins qu'un admin s'en occupe

### Option A : Simple -- pending -> approved/rejected

L'admin valide ou rejette directement. Pas d'etat intermediaire.

```
PENDING ──► APPROVED
   │
   └──► REJECTED
```

**Avantages :**
- Minimal, rapide a implementer.
- Suffisant si 1-2 admins au lancement.

**Inconvenients :**
- Risque de double traitement : deux admins ouvrent le meme dossier et prennent des decisions contradictoires.
- Pas de visibilite sur "qui s'en occupe".

### Option B : Multi-etapes avec assignation -- pending -> in_review -> approved/rejected

Un etat `IN_REVIEW` est ajoute. Quand un admin prend un dossier, il passe en revue. Les autres voient qu'il est pris.

```
PENDING ──► IN_REVIEW ──► APPROVED
                │
                └──► REJECTED
```

**Avantages :**
- Evite le double traitement.
- Coherent avec le workflow de reclamation (ADR-017 : `OPEN` -> `IN_REVIEW` -> `RESOLVED`/`REJECTED`).
- Donne de la visibilite a l'equipe admin sur la charge de travail.

**Inconvenients :**
- Un etat de plus a gerer.
- Si l'admin assigne "oublie" le dossier, il reste bloque en `IN_REVIEW`.

### Option C : Multi-etapes avec "demande de correction"

Un etat supplementaire `CHANGES_REQUESTED` permet a l'admin de demander des corrections sans rejeter definitivement.

```
PENDING ──► IN_REVIEW ──► APPROVED
                │
                ├──► REJECTED
                │
                └──► CHANGES_REQUESTED ──► PENDING (resoumission)
```

**Avantages :**
- Modelise exactement le flux decrit dans US-A006 et US-P003 : l'admin rejette avec motif, le partenaire corrige et resoumet.
- La distinction entre `REJECTED` (definitif ou grave) et `CHANGES_REQUESTED` (corrections mineures attendues) est utile pour les stats et le reporting.

**Inconvenients :**
- Plus d'etats = plus de transitions a gerer dans la machine a etats.
- Les specs ne font pas de distinction explicite entre "rejet definitif" et "demande de correction". Le rejet avec motif + possibilite de resoumettre est suffisant pour couvrir les deux cas.

### Evaluation Q2

| Critere (poids) | A : Simple | B : Avec assignation | C : Avec correction |
|-----------------|:----------:|:--------------------:|:-------------------:|
| Prevention du double traitement (25%) | 1 | 5 | 5 |
| Coherence avec ADR-017 reclamations (20%) | 2 | 5 | 5 |
| Simplicite d'implementation (20%) | 5 | 4 | 3 |
| Couverture des specs (20%) | 3 | 4 | 5 |
| Scalabilite de l'equipe admin (15%) | 1 | 4 | 4 |
| **Score pondere** | **2.35** | **4.45** | **4.45** |

### Decision Q2 : Option B+ -- Multi-etapes avec assignation, sans etat `CHANGES_REQUESTED` explicite

**Justification** : Les options B et C sont a egalite. Le departage se fait par le principe de parcimonie : dans les specs, le rejet (US-A006) inclut deja un motif detaille et la possibilite de resoumettre. Ajouter un etat `CHANGES_REQUESTED` distinct de `REJECTED` creerait une ambiguite ("est-ce un rejet ou une demande de correction ?") sans benefice UX clair.

Le flux retenu est :

```
PENDING ──► IN_REVIEW ──► APPROVED
                │
                └──► REJECTED ──► (resoumission → nouveau PENDING)
```

La resoumission apres rejet est modelisee comme une **nouvelle request** liee a l'ancienne (voir Q6), pas comme une transition d'etat sur la meme request. Cela garde l'historique propre : chaque request est un snapshot immutable d'une soumission.

L'etat `IN_REVIEW` sert de verrou optimiste : quand un admin prend un dossier, la request passe de `PENDING` a `IN_REVIEW` avec l'`admin_id`. Si un autre admin tente de prendre le meme dossier, il voit qu'il est deja en revue. L'admin peut relacher le dossier (retour a `PENDING`) s'il change d'avis.

---

## 5. Q3 : Timeout et auto-approbation

### Besoin

Les specs ne mentionnent pas d'auto-approbation. Mais un risque UX reel existe : si un partenaire soumet une modification et que l'admin ne la traite pas pendant des jours, le partenaire est bloque (il ne peut pas modifier le meme champ a nouveau, US-P007).

### Option A : Pas de timeout -- relance par notification uniquement

Un job BullMQ envoie une notification admin si un dossier est en attente depuis plus de 24h (rappel), puis toutes les 24h ensuite. Aucune action automatique sur les donnees.

**Avantages :**
- Aucun risque d'appliquer des donnees non verifiees.
- Simple a implementer (un job de notification, deja couvert par ADR-014).
- Conforme aux specs (qui ne mentionnent pas d'auto-approbation).

**Inconvenients :**
- Si l'admin est absent, les dossiers s'accumulent et les partenaires sont frustres.

### Option B : Auto-approbation apres 72h pour les modifications (pas pour les inscriptions)

Un job BullMQ auto-approuve les modifications de fiche commerce si aucune action admin n'a eu lieu dans les 72h. Les inscriptions (qui creent un nouveau partenaire) ne sont **jamais** auto-approuvees.

**Avantages :**
- Debloque le partenaire automatiquement.
- Les modifications sont generalement mineures (horaires, description) et le risque d'abus est faible.

**Inconvenients :**
- **Risque de contenu inapproprie** : un partenaire pourrait changer sa description pour inclure du contenu problematique, et l'auto-approbation le publierait.
- **Incoherent avec la philosophie des specs** : les specs exigent une approbation admin pour garantir "la qualite et la veracite des informations publiees" (US-A008).
- **Fausse securite** : si les admins savent que les dossiers s'auto-approuvent, ils pourraient devenir moins diligents.

### Option C : Escalation progressive avec SLA

24h : notification rappel a l'admin.
48h : notification a tous les admins + badge "urgent" dans la file d'attente.
72h : notification au super_admin avec rapport des dossiers non traites.
Pas d'auto-approbation.

**Avantages :**
- Pression croissante sans risque sur les donnees.
- Le super_admin a une visibilite sur les SLA non respectes.
- Compatible avec la croissance de l'equipe (plus d'admins = moins de risque de delai).

**Inconvenients :**
- Plus de jobs BullMQ a configurer.
- Le partenaire reste bloque meme apres 72h si personne n'agit (cas extreme).

### Decision Q3 : Option C -- Escalation progressive sans auto-approbation

**Justification** : L'auto-approbation est trop risquee pour une marketplace ou la confiance est le coeur du business. Un partenaire qui modifie son adresse pour pointer vers un local ferme, ou qui change ses photos pour des images generiques, doit etre controle.

L'escalation progressive est le meilleur compromis : elle cree de l'urgence sans compromettre la qualite. Au lancement (2-5 admins), le backlog moyen sera de 3-15 dossiers -- largement gerable en < 24h.

**Configuration via `app_settings` (ADR-003)** :

| Cle | Type | Valeur par defaut | Description |
|-----|------|-------------------|-------------|
| `approval_reminder_hours` | number | `24` | Delai avant premier rappel admin |
| `approval_urgent_hours` | number | `48` | Delai avant escalation a tous les admins |
| `approval_escalation_hours` | number | `72` | Delai avant escalation au super_admin |

---

## 6. Q4 : Matrice des champs -- avec ou sans approbation admin

### Besoin

Les specs distinguent clairement :
- **Infos responsable** (US-P011) : modification immediate, pas d'approbation.
- **Reste de la fiche commerce** (US-P007) : approbation requise.

Mais il faut trancher pour chaque champ specifique : est-ce que les horaires, les coordonnees GPS, le nom du commerce necessitent le meme niveau de controle ?

### Decision Q4 : Matrice definitive

La logique de classification est la suivante :
- **Approbation requise** : tout champ qui impacte la **visibilite publique** du commerce pour les consommateurs ou qui a une **valeur legale/reglementaire**.
- **Modification immediate** : tout champ qui est **interne** (coordonnees du responsable) ou qui n'a **aucun impact public visible**.

#### Champs du commerce (table `stores`)

| Champ | Approbation ? | Justification |
|-------|:---:|---------------|
| `name` (nom du commerce) | Oui | Visible publiquement. Un changement de nom pourrait creer de la confusion pour les consommateurs. |
| `description` | Oui | Contenu textuel public. Risque de contenu inapproprie. |
| `type` (type de commerce) | Oui | Impacte le filtrage consommateur et l'obligation de Food Dealer's Licence. |
| `address`, `city`, `postal_code` | Oui | Visible publiquement. Le consommateur se deplace physiquement a cette adresse. Une erreur = panier non retire. |
| `latitude`, `longitude` | Oui | Impacte la recherche geographique et la carte. Lie a l'adresse. |
| `phone` (telephone du commerce) | Oui | Visible publiquement sur la fiche. |
| `brn` (Business Registration Number) | Non modifiable | Le BRN est un identifiant legal unique. Il est fixe a l'inscription et ne peut pas etre modifie par le partenaire. Seul un admin peut le corriger (US-A012). |
| `food_licence` | Oui | Document reglementaire. Le changement peut indiquer un renouvellement ou un probleme. |
| Photos (`commerce_photos`) | Oui | Visible publiquement. Risque de photos inappropriees ou trompeuses. |
| Horaires (`commerce_hours`) | Oui | Visible publiquement. Les consommateurs planifient leur retrait en fonction de ces horaires. |

#### Champs du responsable (table `users` / `partner_profiles`)

| Champ | Approbation ? | Justification |
|-------|:---:|---------------|
| `first_name` | Non | Information interne, non affichee publiquement. |
| `last_name` | Non | Information interne, non affichee publiquement. |
| `email` | Non (revalidation par code) | La modification d'email passe par un flux de revalidation (US-P011), pas par le workflow d'approbation admin. |
| `phone` (telephone du responsable) | Non | Information interne. |
| Mot de passe | Non (flux dedie) | Le changement de mot de passe est un flux d'authentification standard (US-P011), pas un workflow d'approbation. |

#### Configuration technique

La matrice est implementee comme une constante TypeScript, pas en base de donnees (les regles metier sont stables et ne changent pas sans deploiement) :

```typescript
// modules/stores/store-approval.config.ts

export const FIELDS_REQUIRING_APPROVAL: ReadonlySet<string> = new Set([
  'name',
  'description',
  'type',
  'address',
  'city',
  'postal_code',
  'latitude',
  'longitude',
  'phone',
  'food_licence',
  // Les photos et horaires sont dans des tables separees
  // mais passent par le meme workflow d'approbation
]);

export const IMMUTABLE_FIELDS: ReadonlySet<string> = new Set([
  'brn',          // Seul un admin peut le modifier (US-A012)
  'id',
  'partner_id',
  'created_at',
]);

// Les champs absents des deux sets sont modifiables sans approbation
// (ex: champs internes, preferences, metadata)
```

---

## 7. Q5 : Verification des documents (BRN, Food Dealer's Licence)

### Besoin

L'inscription partenaire exige un BRN (obligatoire) et une Food Dealer's Licence (obligatoire pour les commerces alimentaires, US-P001). L'admin verifie ces documents lors de la validation (US-A005).

### 7.1 Verification : manuelle vs automatique

**Decision : Verification manuelle par l'admin.**

A l'ile Maurice, il n'existe pas d'API publique de verification en ligne du BRN aupres du Corporate and Business Registration Department (CBRD) ni du Food Dealer's Licence aupres du Ministry of Health. La verification automatique n'est pas possible au lancement.

**Processus de verification manuelle :**

1. L'admin consulte la fiche d'inscription (US-A005).
2. Il verifie visuellement le BRN : format valide (regex en frontend + backend), coherence avec le nom du commerce.
3. Pour la Food Dealer's Licence : l'admin verifie que le document uploade est lisible, non expire, et correspond au commerce declare.
4. Des motifs de rejet predefinis sont disponibles pour accelerer le traitement (US-A006) : "BRN invalide", "Food Dealer's Licence manquante", "Document illisible", etc.

**Evolution future** : si une API gouvernementale devient disponible, un service de verification automatique peut etre ajoute sans modifier le workflow (la verification automatique remplacerait le check visuel de l'admin, mais l'approbation resterait manuelle).

### 7.2 Stockage des documents

**Decision : Supabase Storage avec acces restreint.**

```
supabase-storage/
  partner-documents/
    {partner_id}/
      brn/
        {timestamp}-{filename}.pdf
      food-licence/
        {timestamp}-{filename}.pdf
      photos/
        {uuid}.webp
```

**Regles d'acces :**
- Les documents BRN et Food Dealer's Licence sont **prives** : accessibles uniquement par le partenaire proprietaire et les admins.
- Les photos du commerce sont **publiques** apres approbation (visibles par les consommateurs).
- Les photos en attente d'approbation sont **privees** (accessibles uniquement par le partenaire et les admins).

**Implementation Supabase Storage :**

```sql
-- Policy : le partenaire peut lire ses propres documents
CREATE POLICY "partner_read_own_docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'partner-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy : l'admin peut lire tous les documents
CREATE POLICY "admin_read_all_docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'partner-documents'
    AND (auth.jwt() -> 'app_metadata' -> 'roles')::jsonb ? 'admin'
  );

-- Policy : le partenaire peut uploader dans son dossier
CREATE POLICY "partner_upload_own_docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'partner-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### 7.3 Expiration des documents

**Decision : pas de gestion d'expiration au lancement. Notification de renouvellement en V2.**

La Food Dealer's Licence a une validite limitee (generalement 1 an a l'ile Maurice). Mais les specs ne mentionnent pas la gestion d'expiration. La complexite (stocker la date d'expiration, job de rappel, workflow de renouvellement) n'est pas justifiee au lancement.

**Plan pour la V2 :**
- Ajouter un champ `food_licence_expires_at` sur `stores`.
- Job BullMQ mensuel qui notifie les partenaires dont la licence expire dans les 30 jours.
- L'admin peut marquer un commerce comme "licence expiree" et forcer une ressoumission.

---

## 8. Q6 : Resoumission apres rejet

### Besoin

Apres un rejet d'inscription (US-P003) ou de modification (US-P008), le partenaire peut corriger et resoumettre. Les specs disent :
- Le formulaire est pre-rempli avec les informations precedentes (US-P003).
- Le feedback admin est un motif obligatoire (texte libre, min 10 caracteres) avec des motifs predefinis en selection rapide (US-A006).
- L'historique des soumissions est conserve pour l'admin (US-P003, US-A011).

### Decision Q6 : Nouvelle request liee a l'ancienne

La resoumission cree une **nouvelle** `store_modification_request` (ou `partner_registration_request`) avec un champ `previous_request_id` qui pointe vers la request rejetee. Cela donne :

```
request #1 (REJECTED)
  └── request #2 (PENDING) ← resoumission
        └── request #3 (APPROVED) ← seconde resoumission si #2 est aussi rejetee
```

**Avantages :**
- Chaque request est un snapshot immutable. L'admin voit tout l'historique en suivant la chaine `previous_request_id`.
- Le statut de chaque request est clair et final (pas de mutation d'une request rejetee en pending).
- Le feedback admin de chaque rejet est preservee pour toujours, attachee a la request rejetee.
- Compatible avec la machine a etats ADR-017 : la request suit son propre cycle de vie.

**Feedback admin :**

Le feedback est **semi-structure** : motifs predefinis (enum) + texte libre obligatoire. Cela donne le meilleur des deux mondes : les motifs predefinis permettent des filtres et stats, le texte libre donne le contexte necessaire au partenaire.

```typescript
// Motifs predefinis pour le rejet d'inscription
export enum RegistrationRejectionReason {
  INVALID_BRN = 'invalid_brn',
  INVALID_FOOD_LICENCE = 'invalid_food_licence',
  INSUFFICIENT_PHOTOS = 'insufficient_photos',
  INCOMPLETE_ADDRESS = 'incomplete_address',
  INELIGIBLE_BUSINESS_TYPE = 'ineligible_business_type',
  DUPLICATE_REGISTRATION = 'duplicate_registration',
  ILLEGIBLE_DOCUMENT = 'illegible_document',
  OTHER = 'other',
}

// Motifs predefinis pour le rejet de modification
export enum ModificationRejectionReason {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  MISLEADING_INFORMATION = 'misleading_information',
  LOW_QUALITY_PHOTOS = 'low_quality_photos',
  INCOMPLETE_INFORMATION = 'incomplete_information',
  INCOHERENT_CHANGE = 'incoherent_change',
  OTHER = 'other',
}
```

---

## 9. Modele de donnees complet

### 9.1 Table `store_modification_requests`

Cette table remplace la table `partner_mod_requests` esquissee dans ADR-003. Le renommage reflecte le fait que les modifications portent sur le **commerce** (`store`), pas sur le partenaire.

```prisma
model StoreModificationRequest {
  id                String                  @id @default(uuid())
  storeId           String                  @map("store_id")
  submittedBy       String                  @map("submitted_by") // user_id du partenaire
  requestType       ModificationRequestType @map("request_type")

  // Diff des modifications : { "field": { "old": value, "new": value } }
  fieldChanges      Json                    @map("field_changes")

  // Statut du workflow
  status            ApprovalStatus          @default(PENDING)

  // Assignation admin
  reviewedBy        String?                 @map("reviewed_by") // admin user_id
  assignedAt        DateTime?               @map("assigned_at") // quand l'admin a pris le dossier

  // Decision
  decision          Json?                   // { "field": "approved"|"rejected", ... }
  rejectionReasons  String[]                @map("rejection_reasons") // enum slugs
  adminComment      String?                 @map("admin_comment") // texte libre
  internalNote      String?                 @map("internal_note") // note interne non visible par le partenaire
  resolvedAt        DateTime?               @map("resolved_at")

  // Chaine de resoumission
  previousRequestId String?                 @map("previous_request_id")

  // Timestamps
  createdAt         DateTime                @default(now()) @map("created_at")
  updatedAt         DateTime                @updatedAt @map("updated_at")

  // Relations
  store             Store                   @relation(fields: [storeId], references: [id])
  reviewer          User?                   @relation("ModRequestReviewer", fields: [reviewedBy], references: [id])
  submitter         User                    @relation("ModRequestSubmitter", fields: [submittedBy], references: [id])
  previousRequest   StoreModificationRequest? @relation("RequestChain", fields: [previousRequestId], references: [id])
  followUpRequests  StoreModificationRequest[] @relation("RequestChain")

  @@index([storeId, status])
  @@index([status, createdAt])
  @@index([reviewedBy])
  @@index([previousRequestId])
  @@map("store_modification_requests")
}

enum ModificationRequestType {
  REGISTRATION        // inscription initiale (toute la fiche)
  FIELD_MODIFICATION  // modification de champs existants
  PHOTO_MODIFICATION  // ajout/suppression/reordonnance de photos
  HOURS_MODIFICATION  // modification des horaires
}

enum ApprovalStatus {
  PENDING     // soumis, en attente de traitement
  IN_REVIEW   // un admin a pris le dossier
  APPROVED    // approuve (tous les champs ou une partie)
  REJECTED    // rejete avec motif
  CANCELLED   // annule par le partenaire avant traitement
  SUPERSEDED  // remplace par une nouvelle request (resoumission)
}
```

### 9.2 Table `partner_registration_requests`

L'inscription partenaire est un flux distinct des modifications. Elle contient la **totalite** des donnees soumises (pas un diff), car il n'y a pas de donnee live a comparer.

```prisma
model PartnerRegistrationRequest {
  id                String                  @id @default(uuid())
  userId            String                  @map("user_id") // le user cree dans auth.users a l'inscription

  // Donnees soumises (snapshot complete)
  businessData      Json                    @map("business_data")
  // Structure du JSONB :
  // {
  //   "store_name": "Le Chamarel",
  //   "store_type": "RESTAURANT",
  //   "description": "...",
  //   "address": "...",
  //   "city": "...",
  //   "postal_code": "...",
  //   "latitude": -20.1609,
  //   "longitude": 57.5012,
  //   "store_phone": "+230 5789 0123",
  //   "brn": "C07012345",
  //   "food_licence": "FDL-2026-12345",  // null si non alimentaire
  //   "photo_urls": ["https://..."],
  //   "cgu_accepted_at": "2026-02-27T10:30:00Z",
  //   "cgu_version": "1.0",
  //   "commercial_terms_accepted_at": "2026-02-27T10:30:00Z",
  //   "commercial_terms_version": "1.0",
  //   "privacy_accepted_at": "2026-02-27T10:30:00Z",
  //   "privacy_version": "1.0"
  // }

  // Document uploads (references Supabase Storage)
  documentUrls      Json                    @map("document_urls")
  // {
  //   "brn_document": "partner-documents/{id}/brn/...",
  //   "food_licence_document": "partner-documents/{id}/food-licence/...",
  //   "photos": ["partner-documents/{id}/photos/..."]
  // }

  // Canal d'inscription
  registrationChannel RegistrationChannel   @map("registration_channel")

  // Workflow
  status            ApprovalStatus          @default(PENDING)
  reviewedBy        String?                 @map("reviewed_by")
  assignedAt        DateTime?               @map("assigned_at")
  rejectionReasons  String[]                @map("rejection_reasons")
  adminComment      String?                 @map("admin_comment")
  internalNote      String?                 @map("internal_note")
  resolvedAt        DateTime?               @map("resolved_at")

  // Chaine de resoumission
  previousRequestId String?                 @map("previous_request_id")

  // Timestamps
  createdAt         DateTime                @default(now()) @map("created_at")
  updatedAt         DateTime                @updatedAt @map("updated_at")

  // Relations
  user              User                    @relation(fields: [userId], references: [id])
  reviewer          User?                   @relation("RegRequestReviewer", fields: [reviewedBy], references: [id])
  previousRequest   PartnerRegistrationRequest? @relation("RegRequestChain", fields: [previousRequestId], references: [id])
  followUpRequests  PartnerRegistrationRequest[] @relation("RegRequestChain")

  @@index([userId])
  @@index([status, createdAt])
  @@index([reviewedBy])
  @@map("partner_registration_requests")
}
```

### 9.3 Schema JSONB `field_changes` -- specification complete

Le JSONB `field_changes` de `StoreModificationRequest` a un schema strict valide par Zod en TypeScript :

```typescript
// modules/stores/store-modification.schema.ts

import { z } from 'zod';

/**
 * Un diff de champ : { old: T, new: T }
 * Le type T varie selon le champ (string, number, array, object).
 */
const fieldDiff = <T extends z.ZodType>(schema: T) =>
  z.object({
    old: schema,
    new: schema,
  });

/**
 * Schema complet du JSONB field_changes.
 * Chaque cle est optionnelle (seuls les champs modifies sont presents).
 */
export const fieldChangesSchema = z.object({
  name: fieldDiff(z.string()).optional(),
  description: fieldDiff(z.string()).optional(),
  type: fieldDiff(z.nativeEnum(StoreType)).optional(),
  address: fieldDiff(z.string()).optional(),
  city: fieldDiff(z.string()).optional(),
  postal_code: fieldDiff(z.string().nullable()).optional(),
  latitude: fieldDiff(z.number()).optional(),
  longitude: fieldDiff(z.number()).optional(),
  phone: fieldDiff(z.string()).optional(),
  food_licence: fieldDiff(z.string().nullable()).optional(),
}).strict(); // pas de cles non declarees

/**
 * Schema pour les modifications de photos.
 * Les photos sont gerees separement car elles ont
 * une structure plus complexe (tableau ordonne avec URLs).
 */
export const photoChangesSchema = z.object({
  photos: z.object({
    old: z.array(z.object({ url: z.string(), position: z.number() })),
    new: z.array(z.object({ url: z.string(), position: z.number() })),
  }),
  primary_photo_index: fieldDiff(z.number()).optional(),
}).strict();

/**
 * Schema pour les modifications d'horaires.
 */
export const hoursChangesSchema = z.object({
  hours: z.object({
    old: z.array(z.object({
      day_of_week: z.number().min(0).max(6),
      open_time: z.string(), // HH:MM
      close_time: z.string(),
      is_closed: z.boolean(),
    })),
    new: z.array(z.object({
      day_of_week: z.number().min(0).max(6),
      open_time: z.string(),
      close_time: z.string(),
      is_closed: z.boolean(),
    })),
  }),
}).strict();

export type FieldChanges = z.infer<typeof fieldChangesSchema>;
export type PhotoChanges = z.infer<typeof photoChangesSchema>;
export type HoursChanges = z.infer<typeof hoursChangesSchema>;
```

### 9.4 Schema JSONB `decision` -- approbation partielle

Quand l'admin traite une `StoreModificationRequest`, il prend une decision par champ :

```typescript
// Exemple de decision JSONB pour une modification de 3 champs
{
  "description": "approved",   // la nouvelle description est publiee
  "phone": "approved",         // le nouveau telephone est publie
  "latitude": "rejected"       // les nouvelles coordonnees sont rejetees
}
```

Si **tous** les champs sont approuves, le statut global de la request est `APPROVED`.
Si **tous** les champs sont rejetes, le statut global est `REJECTED`.
Si c'est **mixte** (certains approuves, certains rejetes), le statut global est `APPROVED` et les champs rejetes sont signales au partenaire. Le partenaire peut resoumettre une nouvelle request pour les champs rejetes.

### 9.5 Diagramme ER des nouvelles tables

```
                     ┌────────────────────────────────────┐
                     │        users                       │
                     │  (ADR-011)                         │
                     └──────┬──────────────┬──────────────┘
                            │              │
                   submitter│              │ reviewer
                            │              │
         ┌──────────────────▼──┐     ┌─────▼──────────────────────┐
         │ partner_registration│     │ store_modification_requests │
         │ _requests           │     │                             │
         │─────────────────────│     │─────────────────────────────│
         │ id UUID PK          │     │ id UUID PK                  │
         │ user_id FK          │     │ store_id FK ────────────┐   │
         │ business_data JSONB │     │ submitted_by FK         │   │
         │ document_urls JSONB │     │ request_type ENUM       │   │
         │ reg_channel ENUM    │     │ field_changes JSONB     │   │
         │ status ENUM         │     │ status ENUM             │   │
         │ reviewed_by FK      │     │ reviewed_by FK          │   │
         │ assigned_at TSTZ    │     │ assigned_at TSTZ        │   │
         │ rejection_reasons[] │     │ decision JSONB          │   │
         │ admin_comment TEXT  │     │ rejection_reasons[]     │   │
         │ internal_note TEXT  │     │ admin_comment TEXT      │   │
         │ resolved_at TSTZ   │     │ internal_note TEXT      │   │
         │ previous_request_id│     │ resolved_at TSTZ        │   │
         │ created_at TSTZ    │     │ previous_request_id     │   │
         │ updated_at TSTZ    │     │ created_at TSTZ         │   │
         └───────┬────────────┘     │ updated_at TSTZ         │   │
                 │                  └──────────────────────┬───┘   │
                 │ self-ref                  self-ref │            │
                 │ (resoumission)       (resoumission)│            │
                 └─► previous_request   previous_request ◄─┘      │
                                                                   │
                                                              ┌────▼──────────┐
                                                              │    stores     │
                                                              │  (ADR-011)    │
                                                              └───────────────┘
```

---

## 10. Machines a etats

### 10.1 Machine a etats des requests d'approbation (inscription + modification)

Les deux types de requests partagent la meme machine a etats :

```
                    soumission
                    partenaire
                        │
                        ▼
                 ┌──────────────┐
                 │              │
                 │   PENDING    │◄─────────────────────────────┐
                 │              │   annulation                  │
                 └──┬───────┬──┘   partenaire                  │
                    │       │      (avant IN_REVIEW)            │
       admin prend  │       │                                   │
       le dossier   │       └──► ┌──────────────┐              │
                    │            │              │              │
                    ▼            │  CANCELLED   │              │
             ┌──────────────┐   │              │              │
             │              │   └──────────────┘              │
             │  IN_REVIEW   │                                  │
             │              │                                  │
             └──┬───────┬───┘                                  │
                │       │                                      │
    approuve    │       │  rejete avec motif                   │
    (total ou   │       │                                      │
     partiel)   │       │                                      │
                ▼       ▼                                      │
        ┌───────────┐  ┌───────────┐                           │
        │           │  │           │                           │
        │ APPROVED  │  │ REJECTED  │── resoumission ──────────┘
        │           │  │           │   (nouvelle request
        └───────────┘  └───────────┘    avec previous_request_id)
```

**Etat supplementaire :** `SUPERSEDED` -- quand une nouvelle request est soumise pour le meme store et les memes champs, la request precedente en `PENDING` passe automatiquement a `SUPERSEDED`. Cela ne devrait pas arriver en fonctionnement normal (US-P007 interdit la modification d'un champ deja en attente), mais c'est un garde-fou technique.

**Note :** L'admin peut "relacher" un dossier en `IN_REVIEW` (retour a `PENDING`). C'est une transition explicite, pas un timeout.

### 10.2 Table de transitions

```typescript
// modules/approval/approval.states.ts

export enum ApprovalStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  SUPERSEDED = 'superseded',
}

export enum ApprovalEvent {
  ADMIN_ASSIGN = 'admin_assign',       // admin prend le dossier
  ADMIN_RELEASE = 'admin_release',     // admin relache le dossier
  ADMIN_APPROVE = 'admin_approve',     // approbation (totale ou partielle)
  ADMIN_REJECT = 'admin_reject',       // rejet avec motif
  PARTNER_CANCEL = 'partner_cancel',   // partenaire annule sa demande
  SYSTEM_SUPERSEDE = 'system_supersede', // remplace par une nouvelle request
}
```

```typescript
// modules/approval/approval.transitions.ts

import { TransitionTable } from '../../shared/state-machine/state-machine.types';
import { ApprovalStatus as S, ApprovalEvent as E } from './approval.states';

export const approvalTransitions: TransitionTable<S, E, ApprovalRequest> = {
  [S.PENDING]: {
    [E.ADMIN_ASSIGN]: {
      target: S.IN_REVIEW,
      guards: [guards.isAdminRole, guards.requestNotAlreadyAssigned],
      effects: [effects.assignAdmin, effects.auditLog],
      description: 'Un admin prend le dossier en charge',
    },
    [E.PARTNER_CANCEL]: {
      target: S.CANCELLED,
      guards: [guards.isRequestOwner],
      effects: [effects.auditLog],
      description: 'Le partenaire annule sa demande avant traitement',
    },
    [E.SYSTEM_SUPERSEDE]: {
      target: S.SUPERSEDED,
      guards: [],
      effects: [effects.auditLog],
      description: 'Remplacee par une resoumission',
    },
  },

  [S.IN_REVIEW]: {
    [E.ADMIN_APPROVE]: {
      target: S.APPROVED,
      guards: [guards.isAssignedAdmin],
      effects: [
        effects.applyChangesToStore,   // applique le diff sur la table stores
        effects.notifyPartnerApproved, // notification push + email (ADR-014)
        effects.auditLog,              // audit trail (ADR-003)
      ],
      description: 'Admin approuve les modifications (totalement ou partiellement)',
    },
    [E.ADMIN_REJECT]: {
      target: S.REJECTED,
      guards: [guards.isAssignedAdmin, guards.hasRejectionReason],
      effects: [
        effects.notifyPartnerRejected, // notification push + email avec motif
        effects.auditLog,
      ],
      description: 'Admin rejette les modifications avec motif obligatoire',
    },
    [E.ADMIN_RELEASE]: {
      target: S.PENDING,
      guards: [guards.isAssignedAdmin],
      effects: [effects.unassignAdmin, effects.auditLog],
      description: 'Admin relache le dossier (retour en file d attente)',
    },
  },

  // Etats terminaux : pas de transitions sortantes
  // APPROVED, REJECTED, CANCELLED, SUPERSEDED
};
```

### 10.3 Extension de la machine a etats partenaire (ADR-017)

La machine a etats du partenaire definie dans ADR-017 (section 3.4, transitions P1-P6) est etendue pour couvrir la **resoumission apres rejet** :

```
  ┌──────────┐    validation admin    ┌──────────┐
  │          ├───────────────────────►│          │
  │ PENDING  │       US-A005          │  ACTIVE  │◄─────────────────────┐
  │          │                        │          │  reactivation admin  │
  └──┬───┬───┘                        └──┬────┬──┘  US-A014             │
     │   │                               │    │                        │
     │   │ rejet admin                   │    │                        │
     │   │ US-A006                       │    │                        │
     │   │                               │    │                        │
     │   ▼                               │    │                ┌───────┴───┐
     │ ┌──────────┐                      │    │                │           │
     │ │          │                      │    │                │ SUSPENDED │
     │ │ REJECTED │                      │    └───────────────►│           │
     │ │          │                      │       US-A013       └─────┬─────┘
     │ └──────────┘                      │                          │
     │                                   │                          │
     │ annulation                        │ bannissement             │ bannissement
     │ partenaire                        │ US-A015                  │ US-A015
     │ (avant traitement)                │                          │
     ▼                                   ▼                          │
  ┌──────────┐                      ┌──────────┐                    │
  │          │                      │          │◄───────────────────┘
  │CANCELLED │                      │  BANNED  │
  │          │                      │          │
  └──────────┘                      └──────────┘
```

**Precision importante :** La resoumission apres rejet ne change pas le statut du `PartnerProfile`. Le statut `REJECTED` reste sur le `PartnerProfile` tant que la nouvelle `PartnerRegistrationRequest` n'est pas approuvee. C'est la request qui a son propre cycle de vie. Quand la nouvelle request est approuvee, le `PartnerProfile` passe de `REJECTED` a `ACTIVE` (transition identique a P1).

Transition supplementaire a ajouter a ADR-017 :

| # | Etat source | Evenement | Garde | Etat cible | Effets de bord |
|---|-------------|-----------|-------|------------|----------------|
| P7 | `REJECTED` | `ADMIN_VALIDATE` | Nouvelle registration request approuvee | `ACTIVE` | Memes effets que P1 (acces dashboard, notifications, audit) |
| P8 | `PENDING` | `PARTNER_CANCEL` | Partenaire annule avant traitement | `CANCELLED` | 1. Registration request passe a CANCELLED 2. Audit log 3. Le user reste dans auth.users mais sans role partner actif |

---

## 11. Diagrammes de workflow complets

### 11.1 Workflow d'inscription partenaire

```
PARTENAIRE                          SYSTEME                           ADMIN
    │                                  │                                │
    │  1. Remplit formulaire 4 etapes  │                                │
    │  (responsable, commerce,         │                                │
    │   photos, CGU)                   │                                │
    │─────────────────────────────────►│                                │
    │                                  │                                │
    │                                  │  2. Cree auth.user             │
    │                                  │  3. Cree PartnerProfile        │
    │                                  │     (status = PENDING)         │
    │                                  │  4. Cree PartnerRegistration   │
    │                                  │     Request (status = PENDING) │
    │                                  │  5. Upload docs → Storage      │
    │                                  │  6. Audit log                  │
    │                                  │                                │
    │  7. Email confirmation           │  8. Notification admin         │
    │     (numero de reference)        │     "Nouvelle inscription"     │
    │◄─────────────────────────────────│───────────────────────────────►│
    │                                  │                                │
    │                                  │  9. Badge compteur +1 dans     │
    │                                  │     la file d'attente          │
    │                                  │                                │
    │                                  │                                │  10. Admin consulte
    │                                  │                                │      la fiche (US-A004)
    │                                  │                                │
    │                                  │                                │  11. Admin prend le
    │                                  │                                │      dossier (IN_REVIEW)
    │                                  │                                │
    │                                  │                                │  12a. VALIDE (US-A005)
    │                                  │◄──────────────────────────────│
    │                                  │                                │
    │                                  │  13a. PartnerProfile →ACTIVE   │
    │                                  │  14a. Cree Store + photos +    │
    │                                  │       horaires depuis JSONB    │
    │                                  │  15a. Cree PartnerStore (OWNER)│
    │                                  │  16a. Sync app_metadata.roles  │
    │                                  │  17a. Audit log                │
    │                                  │                                │
    │  18a. Email bienvenue (US-P002)  │                                │
    │  19a. Push "Felicitations !"     │                                │
    │◄─────────────────────────────────│                                │
    │                                  │                                │
    │  20a. Premiere connexion →       │                                │
    │       Onboarding (US-P004)       │                                │
    │                                  │                                │
    ──── OU ────────────────────────────────────────────────────────────
    │                                  │                                │
    │                                  │                                │  12b. REJETE (US-A006)
    │                                  │                                │      motif + feedback
    │                                  │◄──────────────────────────────│
    │                                  │                                │
    │                                  │  13b. RegistrationRequest      │
    │                                  │       → REJECTED               │
    │                                  │  14b. Audit log                │
    │                                  │                                │
    │  15b. Email avec motif +         │                                │
    │       lien resoumission (US-P003)│                                │
    │  16b. Push "Corrections          │                                │
    │       necessaires"               │                                │
    │◄─────────────────────────────────│                                │
    │                                  │                                │
    │  17b. Partenaire corrige et      │                                │
    │       resoumet                   │                                │
    │─────────────────────────────────►│                                │
    │                                  │                                │
    │                                  │  18b. Nouvelle request PENDING │
    │                                  │       (previous_request_id     │
    │                                  │        pointe vers #1)         │
    │                                  │  19b. Ancienne request →       │
    │                                  │       SUPERSEDED               │
    │                                  │                                │
    │                                  │       → Retour a l'etape 8     │
```

### 11.2 Workflow de modification commerce

```
PARTENAIRE                          SYSTEME                           ADMIN
    │                                  │                                │
    │  1. Modifie un champ             │                                │
    │     (ex: description)            │                                │
    │─────────────────────────────────►│                                │
    │                                  │                                │
    │                                  │  2. Verifie : champ en         │
    │                                  │     FIELDS_REQUIRING_APPROVAL? │
    │                                  │                                │
    │                                  │  3. Verifie : pas de request   │
    │                                  │     PENDING pour ce champ      │
    │                                  │     (US-P007)                  │
    │                                  │                                │
    │                                  │  4. Cree StoreModification     │
    │                                  │     Request :                  │
    │                                  │     field_changes: {           │
    │                                  │       "description": {         │
    │                                  │         "old": "...",          │
    │                                  │         "new": "..."           │
    │                                  │       }                        │
    │                                  │     }                          │
    │                                  │  5. Audit log                  │
    │                                  │                                │
    │  6. Badge "Modification en       │  7. Notification admin         │
    │     attente" sur le dashboard    │     (badge compteur +1)        │
    │◄─────────────────────────────────│───────────────────────────────►│
    │                                  │                                │
    │  NOTE: les donnees LIVE restent  │                                │
    │  inchangees sur la fiche         │                                │
    │  publique (US-P007)              │                                │
    │                                  │                                │
    │                                  │                                │  8. Admin ouvre le
    │                                  │                                │     diff (US-A007)
    │                                  │                                │     Vue avant/apres
    │                                  │                                │
    │                                  │                                │  9. Admin prend le
    │                                  │                                │     dossier (IN_REVIEW)
    │                                  │                                │
    │                                  │                                │  10a. VALIDE (US-A008)
    │                                  │◄──────────────────────────────│
    │                                  │                                │
    │                                  │  11a. Applique le diff :       │
    │                                  │       UPDATE stores SET        │
    │                                  │       description = new_value  │
    │                                  │       WHERE id = store_id      │
    │                                  │  12a. Request → APPROVED       │
    │                                  │  13a. Audit log (avant/apres)  │
    │                                  │                                │
    │  14a. Push "Modification         │                                │
    │       validee" (ADR-014 P#4)     │                                │
    │  15a. Email avec detail          │                                │
    │◄─────────────────────────────────│                                │
    │                                  │                                │
    │  16a. Badge disparait du         │                                │
    │       dashboard                  │                                │
    │                                  │                                │
    ──── OU ────────────────────────────────────────────────────────────
    │                                  │                                │
    │                                  │                                │  10b. REJETE (US-A008)
    │                                  │                                │      motif obligatoire
    │                                  │◄──────────────────────────────│
    │                                  │                                │
    │                                  │  11b. Request → REJECTED       │
    │                                  │  12b. Donnees live INCHANGEES  │
    │                                  │  13b. Audit log                │
    │                                  │                                │
    │  14b. Push "Modification         │                                │
    │       rejetee" (ADR-014 P#4)     │                                │
    │  15b. Email avec motif           │                                │
    │◄─────────────────────────────────│                                │
    │                                  │                                │
    │  16b. Le partenaire peut         │                                │
    │       resoumettre                │                                │
    │                                  │                                │
    ──── OU (APPROBATION PARTIELLE) ───────────────────────────────────
    │                                  │                                │
    │                                  │                                │  10c. PARTIEL (US-A008)
    │                                  │                                │      desc: approved
    │                                  │                                │      phone: rejected
    │                                  │◄──────────────────────────────│
    │                                  │                                │
    │                                  │  11c. Applique desc sur stores │
    │                                  │       Phone reste inchange     │
    │                                  │  12c. Request → APPROVED       │
    │                                  │       decision: {desc:approved,│
    │                                  │       phone:rejected}          │
    │                                  │  13c. Audit log                │
    │                                  │                                │
    │  14c. Push + email :             │                                │
    │       "Description validee.      │                                │
    │       Telephone rejete :         │                                │
    │       [motif]"                   │                                │
    │◄─────────────────────────────────│                                │
    │                                  │                                │
    │  15c. Le partenaire peut         │                                │
    │       resoumettre le telephone   │                                │
```

---

## 12. API endpoints

### 12.1 Partenaire

```
# Inscription
POST   /api/partner/register
       Body: { responsable: {...}, commerce: {...}, documents: FormData, cgu: {...} }
       Response: 201 { requestId, message: "Demande soumise" }

# Resoumission apres rejet
POST   /api/partner/register/resubmit
       Body: { previousRequestId, corrections: {...} }
       Response: 201 { requestId, message: "Demande resoumise" }

# Annuler sa demande d'inscription (avant traitement)
POST   /api/partner/registration-requests/:requestId/cancel
       Response: 200

# Consulter le statut de sa demande
GET    /api/partner/registration-requests/current
       Response: 200 { status, feedback?, submittedAt, ... }

# Soumettre une modification de commerce
POST   /api/partner/stores/:storeId/modification-requests
       Body: { fieldChanges: { description: { old, new } } }
       Response: 201 { requestId }

# Consulter les modifications en attente d'un commerce
GET    /api/partner/stores/:storeId/modification-requests?status=pending
       Response: 200 { items: [...] }

# Historique des modifications d'un commerce
GET    /api/partner/stores/:storeId/modification-requests?page=1&limit=20
       Response: 200 { items: [...], total, page }

# Annuler une modification en attente
POST   /api/partner/stores/:storeId/modification-requests/:requestId/cancel
       Response: 200
```

### 12.2 Admin

```
# File d'attente unifiee (inscriptions + modifications)
GET    /api/admin/approval-queue
       Query: ?type=registration|modification
              &status=pending|in_review
              &sortBy=created_at|type
              &sortOrder=asc|desc
              &page=1&limit=20
       Response: 200 { items: [...], total, counts: { pending, in_review } }

# Detail d'une inscription
GET    /api/admin/registration-requests/:requestId
       Response: 200 { ...allData, businessData, documents, history }

# Detail d'une modification (avec diff)
GET    /api/admin/modification-requests/:requestId
       Response: 200 { ...allData, fieldChanges, storeCurrentData }

# Prendre un dossier (inscription ou modification)
POST   /api/admin/approval-requests/:requestId/assign
       Response: 200 { status: "in_review", assignedTo: adminId }

# Relacher un dossier
POST   /api/admin/approval-requests/:requestId/release
       Response: 200 { status: "pending" }

# Approuver une inscription
POST   /api/admin/registration-requests/:requestId/approve
       Body: { internalNote?: string }
       Response: 200 { partnerId, storeId }

# Rejeter une inscription
POST   /api/admin/registration-requests/:requestId/reject
       Body: { reasons: ["invalid_brn", ...], comment: "Le BRN ne correspond pas..." }
       Response: 200

# Approuver une modification (totale ou partielle)
POST   /api/admin/modification-requests/:requestId/approve
       Body: {
         decision: { description: "approved", phone: "rejected" },
         rejectionReasons?: ["misleading_information"],
         adminComment?: "Le numero semble incorrect",
         internalNote?: "A surveiller"
       }
       Response: 200

# Rejeter une modification
POST   /api/admin/modification-requests/:requestId/reject
       Body: { reasons: [...], comment: "...", internalNote?: "..." }
       Response: 200

# Compteurs pour les badges de navigation
GET    /api/admin/approval-queue/counts
       Response: 200 { registrations: { pending: 3 }, modifications: { pending: 2 } }

# Historique des decisions d'un admin
GET    /api/admin/approval-requests/history
       Query: ?adminId=...&page=1&limit=20
       Response: 200 { items: [...] }
```

---

## 13. Integration avec les systemes existants

### 13.1 Integration audit trail (ADR-003)

Chaque transition de la machine a etats genere un audit log via l'`AuditInterceptor` NestJS :

| Action | entity_type | entity_id | Changes JSONB |
|--------|-------------|-----------|---------------|
| `registration.submitted` | `partner_registration_request` | request.id | `{ after: { business_data, status: "pending" } }` |
| `registration.assigned` | `partner_registration_request` | request.id | `{ before: { status: "pending" }, after: { status: "in_review", reviewed_by: admin.id } }` |
| `registration.approved` | `partner_registration_request` | request.id | `{ before: { status: "in_review" }, after: { status: "approved" } }` |
| `registration.rejected` | `partner_registration_request` | request.id | `{ before: { status: "in_review" }, after: { status: "rejected", rejection_reasons, admin_comment } }` |
| `store.modification_submitted` | `store_modification_request` | request.id | `{ after: { field_changes, status: "pending" } }` |
| `store.modification_approved` | `store_modification_request` | request.id | `{ before: { status: "in_review" }, after: { status: "approved", decision } }` |
| `store.updated_by_approval` | `store` | store.id | `{ before: { description: "old" }, after: { description: "new" } }` |
| `store.modification_rejected` | `store_modification_request` | request.id | `{ before: { status: "in_review" }, after: { status: "rejected", rejection_reasons, admin_comment } }` |

Ces actions apparaissent dans le journal d'activite global (US-A031) sous les categories "Administration" (cote admin) et "Partenaire" (cote soumission).

### 13.2 Integration notifications (ADR-014)

| Evenement | Destinataire | Canaux | Type ADR-014 | Desactivable ? |
|-----------|-------------|--------|-------------|:---:|
| Inscription soumise | Admin | Email + In-app | Admin #3 | Non |
| Inscription validee | Partenaire | Email + Push | Specifique (US-P002) | Non |
| Inscription rejetee | Partenaire | Email + Push | Specifique (US-P003) | Non |
| Modification soumise | Admin | In-app (badge) | Implicite | Non |
| Modification validee | Partenaire | Push + In-app | Partenaire #4 | Non |
| Modification rejetee | Partenaire | Push + In-app + Email | Partenaire #4 | Non |
| Rappel SLA 24h | Admin assigne | In-app | Interne | Non |
| Escalation SLA 48h | Tous les admins | Email + In-app | Interne | Non |
| Escalation SLA 72h | Super admin | Email | Interne | Non |

**Implementation BullMQ** :

Les notifications sont enqueue dans la queue `notifications` (ADR-014) par les effets de bord de la machine a etats :

```typescript
// modules/approval/effects/notify-partner-approved.effect.ts

export async function notifyPartnerApproved(
  ctx: TransitionContext<ApprovalRequest>,
): Promise<void> {
  await notificationQueue.add('send', {
    recipientId: ctx.entity.submittedBy,
    type: 'modification_approved',
    channels: ['push', 'in_app'],
    data: {
      storeName: ctx.metadata?.storeName,
      fields: ctx.metadata?.approvedFields,
    },
  });
}
```

Les jobs d'escalation SLA sont planifies par un job BullMQ recurrent (cron quotidien a 8h) qui scanne les requests en `PENDING` ou `IN_REVIEW` dont le `created_at` depasse les seuils configures.

### 13.3 Integration RBAC (ADR-011)

Les guards NestJS verifient :

| Endpoint | Guard | Verification |
|----------|-------|-------------|
| `POST /partner/register` | `PublicGuard` | Aucun JWT requis (endpoint public) |
| `POST /partner/stores/:id/modification-requests` | `RolesGuard(['partner'])` + `StoreOwnerGuard` | Le user a le role `partner` ET est `OWNER` ou `MANAGER` du store |
| `POST /admin/registration-requests/:id/approve` | `RolesGuard(['admin', 'super_admin'])` + `AdminPermissionGuard('approve_registration')` | Le user est admin ET a la permission `approve_registration` |
| `POST /admin/modification-requests/:id/approve` | `RolesGuard(['admin', 'super_admin'])` + `AdminPermissionGuard('approve_modification')` | Idem pour les modifications |

**Permissions admin ajoutees** (extension de l'enum ADR-011, section 6.1) :

```typescript
export enum AdminPermission {
  // ... permissions existantes ...

  // Workflow d'approbation
  APPROVE_REGISTRATION = 'approve_registration',
  REJECT_REGISTRATION = 'reject_registration',
  APPROVE_MODIFICATION = 'approve_modification',
  REJECT_MODIFICATION = 'reject_modification',
  ASSIGN_APPROVAL_REQUEST = 'assign_approval_request',
  VIEW_APPROVAL_QUEUE = 'view_approval_queue',
}

// Au lancement : admin a toutes ces permissions.
// super_admin aussi.
```

---

## 14. UX flow cote partenaire

### 14.1 Inscription -- ecran de statut post-soumission

Apres soumission du formulaire (US-P001), le partenaire voit un ecran de confirmation :

```
┌──────────────────────────────────────────────────────┐
│  BienBon                                             │
│──────────────────────────────────────────────────────│
│                                                      │
│           ┌──────────────────────────┐               │
│           │     [ Illustration ]      │               │
│           │    Dossier en cours de    │               │
│           │      verification         │               │
│           └──────────────────────────┘               │
│                                                      │
│  Merci pour votre inscription !                      │
│                                                      │
│  Votre demande a ete soumise avec succes.            │
│  Notre equipe va verifier vos informations           │
│  dans les 24 a 48 heures.                            │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ Reference : REG-2026-00042                     │  │
│  │ Soumise le : 27/02/2026 a 10h30               │  │
│  │ Statut : En attente de validation              │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Vous recevrez un email et une notification          │
│  des que votre inscription sera traitee.             │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ Une question ? Contactez-nous :                │  │
│  │ support@bienbon.mu | +230 5XXX XXXX            │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│                                [ Fermer ]            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 14.2 Rejet -- ecran de resoumission

Quand le partenaire suit le lien de resoumission depuis l'email de rejet :

```
┌──────────────────────────────────────────────────────┐
│  BienBon - Corriger ma demande                       │
│──────────────────────────────────────────────────────│
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ (!) Votre demande a ete rejetee le 28/02/2026  │  │
│  │                                                │  │
│  │ Motif : BRN invalide                           │  │
│  │ Detail : "Le numero BRN C07012345 ne           │  │
│  │ correspond a aucun commerce enregistre.         │  │
│  │ Veuillez verifier votre numero et resoumettre."│  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  Etape 1/4 : Informations du responsable             │
│  * Pre-rempli avec vos informations precedentes *    │
│  ●━━━━━━━━○─────────○─────────○─────────             │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ Prenom*              │ Nom*                  │    │
│  │ Jean                 │ Dupont                │    │
│  └──────────────────────────────────────────────┘    │
│  ...                                                 │
│                                                      │
│                              [ Suivant -> ]          │
└──────────────────────────────────────────────────────┘
```

### 14.3 Modification en attente -- badge sur le dashboard

```
┌──────────────────────────────────────────────────────┐
│  BienBon - Dashboard Partenaire                      │
│  Nav: Paniers | Reservations | Stats | Mon commerce  │
│──────────────────────────────────────────────────────│
│                                                      │
│  Mon Commerce > Le Chamarel                          │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ (i) 2 modifications en attente de validation   │  │
│  │                                                │  │
│  │  - Description : soumise le 25/02/2026         │  │
│  │  - Horaires : soumis le 26/02/2026             │  │
│  │                                                │  │
│  │  [ Voir le detail ]                            │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ Nom du commerce                                │  │
│  │ Le Chamarel                         [Modifier] │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │ Description              [En attente - Pending]│  │
│  │ Restaurant creole au coeur de Port-Louis       │  │
│  │ (donnee actuelle, live)                        │  │
│  │ ┌──────────────────────────────────────────┐   │  │
│  │ │ Modification en attente :                │   │  │
│  │ │ "Restaurant creole authentique au coeur  │   │  │
│  │ │ de Chamarel. Specialites : curry cerf,   │   │  │
│  │ │ rougaille saucisses, mine frite."        │   │  │
│  │ │                            [Annuler]     │   │  │
│  │ └──────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 15. UX flow cote admin

### 15.1 File d'attente unifiee

```
┌────────────────────────────────────────────────────────────────────┐
│  BienBon Admin                                 Admin · FR         │
├─────────┬──────────────────────────────────────────────────────────┤
│         │  Approbations                            5 en attente   │
│  Dash   │                                                        │
│  Part.  │  Onglets: [Inscriptions (3)] [Modifications (2)]       │
│   5     │           [Traitees recemment (47)]                    │
│  Conso  │                                                        │
│  Moder  │  Trier par : [ Date soumission v ]                     │
│  Fact.  │                                                        │
│  Audit  │  ┌────┬──────────────┬───────────┬──────────┬────────┐ │
│  Fraud  │  │ #  │ Commerce     │ Type      │ Date     │ Statut │ │
│  Param  │  ├────┼──────────────┼───────────┼──────────┼────────┤ │
│         │  │ 1  │ Chez Ravi    │ Inscr.    │ 24/02    │ Pending│ │
│         │  │    │              │ Traiteur  │ (3j)     │  (!)   │ │
│         │  ├────┼──────────────┼───────────┼──────────┼────────┤ │
│         │  │ 2  │ Le Chamarel  │ Modif.    │ 25/02    │ Pending│ │
│         │  │    │              │ Desc+Hrs  │ (2j)     │        │ │
│         │  ├────┼──────────────┼───────────┼──────────┼────────┤ │
│         │  │ 3  │ Fleur de Sel │ Inscr.    │ 26/02    │ En     │ │
│         │  │    │              │ Restaurant│ (1j)     │ revue  │ │
│         │  │    │              │           │          │ (K.)   │ │
│         │  ├────┼──────────────┼───────────┼──────────┼────────┤ │
│         │  │ 4  │ Sweet Corner │ Inscr.    │ 26/02    │ Pending│ │
│         │  │    │              │ Patisserie│ (1j)     │        │ │
│         │  ├────┼──────────────┼───────────┼──────────┼────────┤ │
│         │  │ 5  │ Royal Bakery │ Modif.    │ 27/02    │ Pending│ │
│         │  │    │              │ Photos    │ (<1j)    │        │ │
│         │  └────┴──────────────┴───────────┴──────────┴────────┘ │
│         │                                                        │
│         │  (!) Dossiers en attente > 48h (escalation)            │
│         │                                                        │
│         │  Page 1/1       [ < ] [ > ]                            │
└─────────┴──────────────────────────────────────────────────────────┘
```

### 15.2 Vue comparative pour les modifications (US-A007)

```
┌────────────────────────────────────────────────────────────────────┐
│  BienBon Admin > Approbations > Le Chamarel - Modification        │
├─────────┬──────────────────────────────────────────────────────────┤
│         │                                                        │
│         │  Le Chamarel - Modification #MOD-2026-00015            │
│         │  Soumise le 25/02/2026 par Jean-Marc Li Wan Po         │
│         │  Statut : En attente  [ Prendre le dossier ]           │
│         │                                                        │
│         │  ┌─────────────────────┬─────────────────────┬───────┐ │
│         │  │ Champ               │ Actuel (live)       │ Prop. │ │
│         │  ├─────────────────────┼─────────────────────┼───────┤ │
│         │  │ Description         │ Restaurant creole   │ Rest. │ │
│         │  │  [MODIFIE]          │ au coeur de         │ creole│ │
│         │  │                     │ Port-Louis          │ auth. │ │
│         │  │                     │                     │ au    │ │
│         │  │                     │                     │ coeur │ │
│         │  │                     │                     │ de    │ │
│         │  │                     │                     │Chamar.│ │
│         │  │                     │                     │ Spec. │ │
│         │  │                     │                     │ curry │ │
│         │  │                     │                     │ cerf. │ │
│         │  │                     │                     │       │ │
│         │  │  Decision :         │ [ Approuver ]       │[Rejet]│ │
│         │  ├─────────────────────┼─────────────────────┼───────┤ │
│         │  │ Horaires            │ Lun-Sam 11h-22h     │ Lun-  │ │
│         │  │  [MODIFIE]          │                     │ Dim   │ │
│         │  │                     │                     │ 11h-  │ │
│         │  │                     │                     │ 23h   │ │
│         │  │                     │                     │       │ │
│         │  │  Decision :         │ [ Approuver ]       │[Rejet]│ │
│         │  └─────────────────────┴─────────────────────┴───────┘ │
│         │                                                        │
│         │  Commentaire admin (visible par le partenaire) :       │
│         │  ┌────────────────────────────────────────────────┐    │
│         │  │                                                │    │
│         │  └────────────────────────────────────────────────┘    │
│         │                                                        │
│         │  Note interne (non visible) :                          │
│         │  ┌────────────────────────────────────────────────┐    │
│         │  │                                                │    │
│         │  └────────────────────────────────────────────────┘    │
│         │                                                        │
│         │  [ Valider les decisions ]      [ Annuler ]            │
│         │                                                        │
└─────────┴──────────────────────────────────────────────────────────┘
```

---

## 16. Index supplementaires

```sql
-- Requests en attente par commerce (verification "champ deja en attente")
CREATE INDEX idx_store_mod_requests_store_pending
  ON store_modification_requests (store_id)
  WHERE status IN ('pending', 'in_review');

-- Requests par statut et date (file d'attente admin)
CREATE INDEX idx_store_mod_requests_queue
  ON store_modification_requests (status, created_at ASC)
  WHERE status IN ('pending', 'in_review');

-- Chaine de resoumission
CREATE INDEX idx_store_mod_requests_previous
  ON store_modification_requests (previous_request_id)
  WHERE previous_request_id IS NOT NULL;

-- Inscriptions en attente
CREATE INDEX idx_reg_requests_queue
  ON partner_registration_requests (status, created_at ASC)
  WHERE status IN ('pending', 'in_review');

-- Inscriptions par user (historique)
CREATE INDEX idx_reg_requests_user
  ON partner_registration_requests (user_id, created_at DESC);

-- Chaine de resoumission (inscriptions)
CREATE INDEX idx_reg_requests_previous
  ON partner_registration_requests (previous_request_id)
  WHERE previous_request_id IS NOT NULL;
```

---

## 17. Decisions resumees

| # | Question | Decision | Justification |
|---|----------|----------|---------------|
| Q1 | Modele de donnees modifications | JSON diff `{ field: { old, new } }` dans une table `store_modification_requests` | Vue diff naturelle pour l'admin, approbation partielle native, verification d'integrite triviale, compatible ADR-003. |
| Q2 | Workflow d'approbation | Multi-etapes avec assignation (`PENDING` -> `IN_REVIEW` -> `APPROVED`/`REJECTED`) | Prevention du double traitement, coherent avec le workflow reclamations (ADR-017), visibilite equipe. |
| Q3 | Timeout | Escalation progressive (24h rappel, 48h urgent, 72h super_admin) sans auto-approbation | L'auto-approbation est trop risquee pour une marketplace de confiance. L'escalation cree de l'urgence sans compromettre la qualite. |
| Q4 | Matrice des champs | Tous les champs publics du commerce = approbation. Infos responsable = immediat. BRN = non modifiable. | Conforme aux specs (US-P007, US-P011). Toute donnee visible par le consommateur doit etre validee. |
| Q5 | Verification documents | Manuelle par l'admin + Supabase Storage prive + pas d'expiration en V1 | Pas d'API gouvernementale disponible a Maurice. L'expiration est un sujet V2. |
| Q6 | Resoumission | Nouvelle request liee a l'ancienne via `previous_request_id` + feedback semi-structure | Historique propre, chaque request est immutable, le feedback combine motifs predefinis et texte libre. |

---

## 18. Consequences

### Positives

1. **Separation nette live/staging** : les donnees publiques ne sont jamais alterees tant que l'admin n'a pas approuve. Zero risque de contenu non valide en production.
2. **Approbation partielle** : l'admin peut approuver la description et rejeter les coordonnees dans la meme request. Le partenaire n'est pas bloque sur les champs valides.
3. **Historique complet** : la chaine `previous_request_id` donne a l'admin une vision totale de l'historique des soumissions/rejets/corrections pour chaque partenaire.
4. **Coherence avec les ADR existantes** : la machine a etats s'integre dans le pattern de transition table type maison (ADR-017), l'audit trail est conforme a ADR-003, les notifications suivent l'architecture ADR-014.
5. **Scalabilite de l'equipe admin** : l'assignation (`IN_REVIEW`) evite le double traitement et permet de mesurer la charge par admin.
6. **Escalation SLA** : les rappels progressifs garantissent qu'aucun dossier ne reste indefiniment en attente.

### Negatives

1. **Deux tables de requests** : `partner_registration_requests` et `store_modification_requests` partagent une logique similaire mais sont des tables separees. Ce choix est delibere (les donnees sont structurellement differentes : snapshot complet vs diff partiel), mais il impose de maintenir deux services avec des patterns similaires.
2. **Complexite du JSONB `field_changes`** : la validation Zod du JSONB est stricte mais doit etre maintenue en coherence avec le schema Prisma de `stores`. Si on ajoute un champ a `stores`, il faut mettre a jour le schema Zod et la matrice d'approbation.
3. **Logique d'application du diff** : le service qui applique les changements approuves sur `stores` doit mapper les cles JSONB vers les colonnes SQL. Ce mapping est type et teste, mais c'est du code supplementaire a maintenir.

---

## 19. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Un admin approuve des donnees incorrectes (erreur humaine) | Moyenne | Moyen | L'audit trail permet de retracer et corriger. L'admin peut modifier la fiche directement (US-A012). |
| Le JSONB `field_changes` diverge du schema `stores` apres un ajout de colonne | Faible | Moyen | Le schema Zod est la source de verite. Un test d'integration verifie que toutes les cles du schema Zod correspondent a des colonnes de `stores`. |
| Un dossier reste bloque en `IN_REVIEW` (l'admin assigne est absent) | Moyenne | Faible | Le job d'escalation SLA detecte les dossiers en `IN_REVIEW` depuis > 48h et notifie les autres admins. Un admin peut relacher un dossier pris par un autre. |
| Race condition : deux admins tentent de prendre le meme dossier | Faible | Faible | La transition `PENDING` -> `IN_REVIEW` est protegee par un `UPDATE ... WHERE status = 'pending'` atomique. Le second admin recoit une erreur "dossier deja en revue". |
| Le partenaire tente de modifier un champ deja en attente | Faible | Faible | Verification en base avant creation de la request : `WHERE store_id = $1 AND status IN ('pending', 'in_review') AND field_changes ? $field`. Retour 409 Conflict. |
| Volume de requests en attente trop eleve (>50 dossiers) | Tres faible | Moyen | Les compteurs et l'escalation SLA permettent de detecter le probleme. Si le volume augmente, l'equipe admin doit etre renforcee. |

---

## 20. Plan d'implementation

### Phase 1 -- Inscription partenaire (Sprint 1-2)

1. Table `partner_registration_requests` + migration Prisma
2. Endpoint `POST /api/partner/register`
3. Machine a etats (transitions PENDING -> IN_REVIEW -> APPROVED/REJECTED)
4. Endpoints admin (file d'attente, approbation, rejet)
5. Supabase Storage pour les documents
6. Notifications (email confirmation, email bienvenue/rejet)
7. Audit trail

### Phase 2 -- Modification commerce (Sprint 3-4)

1. Table `store_modification_requests` + migration Prisma
2. Schemas Zod pour `field_changes`, `photoChanges`, `hoursChanges`
3. Service d'application du diff (JSONB -> UPDATE stores)
4. Verification "champ deja en attente" (prevention conflit)
5. Endpoints partenaire (soumission, historique, annulation)
6. Endpoints admin (diff view, approbation partielle)
7. Notifications
8. Audit trail

### Phase 3 -- Resoumission + Escalation (Sprint 5)

1. Chaine `previous_request_id` + pre-remplissage formulaire
2. Motifs de rejet predefinis (enum + seeds)
3. Jobs BullMQ d'escalation SLA (24h, 48h, 72h)
4. Compteurs et badges dans le menu admin
5. Tests d'integration end-to-end

---

## 21. References

### User stories
- US-P001, US-P002, US-P003 : inscription partenaire
- US-P007, US-P008, US-P009, US-P010, US-P011 : gestion commerce
- US-A004, US-A005, US-A006 : file d'attente inscription admin
- US-A007, US-A008 : file d'attente modification admin
- US-A009, US-A010 : inscription admin/terrain
- US-A011, US-A012 : fiche partenaire

### ADR connexes
- ADR-003 : schema DB, audit trail (`audit_logs`), table `partner_mod_requests` (renommee ici)
- ADR-011 : RBAC, `PartnerStatus`, `PartnerProfile`, `Store`, `PartnerStore`
- ADR-014 : notifications multi-canal, BullMQ
- ADR-017 : machine a etats partenaire (transitions P1-P6, etendues par P7-P8)
