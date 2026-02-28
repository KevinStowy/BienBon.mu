# ADR-001 : Choix de la stack backend

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir

---

## Contexte

BienBon.mu est une application mobile-first de reduction du gaspillage alimentaire a l'ile Maurice. Les consommateurs achetent des paniers surprise d'invendus a prix reduit chez des commercants partenaires. Le projet doit servir :

- **Une app mobile native** (consommateur + partenaire) -- probablement Flutter/Dart
- **Une app web** (consommateur + partenaire + backoffice admin) -- possiblement Flutter Web
- **Une API backend** qui alimente l'ensemble des clients

### Contraintes metier

- **Volumetrie** : Marche mauricien (~1.3M habitants). Demarrage avec quelques dizaines de partenaires, quelques centaines a quelques milliers d'utilisateurs actifs au lancement. Objectif de scaling progressif, mais on ne parle pas de millions de requetes/seconde a court terme.
- **Equipe** : Petite equipe startup (2-5 developpeurs). La velocite de developpement et la simplicite operationnelle priment sur la performance brute.
- **Budget** : Startup en phase de demarrage. Les couts d'infrastructure doivent rester minimaux (idealement < 100 USD/mois au lancement).
- **Besoins temps reel** : Synchronisation du stock des paniers (un panier reserve = stock decremente en direct pour tous les utilisateurs), notifications push, suivi de commande.
- **Geolocalisation** : Recherche de commercants par proximite, affichage sur carte.
- **Paiements locaux** : Integration des solutions mauriciennes -- MCB Juice (420K+ abonnes, 7M+ transactions/mois), my.t money, Blink by Emtel, Pop -- via les passerelles MIPS ou MCB Pay+ qui aggregent ces methodes.
- **Multilingue** : Francais, creole mauricien, anglais.
- **Recrutement** : Le vivier de developpeurs a Maurice est domine par Java, JavaScript/TypeScript, Python, React. Les competences en Go, Elixir ou Dart cote serveur y sont rares.

### Pourquoi cette decision est necessaire maintenant

Le projet entre en phase de developpement backend. Le choix du runtime, du framework, de l'ORM et de la base de donnees conditionne toute l'architecture pour les 2-3 prochaines annees minimum. Un mauvais choix a ce stade implique une reecriture couteuse.

---

## Options considerees

### A. Runtime et framework

#### Option A1 : Node.js + NestJS (TypeScript)

**Description** : Framework backend structure, inspire d'Angular, avec une architecture modulaire (modules, controllers, providers, decorators). Tres opinionne. Supporte Express et Fastify comme moteur HTTP sous-jacent.

**Avantages** :
- Architecture claire et scalable des le depart : modules, injection de dependances, guards, interceptors, pipes
- Ecosysteme extremement riche : plus de 50 modules officiels (WebSockets, GraphQL, microservices, queues via Bull/BullMQ, CRON, caching, etc.)
- TypeScript strict de bout en bout avec decorateurs et metadata
- Documentation exhaustive et communaute massive (~70K stars GitHub)
- L'adaptateur Fastify permet de passer de ~17K a ~45K req/s sans changer le code applicatif
- Recrutement facile : tout developpeur TypeScript/Angular peut monter en competence rapidement
- Monorepo-friendly via les "NestJS Workspaces"

**Inconvenients** :
- Surcharge d'abstraction pour un petit projet : beaucoup de boilerplate pour une API simple
- Courbe d'apprentissage initiale (decorateurs, DI, modules) si l'equipe n'a pas d'experience Angular
- Performance brute inferieure a Fastify nu ou Hono (couches d'abstraction)
- Bundle size et temps de demarrage plus lourds qu'un framework minimaliste

#### Option A2 : Node.js + Fastify (TypeScript)

**Description** : Framework web performant, plugin-based, avec validation par JSON Schema integree. Moins opinionne que NestJS. Focus sur la performance et l'extensibilite.

**Avantages** :
- Tres performant : 30K-76K req/s nativement, validation par schema avec compilation JIT
- Architecture plugin claire et composable
- Bon support TypeScript (pas aussi strict que NestJS mais suffisant)
- Plus leger et plus rapide a demarrer que NestJS
- Communaute solide (~33K stars GitHub)
- Ecosysteme de plugins riche (auth, CORS, rate limiting, multipart, swagger/OpenAPI auto-genere)

**Inconvenients** :
- Moins structure que NestJS : a l'equipe d'imposer ses conventions d'architecture
- Pas de systeme d'injection de dependances natif (possible via plugins communautaires)
- Moins de "batteries included" pour des besoins enterprise (queues, microservices, CRON, etc.)
- La liberte architecturale peut mener a du code desorganise dans une equipe junior

#### Option A3 : Bun + Hono/ElysiaJS (TypeScript)

**Description** : Runtime JavaScript alternatif (Bun) couple a des frameworks ultra-legers (Hono ~14KB, ElysiaJS). Hono est runtime-agnostic (Node, Bun, Deno, Cloudflare Workers, etc.).

**Avantages** :
- Performance theorique superieure (Bun est plus rapide que Node.js en benchmarks synthetiques)
- Hono : ultra-leger, runtime-agnostic, ideal pour l'edge computing
- ElysiaJS : end-to-end type safety, excellent DX, validation integree
- Bundle size minuscule, cold starts negligeables
- Modernite et elegance du code

**Inconvenients** :
- **Bun n'est pas production-ready pour tous les cas d'usage** : compatibilite Node.js incomplete, certains packages npm ne fonctionnent pas
- Ecosysteme immature : peu de librairies tierces testees en production avec Bun
- Communaute plus petite, moins de ressources et de solutions aux problemes courants
- ElysiaJS est lie a Bun (pas portable)
- **Risque startup** : debugger des problemes de compatibilite Bun prend du temps que la startup n'a pas
- Hono seul (sans Bun) sur Node.js perd une grande partie de son avantage performance
- Pas de systeme de queues, CRON, ou modules enterprise comparables a NestJS

#### Option A4 : Go + Echo/Fiber

**Description** : Langage compile, statiquement type, connu pour ses performances et sa simplicite. Echo et Fiber sont les frameworks web Go les plus populaires.

**Avantages** :
- Performance exceptionnelle : Go surpasse largement Node.js en throughput brut et utilisation memoire
- Binaire compile unique, deploiement trivial (un seul fichier, pas de node_modules)
- Concurrence native via goroutines (ideal pour le temps reel)
- Echo : 16% des devs Go l'utilisent, API idiomatique, excellent pour les REST APIs
- Fiber : API familiere pour les devs Express.js, ~11% d'adoption

**Inconvenients** :
- **Fragmentation d'ecosysteme** : pas d'equivalent a l'ecosysteme npm pour les besoins courants (auth, upload, queues, etc.)
- **Recrutement difficile a Maurice** : Go n'est pas dans le top des competences locales (Java, JS/TS, Python dominent)
- Pas de generiques historiquement (ameliore depuis Go 1.18, mais l'ecosysteme n'a pas encore totalement adopte)
- Verbose pour du CRUD simple compare a TypeScript + un ORM
- Le frontend est en Flutter/Dart, le backend en Go = deux langages differents, pas de partage de types
- Courbe d'apprentissage pour une equipe venant du monde JavaScript

#### Option A5 : Elixir + Phoenix

**Description** : Langage fonctionnel sur la BEAM VM (Erlang). Phoenix est le framework web de reference. Excelle en temps reel (Phoenix Channels, LiveView).

**Avantages** :
- **Meilleur ecosysteme temps reel du marche** : Phoenix Channels supporte des millions de connexions WebSocket simultanees
- Modele de concurrence acteur (processus BEAM) : fault-tolerant, auto-healing
- Phoenix LiveView pour des interfaces temps reel sans JavaScript
- Ecto (ORM) est excellent : migrations, changesets, requetes composables
- Performance et scalabilite remarquables pour le temps reel

**Inconvenients** :
- **Recrutement quasi-impossible a Maurice** : Elixir est un langage de niche, meme en Europe
- Courbe d'apprentissage significative : paradigme fonctionnel, pattern matching, processus BEAM
- Ecosysteme de librairies plus petit que Node.js ou Python
- Pas d'integration native avec les SDK de paiement locaux (MCB, MIPS)
- **Un seul dev qui part = la startup est bloquee** (risque de bus factor)
- Le temps reel "millions de connexions" est largement surdimensionne pour le marche mauricien

#### Option A6 : Python + FastAPI ou Django

**Description** : FastAPI est un framework async moderne (40% de croissance annuelle d'adoption). Django est le framework full-stack mature par excellence.

**Avantages** :
- Python est tres repandu a Maurice (enseignement universitaire, data science)
- **FastAPI** : 20K+ req/s, async natif, auto-generation OpenAPI, validation Pydantic, excellent pour les APIs
- **Django** : batteries included (admin, auth, ORM, migrations, forms), enormement de packages tiers
- Django REST Framework est la reference pour les APIs REST
- Ecosysteme massif pour l'IA/ML si BienBon veut integrer des recommandations
- Recrutement relativement facile dans la francophonie

**Inconvenients** :
- **Performance inferieure a Node.js/Go** : Django ~4-5K req/s, FastAPI ~20K req/s (vs 45K+ NestJS/Fastify)
- Pas de partage de types avec le frontend Flutter/Dart
- L'ecosysteme temps reel de Python est moins mature que celui de Node.js (pas de Socket.IO natif, libraries WebSocket moins ergonomiques)
- Django est monolithique et opinionne de facon differente d'une API-first approach
- FastAPI est plus leger mais manque de structure imposee (meme probleme que Fastify)
- Le GIL de Python limite le parallelisme CPU (ameliore dans Python 3.13+ mais pas encore mainstream)

#### Option A7 (bonus) : Dart + Serverpod

**Description** : Framework backend en Dart specifiquement concu pour Flutter. Partage de types entre client et serveur, ORM PostgreSQL integre, generation de code automatique.

**Avantages** :
- **Un seul langage (Dart) pour tout le stack** : frontend mobile, frontend web, backend
- Generation automatique du client API Dart depuis les endpoints serveur
- ORM PostgreSQL integre avec migrations
- WebSockets, caching, auth, file storage inclus
- Reduit drastiquement le cout de maintenance des interfaces client-serveur

**Inconvenients** :
- **Ecosysteme immature** : Serverpod 2.9 (octobre 2025), communaute encore petite
- Tres peu de production deployments a grande echelle documentes
- **Recrutement impossible** : aucun developpeur Dart backend sur le marche mauricien (ni ailleurs, ou presque)
- Serverpod Cloud est encore en beta privee
- Pas d'integration avec les SDK de paiement locaux
- Risque de lock-in sur un framework sans alternative
- Si Serverpod est abandonne, toute la couche backend est a reecrire
- Les librairies Dart cote serveur sont bien moins matures que celles de l'ecosysteme npm

---

### B. ORM / Query Builder (pour l'option TypeScript retenue)

#### Option B1 : Prisma

**Description** : ORM schema-first avec generation de code. Schema defini dans un fichier `.prisma`, client genere en TypeScript. Prisma 7 (fin 2025) a supprime le moteur Rust pour du TypeScript pur, avec des gains de performance 3x.

**Avantages** :
- Schema declaratif lisible et maintenable
- Migrations automatiques (`prisma migrate`)
- Client genere 100% type-safe
- Prisma Studio : GUI pour explorer les donnees
- Types generes plus rapides a checker que Drizzle (quelques centaines d'instanciations vs 5000+)
- Prisma 7 : plus de binaire Rust, client pur TypeScript, cold starts reduits
- Enorme communaute et documentation

**Inconvenients** :
- Moins de controle sur le SQL genere (abstraction parfois trop opaque)
- Historiquement lent en cold start (resolu avec Prisma 7)
- Le schema `.prisma` est un DSL proprietaire (pas du TypeScript)
- Requetes relationnelles complexes parfois difficiles a exprimer

#### Option B2 : Drizzle ORM

**Description** : ORM/query builder SQL-first, code-first. Schema defini en TypeScript. Zero dependances binaires, ~7KB bundle.

**Avantages** :
- SQL-first : les requetes ressemblent a du SQL, transparence totale
- Bundle ultra-leger (7KB), zero cold start
- Schema en TypeScript (pas de DSL externe)
- `drizzle-kit` pour les migrations et introspection
- Excellent pour serverless et edge (bundle minuscule)
- Requetes relationnelles puissantes avec l'API `with`
- Peut generer des requetes optimisees evitant le N+1 (jusqu'a 14x moins de latence)

**Inconvenients** :
- Type safety sur les resultats mais pas sur la construction des requetes (on peut ecrire des requetes invalides)
- Plus jeune que Prisma, moins de ressources/tutoriels
- Pas de GUI integree type Prisma Studio
- Check de types plus lent que Prisma a mesure que le schema grandit (5000+ instanciations)

#### Option B3 : Kysely

**Description** : Query builder pur TypeScript, 100% type-safe, proche du SQL.

**Avantages** :
- Type safety end-to-end superieure a Drizzle (validation sur les requetes ET les resultats)
- API tres proche du SQL, ideal pour les devs qui pensent en SQL
- Pas d'abstraction ORM, controle total

**Inconvenients** :
- **Pas un ORM** : pas de migrations natives, pas de schema generation (outils communautaires uniquement)
- Pas de mapping relationnel (pas de `include` ou `with`)
- Plus verbeux pour du CRUD simple
- Convient mieux comme complement qu'en outil principal

#### Option B4 : TypeORM

**Description** : ORM classique inspire d'Hibernate/ActiveRecord. Decorateurs TypeScript. Historiquement populaire avec NestJS.

**Avantages** :
- Integration native avec NestJS (module officiel `@nestjs/typeorm`)
- Familier pour les developpeurs venant de Java/C# (pattern Active Record / Data Mapper)
- Supporte plusieurs bases de donnees (Postgres, MySQL, SQLite, etc.)

**Inconvenients** :
- **En perte de vitesse** : maintenu mais peu d'innovation, bugs anciens non resolus
- Type safety mediocre comparee a Prisma/Drizzle
- Performance inferieure (N+1 queries frequents, lazy loading problematique)
- API inconsistante entre les differents patterns
- La communaute migre massivement vers Prisma et Drizzle
- **Non recommande pour un nouveau projet en 2026**

---

### C. Base de donnees

#### Option C1 : PostgreSQL auto-gere (sur VPS)

**Avantages** :
- Controle total, pas de vendor lock-in
- PostGIS pour la geolocalisation native (requetes de proximite, indexation spatiale)
- Extensions riches (pg_trgm pour la recherche fuzzy, pgcrypto, etc.)
- Cout : uniquement le VPS (~5-10 USD/mois sur Hetzner, DigitalOcean)

**Inconvenients** :
- Backups, monitoring, mises a jour, securite = a gerer soi-meme
- Pas de haute disponibilite sans configuration complexe
- Temps operationnel non negligeable pour une petite equipe

#### Option C2 : Supabase (PostgreSQL manage + services integres)

**Description** : Platform-as-a-Service construite sur PostgreSQL. Inclut auth (GoTrue), storage (fichiers), Edge Functions (Deno), et API REST/GraphQL auto-generee depuis le schema.

**Avantages** :
- **Tout-en-un** : PostgreSQL + Auth + Storage + API auto-generee + Dashboard
- Free tier genereux : 500MB DB, 50K MAUs, 2 projets
- Pro a 25 USD/mois : 8GB DB, 100K MAUs, 100GB storage
- PostgreSQL natif avec `pg_notify` permet d'implementer la synchro de stock via SSE cote NestJS (cf. ADR-009)
- PostGIS disponible (extension activable)
- Row Level Security (RLS) pour la securite au niveau de la base
- SDK client pour Flutter (package `supabase_flutter`)
- Cout startup : ~27 USD/mois pour 10K MAUs vs ~75 USD sur AWS

**Inconvenients** :
- **Vendor lock-in partiel** : l'API auto-generee et les Edge Functions sont proprietaires
- Edge Functions limitees : 2s CPU time max, 20MB bundle, runtime Deno uniquement
- La logique metier complexe dans les Edge Functions est contraignante (pas d'acces a tout npm)
- Si on utilise un backend custom (NestJS/Fastify), on n'utilise que PostgreSQL + Auth + Storage, ce qui reduit l'interet du prix
- Migration away : faisable (c'est du PostgreSQL standard) mais les services annexes (auth, storage) devront etre remplaces
- Latence reseau supplementaire si le backend custom appelle Supabase comme DB distante

#### Option C3 : MySQL/MariaDB

**Avantages** :
- Tres repandu, familier pour beaucoup de developpeurs
- Performances en lecture elevees
- Beaucoup d'hebergeurs le proposent a bas cout

**Inconvenients** :
- **Inferieur a PostgreSQL pour ce projet** : pas de PostGIS natif, JSON support moins mature, pas de LISTEN/NOTIFY pour le temps reel, pas de Row Level Security native
- Moins d'extensions
- Types de donnees moins riches
- La tendance du marche est au PostgreSQL pour les nouveaux projets

---

## Criteres de decision (matrice ponderee)

Les poids refletent les priorites d'une startup early-stage avec une petite equipe.

### Criteres et poids

| Critere | Poids | Justification |
|---------|-------|---------------|
| Velocite de developpement | 25% | Time-to-market critique pour une startup |
| Recrutabilite (Maurice + francophonie) | 20% | Petite equipe, remplacement/renfort doit etre possible |
| Ecosysteme et librairies | 15% | Paiements locaux, queues, auth, push notifications |
| Cout d'infrastructure | 10% | Budget startup contraint |
| Performance et temps reel | 10% | Synchro stock, notifications (mais volumetrie modeste) |
| Maturite et stabilite | 10% | Pas de temps a perdre sur des bugs de framework |
| Developer experience (DX) | 5% | Satisfaction et retention de l'equipe |
| Partage de types avec Flutter | 5% | Reduction du boilerplate client-serveur |

### Notation des options runtime/framework (sur 5)

| Critere (poids) | NestJS (A1) | Fastify (A2) | Bun+Hono (A3) | Go+Echo (A4) | Elixir+Phoenix (A5) | Python+FastAPI (A6) | Dart+Serverpod (A7) |
|-----------------|:-----------:|:------------:|:--------------:|:------------:|:-------------------:|:-------------------:|:-------------------:|
| Velocite (25%) | 4 | 4.5 | 3 | 3 | 3 | 4 | 3.5 |
| Recrutabilite (20%) | 5 | 4.5 | 2 | 2 | 1 | 4 | 1 |
| Ecosysteme (15%) | 5 | 4 | 2 | 3 | 3 | 4 | 2 |
| Cout infra (10%) | 4 | 4.5 | 4.5 | 5 | 4 | 3.5 | 4 |
| Performance RT (10%) | 4 | 4.5 | 4 | 5 | 5 | 3 | 3.5 |
| Maturite (10%) | 5 | 4.5 | 2 | 5 | 4 | 4.5 | 2 |
| DX (5%) | 4 | 4.5 | 4.5 | 3 | 3.5 | 4.5 | 4 |
| Partage types Flutter (5%) | 3 | 3 | 3 | 2 | 2 | 2 | 5 |

### Scores ponderes

| Option | Score pondere |
|--------|:------------:|
| **Node.js + NestJS (A1)** | **4.40** |
| **Node.js + Fastify (A2)** | **4.30** |
| Python + FastAPI (A6) | 3.78 |
| Go + Echo (A4) | 3.15 |
| Bun + Hono (A3) | 2.73 |
| Elixir + Phoenix (A5) | 2.75 |
| Dart + Serverpod (A7) | 2.63 |

### Notation des ORM (dans le contexte TypeScript)

| Critere | Prisma (B1) | Drizzle (B2) | Kysely (B3) | TypeORM (B4) |
|---------|:-----------:|:------------:|:-----------:|:------------:|
| DX et productivite | 5 | 4 | 3 | 3 |
| Type safety | 4.5 | 4 | 5 | 2.5 |
| Performance | 4 | 5 | 5 | 3 |
| Migrations | 5 | 4 | 2 | 4 |
| Maturite / communaute | 5 | 3.5 | 3 | 3.5 |
| Integration NestJS | 4.5 | 3.5 | 3 | 5 |
| **Score moyen** | **4.67** | **4.00** | **3.50** | **3.50** |

### Notation des bases de donnees

| Critere | PostgreSQL auto-gere (C1) | Supabase (C2) | MySQL (C3) |
|---------|:-------------------------:|:-------------:|:----------:|
| Fonctionnalites (PostGIS, JSON, pg_notify) | 5 | 5 | 3 |
| Cout | 5 | 4 | 5 |
| Simplicite operationnelle | 2 | 5 | 2.5 |
| Flexibilite / pas de lock-in | 5 | 3.5 | 5 |
| Services bonus (auth, storage) | 1 | 5 | 1 |
| **Score moyen** | **3.60** | **4.50** | **3.30** |

---

## Decision recommandee

### Stack retenue

| Couche | Choix | Justification |
|--------|-------|---------------|
| **Runtime** | Node.js (LTS) | Ecosysteme le plus riche, recrutement aise, performant pour la volumetrie visee |
| **Framework** | **NestJS** avec adaptateur **Fastify** | Structure de NestJS + performance de Fastify. Le meilleur des deux mondes. |
| **ORM** | **Prisma** (v7+) | Productivite maximale, migrations solides, type safety forte. Evaluation de Drizzle si les performances de Prisma posent probleme en production. |
| **Base de donnees** | **Supabase** (PostgreSQL manage) | PostgreSQL complet + Auth + Storage inclus. Temps reel via SSE + `pg_notify` cote NestJS (cf. ADR-009). Cout optimal pour une startup. Migration vers PostgreSQL auto-gere possible si necessaire. |
| **Geolocalisation** | **PostGIS** (extension PostgreSQL activee dans Supabase) | Requetes de proximite natives, indexation spatiale pour la recherche de commercants. |

### Justification detaillee

#### Pourquoi NestJS + Fastify et pas Fastify seul ?

Avec 2-5 developpeurs, la structure imposee par NestJS est un atout, pas un frein :
- Les nouveaux developpeurs trouvent immediatement ou mettre leur code (module, controller, service, guard, etc.)
- L'injection de dependances facilite les tests unitaires et l'evolution de l'architecture
- Les modules NestJS officiels couvrent 90% des besoins : `@nestjs/websockets` (Socket.IO/ws), `@nestjs/bull` (queues Redis), `@nestjs/schedule` (CRON), `@nestjs/swagger` (doc API auto-generee), `@nestjs/passport` (auth)
- L'adaptateur Fastify donne les performances de Fastify (~45K req/s) tout en gardant l'architecture NestJS

Fastify seul serait plus rapide a demarrer, mais sans conventions imposees, le code d'une equipe junior risque de diverger rapidement. Le surcout initial de NestJS (boilerplate) se rentabilise des le 2e mois de developpement.

#### Pourquoi Prisma et pas Drizzle ?

- **Prisma 7** a resolu ses problemes historiques (cold start, moteur Rust) : c'est maintenant du TypeScript pur
- Le schema `.prisma` declaratif est plus lisible pour une equipe qui decouvre le projet
- Prisma Studio permet d'explorer/debugger les donnees sans ecrire de requetes
- Les migrations sont plus matures et plus fiables
- L'integration NestJS est bien documentee
- Si des performances superieures sont necessaires pour certaines requetes critiques (ex: synchro de stock haute frequence), Drizzle ou des requetes SQL brutes peuvent etre utilises ponctuellement via `prisma.$queryRaw`

#### Pourquoi Supabase et pas un PostgreSQL auto-gere ?

- **Reduction de la charge ops** : backups automatiques, monitoring, mises a jour de securite geres par Supabase. Avec 2-5 devs, chaque heure passee sur l'infra est une heure en moins sur le produit.
- **Auth inclus** : Supabase Auth gere l'inscription, la connexion, les OAuth providers, la verification email, le MFA. Ca represente des semaines de developpement economisees.
- **Storage inclus** : Upload et serving des images de produits/commercants, avec CDN.
- **Temps reel via pg_notify** : PostgreSQL natif inclut `LISTEN/NOTIFY`, utilise par NestJS pour diffuser les mises a jour de stock via SSE (cf. ADR-009). Pas de dependance a Supabase Realtime.
- **SDK Flutter** : `supabase_flutter` permet au client mobile d'utiliser directement Supabase Auth, en complement de l'API NestJS pour la logique metier et le temps reel (SSE).
- **Cout** : 25 USD/mois (plan Pro) vs le temps passe a configurer et maintenir un PostgreSQL sur VPS.
- **Migration possible** : C'est du PostgreSQL standard. Si BienBon depasse les limites de Supabase ou veut internaliser, la migration vers un PostgreSQL auto-gere (ou AWS RDS, etc.) est faisable en migrant le schema et les donnees.

#### Pourquoi pas les options ecartees ?

- **Bun + Hono/ElysiaJS** : Trop immature pour une startup qui ne peut pas se permettre de debugger des problemes de compatibilite runtime. Hono sur Node.js perd son avantage principal. A reevaluer dans 1-2 ans.
- **Go + Echo** : Performance surdimensionnee pour le marche mauricien, recrutement difficile a Maurice, pas de partage de types avec Flutter, verbose pour du CRUD.
- **Elixir + Phoenix** : Recrutement quasi-impossible a Maurice. Le temps reel de Phoenix est surdimensionne (BienBon n'a pas besoin de millions de connexions simultanees). Risque de bus factor trop eleve.
- **Python + FastAPI** : Serieux contendant. Ecarte principalement car (a) performance inferieure a NestJS/Fastify, (b) ecosysteme temps reel moins mature en Python, (c) pas de partage de types avec Flutter, (d) NestJS/Prisma offre une meilleure type safety end-to-end.
- **Dart + Serverpod** : Concept seduisant (un langage pour tout) mais risque existentiel pour une startup : ecosysteme immature, recrutement impossible, Serverpod Cloud en beta, aucun use case production comparable documente. A reevaluer si Serverpod atteint une masse critique dans 2-3 ans.

---

## Architecture cible

```
                    +-------------------+
                    |   Flutter Mobile  |
                    |  (iOS / Android)  |
                    +--------+----------+
                             |
                    +--------v----------+
                    |   Flutter Web     |
                    | (Consumer/Partner)|
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+        +----------v----------+
    |   NestJS API      |        |  Supabase Direct    |
    |  (Fastify adapter)|        |  (Auth, Storage)    |
    |                   |        |                      |
    |  - Logique metier |        +----------+-----------+
    |  - Paiements      |                   |
    |  - Notifications  |                   |
    |  - SSE (temps reel)|                  |
    |  - CRON jobs      |                   |
    +---------+---------+                   |
              |                             |
    +---------v-----------------------------v---------+
    |              Supabase PostgreSQL                 |
    |          (+ PostGIS + Extensions)                |
    |                                                  |
    |  - Tables metier (users, stores, baskets, etc.) |
    |  - RLS pour securite                             |
    |  - pg_notify (stock sync via SSE NestJS)         |
    +--------------------------------------------------+
              |
    +---------v---------+
    |   Redis (Bull)    |
    |  (Queues, Cache)  |
    +-------------------+
```

### Pattern d'utilisation

1. **Le client Flutter** utilise **Supabase Auth** directement pour l'inscription/connexion
2. **Le client Flutter** ecoute les **flux SSE de l'API NestJS** pour la synchro de stock en temps reel (cf. ADR-009 : SSE + `pg_notify`)
3. **Le client Flutter** appelle l'**API NestJS** pour toute la logique metier (creation de commande, paiement, gestion du panier partenaire, etc.)
4. **L'API NestJS** utilise **Prisma** pour acceder a la base PostgreSQL de Supabase
5. **L'API NestJS** utilise **BullMQ + Redis** pour les jobs asynchrones (notifications push, emails, traitements batch)
6. **L'API NestJS** integre les SDK de paiement (MIPS/MCB Pay+) pour les transactions

---

## Consequences

### Positives

- **Velocite** : L'equipe peut commencer a produire du code metier des le jour 1, avec un framework structure et un ORM productif
- **Recrutement** : TypeScript/NestJS est l'une des stacks backend les plus demandees au monde. Trouver des devs (locaux, remote, freelance) sera facile
- **Scalabilite** : NestJS supporte nativement les microservices. Si BienBon grandit, l'architecture peut evoluer vers du multi-service sans reecriture
- **Cout** : Supabase Pro (25 USD/mois) + Railway PaaS pour NestJS (~7-15 USD/mois) + Redis Railway (~3-5 USD/mois) = **~35-45 USD/mois** au lancement (cf. ADR-020)
- **Type safety** : TypeScript de bout en bout (NestJS + Prisma + OpenAPI genere) reduit les bugs d'integration
- **Documentation API** : `@nestjs/swagger` genere automatiquement la documentation OpenAPI, facilitant l'integration avec le client Flutter

### Negatives

- **Boilerplate NestJS** : Les premiers jours de developpement seront plus lents qu'avec Fastify nu (setup modules, DI, etc.)
- **Lock-in Supabase partiel** : L'auth et le storage Supabase devront etre remplaces si on migre. Le plan de mitigation est de garder la logique metier dans NestJS (pas dans les Edge Functions Supabase). Le temps reel (SSE + `pg_notify`) est gere par NestJS, donc sans dependance a Supabase Realtime.
- **Redis supplementaire** : BullMQ necessite un Redis, ce qui ajoute un composant d'infra (mitigable avec Upstash ou le Redis manage de Railway/Render)

---

## Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Supabase change ses prix ou ses conditions | Moyenne | Moyen | La base est du PostgreSQL standard. Migration vers Neon, Railway ou VPS possible. L'auth et le storage sont les seuls points de lock-in significatifs. |
| Prisma ne supporte pas une requete complexe necessaire | Faible | Faible | Utilisation de `$queryRaw` pour le SQL brut, ou ajout de Kysely/Drizzle pour les cas specifiques. |
| L'equipe trouve NestJS trop lourd/complexe | Faible | Moyen | Commencer par le CLI NestJS qui genere le boilerplate. Former l'equipe sur les concepts cles (modules, DI, guards). Si vraiment bloquant, migration vers Fastify nu est faisable (les services restent les memes). |
| Les SDK de paiement mauriciens (MIPS, MCB Pay+) n'ont pas de SDK Node.js | Moyenne | Moyen | Ces passerelles offrent des API REST. L'integration se fait via des appels HTTP standards avec Axios/fetch. Creer un module NestJS d'abstraction (`PaymentModule`) pour encapsuler la logique. |
| SSE + pg_notify insuffisant pour un pattern de synchro complexe | Faible | Moyen | Migration vers Redis Pub/Sub en Phase 2 (cf. ADR-009). Fallback sur Socket.IO via NestJS `@nestjs/websockets` si necessaire. |
| Performance insuffisante sous charge | Tres faible | Faible | La volumetrie mauricienne est modeste. NestJS + Fastify gere facilement 45K req/s. Si necessaire : caching Redis, CDN pour le statique, scaling horizontal du NestJS. |

---

## Plan de validation

Avant de finaliser cette decision, l'equipe devrait :

1. **Proof of Concept (1-2 jours)** : Creer un endpoint NestJS + Prisma + Supabase PostgreSQL qui cree un "panier" et broadcast le changement de stock via SSE + `pg_notify` (cf. ADR-009)
2. **Test de paiement (1 jour)** : Verifier que l'API REST de MIPS ou MCB Pay+ est integreable depuis Node.js (appel HTTP, webhook de callback)
3. **Test PostGIS (0.5 jour)** : Verifier que les requetes de proximite fonctionnent via Prisma `$queryRaw` avec PostGIS dans Supabase
4. **Test Auth (0.5 jour)** : Verifier que Supabase Auth s'integre correctement avec NestJS (validation du JWT Supabase dans un NestJS Guard)

---

## References

### Frameworks et runtime
- [Best TypeScript Backend Frameworks in 2026 - Encore](https://encore.dev/articles/best-typescript-backend-frameworks)
- [Comparing Fastify, Hono, and NestJS - Red Sky Digital](https://redskydigital.com/gb/comparing-fastify-hono-and-nestjs-for-modern-web-development/)
- [Hono vs Fastify - Better Stack](https://betterstack.com/community/guides/scaling-nodejs/hono-vs-fastify/)
- [NestJS Fastify Performance - Documentation officielle](https://docs.nestjs.com/techniques/performance)
- [Scaling NestJS with Fastify to 500K RPS](https://medium.com/@connect.hashblock/from-5k-to-500k-rps-scaling-nestjs-with-fastify-clustering-and-load-balancing-504cbde06c47)
- [Best Go Backend Frameworks in 2026 - Encore](https://encore.dev/articles/best-go-backend-frameworks)
- [Elixir Phoenix - Real-Time Apps 2025](https://www.javacodegeeks.com/2025/03/elixir-in-2025-real-time-apps-with-phoenix-and-legacy-integration.html)
- [FastAPI vs Django 2025](https://medium.com/@technode/fastapi-vs-django-a-detailed-comparison-in-2025-1e70c65b9416)
- [Serverpod - Flutter Backend Framework](https://serverpod.dev/)

### ORM et query builders
- [Drizzle vs Prisma 2026 - Bytebase](https://www.bytebase.com/blog/drizzle-vs-prisma/)
- [Drizzle vs Prisma - Better Stack](https://betterstack.com/community/guides/scaling-nodejs/drizzle-vs-prisma/)
- [Drizzle vs Prisma - Makerkit](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)
- [Kysely vs Drizzle - Marmelab](https://marmelab.com/blog/2025/06/26/kysely-vs-drizzle.html)
- [TypeScript ORM Battle 2025](https://levelup.gitconnected.com/the-2025-typescript-orm-battle-prisma-vs-drizzle-vs-kysely-007ffdfded67)

### Base de donnees et Supabase
- [Supabase Pricing 2026 - UI Bakery](https://uibakery.io/blog/supabase-pricing)
- [Supabase Review 2026 - Hackceleration](https://hackceleration.com/supabase-review/)
- [Supabase vs AWS Pricing 2026 - Bytebase](https://www.bytebase.com/blog/supabase-vs-aws-pricing/)
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits)

### Paiements a Maurice
- [MIPS - Orchestrating Payments in Mauritius](https://www.mips.mu/)
- [MCB Pay+ Merchant Services](https://payplus.mu)
- [MCB Online Payment Gateway](https://mcb.mu/corporate/payment-cash/collect/e-commerce/online-payment-gateway)

### Recrutement a Maurice
- [Getting a Job in Tech in Mauritius 2025 - Nucamp](https://www.nucamp.co/blog/coding-bootcamp-mauritius-mus-getting-a-job-in-tech-in-mauritius-in-2025-the-complete-guide)
