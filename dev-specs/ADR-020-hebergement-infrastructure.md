# ADR-020 : Hebergement et infrastructure

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir

---

## Contexte

BienBon.mu est une marketplace mobile de paniers anti-gaspi a l'ile Maurice (1.3M habitants). La stack technique est decidee (cf. ADR-001, ADR-002) :

- **Backend** : NestJS (Node.js) + Prisma
- **DB** : Supabase (PostgreSQL manage + Auth + Storage) -- temps reel via SSE + `pg_notify` cote NestJS (cf. ADR-009)
- **Cache/Queue** : Redis + BullMQ
- **Mobile** : Flutter (2 apps : consumer + partner)
- **Admin web** : React
- **Emails** : Resend (React Email)
- **Push** : Firebase Cloud Messaging (FCM)
- **Paiements** : Peach Payments (gateway locale)

### Composants a heberger

| # | Composant | Nature | Contraintes |
|---|-----------|--------|-------------|
| 1 | **API NestJS** | Serveur Node.js, stateless, scalable horizontalement | Latence faible vers Supabase, 24/7 |
| 2 | **BullMQ workers** | Processus Node.js consommant les queues Redis | Meme runtime que l'API, peut tourner sur le meme serveur |
| 3 | **Redis** | Cache + message broker BullMQ | Persistance optionnelle (les donnees sont reconstructibles) |
| 4 | **Supabase** | PostgreSQL + Auth + Storage | Deja manage, cloud Supabase (AWS). Temps reel via SSE NestJS (ADR-009), pas Supabase Realtime. |
| 5 | **Admin React** | SPA statique (fichiers HTML/JS/CSS) | CDN ou hosting statique |
| 6 | **Site vitrine** | Pages marketing statiques | CDN ou hosting statique |
| 7 | **Flutter Web** | SPA statique (si deploye en web) | CDN ou hosting statique |

### Contraintes

- **Budget startup** : minimum viable, scaling progressif. Cible < 100 USD/mois au lancement.
- **Latence depuis Maurice** : les utilisateurs sont a Maurice, les serveurs doivent etre proches. Les cables sous-marins SAFE, LION et T3 relient Maurice a l'Afrique du Sud, l'Europe et l'Asie.
- **Data Protection Act 2017 (Maurice)** : pas d'obligation stricte de data residency. Les transferts hors territoire sont autorises si le pays destinataire assure un niveau de protection equivalent, ou si le responsable de traitement fournit des garanties appropriees au Data Protection Commissioner (section 36 de la loi). Le consentement explicite de l'utilisateur est aussi un motif valide.
- **Equipe petite** (2-5 devs) : pas de DevOps dedie. L'infra doit etre simple a operer, deployer et debugger.
- **Disponibilite** : pas de SLA enterprise requis. 99.5%+ suffisant au demarrage (soit ~3.6h de downtime autorisees par mois).

### Connectivite sous-marine de Maurice

Maurice est connectee au monde via trois cables sous-marins principaux :

| Cable | Destinations | Capacite | Latence vers Durban |
|-------|-------------|----------|---------------------|
| **SAFE** | Afrique du Sud, Inde, Malaisie, Europe (via SAT-3) | 130 Gbps (upgraded) | ~35 ms |
| **LION** | La Reunion, Madagascar (liaison vers EASSy/TEAMS) | 1.28 Tbps | N/A |
| **T3** | Afrique du Sud (direct, 3 200 km) | 54 Tbps (4 paires de fibres) | 35 ms Arsenal-Durban, 45 ms vers Johannesburg |

La connectivite la plus rapide et la plus fiable est vers l'Afrique du Sud (T3, cable neuf de 2023, 54 Tbps de capacite). L'Europe est accessible via SAFE/SAT-3, avec une latence supplementaire de ~80-100 ms au-dela de l'Afrique du Sud. Singapour est accessible via SAFE/cable indien, avec une latence comparable a l'Europe.

---

## Question 1 : Region du serveur

### Analyse de latence depuis Maurice

| Region AWS | Localisation | Latence estimee depuis Maurice | Cable utilise | Disponibilite Supabase |
|------------|-------------|-------------------------------|---------------|----------------------|
| `af-south-1` | Cape Town, Afrique du Sud | **40-60 ms** | T3 direct (35 ms) + routage terrestre | **Non disponible** sur Supabase |
| `eu-west-1` | Irlande | **150-180 ms** | T3/SAFE -> SAT-3 -> Europe | Oui |
| `eu-west-2` | Londres | **140-170 ms** | T3/SAFE -> SAT-3 -> Europe | Oui |
| `eu-central-1` | Francfort | **150-180 ms** | T3/SAFE -> SAT-3 -> Europe | Oui |
| `ap-southeast-1` | Singapour | **120-160 ms** | SAFE -> cable sous-marin Inde-Asie | Oui |
| `ap-south-1` | Mumbai | **100-140 ms** | SAFE direct vers l'Inde | Oui |

### Contrainte Supabase

Supabase ne propose **pas** la region `af-south-1` (Cape Town). Les regions Supabase disponibles les plus proches sont :

- **`ap-south-1` (Mumbai)** : ~100-140 ms depuis Maurice
- **`ap-southeast-1` (Singapour)** : ~120-160 ms depuis Maurice
- **`eu-west-1/2` (Irlande/Londres)** : ~140-180 ms depuis Maurice

### Imperatif : colocation backend + database

Le backend NestJS communique en permanence avec PostgreSQL (Supabase). La latence inter-service est le facteur dominant. Il est **imperatif** que le backend NestJS et l'instance Supabase soient dans la **meme region AWS** (ou tres proches), pour obtenir une latence inter-service < 5 ms.

La latence utilisateur (mobile -> API) est moins critique car une requete API typique fait 1 aller-retour, tandis qu'un traitement backend peut faire 5-20 requetes DB.

### Decision region

**Region retenue : `ap-southeast-1` (Singapour)**

**Justification :**

1. **Latence acceptable depuis Maurice** : 120-160 ms, comparable a l'Europe. Mumbai serait 20-30 ms plus rapide, mais Singapour offre un meilleur ecosysteme cloud (plus de services, meilleur peering CDN, plus de PaaS disponibles).

2. **Colocation possible** : Supabase et la majorite des PaaS (Railway, Render, Fly.io) proposent Singapour. Le backend NestJS et Supabase seront dans la meme region, avec une latence inter-service < 2 ms.

3. **Fiabilite de la region** : `ap-southeast-1` est une des regions AWS les plus matures en Asie-Pacifique, avec 3 Availability Zones.

4. **Fallback** : si les mesures reelles de latence depuis Maurice sont meilleures vers l'Europe (a tester avant le deploiement), `eu-west-1` (Irlande) est un excellent plan B. La difference de latence utilisateur entre Singapour et l'Irlande sera de 20-40 ms -- perceptible mais pas bloquante.

**Action avant deploiement** : mesurer la latence reelle depuis Maurice vers Singapour, Mumbai, et Irlande avec un outil comme cloudping.info ou awsspeedtest.com, depuis un reseau Mauritius Telecom/Emtel typique.

---

## Question 2 : Hebergement du backend NestJS

### Options evaluees

#### Option A : VPS classique (Hetzner, DigitalOcean, Contabo)

**Description** : Location d'un serveur virtuel, deploiement via Docker + PM2 ou Docker Compose, gestion manuelle (ou semi-automatisee) du serveur.

| Fournisseur | Config | Prix/mois | Region Singapour | Notes |
|-------------|--------|-----------|-----------------|-------|
| **Hetzner** | CX22 (2 vCPU, 4 GB RAM, 40 GB SSD) | ~4.50 EUR (~5 USD) | Oui (Singapour disponible) | Prix augmentent de 30-50% au 1er avril 2026 |
| **Hetzner** | CX32 (4 vCPU, 8 GB RAM, 80 GB SSD) | ~8 EUR (~9 USD) | Oui | Post-avril 2026 : ~11-12 EUR |
| **DigitalOcean** | Basic 2 vCPU, 2 GB RAM | 18 USD | Oui (SGP1) | Bandwidth 3 TB inclus |
| **DigitalOcean** | Basic 2 vCPU, 4 GB RAM | 24 USD | Oui (SGP1) | |
| **Contabo** | VPS S (4 vCPU, 8 GB RAM, 50 GB SSD) | ~6 EUR | Singapour : oui | Prix tres bas, qualite reseau variable |

**Avantages** :
- Cout le plus bas, surtout Hetzner
- Controle total : SSH, Docker, configuration libre
- Redis peut tourner sur le meme VPS (zero cout supplementaire)
- BullMQ workers sur le meme serveur
- Pas de facturation a l'usage surprise

**Inconvenients** :
- Gestion serveur manuelle : mises a jour OS, securite, monitoring a configurer
- Deploiement : pipeline CI/CD a construire (SSH + Docker pull + restart)
- Pas de zero-downtime deploy natif (necesssite configuration nginx + PM2 ou blue-green manuel)
- Si le serveur tombe, intervention manuelle
- Pas de scaling automatique

#### Option B : PaaS (Railway, Render, Fly.io)

**Description** : Plateforme qui gere le deploiement, le scaling, les logs, et le TLS. Push du code, le PaaS fait le reste.

| Fournisseur | Config | Prix estime/mois | Region Singapour | Notes |
|-------------|--------|-----------------|-----------------|-------|
| **Railway** | Hobby ($5 credits) + usage | 7-15 USD | Oui (US-west, EU, Asia) | Usage-based, $5/mo min. Redis en 1 clic. Pas de free tier permanent. |
| **Render** | Starter (512 MB RAM) | 7 USD | Oui (Singapore) | Plan-based, predictable. Free tier avec cold starts (spin down apres 15 min inactivite). |
| **Render** | Standard (2 GB RAM) | 25 USD | Oui | Pas de spin-down |
| **Fly.io** | shared-cpu-1x, 256 MB | ~2-5 USD | Oui (SIN) | Per-second billing. +2 USD/app pour IPv4 dedie. Plus technique a configurer. |
| **Fly.io** | shared-cpu-2x, 1 GB | ~10-15 USD | Oui | |

**Avantages** :
- **Zero gestion serveur** : TLS automatique, logs integres, healthchecks
- **Deploiement Git-push** : push sur main = deploy automatique
- **Railway** : excellent DX, Redis/PostgreSQL en 1 clic, preview environments
- **Render** : simplicite Heroku-like, render.yaml declaratif, preview environments par PR
- **Fly.io** : deploy global multi-region, scale-to-zero, Machines API granulaire

**Inconvenients** :
- **Cout plus eleve** que le VPS pour des ressources equivalentes
- **Railway** : pas de free tier permanent (trial 30 jours puis $5/mois minimum). Facturation a l'usage peut surprendre.
- **Render free tier** : le service s'eteint apres 15 min d'inactivite, cold start de 30-60s au premier appel. Inacceptable pour une API de production.
- **Fly.io** : courbe d'apprentissage plus elevee (fly.toml, Machines API, pas de deploy auto sur git push sans CI).
- **Vendor lock-in leger** : configuration specifique a chaque plateforme.
- **Limites RAM** : les plans d'entree (256-512 MB) peuvent etre justes pour NestJS + Prisma.

#### Option C : Serverless (AWS Lambda, Vercel Functions)

**Description** : Le code s'execute en reponse a des evenements (requetes HTTP). Pas de serveur persistant. Facturation a l'invocation.

**Avantages** :
- Scale-to-zero : zero cout quand pas de trafic
- Scaling automatique infini (en theorie)

**Inconvenients** :
- **Cold starts** : 500ms-2s pour NestJS (framework lourd, DI container a initialiser). Inacceptable pour une UX mobile reactive.
- **WebSockets impossibles** : pas de connexion persistante. Incompatible avec BullMQ (qui necessite une connexion Redis persistante).
- **Complexite BullMQ** : les workers BullMQ doivent tourner en permanence. Serverless est l'oppose de ce besoin.
- **Latence NestJS** : le framework n'est pas concu pour le serverless. Chaque invocation re-instancie le container DI.
- **Cout a fort volume** : des que le trafic est regulier, un serveur persistant est moins cher.
- **Debugging** : logs disperses, pas de REPL, pas de SSH pour diagnostiquer un probleme.

**Verdict** : **Elimine.** NestJS + BullMQ + WebSockets sont fondamentalement incompatibles avec le serverless.

#### Option D : Docker sur VPS (avec CI/CD automatise)

**Description** : Variante de l'Option A, mais avec un deploiement Docker structure : Docker Compose en production, images construites en CI, deploiement automatise via GitHub Actions + SSH.

**Avantages** :
- Combine le faible cout du VPS avec un deploiement reproductible
- Docker Compose gere NestJS + Redis + workers dans une seule commande
- Environnement de dev identique a la prod
- Facile a migrer vers un PaaS ou Kubernetes plus tard (on a deja les Dockerfiles)

**Inconvenients** :
- Memes contraintes de gestion serveur que l'Option A
- Docker ajoute une couche (mais c'est standard en 2026)

### Decision hebergement backend

**Retenue : Option B (PaaS) -- Railway comme choix principal, avec Render en backup.**

**Justification :**

1. **Equipe sans DevOps** : avec 2-5 devs, chaque heure passee sur la configuration serveur (nginx, certbot, UFW, fail2ban, Docker, PM2, monitoring) est une heure en moins sur le produit. Railway elimine 95% de ce travail.

2. **Railway offre le meilleur compromis DX/cout** :
   - Deploy sur git push, preview environments, logs integres
   - Redis en 1 clic dans le meme projet (colocalise, zero latence)
   - Region Singapour disponible
   - Facturation a l'usage transparente : un backend NestJS leger coute ~7-15 USD/mois
   - Healthchecks et restart automatique

3. **Le surcout par rapport a un VPS Hetzner est marginal** : ~10-15 USD/mois de plus, mais on economise des dizaines d'heures de DevOps par mois. A 50 USD/h de cout developpeur, le PaaS est rentable des la premiere heure de debug serveur evitee.

4. **Migration facile** : si Railway devient trop cher ou limitant, les Dockerfiles permettent de migrer vers Fly.io, Render, ou un VPS en quelques heures.

5. **BullMQ workers** : deployes comme un service separe dans le meme projet Railway, consommant le meme Redis.

**Plan de fallback** :
- Si le cout Railway depasse 50 USD/mois (phase de croissance) et que l'equipe a gagne en maturite DevOps : migration vers **Hetzner VPS + Docker Compose** avec un pipeline GitHub Actions.
- Si Railway a des problemes de disponibilite dans la region Singapour : migration vers **Render** ou **Fly.io**.

---

## Question 3 : Hebergement Redis

### Options evaluees

| Option | Prix/mois | Latence | Persistance | Notes |
|--------|-----------|---------|-------------|-------|
| **Railway Redis** (meme projet) | Inclus dans l'usage Railway (~3-5 USD) | < 1 ms (meme reseau prive) | Oui (configurable) | Zero configuration, meme dashboard |
| **Upstash (serverless)** | Gratuit (500K cmds/mois) puis pay-per-request | 5-15 ms (REST API) | Oui | Free tier genereux. Mais protocole REST, pas de connexion persistante native. |
| **Upstash (TCP via SDK)** | Idem | 2-5 ms | Oui | SDK compatible ioredis. BullMQ compatible. |
| **Redis Cloud** (Redis Labs) | Gratuit (30 MB), puis 5 USD+ | 2-5 ms | Oui | Region Singapour disponible |
| **Redis sur VPS** (self-hosted) | 0 USD (meme VPS) | < 1 ms | Configurable | Necessite un VPS (Option A du backend) |

### Decision Redis

**Retenu : Railway Redis (dans le meme projet que le backend)**

**Justification :**

1. **Colocation** : Redis sur le meme reseau prive Railway que l'API NestJS = latence < 1 ms. Critique pour BullMQ qui fait des milliers d'operations Redis par minute.

2. **Zero configuration** : un clic pour ajouter Redis au projet Railway. Pas de gestion de connexion, firewall, ou backup a configurer.

3. **Cout inclus** : la consommation Redis est facturee dans l'usage Railway global (~3-5 USD/mois pour un usage modere).

4. **Compatibilite BullMQ** : Redis TCP standard, pas de limitation de protocole comme Upstash REST.

**Plan de fallback :**
- Si migration vers VPS : Redis installe sur le meme serveur (zero cout supplementaire, redis-server dans Docker Compose).
- Si besoin de Redis manage separe : **Upstash** (free tier puis pay-per-request) ou **Redis Cloud** (region Singapour).

---

## Question 4 : Hebergement des assets statiques

### Composants statiques

- **Admin React** : SPA build (~2-5 MB)
- **Site vitrine** : pages marketing statiques
- **Flutter Web consumer** : SPA build (~10-20 MB)
- **Flutter Web partner** : SPA build (~10-20 MB)

### Options evaluees

| Option | Prix/mois | Bandwidth | Build CI | Preview deployments | CDN global |
|--------|-----------|-----------|----------|--------------------|-----------|
| **Cloudflare Pages** | **Gratuit** | **Illimite** | 500 builds/mois | Oui (par branche) | Oui (Anycast global) |
| **Vercel** | Gratuit (hobby) | 100 GB | 6000 min builds | Oui | Oui |
| **Netlify** | Gratuit | 100 GB | 300 min builds | Oui | Oui |
| **Railway** (static) | ~1-3 USD | Inclus dans usage | Oui | Oui | Non (single region) |
| **S3 + CloudFront** | ~2-10 USD | Pay per GB | Via CI | Non natif | Oui |
| **Meme VPS que backend** | 0 USD | Inclus | Via CI | Non | Non |

### Decision assets statiques

**Retenu : Cloudflare Pages**

**Justification :**

1. **Gratuit avec bandwidth illimitee** : aucun cout, meme avec des milliers d'utilisateurs. Pas de surprise de facturation.

2. **CDN global Anycast** : les fichiers statiques sont servis depuis le PoP Cloudflare le plus proche de l'utilisateur. Cloudflare a des PoPs en Afrique du Sud (Johannesburg, Cape Town) qui serviront les utilisateurs mauriciens avec une latence optimale.

3. **Deploy automatique sur Git push** : connexion GitHub, build automatique, preview deployment par branche/PR.

4. **500 builds/mois** : largement suffisant pour une equipe de 2-5 devs.

5. **Sites illimites** : on peut heberger l'admin React, le site vitrine, et le Flutter Web sur des projets Cloudflare Pages separes, tous gratuits.

6. **Custom domains + HTTPS** : inclus gratuitement.

---

## Question 5 : CDN

### Besoins CDN

1. **Images des commerces et paniers** : stockees dans Supabase Storage, servies aux utilisateurs mobiles. Volume modere au lancement (~1-10 GB), croissant avec le nombre de partenaires.
2. **Assets statiques** : deja couverts par Cloudflare Pages (Question 4).
3. **Protection API** : DDoS protection, rate limiting, WAF basique.

### Options evaluees

| Option | Prix/mois | PoP Afrique | WAF | DDoS protection | Notes |
|--------|-----------|-------------|-----|----------------|-------|
| **Cloudflare (Free)** | **Gratuit** | Johannesburg, Cape Town | 5 custom rules | Oui (L3/L4/L7) | Suffisant pour le lancement |
| **Cloudflare (Pro)** | 20 USD | Idem + WAF avance | 20 custom rules | Oui | Si besoin de WAF avance |
| **Bunny CDN** | ~1-5 USD | Afrique du Sud | Non | Basique | 0.06 EUR/GB zone Afrique. Bon peering. |
| **CloudFront (AWS)** | ~5-20 USD | Afrique du Sud (edge) | Via AWS WAF ($$) | Oui | Plus cher, plus complexe |

### Decision CDN

**Retenu : Cloudflare (plan gratuit) comme CDN et reverse proxy de l'API**

**Justification :**

1. **Gratuit** : plan Free couvre CDN, DDoS protection (L3/L4/L7), DNS, SSL/TLS, 5 regles WAF, caching.

2. **Protection DDoS incluse** : meme le plan gratuit protege contre les attaques DDoS volumetriques. Essentiel pour une API exposee sur Internet.

3. **PoPs en Afrique du Sud** : Johannesburg et Cape Town. Les utilisateurs mauriciens beneficient d'un routage via le cable T3 vers ces PoPs, avec ~40-60 ms de latence pour le contenu cache.

4. **Reverse proxy pour l'API** : Cloudflare devant l'API NestJS (Railway) fournit SSL, caching des reponses GET, rate limiting basique, et masque l'IP du serveur d'origine.

5. **Supabase Storage + Cloudflare** : les images Supabase Storage peuvent etre servies via un custom domain pointe vers Cloudflare, avec caching aggressif (images statiques, TTL long).

**Configuration recommandee :**

```
Utilisateur (Maurice)
    -> Cloudflare PoP (Johannesburg, ~40-60ms)
        -> Cache hit? Retourne le contenu cache
        -> Cache miss? Proxy vers Railway (Singapour, ~60-80ms supplementaires)
            -> API NestJS
                -> Supabase PostgreSQL (meme region, <2ms)
```

Latence typique pour un utilisateur :
- **Contenu cache (images, assets)** : 40-60 ms (servi depuis Cloudflare Johannesburg)
- **Requete API (cache miss)** : 150-250 ms (Cloudflare -> Railway -> Supabase -> retour)
- **Requete API (avec cache Cloudflare sur GET)** : 40-60 ms pour les reponses cachees

---

## Question 6 : CI/CD

### Options evaluees

| Option | Prix | Minutes build/mois (gratuit) | Secrets management | Docker support | Notes |
|--------|------|------------------------------|-------------------|----------------|-------|
| **GitHub Actions** | Gratuit (public), 2000 min/mois (prive) | 2000 | Oui (secrets natifs) | Oui | Standard de l'industrie |
| **GitLab CI** | 400 min/mois (gratuit) | 400 | Oui | Oui | Moins genereux en free tier |

### Decision CI/CD

**Retenu : GitHub Actions**

**Pipeline propose :**

```yaml
# .github/workflows/deploy.yml
name: Deploy Backend

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      # Railway deploy via CLI ou webhook
      - uses: railwayapp/railway-action@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
```

**Strategie de deploiement :**

| Phase | Strategie | Justification |
|-------|-----------|---------------|
| **Lancement** | Deploy direct (Railway auto-deploy sur push) | Simple, rapide. Un seul serveur, pas de traffic splitting. |
| **Croissance** | Healthcheck + auto-rollback Railway | Railway detecte si le nouveau deploy echoue le healthcheck et rollback automatiquement. |
| **Maturite** | Blue-green (si migration VPS) | Deux instances derriere un load balancer. Switch instantane, rollback en 1 commande. |

**Temps de pipeline estime** : 2-4 minutes (lint + test + build + deploy).

---

## Question 7 : Monitoring et observabilite

### Stack monitoring recommandee

| Couche | Outil | Prix/mois | Justification |
|--------|-------|-----------|---------------|
| **Erreurs applicatives** | **Sentry** (free tier) | Gratuit (5K events/mois) | Standard pour le error tracking. SDK NestJS, Flutter, React. Alertes Slack/email. |
| **Logs structures** | **Grafana Cloud** (free tier) | Gratuit (50 GB logs, 14j retention) | Logs structures JSON via Pino (logger NestJS). Dashboards Grafana. 50 GB/mois est largement suffisant au lancement. |
| **Uptime monitoring** | **UptimeRobot** (free tier) | Gratuit (50 monitors, 5 min interval) | Ping l'API toutes les 5 minutes. Alerte email/Slack si down. 50 monitors gratuits. |
| **APM (metriques API)** | **Grafana Cloud** (free tier) | Inclus | Metriques Prometheus (latence p50/p95/p99, throughput, taux d'erreur) via `prom-client` dans NestJS. |
| **Alerting** | **Sentry + UptimeRobot + Grafana** | Gratuit | Sentry : alertes sur nouvelles erreurs. UptimeRobot : alertes downtime. Grafana : alertes sur metriques custom. |

**Pourquoi pas les alternatives :**

- **Datadog** : excellent mais cher (15 USD/host/mois minimum). Surdimensionne pour le lancement.
- **Better Stack (Logtail)** : free tier (3 GB, 3 jours retention) trop limite. Le jump vers le plan paye (29 USD/mois) est abrupt.
- **Axiom** : bon produit, mais Grafana Cloud offre plus (dashboards, alerting, metriques) pour le meme prix (gratuit).
- **New Relic** : free tier genereux (100 GB/mois) mais interface complexe pour une petite equipe.

### Configuration logs

```typescript
// NestJS + Pino logger
// Logs structures JSON -> stdout -> Grafana Cloud (via Grafana Agent ou Alloy)
{
  "level": "info",
  "timestamp": "2026-02-27T10:15:30.000Z",
  "context": "ReservationService",
  "message": "Basket reserved",
  "basketId": "bsk_abc123",
  "userId": "usr_def456",
  "duration_ms": 45
}
```

---

## Question 8 : Backup

### Strategie de backup

| Composant | Methode | Frequence | Retention | Responsable |
|-----------|---------|-----------|-----------|-------------|
| **Supabase PostgreSQL** | Backup automatique Supabase | Daily (plan Pro) | 7 jours (Pro), 14 jours + PITR (Team) | Supabase |
| **Redis** | Pas de backup dedie | N/A | N/A | Donnees reconstructibles (cache + queues). Si Redis tombe, les jobs en queue sont perdus mais re-enqueuables. |
| **Code source** | Git (GitHub) | Chaque push | Illimite | GitHub |
| **Media (photos)** | Supabase Storage (S3 sous-jacent) | Replication S3 native | Illimite | Supabase/AWS |
| **Secrets/config** | Variables d'env Railway + GitHub Secrets | Versionne dans le PaaS | Historique Railway | Equipe |

### Notes sur les backups

1. **Supabase Pro** (25 USD/mois) inclut des backups daily avec 7 jours de retention. C'est suffisant au lancement. Le plan Team (599 USD/mois) ajoute le Point-in-Time Recovery (PITR) -- a considerer quand le volume financier le justifie.

2. **Redis** : les donnees Redis sont ephemeres par design. Le cache est reconstructible, les jobs BullMQ en cours de traitement sont les seuls a risque. Mitigation : les jobs critiques (capture paiement, generation payout) sont idempotents et re-enqueuables.

3. **Media** : Supabase Storage utilise S3 sous le capot, qui a une durabilite de 99.999999999% (11 neufs). Un backup supplementaire n'est pas necessaire au lancement.

4. **Export periodique** : mettre en place un job CRON mensuel qui exporte un dump SQL de la base Supabase vers un bucket S3/R2 separe, comme filet de securite supplementaire. Cout : quasi nul.

---

## Question 9 : Securite infrastructure

### HTTPS / TLS

| Composant | Solution | Notes |
|-----------|----------|-------|
| **API NestJS** | Cloudflare (SSL termination) + Railway (TLS auto) | Double couche : Cloudflare gere le TLS cote utilisateur, Railway gere le TLS interne. Mode "Full (Strict)" dans Cloudflare. |
| **Assets statiques** | Cloudflare Pages (HTTPS auto) | Inclus gratuitement |
| **Supabase** | HTTPS natif | Gere par Supabase |

### Firewall et protection

| Mesure | Implementation | Notes |
|--------|---------------|-------|
| **DDoS protection** | Cloudflare (plan Free) | Protection L3/L4/L7 incluse |
| **WAF basique** | Cloudflare (5 custom rules) | Bloquer les patterns d'attaque courants (SQLi, XSS), bloquer les pays non pertinents |
| **Rate limiting API** | NestJS `@nestjs/throttler` + Cloudflare Rate Limiting | Limiter les requetes par IP/user. Cloudflare en premiere ligne, NestJS en seconde. |
| **IP masquee** | Cloudflare reverse proxy | L'IP du serveur Railway n'est jamais exposee publiquement |
| **Headers securite** | Helmet.js (NestJS) | HSTS, X-Frame-Options, CSP, etc. |

### Gestion des secrets

| Methode | Utilisation | Notes |
|---------|-------------|-------|
| **Variables d'environnement Railway** | Secrets de production (DB URL, API keys, JWT secret) | Chiffrees au repos, injectees au runtime. Historique des modifications. |
| **GitHub Actions Secrets** | Tokens CI/CD (Railway token, Sentry DSN) | Chiffrees, accessibles uniquement dans les workflows. |
| **Fichiers `.env` locaux** | Developpement local uniquement | `.env` dans `.gitignore`. Template `.env.example` versionne. |
| **Vault / AWS Secrets Manager** | **Pas necessaire au lancement** | A evaluer si l'equipe depasse 10 personnes ou si des audits PCI l'exigent. |

### Hardening supplementaire

- **Dependabot** : activer sur le repo GitHub pour les alertes de vulnerabilites npm.
- **npm audit** : integre dans le pipeline CI.
- **Supabase RLS** : Row Level Security active sur toutes les tables exposees.
- **CORS strict** : autoriser uniquement les domaines BienBon.mu.
- **Content Security Policy** : sur l'admin React et le site vitrine.

---

## Question 10 : Estimation des couts

### Phase 1 : Lancement (< 100 utilisateurs actifs)

| Composant | Fournisseur | Plan | Cout/mois |
|-----------|-------------|------|-----------|
| Backend NestJS + Workers | Railway | Hobby + usage | 7-10 USD |
| Redis | Railway | Inclus dans usage | 3-5 USD |
| PostgreSQL + Auth + Storage | Supabase | Pro | 25 USD |
| CDN + DNS + WAF | Cloudflare | Free | 0 USD |
| Admin React | Cloudflare Pages | Free | 0 USD |
| Site vitrine | Cloudflare Pages | Free | 0 USD |
| Flutter Web | Cloudflare Pages | Free | 0 USD |
| Emails transactionnels | Resend | Free (3K/mois) | 0 USD |
| Push notifications | FCM | Gratuit | 0 USD |
| Error tracking | Sentry | Free (5K events) | 0 USD |
| Logs + metriques | Grafana Cloud | Free (50 GB) | 0 USD |
| Uptime monitoring | UptimeRobot | Free (50 monitors) | 0 USD |
| Domaine bienbon.mu | Registrar | Annuel | ~2 USD |
| **TOTAL** | | | **~37-42 USD/mois** |

### Phase 2 : Croissance (1 000 utilisateurs actifs)

| Composant | Fournisseur | Plan | Cout/mois |
|-----------|-------------|------|-----------|
| Backend NestJS + Workers | Railway | Pro + usage | 20-30 USD |
| Redis | Railway | Usage accru | 5-10 USD |
| PostgreSQL + Auth + Storage | Supabase | Pro (8 GB DB, usage accru) | 25-40 USD |
| CDN + DNS + WAF | Cloudflare | Free (suffisant) | 0 USD |
| Admin React | Cloudflare Pages | Free | 0 USD |
| Emails transactionnels | Resend | Pro (50K emails) | 20 USD |
| Push notifications | FCM | Gratuit | 0 USD |
| Error tracking | Sentry | Free ou Team (50K events, 26 USD) | 0-26 USD |
| Logs + metriques | Grafana Cloud | Free (suffisant) | 0 USD |
| Uptime monitoring | UptimeRobot | Free | 0 USD |
| Domaine | Registrar | | ~2 USD |
| **TOTAL** | | | **~72-130 USD/mois** |

### Phase 3 : Maturite (10 000 utilisateurs actifs)

| Composant | Fournisseur | Plan | Cout/mois |
|-----------|-------------|------|-----------|
| Backend NestJS (2 instances) | Railway Pro ou Hetzner VPS (migration) | Pro usage ou CX32 x2 | 40-60 USD |
| BullMQ Workers (dedie) | Railway ou meme VPS | | 10-20 USD |
| Redis | Railway ou Hetzner (self-hosted) | | 5-10 USD |
| PostgreSQL + Auth + Storage | Supabase | Pro (usage eleve, ~20 GB DB) | 50-100 USD |
| CDN + DNS + WAF | Cloudflare | Free ou Pro (20 USD si WAF avance) | 0-20 USD |
| Emails transactionnels | Resend | Pro ou Scale | 20-90 USD |
| Push notifications | FCM | Gratuit | 0 USD |
| Error tracking | Sentry | Team | 26 USD |
| Logs + metriques | Grafana Cloud | Free ou Pro si besoin | 0-50 USD |
| Uptime monitoring | UptimeRobot | Free ou Pro (7 USD) | 0-7 USD |
| Domaine + SSL | | | ~2 USD |
| **TOTAL** | | | **~155-385 USD/mois** |

### Resume des couts par phase

| Phase | Utilisateurs actifs | Cout mensuel estime | Cout annuel estime |
|-------|--------------------|--------------------|-------------------|
| **Lancement** | < 100 | **37-42 USD** | 450-500 USD |
| **Croissance** | ~1 000 | **72-130 USD** | 860-1 560 USD |
| **Maturite** | ~10 000 | **155-385 USD** | 1 860-4 620 USD |

### Comparaison : scenario VPS (Hetzner) vs PaaS (Railway)

Pour la Phase 1, si on avait choisi un VPS Hetzner :

| Composant | Hetzner scenario | Railway scenario | Delta |
|-----------|-----------------|-----------------|-------|
| Backend + Workers + Redis | CX32 (9 USD) + Redis self-hosted (0 USD) | Railway (13 USD) | +4 USD |
| Temps DevOps estime | 8-12h setup initial + 2-4h/mois maintenance | 1h setup + 0h/mois maintenance | -10h/mois |
| **Cout total (incluant temps dev a 40 USD/h)** | 9 + (3h x 40) = **129 USD** | 13 + (0h x 40) = **13 USD** | **Railway gagne** |

Le VPS est moins cher en cout serveur brut, mais le temps de DevOps rend le PaaS beaucoup plus rentable pour une petite equipe.

---

## Architecture cible -- vue d'ensemble

```
                    +----------------------------+
                    |   Utilisateurs (Maurice)   |
                    |   Apps Flutter + Web       |
                    +-------------+--------------+
                                  |
                                  | HTTPS
                                  |
                    +-------------v--------------+
                    |   Cloudflare (CDN + WAF)   |
                    |   - SSL termination        |
                    |   - DDoS protection        |
                    |   - Cache images/static    |
                    |   - Rate limiting          |
                    +----+--------+--------+-----+
                         |        |        |
              +----------+   +----+----+   +----------+
              |              |         |              |
    +---------v---------+   |   +-----v------+   +---v-------------------+
    | Cloudflare Pages  |   |   | Supabase   |   | Railway               |
    | (statiques)       |   |   | (direct)   |   | (Singapour)           |
    |                   |   |   |            |   |                       |
    | - Admin React     |   |   | - Auth     |   | +-------------------+ |
    | - Site vitrine    |   |   | - Storage  |   | | NestJS API        | |
    | - Flutter Web     |   |   +-----+------+   | | (service 1)       | |
    +-------------------+   |         |           | +--------+----------+ |
                            |         |           |          |            |
                            |         |           | +--------v----------+ |
                            |         |           | | BullMQ Workers    | |
                            |         |           | | (service 2)       | |
                            |         |           | +--------+----------+ |
                            |         |           |          |            |
                            |         |           | +--------v----------+ |
                            |         |           | | Redis             | |
                            |         |           | | (service 3)       | |
                            |         |           | +-------------------+ |
                            |         |           +----------+------------+
                            |         |                      |
                            |         +----------+-----------+
                            |                    |
                            |         +----------v-----------+
                            |         |  Supabase PostgreSQL |
                            |         |  (Singapour)         |
                            |         |  + PostGIS           |
                            +-------->+  + RLS               |
                                      +----------------------+

Services externes :
  - Resend (emails transactionnels)
  - FCM (push notifications)
  - Peach Payments (paiements)
  - Sentry (error tracking)
  - Grafana Cloud (logs + metriques)
  - UptimeRobot (uptime monitoring)
```

---

## Recapitulatif des decisions

| Question | Decision | Alternative si besoin |
|----------|----------|----------------------|
| **Region** | `ap-southeast-1` (Singapour) | `eu-west-1` (Irlande) si latence meilleure |
| **Backend NestJS** | Railway (PaaS) | Hetzner VPS + Docker si cout trop eleve |
| **Redis** | Railway Redis (colocalise) | Upstash ou self-hosted sur VPS |
| **Assets statiques** | Cloudflare Pages (gratuit) | Vercel, Netlify |
| **CDN + WAF** | Cloudflare Free | Cloudflare Pro si WAF avance necessaire |
| **CI/CD** | GitHub Actions | GitLab CI |
| **Erreurs** | Sentry Free | Grafana Cloud |
| **Logs** | Grafana Cloud Free | Better Stack, Axiom |
| **Uptime** | UptimeRobot Free | Better Stack |
| **Backups DB** | Supabase automatique (daily) | Export CRON mensuel en supplement |
| **Secrets** | Railway env vars + GitHub Secrets | AWS Secrets Manager si audit PCI |
| **HTTPS** | Cloudflare SSL + Railway TLS | Let's Encrypt si VPS |

---

## Consequences

### Positives

1. **Cout minimal au lancement** : ~40 USD/mois pour une stack complete de production, incluant DB managee, CDN, monitoring. C'est moins cher qu'un abonnement Slack.

2. **Zero DevOps** : aucun serveur a maintenir, aucun OS a patcher, aucun certificat SSL a renouveler. L'equipe de 2-5 devs se concentre a 100% sur le produit.

3. **Securite de base solide** : Cloudflare (DDoS, WAF) + Railway (TLS, isolation) + Supabase (RLS, backups) fournissent un socle de securite professionnel sans configuration complexe.

4. **Scaling progressif** : chaque composant peut etre scale independamment. Railway scale le backend, Supabase scale la DB, Cloudflare cache absorbe le trafic statique.

5. **Observabilite gratuite** : Sentry + Grafana Cloud + UptimeRobot couvrent error tracking, logs, metriques et uptime monitoring sans cout.

6. **Conformite Data Protection Act** : les donnees hebergees a Singapour (AWS) sont couvertes par les standards de protection AWS. Le consentement utilisateur et les conditions d'utilisation de BienBon.mu couvrent le transfert hors territoire mauricien.

### Negatives

1. **Latence utilisateur non optimale** : 120-160 ms vers Singapour au lieu de 40-60 ms si la DB etait en Afrique du Sud. Attenuation : le caching Cloudflare reduit la latence percue pour les contenus statiques. Les requetes API (150-250 ms) restent dans la plage acceptable pour une app mobile.

2. **Dependance multi-fournisseur** : Railway + Supabase + Cloudflare + Resend + Sentry + Grafana Cloud = 6 fournisseurs. Si un tombe, le service est degrade. Attenuation : chaque composant a un plan de fallback identifie.

3. **Pas de data residency a Maurice** : les donnees sont a Singapour (DB) et globalement distribuees (CDN). Si la legislation mauricienne evolue vers une obligation de data residency, il faudra migrer vers une solution avec datacenter local (improbable a court terme, aucun datacenter cloud majeur n'existe a Maurice).

4. **Railway est un PaaS recent** : fonde en 2020, moins de track record que AWS/GCP/Azure. Risque de changement de pricing ou de fermeture. Attenuation : les Dockerfiles permettent une migration en quelques heures vers n'importe quel autre hebergeur.

---

## Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Railway change ses prix ou ferme | Faible | Moyen | Dockerfiles standards. Migration vers Hetzner VPS, Fly.io ou Render en quelques heures. |
| Supabase augmente ses prix | Moyenne | Moyen | C'est du PostgreSQL standard. Migration vers Neon, AWS RDS, ou VPS possible. Auth et Storage a remplacer. |
| Latence Maurice-Singapour degrade l'UX | Faible | Moyen | Tester avant deploiement. Si > 200 ms, migrer vers eu-west-1 (Irlande). Caching agressif. |
| Cable sous-marin coupe (precedent SAFE 2024) | Faible | Eleve | Cloudflare CDN sert le contenu cache. L'app mobile fonctionne en mode offline partiel. Les cables T3 et LION offrent de la redondance. |
| Limites free tier depassees (Sentry, Grafana, UptimeRobot) | Moyenne | Faible | Migrer vers le plan paye correspondant. Budget supplementaire < 50 USD/mois. |
| DDoS ciblent l'API | Faible | Moyen | Cloudflare absorbe les attaques L3/L4/L7. Rate limiting NestJS en seconde ligne. Si attaques sophistiquees : Cloudflare Pro (20 USD/mois). |
| Data Protection Act evolue vers data residency obligatoire | Tres faible | Eleve | Aucun datacenter cloud majeur a Maurice. Si requis, VPS local (MyT Datacenter) avec tunnel vers Supabase. Extremement improbable a moyen terme. |

---

## Plan de validation

Avant le deploiement en production :

1. **Test de latence (1 jour)** : mesurer la latence reelle depuis Maurice (reseau Mauritius Telecom et Emtel) vers AWS Singapour, Mumbai et Irlande. Utiliser cloudping.info, awsspeedtest.com et des pings manuels. Decider la region definitive.

2. **PoC Railway (0.5 jour)** : deployer un hello-world NestJS sur Railway (region Singapour), connecte a un projet Supabase (Singapour). Verifier la latence inter-service API <-> DB.

3. **PoC Cloudflare (0.5 jour)** : configurer Cloudflare devant Railway. Verifier le caching, le SSL, le rate limiting. Deployer une SPA React sur Cloudflare Pages.

4. **Pipeline CI/CD (0.5 jour)** : configurer GitHub Actions pour le lint, test, build, deploy sur Railway. Verifier le temps de pipeline et le deploy automatique.

5. **Monitoring (0.5 jour)** : integrer Sentry (NestJS SDK), configurer Grafana Cloud (logs Pino), configurer UptimeRobot (ping API + ping Supabase).

---

## References

### Connectivite Maurice
- [T3 Subsea Fiber Cable Lands in Mauritius](https://subtelforum.com/t3-subsea-fiber-cable-lands-in-mauritius/) -- SubTel Forum
- [SAFE Cable System](https://www.submarinenetworks.com/en/systems/asia-europe-africa/safe) -- Submarine Networks
- [LION Cable System](https://en.wikipedia.org/wiki/LION_(cable_system)) -- Wikipedia

### Data Protection
- [Mauritius Data Protection Act 2017 -- Cross-border transfers](https://www.dentons.com/en/insights/articles/2022/october/14/data-transfer-provisions-and-the-lack-of-data-portability-provisions) -- Dentons
- [Data Protection Laws in Mauritius](https://www.dlapiperdataprotection.com/?t=law&c=MU) -- DLA Piper

### Supabase
- [Supabase Available Regions](https://supabase.com/docs/guides/platform/regions) -- Supabase Docs
- [Supabase Pricing](https://supabase.com/pricing) -- Supabase
- [Supabase Pricing Breakdown 2026](https://uibakery.io/blog/supabase-pricing) -- UI Bakery

### Hebergement backend
- [Railway Pricing](https://docs.railway.com/pricing) -- Railway Docs
- [Railway vs Render vs Fly.io Comparison](https://codeyaan.com/blog/top-5/railway-vs-render-vs-flyio-comparison-2624) -- codeYaan
- [Render Pricing](https://render.com/pricing) -- Render
- [Fly.io Pricing](https://fly.io/pricing/) -- Fly.io
- [Hetzner Cloud](https://www.hetzner.com/cloud) -- Hetzner
- [Hetzner Price Adjustment April 2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/) -- Hetzner Docs
- [DigitalOcean Droplet Pricing](https://docs.digitalocean.com/products/droplets/details/pricing/) -- DigitalOcean

### Redis
- [Upstash Redis Pricing](https://upstash.com/pricing/redis) -- Upstash

### CDN
- [Cloudflare Free Plan](https://www.cloudflare.com/plans/free/) -- Cloudflare
- [Cloudflare Pages](https://pages.cloudflare.com/) -- Cloudflare
- [Bunny CDN Pricing](https://bunny.net/pricing/cdn/) -- Bunny.net

### Monitoring
- [Grafana Cloud Pricing](https://grafana.com/pricing/) -- Grafana Labs
- [Better Stack Pricing](https://betterstack.com/pricing) -- Better Stack

### Emails
- [Resend Pricing](https://resend.com/pricing) -- Resend

### Latence AWS
- [AWS Latency Monitoring](https://www.cloudping.co/) -- CloudPing
- [AWS Latency Test](https://awsspeedtest.com/latency) -- AWS Speed Test
