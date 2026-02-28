# ADR-002 : Architecture applicative -- monolithe modulaire vs microservices vs entre-deux

## Statut

**Proposition** -- 2026-02-27

## Contexte

BienBon.mu est une application de reduction du gaspillage alimentaire pour l'ile Maurice (modele Too Good To Go adapte au marche local). Le produit doit servir trois types d'utilisateurs via plusieurs interfaces :

- **Consommateurs** : app mobile + webapp PWA (decouverte, reservation, paiement, retrait QR, avis, gamification)
- **Partenaires** : app mobile + webapp (gestion commerce, creation paniers manuels et recurrents, validation retraits QR/PIN, analytics, reversements)
- **Administrateurs** : webapp backoffice (dashboard KPI temps reel, gestion partenaires/consommateurs, moderation, claims, finance/ledger, audit trail, detection fraude)

Le scope fonctionnel est substantiel : 206 user stories reparties en 4 modules (69 consommateur, 45 partenaire, 43 admin, 49 transversal). Les exigences cles qui impactent l'architecture :

- **Paiements** : 4 methodes locales (carte bancaire, MCB Juice, Blink/Emtel, my.t money) avec pre-autorisation, tokenisation, conformite PCI DSS
- **Temps reel** : stock paniers en temps reel (concurrence reservations), notifications push < 30s, mise a jour reservations partenaire en live, dashboard admin rafraichi toutes les 5 min
- **Geolocalisation** : carte interactive, tri par proximite, calcul distances
- **QR/PIN** : generation et validation de codes de retrait
- **Finance** : ledger de commissions, releves de reversement mensuels, generation PDF
- **Anti-fraude** : detection de patterns suspects (comptes multiples, reclamations abusives, no-shows recurrents)
- **i18n** : francais, anglais, creole mauricien
- **PWA** : service worker, mode hors ligne partiel, installation ecran d'accueil
- **Emails** : 14 templates transactionnels et marketing
- **Accessibilite** : WCAG 2.1 AA

Contraintes de l'equipe :
- **Startup early-stage**, 2 a 5 developpeurs
- Budget limite, marche geographiquement restreint (ile Maurice, ~1.3M habitants)
- Besoin de livrer un MVP rapidement pour valider le product-market fit
- Le projet est actuellement en phase bibliotheque de composants UI (Storybook + React) ; aucun backend n'existe encore

---

## Options considerees

### Option 1 : Monolithe modulaire strict

Un seul service backend deploye comme une unite. Le code est organise en modules internes fortement decouvles par des frontieres de package/namespace claires.

**Structure type (architecture hexagonale pragmatique, cf. ADR-024) :**

Les modules NestJS sont organises par bounded context DDD. Les modules complexes (Ordering, Payment, Catalog, Partner, Claims) adoptent une architecture hexagonale legere avec domaine/ports/adapters. Les modules simples (Favorites, Notifications, Media) restent en CRUD NestJS classique.

```
backend/
  src/
    modules/
      identity-access/    # Bounded Context : auth Supabase, RBAC, sessions (cf. ADR-010, ADR-011)
      consumer/           # BC : profil, preferences, favoris, gamification, parrainage
      partner/            # BC : onboarding, multi-commerce, modification requests, stats
        domain/           # entities, value objects, rules (zero dependance framework)
        ports/            # interfaces abstraites (ex: StorageProvider)
        adapters/         # implementations des ports
        services/         # NestJS services
      catalog/            # BC : paniers, stock, recurrence, tags, categories, creneaux
        domain/
        ports/
        adapters/
        services/
      ordering/           # BC : reservations, state machine 8 etats, concurrence stock
        domain/
        ports/
        adapters/
        services/
        fulfillment/      # sous-module : pickup QR/PIN, no-show
      payment/            # BC : ledger double-entry, commissions, payouts, 4 PSP
        domain/
        ports/            # PaymentGateway (Peach, MCB Juice, Blink, my.t money)
        adapters/
        services/
      review-claims/      # BC : avis/notes, reclamations, remboursements
        domain/
        ports/
        adapters/
        services/
      notification/       # BC : push (FCM), email (Resend), in-app, preferences
      fraud/              # BC : regles, compteurs, alertes, suspension
      admin/              # BC : dashboard KPI, moderation, config, audit
      media/              # upload photos, recompression
    shared/               # types communs, utils, middlewares, domain events
  prisma/
    schema.prisma         # schema Prisma unique (cf. ADR-001, ADR-003)
    migrations/
```

- **Base de donnees** : une seule instance PostgreSQL, schemas par module (`auth.*`, `reservations.*`, `payments.*`, etc.)
- **Communication inter-modules** : appels de fonctions in-process, pas de reseau
- **Deploiement** : un seul artefact (conteneur Docker), un seul processus
- **Background jobs** : file d'attente en base (pg-boss, BullMQ + Redis) pour les taches asynchrones (emails, notifications push, generation PDF, anti-fraude)

### Option 2 : Microservices des le depart

Chaque domaine metier est un service independant avec sa propre base de donnees, deploye et scale independamment.

**Services :**
```
services/
  api-gateway/         # routage, rate limiting, auth verification
  auth-service/        # inscription, connexion, tokens, OAuth
  consumer-service/    # profils, favoris, gamification
  partner-service/     # onboarding, gestion commerce
  basket-service/      # paniers, stock, recurrence
  reservation-service/ # reservations, concurrence, annulations
  payment-service/     # 4 methodes paiement, PCI
  pickup-service/      # QR, PIN, validation
  notification-service/# push, emails, in-app
  admin-service/       # dashboard, moderation
  finance-service/     # commissions, ledger, PDF
  fraud-service/       # detection, alertes
  media-service/       # upload, recompression images
```

- **Bases de donnees** : une par service (PostgreSQL, Redis, etc.)
- **Communication** : REST/gRPC synchrone + message broker (RabbitMQ/NATS) pour les evenements asynchrones
- **Deploiement** : 13+ conteneurs, orchestration Kubernetes ou equivalent
- **Observabilite** : tracing distribue (Jaeger/Tempo), correlation de logs, service mesh

### Option 3 : Monolithe modulaire avec extraction progressive

Demarrer comme l'Option 1 (monolithe modulaire), mais avec des frontieres de modules suffisamment propres pour permettre l'extraction de certains services quand la charge ou les contraintes reglementaires le justifient.

**Phase 1 (MVP -> 1 000 utilisateurs) :**
Monolithe modulaire identique a l'Option 1. Un seul deploiement, une seule base, background jobs via une file d'attente.

**Phase 2 (1 000 -> 10 000 utilisateurs) -- extractions candidats :**
- **Notifications** (push + emails) : volume eleve, asynchrone par nature, zero dependance transactionnelle avec le domaine metier. Extraction vers un worker dedie consommant une file de messages.
- **Media processing** (images) : CPU-intensif (recompression, redimensionnement), isolable comme un worker serverless decouple.
- **Generation PDF** (releves, factures) : CPU-intensif, ponctuel (mensuel), facilement decouplable.

**Phase 3 (si necessaire, >10 000 utilisateurs) :**
- **Paiements** : si les exigences PCI DSS ou la charge le necessitent, extraction vers un service isole avec sa propre base (tokens de carte jamais exposes au monolithe).
- **Anti-fraude** : si le volume de donnees a analyser justifie un traitement batch/stream separe.

La regle : on n'extrait un service que quand on a une raison concrete (charge, reglementation, equipe dediee), jamais par anticipation.

### Option 4 : Backend-as-a-Service (Supabase) + fonctions serverless

Utiliser Supabase comme socle d'infrastructure, avec des Edge Functions pour la logique metier qui depasse le CRUD.

**Architecture :**
```
supabase/
  migrations/         # schema PostgreSQL via Supabase
  functions/
    process-payment/  # integration MCB Juice, Blink, my.t money
    validate-pickup/  # verification QR/PIN
    generate-pdf/     # releves de reversement
    fraud-check/      # analyse patterns
    send-notification/# push via FCM/APNs
  storage/            # photos commerces, paniers
```

- **Auth** : Supabase Auth (email, phone, OAuth Google/Apple/Facebook)
- **Base de donnees** : PostgreSQL hebergee par Supabase, Row Level Security (RLS) pour l'isolation des donnees par role
- **Temps reel** : via Edge Functions ou polling (note : le projet a choisi SSE + pg_notify via NestJS pour le temps reel, cf. ADR-009, au lieu de Supabase Realtime)
- **Storage** : Supabase Storage pour les photos avec transformations d'images integrees
- **Edge Functions** : Deno/TypeScript pour la logique metier complexe (paiements, generation PDF, anti-fraude)
- **Emails** : integration avec un service tiers (Resend, Postmark) depuis les Edge Functions
- **Deploiement** : zero infra a gerer, tout est heberge

---

## Criteres de decision

| Critere | Poids | Description |
|---------|-------|-------------|
| **Velocite de developpement** | Critique | Temps pour livrer le MVP. Une petite equipe ne peut pas se permettre de passer des semaines sur de l'infra. |
| **Complexite operationnelle** | Critique | Cout DevOps : deploiement, monitoring, debugging, on-call. Moins il y a de pieces mobiles, mieux c'est. |
| **Cout d'infrastructure** | Eleve | Budget startup. Le cout mensuel pour 0 a 10 000 utilisateurs doit rester bas (< 100-200 USD/mois). |
| **Isolation paiements/PCI** | Eleve | Les donnees de cartes bancaires exigent une isolation. Meme avec tokenisation (le PSP gere les cartes), le flux de paiement doit etre auditable et securise. |
| **Scalabilite** | Moyen | L'ile Maurice a ~1.3M habitants. Le plafond realiste est 50 000-100 000 utilisateurs. On n'a pas besoin de l'architecture de Uber. |
| **Testabilite** | Moyen | Facilite a ecrire et executer des tests (unitaires, integration, E2E). |
| **Flexibilite technique** | Moyen | Capacite a changer de techno, ajouter des fonctionnalites, pivoter. |
| **Risque de dette technique** | Moyen | Probabilite de devoir refactorer lourdement dans 12-18 mois. |
| **Vendor lock-in** | Faible-Moyen | Dependance a un fournisseur specifique. Acceptable si la valeur est elevee, mais a evaluer. |

---

## Analyse comparative

### Velocite de developpement

| Option | Evaluation | Justification |
|--------|-----------|---------------|
| 1. Monolithe modulaire | Excellente | Un seul projet, zero overhead reseau, debugging direct, refactoring simple. Les appels entre modules sont de simples appels de fonctions. |
| 2. Microservices | Faible | Chaque feature necessite de toucher plusieurs services, definir des contrats API, gerer la serialisation, le versioning. Un dev seul ne peut pas travailler efficacement sur un flux transversal (ex: reservation -> paiement -> notification). |
| 3. Monolithe + extraction | Excellente | Identique au monolithe en Phase 1. L'extraction n'arrive que quand l'equipe est plus grande et le besoin reel. |
| 4. BaaS (Supabase) | Tres bonne | Auth, DB, storage sont "gratuits" en termes de code. Mais les Edge Functions ont des limitations (cold starts, 50ms CPU limit sur le plan gratuit, debugging limite). La logique metier complexe (anti-fraude, generation PDF, workflows de paiement multi-etapes) est contrainte par l'environnement serverless. Le temps reel est mieux gere par SSE via NestJS (cf. ADR-009). |

### Complexite operationnelle

| Option | Evaluation | Justification |
|--------|-----------|---------------|
| 1. Monolithe | Minimale | 1 conteneur + 1 DB + 1 Redis. Un `docker compose up` suffit en dev. Un seul pipeline CI/CD. Logs centralises par nature. |
| 2. Microservices | Tres elevee | 13+ services a deployer, monitorer, debugger. Besoin de Kubernetes ou equivalent. Tracing distribue obligatoire. Gestion des versions d'API entre services. Un incident en prod peut necessiter de lire les logs de 5 services differents. |
| 3. Monolithe + extraction | Minimale -> Moderee | Demarre minimal, evolue graduellement. Chaque extraction ajoute une piece, mais on ne le fait que quand on a la maturite operationnelle pour le gerer. |
| 4. BaaS (Supabase) | Faible | Zero serveur a gerer. Mais : debugging des Edge Functions est limite (pas de debugger step-by-step en production), les logs Supabase sont basiques, et si un probleme survient dans l'infra Supabase elle-meme, on est impuissants. |

### Cout d'infrastructure (estimation 0-10 000 utilisateurs)

| Option | Cout mensuel estime | Detail |
|--------|-------------------|--------|
| 1. Monolithe | 35-55 USD | Railway PaaS (~7-15 USD) + Supabase Pro PostgreSQL (25 USD) + Railway Redis (~3-5 USD) + domaine/SSL + Cloudflare R2 storage (~5 USD). (cf. ADR-020) |
| 2. Microservices | 200-500 USD | Kubernetes cluster ou 5-8 VPS + managed DB par service + message broker + monitoring stack (Grafana/Prometheus) + tracing |
| 3. Monolithe + extraction | 35-120 USD | Commence comme #1 sur Railway, ajoute 1-2 workers dedies si necessaire (~20-40 USD supplementaires). (cf. ADR-020) |
| 4. BaaS (Supabase) | 25-75 USD | Plan Pro Supabase (25 USD/mois) couvre 8 GB DB, 250 GB storage, 500K Edge Function invocations. Au-dela, les couts montent vite. Ajout d'un service d'emails (Resend : 20 USD/mois pour 50K emails). |

### Isolation paiements / PCI DSS

**Point cle** : BienBon n'a probablement PAS besoin d'etre PCI DSS compliant directement. Les 4 methodes de paiement (carte, MCB Juice, Blink, my.t money) passent toutes par des prestataires de paiement (PSP) locaux qui gerent la conformite PCI. BienBon ne voit jamais les numeros de carte complets -- seulement des tokens.

Ce qui reste a securiser cote BienBon :
- Les flux de pre-autorisation / capture / remboursement (appels API vers les PSP)
- Les tokens de cartes enregistrees
- Le ledger des commissions et reversements
- Les logs d'audit des transactions

| Option | Evaluation | Justification |
|--------|-----------|---------------|
| 1. Monolithe | Acceptable | Le module `payments/` est isole dans le code. Les tokens de carte sont chiffres en base. Les appels PSP passent par un client dedie. L'audit trail est une table dediee. Pour le niveau de risque d'une startup a Maurice, c'est suffisant. |
| 2. Microservices | Overkill | Isolation physique maximale, mais le surcout operationnel n'est pas justifie quand le PSP gere deja le PCI. |
| 3. Monolithe + extraction | Optimal | Si un jour un audit PCI l'exige, le module `payments/` peut etre extrait en service isole. Mais on ne le fait pas tant que le PSP fait le gros du travail. |
| 4. BaaS (Supabase) | Acceptable avec reserves | Les Edge Functions sont isolees par nature. Mais le stockage des tokens en base Supabase signifie que la securite depend entierement de la configuration RLS et du chiffrement Supabase. Moins de controle. |

### Testabilite

| Option | Evaluation | Justification |
|--------|-----------|---------------|
| 1. Monolithe | Excellente | Tests unitaires par module, tests d'integration avec une seule DB de test, tests E2E directs. Pas de mocks de services externes (sauf les PSP). `vitest` ou `jest` couvre tout. |
| 2. Microservices | Complexe | Chaque service est testable individuellement, mais les tests d'integration necessitent de lancer plusieurs services + message broker + DBs. Les tests E2E sont fragiles car ils dependent de la disponibilite de tous les services. |
| 3. Monolithe + extraction | Excellente -> Bonne | Comme #1 au depart. Quand un service est extrait, on ajoute des tests de contrat (Pact ou equivalent) pour valider l'interface. |
| 4. BaaS (Supabase) | Moderee | Supabase CLI permet de lancer une instance locale pour les tests. Mais les Edge Functions sont plus difficiles a tester en isolation. La logique RLS (Row Level Security) necesssite des tests specifiques. |

### Risque de dette technique

| Option | Evaluation | Justification |
|--------|-----------|---------------|
| 1. Monolithe | Modere | Risque de "big ball of mud" si les frontieres de modules ne sont pas respectees. Attenuation : linting strict des imports, architecture hexagonale legere, code reviews. |
| 2. Microservices | Eleve (paradoxalement) | La dette technique se cache dans les contrats API, la gestion de versions, les workflows de deploiement, et le glue code inter-services. La complexite distribuee est invisible jusqu'a ce qu'elle explose. |
| 3. Monolithe + extraction | Faible-Modere | On ne complexifie que quand on sait pourquoi. La dette technique d'un monolithe propre est plus facile a rembourser que celle d'un systeme distribue. |
| 4. BaaS (Supabase) | Modere-Eleve | La logique metier dans les Edge Functions est difficile a refactorer. Les migrations de schema avec RLS deviennent complexes. Si on doit quitter Supabase un jour, la migration est couteuse (Auth, Storage sont proprietaires). |

---

## Analyse frontend : strategie multi-app

### Sous-question : une seule app Flutter ou des apps separees ?

Le projet doit servir 3 profils tres differents :

| Interface | Utilisateurs | Plateforme cible | Complexite UI |
|-----------|-------------|-----------------|---------------|
| App consommateur | Grand public, milliers | Mobile (iOS/Android) + PWA | Elevee (carte, recherche, paiement, QR, gamification) |
| App partenaire | Commercants, centaines | Mobile (iOS/Android) + web optionnel | Moyenne (dashboard, gestion paniers, scanner QR, stats) |
| Backoffice admin | Equipe BienBon, 2-5 personnes | Web uniquement | Elevee (tableaux, graphiques, formulaires, moderation) |

### Option A : App Flutter unique avec routing conditionnel par role

```
bienbon-app/
  lib/
    features/
      consumer/    # 69 US
      partner/     # 45 US
      admin/       # 43 US
      shared/      # auth, i18n, design system
    routing/
      role_router.dart  # redirection selon le role
```

**Avantages :**
- Un seul repo, une seule CI/CD
- Partage maximal du code (auth, design system, networking)

**Inconvenients :**
- **Build size mobile** : l'app consommateur embarquerait tout le code partenaire et admin (tree-shaking Flutter est limite pour le code Dart). Estimation : +2-3 MB inutiles pour un consommateur.
- **Temps de build** : plus le codebase grandit, plus les builds rallongent.
- **Separation des concerns** : risque de couplage accidentel entre les modules.
- **Deploiement** : une correction admin necessite de republier l'app mobile consommateur.

### Option B : Apps Flutter separees avec packages partages (monorepo Melos)

```
bienbon/
  apps/
    consumer/      # app mobile + PWA consommateur
    partner/       # app mobile partenaire
    admin_web/     # webapp backoffice admin
  packages/
    bienbon_core/        # modeles, networking, auth client
    bienbon_ui/          # design system, composants partages
    bienbon_payments/    # logique paiement cote client
    bienbon_i18n/        # traductions FR/EN/Creole
    bienbon_analytics/   # tracking, events
```

**Avantages :**
- **Build size optimal** : l'app consommateur n'embarque que ce dont elle a besoin. Estimation : 15-25 MB (normal pour Flutter) au lieu de 20-30 MB.
- **Deploiement independant** : une correction admin web ne touche pas l'app mobile consommateur.
- **Separation claire** : impossible de coupler accidentellement le code admin avec le code consommateur.
- **Equipe** : quand l'equipe grandit, un dev peut travailler sur l'app partenaire sans connaitre l'app consommateur.

**Inconvenients :**
- Configuration initiale plus lourde (Melos, CI/CD pour 3 apps)
- Synchronisation des versions de packages partages

### Option C : Flutter pour mobile + web framework separe (React/Next.js) pour le backoffice admin

```
bienbon/
  apps/
    mobile/            # Flutter : consumer + partner (2 flavors ou 2 apps)
    admin_web/         # React + TypeScript (reutilise le design system Storybook existant)
  packages/
    bienbon_core/      # modeles, networking (Flutter)
    bienbon_ui/        # design system Flutter
```

**Avantages :**
- Le backoffice admin est une webapp classique : tableaux, formulaires, graphiques. React/Next.js excelle pour ce cas d'usage avec un ecosysteme riche (TanStack Table, Recharts, react-hook-form).
- Le projet a deja une bibliotheque de composants React dans `storybook-ui/`. On capitalise sur ce travail existant.
- Flutter Web reste moins mature que React pour les interfaces admin-heavy (rendering de grands tableaux, accessibilite, SEO).

**Inconvenients :**
- Deux stacks frontend a maintenir (Flutter + React)
- Pas de partage de composants UI entre mobile et admin web (sauf via le design system en tokens CSS/Figma)
- Deux equipes de competences ou des devs polyvalents

### Recommandation frontend

**Option B (apps Flutter separees avec packages partages) pour le mobile et le partenaire web. Option C hybride pour l'admin.**

Raisonnement :
1. **Consumer + Partner en Flutter** : apps mobiles natives, experience optimale, PWA pour le consommateur. Deux apps separees dans un monorepo Melos, partageant des packages.
2. **Admin en React/TypeScript** : le backoffice admin est 100% web, data-heavy (tableaux de KPIs, listes paginées, graphiques, formulaires de moderation). React est le meilleur outil pour ce job. Le projet possede deja `storybook-ui/` avec 15 composants et un design system operationnel -- c'est une base concrete.
3. **Si l'equipe est trop petite pour deux stacks** (2 devs) : tout en Flutter (Option B). On sacrifie un peu d'ergonomie admin web, mais on garde une seule stack. La decision peut etre revue quand l'equipe grandit.

---

## Decision recommandee

### Backend : Option 3 -- Monolithe modulaire avec extraction progressive

**Justification point par point :**

1. **C'est le choix pragmatique pour une startup de 2-5 devs.** Un monolithe modulaire permet de livrer vite sans overhead operationnel. Chaque developpeur peut travailler sur n'importe quel module sans comprendre un systeme distribue. Le debugging est trivial : un seul processus, un seul fichier de logs, un seul debugger.

2. **Le marche le permet.** L'ile Maurice a 1.3 million d'habitants. Meme avec un succes exceptionnel (10% de penetration des actifs connectes), on parle de ~50 000 utilisateurs actifs. Un monolithe bien ecrit sur Railway PaaS a ~40 USD/mois (API + Redis + Supabase DB) gere ca sans transpirer. PostgreSQL sur une seule instance gere des millions de lignes sans probleme. (cf. ADR-020)

3. **Les microservices ne resolvent aucun probleme qu'on a aujourd'hui.** On n'a pas de probleme de scalabilite (zero utilisateurs). On n'a pas de probleme d'equipe (pas 50 devs qui se marchent dessus). On n'a pas de probleme de deploiement (pas 100 deployements par jour). Les microservices resolvent les problemes des grandes organisations. Nous, on a les problemes d'une startup : aller vite, ne pas mourir.

4. **L'extraction progressive est une assurance gratuite.** En structurant le monolithe avec des frontieres de modules claires (interfaces, pas d'imports croisees non autorises, communication par events internes), on garde la possibilite d'extraire un service le jour ou le besoin se presente. Les candidats naturels sont identifies :
   - **Notifications** (async, decouple) : premier candidat a l'extraction
   - **Media processing** (CPU-intensif) : extraction vers un worker quand le volume de photos le justifie
   - **Generation PDF** (ponctuel, CPU-intensif) : extraction triviale vers un job background dedie

5. **Supabase (Option 4) est tentant mais risque.** Pour un MVP, Supabase accelere enormement le demarrage. Mais les limitations apparaissent vite :
   - Les Edge Functions ont un timeout de 60s et un cold start de 200-500ms -- genant pour les workflows de paiement multi-etapes (pre-autorisation -> verification stock -> decrementation -> notification, le tout en temps reel sous US-C025).
   - Le ledger financier (commissions, reversements, fee minimum) est une logique metier complexe avec des calculs critiques (US-A027, US-A028). Elle merite un code testable dans un vrai framework, pas des snippets dans des Edge Functions.
   - La detection anti-fraude (US-A038 a US-A041) necessite des requetes analytiques complexes sur l'historique -- faisable avec PostgreSQL de Supabase, mais les Edge Functions ne sont pas le bon endroit pour du batch processing.
   - Le vendor lock-in est reel : Auth et Storage sont des abstractions Supabase. Migrer vers une autre solution dans 2 ans implique de reecrire ces couches. (Note : le temps reel est gere par SSE + pg_notify via NestJS, pas par Supabase Realtime, ce qui reduit le lock-in, cf. ADR-009.)
   - **Pour autant** : si l'equipe est de 2 devs et veut un MVP en 3 mois, Supabase reste une option pragmatique pour la Phase 1, avec un plan de migration vers un backend custom pour la Phase 2. Cette ADR ne l'interdit pas -- elle recommande de ne pas en faire l'architecture cible a long terme.

### Frontend : Option B (monorepo Melos Flutter) + admin React + vitrine Astro

Voir la section "Recommandation frontend" ci-dessus.

**Structure monorepo globale :**
```
bienbon/
  apps/
    consumer/        # Flutter mobile + PWA consommateur
    partner/         # Flutter mobile partenaire
  packages/
    bienbon_core/    # modeles, networking, auth client Supabase
    bienbon_ui/      # design system Flutter
    bienbon_payments/# logique paiement cote client
    bienbon_i18n/    # traductions FR/EN/Creole (slang, cf. ADR-015)
  backend/           # NestJS (Fastify) + Prisma + BullMQ
  admin-web/         # React/TypeScript (backoffice admin)
  storybook-ui/      # Bibliotheque de composants React (existant)
  vitrine/           # Astro (site marketing bienbon.mu, cf. ADR-013)
  dev-specs/         # Specifications et user stories
```

---

## Architecture recommandee -- vue d'ensemble

```
                    +----------------------------+
                    |   Clients                  |
                    |                            |
                    |  [Consumer App]  Flutter mobile + PWA     \
                    |  [Partner App]   Flutter mobile + web      } Monorepo Melos
                    |  [Admin Web]     React/TypeScript         /
                    |  [Site Vitrine]  Astro (bienbon.mu)      (cf. ADR-013)
                    +------------+---------------+
                                 |
                                 | HTTPS / REST API + SSE
                                 |
                    +------------v---------------+
                    |   Cloudflare (CDN + WAF)   |   (cf. ADR-020)
                    |   DDoS, cache, SSL, rate   |
                    +------------+---------------+
                                 |
                    +------------v---------------+
                    |   Railway PaaS (Singapour)  |  (cf. ADR-020)
                    |                             |
                    |   API Backend NestJS        |
                    |   (Monolithe modulaire --   |
                    |    arch. hexagonale          |
                    |    pragmatique, cf. ADR-024) |
                    |                             |
                    |  Bounded Contexts :         |
                    |  +----------+ +---------+   |
                    |  | Identity | | Consumer|   |
                    |  | & Access | |         |   |
                    |  +----------+ +---------+   |
                    |  +----------+ +---------+   |
                    |  | Catalog  | | Ordering|   |
                    |  |          | | +Fulfill|   |
                    |  +----------+ +---------+   |
                    |  +----------+ +---------+   |
                    |  | Payment  | | Partner |   |
                    |  |          | |         |   |
                    |  +----------+ +---------+   |
                    |  +----------+ +---------+   |
                    |  | Notif.   | | Review  |   |
                    |  |          | | & Claims|   |
                    |  +----------+ +---------+   |
                    |  +----------+ +---------+   |
                    |  | Fraud    | | Admin   |   |
                    |  +----------+ +---------+   |
                    +------------+----------------+
                                 |
              +------------------+------------------+
              |                  |                  |
     +--------v------+  +-------v------+  +--------v------+
     | Supabase      |  | Railway      |  | Cloudflare R2 |
     | PostgreSQL    |  | Redis        |  | (photos,      |
     | + PostGIS     |  | (cache,      |  |  PDF)         |
     | + Auth        |  |  BullMQ      |  |               |
     | + Storage     |  |  job queue)  |  |               |
     +---------------+  +--------------+  +---------------+
```

### Stack technique recommandee

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Langage backend** | TypeScript (Node.js) ou Dart (si tout-Flutter) | TypeScript : ecosysteme NPM massif, meme langage que le frontend React existant, pool de devs large. Dart : coherence avec Flutter, mais ecosysteme backend plus restreint. **Recommandation : TypeScript.** |
| **Framework backend** | NestJS + adaptateur Fastify | Architecture modulaire native (modules, providers, guards), TypeScript-first, validation built-in, ~45K req/s via Fastify. Modules organises par bounded context DDD (cf. ADR-024). (cf. ADR-001) |
| **Base de donnees** | Supabase (PostgreSQL manage) + PostGIS | PostgreSQL complet via Supabase Pro (25 USD/mois). PostGIS pour la geolocalisation (cf. ADR-016). Auth + Storage integres. RLS pour la securite au niveau base. (cf. ADR-001) |
| **ORM** | Prisma (v7+) | DX excellente, migrations declaratives, type-safe. Prisma 7 (TypeScript pur, plus de moteur Rust) resout les problemes historiques de cold start. Pour les requetes complexes (ledger, anti-fraude), `prisma.$queryRaw` ou Kysely en complement. (cf. ADR-001) |
| **Cache / Queue** | Redis + BullMQ | Redis pour le cache (sessions, stock paniers en memoire) et comme broker pour BullMQ (queue de jobs pour emails, push, PDF, anti-fraude batch). |
| **Auth** | Supabase Auth (GoTrue) | Les US exigent : email, telephone/SMS (OTP via Twilio Verify), Google, Apple, Facebook. Supabase Auth gere nativement tous ces providers avec integration RLS. SDK Flutter officiel (`supabase_flutter`). JWT access token (1h) + refresh token (30j). (cf. ADR-010) |
| **Paiements** | Peach Payments (gateway) + adaptateurs PSP | Bounded context Payment avec ports & adapters (cf. ADR-024). Peach Payments comme gateway principal (cf. ADR-005). Adaptateurs pour chaque methode (carte, MCB Juice, Blink, my.t money). Tokenisation PCI-DSS via le PSP (cf. ADR-006). |
| **Emails** | Resend ou Postmark + React Email | 14 templates transactionnels. React Email permet de les coder en TSX (coherent avec le reste du stack). Resend pour l'envoi (bon DX, bon delivrability). |
| **Push notifications** | Firebase Cloud Messaging (FCM) + APNs | Standard de l'industrie. Un wrapper dans le module `notifications/`. |
| **Stockage fichiers** | Supabase Storage + Cloudflare R2 | Supabase Storage pour les photos des commerces et paniers (CDN + transformations d'images integrees). Cloudflare R2 en complement si besoin (zero egress fees). (cf. ADR-001, ADR-020) |
| **Geolocalisation** | PostGIS | Extension PostgreSQL pour les requetes spatiales (tri par distance, rayon de recherche). Deja integre, pas de service externe necessaire. |
| **Temps reel** | SSE (Server-Sent Events) + pg_notify | Endpoint SSE unique multiplexe par audience (`/sse/consumer`, `/sse/partner`, `/sse/admin`). Phase 1 : `pg_notify` comme bus d'events. Phase 2 : Redis Pub/Sub. FCM pour le push hors-app, polling pour le dashboard admin. (cf. ADR-009) |
| **PDF** | @react-pdf/renderer ou Puppeteer | Pour les releves de reversement mensuels (US-A028). React-pdf est plus leger ; Puppeteer si on veut un rendu pixel-perfect a partir de HTML/CSS. |
| **Monitoring** | Sentry (erreurs) + un logger structure (Pino) | Sentry a un plan gratuit genereux. Pino pour les logs structures JSON. Pas besoin de Grafana/Prometheus au debut. |
| **CI/CD** | GitHub Actions | Gratuit pour les repos prives (2000 min/mois). Build, test, deploy vers Railway via CLI ou webhook. (cf. ADR-025) |
| **Hebergement** | Railway PaaS (region Singapour) + Cloudflare (CDN + WAF) | Deploy Git-push, zero gestion serveur, Redis en 1 clic, preview environments. Cloudflare en reverse proxy pour la protection DDoS, le caching et le SSL. (cf. ADR-020) |

---

## Consequences

### Consequences positives

1. **Time-to-MVP reduit.** Un seul projet backend a configurer, un seul pipeline CI/CD, un seul environnement de dev. Estimation : un MVP fonctionnel (inscription, decouverte, reservation, paiement, retrait) en 3-4 mois avec 2-3 devs.

2. **Cout operationnel minimal.** ~40 USD/mois pour l'infrastructure complete (Railway PaaS + Supabase Pro + Redis + Cloudflare + domaine). Pas de Kubernetes, pas de service mesh, pas de factures cloud surprises. (cf. ADR-020)

3. **Debugging simple.** Un seul processus, un seul fichier de logs, des stack traces completes. Quand un bug survient en prod a 2h du matin, un seul dev peut le diagnostiquer en 10 minutes, pas en 2 heures.

4. **Onboarding rapide.** Un nouveau developpeur clone un repo, lance `docker compose up`, et a tout l'environnement local en 5 minutes. Pas besoin de comprendre 13 services et leurs interactions.

5. **Refactoring sans peur.** Renommer un champ, changer une interface entre modules -- c'est un refactoring compile-time, pas un changement d'API distribue qui necessite de coordonner 3 services.

### Consequences negatives

1. **Discipline requise.** Un monolithe sans discipline devient un "big ball of mud". Il faut des regles strictes : pas d'imports directs entre modules non autorises (lint rules), communication entre modules via des interfaces definies, code reviews exigeantes sur les frontieres de modules.

2. **Deploiement atomique.** Toute modification, meme mineure, redeploie tout le backend. Attenuation : les deploiements sont rapides (build + deploy < 2 min pour un projet TypeScript), et les blue-green deployments ou rolling updates sont simples avec un seul conteneur.

3. **Pas de scalabilite granulaire.** On ne peut pas scaler le module "reservations" independamment du module "admin". Attenuation : pour le volume mauricien, une seule instance Railway suffit. Si necessaire, Railway supporte le scaling horizontal (ajout d'instances). En dernier recours, migration vers un VPS Hetzner + Docker Compose. (cf. ADR-020)

4. **Le module notifications sera le premier goulot.** Avec 14 templates d'emails, des notifications push pour chaque reservation/retrait/favori, et des rappels programmes -- le volume de messages sortants sera le premier composant a saturer. C'est le premier candidat a l'extraction (worker BullMQ dedie).

---

## Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Le monolithe devient un spaghetti** | Moyenne | Eleve | Linting strict des imports inter-modules (`eslint-plugin-boundaries` ou equivalent). Architecture hexagonale pragmatique (cf. ADR-024) : les modules complexes ont des bounded contexts DDD avec ports & adapters, les dependances sont injectees. Code reviews systematiques sur les frontieres de modules. |
| **Le volume de notifications sature le processus principal** | Elevee | Moyen | Dès le jour 1, les emails et notifications push passent par une queue BullMQ. Le worker tourne dans le meme processus au debut, mais peut etre extrait en worker separe en 1 heure de travail. |
| **Un PSP local change son API** | Moyenne | Moyen | Pattern Adapter pour chaque PSP. Chaque integration est isolee derriere une interface `PaymentProvider`. Changer de PSP = ecrire un nouvel adaptateur, pas modifier le code metier. |
| **Les performances de recherche geographique se degradent** | Faible | Moyen | PostGIS est prevu pour gerer des millions de points. Index spatial GiST. Pour l'ile Maurice (~5000 commerces potentiels max), les performances ne seront jamais un probleme. |
| **Supabase aurait ete le bon choix finalement** | Faible | Faible | Supabase EST utilise comme DB managee + Auth + Storage (cf. ADR-001, ADR-010). Le backend NestJS garde le controle de la logique metier, du temps reel (SSE, cf. ADR-009) et des paiements. Pas de lock-in sur les Edge Functions ni Supabase Realtime. |
| **L'equipe n'a pas les competences NestJS** | Moyenne | Moyen | NestJS a une courbe d'apprentissage initiale (decorateurs, injection de dependances). Alternative : Fastify ou Hono avec une structure de dossiers manuelle. Le choix du framework est secondaire par rapport a la structure modulaire. |
| **Le build Flutter mobile devient trop lent avec le monorepo** | Faible | Faible | Melos gere les builds incrementaux. En pratique, les builds Flutter sont domines par la compilation native (Gradle/Xcode), pas par la taille du code Dart. |

---

## Plan d'action par phases

### Phase 0 -- Maintenant (en cours)
- Finaliser la bibliotheque de composants UI dans `storybook-ui/`
- Valider le design system avec des utilisateurs cibles (tests guerilla)
- Aucune decision backend n'est urgente

### Phase 1 -- MVP (mois 1-4)
- Initialiser le monorepo backend (NestJS + PostgreSQL + Redis)
- Implementer les modules : `auth`, `consumers`, `partners`, `baskets`, `reservations`, `payments` (1 PSP au debut, carte bancaire), `pickups`, `notifications` (emails + push via queue)
- Deployer sur Railway PaaS (region Singapour) avec Cloudflare en reverse proxy (cf. ADR-020)
- Initialiser le monorepo Flutter (Melos) avec l'app consommateur en priorite
- Scope MVP : inscription email, decouverte paniers, reservation, paiement carte, retrait QR, notifications basiques

### Phase 2 -- Post-MVP (mois 5-8)
- Ajouter les 3 PSP locaux (MCB Juice, Blink, my.t money)
- Implementer les modules : `finance` (ledger, commissions, releves), `fraud` (signaux basiques), `admin` (dashboard, moderation)
- App partenaire Flutter
- Backoffice admin React (ou Flutter Web)
- i18n FR/EN/Creole

### Phase 3 -- Croissance (mois 9-12)
- Gamification et parrainage consommateur
- Paniers recurrents partenaire
- Analytics partenaire avancees
- Si le volume le justifie : extraction du worker notifications en processus separe
- Optimisation performance, cache agressif, CDN pour les assets statiques

### Phase 4 -- Scale (si necessaire, mois 12+)
- Extraction paiements en service isole (si audit PCI l'exige)
- Extraction media processing en worker serverless (si volume photos > 10K/mois)
- Replicas PostgreSQL en lecture (si les requetes dashboard admin ralentissent les requetes temps reel)

---

## Index des ADR du projet

Les 28 ADR du projet BienBon.mu couvrent l'ensemble des decisions architecturales. Cette ADR-002 doit rester coherente avec toutes les autres.

| ADR | Sujet |
|-----|-------|
| ADR-001 | Stack Backend (NestJS + Fastify + Prisma + Supabase) |
| **ADR-002** | **Architecture Applicative** (ce document) |
| ADR-003 | Schema Base de Donnees |
| ADR-004 | Strategie API (REST + OpenAPI) |
| ADR-005 | Architecture Paiement (Peach Payments) |
| ADR-006 | PCI-DSS & Tokenisation |
| ADR-007 | Ledger & Commissions |
| ADR-008 | Double-Booking & Stock Sync |
| ADR-009 | Strategie Temps Reel (SSE + pg_notify) |
| ADR-010 | Strategie Authentification (Supabase Auth) |
| ADR-011 | Modele Autorisation RBAC |
| ADR-012 | Offline-First & Cache (Drift/SQLite) |
| ADR-013 | PWA & Distribution Web (Astro vitrine) |
| ADR-014 | Notifications Multicanal (FCM + Resend) |
| ADR-015 | Strategie i18n (slang + i18next) |
| ADR-016 | Geolocalisation & Carte (flutter_map + MapTiler) |
| ADR-017 | State Machines Metier |
| ADR-018 | Workflow Approbation Admin |
| ADR-019 | Detection Fraude |
| ADR-020 | Hebergement & Infrastructure (Railway + Cloudflare) |
| ADR-021 | Conformite Data Protection (DPA 2017) |
| ADR-022 | Securite Applicative OWASP |
| ADR-023 | Strategie Tests (TDD + Vitest + Stryker) |
| ADR-024 | Domain-Driven Design |
| ADR-025 | Pipeline CI/CD Securise |
| ADR-026 | Qualite Code IA & Guardrails |
| ADR-027 | Principes SOLID & Design |
| ADR-028 | Git Worktrees Multi-Agent |

---

## References

### ADR connexes

- **ADR-001** : Stack Backend (NestJS + Fastify + Prisma + Supabase)
- **ADR-009** : Strategie Temps Reel (SSE + pg_notify) -- remplace Supabase Realtime
- **ADR-010** : Strategie Authentification (Supabase Auth) -- remplace Lucia Auth
- **ADR-013** : PWA & Distribution Web (Astro vitrine)
- **ADR-020** : Hebergement & Infrastructure (Railway + Cloudflare) -- remplace VPS
- **ADR-024** : Domain-Driven Design -- bounded contexts, architecture hexagonale pragmatique

### Specifications

- User Stories analysees : `dev-specs/us/01-consommateur/` (69 US), `dev-specs/us/02-partenaire/` (45 US), `dev-specs/us/03-admin/` (43 US), `dev-specs/us/04-web-emails-transversal/` (49 US)
- Design System : `DESIGN_SYSTEM.md`
- Composants UI existants : `storybook-ui/src/components/` (15 composants React + Storybook)

### Ouvrages et articles

- Martin Fowler, "MonolithFirst" (2015) : https://martinfowler.com/bliki/MonolithFirst.html
- Sam Newman, "Building Microservices" -- Chapitre 3 : "Don't start with microservices"
- Kelsey Hightower (2020) : "Monoliths are the future" (tweet devenu reference)
- Vaughn Vernon, "Implementing Domain-Driven Design" (2013) -- reference pour les bounded contexts et l'architecture hexagonale
