# ADR-016 : Geolocalisation, carte interactive et recherche geographique

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-001 (stack backend NestJS + Prisma + PostgreSQL/Supabase), ADR-002 (architecture applicative), ADR-003 (schema BDD + PostGIS)

---

## Contexte

BienBon.mu est une marketplace mobile-first de paniers anti-gaspi a l'ile Maurice. Plusieurs user stories exigent des fonctionnalites geographiques :

- **US-C014** : Carte interactive montrant les partenaires avec paniers disponibles autour de l'utilisateur, marqueurs custom (design system dodo), clustering, tap sur marqueur pour preview
- **US-C015** : Vue liste des paniers tries par distance ("1.2 km"), coherente avec la carte (memes resultats, memes filtres)
- **US-C013** : Mode invite avec exploration de la carte sans inscription, geolocalisation proposee, fallback Port-Louis
- **US-C016 a US-C019** : Filtres combinables (jour, heure, type, preferences alimentaires) appliques sur carte et liste simultanement
- **US-C044** : Bouton "Y aller" ouvrant l'app de navigation native (Google Maps, Apple Maps, Waze)
- **US transversales** : Geolocalisation device avec permission prompt, fallback saisie manuelle d'adresse avec autocompletion

### Exigence de privacy (spec explicite)

> **La position exacte de l'utilisateur n'est JAMAIS envoyee au serveur.**

Le calcul de distance doit se faire cote client. Le serveur ne doit pas connaitre la localisation precise de l'utilisateur.

### Contradiction apparente dans les specs

Les specs demandent simultanement :
1. "La position n'est jamais envoyee au serveur"
2. "Afficher les paniers proches sur une carte"

Comment le serveur peut-il renvoyer les paniers proches s'il ne connait pas la position ? Cette ADR resout cette contradiction.

### Specificites de l'ile Maurice

- **Superficie** : ~65 km x 45 km (2 040 km2) -- une ile tres compacte
- **Population** : ~1.3 million d'habitants
- **Organisation administrative** : 9 districts, 1 ville (Port-Louis), 4 towns, 130 villages
- **Codes postaux** : Systeme a 5 chiffres (1er chiffre = district, 2e-3e = village council, 4e-5e = sous-localite)
- **Volumetrie partenaires estimee** (ADR-003) : 50-500 commerces a horizon 3 ans, max ~600

### Stack technique decidee

- **Mobile** : Flutter (2 apps : consumer + partner)
- **Backend** : NestJS + Prisma + PostgreSQL (Supabase) + PostGIS
- **API** : REST avec view endpoints
- **Admin** : React (web)

---

## Questions a trancher

| # | Question |
|---|----------|
| Q1 | Quel provider de carte pour Flutter et React ? |
| Q2 | Architecture des requetes geo : serveur vs client ? (resolution de la contradiction privacy) |
| Q3 | Quel service de geocoding et autocompletion d'adresse pour Maurice ? |
| Q4 | Comment calculer et afficher les distances ? |
| Q5 | Comment implementer les marqueurs custom et le clustering ? |
| Q6 | Quelle strategie de performance carte ? |

---

## Q1 : Choix du provider de carte

### Options evaluees

#### Option 1A : Google Maps (`google_maps_flutter` + Maps JavaScript API)

**Description** : SDK le plus mature et le plus utilise mondialement. Meilleure couverture de donnees POI.

**Avantages** :
- Couverture cartographique excellente a Maurice : rues, noms de lieux, POIs bien references
- SDK Flutter tres mature (`google_maps_flutter`, maintenu par l'equipe Flutter)
- Marqueurs custom, clustering natif, integration StreetView
- 200M+ places referencees mondialement, bonne presence a Maurice
- Documentation exhaustive, communaute massive
- Coherence mobile + web (Maps JavaScript API pour l'admin React)

**Inconvenients** :
- **Cout eleve** : depuis mars 2025, le credit gratuit de $200/mois est remplace par des seuils gratuits par SKU
  - Dynamic Maps : 100 000 chargements gratuits/mois, puis $7/1000
  - Geocoding : 10 000 requetes gratuites/mois, puis $5/1000
  - Places Autocomplete : requete gratuite, mais le retrieve Places Details est facture
  - Subscription Starter ($100/mois) : 50 000 appels toutes APIs confondues
- Performance Flutter : le widget natif cause du lag au redimensionnement (bug connu, workaround = plein ecran)
- Vendor lock-in fort : les conditions d'utilisation interdisent d'afficher les donnees Google Maps sur une autre carte
- Risque d'explosion de couts si l'app decolle

**Estimation de cout** :
- Phase beta (100 utilisateurs) : $0/mois (dans les seuils gratuits)
- Phase lancement (1 000 MAU) : ~$50-100/mois
- Phase croissance (10 000 MAU) : ~$500-1000/mois (selon usage geocoding/places)

#### Option 1B : Mapbox (`mapbox_maps_flutter` + Mapbox GL JS)

**Description** : Alternative premium a Google Maps, forte en customisation visuelle et offline.

**Avantages** :
- **Free tier genereux** : 25 000 MAU mobile gratuits, 50 000 map loads web gratuits
- Personnalisation poussee du style de carte (Mapbox Studio) : ideal pour le design system BienBon
- Geocoding : 100 000 requetes temporaires gratuites/mois
- Search Box (autocompletion) : 500 sessions gratuites/mois, puis $11.50/1000
- Offline maps natif (utile si certaines zones de Maurice ont une mauvaise connectivite)
- Bonne qualite cartographique a Maurice (base OSM + donnees proprietaires)
- SDK Flutter (`mapbox_maps_flutter`) maintenu par Mapbox, support marqueurs custom et clustering

**Inconvenients** :
- SDK Flutter moins mature que Google : quelques limitations sur les marqueurs custom (annotations)
- Donnees POI moins riches que Google a Maurice
- La licence Mapbox GL JS (web) est proprietaire depuis v2 (pas de fork possible)
- MAU = par device, pas par utilisateur (un meme utilisateur sur 2 devices = 2 MAU)

**Estimation de cout** :
- Phase beta (100 MAU) : $0/mois
- Phase lancement (1 000 MAU) : $0/mois (dans le free tier 25 000 MAU)
- Phase croissance (10 000 MAU) : $0/mois (dans le free tier 25 000 MAU)
- Phase scale (30 000 MAU) : ~$250/mois (5 000 MAU au-dela du seuil, a $5.00/1000 MAU)

#### Option 1C : flutter_map + tiles OSM (via MapTiler ou Stadia Maps)

**Description** : Package Flutter open-source, pur Dart, combinable avec n'importe quel fournisseur de tuiles raster ou vectorielles.

**Avantages** :
- **100% gratuit** en tant que package (licence BSD)
- Pur Dart/Flutter : pas de widget natif, pas de canal platform, pas de lag au redimensionnement
- **Performance excellente** : tourne a ~120 FPS sur iOS, impact minimal sur les performances de l'app
- Pas de vendor lock-in : on peut changer de fournisseur de tuiles a tout moment
- Communaute active, ecosysteme riche : `flutter_map_marker_cluster`, `flutter_map_supercluster`, animations
- Cross-platform complet : mobile, web, desktop avec le meme code

**Inconvenients** :
- **Ne fournit PAS de tuiles** : il faut choisir un tile provider separement
  - OpenStreetMap tile server : gratuit mais usage strict (pas pour la production commerciale a fort trafic)
  - MapTiler : gratuit jusqu'a un seuil (variable selon le plan), tuiles vectorielles, bon design
  - Stadia Maps : 200 000 requetes gratuites/mois, bonne qualite
- La couverture OSM a Maurice est correcte pour les routes principales mais **incomplete sur les details** (adresses precises, certains POIs, noms de rues secondaires). Le reseau routier est trace mais avec "a lot of room for improvements" (source : OSM WikiProject Mauritius)
- Pas d'integration native de geocoding ni d'autocompletion (a integrer separement)
- Pas de StreetView
- Pour le web admin (React) : il faudrait utiliser MapLibre GL JS ou Leaflet (ecosysteme different)

**Estimation de cout (avec MapTiler Free)** :
- Phase beta : $0/mois
- Phase lancement : $0/mois
- Phase croissance : $0-25/mois (selon le plan MapTiler choisi)

#### Option 1D : MapLibre (`maplibre` Flutter + MapLibre GL JS)

**Description** : Fork open-source de Mapbox GL, vendor-neutral. Utilisable avec n'importe quel tile provider.

**Avantages** :
- Open-source (licence BSD) : pas de cout de licence, pas de vendor lock-in
- Compatible avec les tuiles Mapbox, MapTiler, ou auto-hebergees
- MapLibre GL JS pour le web admin React : meme technologie mobile et web
- Performant (rendu vectoriel GPU-accelere)

**Inconvenients** :
- Le package Flutter (`maplibre`) est encore experimental (certaines features d'interop Dart Native en cours de stabilisation pour 2025-2026)
- Moins de documentation et d'exemples que les alternatives
- Marqueurs custom et clustering necessitent plus de code boilerplate
- Pas de service de geocoding/autocompletion integre

**Estimation de cout** :
- Toutes phases : $0 (hors tuiles si non auto-hebergees)

### Decision Q1 : flutter_map + MapTiler (tiles) + Mapbox GL JS (admin web)

**Choix retenu : Option 1C (flutter_map) pour les apps Flutter, avec MapTiler comme fournisseur de tuiles.**

**Pour l'admin web React : Mapbox GL JS ou MapLibre GL JS selon le budget.**

#### Justification

1. **Cout** : C'est le critere determinant pour une startup. flutter_map est gratuit. Combine avec MapTiler Free ou Stadia Maps, le cout mensuel est nul ou negligeable pendant toute la phase de lancement et de croissance initiale. Google Maps couterait $500-1000/mois des 10 000 MAU, soit $6 000-12 000/an -- inacceptable pour une startup mauricienne.

2. **Performance** : flutter_map est pur Dart, sans pont natif. Il atteint ~120 FPS sur iOS et n'a pas le bug de lag au redimensionnement de `google_maps_flutter`. Sur les telephones d'entree de gamme courants a Maurice (Xiaomi, Samsung Galaxy A, Huawei), cette difference est significative.

3. **Pas de vendor lock-in** : On peut changer de tile provider sans toucher au code de la carte. Si MapTiler devient cher, on bascule sur Stadia Maps ou des tuiles auto-hebergees.

4. **Couverture Maurice** : La couverture OSM a Maurice est suffisante pour notre cas d'usage. On affiche des marqueurs de partenaires sur une carte, pas un GPS de navigation. Les routes principales, les villes et les districts sont bien mappes. Les adresses precises des partenaires sont saisies manuellement lors de l'onboarding partenaire (coordonnees GPS incluses).

5. **Ecosysteme clustering** : `flutter_map_supercluster` (base sur l'algorithme Supercluster de Mapbox, tres performant) et `flutter_map_marker_cluster` offrent des solutions de clustering matures.

6. **Coherence web** : Pour l'admin React (usage interne, faible trafic), on utilisera MapLibre GL JS (gratuit, open-source) avec les memes tuiles MapTiler. Si le besoin de customisation visuelle est fort, Mapbox GL JS est une option (50 000 map loads gratuits/mois pour le web, largement suffisant pour un back-office interne).

#### Plan de migration si necessaire

Si la couverture OSM/MapTiler s'avere insuffisante a Maurice apres les tests terrain, la migration vers Mapbox est relativement simple :
- Cote Flutter : remplacer `flutter_map` par `mapbox_maps_flutter` (API similaire pour les cas basiques)
- Cote web : deja compatible (Mapbox GL JS ou MapLibre GL JS)
- Delai estime : 2-3 jours de refactoring

---

## Q2 : Architecture des requetes geo -- resolution de la contradiction privacy

### Analyse du probleme

La spec exige :
- **P1** : La position exacte n'est JAMAIS envoyee au serveur
- **P2** : Afficher les paniers proches sur une carte triable par distance
- **P3** : Filtres combinables (jour, heure, type, preferences) avec les resultats geo

Comment le serveur peut-il filtrer par proximite sans connaitre la position ?

### Options evaluees

#### Option 2A : Bounding box -- le client envoie la zone visible de la carte

Le client envoie les coordonnees des 4 coins de la zone visible (`southwest_lat`, `southwest_lng`, `northeast_lat`, `northeast_lng`). Le serveur fait un `ST_Within` PostGIS pour retourner les commerces dans ce rectangle.

```
GET /api/baskets?sw_lat=-20.35&sw_lng=57.45&ne_lat=-20.15&ne_lng=57.55&day=today&type=bakery
```

**Avantages** :
- Efficace cote serveur (index PostGIS `GiST`)
- Ne revele pas la position exacte de l'utilisateur (la bounding box peut etre centree n'importe ou)
- Charge reseau proportionnelle a la zone visible, pas a tout le dataset
- Compatible avec le zoom/pan : chaque mouvement de carte declenche une nouvelle requete

**Inconvenients** :
- **Revele la zone d'interet** de l'utilisateur (pas la position exacte, mais la zone qu'il regarde). Sur un ecran mobile, la bounding box fait typiquement 5-10 km de cote, ce qui est une approximation assez grossiere
- Necessite un debouncing des requetes lors du pan/zoom (eviter le spam API)
- Plus de requetes reseau qu'un chargement complet

#### Option 2B : Chargement complet -- le serveur envoie TOUS les commerces actifs

Le serveur expose un endpoint qui retourne tous les commerces ayant au moins un panier disponible, avec leurs coordonnees. Le client filtre, trie et calcule les distances localement.

```
GET /api/baskets/available?day=today&type=bakery
```

Reponse : liste de tous les paniers disponibles avec les coordonnees du commerce.

**Avantages** :
- **Privacy maximale** : le serveur ne recoit AUCUNE information geographique sur l'utilisateur, meme pas une zone
- Le serveur ne sait pas si l'utilisateur regarde Port-Louis ou Curepipe
- Un seul appel API pour toute la carte (pas de requetes au pan/zoom)
- Le tri par distance, le filtrage par rayon, le clustering sont entierement client-side
- Fonctionne offline apres le premier chargement (si les donnees sont en cache)

**Inconvenients** :
- Plus de donnees transferees a chaque requete. Estimation :
  - 500 paniers x ~200 octets/panier = ~100 Ko (compresse gzip : ~20-30 Ko)
  - C'est l'equivalent d'une seule image. Negligeable.
- Ne scale pas au-dela de quelques milliers de paniers... mais Maurice en aura 500 max a horizon 3 ans
- Le filtrage cote serveur (jour, heure, type, preferences) reduit encore la taille de la reponse

#### Option 2C : Filtrage par district/region

Le client envoie un district ou une region (parmi les 9 districts de Maurice). Le serveur filtre par region.

```
GET /api/baskets/available?district=port-louis&day=today
```

**Avantages** :
- Compromis entre privacy et filtrage serveur
- Le district est une information tres grossiere (9 zones seulement pour toute l'ile)

**Inconvenients** :
- Mauvaise UX pour les utilisateurs aux frontieres de districts : un commerce a 500 m dans le district voisin ne serait pas affiche
- Necessite quand meme un chargement supplementaire quand l'utilisateur scroll vers un autre district
- Plus complexe a implementer pour peu de benefice vs l'option 2B

### Decision Q2 : Option 2B -- Chargement complet avec filtrage client

**Architecture retenue : le serveur envoie tous les paniers disponibles (filtres par jour/heure/type/preferences), le client gere integralement la geolocalisation, le tri par distance et l'affichage carte.**

#### Justification

1. **Privacy absolue** : C'est la seule option qui respecte a la lettre la spec "la position n'est JAMAIS envoyee au serveur". Meme une bounding box revele la zone d'interet.

2. **Maurice est petit** : Avec max ~600 commerces et ~500 paniers actifs simultanement, la payload est de l'ordre de 20-30 Ko compresse. C'est moins qu'une image de panier. Le transfert reseau est negligeable, meme en 3G.

3. **Simplicite** : Un seul endpoint, pas de debouncing de bounding box, pas de gestion d'etats intermediaires au pan/zoom. Le client recoit les donnees et gere tout localement.

4. **Performance percue** : L'utilisateur deplace la carte et voit immediatement les marqueurs (pas d'attente reseau). Le tri par distance en vue liste est instantane (Haversine en Dart, O(n log n) sur 500 elements = microseconde).

5. **Offline-ready** : Apres le premier chargement, les donnees sont en cache. L'utilisateur peut explorer la carte meme avec une mauvaise connexion.

#### Schema de l'architecture

```
┌──────────────┐                          ┌──────────────────┐
│   Flutter     │  GET /baskets/available  │    NestJS API    │
│   App         │  ?day=today&type=bakery  │                  │
│               │ ──────────────────────── │                  │
│               │                          │  SELECT * FROM   │
│               │  ← JSON: [{             │  baskets b       │
│  ┌──────────┐ │    id, title, price,     │  JOIN stores s   │
│  │ Device   │ │    store: {              │  WHERE b.stock>0 │
│  │ GPS      │ │      name, lat, lng,     │  AND b.slot_date │
│  │          │ │      address             │  = :day          │
│  │ Position │ │    },                    │  AND ...         │
│  │ NEVER    │ │    pickup_start,         │                  │
│  │ leaves   │ │    pickup_end,           └──────────────────┘
│  │ device   │ │    tags: [...]
│  └──────────┘ │  }]
│               │
│  Client-side: │
│  - Haversine  │
│    distance   │
│  - Sort by    │
│    proximity  │
│  - Filter by  │
│    radius     │
│  - Cluster    │
│    markers    │
└──────────────┘
```

#### Endpoint API

```typescript
// GET /api/v1/baskets/available
// Query params (tous optionnels, filtrage serveur) :
//   day: string (ISO date, ex: "2026-02-27")
//   time_slot: string ("morning" | "noon" | "afternoon" | "evening")
//   types: string[] (ex: ["bakery", "restaurant"])
//   dietary: string[] (ex: ["vegetarian", "halal"])

// Response: 200 OK
{
  "data": [
    {
      "id": "uuid",
      "title": "Panier Surprise",
      "original_price": 150,
      "selling_price": 50,
      "stock": 2,
      "pickup_start": "2026-02-27T12:00:00+04:00",
      "pickup_end": "2026-02-27T14:00:00+04:00",
      "tags": ["vegetarian"],
      "store": {
        "id": "uuid",
        "name": "Le Chamarel",
        "image_url": "https://...",
        "latitude": -20.2471,
        "longitude": 57.4898,
        "address": "12 Rue Royale, Port-Louis"
      }
    }
    // ... tous les paniers disponibles
  ],
  "meta": {
    "total": 47,
    "generated_at": "2026-02-27T10:30:00+04:00"
  }
}
```

#### Strategie de cache et rafraichissement

| Evenement | Action |
|-----------|--------|
| Ouverture de l'app / retour au premier plan | Requete API, mise a jour du cache local |
| Changement de filtre (jour, type, heure, preferences) | Requete API avec les nouveaux filtres |
| Pull-to-refresh sur la vue liste | Requete API forcee |
| Timer periodique (toutes les 60 secondes si l'app est au premier plan) | Requete API silencieuse pour le stock temps reel (US-C014 : "la carte se met a jour en temps reel") |
| Pan/zoom de la carte | Aucune requete -- les donnees sont deja en memoire |

Le header `Cache-Control: max-age=30` permet au client HTTP de servir le cache pendant 30 secondes, evitant les requetes redondantes lors de changements rapides d'onglets carte/liste.

#### Seuils et plan d'evolution

| Phase | Partenaires | Paniers actifs | Payload estimee | Strategie |
|-------|-------------|---------------|-----------------|-----------|
| Beta | 10-30 | 20-50 | ~5 Ko gzip | Chargement complet |
| Lancement | 50-100 | 50-150 | ~10-15 Ko gzip | Chargement complet |
| Croissance (an 1-2) | 100-300 | 100-400 | ~20-40 Ko gzip | Chargement complet |
| Scale (an 3+) | 300-600 | 300-600 | ~40-60 Ko gzip | Chargement complet, reevaluer si > 1 000 |

**Seuil de reevaluation** : Si le nombre de paniers actifs simultanes depasse 1 500, reevaluer la strategie bounding box (Option 2A) comme optimisation. A ce stade, la payload serait de ~150-200 Ko gzip, ce qui reste acceptable mais moins optimal sur les reseaux 3G lents. Ce seuil est peu probable a Maurice a horizon 5 ans.

---

## Q3 : Geocoding et autocompletion d'adresse pour Maurice

### Contexte du besoin

Le geocoding est necessaire pour deux cas d'usage :
1. **Fallback geolocalisation** : Quand l'utilisateur refuse la permission GPS, il saisit manuellement son adresse ou sa ville. Il faut convertir cette adresse en coordonnees (lat/lng) pour centrer la carte et calculer les distances.
2. **Onboarding partenaire** : Le partenaire saisit l'adresse de son commerce. Il faut obtenir les coordonnees GPS pour le stockage en BDD.

### Specificites mauriciennes

- Le systeme d'adresses a Maurice est informel dans les zones rurales : pas de noms de rue systematiques, references par rapport aux landmarks
- Les noms de lieux existent en francais, anglais et creole mauricien (ex: "Quatre Bornes" vs "Kat Born")
- Le systeme de codes postaux (5 chiffres) est relativement recent (2014) et pas universellement utilise par les habitants
- La couverture OSM a Maurice est qualifiee de "basic road network traced with many details still missing" (source : WikiProject Mauritius)

### Options evaluees

#### Option 3A : Google Places Autocomplete + Geocoding

**Avantages** :
- Meilleure couverture a Maurice : Google a indexe enormement de commerces et adresses mauriciens grace au crowdsourcing Google Maps
- Autocompletion fluide avec gestion des fautes de frappe et des noms en creole
- Geocoding precis (coordonnees au batiment dans les zones urbaines)

**Inconvenients** :
- Cout : requetes Autocomplete gratuites, mais Places Details payant
- Dependance a Google
- Les conditions d'utilisation imposent d'afficher les resultats sur une Google Map (incompatible avec flutter_map)

**Blocage** : Les ToS de Google Places exigent que les resultats soient affiches sur une Google Map. Or on utilise flutter_map. **Cette option est eliminee pour incompatibilite de licence.**

#### Option 3B : Mapbox Search Box (Geocoding + Autocomplete)

**Avantages** :
- 100 000 requetes geocoding temporaires gratuites/mois
- 500 sessions Search Box (autocompletion) gratuites/mois, puis $11.50/1000
- Bonne couverture internationale, base OSM enrichie avec donnees proprietaires
- Pas de restriction d'affichage sur une carte specifique
- SDK Flutter disponible (`mapbox_search_flutter`)

**Inconvenients** :
- Couverture a Maurice probablement inferieure a Google (mais suffisante pour les villes et villages principaux)
- L'autocompletion en creole mauricien n'est pas garantie
- 500 sessions gratuites = ~500 utilisateurs/mois utilisant le fallback adresse (probablement suffisant)

#### Option 3C : Nominatim (OpenStreetMap)

**Avantages** :
- Gratuit et open-source
- Self-hostable (instance Nominatim sur un VPS avec les donnees OSM de Maurice : ~50 Mo)
- Pas de restriction d'utilisation
- Pas de dependance a un service tiers

**Inconvenients** :
- L'usage du serveur public Nominatim est limite a 1 requete/seconde et interdit pour l'usage commercial intensif
- La precision a Maurice est limitee : "addresses and postcodes are approximate" (source : Nominatim)
- Pas d'autocompletion native performante (le search est fait en requete complete, pas en suggestion)
- L'autohebergement ajoute de la complexite ops

#### Option 3D : Approche hybride simplifiee

Etant donne que le fallback adresse est un cas secondaire (la majorite des utilisateurs activeront le GPS), on peut simplifier drastiquement :

1. **Pas de geocoding API externe pour le fallback utilisateur** : proposer un selecteur de localite parmi les ~135 villes/villages de Maurice (liste statique predefinie avec coordonnees centroide pre-calculees)
2. **Mapbox Geocoding** uniquement pour l'onboarding partenaire (usage faible, admin, besoin de precision)
3. **Nominatim self-hoste** comme fallback gratuit si Mapbox est indisponible

### Decision Q3 : Option 3D -- Approche hybride simplifiee

#### Pour le fallback consommateur : selecteur de localite

Au lieu d'un champ de texte libre avec autocompletion (complexe, couteux, imprecis a Maurice), on propose un **selecteur a deux niveaux** :

```
Etape 1: Choisir un district
  ┌─────────────────────────┐
  │ Port-Louis          ▸  │
  │ Pamplemousses       ▸  │
  │ Riviere du Rempart  ▸  │
  │ Flacq               ▸  │
  │ Grand Port          ▸  │
  │ Savanne             ▸  │
  │ Black River         ▸  │
  │ Plaines Wilhems     ▸  │
  │ Moka                ▸  │
  └─────────────────────────┘

Etape 2: Choisir une localite
  ┌─────────────────────────┐
  │ 🔍 Rechercher...        │
  │                         │
  │ Beau Bassin-Rose Hill   │
  │ Curepipe                │
  │ Quatre Bornes           │
  │ Vacoas-Phoenix          │
  │ ...                     │
  └─────────────────────────┘
```

**Donnees** : Un fichier JSON statique embarque dans l'app (~135 localites x 40 octets = ~5 Ko) contenant :
```json
[
  {
    "id": "beau-bassin",
    "name": "Beau Bassin-Rose Hill",
    "name_creole": "Bo Basin-Roz Hil",
    "district": "plaines-wilhems",
    "latitude": -20.2338,
    "longitude": 57.4681
  }
]
```

**Avantages** :
- Zero cout API
- Fonctionne offline
- Pas de probleme de qualite de geocoding : les coordonnees sont pre-verifiees
- UX adaptee au contexte mauricien : les habitants connaissent leur village/ville
- Recherche fuzzy cote client sur le nom (francais + creole)
- Privacy totale : rien n'est envoye au serveur

**Inconvenient** :
- La precision est au centroide de la localite (~1-2 km de marge), pas a l'adresse exacte. Pour l'usage "distance approximative depuis chez moi", c'est suffisant.

#### Pour l'onboarding partenaire : saisie GPS assistee

L'onboarding partenaire (effectue par l'admin ou le partenaire lui-meme) necessite des coordonnees precises :

1. **Option principale** : Le partenaire place un pin sur la carte (flutter_map) a l'emplacement exact de son commerce. Tap long sur la carte = drop le pin, ajustable par drag.
2. **Option secondaire** : Saisie de l'adresse textuelle + geocoding via Mapbox Geocoding API (100 000 requetes gratuites/mois, largement suffisant pour 10-20 onboardings/mois).
3. **Option tertiaire** : Saisie manuelle des coordonnees GPS (pour les cas avances).

Le geocoding pour l'onboarding partenaire est un **usage admin, faible volume** : meme avec Mapbox payant, le cout serait negligeable (~$0/mois).

#### Pour la navigation "Y aller" (US-C044)

Le bouton "Y aller" ouvre une URL de deep link vers l'app de navigation native :
```dart
// Exemple en Dart avec url_launcher
final lat = store.latitude;
final lng = store.longitude;
final label = Uri.encodeComponent(store.name);

// Tente Google Maps d'abord, puis Apple Maps, puis Waze
final urls = [
  'google.navigation:q=$lat,$lng',                    // Android Google Maps
  'comgooglemaps://?daddr=$lat,$lng&directionsmode=driving', // iOS Google Maps
  'maps:$lat,$lng?q=$label',                           // Apple Maps
  'waze://?ll=$lat,$lng&navigate=yes',                 // Waze
  'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng', // Fallback web
];
```

Aucun API payant n'est necessaire : on passe simplement les coordonnees a l'app de navigation installée sur le device.

---

## Q4 : Calcul et affichage des distances

### Decision : Calcul cote client avec formule Haversine

Etant donne la decision Q2 (chargement complet, pas d'envoi de position au serveur), le calcul de distance est entierement cote client.

#### Implementation Dart

```dart
import 'dart:math';

/// Calcule la distance en km entre deux points GPS (formule de Haversine)
double haversineDistance(
  double lat1, double lon1,
  double lat2, double lon2,
) {
  const R = 6371.0; // Rayon de la Terre en km
  final dLat = _toRadians(lat2 - lat1);
  final dLon = _toRadians(lon2 - lon1);
  final a = sin(dLat / 2) * sin(dLat / 2) +
      cos(_toRadians(lat1)) * cos(_toRadians(lat2)) *
      sin(dLon / 2) * sin(dLon / 2);
  final c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return R * c;
}

double _toRadians(double degrees) => degrees * pi / 180;

/// Formate la distance pour l'affichage
String formatDistance(double km) {
  if (km < 1) {
    return '${(km * 1000).round()} m';
  } else if (km < 10) {
    return '${km.toStringAsFixed(1)} km';
  } else {
    return '${km.round()} km';
  }
}
```

#### Precision

La formule Haversine est exacte a ~0.3% pour les distances sur l'ile Maurice (elle ignore l'aplatissement de la Terre, negligeable a l'echelle de 65 km). La precision est de l'ordre de quelques metres -- tres largement suffisante pour afficher "1.2 km".

#### Tri de la vue liste

```dart
// Tri par distance apres calcul
baskets.sort((a, b) {
  final distA = haversineDistance(userLat, userLng, a.store.lat, a.store.lng);
  final distB = haversineDistance(userLat, userLng, b.store.lat, b.store.lng);
  return distA.compareTo(distB);
});
```

Sur 500 paniers, ce tri prend moins d'une milliseconde. Aucun probleme de performance.

#### Position de l'utilisateur

| Scenario | Source de position | Precision |
|----------|-------------------|-----------|
| GPS active | API Geolocator Flutter (`geolocator` package) | ~10 m |
| GPS refuse, localite selectionnee | Centroide de la localite (fichier JSON statique) | ~1-2 km |
| GPS refuse, pas de selection | Port-Louis par defaut (lat: -20.1609, lng: 57.5012) | ~10-30 km |

---

## Q5 : Marqueurs custom et clustering

### Marqueurs custom (design system dodo)

Le design system prevoit des marqueurs custom representant le dodo (mascotte BienBon) avec un badge de disponibilite (nombre de paniers restants).

#### Implementation avec flutter_map

```dart
MarkerLayer(
  markers: stores.map((store) => Marker(
    point: LatLng(store.latitude, store.longitude),
    width: 48,
    height: 56,
    child: GestureDetector(
      onTap: () => _showStorePreview(store),
      child: DodoMarker(
        availableBaskets: store.basketCount,
        isSelected: selectedStoreId == store.id,
      ),
    ),
  )).toList(),
)
```

Le `DodoMarker` est un widget Flutter standard (pas un bitmap). Cela signifie qu'on a un controle total sur le rendu : animations, theming, etat selected/unselected, badge dynamique.

**Avantage majeur de flutter_map** : les marqueurs sont des widgets Flutter natifs, pas des bitmaps injectes dans un SDK natif. On peut utiliser le meme composant `DodoMarker` que dans le reste du design system, avec les memes couleurs, polices et animations.

### Clustering

#### Package retenu : `flutter_map_supercluster`

Cet algorithme est base sur le [Supercluster](https://github.com/nicholasgasior/supercluster-dart) de Mapbox, extremement rapide (index spatial KD-tree).

```dart
SuperclusterLayer.immutable(
  initialMarkers: markers,
  clusterWidgetSize: const Size(48, 48),
  builder: (context, position, markerCount, extraClusterData) {
    return ClusterBubble(count: markerCount);
  },
  // Rayon de clustering en pixels (plus le zoom est faible, plus on clusterise)
  indexBuilder: IndexBuilder.withOptions(
    options: SuperclusterOptions(radius: 80, maxZoom: 16),
  ),
)
```

#### Seuils de clustering

| Zoom | Echelle approximative | Comportement |
|------|----------------------|-------------|
| 8-10 | Toute l'ile | Clusters de districts (~5-10 clusters) |
| 11-13 | Une region | Clusters de villes (~10-30 marqueurs) |
| 14-15 | Un quartier | Marqueurs individuels |
| 16+ | Rue | Marqueurs individuels avec details |

Avec max 500 marqueurs, le clustering n'est pas strictement necessaire pour la performance, mais il ameliore la lisibilite de la carte aux niveaux de zoom faibles.

### Infobulle au tap sur un marqueur

Au tap sur un marqueur, afficher un bottom sheet partiel (draggable) avec :
- Photo miniature du commerce
- Nom du partenaire
- Nombre de paniers disponibles
- Fourchette de prix
- Distance
- Bouton "Voir" qui ouvre la fiche partenaire (US-C019)

```dart
void _showStorePreview(Store store) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (context) => StorePreviewSheet(
      store: store,
      distance: haversineDistance(userLat, userLng, store.lat, store.lng),
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => StoreDetailPage(storeId: store.id)),
      ),
    ),
  );
}
```

---

## Q6 : Strategie de performance carte

### Budget de performance

| Metrique | Cible | Justification |
|----------|-------|--------------|
| Temps de chargement initial de la carte | < 1.5 s | Inclut le rendu des tuiles + positionnement des marqueurs |
| FPS pendant pan/zoom | >= 30 FPS | Minimum pour une UX fluide sur un telephone d'entree de gamme |
| Temps de reponse API (baskets available) | < 500 ms (P95) | Requete simple avec filtres, petit dataset |
| Taille payload API | < 50 Ko gzip | Max 500 paniers x 200 octets |
| Memoire additionnelle carte | < 50 Mo | Tuiles en cache + marqueurs en memoire |

### Optimisations implementees

1. **Tuiles** : Utiliser `CancellableNetworkTileProvider` (package `flutter_map_cancellable_tile_provider`) pour annuler les requetes de tuiles hors viewport lors du pan rapide. Cela reduit la consommation bande passante et ameliore la reactivite.

2. **Cache tuiles** : Implementer un cache disque pour les tuiles map via `flutter_cache_manager`. Les tuiles de Maurice (9 districts, zoom 8-16) representent ~50-100 Mo max en cache.

3. **Clustering immutable** : Utiliser `SuperclusterLayer.immutable` qui pre-calcule l'index spatial une seule fois. Reevaluer l'index uniquement quand les donnees changent (pas a chaque frame).

4. **Marqueurs widgets legers** : Les `DodoMarker` widgets doivent etre `const` autant que possible. Eviter les `setState` sur les marqueurs non selectionnes.

5. **Debouncing des filtres** : Quand l'utilisateur change un filtre, debouncer de 300 ms avant de lancer la requete API, pour eviter les appels multiples lors de selections rapides.

6. **Preload** : Precharger les donnees de paniers au lancement de l'app (avant meme que l'utilisateur navigue vers l'ecran carte), pour un affichage instantane.

### Comportement en cas de reseau lent

| Scenario | Comportement |
|----------|-------------|
| Pas de reseau | Afficher les donnees en cache (si disponibles) + message "Derniere mise a jour il y a X minutes" |
| Reseau lent (3G) | Afficher un skeleton/shimmer sur la liste, la carte affiche les tuiles en cache + marqueurs en cache |
| Erreur API | Retry automatique (3 tentatives, backoff exponentiel), puis message d'erreur non-bloquant |

---

## Synthese des decisions

| Question | Decision | Justification principale |
|----------|----------|------------------------|
| Q1 : Provider carte | **flutter_map + MapTiler** (Flutter), **MapLibre GL JS** (React admin) | Cout zero, performance pur Dart, pas de vendor lock-in |
| Q2 : Architecture geo | **Chargement complet cote client** | Privacy absolue, Maurice petit (< 500 paniers), payload negligeable |
| Q3 : Geocoding | **Selecteur de localite statique** (consommateur), **Pin sur carte + Mapbox Geocoding** (onboarding partenaire) | Zero cout pour le cas commun, precision quand necessaire |
| Q4 : Distance | **Haversine cote client en Dart** | Trivial, rapide, conforme privacy |
| Q5 : Marqueurs | **Widgets Flutter natifs + flutter_map_supercluster** | Controle total design system, clustering performant |
| Q6 : Performance | **Cache tuiles + clustering immutable + preload** | Fluidite sur telephones d'entree de gamme |

---

## Estimation de cout par phase

### Phase Beta (3 mois, 100 utilisateurs)

| Service | Cout/mois |
|---------|-----------|
| flutter_map | $0 (BSD) |
| MapTiler Free (tiles) | $0 |
| Mapbox Geocoding (onboarding partenaire, ~10 req/mois) | $0 (free tier) |
| MapLibre GL JS (admin web) | $0 (open-source) |
| **Total** | **$0/mois** |

### Phase Lancement (6 mois, 1 000 MAU)

| Service | Cout/mois |
|---------|-----------|
| flutter_map | $0 |
| MapTiler Free (tiles) | $0 |
| Mapbox Geocoding (onboarding partenaire, ~30 req/mois) | $0 |
| **Total** | **$0/mois** |

### Phase Croissance (an 1-2, 10 000 MAU)

| Service | Cout/mois |
|---------|-----------|
| flutter_map | $0 |
| MapTiler (tiles, plan Flex si depassement du free tier) | $0-25 |
| Mapbox Geocoding (~100 req/mois) | $0 |
| **Total** | **$0-25/mois** |

### Phase Scale (an 3+, 25 000+ MAU)

| Service | Cout/mois |
|---------|-----------|
| flutter_map | $0 |
| MapTiler (tiles, plan Flex ou Cloud) | $25-50 |
| Mapbox Geocoding | $0 |
| **Total** | **$25-50/mois** |

### Comparaison avec l'alternative Google Maps

| Phase | flutter_map + MapTiler | Google Maps |
|-------|----------------------|-------------|
| Beta (100 MAU) | $0 | $0 |
| Lancement (1 000 MAU) | $0 | $50-100 |
| Croissance (10 000 MAU) | $0-25 | $500-1 000 |
| Scale (25 000 MAU) | $25-50 | $1 500-3 000 |
| **Total sur 3 ans** | **~$1 000** | **~$30 000-50 000** |

L'economie estimee sur 3 ans est de **$29 000 a $49 000** -- significative pour une startup mauricienne.

---

## Risques et mitigations

| Risque | Probabilite | Impact | Mitigation |
|--------|------------|--------|------------|
| Couverture OSM insuffisante a Maurice (rues manquantes) | Moyen | Faible | On affiche des marqueurs sur une carte, pas de navigation GPS. Les rues principales sont bien mappees. Si necessaire, contribuer a OSM (la communaute y est active). |
| MapTiler change ses tarifs ou supprime le free tier | Faible | Moyen | flutter_map est agnostique au tile provider. Migration vers Stadia Maps (200K req gratuites/mois) ou tuiles auto-hebergees en quelques heures. |
| Performance degradee sur telephones tres bas de gamme | Faible | Moyen | Le clustering reduit le nombre de widgets. flutter_map est plus leger que les SDK natifs. Tester sur Xiaomi Redmi 9 (reference entree de gamme a Maurice). |
| Payload API trop lourde si > 1 000 paniers actifs | Tres faible | Faible | Improbable a Maurice a horizon 5 ans. Si necessaire, passer a la strategie bounding box (Option 2A) avec quelques jours de refactoring. |
| Qualite geocoding Mapbox insuffisante pour l'onboarding partenaire | Faible | Faible | Le pin sur la carte est l'option principale. Le geocoding est un fallback. En dernier recours, saisie manuelle des coordonnees. |

---

## Implementation -- plan par sprints

### Sprint 1 : Fondations carte (2 semaines)

- [ ] Integrer `flutter_map` dans le projet Flutter
- [ ] Configurer MapTiler comme tile provider (cle API, style de carte)
- [ ] Afficher une carte centree sur Port-Louis par defaut
- [ ] Integrer le package `geolocator` pour la geolocalisation device
- [ ] Implementer la permission prompt GPS (avec fallback Port-Louis)
- [ ] Creer le widget `DodoMarker` conforme au design system
- [ ] Afficher des marqueurs statiques (donnees mockees)

### Sprint 2 : Donnees et interactions (2 semaines)

- [ ] Implementer l'endpoint API `GET /api/v1/baskets/available`
- [ ] Connecter le client Flutter a l'API
- [ ] Implementer le calcul de distance Haversine
- [ ] Implementer le tri par distance en vue liste
- [ ] Ajouter le clustering (`flutter_map_supercluster`)
- [ ] Implementer l'infobulle au tap sur marqueur (bottom sheet)
- [ ] Transition carte <-> liste (memes donnees, memes filtres)

### Sprint 3 : Filtres et fallback (1.5 semaines)

- [ ] Implementer les filtres (jour, heure, type, preferences) avec requete API
- [ ] Creer le selecteur de localite (fallback GPS)
- [ ] Implementer le fichier JSON statique des localites mauriciennes
- [ ] Bouton "Recentrer sur ma position"
- [ ] Bouton "Y aller" (deep link navigation native)

### Sprint 4 : Performance et polish (1.5 semaines)

- [ ] Cache tuiles avec `flutter_cache_manager`
- [ ] `CancellableNetworkTileProvider` pour le pan rapide
- [ ] Rafraichissement periodique du stock (polling 60s)
- [ ] Skeleton/shimmer au chargement
- [ ] Etats vides (aucun panier dans la zone, aucun resultat pour les filtres)
- [ ] Tests sur telephones d'entree de gamme (Xiaomi Redmi, Samsung Galaxy A)
- [ ] Tests de performance (FPS, memoire, latence)

### Sprint Onboarding Partenaire (1 semaine, en parallele)

- [ ] Carte flutter_map dans le formulaire d'onboarding partenaire
- [ ] Tap long pour placer le pin
- [ ] Drag pour ajuster la position
- [ ] Integration Mapbox Geocoding (champ de recherche d'adresse)
- [ ] Validation et stockage des coordonnees en BDD (colonne `geography(Point, 4326)`)

---

## Annexe A : Configuration PostGIS pour les coordonnees des commerces

Meme si le filtrage geo se fait cote client, PostGIS reste utile pour :
- Stocker les coordonnees des commerces de maniere typee et indexee
- Permettre des requetes geo cote admin (dashboard : "commerces par district", exports, analytics)
- Permettre une evolution future vers le filtrage serveur (Option 2A) si necessaire

```sql
-- Extension PostGIS (deja activee dans Supabase)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Colonne geographique dans la table stores
ALTER TABLE stores ADD COLUMN location geography(Point, 4326);

-- Index spatial
CREATE INDEX idx_stores_location ON stores USING GIST(location);

-- Mise a jour lors de l'onboarding
UPDATE stores
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE id = :store_id;

-- Exemple de requete admin : commerces dans un rayon de 5 km autour d'un point
SELECT * FROM stores
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(57.5012, -20.1609), 4326)::geography,
  5000  -- metres
);
```

## Annexe B : Structure du fichier statique des localites

Fichier : `assets/data/mauritius_localities.json`

```json
{
  "version": "1.0",
  "source": "Census 2024 + OSM",
  "districts": [
    {
      "id": "port-louis",
      "name": "Port-Louis",
      "code": "1",
      "center": { "lat": -20.1609, "lng": 57.5012 }
    },
    {
      "id": "pamplemousses",
      "name": "Pamplemousses",
      "code": "2",
      "center": { "lat": -20.1039, "lng": 57.5713 }
    }
  ],
  "localities": [
    {
      "id": "port-louis-centre",
      "name": "Port-Louis",
      "name_creole": "Port-Lwi",
      "district_id": "port-louis",
      "postal_prefix": "11",
      "lat": -20.1609,
      "lng": 57.5012,
      "population": 147688
    },
    {
      "id": "beau-bassin",
      "name": "Beau Bassin-Rose Hill",
      "name_creole": "Bo Basin-Roz Hil",
      "district_id": "plaines-wilhems",
      "postal_prefix": "71",
      "lat": -20.2338,
      "lng": 57.4681,
      "population": 103872
    },
    {
      "id": "curepipe",
      "name": "Curepipe",
      "name_creole": "Kirpip",
      "district_id": "plaines-wilhems",
      "postal_prefix": "74",
      "lat": -20.3162,
      "lng": 57.5166,
      "population": 84200
    },
    {
      "id": "quatre-bornes",
      "name": "Quatre Bornes",
      "name_creole": "Kat Born",
      "district_id": "plaines-wilhems",
      "postal_prefix": "72",
      "lat": -20.2636,
      "lng": 57.4791,
      "population": 80961
    },
    {
      "id": "vacoas-phoenix",
      "name": "Vacoas-Phoenix",
      "name_creole": "Vakwa-Feniks",
      "district_id": "plaines-wilhems",
      "postal_prefix": "73",
      "lat": -20.2984,
      "lng": 57.4781,
      "population": 110000
    }
  ]
}
```

Le fichier complet contiendra les ~135 localites avec leurs coordonnees centroide. A constituer a partir des donnees du recensement mauricien et d'OpenStreetMap.

## Annexe C : Comparatif de recherches web -- sources

### Couverture OpenStreetMap a Maurice
- [WikiProject Mauritius](https://wiki.openstreetmap.org/wiki/WikiProject_Mauritius) : "The basic road network has been traced with many details still missing, and most areas have a lot of room for improvements."
- [Geofabrik Mauritius download](https://download.geofabrik.de/africa/mauritius.html) : Donnees regulierement mises a jour, derniere MAJ quotidienne.

### Pricing Google Maps Platform (post mars 2025)
- [Google Maps Platform core pricing](https://developers.google.com/maps/billing-and-pricing/pricing) : Credit $200/mois remplace par seuils gratuits par SKU. Dynamic Maps : 100K gratuits. Geocoding : 10K gratuits, puis $5/1000.
- [Google Maps Platform Subscriptions](https://developers.google.com/maps/billing-and-pricing/subscriptions) : Plan Starter $100/mois pour 50K appels.
- [Google Maps March 2025 changes](https://developers.google.com/maps/billing-and-pricing/march-2025) : Details de la transition.

### Pricing Mapbox
- [Mapbox Pricing](https://www.mapbox.com/pricing) : Mobile Maps SDK 25K MAU gratuits. Geocoding 100K req/mois gratuit. Search Box 500 sessions gratuites.
- [Mapbox Maps SDK Android pricing](https://docs.mapbox.com/android/maps/guides/pricing/) : MAU = par device/app.
- [Mapbox Search Box pricing](https://docs.mapbox.com/mapbox-search-js/guides/pricing/) : $11.50/1000 sessions au-dela du free tier.

### Packages Flutter carte
- [flutter_map](https://pub.dev/packages/flutter_map) : Pur Dart, BSD, ~120 FPS iOS, pas de tuiles fournies.
- [flutter_map_supercluster](https://github.com/rorystephenson/flutter_map_supercluster) : Clustering base sur Supercluster de Mapbox, KD-tree.
- [MapLibre Flutter](https://flutter-maplibre.pages.dev/compare/) : Comparaison avec alternatives, encore experimental.
- [google_maps_flutter performance](https://medium.com/@ali19994411/the-complete-guide-to-flutter-mapping-solutions-google-maps-vs-mapbox-vs-here-maps-62d1394c0d9c) : "Google Maps SDK causes the whole application to lag when resizing."

### Systeme d'adresses a Maurice
- [Postal codes in Mauritius (Wikipedia)](https://en.wikipedia.org/wiki/Postal_codes_in_Mauritius) : 5 chiffres, nationwide depuis 2014.
- [Mauritius Address Format (PostGrid)](https://www.postgrid.com/global-address-format/mauritius-address-format/) : Adresses informelles en zone rurale.
- [Districts of Mauritius (Wikipedia)](https://en.wikipedia.org/wiki/Districts_of_Mauritius) : 9 districts, 1 ville, 4 towns, 130 villages.
