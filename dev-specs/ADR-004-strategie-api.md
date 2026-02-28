# ADR-004 : Strategie API -- REST vs GraphQL vs tRPC vs hybride

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-001 (stack backend NestJS + Prisma + Supabase), ADR-002 (architecture monolithe modulaire), ADR-010 (authentification Supabase Auth / JWT)

---

## 1. Contexte

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. L'API backend (NestJS avec adaptateur Fastify) doit servir **trois clients aux besoins tres differents** :

| Client | Plateforme | Profil de consommation | Contraintes reseau |
|--------|-----------|------------------------|--------------------|
| **App consumer** (Flutter) | iOS / Android | Donnees legeres, pages orientees decouverte et achat. Mode offline partiel (favoris, historique). | 3G/4G variable a Maurice. Minimiser taille des payloads et nombre d'appels. Latence reseau ~50-200ms (serveur EU). |
| **App partner** (Flutter) | iOS / Android | Dashboard reservations, gestion paniers, scanner QR, analytics. Listes paginee de reservations en temps reel. | WiFi ou 4G en magasin. Payloads moderes. |
| **Admin web** (React) | Desktop / navigateur | Tableaux denses de KPIs, filtres avances, bulk operations (suspension, validation), exports CSV/PDF, audit trail. | Connexion stable haut debit. Payloads volumineux acceptables. |

### Pourquoi cette decision est critique

1. **Le versioning d'API est vital pour le mobile.** Une fois l'app Flutter publiee sur les stores, on ne peut pas forcer la mise a jour immediate. Si l'API change de facon incompatible, les anciennes versions de l'app doivent continuer a fonctionner. Le choix de la strategie API conditionne directement la facilite de versioning.

2. **L'over-fetching mobile a un cout reel.** A Maurice, la couverture 4G couvre les zones urbaines (Port-Louis, Quatre Bornes, Curepipe) mais la qualite varie. Des payloads inutilement gros augmentent la latence percue, la consommation data, et la charge batterie.

3. **L'admin web a des besoins orthogonaux.** Des tableaux de 50-100 lignes avec 15 colonnes, des filtres combines, des exports de milliers de lignes -- ce n'est pas le meme pattern que "afficher 10 paniers proches de moi".

4. **Le choix de la strategie API impacte toute la chaine** : codegen client, documentation, testing, monitoring, caching, et la capacite a onboarder de nouveaux developpeurs.

### Contraintes heritees des ADR precedentes

- **Backend** : NestJS (Fastify) + Prisma + Supabase PostgreSQL (ADR-001)
- **Architecture** : Monolithe modulaire (ADR-002)
- **Auth** : Supabase Auth, JWT access token 1h + refresh token 30j (ADR-010)
- **Clients mobile** : Flutter / Dart
- **Client admin** : React / TypeScript (capitalise sur les composants Storybook existants dans `storybook-ui/`)
- **Equipe** : 2-5 developpeurs, startup early-stage

---

## 2. Options evaluees

### Option 1 : REST classique (OpenAPI / Swagger)

**Description :** API REST standard avec des endpoints orientes ressources (`/baskets`, `/reservations`, `/stores`, etc.), documentation auto-generee via `@nestjs/swagger`, code generation pour les clients.

**Architecture type :**
```
GET    /api/v1/baskets?lat=...&lng=...&radius=5km
GET    /api/v1/baskets/:id
POST   /api/v1/reservations
GET    /api/v1/reservations/:id
DELETE /api/v1/reservations/:id
GET    /api/v1/stores/:id
GET    /api/v1/consumer/profile
GET    /api/v1/partner/dashboard
GET    /api/v1/admin/kpis
...
```

**Codegen Flutter :**
- `openapi-generator` (package Dart officiel, genere des classes type-safe depuis le spec OpenAPI)
- `swagger_parser` (alternative Dart, plus leger)
- Resultat : classes Dart generees pour chaque DTO, chaque endpoint, avec serialisation JSON

**Codegen React :**
- `orval` (genere des hooks React Query + types TypeScript depuis OpenAPI)
- `openapi-typescript` + `openapi-fetch` (types TypeScript + client fetch type-safe)
- Resultat : hooks React prets a l'emploi, zero ecriture manuelle de types

**Avantages :**
- NestJS a le meilleur support REST de l'ecosysteme : `@nestjs/swagger` genere le spec OpenAPI automatiquement depuis les decorateurs (`@ApiProperty`, `@ApiResponse`, `@ApiOperation`)
- Cacheabilite native HTTP : `GET /baskets` peut etre cache par un CDN, un reverse proxy, ou le cache navigateur. Les headers `ETag`, `Cache-Control`, `Last-Modified` fonctionnent nativement
- Le debug est trivial : `curl`, Postman, navigateur, logs HTTP standard
- Ecosysteme NestJS massif : guards, interceptors, pipes, versioning middleware, throttling -- tout est prevu pour REST
- Chaque endpoint a un contrat clair (URL + methode + body + response), facilement testable
- Documentation auto-generee interactive (Swagger UI) accessible a toute l'equipe, meme non-technique
- Versioning mature : URI versioning (`/v1/`, `/v2/`), header versioning, ou media type versioning -- tous supportes nativement par NestJS

**Inconvenients :**
- **Over-fetching** : `GET /baskets/:id` retourne tous les champs du panier, meme si le client mobile n'a besoin que du nom, du prix et de la distance. Sur une liste de 20 paniers, ca peut representer 30-50% de donnees inutiles
- **Under-fetching** : pour afficher la page d'accueil consumer, il faut potentiellement 3-4 appels (`/baskets`, `/categories`, `/favorites`, `/promotions`). Chaque appel = latence additionnelle sur un reseau mobile
- Les endpoints REST generiques ne sont pas optimises pour un ecran specifique. Un `GET /baskets` qui sert a la fois l'app consumer (10 champs) et l'admin (30 champs) est un compromis
- Le versioning d'URI (`/v1/`, `/v2/`) peut mener a une duplication de code si mal gere

---

### Option 2 : GraphQL (Apollo Server / Mercurius)

**Description :** Un seul endpoint (`POST /graphql`) qui permet au client de specifier exactement les champs voulus. Resolvers cote serveur, schema type fort.

**Architecture type :**
```graphql
# Le consumer mobile demande exactement ce dont il a besoin
query HomeScreen($lat: Float!, $lng: Float!) {
  nearbyBaskets(lat: $lat, lng: $lng, limit: 10) {
    id
    name
    price { original discounted currency }
    store { name distance pickupWindow }
    remainingStock
  }
  favoriteStores {
    id
    name
    hasAvailableBaskets
  }
}

# L'admin demande beaucoup plus de champs
query AdminDashboard {
  kpis {
    totalReservations
    revenue
    activePartners
    claimsRate
  }
  recentReservations(limit: 50) {
    id consumer { fullName email } store { name }
    status amount paymentMethod createdAt
  }
}
```

**Codegen Flutter :**
- `graphql_codegen` (package Dart, genere des classes type-safe depuis les queries `.graphql`)
- `ferry` (client GraphQL Flutter avec cache normalise et codegen)
- Resultat : chaque query/mutation a sa propre classe Dart avec exactement les champs demandes

**Codegen React :**
- `@graphql-codegen/cli` (reference, genere types + hooks pour Apollo Client, urql, ou React Query)
- Resultat : hooks React type-safe, autocompletion sur les champs du schema

**Avantages :**
- **Zero over-fetching** : le client demande exactement les champs necessaires. L'app mobile consumer ne recoit que les 5-6 champs par panier qu'elle affiche, pas les 20+ champs du modele complet. Sur 3G, cette difference est perceptible
- **Un seul appel pour un ecran complet** : la page d'accueil consumer peut etre une seule query qui retourne paniers proches + favoris + categories en un seul round-trip reseau
- **Schema type fort** : le schema GraphQL sert de contrat entre le frontend et le backend. Les breaking changes sont detectees au moment du codegen
- **Introspection** : les outils comme GraphiQL ou Apollo Studio permettent aux devs frontend d'explorer l'API sans documentation separee
- **Ideal pour les besoins divergents** : le consumer et l'admin peuvent interroger le meme schema avec des queries totalement differentes, sans que le backend ait a creer des endpoints dedies

**Inconvenients :**
- **Probleme N+1 critique** : une query `baskets { store { owner { ... } } }` peut declencher N requetes DB pour N baskets. Necessite DataLoader ou Prisma `include` optimise. C'est un piege classique qui peut degrader severement les performances si non anticipe
- **Caching HTTP impossible** : `POST /graphql` invalide le caching HTTP natif. Il faut un cache applicatif (Apollo Server cache, Redis) ou Automatic Persisted Queries (APQ). Plus complexe a operer qu'un simple header `Cache-Control`
- **Rate limiting complexe** : dans une API REST, on rate-limite par endpoint. En GraphQL, une seule query peut demander l'equivalent de 50 endpoints REST. Il faut une analyse de complexite de query (query cost analysis)
- **Upload de fichiers** : GraphQL n'a pas de spec standard pour l'upload. Il faut soit un endpoint REST parallele, soit la spec `graphql-multipart-request` (non officielle)
- **Complexite serveur** : resolvers, DataLoaders, directives, middleware de query analysis -- c'est une couche d'abstraction supplementaire au-dessus de NestJS. Le module `@nestjs/graphql` existe mais ajoute de la complexite
- **Courbe d'apprentissage** : l'equipe doit maitriser SDL, resolvers, mutations, subscriptions, DataLoader, fragment management. C'est un paradigme different de REST
- **Monitoring et debugging** : un `POST /graphql` dans les logs ne dit pas ce que le client a demande. Il faut du logging custom pour tracer les operations. Les outils APM (Sentry, Datadog) sont moins matures pour GraphQL que pour REST
- **Securite** : il faut bloquer les queries d'introspection en production, limiter la profondeur de query (max depth), et limiter la complexite. Sinon, un attaquant peut crafted une query qui fait exploser le serveur

---

### Option 3 : tRPC

**Description :** Framework TypeScript qui partage les types entre le serveur et le client sans generation de code. Appels RPC type-safe end-to-end. Le client appelle des procedures serveur comme des fonctions locales.

**Architecture type :**
```typescript
// Serveur (NestJS + tRPC)
const appRouter = router({
  baskets: router({
    list: publicProcedure
      .input(z.object({ lat: z.number(), lng: z.number() }))
      .query(({ input }) => basketService.findNearby(input)),
    getById: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(({ input }) => basketService.findById(input.id)),
  }),
  reservations: router({
    create: protectedProcedure
      .input(createReservationSchema)
      .mutation(({ input, ctx }) => reservationService.create(input, ctx.user)),
  }),
});

// Client React -- zero codegen, types inferees automatiquement
const { data } = trpc.baskets.list.useQuery({ lat: -20.16, lng: 57.50 });
// data est type-safe automatiquement, autocompletion complete
```

**Codegen Flutter :**
- **Aucun SDK Dart/Flutter officiel.** tRPC est fondamentalement lie a TypeScript (inference de types compile-time). Un client Dart devrait :
  - Soit appeler les endpoints HTTP sous-jacents de tRPC manuellement (perd tout l'interet)
  - Soit utiliser un pont JSON-RPC custom (fragile, non maintenu)
  - Soit generer un client Dart depuis un schema intermediaire (bricole)

**Codegen React :**
- Aucune generation de code necessaire : les types sont inferes du routeur serveur via TypeScript. C'est le point fort principal de tRPC
- Integration native avec React Query (`@trpc/react-query`)
- DX exceptionnelle : autocompletion, validation runtime via Zod, refactoring serveur = erreurs compile-time cote client

**Avantages :**
- **DX TypeScript inegalee** : le refactoring d'un endpoint serveur casse immediatement le client React en compile-time. Zero risque de desynchronisation
- **Zero boilerplate** : pas de spec OpenAPI, pas de codegen, pas de schemas a synchroniser. Le routeur serveur EST le contrat
- **Validation runtime integree** via Zod (schemas d'input valides a la fois au compile-time et au runtime)
- **Performance** : les appels tRPC sont de simples requetes HTTP (GET pour les queries, POST pour les mutations), cacheable via HTTP

**Inconvenients :**
- **Incompatible avec Flutter/Dart.** C'est le point eliminatoire. tRPC repose sur l'inference de types TypeScript, qui n'existe pas en Dart. Sans client Flutter viable, tRPC ne peut pas servir 2 des 3 clients de BienBon
- **Ecosysteme NestJS** : l'integration `trpc-nestjs-adapter` existe mais reste communautaire, moins mature que `@nestjs/swagger`
- **Documentation API** : pas de spec standard explorable (pas d'equivalent Swagger UI). Les developpeurs non-TypeScript ne peuvent pas explorer l'API facilement
- **Lock-in TypeScript** : si un jour BienBon ajoute un client non-TypeScript (SDK partenaire, webhook, API publique), tRPC ne peut pas le servir

---

### Option 4 : Hybride -- REST (Flutter) + tRPC (admin React)

**Description :** L'API backend expose deux couches : une API REST classique avec OpenAPI pour les apps Flutter, et un routeur tRPC pour l'admin React. Les deux partagent la meme couche service NestJS.

**Architecture type :**
```
NestJS Backend
├── src/modules/
│   ├── baskets/
│   │   ├── baskets.service.ts          # Logique metier partagee
│   │   ├── baskets.controller.ts       # REST endpoints (Flutter)
│   │   └── baskets.trpc-router.ts      # tRPC procedures (React admin)
│   ├── reservations/
│   │   ├── reservations.service.ts
│   │   ├── reservations.controller.ts
│   │   └── reservations.trpc-router.ts
│   └── ...
├── /api/v1/*             → REST (OpenAPI, pour Flutter)
└── /trpc/*               → tRPC (pour React admin)
```

**Avantages :**
- L'admin React beneficie de la DX tRPC (type-safety end-to-end sans codegen)
- Les apps Flutter ont une API REST standard, documentee, avec codegen Dart
- La logique metier est dans les services NestJS, partagee entre les deux couches
- L'admin peut evoluer rapidement (iteration rapide sur les filtres, KPIs, bulk operations)

**Inconvenients :**
- **Double couche API a maintenir** : chaque fonctionnalite doit potentiellement avoir un controller REST ET un routeur tRPC. Meme si la logique metier est partagee, les DTOs, la validation, et les tests sont dupliques
- **Deux modeles d'authentification a gerer** : le JWT Supabase doit etre valide dans les deux couches (REST guard + tRPC middleware). Faisable mais une source de bugs potentielle
- **Onboarding complexifie** : un nouveau dev doit comprendre deux paradigmes API et savoir dans quel cas utiliser lequel
- **Testing** : il faut tester les deux couches, pas seulement les services
- **La valeur ajoutee de tRPC est reduite** : si on a deja un spec OpenAPI + codegen TypeScript (via orval ou openapi-typescript), la DX React est deja tres bonne. Le gain marginal de tRPC ne justifie peut-etre pas la complexite

---

### Option 5 : REST avec view endpoints optimises (pattern BFF)

**Description :** API REST classique (OpenAPI), mais avec des endpoints supplementaires optimises pour chaque ecran client. Ces endpoints agreent les donnees et retournent exactement ce que l'ecran affiche, en un seul appel.

**Architecture type :**
```
# Endpoints ressources classiques (CRUD, usage general)
GET    /api/v1/baskets/:id
POST   /api/v1/reservations
GET    /api/v1/stores/:id
...

# View endpoints optimises pour le consumer mobile
GET    /api/v1/consumer/home
       → { nearbyBaskets[], favoriteStores[], categories[], promotions[] }

GET    /api/v1/consumer/basket/:id/details
       → { basket, store, pickupWindow, reviews, similarBaskets[] }

GET    /api/v1/consumer/my-reservations
       → { upcoming[], past[], stats }

# View endpoints optimises pour le partner
GET    /api/v1/partner/dashboard
       → { todayReservations[], pendingPickups, stats, alerts[] }

GET    /api/v1/partner/baskets/active
       → { baskets[] avec stock, reservations en cours, performance }

# View endpoints optimises pour l'admin
GET    /api/v1/admin/dashboard
       → { kpis, recentActivity[], alerts[] }

GET    /api/v1/admin/reservations?status=...&from=...&to=...&store=...
       → { items[], pagination, aggregates }

POST   /api/v1/admin/partners/bulk-action
       → { action: "suspend", ids: [...] }
```

**Implementation NestJS :**
```typescript
// consumer-views.controller.ts
@Controller('consumer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('consumer')
@ApiTags('Consumer Views')
export class ConsumerViewsController {
  constructor(
    private readonly basketsService: BasketsService,
    private readonly favoritesService: FavoritesService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Get('home')
  @ApiOperation({ summary: 'Page d accueil consumer - toutes les donnees en un appel' })
  @ApiResponse({ status: 200, type: ConsumerHomeDto })
  async getHome(@CurrentUser() user: User, @Query() query: HomeQueryDto) {
    const [baskets, favorites, categories] = await Promise.all([
      this.basketsService.findNearby(query.lat, query.lng, query.radius),
      this.favoritesService.getForUser(user.id),
      this.categoriesService.getActive(),
    ]);
    return { baskets, favorites, categories };
  }
}
```

**Codegen Flutter :**
- Identique a l'Option 1 : `openapi-generator` ou `swagger_parser` genere les classes Dart depuis le spec OpenAPI
- Les view endpoints ont leurs propres DTOs dedies (`ConsumerHomeDto`, `PartnerDashboardDto`) avec exactement les champs necessaires
- Resultat : le client Flutter appelle `api.consumer.getHome()` et recoit un objet type-safe avec tout le necessaire

**Codegen React :**
- Identique a l'Option 1 : `orval` ou `openapi-typescript` genere les hooks React
- Les endpoints admin ont des DTOs riches avec tous les champs de filtrage et les schemas de reponse complets
- Resultat : `useAdminReservations({ status: 'pending', from: '2026-01-01' })` retourne des donnees type-safe

**Avantages :**
- **Un seul paradigme API** (REST) pour toute l'equipe, tous les clients, toute la documentation
- **Payloads optimises** : les view endpoints retournent exactement les donnees necessaires pour un ecran, ni plus ni moins. Le `/consumer/home` remplace 3-4 appels REST generiques par un seul
- **Cacheabilite preservee** : les view endpoints sont des `GET` HTTP classiques, cacheable via `Cache-Control`, `ETag`, CDN. `/consumer/home` peut etre cache 30s cote serveur
- **Performance serveur** : les view endpoints utilisent `Promise.all()` pour paralleliser les requetes DB, retournant une reponse aggregee plus vite que N appels sequentiels du client
- **Simplicite operationnelle** : un seul spec OpenAPI, une seule documentation Swagger, un seul pipeline de codegen, un seul modele de monitoring
- **Endpoints CRUD toujours disponibles** : les view endpoints coexistent avec des endpoints ressources classiques. Si un nouveau client a besoin d'un acces generique, il est deja la
- **Versioning simple** : les view endpoints peuvent etre versiones independamment (`/v1/consumer/home`, `/v2/consumer/home`) sans toucher aux endpoints CRUD
- **Testabilite** : chaque view endpoint est un controller NestJS standard, testable avec les outils habituels
- **Le pattern BFF est eprouve** : Netflix, Spotify, Airbnb utilisent ce pattern pour optimiser les appels mobile. Ce n'est pas une invention, c'est un standard de l'industrie

**Inconvenients :**
- **Plus d'endpoints a maintenir** : en plus des endpoints CRUD, il faut creer et maintenir les view endpoints. Chaque ecran mobile peut justifier un endpoint dedie
- **Risque de duplication de logique** : si le `/consumer/home` et le `GET /baskets` retournent des paniers, la logique de mapping/filtrage peut etre dupliquee. Mitigation : la logique reste dans les services, les controllers ne font qu'orchestrer
- **Les view endpoints doivent evoluer avec le design** : si le design de l'ecran d'accueil change (ajout d'un bloc "partenaires recommandes"), il faut modifier le view endpoint. Mitigation : c'est du code serveur, deployable en quelques minutes, contrairement a une mise a jour mobile
- **Pas aussi flexible que GraphQL** : si le client veut un sous-ensemble de champs d'un view endpoint, il recoit quand meme tout le DTO. Mitigation : les view endpoints sont deja tailles pour l'ecran, l'over-fetching residuel est minimal (quelques octets)

---

### Option 6 : Supabase client direct (PostgREST + RLS) + Edge Functions

**Description :** Les apps Flutter appellent directement Supabase via le SDK `supabase_flutter`. PostgREST auto-genere des endpoints REST depuis le schema PostgreSQL. Row Level Security (RLS) gere les autorisations au niveau SQL. La logique metier complexe passe par des Edge Functions (Deno/TypeScript).

**Architecture type :**
```
App Flutter Consumer
  │
  ├── supabase_flutter SDK
  │     ├── .from('baskets').select('id, name, price').gte('remaining', 1)
  │     ├── .rpc('find_nearby_baskets', { lat: ..., lng: ..., radius: ... })
  │     └── .realtime.channel('baskets').on('postgres_changes', ...)
  │
  └── Edge Functions (HTTP)
        ├── /functions/v1/create-reservation    (reserve + pre-auth paiement)
        ├── /functions/v1/process-pickup        (validation QR + capture paiement)
        └── /functions/v1/admin-bulk-action     (operations admin complexes)
```

**Avantages :**
- **Time-to-market imbattable** : pas de backend a ecrire pour le CRUD. Les tables PostgreSQL sont immediatement accessibles via le SDK Flutter
- **Realtime natif** : Supabase Realtime broadcast les changements de table sans code serveur. Le stock des paniers est synchronise en temps reel "gratuitement"
- **Moins de code a maintenir** : pas de controllers, pas de DTOs, pas de mapping. Le schema DB EST l'API
- **Cout minimal** : pas de serveur NestJS a heberger. Tout tourne sur Supabase (25 $/mois plan Pro)

**Inconvenients :**
- **Couplage DB-API total** : le schema PostgreSQL est directement expose aux clients. Un renommage de colonne casse l'app mobile en production. C'est le contraire du decouplage recommande pour une app avec des clients mobiles non mis a jour
- **RLS complexe a securiser** : chaque table, chaque operation (SELECT, INSERT, UPDATE, DELETE), chaque role (consumer, partner, admin) necessite une policy RLS. La surface d'erreur est immense. Un oubli de policy = fuite de donnees
- **Pas de couche metier structuree** : les regles metier (commission, pre-autorisation, anti-fraude, recurrence paniers) ne peuvent pas vivre dans des policies RLS. Elles doivent aller dans des Edge Functions, qui ont des limitations severes :
  - 60s de timeout (150ms CPU time sur le free tier)
  - Cold start de 200-500ms
  - Runtime Deno uniquement (pas tout npm)
  - Pas de connexion persistante DB (nouveau pool a chaque invocation)
  - Debugging et testing limites
- **Versioning quasi impossible** : PostgREST genere l'API depuis le schema. Si le schema change, l'API change. Pas de version `/v1/` ou `/v2/`. Les anciennes apps mobiles cassent
- **Pas de documentation OpenAPI custom** : PostgREST genere un spec OpenAPI automatique, mais il reflete les tables brutes, pas des DTOs metier propres
- **Pas de codegen metier** : le codegen Flutter genere des types qui correspondent aux tables PostgreSQL, pas a des objets metier (ex: `BasketWithStoreAndDistance`, `ReservationWithPaymentStatus`)
- **Vendor lock-in maximal** : toute la logique client est couplee a l'API Supabase. Migrer vers un autre backend = reecrire tous les clients
- **Incompatible avec le choix ADR-001** : l'ADR-001 a explicitement choisi NestJS comme backend custom, avec Supabase comme DB managee. L'option 6 court-circuite ce choix

---

## 3. Analyse approfondie des criteres

### 3.1 Compatibilite Flutter (SDK, codegen, DX)

| Option | Qualite du codegen Dart | Commentaire |
|--------|:-----------------------:|-------------|
| REST + OpenAPI | ★★★★☆ | `openapi-generator` Dart est mature. Les DTOs generes sont propres. Quelques edge cases (enums, nullable) necessitent parfois des ajustements manuels. |
| GraphQL | ★★★☆☆ | `graphql_codegen` Dart fonctionne mais l'ecosysteme est moins riche que cote TypeScript. `ferry` est une alternative viable mais avec une communaute plus petite. Le cache normalise d'Apollo n'a pas d'equivalent Dart aussi mature. |
| tRPC | ★☆☆☆☆ | Pas de client Dart. Inutilisable pour Flutter. |
| REST + tRPC hybride | ★★★★☆ (REST part) | La partie Flutter utilise REST, donc equivalent a l'option 1. |
| REST + view endpoints | ★★★★★ | Identique a REST + les DTOs des view endpoints sont plus propres car tailles pour l'ecran. Le codegen genere des types comme `ConsumerHomeResponse` qui sont directement utilisables. |
| Supabase direct | ★★★☆☆ | `supabase_flutter` est bon pour le CRUD simple. Mais les types generes sont des reflets des tables, pas des objets metier. Pour les RPC functions, les types doivent etre ecrits manuellement. |

### 3.2 Compatibilite React (SDK, codegen, DX)

| Option | Qualite du codegen TS | Commentaire |
|--------|:---------------------:|-------------|
| REST + OpenAPI | ★★★★★ | `orval` genere des hooks React Query prets a l'emploi. `openapi-typescript` + `openapi-fetch` est l'alternative zero-dependency. Type-safety complete. |
| GraphQL | ★★★★★ | `graphql-codegen` est excellent. Apollo Client ou urql offrent du cache normalise. Mais l'overhead de gestion du cache peut etre complexe. |
| tRPC | ★★★★★ | DX inegalee pour TypeScript. Mais inutilisable pour les clients Flutter. |
| REST + tRPC hybride | ★★★★★ (tRPC part) | L'admin React a la DX tRPC. Tres bon... si la complexite vaut le gain. |
| REST + view endpoints | ★★★★★ | Identique a REST classique. Les view endpoints admin ont des DTOs riches avec les schemas de filtrage bien definis. |
| Supabase direct | ★★★★☆ | `supabase-js` est bon. Mais le couplage au schema DB est le meme probleme qu'en Flutter. |

### 3.3 Performance mobile (payloads, round-trips, cache)

| Option | Score | Justification |
|--------|:-----:|---------------|
| REST classique | 3/5 | Over-fetching sur les listes. Multiple round-trips pour un ecran. Cache HTTP natif. |
| GraphQL | 5/5 | Zero over-fetching. Un seul round-trip par ecran. Mais pas de cache HTTP natif. |
| tRPC | N/A | Pas de client Flutter. |
| REST + tRPC hybride | 3/5 | Partie Flutter = REST classique, memes limitations. |
| **REST + view endpoints** | **4.5/5** | Payloads tailles par ecran (quasi-zero over-fetching). Un seul round-trip pour les ecrans principaux. Cache HTTP natif sur les view endpoints. Le demi-point manquant vs GraphQL : un view endpoint retourne un DTO fixe, pas configurable au champ pres. En pratique, la difference est negligeable (quelques octets). |
| Supabase direct | 4/5 | `select('id, name, price')` permet de choisir les colonnes. Mais les jointures complexes necessitent des RPC functions, et le cache est a gerer cote client. |

### 3.4 Complexite d'implementation pour une petite equipe

| Option | Score | Justification |
|--------|:-----:|---------------|
| REST classique | 4/5 | L'equipe connait REST. NestJS + Swagger = setup en 30 minutes. Decorateurs intuitifs. |
| GraphQL | 2/5 | Nouveau paradigme. DataLoaders, resolvers, query cost analysis, N+1 prevention. Meme avec `@nestjs/graphql`, la courbe d'apprentissage est significative. |
| tRPC | 1/5 | Inutilisable pour Flutter = eliminatoire. |
| REST + tRPC hybride | 2.5/5 | Double paradigme a maitriser, double couche a tester, double documentation. |
| **REST + view endpoints** | **4.5/5** | Meme paradigme que REST, juste des endpoints supplementaires. Les view controllers utilisent les services existants. Aucun nouveau concept a apprendre. |
| Supabase direct | 3/5 | Tres rapide au debut, mais les RLS policies, les Edge Functions Deno, et le debugging de queries PostgREST complexes ajoutent de la friction. |

### 3.5 Type-safety end-to-end

| Option | Score | Chaine de types |
|--------|:-----:|-----------------|
| REST + OpenAPI | 4/5 | Prisma schema → TS types → NestJS DTOs → OpenAPI spec → codegen Dart/TS. Une rupture possible au niveau du mapping Prisma → DTO (risque de desynchronisation manuelle). |
| GraphQL | 4.5/5 | Prisma schema → resolvers → SDL schema → codegen Dart/TS. Le schema GraphQL est la source de verite. Mais le mapping Prisma → resolver reste manuel. |
| tRPC | 5/5 | Prisma schema → TS types → tRPC router → client React. Zero generation, zero rupture. Mais inutilisable pour Flutter. |
| REST + tRPC hybride | 4.5/5 | tRPC pour React (5/5) + REST pour Flutter (4/5). Moyenne elevee mais complexite double. |
| REST + view endpoints | 4/5 | Identique a REST classique. Les DTOs des view endpoints sont des classes TypeScript qui referent les types Prisma. Avec `class-validator` et `class-transformer`, la validation runtime est assuree. |
| Supabase direct | 3/5 | Les types generes refletent les tables, pas les objets metier. Les RPC functions n'ont pas de types auto-generes cote Dart. |

### 3.6 Documentation API auto-generee

| Option | Score | Outil |
|--------|:-----:|-------|
| **REST + OpenAPI** | **5/5** | Swagger UI auto-genere, interactif, testable depuis le navigateur. Le spec OpenAPI peut etre exporte pour Postman, Insomnia, etc. |
| GraphQL | 4/5 | GraphiQL, Apollo Studio, Voyager. Introspection du schema. Mais pas de "documentation" au sens classique -- plutot un explorateur. |
| tRPC | 2/5 | Pas de documentation standard. Explorable uniquement via TypeScript. |
| REST + tRPC hybride | 4/5 | Swagger pour REST, pas de doc pour tRPC. Split. |
| **REST + view endpoints** | **5/5** | Identique a REST. Les view endpoints apparaissent dans Swagger avec leurs DTOs dedies. |
| Supabase direct | 3/5 | PostgREST genere un spec OpenAPI automatique, mais il reflete les tables brutes. |

### 3.7 Versioning API (critique pour le mobile)

C'est le critere le plus important pour un projet avec des clients mobiles. L'app Flutter v1.0 installee sur le telephone d'un consommateur a Maurice ne sera pas mise a jour immediatement quand l'API change.

| Option | Score | Strategie de versioning |
|--------|:-----:|-------------------------|
| **REST + OpenAPI** | **5/5** | **URI versioning** (`/api/v1/`, `/api/v2/`), supporte nativement par NestJS (`@Version('1')`). Ancien et nouveau endpoint coexistent. Deprecation progressive. Approche la plus eprouvee pour le mobile. |
| GraphQL | 3/5 | Officiellement, GraphQL ne supporte pas le versioning. La politique est "evolution additive" (ajouter des champs, deprecier les anciens avec `@deprecated`). En pratique, si un champ doit etre supprime ou son type change, c'est un breaking change que le schema GraphQL ne sait pas gerer elegamment. Les Persisted Queries par version sont une mitigation mais ajoutent de la complexite. |
| tRPC | N/A | Inutilisable pour Flutter. |
| REST + tRPC hybride | 4/5 | REST versionne pour Flutter. tRPC evolue librement pour l'admin (app web, mise a jour instantanee). |
| **REST + view endpoints** | **5/5** | Les view endpoints sont versionnables independamment : `/v1/consumer/home` peut coexister avec `/v2/consumer/home`. Les anciens endpoints sont maintenus tant que d'anciennes versions de l'app sont actives. |
| Supabase direct | 1/5 | PostgREST genere l'API depuis le schema DB. Pas de versioning. Un changement de schema = breaking change pour tous les clients. C'est le pire scenario pour une app mobile. |

**Detail sur le versioning NestJS :**

NestJS supporte 4 strategies de versioning nativement :

```typescript
// main.ts
app.enableVersioning({
  type: VersioningType.URI,        // /v1/baskets, /v2/baskets
  // type: VersioningType.HEADER,  // X-API-Version: 1
  // type: VersioningType.MEDIA_TYPE, // Accept: application/vnd.bienbon.v1+json
  // type: VersioningType.CUSTOM,
  defaultVersion: '1',
});

// baskets.controller.ts
@Controller('baskets')
export class BasketsController {
  @Get()
  @Version('1')
  findAllV1() { /* ancien format */ }

  @Get()
  @Version('2')
  findAllV2() { /* nouveau format */ }
}
```

**Recommandation versioning** : URI versioning (`/api/v1/`) car :
- Visible dans l'URL, facile a debugger et monitorer
- Le codegen Flutter genere des clients differents par version
- Compatible avec le cache HTTP (deux URLs differentes = deux caches)
- Simple a comprendre pour toute l'equipe

**Politique de deprecation recommandee :**
- Supporter au minimum N-1 (la version precedente) pendant 6 mois apres la sortie de N
- Monitorer l'usage par version (header `X-App-Version` envoye par le client Flutter)
- Envoyer une notification in-app "Veuillez mettre a jour BienBon" quand une version arrive en fin de vie
- Forcer la mise a jour (bloquer l'acces API) uniquement en dernier recours et pour des raisons de securite

### 3.8 Testabilite

| Option | Score | Justification |
|--------|:-----:|---------------|
| REST + OpenAPI | 5/5 | Chaque endpoint est testable independamment avec `supertest` ou le module de test NestJS. Les DTOs sont valides via `class-validator`. Le spec OpenAPI peut etre valide par `openapi-lint`. |
| GraphQL | 3.5/5 | Les resolvers sont testables individuellement, mais tester une query complete necessite un serveur GraphQL de test. Les tests d'integration sont plus complexes (schema + resolvers + DataLoaders). |
| tRPC | N/A | Inutilisable. |
| REST + tRPC hybride | 4/5 | Les deux couches necessitent leurs propres tests, augmentant le volume. |
| REST + view endpoints | 5/5 | Identique a REST. Les view endpoints sont des controllers NestJS standards. |
| Supabase direct | 3/5 | Les RLS policies sont testables via `pgTAP` ou des tests d'integration SQL. Les Edge Functions sont testables localement via Supabase CLI, mais le debugging est plus difficile. |

### 3.9 Ecosysteme NestJS (support natif, plugins)

| Option | Score | Justification |
|--------|:-----:|---------------|
| **REST + OpenAPI** | **5/5** | `@nestjs/swagger` est un module officiel de premiere classe. Decorateurs `@Api*`, generation automatique, validation, versioning -- tout est natif. C'est LE cas d'usage principal de NestJS. |
| GraphQL | 4/5 | `@nestjs/graphql` est un module officiel. Support Apollo et Mercurius. Mais c'est une couche supplementaire avec ses propres patterns (resolvers, field resolvers, complexity plugins). |
| tRPC | 2/5 | `trpc-nestjs-adapter` est communautaire. Integration fonctionnelle mais pas de support officiel. |
| REST + tRPC hybride | 3.5/5 | Support natif REST + communautaire tRPC. |
| **REST + view endpoints** | **5/5** | Les view endpoints sont de simples controllers NestJS. Aucun module supplementaire necessaire. |
| Supabase direct | 1/5 | NestJS n'est pas utilise. Incompatible avec le choix ADR-001. |

---

## 4. Authentification JWT Supabase dans chaque approche

Le JWT Supabase Auth (ADR-010) doit etre valide dans toutes les requetes authentifiees. Voici comment chaque approche le gere :

### REST (Options 1, 4 REST part, 5)

```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    const { data: { user }, error } = await this.supabaseService
      .getClient()
      .auth.getUser(token);
    if (error || !user) throw new UnauthorizedException();
    // Verifier le statut du compte (suspension/bannissement)
    request.user = user;
    return true;
  }
}

// Usage sur un controller
@Controller('consumer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('consumer')
export class ConsumerController { ... }
```

Standard, eprouve, un seul guard reutilisable sur tous les controllers.

### GraphQL (Option 2)

```typescript
// graphql-auth.guard.ts
@Injectable()
export class GqlAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    // Meme logique que REST mais extraction du context GQL
    const token = this.extractToken(req);
    // ... validation identique
  }
}
```

Faisable mais necessite `GqlExecutionContext` au lieu de `ExecutionContext` HTTP. Une subtilite supplementaire.

### tRPC (Option 3, 4 tRPC part)

```typescript
// trpc context
const createContext = async ({ req }: CreateExpressContextOptions) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { data: { user } } = await supabase.auth.getUser(token);
  return { user };
};

const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { user: ctx.user } });
});
```

Faisable mais c'est un troisieme modele d'auth middleware a maintenir en plus des guards NestJS.

### Supabase direct (Option 6)

```dart
// Flutter -- le JWT est automatiquement envoye par le SDK
final response = await supabase.from('baskets').select('*');
// Le RLS verifie auth.uid() au niveau PostgreSQL
```

Transparent pour le developpeur, mais la securite depend entierement de la configuration RLS. Pas de couche de validation applicative intermediaire.

**Conclusion auth** : les approches REST (options 1, 4, 5) utilisent le meme guard NestJS standard. C'est la plus simple et la plus maintenable.

---

## 5. Pagination : cursor-based vs offset

Le choix de la pagination impacte les performances et l'UX, en particulier pour les listes de paniers (consumer), les reservations (partner), et les tableaux admin.

### Offset-based (`?page=2&limit=20`)

```sql
SELECT * FROM baskets WHERE ... ORDER BY created_at DESC LIMIT 20 OFFSET 40;
```

**Avantages :** Simple, supporte "aller a la page 5", compatible avec tous les frameworks de tableau (TanStack Table, AG Grid).
**Inconvenients :** Performance degradee sur les grandes tables (`OFFSET 10000` = scanner 10000 lignes). Resultats instables si des lignes sont inserees/supprimees entre deux pages (doublons ou trous).

### Cursor-based (`?cursor=abc123&limit=20`)

```sql
SELECT * FROM baskets
WHERE created_at < '2026-02-27T10:00:00Z'  -- cursor = dernier element vu
ORDER BY created_at DESC
LIMIT 20;
```

**Avantages :** Performance constante (pas de `OFFSET`). Resultats stables meme si des lignes sont ajoutees. Ideal pour l'infinite scroll mobile.
**Inconvenients :** Pas de "aller a la page 5". Plus complexe a implementer.

### Recommandation : les deux, selon le contexte

| Client | Pattern | Pagination | Justification |
|--------|---------|------------|---------------|
| **Consumer mobile** | Infinite scroll | **Cursor-based** | L'utilisateur scrolle la liste de paniers. Performance constante. Pas besoin de pages numerotees. |
| **Partner mobile** | Infinite scroll / pull-to-refresh | **Cursor-based** | Listes de reservations, meme logique. |
| **Admin web** | Tableau pagine | **Offset-based** | L'admin a besoin de "page 1, 2, 3... 50". TanStack Table fonctionne naturellement avec offset. Les volumes admin sont moderes (milliers de lignes, pas millions). |
| **Admin web exports** | Export complet | **Streaming** | Pour les exports CSV/PDF, utiliser un cursor server-side qui streame toutes les lignes sans tout charger en memoire. |

**Implementation NestJS :**

```typescript
// pagination.dto.ts
export class CursorPaginationDto {
  @IsOptional() @IsString()
  cursor?: string;

  @IsOptional() @IsInt() @Min(1) @Max(50)
  limit?: number = 20;
}

export class OffsetPaginationDto {
  @IsOptional() @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}

// Reponse cursor-based
export class CursorPaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Reponse offset-based
export class OffsetPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}
```

---

## 6. Faut-il un BFF (Backend For Frontend) ou une API unifiee ?

### Option A : API unifiee avec view endpoints (recommandee)

Un seul backend NestJS expose une API REST avec :
- Des endpoints ressources generiques (`/api/v1/baskets`, `/api/v1/reservations`)
- Des view endpoints par profil client (`/api/v1/consumer/home`, `/api/v1/partner/dashboard`, `/api/v1/admin/kpis`)

```
Flutter Consumer ──┐
                   ├──→ API NestJS (monolithe modulaire)
Flutter Partner  ──┤         ├── endpoints CRUD
                   │         ├── consumer view endpoints
React Admin ───────┘         ├── partner view endpoints
                             └── admin view endpoints
```

**Pourquoi :** un seul deploiement, un seul code source, une seule DB connection pool, un seul pipeline CI/CD. Les view endpoints sont des controllers NestJS dans des modules dedies (`consumer-views`, `partner-views`, `admin-views`). La logique metier reste dans les services partages.

### Option B : BFF separes (un par client)

Trois services BFF devant une API core :

```
Flutter Consumer ──→ BFF Consumer (Node.js leger) ──┐
                                                     ├──→ API Core NestJS
Flutter Partner  ──→ BFF Partner (Node.js leger)  ──┤
                                                     │
React Admin ───────→ BFF Admin (Node.js leger)  ────┘
```

**Pourquoi pas :** pour une equipe de 2-5 devs, maintenir 4 services (3 BFF + 1 core) est un overhead disproportionne. Le pattern BFF separe se justifie quand :
- Les equipes frontend et backend sont distinctes et de grande taille
- Les BFF doivent etre deployes et scales independamment
- Les clients ont des exigences de performance radicalement differentes

Aucune de ces conditions n'est remplie pour BienBon a ce stade.

### Verdict

**API unifiee avec view endpoints (Option A)**. Si dans 2-3 ans l'equipe grandit a 10+ devs et que les besoins divergent significativement, les modules de view endpoints peuvent etre extraits en BFF separes -- les services sous-jacents ne changent pas.

---

## 7. Matrice de decision

### 7.1 Criteres et poids

| Critere | Poids | Justification |
|---------|:-----:|---------------|
| **Versioning API (mobile)** | 20% | Critique. L'app Flutter est deployee sur les stores, pas de mise a jour forcee. Un breaking change non gere = app cassee en production. |
| **Compatibilite Flutter** | 15% | 2 des 3 clients sont Flutter. Le codegen et le SDK doivent etre fiables. |
| **Compatibilite React** | 10% | 1 client admin. Important mais secondaire (app web, mise a jour instantanee). |
| **Performance mobile** | 15% | 3G/4G a Maurice. Taille des payloads et nombre d'appels impactent directement l'UX. |
| **Complexite d'implementation** | 15% | Equipe de 2-5 devs. Chaque heure passee sur l'infra API est une heure en moins sur les features. |
| **Type-safety end-to-end** | 5% | Important pour la qualite du code, mais pas un differenciateur critique entre les options viables. |
| **Documentation API** | 5% | Facilite l'onboarding de nouveaux devs et le debugging. |
| **Testabilite** | 5% | Toutes les options viables sont testables. Differenciateur faible. |
| **Ecosysteme NestJS** | 5% | Coherence avec le choix de framework (ADR-001). |
| **Cacheabilite HTTP** | 5% | Reduction de charge serveur et amelioration des temps de reponse mobile. |

### 7.2 Notation (sur 5)

| Critere (poids) | REST classique | GraphQL | tRPC | REST+tRPC hybride | **REST + view endpoints** | Supabase direct |
|------------------|:-:|:-:|:-:|:-:|:-:|:-:|
| Versioning mobile (20%) | 5 | 3 | N/A | 4 | **5** | 1 |
| Compat. Flutter (15%) | 4 | 3 | 1 | 4 | **5** | 3 |
| Compat. React (10%) | 5 | 5 | 5 | 5 | **5** | 4 |
| Perf. mobile (15%) | 3 | 5 | N/A | 3 | **4.5** | 4 |
| Complexite impl. (15%) | 4 | 2 | 1 | 2.5 | **4.5** | 3 |
| Type-safety (5%) | 4 | 4.5 | 5 | 4.5 | **4** | 3 |
| Documentation (5%) | 5 | 4 | 2 | 4 | **5** | 3 |
| Testabilite (5%) | 5 | 3.5 | N/A | 4 | **5** | 3 |
| Ecosysteme NestJS (5%) | 5 | 4 | 2 | 3.5 | **5** | 1 |
| Cacheabilite HTTP (5%) | 5 | 2 | 4 | 4.5 | **5** | 3 |

*Note : tRPC recoit "N/A" (traite comme 0) pour les criteres ou l'incompatibilite Flutter le rend non viable.*

### 7.3 Scores ponderes

| Option | Calcul | **Score** |
|--------|--------|:---------:|
| **REST + view endpoints (BFF)** | (5x0.20)+(5x0.15)+(5x0.10)+(4.5x0.15)+(4.5x0.15)+(4x0.05)+(5x0.05)+(5x0.05)+(5x0.05)+(5x0.05) | **4.80** |
| REST classique (OpenAPI) | (5x0.20)+(4x0.15)+(5x0.10)+(3x0.15)+(4x0.15)+(4x0.05)+(5x0.05)+(5x0.05)+(5x0.05)+(5x0.05) | **4.10** |
| GraphQL | (3x0.20)+(3x0.15)+(5x0.10)+(5x0.15)+(2x0.15)+(4.5x0.05)+(4x0.05)+(3.5x0.05)+(4x0.05)+(2x0.05) | **3.50** |
| REST + tRPC hybride | (4x0.20)+(4x0.15)+(5x0.10)+(3x0.15)+(2.5x0.15)+(4.5x0.05)+(4x0.05)+(4x0.05)+(3.5x0.05)+(4.5x0.05) | **3.53** |
| Supabase direct | (1x0.20)+(3x0.15)+(4x0.10)+(4x0.15)+(3x0.15)+(3x0.05)+(3x0.05)+(3x0.05)+(1x0.05)+(3x0.05) | **2.75** |
| tRPC seul | (0x0.20)+(1x0.15)+(5x0.10)+(0x0.15)+(1x0.15)+(5x0.05)+(2x0.05)+(0x0.05)+(2x0.05)+(4x0.05) | **1.30** |

### 7.4 Visualisation

```
REST + view endpoints  ████████████████████████████████████████████████  4.80
REST classique         █████████████████████████████████████             4.10
REST + tRPC hybride    ██████████████████████████████████                3.53
GraphQL                █████████████████████████████████                 3.50
Supabase direct        ███████████████████████████                       2.75
tRPC seul              █████████████                                     1.30
```

---

## 8. Decision

### Strategie retenue : REST avec view endpoints optimises (Option 5)

**Score pondere : 4.80/5** -- devance le REST classique (4.10) et le GraphQL (3.50).

L'API backend NestJS expose une API REST classique documentee via OpenAPI/Swagger, enrichie de view endpoints optimises par profil client (consumer, partner, admin).

### Architecture retenue

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API NestJS (Fastify)                        │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Couche 1 : Endpoints ressources (CRUD standard)            │   │
│  │                                                              │   │
│  │  /api/v1/baskets           GET, POST                        │   │
│  │  /api/v1/baskets/:id       GET, PATCH, DELETE               │   │
│  │  /api/v1/reservations      GET, POST                        │   │
│  │  /api/v1/reservations/:id  GET, PATCH                       │   │
│  │  /api/v1/stores            GET                              │   │
│  │  /api/v1/stores/:id        GET, PATCH                       │   │
│  │  /api/v1/users/me          GET, PATCH, DELETE               │   │
│  │  ...                                                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Couche 2 : View endpoints (BFF inline)                     │   │
│  │                                                              │   │
│  │  Consumer (Flutter mobile) :                                │   │
│  │    GET /api/v1/consumer/home                                │   │
│  │    GET /api/v1/consumer/explore?category=...&sort=...       │   │
│  │    GET /api/v1/consumer/basket/:id/checkout-info            │   │
│  │    GET /api/v1/consumer/my-reservations                     │   │
│  │    GET /api/v1/consumer/favorites                           │   │
│  │                                                              │   │
│  │  Partner (Flutter mobile) :                                 │   │
│  │    GET /api/v1/partner/dashboard                            │   │
│  │    GET /api/v1/partner/today-reservations                   │   │
│  │    GET /api/v1/partner/baskets/active                       │   │
│  │    GET /api/v1/partner/analytics?period=...                 │   │
│  │                                                              │   │
│  │  Admin (React web) :                                        │   │
│  │    GET  /api/v1/admin/dashboard                             │   │
│  │    GET  /api/v1/admin/reservations?...filtres...            │   │
│  │    GET  /api/v1/admin/partners?status=pending               │   │
│  │    POST /api/v1/admin/partners/bulk-action                  │   │
│  │    GET  /api/v1/admin/finance/payouts?period=...            │   │
│  │    GET  /api/v1/admin/exports/reservations.csv              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Couche services (logique metier partagee)                  │   │
│  │                                                              │   │
│  │  BasketsService, ReservationsService, StoresService,        │   │
│  │  PaymentsService, NotificationsService, FinanceService,     │   │
│  │  FraudService, MediaService, ...                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Couche donnees                                             │   │
│  │  Prisma ORM → Supabase PostgreSQL (+ PostGIS)              │   │
│  │  Redis (cache, BullMQ queues)                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Organisation des modules NestJS

```
src/
├── modules/
│   ├── auth/
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   └── auth.module.ts
│   │
│   ├── baskets/
│   │   ├── baskets.controller.ts         # CRUD : /api/v1/baskets
│   │   ├── baskets.service.ts            # Logique metier
│   │   ├── dto/
│   │   │   ├── create-basket.dto.ts
│   │   │   ├── basket-response.dto.ts
│   │   │   └── basket-list-query.dto.ts
│   │   └── baskets.module.ts
│   │
│   ├── reservations/
│   │   ├── reservations.controller.ts    # CRUD : /api/v1/reservations
│   │   ├── reservations.service.ts
│   │   └── ...
│   │
│   ├── consumer-views/                   # View endpoints consumer
│   │   ├── consumer-views.controller.ts  # /api/v1/consumer/*
│   │   ├── dto/
│   │   │   ├── consumer-home.dto.ts
│   │   │   ├── consumer-explore.dto.ts
│   │   │   └── consumer-reservations.dto.ts
│   │   └── consumer-views.module.ts
│   │
│   ├── partner-views/                    # View endpoints partner
│   │   ├── partner-views.controller.ts   # /api/v1/partner/*
│   │   ├── dto/
│   │   │   ├── partner-dashboard.dto.ts
│   │   │   └── partner-analytics.dto.ts
│   │   └── partner-views.module.ts
│   │
│   └── admin-views/                      # View endpoints admin
│       ├── admin-views.controller.ts     # /api/v1/admin/*
│       ├── dto/
│       │   ├── admin-dashboard.dto.ts
│       │   ├── admin-reservations-query.dto.ts
│       │   └── admin-bulk-action.dto.ts
│       └── admin-views.module.ts
│
├── common/
│   ├── dto/
│   │   ├── cursor-pagination.dto.ts
│   │   └── offset-pagination.dto.ts
│   ├── interceptors/
│   │   ├── cache.interceptor.ts
│   │   └── response-transform.interceptor.ts
│   └── filters/
│       └── http-exception.filter.ts
│
└── app.module.ts
```

### Chaine de codegen

```
                    ┌─────────────────────────────┐
                    │  NestJS Controllers + DTOs   │
                    │  (decorateurs @Api*)         │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────v───────────────┐
                    │  @nestjs/swagger             │
                    │  Genere le spec OpenAPI      │
                    │  (openapi.json)              │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
          ┌─────────v─────────┐      ┌───────────v───────────┐
          │  openapi-generator │      │  orval                │
          │  (Dart / Flutter)  │      │  (TypeScript / React)  │
          │                    │      │                        │
          │  → Classes DTO     │      │  → Hooks React Query   │
          │  → Client API      │      │  → Types TypeScript    │
          │  → Serialisation   │      │  → Client fetch        │
          └────────────────────┘      └────────────────────────┘
```

**Pipeline CI/CD pour le codegen :**
1. Le backend NestJS genere le spec OpenAPI a chaque build (`nest build && npx @nestjs/swagger-cli generate`)
2. Le spec est versionne dans le repo (ou publie sur un registre de specs)
3. Le pipeline CI du client Flutter execute `openapi-generator` et regenere les classes Dart
4. Le pipeline CI du client React execute `orval` et regenere les hooks TypeScript
5. Si le codegen casse (breaking change non retro-compatible), le pipeline echoue et alerte l'equipe

---

## 9. Justification detaillee de la decision

### Pourquoi REST + view endpoints plutot que GraphQL ?

Le debat REST vs GraphQL est souvent presente comme GraphQL etant "superieur". Dans le contexte de BienBon, les avantages de GraphQL sont largement neutralises :

1. **L'over-fetching est resolu par les view endpoints.** Le `/consumer/home` retourne exactement les champs necessaires, comme une query GraphQL taillee pour l'ecran. La difference residuelle est de l'ordre de quelques octets (champs "en trop" dans le DTO), negligeable meme sur un reseau 3G.

2. **Le versioning GraphQL est un cauchemar pour le mobile.** GraphQL preconise l'"evolution additive" (on ne supprime jamais, on deprecie). En pratique, les schemas GraphQL accumulent des champs deprecies que personne n'ose supprimer. Et si un type fondamental doit changer (ex: le modele `Price` passe de `{ amount: Float }` a `{ amount: Int, currency: String }` pour gerer les centimes), c'est un breaking change que GraphQL ne sait pas gerer proprement. Avec REST, `/v1/baskets` et `/v2/baskets` coexistent simplement.

3. **La complexite N+1 est un piege permanent.** A chaque nouvelle relation ajoutee dans le schema GraphQL, le risque de N+1 augmente. Pour une equipe de 2-5 devs, cette vigilance constante est un cout cache significatif. Les view endpoints NestJS controlent exactement les requetes DB executees (via `Promise.all` et `Prisma include` explicites).

4. **Le caching HTTP est un avantage reel.** Un `GET /api/v1/consumer/home` avec `Cache-Control: public, max-age=30` est servi par un CDN ou le cache navigateur sans aucun code supplementaire. En GraphQL, il faut Automatic Persisted Queries + Apollo Server cache + configuration Redis. Pour le meme resultat.

5. **Le tooling REST est universellement compris.** Curl, Postman, les logs HTTP, les dashboards APM (Sentry, Datadog) -- tout fonctionne nativement avec REST. En GraphQL, les `POST /graphql` dans les logs sont opaques sans tooling dedie.

### Pourquoi pas tRPC ou l'hybride REST + tRPC ?

L'incompatibilite Flutter de tRPC est eliminatoire. L'hybride REST + tRPC pour l'admin web est tentant mais le gain marginal ne justifie pas la complexite :

- Avec `orval` + OpenAPI, la DX React est deja excellente (hooks React Query type-safe, autocompletion)
- L'admin web est mis a jour instantanement (app web, pas store mobile), donc la type-safety tRPC est moins critique que pour une app mobile
- Maintenir deux couches API (REST + tRPC) double les efforts de test, documentation, et auth middleware

### Pourquoi pas Supabase direct ?

L'ADR-001 a choisi NestJS comme backend custom. Supabase direct court-circuite ce choix et reintroduit tous les problemes listes (couplage DB-API, pas de versioning, logique metier dans Edge Functions). L'option est exclue par coherence architecturale.

---

## 10. Detail des view endpoints prevus

### Consumer (Flutter mobile)

| Endpoint | Description | Donnees retournees | Cache |
|----------|-------------|-------------------|-------|
| `GET /consumer/home` | Page d'accueil | Paniers proches (10), favoris avec dispo (5), categories actives, promotions du moment | 30s |
| `GET /consumer/explore` | Exploration avec filtres | Paniers pagines (cursor), filtres (categorie, distance, prix, note), tri | 15s |
| `GET /consumer/basket/:id/details` | Fiche panier complete | Panier, magasin, creneau retrait, avis recents, paniers similaires | 10s |
| `GET /consumer/basket/:id/checkout-info` | Info pre-checkout | Prix, frais, methodes de paiement dispo, stock actuel (temps reel) | 0 (no-cache) |
| `GET /consumer/my-reservations` | Mes reservations | A venir (avec QR), passees, statistiques personnelles | 5s |
| `GET /consumer/favorites` | Favoris | Magasins favoris avec prochain panier dispo, distance | 30s |

### Partner (Flutter mobile)

| Endpoint | Description | Donnees retournees | Cache |
|----------|-------------|-------------------|-------|
| `GET /partner/dashboard` | Tableau de bord | Reservations du jour, pickups en attente, stats semaine, alertes | 10s |
| `GET /partner/today-reservations` | Reservations du jour | Liste avec statut, heure, nom client (pagine cursor) | 5s |
| `GET /partner/baskets/active` | Paniers actifs | Stock, reservations en cours, performance par panier | 10s |
| `GET /partner/analytics` | Statistiques | Revenus, paniers vendus, taux no-show, note moyenne, par periode | 60s |

### Admin (React web)

| Endpoint | Description | Donnees retournees | Cache |
|----------|-------------|-------------------|-------|
| `GET /admin/dashboard` | Dashboard KPIs | Reservations totales, revenu, partenaires actifs, taux reclamations, graphiques | 60s |
| `GET /admin/reservations` | Liste reservations | Pagine offset, filtres (statut, date, magasin, client, methode paiement), aggregats | 0 |
| `GET /admin/partners` | Liste partenaires | Pagine offset, filtres (statut, ville, categorie), stats par partenaire | 10s |
| `POST /admin/partners/bulk-action` | Action groupee | Suspension, validation, relance en masse | N/A |
| `GET /admin/finance/payouts` | Reversements | Pagine offset, filtre periode, statut, totaux | 10s |
| `GET /admin/consumers` | Liste consommateurs | Pagine offset, filtres, stats (nb commandes, panier moyen, reclamations) | 10s |
| `GET /admin/claims` | Reclamations | Pagine offset, filtre statut/priorite, detail complet | 0 |
| `GET /admin/exports/:type` | Export CSV/PDF | Streaming, filtre identique aux tableaux correspondants | N/A |
| `GET /admin/audit-trail` | Journal d'audit | Pagine cursor, filtre entite/action/utilisateur/date | 0 |

---

## 11. Strategie de cache

Les view endpoints beneficient pleinement du cache HTTP natif :

```typescript
// cache.interceptor.ts
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const response = context.switchToHttp().getResponse();
    const cacheDuration = Reflect.getMetadata('cache-ttl', context.getHandler());

    if (cacheDuration) {
      response.header('Cache-Control', `public, max-age=${cacheDuration}`);
      // ETag pour revalidation conditionnelle
      // Last-Modified pour les donnees datees
    }

    return next.handle();
  }
}

// Usage
@Get('home')
@CacheTTL(30) // Cache 30 secondes
async getHome() { ... }
```

### Niveaux de cache

```
Client Flutter                Cloudflare CDN              NestJS + Redis
┌─────────────┐           ┌────────────────┐         ┌──────────────────┐
│ Cache local  │ ──miss──→ │ Cache CDN edge │ ──miss→ │ Cache Redis      │
│ (HTTP cache) │           │ (30s TTL)      │         │ (view aggregees) │
│ + SQFlite    │           │                │         │       │          │
│ (offline)    │ ←──hit─── │   (stale-      │ ←─hit── │       ↓          │
└─────────────┘           │ while-revalidate│         │ PostgreSQL       │
                          └────────────────┘         └──────────────────┘
```

1. **Cache HTTP client** : le SDK Flutter respecte `Cache-Control`. Les view endpoints avec TTL > 0 sont servis depuis le cache local sans requete reseau.
2. **CDN (Cloudflare)** : les requetes GET publiques (exploration sans auth) sont cachees en edge. Les requetes authentifiees passent au backend.
3. **Cache Redis applicatif** : pour les view endpoints dont l'agregation est couteuse (dashboard admin avec KPIs calcules), un cache Redis stocke le resultat pre-calcule avec TTL.
4. **Cache offline (SQFlite)** : le client Flutter stocke localement les dernieres donnees connues pour le mode offline (favoris, historique, paniers sauvegardes).

---

## 12. Consequences

### Positives

1. **Simplicite architecturale.** Un seul paradigme API (REST), un seul spec OpenAPI, un seul pipeline de codegen, un seul modele de monitoring. Tout developpeur de l'equipe comprend toute la chaine en 30 minutes.

2. **Performance mobile optimisee sans complexite GraphQL.** Les view endpoints `/consumer/home` et `/consumer/explore` donnent la meme performance qu'une query GraphQL (un seul round-trip, payload taille) sans les inconvenients (N+1, pas de cache HTTP, complexite query analysis).

3. **Versioning robuste.** NestJS URI versioning (`/v1/`, `/v2/`) garantit que les anciennes apps Flutter continuent de fonctionner apres un changement d'API. C'est le point le plus critique pour une app mobile et c'est le point fort de REST.

4. **Codegen fiable pour les deux plateformes.** `openapi-generator` (Dart) et `orval` (TypeScript) sont les outils de codegen les plus matures et les mieux maintenus pour leurs ecosystemes respectifs. Pas de risque de tooling experimental.

5. **Cacheabilite native.** Les view endpoints `GET` supportent `Cache-Control`, `ETag`, CDN, et cache navigateur sans code supplementaire. Pour une app mobile sur un reseau variable, c'est un avantage tangible.

6. **Onboarding rapide.** Un nouveau developpeur qui connait REST (c'est-a-dire tout le monde) est immediatement productif. Pas besoin de former l'equipe a GraphQL, aux resolvers, au DataLoader, ou aux subtilites du cache normalise Apollo.

### Negatives

1. **Plus d'endpoints que du REST pur.** Les view endpoints supplementaires augmentent le nombre total d'endpoints. Estimation : ~15-20 endpoints CRUD + ~15-20 view endpoints = ~30-40 endpoints au total. C'est gerable mais necessite une organisation rigoureuse.

2. **Les view endpoints doivent evoluer avec le design.** Si le designer ajoute un bloc a la page d'accueil, le view endpoint `/consumer/home` doit etre modifie. Mitigation : c'est du code serveur, deployable en minutes. Et le design evolue plus vite que le schema de donnees.

3. **L'over-fetching residuel n'est pas nul.** Un view endpoint retourne un DTO fixe. Si l'app n'utilise que 8 champs sur les 12 retournes, les 4 restants sont "gaspilles". En pratique, les DTOs des view endpoints sont tailles au plus pres de l'ecran, donc le gaspillage est minime (dizaines d'octets).

4. **Pas de flexibilite ad-hoc pour les devs frontend.** Avec GraphQL, un dev frontend peut demander un nouveau champ sans toucher au backend. Avec les view endpoints, il faut modifier le DTO cote backend. Mitigation : dans une equipe de 2-5 devs, la meme personne fait souvent le frontend et le backend. Et meme dans une equipe plus grande, un PR pour ajouter un champ a un DTO est triviale.

---

## 13. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| **Les view endpoints proliferent** : chaque ecran veut son endpoint dedie, menant a des dizaines de controllers. | Moyenne | Moyen | Regle de governance : un view endpoint par ecran principal (home, explore, dashboard), pas par composant. Les composants secondaires utilisent les endpoints CRUD. Revue d'architecture trimestrielle. |
| **Le codegen Dart (openapi-generator) ne gere pas un edge case** (ex: union types, oneOf complex). | Faible | Moyen | Simplifier les DTOs cote backend pour rester dans le sous-ensemble OpenAPI que le codegen Dart gere bien. Utiliser `swagger_parser` comme alternative. En dernier recours, ecrire manuellement les classes Dart pour les cas limites. |
| **Le spec OpenAPI diverge de l'implementation** : les decorateurs `@Api*` sont oublies par un dev. | Moyenne | Moyen | CI/CD : valider le spec OpenAPI genere via `openapi-lint` a chaque PR. Ajouter un test qui compare le spec genere avec le spec reference. |
| **Un changement de view endpoint casse une ancienne version de l'app Flutter.** | Faible | Eleve | Versioning URI strict. Les view endpoints sont versionnees (`/v1/consumer/home`). Toute modification breaking cree un `/v2/consumer/home`. Monitoring de l'usage par version via header `X-App-Version`. |
| **Le cache TTL des view endpoints retourne des donnees obsoletes** (ex: stock incorrect). | Moyenne | Moyen | Les endpoints critiques (checkout, stock) ont un TTL de 0 (no-cache). Les endpoints non-critiques (home, explore) ont un TTL court (15-30s). Le client peut toujours forcer un refresh (`Cache-Control: no-cache`). |
| **L'equipe decide plus tard que GraphQL est necessaire.** | Faible | Moyen | Les services NestJS (couche metier) sont decouplees des controllers. Ajouter un `@nestjs/graphql` layer au-dessus des memes services est possible sans reecriture. Les view endpoints et les resolvers GraphQL peuvent coexister temporairement. |

---

## 14. Plan de validation

Avant de finaliser cette decision, l'equipe devrait realiser les validations suivantes :

| # | Validation | Duree | Objectif |
|---|------------|-------|----------|
| 1 | **Codegen Dart end-to-end** | 0.5 jour | Creer 2-3 endpoints NestJS avec `@nestjs/swagger`, generer le spec OpenAPI, executer `openapi-generator` Dart, et verifier que les classes generees sont utilisables dans un projet Flutter minimal. Tester avec des types complexes (enums, nullable, nested objects, arrays). |
| 2 | **Codegen TypeScript end-to-end** | 0.5 jour | Meme exercice avec `orval` pour React. Verifier que les hooks React Query generes fonctionnent avec TanStack Table pour un tableau admin. |
| 3 | **View endpoint performance** | 0.5 jour | Implementer `/consumer/home` avec 3 requetes Prisma en `Promise.all`. Mesurer le temps de reponse sous charge avec `autocannon` ou `k6`. Comparer avec 3 appels REST sequentiels depuis un client. |
| 4 | **Versioning NestJS** | 0.5 jour | Configurer le URI versioning NestJS. Creer un endpoint `/v1/baskets` et `/v2/baskets` avec des DTOs differents. Verifier que les deux versions coexistent sans conflit. Verifier que le spec OpenAPI genere contient les deux versions. |
| 5 | **Cache HTTP** | 0.5 jour | Configurer `Cache-Control` sur un view endpoint. Verifier le comportement avec le client Flutter (`http` ou `dio` avec cache interceptor). Mesurer l'impact sur le nombre de requetes serveur. |

**Total : 2.5 jours de validation avant de s'engager.**

---

## 15. Decisions connexes

| ADR | Sujet | Statut |
|-----|-------|--------|
| ADR-001 | Stack backend (NestJS + Prisma + Supabase) | Propose |
| ADR-002 | Architecture applicative (monolithe modulaire) | Propose |
| ADR-005 | Architecture de paiement | Propose |
| ADR-008 | Prevention double-booking et sync stock | Propose |
| ADR-010 | Strategie d'authentification (Supabase Auth) | Propose |
| ADR-XXX | Schema de base de donnees et strategie de migration | A ecrire |
| ADR-XXX | Strategie de monitoring et observabilite | A ecrire |
| ADR-XXX | Strategie d'emails transactionnels (templates, provider) | A ecrire |

---

## 16. References

### Patterns et architecture

- [BFF Pattern - Sam Newman](https://samnewman.io/patterns/architectural/bff/)
- [Netflix BFF Architecture](https://netflixtechblog.com/embracing-the-differences-inside-the-netflix-api-redesign-15fd8b3dc49d)
- [Backends for Frontends - Microsoft Azure Architecture](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends)
- [REST vs GraphQL - When to Use Which (InfoQ 2025)](https://www.infoq.com/articles/rest-vs-graphql-2025/)

### NestJS et OpenAPI

- [NestJS OpenAPI / Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [NestJS Versioning](https://docs.nestjs.com/techniques/versioning)
- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- [NestJS Performance (Fastify)](https://docs.nestjs.com/techniques/performance)

### Codegen

- [openapi-generator - Dart Client](https://openapi-generator.tech/docs/generators/dart/)
- [swagger_parser - Dart/Flutter](https://pub.dev/packages/swagger_parser)
- [orval - React/TypeScript from OpenAPI](https://orval.dev/)
- [openapi-typescript](https://openapi-ts.dev/)
- [graphql_codegen - Dart](https://pub.dev/packages/graphql_codegen)
- [GraphQL Code Generator - TypeScript](https://the-guild.dev/graphql/codegen)

### GraphQL critique

- [Why We Moved Back to REST (Bozho, 2024)](https://blog.bozho.net/blog/4218)
- [GraphQL is Not Meant to Be Exposed Over the Internet (Wundergraph)](https://wundergraph.com/blog/graphql-security)
- [The Problems with GraphQL in Production (Marc-André Giroux)](https://productionreadygraphql.com/)

### tRPC

- [tRPC Official Documentation](https://trpc.io/docs)
- [trpc-nestjs-adapter](https://github.com/jlalmes/trpc-nestjs-adapter)

### Pagination

- [Cursor vs Offset Pagination - Slack Engineering](https://slack.engineering/evolving-api-pagination-at-slack/)
- [Pagination Best Practices - Prisma](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)

### Mobile API Design

- [Mobile API Design - Designing APIs for Mobile Apps (Phil Sturgeon)](https://apisyouwonthate.com/blog/api-design-for-mobile-apps)
- [API Design Patterns for Mobile (Google Cloud)](https://cloud.google.com/architecture/api-design-patterns-for-mobile)
