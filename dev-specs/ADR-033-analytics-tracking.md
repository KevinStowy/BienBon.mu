# ADR-033 : Analytics, tracking et feature flags

| Champ         | Valeur                                                                              |
|---------------|-------------------------------------------------------------------------------------|
| **Statut**    | Propose                                                                             |
| **Date**      | 2026-02-27                                                                          |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                                                 |
| **Decideurs** | Equipe technique BienBon                                                            |
| **Scope**     | Product analytics, event tracking, dashboards KPI, feature flags, consent management |
| **Prereqs**   | ADR-001 (NestJS backend), ADR-013 (site vitrine Astro), ADR-020 (infra Railway/Cloudflare, couts), ADR-021 (conformite DPA 2017 / GDPR), ADR-029 (Flutter state management Riverpod) |
| **US clefs**  | US-C001 a US-C043 (consumer), US-P001 a US-P030 (partner), US-A001+ (admin dashboards), US-W001 a US-W011 (site vitrine) |

---

## 1. Contexte

### 1.1 Pourquoi cette decision est critique

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. Pour piloter une startup sur un marche naissant, l'equipe a besoin de donnees fiables sur :

1. **Le comportement utilisateur** : ou les consommateurs abandonnent-ils le funnel ? Quels paniers sont les plus populaires ? A quelle heure les recherches sont-elles les plus frequentes ?
2. **La performance operationnelle** : taux de no-show (paniers non recuperes), temps moyen entre la publication et la vente, taux de vente par partenaire.
3. **L'impact environnemental** : kg de nourriture sauvee, nombre de paniers sauves -- chiffres necessaires pour le storytelling marketing et le compteur d'impact sur le site vitrine (US-W010).
4. **L'acquisition** : d'ou viennent les visiteurs du site vitrine ? Quel CTA convertit le mieux ?
5. **Les feature flags** : activer/desactiver des fonctionnalites sans deploiement, A/B tester des parcours.

Sans analytics, l'equipe navigue a l'aveugle. Avec de mauvais analytics, elle prend des decisions erronees. L'enjeu est de choisir une stack analytics adaptee a une startup (budget limite, petite equipe, pas de data engineer dedie) tout en respectant le Data Protection Act 2017 de Maurice (ADR-021).

### 1.2 Composants a instrumenter

| Composant | Framework | Canal | Utilisateurs |
|-----------|-----------|-------|--------------|
| App consumer | Flutter | Mobile (iOS + Android) | Consommateurs grand public |
| App partner | Flutter | Mobile (iOS + Android) | Commercants partenaires |
| Site vitrine | Astro (SSG) | Web | Visiteurs, prospects |
| Admin web | React (SPA) | Web | Equipe interne |
| Backend NestJS | NestJS | Server-side | N/A (events systeme) |

### 1.3 Contraintes

- **Budget startup** : cible < 50 USD/mois pour l'analytics au lancement (cf. ADR-020, budget infra total ~40 USD/mois)
- **Equipe petite** : 2-5 devs, pas de data engineer. L'analytics doit etre simple a implementer et a maintenir.
- **Equipe IA-first** : le code est genere par des agents IA (Claude Code). Les SDK doivent etre bien documentes avec des patterns clairs.
- **DPA 2017 Maurice** : consentement obligatoire avant collecte de donnees personnelles (ADR-021, Q4/Q9). Pas de tracking avant consentement explicite.
- **Offline-first** : les apps Flutter fonctionnent en mode offline (ADR-012). Les events analytics doivent etre bufferises localement et envoyes quand la connexion revient.
- **Flutter + Riverpod** : le state management est Riverpod (ADR-029). L'integration analytics doit s'inscrire dans ce pattern.

---

## 2. Choix de la solution analytics

### 2.1 Options evaluees

#### Option A : PostHog (self-hosted ou cloud)

**Description** : Plateforme open source de product analytics tout-en-un. Inclut event tracking, session replay, feature flags, A/B tests, surveys. Deployable en self-hosted (Docker) ou en cloud.

| Critere | Evaluation |
|---------|------------|
| Cout | Cloud : gratuit jusqu'a 1M events/mois, puis $0.00031/event. Self-hosted : gratuit (infra a charge). |
| Privacy / DPA | Excellent. Open source, self-hosted possible (donnees restent sur l'infra BienBon). Cloud EU disponible. |
| Flutter SDK | SDK Flutter officiel (`posthog_flutter`), stable. |
| Web SDK | SDK JS officiel, leger (~5 KB gzip). Compatible Astro. |
| Self-hosting | Oui (Docker Compose, minimum 4 GB RAM). |
| Feature flags | Oui, integres. Ciblage par propriete utilisateur, rollout progressif, A/B tests. |
| Session replay | Oui (web uniquement, mobile en beta). |
| Implementation IA | Bonne documentation, API claire, patterns repetitifs. |
| Dashboards | Integres : funnels, retention, paths, trends. Requetage SQL aussi. |

**Inconvenients** :
- Self-hosted necessite un serveur dedie (~20-30 USD/mois pour 4 GB RAM sur Hetzner). Augmente le cout infra.
- Le cloud stocke les donnees aux USA ou EU (pas a Singapour). Il faut verifier la conformite DPA 2017 pour le transfert.
- Le SDK Flutter est fonctionnel mais moins riche que le SDK web (pas de session replay mobile en GA).

#### Option B : Mixpanel

**Description** : Plateforme SaaS de product analytics focalisee sur l'analyse comportementale. Events, funnels, retention, cohortes.

| Critere | Evaluation |
|---------|------------|
| Cout | Gratuit jusqu'a 20M events/mois (plan free genereux). Growth a $28/mois pour les features avancees. |
| Privacy / DPA | Donnees stockees aux USA. SOC 2 Type II, GDPR compliant. Pas de self-hosting. |
| Flutter SDK | SDK Flutter officiel (`mixpanel_flutter`), mature. |
| Web SDK | SDK JS mature, leger. |
| Self-hosting | Non. |
| Feature flags | Non. Necessite un outil tiers (LaunchDarkly, Unleash, etc.). |
| Session replay | Non. |
| Implementation IA | Excellente documentation, API REST riche, patterns bien etablis. |
| Dashboards | Excellents : funnels, retention, flows, segmentation avancee. Meilleur que PostHog pour l'analyse produit. |

**Inconvenients** :
- Pas de self-hosting : les donnees sont aux USA. Conformite DPA 2017 via les garanties contractuelles Mixpanel (DPA agreement).
- Pas de feature flags integres : necessite un second outil.
- Le free tier de 20M events est genereux mais la transition vers un plan paye est brutale.

#### Option C : Plausible / Umami (web analytics leger)

**Description** : Analytics web privacy-first, legers, sans cookies. Pas de product analytics (pas de funnels, retention, segmentation par user). Concu pour le web uniquement.

| Critere | Evaluation |
|---------|------------|
| Cout | Plausible cloud : 9 EUR/mois. Umami cloud : gratuit (10K events/mois), puis $9/mois. Self-hosted : gratuit. |
| Privacy / DPA | Excellent. Pas de cookies, pas de donnees personnelles. GDPR-compliant sans consentement. |
| Flutter SDK | **Aucun**. Ces outils sont web-only. |
| Web SDK | Script leger (~1 KB). Parfait pour Astro. |
| Self-hosting | Oui (Plausible : Docker, 1 GB RAM. Umami : Docker + PostgreSQL/MySQL). |
| Feature flags | Non. |
| Session replay | Non. |
| Implementation IA | Triviale (1 balise script). |
| Dashboards | Basiques : pages vues, sources, pays, appareils. Pas de funnels, pas de retention user. |

**Inconvenients** :
- **Web uniquement** : ne couvre pas les apps Flutter. Inutilisable comme solution unique.
- Analytics de surface : pas de product analytics (funnels, retention, cohortes).
- Utile uniquement pour le site vitrine Astro.

#### Option D : Firebase Analytics (Google Analytics for Firebase)

**Description** : Analytics mobile gratuit de Google. Integre dans la Firebase suite. Events, funnels, audiences, predictions.

| Critere | Evaluation |
|---------|------------|
| Cout | **Gratuit** (illimite). BigQuery export gratuit. |
| Privacy / DPA | Donnees chez Google (USA). Google est processor, DPA agreement disponible. Tracking publicitaire par defaut (desactivable). |
| Flutter SDK | SDK Flutter officiel (`firebase_analytics`), tres mature, maintenu par Google. |
| Web SDK | Firebase JS SDK (lourd : ~30 KB gzip). |
| Self-hosting | Non. Donnees chez Google. |
| Feature flags | Oui, via Firebase Remote Config (gratuit, basique). Firebase A/B Testing aussi. |
| Session replay | Non (Crashlytics pour les crashes). |
| Implementation IA | Documentation abondante, millions d'exemples. |
| Dashboards | Basiques dans Firebase Console. Avances via BigQuery + Looker Studio (gratuit mais complexe a configurer). |

**Inconvenients** :
- **Google lock-in** : une fois les events dans Firebase, l'export vers un autre outil est complexe. BigQuery est le seul moyen d'acceder aux donnees brutes.
- **Dashboards mediocres** : la Firebase Console est limitee pour l'analyse produit. Les funnels custom, la retention avancee, la segmentation necessitent BigQuery + SQL.
- **Privacy** : Google collecte des metadata pour ses propres fins (ads, benchmarking) meme avec le tracking publicitaire desactive. Problematique pour la conformite DPA si l'utilisateur n'a pas consenti au partage avec Google.
- **Event schema rigide** : les events Firebase ont des contraintes (25 parametres max, noms de 40 caracteres max). Moins flexible que PostHog/Mixpanel.

#### Option E : Solution maison (events -> PostgreSQL -> Metabase)

**Description** : Les apps et le backend envoient des events a l'API NestJS, qui les persiste dans une table PostgreSQL dediee. Metabase (self-hosted) ou Grafana lit la table pour les dashboards.

| Critere | Evaluation |
|---------|------------|
| Cout | 0 USD (Supabase PostgreSQL existant + Metabase self-hosted gratuit ou Grafana Cloud free tier). |
| Privacy / DPA | Excellent. Les donnees restent dans l'infra BienBon (Supabase Singapour). Zero transfert vers un tiers. |
| Flutter SDK | A construire (simple : appel API REST `POST /analytics/events`). |
| Web SDK | A construire (simple : `fetch()` ou beacon API). |
| Self-hosting | Par definition. |
| Feature flags | A construire. |
| Session replay | Non. |
| Implementation IA | Moyenne. Pas de SDK existant, mais l'implementation est triviale (endpoint API + table SQL). |
| Dashboards | Metabase : SQL -> dashboards visuels. Puissant mais necessite de savoir ecrire du SQL. |

**Inconvenients** :
- **Tout est a construire** : SDK client, endpoint API, schema d'events, dashboards. C'est du temps de dev qui ne va pas vers le produit.
- **Pas de funnels/retention out-of-the-box** : les requetes SQL pour la retention D1/D7/D30 ou les funnels multi-etapes sont complexes a ecrire et a maintenir.
- **Pas de session replay, pas de heatmaps**, pas d'analyse de paths.
- **Scalabilite** : a 50K users, les events analytics peuvent representer des millions de lignes. PostgreSQL gere, mais les queries analytiques deviennent lentes sans partitionnement et indexation soignes.
- **Maintenance** : Metabase self-hosted necessite un serveur dedie (~1-2 GB RAM). Les dashboards doivent etre construits manuellement.

### 2.2 Matrice de decision

| Critere (poids) | PostHog | Mixpanel | Plausible/Umami | Firebase Analytics | Maison |
|-----------------|:-------:|:--------:|:---------------:|:-----------------:|:------:|
| **Cout lancement** (15%) | 4/5 (free tier 1M) | 5/5 (free 20M) | 4/5 (self-host gratuit) | 5/5 (gratuit) | 5/5 (gratuit) |
| **DPA compliance** (20%) | 5/5 (self-host) | 3/5 (USA, DPA agreement) | 5/5 (no cookies) | 2/5 (Google, metadata) | 5/5 (propre infra) |
| **Flutter SDK** (15%) | 4/5 (officiel, stable) | 4/5 (officiel, mature) | 0/5 (inexistant) | 5/5 (Google, tres mature) | 2/5 (a construire) |
| **Web SDK** (10%) | 5/5 (leger, complet) | 4/5 (mature) | 5/5 (ultra-leger) | 3/5 (lourd) | 2/5 (a construire) |
| **Feature flags** (10%) | 5/5 (integres) | 0/5 (absent) | 0/5 (absent) | 3/5 (Remote Config basique) | 0/5 (a construire) |
| **Dashboards produit** (15%) | 4/5 (funnels, retention, paths) | 5/5 (best-in-class) | 1/5 (basique) | 2/5 (basique, BigQuery pour avance) | 3/5 (Metabase, SQL manuel) |
| **Facilite implementation IA** (10%) | 4/5 (bonne doc) | 4/5 (excellente doc) | 5/5 (1 script) | 4/5 (doc massive) | 2/5 (tout a construire) |
| **Self-hosting possible** (5%) | 5/5 | 0/5 | 5/5 | 0/5 | 5/5 |
| **Score pondere** | **4.20** | **3.40** | **2.65** | **3.20** | **3.00** |

### 2.3 Decision : architecture analytics a deux couches

**PostHog (cloud) comme plateforme product analytics principale + Plausible (self-hosted) pour le site vitrine.**

#### Couche 1 : PostHog Cloud -- product analytics, feature flags

Utilise pour les apps Flutter (consumer + partner), l'admin React, et les events backend server-side.

**Justification :**

1. **Meilleur rapport fonctionnalites/cout.** PostHog couvre product analytics + feature flags + A/B tests dans une seule plateforme. A budget equivalent, il faudrait Mixpanel + LaunchDarkly (ou Unleash) pour obtenir les memes fonctionnalites.

2. **Free tier genereux.** 1 million d'events/mois gratuits. Pour une startup a Maurice avec < 10K users, c'est suffisant pour 6-12 mois. A raison de ~50 events/user/jour et 5K users actifs, on consomme ~7.5M events/mois -- donc le passage au plan paye interviendra en phase de croissance, a un cout previsible (~$2.30/mois par tranche de 1M events supplementaires).

3. **Feature flags integres.** Pas besoin d'un outil tiers. Les feature flags PostHog sont gratuits jusqu'a 1M evaluations/mois (largement suffisant). Cela permet de lancer des fonctionnalites progressivement (ex : nouveau parcours de paiement a 10% des users) sans deployer une nouvelle version de l'app.

4. **DPA compliance.** PostHog propose un hebergement cloud EU (Francfort). Les donnees ne partent pas aux USA. Le transfert Maurice -> Allemagne est couvert par les garanties contractuelles (DPA agreement PostHog) et le consentement utilisateur, conformement a la section 36 du DPA 2017 (cf. ADR-021, Q2). De plus, PostHog permet l'anonymisation des user IDs et le masquage de proprietes sensibles.

5. **SDK Flutter officiel.** Le package `posthog_flutter` est maintenu par PostHog, supporte iOS et Android, et s'integre avec Riverpod via un pattern simple (cf. section 4).

6. **Path vers le self-hosting.** Si a terme l'equipe souhaite heberger les donnees analytics sur sa propre infra (ex : VPS Hetzner a Singapour), PostHog est open source et deployable via Docker Compose. Cela offre une porte de sortie que Mixpanel et Firebase ne proposent pas.

**Pourquoi pas Mixpanel ?** Mixpanel a de meilleurs dashboards analytiques, mais n'a pas de feature flags. Il faudrait ajouter un second outil (cout + complexite). Le free tier de 20M events est genereux mais les donnees sont aux USA uniquement. Et surtout, Mixpanel n'offre pas de path vers le self-hosting.

**Pourquoi pas Firebase Analytics ?** Le cout est imbattable (gratuit illimite) et le SDK Flutter est excellent. Mais le Google lock-in est reel : les donnees sont chez Google, les dashboards natifs sont mediocres, et l'export vers BigQuery ajoute de la complexite. La dimension privacy est aussi problematique : Google collecte des metadata meme avec le tracking publicitaire desactive. Pour une startup qui met en avant la confiance et la transparence (anti-gaspi, circuit court), adosser son analytics a Google envoie un mauvais signal.

**Pourquoi pas la solution maison ?** Tentant en termes de privacy (zero tiers), mais le temps de developpement est mieux investi sur le produit. Les funnels, la retention, et les feature flags sont complexes a construire correctement. PostHog fait tout cela out-of-the-box.

#### Couche 2 : Plausible (self-hosted) -- web analytics site vitrine

Utilise uniquement pour le site vitrine Astro (`bienbon.mu`).

**Justification :**

1. **Pas de cookies, pas de consentement requis.** Plausible utilise un tracking privacy-first sans cookies ni donnees personnelles. Conformement au DPA 2017 et au GDPR, aucune banniere de consentement n'est necessaire pour Plausible. C'est un avantage majeur pour le site vitrine, ou la conversion depend de la simplicite (pas de popup cookie au premier clic).

2. **Script ultra-leger (~1 KB).** Aucun impact sur les performances Astro. Le score Lighthouse reste a 100. Compatible avec la strategie performance-first (ADR-013).

3. **Self-hosted gratuit.** Plausible tourne dans un container Docker avec 1 GB RAM et ClickHouse integre. On peut le deployer sur le meme VPS que d'autres services, ou sur un petit Hetzner CX22 (5 USD/mois). Alternativement, Plausible Cloud a 9 EUR/mois est une option zero-maintenance.

4. **Metriques web essentielles.** Pages vues, sources de trafic, pays, appareils, taux de rebond. C'est exactement ce dont le site vitrine a besoin. Les metriques produit avancees (funnels, retention) ne s'appliquent pas a un site marketing.

5. **Events custom.** Plausible supporte les events custom (`cta_clicked`, `store_signup_started`). Suffisant pour mesurer les CTA du site vitrine.

**Pourquoi pas PostHog aussi pour le site vitrine ?** PostHog fonctionne sur le web, mais son SDK JS (~5 KB) est plus lourd que Plausible (~1 KB) et necessite un consentement cookie (il pose des cookies). Pour un site vitrine ou le SEO et la performance sont critiques (ADR-013), Plausible est le choix optimal. PostHog reste disponible en fallback si Plausible ne suffit pas.

### 2.4 Resume de l'architecture analytics

```
                    +----------------------------+
                    |   Utilisateurs (Maurice)   |
                    +---+--------+--------+------+
                        |        |        |
              +---------+  +-----+----+   +----------+
              |            |          |              |
    +---------v---------+  |  +-------v------+  +---v-------------------+
    | App consumer      |  |  | Site vitrine |  | App partner           |
    | Flutter            |  |  | Astro        |  | Flutter                |
    | posthog_flutter    |  |  | Plausible.js |  | posthog_flutter        |
    +---------+---------+  |  +-------+------+  +---+-------------------+
              |            |          |              |
              |            |          |              |
              v            |          v              v
    +---------+------------+----------+--------------+---------+
    |                                                          |
    |   +------------------+     +-------------------------+   |
    |   | PostHog Cloud EU |     | Plausible (self-hosted) |   |
    |   | (Francfort)      |     | ou Plausible Cloud      |   |
    |   |                  |     |                         |   |
    |   | - Product events |     | - Page views            |   |
    |   | - Feature flags  |     | - Traffic sources       |   |
    |   | - Funnels        |     | - CTA clicks            |   |
    |   | - Retention      |     | - Referrers             |   |
    |   | - A/B tests      |     +-------------------------+   |
    |   +--------+---------+                                   |
    |            |                                             |
    |            |    +------------------------------------+   |
    |            +--->| Admin React                        |   |
    |                 | PostHog JS SDK                     |   |
    |                 | (dashboards internes aussi dans    |   |
    |                 |  PostHog)                          |   |
    |                 +------------------------------------+   |
    |                                                          |
    |   +--------------------------------------------------+   |
    |   | Backend NestJS                                   |   |
    |   | PostHog Node SDK (server-side events)            |   |
    |   | - transaction_completed                          |   |
    |   | - refund_processed                               |   |
    |   | - fraud_detected                                 |   |
    |   | - store_approved                                 |   |
    |   +--------------------------------------------------+   |
    +----------------------------------------------------------+
```

---

## 3. Plan de tracking -- evenements a instrumenter

### 3.1 Conventions de nommage

| Regle | Exemple | Raison |
|-------|---------|--------|
| snake_case | `view_basket`, pas `ViewBasket` | Convention PostHog standard, compatible SQL |
| Verbe a l'infinitif ou passe compose | `checkout_start`, `payment_success` | Coherent : action en cours ou resultat |
| Prefixe par domaine si ambiguite | `partner_basket_created` vs `basket_viewed` | Evite les collisions entre consumer et partner |
| Properties en camelCase | `basketId`, `storeId`, `amount` | Convention PostHog pour les proprietes |

### 3.2 App consumer -- evenements

| Evenement | Declencheur | Properties | Priorite |
|-----------|-------------|------------|----------|
| `signup_started` | Ouverture du formulaire d'inscription | `method` (email, Google, Apple) | P0 |
| `signup_completed` | Inscription reussie | `method`, `referralSource` | P0 |
| `login` | Connexion reussie | `method` | P1 |
| `search` | Soumission d'une recherche | `query`, `resultsCount`, `latitude`, `longitude` (arrondis a 2 decimales) | P0 |
| `category_selected` | Clic sur une categorie (CategoryChip) | `categoryId`, `categoryName` | P1 |
| `store_viewed` | Ouverture de la fiche commercant | `storeId`, `storeName`, `source` (search, map, favorites, deeplink) | P0 |
| `basket_viewed` | Ouverture du detail d'un panier | `basketId`, `storeId`, `price`, `originalPrice`, `pickupStart`, `pickupEnd` | P0 |
| `add_to_cart` | Ajout d'un panier au panier | `basketId`, `storeId`, `price` | P0 |
| `checkout_started` | Debut du processus de paiement | `basketId`, `amount`, `paymentMethod` | P0 |
| `payment_success` | Paiement reussi | `basketId`, `orderId`, `amount`, `paymentMethod`, `transactionId` | P0 |
| `payment_failure` | Paiement echoue | `basketId`, `amount`, `paymentMethod`, `errorCode`, `errorMessage` | P0 |
| `pickup_validated` | QR code / PIN valide au retrait | `orderId`, `storeId`, `minutesBeforeEnd` (temps restant avant fin du creneau) | P0 |
| `rating_submitted` | Note soumise apres retrait | `orderId`, `storeId`, `rating` (1-5), `hasComment` | P1 |
| `favorite_added` | Commercant ajoute aux favoris | `storeId`, `storeName` | P1 |
| `favorite_removed` | Commercant retire des favoris | `storeId` | P2 |
| `notification_opened` | Ouverture d'une notification push | `notificationType`, `notificationId` | P1 |
| `notification_permission` | Reponse a la demande de permission push | `granted` (boolean) | P1 |
| `map_opened` | Ouverture de la vue carte | `latitude`, `longitude` (arrondis) | P2 |
| `share_basket` | Partage d'un panier (WhatsApp, etc.) | `basketId`, `shareMethod` | P2 |
| `app_opened` | Lancement de l'app | `source` (direct, deeplink, notification), `appVersion`, `osVersion` | P1 |
| `onboarding_step` | Progression dans l'onboarding | `step` (1, 2, 3...), `completed` | P1 |
| `consent_given` | Consentement analytics donne | `analyticsConsent`, `marketingConsent` | P0 |
| `consent_revoked` | Consentement analytics revoque | `analyticsConsent`, `marketingConsent` | P0 |

### 3.3 App partner -- evenements

| Evenement | Declencheur | Properties | Priorite |
|-----------|-------------|------------|----------|
| `partner_login` | Connexion reussie | `storeId` | P0 |
| `partner_basket_created` | Nouveau panier publie | `basketId`, `storeId`, `quantity`, `price`, `originalPrice`, `category`, `pickupStart`, `pickupEnd` | P0 |
| `partner_basket_updated` | Modification d'un panier existant | `basketId`, `field` (price, quantity, pickup_window), `oldValue`, `newValue` | P1 |
| `partner_stock_adjusted` | Ajustement du stock (augmentation ou diminution) | `basketId`, `oldQuantity`, `newQuantity`, `reason` (manual, sold, expired) | P0 |
| `partner_order_received` | Nouvelle commande recue | `orderId`, `basketId`, `amount` | P0 |
| `partner_pickup_scanned` | QR code scanne pour valider un retrait | `orderId`, `scanMethod` (qr, pin_manual), `scanDuration_ms` | P0 |
| `partner_payout_viewed` | Consultation de l'historique des paiements | `period` (week, month), `totalAmount` | P1 |
| `partner_stats_viewed` | Consultation des statistiques | `period`, `metric` (sales, revenue, ratings) | P2 |
| `partner_store_updated` | Modification du profil commercant | `field` (name, address, hours, photo) | P2 |
| `partner_app_opened` | Lancement de l'app partner | `storeId`, `appVersion` | P1 |

### 3.4 Site vitrine (Astro) -- evenements Plausible

| Evenement | Declencheur | Properties | Priorite |
|-----------|-------------|------------|----------|
| `pageview` | Chargement de page (automatique Plausible) | `path`, `referrer` (automatiques) | P0 |
| `cta_download_clicked` | Clic sur "Telecharger l'app" | `platform` (ios, android), `page` | P0 |
| `cta_partner_clicked` | Clic sur "Devenir partenaire" | `page` | P0 |
| `partner_form_started` | Debut du formulaire partenaire (US-W003) | `page` | P0 |
| `partner_form_submitted` | Soumission du formulaire partenaire | -- | P0 |
| `faq_question_opened` | Ouverture d'une question FAQ | `questionId` | P2 |
| `language_switched` | Changement de langue | `from`, `to` | P2 |

### 3.5 Backend NestJS -- evenements server-side

Ces events sont envoyes depuis le backend via le SDK Node PostHog. Ils representent des verites systeme (pas des interactions UI) et ne dependent pas du client.

| Evenement | Declencheur | Properties | Priorite |
|-----------|-------------|------------|----------|
| `transaction_completed` | Paiement capture par Peach Payments | `orderId`, `amount`, `currency`, `storeId`, `consumerId` (anonymise), `paymentMethod` | P0 |
| `transaction_refunded` | Remboursement effectue | `orderId`, `amount`, `reason`, `refundType` (full, partial) | P0 |
| `fraud_detected` | Alerte fraude declenchee (ADR-019) | `orderId`, `ruleTriggered`, `severity`, `action` (block, flag) | P0 |
| `store_approved` | Commercant approuve par l'admin | `storeId`, `approvalDuration_hours` | P1 |
| `store_suspended` | Commercant suspendu | `storeId`, `reason` | P1 |
| `basket_expired` | Panier expire sans vente | `basketId`, `storeId`, `quantity`, `unsoldQuantity` | P0 |
| `pickup_no_show` | No-show detecte (creneau expire, pas de scan) | `orderId`, `storeId`, `consumerId` (anonymise) | P0 |
| `daily_impact_computed` | Calcul quotidien de l'impact environnemental | `date`, `basketsSaved`, `kgFoodSaved`, `co2Avoided_kg` | P1 |

### 3.6 Properties globales (super properties)

Proprietes automatiquement ajoutees a chaque event :

| Property | Source | Description |
|----------|--------|-------------|
| `platform` | SDK | `ios`, `android`, `web` |
| `appVersion` | SDK | Version de l'app (ex : `1.2.3`) |
| `osVersion` | SDK | Version de l'OS (ex : `iOS 18.2`, `Android 15`) |
| `deviceModel` | SDK | Modele de l'appareil (ex : `iPhone 15`, `Samsung Galaxy A14`) |
| `locale` | App | Langue de l'interface (`fr`, `en`, `kr`) |
| `isOffline` | App | `true` si l'event a ete bufferise offline |
| `sessionId` | SDK | ID de session PostHog (anonyme) |

---

## 4. Architecture du tracking dans Flutter

### 4.1 Service analytics avec Riverpod

Le tracking s'integre dans l'architecture Riverpod (ADR-029) via un service dedie, accessible par tous les providers et widgets.

```dart
// lib/core/analytics/analytics_service.dart

import 'package:posthog_flutter/posthog_flutter.dart';

abstract class AnalyticsService {
  Future<void> identify(String userId, {Map<String, dynamic>? properties});
  Future<void> track(String event, {Map<String, dynamic>? properties});
  Future<void> reset(); // Logout : anonymise le user
  Future<void> setOptOut(bool optOut); // Consent management
  Future<bool> isFeatureEnabled(String flagKey);
  Future<dynamic> getFeatureFlag(String flagKey);
}

class PostHogAnalyticsService implements AnalyticsService {
  final Posthog _posthog;

  PostHogAnalyticsService(this._posthog);

  @override
  Future<void> identify(String userId, {Map<String, dynamic>? properties}) async {
    await _posthog.identify(userId: userId, userProperties: properties);
  }

  @override
  Future<void> track(String event, {Map<String, dynamic>? properties}) async {
    await _posthog.capture(eventName: event, properties: properties);
  }

  @override
  Future<void> reset() async {
    await _posthog.reset();
  }

  @override
  Future<void> setOptOut(bool optOut) async {
    if (optOut) {
      await _posthog.disable();
    } else {
      await _posthog.enable();
    }
  }

  @override
  Future<bool> isFeatureEnabled(String flagKey) async {
    return await _posthog.isFeatureEnabled(flagKey) ?? false;
  }

  @override
  Future<dynamic> getFeatureFlag(String flagKey) async {
    return await _posthog.getFeatureFlagPayload(flagKey);
  }
}
```

```dart
// lib/core/analytics/analytics_providers.dart

import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'analytics_providers.g.dart';

@riverpod
AnalyticsService analyticsService(Ref ref) {
  // Initialise dans le bootstrap de l'app
  throw UnimplementedError('Must be overridden in ProviderScope');
}

// Helper : provider qui expose les feature flags de maniere reactive
@riverpod
Future<bool> featureFlag(Ref ref, String flagKey) async {
  final analytics = ref.watch(analyticsServiceProvider);
  return analytics.isFeatureEnabled(flagKey);
}
```

### 4.2 Observer GoRouter -- tracking automatique des navigations

Plutot que de placer des appels `analytics.track()` manuellement dans chaque ecran, on utilise un observer GoRouter qui tracke automatiquement les ecrans visites.

```dart
// lib/core/analytics/analytics_route_observer.dart

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AnalyticsRouteObserver extends NavigatorObserver {
  final AnalyticsService analytics;

  AnalyticsRouteObserver(this.analytics);

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _trackScreen(route);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (previousRoute != null) {
      _trackScreen(previousRoute);
    }
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    if (newRoute != null) {
      _trackScreen(newRoute);
    }
  }

  void _trackScreen(Route<dynamic> route) {
    final name = route.settings.name;
    if (name != null && name.isNotEmpty) {
      analytics.track('screen_viewed', properties: {
        'screenName': name,
      });
    }
  }
}
```

```dart
// Integration dans le GoRouter (cf. ADR-029 pour le pattern router)
final router = GoRouter(
  observers: [
    AnalyticsRouteObserver(ref.read(analyticsServiceProvider)),
  ],
  routes: [/* ... */],
);
```

### 4.3 Tracking manuel dans les providers Riverpod

Pour les events metier (pas de navigation), le tracking se fait dans les providers/notifiers Riverpod :

```dart
// Exemple : provider de checkout
@riverpod
class CheckoutNotifier extends _$CheckoutNotifier {
  @override
  FutureOr<CheckoutState> build() => const CheckoutState.initial();

  Future<void> startCheckout(Basket basket) async {
    state = const AsyncLoading();

    // Track l'event
    final analytics = ref.read(analyticsServiceProvider);
    await analytics.track('checkout_started', properties: {
      'basketId': basket.id,
      'amount': basket.price,
      'paymentMethod': basket.selectedPaymentMethod,
    });

    // ... logique de checkout
  }

  Future<void> onPaymentSuccess(PaymentResult result) async {
    final analytics = ref.read(analyticsServiceProvider);
    await analytics.track('payment_success', properties: {
      'basketId': result.basketId,
      'orderId': result.orderId,
      'amount': result.amount,
      'paymentMethod': result.paymentMethod,
      'transactionId': result.transactionId,
    });

    // ... logique post-paiement
  }
}
```

### 4.4 Pattern middleware (optionnel, pour tracking transversal)

Pour les events qui doivent etre trackes sur toutes les mutations d'un certain type (ex : toutes les erreurs reseau), un provider observer Riverpod peut etre utilise :

```dart
// lib/core/analytics/analytics_provider_observer.dart

class AnalyticsProviderObserver extends ProviderObserver {
  final AnalyticsService analytics;

  AnalyticsProviderObserver(this.analytics);

  @override
  void didUpdateProvider(
    ProviderBase provider,
    Object? previousValue,
    Object? newValue,
    ProviderContainer container,
  ) {
    // Track les erreurs async automatiquement
    if (newValue is AsyncError) {
      analytics.track('async_error', properties: {
        'provider': provider.name ?? provider.runtimeType.toString(),
        'error': newValue.error.toString(),
      });
    }
  }
}
```

### 4.5 Buffering offline

Le SDK `posthog_flutter` gere nativement le buffering offline :

1. **Quand l'appareil est offline** : les events sont stockes dans une queue locale (SharedPreferences / SQLite sous le capot du SDK).
2. **Quand la connexion revient** : le SDK flush automatiquement la queue et envoie les events bufferises a PostHog.
3. **Taille de la queue** : configurable. Par defaut, PostHog conserve jusqu'a 1000 events en queue locale.
4. **Flush interval** : configurable. Par defaut, le SDK envoie les events toutes les 30 secondes ou quand la queue atteint un certain seuil.

```dart
// Configuration PostHog avec buffering
final config = PostHogConfig(
  apiKey: 'phc_xxx',
  host: 'https://eu.i.posthog.com', // EU cloud
  flushAt: 20,          // Envoyer quand 20 events accumules
  flushInterval: 30,    // Ou toutes les 30 secondes
  maxQueueSize: 1000,   // Max 1000 events en queue offline
  maxBatchSize: 50,     // Max 50 events par batch HTTP
);
```

**Property `isOffline`** : pour distinguer les events temps reel des events bufferises, on ajoute une super property :

```dart
// Dans le bootstrap, ecouter la connectivite et mettre a jour la super property
ref.listen(connectivityProvider, (_, connectivity) {
  final analytics = ref.read(analyticsServiceProvider);
  // PostHog register pour les super properties
  analytics.track('\$set', properties: {
    'isOffline': !connectivity.isConnected,
  });
});
```

### 4.6 Server-side tracking (Backend NestJS)

Les events backend sont envoyes via le SDK Node PostHog. Ils representent des verites systeme et ne dependent pas du comportement client.

```typescript
// backend/src/core/analytics/analytics.service.ts

import { PostHog } from 'posthog-node';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly posthog: PostHog;

  constructor() {
    this.posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
      host: 'https://eu.i.posthog.com',
      flushAt: 20,
      flushInterval: 10000, // 10 secondes
    });
  }

  track(distinctId: string, event: string, properties?: Record<string, any>) {
    this.posthog.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        source: 'backend',
        environment: process.env.NODE_ENV,
      },
    });
  }

  async onModuleDestroy() {
    await this.posthog.shutdown(); // Flush les events restants
  }
}
```

```typescript
// Exemple d'utilisation dans un service metier
@Injectable()
export class OrderService {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  async completeTransaction(orderId: string) {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
      include: { basket: true, consumer: true },
    });

    this.analytics.track(order.consumerId, 'transaction_completed', {
      orderId: order.id,
      amount: order.amount,
      currency: 'MUR',
      storeId: order.basket.storeId,
      paymentMethod: order.paymentMethod,
    });

    return order;
  }
}
```

---

## 5. Privacy et consent management

### 5.1 Principes (conformite DPA 2017 -- cf. ADR-021)

| Principe | Implementation |
|----------|---------------|
| **Pas de tracking avant consentement** | Le SDK PostHog est initialise en mode `optOut: true`. Aucun event n'est envoye tant que l'utilisateur n'a pas consenti. |
| **Consentement explicite** | Un ecran de consentement s'affiche au premier lancement de l'app (apres l'onboarding). Deux toggles : "Analytics" (necessaire pour l'amelioration du service) et "Marketing" (notifications promotionnelles). |
| **Revocation a tout moment** | L'utilisateur peut revoquer son consentement dans les parametres de l'app. L'appel `analytics.setOptOut(true)` stoppe immediatement le tracking. |
| **Anonymisation** | Les user IDs envoyes a PostHog sont des UUIDs internes (pas d'email, pas de telephone). Les coordonnees GPS sont arrondies a 2 decimales (~1.1 km de precision). Les adresses IP sont anonymisees par PostHog (configuration serveur). |
| **Pas de donnees sensibles dans les events** | Jamais de nom, email, telephone, adresse exacte, donnees de paiement dans les proprietes d'events. Les identifiants sont des UUIDs opaques. |
| **Data retention** | PostHog Cloud EU : les donnees sont conservees selon le plan (illimitee en cloud). Cote BienBon, une politique de retention de 24 mois est definie. Au-dela, les donnees sont purgees ou anonymisees. |

### 5.2 Ecran de consentement (apps Flutter)

```
+------------------------------------------+
|                                          |
|  [Dodo mascot illustration]             |
|                                          |
|  Nous respectons votre vie privee        |
|                                          |
|  BienBon utilise des outils d'analyse    |
|  pour ameliorer votre experience.        |
|  Aucune donnee personnelle n'est         |
|  partagee avec des tiers publicitaires.  |
|                                          |
|  [toggle] Analyse d'utilisation          |
|           Nous aide a ameliorer l'app    |
|                                          |
|  [toggle] Notifications marketing        |
|           Offres et nouveautes           |
|                                          |
|  En savoir plus : Politique de           |
|  confidentialite                         |
|                                          |
|  [  Accepter et continuer  ]  (vert)    |
|  [  Continuer sans analyse  ] (texte)   |
|                                          |
+------------------------------------------+
```

### 5.3 Implementation du consentement dans Riverpod

```dart
// lib/core/consent/consent_providers.dart

@riverpod
class ConsentNotifier extends _$ConsentNotifier {
  @override
  ConsentState build() {
    // Lire le consentement persiste dans SharedPreferences
    final prefs = ref.watch(sharedPreferencesProvider);
    return ConsentState(
      analyticsConsent: prefs.getBool('analytics_consent') ?? false,
      marketingConsent: prefs.getBool('marketing_consent') ?? false,
      consentDate: prefs.getString('consent_date'),
    );
  }

  Future<void> updateConsent({
    required bool analyticsConsent,
    required bool marketingConsent,
  }) async {
    final prefs = ref.read(sharedPreferencesProvider);
    final now = DateTime.now().toIso8601String();

    await prefs.setBool('analytics_consent', analyticsConsent);
    await prefs.setBool('marketing_consent', marketingConsent);
    await prefs.setString('consent_date', now);

    // Mettre a jour PostHog
    final analytics = ref.read(analyticsServiceProvider);
    await analytics.setOptOut(!analyticsConsent);

    // Tracker le consentement lui-meme (si analytics consent)
    if (analyticsConsent) {
      await analytics.track('consent_given', properties: {
        'analyticsConsent': analyticsConsent,
        'marketingConsent': marketingConsent,
      });
    }

    state = ConsentState(
      analyticsConsent: analyticsConsent,
      marketingConsent: marketingConsent,
      consentDate: now,
    );
  }
}

@freezed
class ConsentState with _$ConsentState {
  const factory ConsentState({
    required bool analyticsConsent,
    required bool marketingConsent,
    String? consentDate,
  }) = _ConsentState;
}
```

### 5.4 Site vitrine -- pas de banniere cookie pour Plausible

Plausible ne pose aucun cookie et ne collecte aucune donnee personnelle. Le tracking est agrege (pas de user ID, pas d'IP stockee). Conformement au DPA 2017 et au GDPR, **aucune banniere de consentement n'est necessaire** pour Plausible.

Si PostHog est ajoute au site vitrine a l'avenir (ex : pour les funnels), une banniere de consentement devra etre implementee a ce moment.

### 5.5 Data retention policy

| Type de donnees | Retention | Action a expiration |
|-----------------|-----------|---------------------|
| Events analytics (PostHog) | 24 mois | Suppression automatique (configurable dans PostHog) |
| Events web (Plausible) | 24 mois | Plausible anonymise par defaut, les donnees agregees sont conservees indefiniment |
| Consentement utilisateur (preuve) | Duree de vie du compte + 3 ans | Conserve dans la BDD Supabase pour preuve legale |
| Feature flag evaluations | 30 jours | Suppression automatique (PostHog) |

---

## 6. KPIs metier et dashboards

### 6.1 Dashboard 1 : Funnel de conversion (consumer)

**Objectif** : identifier ou les consommateurs abandonnent.

```
Funnel :  search  ->  store_viewed  ->  basket_viewed  ->  add_to_cart  ->  checkout_started  ->  payment_success
          100%         72%               58%                35%              28%                   24%

(Chiffres illustratifs -- les vrais seront mesures)
```

**KPIs** :
- Taux de conversion global (search -> payment_success)
- Taux de drop-off par etape
- Temps moyen entre search et payment_success
- Segmentation par : heure du jour, categorie, zone geographique

**Outil** : PostHog Funnels (built-in).

### 6.2 Dashboard 2 : Taux de no-show

**Objectif** : mesurer les paniers reserves mais non recuperes.

**KPIs** :
- Taux de no-show global : `pickup_no_show / (pickup_validated + pickup_no_show)`
- Taux de no-show par commercant
- Taux de no-show par creneau horaire
- Evolution hebdomadaire du no-show

**Outil** : PostHog Trends + Insights, basees sur les events `pickup_validated` et `pickup_no_show`.

### 6.3 Dashboard 3 : Retention utilisateur

**Objectif** : mesurer la fidelite des consommateurs.

**KPIs** :
- Retention D1 (% d'users actifs le lendemain de l'inscription)
- Retention D7
- Retention D30
- Courbe de retention par cohorte d'inscription
- "Stickiness" : combien de jours par semaine les users ouvrent l'app

**Outil** : PostHog Retention (built-in). L'event de reference est `app_opened`, l'event de retour est `payment_success` (retention transactionnelle) ou `app_opened` (retention d'engagement).

### 6.4 Dashboard 4 : Revenue et panier moyen

**Objectif** : suivre la sante financiere.

**KPIs** :
- GMV (Gross Merchandise Value) : somme de tous les `transaction_completed.amount`
- Revenue BienBon : GMV x taux de commission (cf. ADR-007)
- Panier moyen : GMV / nombre de transactions
- Revenue per user (RPU) : GMV / nombre de consumers actifs
- Transactions par jour, par semaine

**Outil** : PostHog Trends sur `transaction_completed`, avec agrégation sur la property `amount`.

### 6.5 Dashboard 5 : Impact environnemental

**Objectif** : mesurer et communiquer l'impact positif de BienBon.

**KPIs** :
- Paniers sauves (cumule et par periode)
- Kg de nourriture sauvee (estimation : 1 panier = ~2 kg en moyenne, a affiner)
- CO2 evite (estimation : 1 kg de nourriture jetee = ~2.5 kg CO2, incluant production + transport + decomposition en decharge)
- Nombre de partenaires actifs
- Evolution de l'impact par mois

**Source** : event backend `daily_impact_computed`. Ces chiffres alimentent aussi le compteur d'impact du site vitrine (US-W010) via l'API publique.

**Outil** : PostHog Trends + un dashboard dedie. Les chiffres d'impact sont aussi exposes via l'endpoint API `GET /api/impact` pour le site vitrine.

### 6.6 Dashboard 6 : Metriques partenaires

**Objectif** : aider l'equipe BienBon a piloter la relation partenaire.

**KPIs** :
- Taux de vente par partenaire : paniers vendus / paniers publies
- Temps moyen entre publication et premiere vente
- Nombre de paniers publies par partenaire par semaine
- Rating moyen par partenaire
- Taux de no-show par partenaire (indicateur de fiabilite)
- Revenue par partenaire

**Outil** : PostHog Insights, filtre par `storeId`.

### 6.7 Dashboard 7 : Acquisition site vitrine

**Objectif** : mesurer l'efficacite du site vitrine comme canal d'acquisition.

**KPIs** :
- Visiteurs uniques / mois
- Sources de trafic (organic, social, direct, referral)
- Taux de clic sur CTA "Telecharger l'app" (par plateforme)
- Taux de soumission du formulaire partenaire
- Pages les plus consultees
- Taux de rebond

**Outil** : Plausible dashboard (built-in).

---

## 7. Feature flags

### 7.1 Pourquoi les feature flags sont inclus dans cette decision

PostHog inclut les feature flags nativement. Les separer dans un ADR distinct ajouterait de la complexite sans benefice. Si la decision d'analytics avait ete Mixpanel (sans feature flags), un ADR-037 separe aurait ete necessaire.

### 7.2 Cas d'usage des feature flags pour BienBon

| Flag | Type | Description |
|------|------|-------------|
| `new_checkout_flow` | Boolean | Active le nouveau parcours de paiement pour un % d'utilisateurs |
| `mcb_juice_payment` | Boolean | Active le moyen de paiement MCB Juice (deploiement progressif) |
| `partner_analytics_tab` | Boolean | Affiche l'onglet "Statistiques" dans l'app partenaire |
| `dark_mode` | Boolean | Active le mode sombre (quand il sera pret) |
| `max_baskets_per_store` | Multivariate | Nombre max de types de paniers par commercant (3, 5, 10) -- A/B test |
| `coming_soon_mode` | Boolean | Active le mode "Coming Soon" sur le site vitrine (US-W011) |
| `referral_program` | Boolean | Active le programme de parrainage |

### 7.3 Integration dans Flutter (Riverpod)

```dart
// Exemple : conditionner l'affichage d'une feature via un provider
@riverpod
Future<bool> isMcbJuiceEnabled(Ref ref) async {
  final analytics = ref.watch(analyticsServiceProvider);
  return analytics.isFeatureEnabled('mcb_juice_payment');
}

// Dans le widget
class PaymentMethodSelector extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mcbJuiceEnabled = ref.watch(isMcbJuiceEnabledProvider);

    return mcbJuiceEnabled.when(
      data: (enabled) => Column(
        children: [
          PaymentMethodCard(method: PaymentMethod.card),
          if (enabled) PaymentMethodCard(method: PaymentMethod.mcbJuice),
        ],
      ),
      loading: () => const CircularProgressIndicator(),
      error: (_, __) => PaymentMethodCard(method: PaymentMethod.card), // Fallback : desactive
    );
  }
}
```

### 7.4 Feature flags cote backend (NestJS)

```typescript
// backend/src/core/feature-flags/feature-flags.service.ts

import { PostHog } from 'posthog-node';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagsService {
  private readonly posthog: PostHog;

  constructor() {
    this.posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
      host: 'https://eu.i.posthog.com',
    });
  }

  async isEnabled(flagKey: string, distinctId: string): Promise<boolean> {
    return await this.posthog.isFeatureEnabled(flagKey, distinctId) ?? false;
  }

  async getPayload(flagKey: string, distinctId: string): Promise<any> {
    return await this.posthog.getFeatureFlagPayload(flagKey, distinctId);
  }
}
```

```typescript
// Exemple d'utilisation dans un controller
@Post('checkout')
async checkout(@Body() dto: CheckoutDto, @User() user: AuthUser) {
  const mcbJuiceEnabled = await this.featureFlags.isEnabled(
    'mcb_juice_payment',
    user.id,
  );

  if (dto.paymentMethod === 'mcb_juice' && !mcbJuiceEnabled) {
    throw new ForbiddenException('MCB Juice payment is not available');
  }

  return this.orderService.checkout(dto);
}
```

---

## 8. Estimation des couts

### 8.1 Phase 1 : Lancement (0-10K users)

| Composant | Fournisseur | Plan | Cout/mois |
|-----------|-------------|------|-----------|
| Product analytics + feature flags | PostHog Cloud EU | Free (1M events/mois) | 0 USD |
| Web analytics site vitrine | Plausible self-hosted (Hetzner CX22) | Self-hosted | ~5 USD (partage avec d'autres services) |
| Web analytics site vitrine (alternative) | Plausible Cloud | 9 EUR/mois | ~10 USD |
| **TOTAL (option self-hosted)** | | | **~5 USD/mois** |
| **TOTAL (option cloud)** | | | **~10 USD/mois** |

**Estimation d'events** :
- 5K users actifs x ~30 events/jour = ~150K events/jour = ~4.5M events/mois
- Au-dela de 1M events/mois, PostHog facture ~$0.00031/event
- Cout supplementaire a 5K users : (4.5M - 1M) x $0.00031 = **~$1.10/mois**
- Le cout PostHog reste negligeable en Phase 1.

### 8.2 Phase 2 : Croissance (10K-50K users)

| Composant | Fournisseur | Plan | Cout/mois |
|-----------|-------------|------|-----------|
| Product analytics + feature flags | PostHog Cloud EU | Pay-as-you-go | 15-50 USD |
| Web analytics site vitrine | Plausible | Cloud ou self-hosted | 5-10 USD |
| **TOTAL** | | | **~20-60 USD/mois** |

**Estimation d'events** :
- 30K users actifs x ~30 events/jour = ~900K events/jour = ~27M events/mois
- PostHog : (27M - 1M) x $0.00031 = **~$8.06/mois** pour les events seuls
- Feature flags : 30K users x ~10 evaluations/jour = ~9M evaluations/mois. Gratuit jusqu'a 1M, puis $0.0001/evaluation = **~$0.80/mois**
- **Total PostHog realiste a 30K users : ~$9-15/mois** (tres abordable)

### 8.3 Point de bascule vers le self-hosting PostHog

Si le volume atteint 100M events/mois (50K users tres actifs ou croissance forte), le cout PostHog Cloud serait ~$31/mois -- toujours abordable. Le self-hosting ne devient pertinent qu'a > 200M events/mois ou si des exigences de data residency l'imposent.

**Seuil recommande pour evaluer le self-hosting** : quand le cout PostHog Cloud depasse 100 USD/mois (soit ~300M events/mois, scenario > 100K users actifs). A ce stade, un VPS Hetzner CAX31 (8 GB ARM, ~8 EUR/mois) pourrait heberger PostHog self-hosted.

### 8.4 Impact sur le budget infra global (ADR-020)

| Phase | Budget infra actuel (ADR-020) | + Analytics | Total |
|-------|-------------------------------|-------------|-------|
| Lancement (< 100 users) | 37-42 USD | +5 USD | **42-47 USD** |
| Croissance (~1K users) | 72-130 USD | +10-15 USD | **82-145 USD** |
| Maturite (~10K users) | 155-385 USD | +20-60 USD | **175-445 USD** |

L'analytics represente ~10-15% du budget infra total. C'est un investissement modeste pour la valeur apportee (decisions data-driven).

---

## 9. Consequences

### Positives

1. **Decisions data-driven des le lancement.** L'equipe dispose de funnels, retention, et KPIs metier reels pour piloter la startup. Plus de "on pense que" -- des donnees.

2. **Feature flags sans infrastructure supplementaire.** PostHog integre les feature flags. Pas besoin d'un outil tiers (LaunchDarkly a $10/seat/mois, Unleash self-hosted). Les rollouts progressifs et les A/B tests sont possibles immediatement.

3. **Privacy-first coherent avec l'image de marque.** Plausible sans cookies pour le site vitrine, PostHog EU avec consentement explicite pour les apps. BienBon peut communiquer honnetement sur sa politique de donnees. Conformite DPA 2017 assuree.

4. **Cout negligeable.** ~5-15 USD/mois au lancement. Le free tier PostHog (1M events) couvre les premiers mois. Plausible self-hosted coute le prix d'un cafe.

5. **Path vers le self-hosting.** PostHog est open source. Si les couts augmentent ou si des exigences de data residency emergent, le self-hosting est une option reelle. Mixpanel et Firebase ne proposent pas ca.

6. **SDK Flutter officiel et maintenu.** `posthog_flutter` est stable et s'integre proprement avec Riverpod. Pas de SDK custom a maintenir.

7. **Tracking offline natif.** Le SDK PostHog bufferise les events quand le reseau est absent. Compatible avec l'architecture offline-first (ADR-012).

### Negatives

1. **Deux outils analytics au lieu d'un.** PostHog pour les apps/backend + Plausible pour le site vitrine = deux dashboards a consulter. Attenuation : les audiences sont differentes (equipe produit vs equipe marketing). Plausible peut etre remplace par le web tracking PostHog si la complexite devient un probleme.

2. **PostHog Cloud EU, pas Singapour.** Les donnees analytics sont a Francfort (EU), pas colocalisees avec le backend (Singapour). La latence d'envoi des events est de ~150-200 ms depuis Maurice vers l'EU -- acceptable pour des analytics asynchrones. Les donnees de production (Supabase) restent a Singapour.

3. **Dependance a PostHog (startup fondee en 2020).** PostHog est une startup VC-funded. Si elle ferme, il faut migrer. Attenuation : PostHog est open source (MIT License). Le code est disponible sur GitHub. Le self-hosting est toujours possible. Et les donnees sont exportables via l'API.

4. **Discipline de tracking requise.** Le plan de tracking (section 3) doit etre maintenu a jour. Chaque nouvelle feature doit inclure ses events analytics. Risque de drift entre le plan et l'implementation. Attenuation : inclure la revue du tracking dans le code review (checklist : "les events analytics sont-ils implementes ?").

5. **Pas de session replay mobile en GA.** PostHog propose le session replay web, mais le session replay mobile (Flutter) est en beta. Si le debug UX sur mobile est critique, il faudra attendre la GA ou utiliser un outil complementaire.

---

## 10. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Le free tier PostHog (1M events) est depasse rapidement | Moyenne | Faible | A 5K users, le cout supplementaire est ~$1/mois. Budget negligeable. Alerter sur la consommation dans le dashboard PostHog. |
| PostHog change ses prix de maniere aggressive | Faible | Moyen | PostHog est open source. Migration vers self-hosted en 1-2 jours. Les events sont exportables. |
| L'equipe n'exploite pas les dashboards | Moyenne | Moyen | Definir un rituel hebdomadaire "review KPIs" (30 min). Configurer des alertes automatiques sur les metriques critiques (taux de no-show > 20%, conversion < 5%). |
| Les events ne sont pas implementes correctement (noms incoherents, properties manquantes) | Moyenne | Moyen | Lint du plan de tracking : documenter chaque event dans le code (commentaires), revue en PR. PostHog a un "data management" qui detecte les events non documentes. |
| Probleme de consentement : tracking active avant consentement (bug) | Faible | Eleve | Test automatise : verifier que PostHog est en mode `optOut: true` au demarrage. Test d'integration dans le pipeline CI. |
| Latence d'envoi des events degrade l'UX | Tres faible | Faible | L'envoi est asynchrone et non-bloquant. Le SDK PostHog n'attend pas la reponse serveur pour continuer. Aucun impact perceptible sur l'UX. |
| Plausible self-hosted tombe | Faible | Faible | Aucun impact utilisateur (le tracking echoue silencieusement). Monitoring via UptimeRobot. Restart automatique Docker. Fallback : Plausible Cloud a 9 EUR/mois. |

---

## 11. Plan d'implementation

### Phase 0 : Setup initial (1-2 jours)

1. Creer un projet PostHog Cloud EU (Francfort)
2. Configurer les API keys (production + staging)
3. Deployer Plausible self-hosted (Docker sur VPS Hetzner) ou s'inscrire a Plausible Cloud
4. Ajouter le script Plausible au site vitrine Astro (`<script defer data-domain="bienbon.mu" src="...">`)
5. Stocker les API keys dans Railway env vars et GitHub Secrets

### Phase 1 : Integration apps Flutter (2-3 jours)

1. Ajouter `posthog_flutter` aux dependencies du monorepo Melos
2. Implementer `AnalyticsService` (section 4.1)
3. Implementer `ConsentNotifier` (section 5.3)
4. Configurer l'observer GoRouter (section 4.2)
5. Implementer les events P0 du consumer et du partner (sections 3.2, 3.3)
6. Tester le buffering offline

### Phase 2 : Integration backend (1 jour)

1. Ajouter `posthog-node` au backend NestJS
2. Implementer `AnalyticsService` backend (section 4.6)
3. Implementer `FeatureFlagsService` (section 7.4)
4. Instrumenter les events P0 server-side (section 3.5)

### Phase 3 : Dashboards et alertes (1 jour)

1. Creer les 7 dashboards dans PostHog (section 6)
2. Configurer les alertes : no-show > 20%, conversion < 5%, erreurs de paiement > 5%
3. Configurer les feature flags initiaux (section 7.2)
4. Former l'equipe sur la lecture des dashboards

### Phase 4 : Events P1 et P2 (ongoing)

Implementer progressivement les events P1 et P2 au fil du developpement des features.

---

## 12. Recapitulatif des decisions

| Question | Decision | Justification courte |
|----------|----------|---------------------|
| Solution product analytics | **PostHog Cloud EU** | Meilleur rapport fonctionnalites/cout. Open source, feature flags inclus, SDK Flutter officiel, conformite DPA via EU hosting. |
| Solution web analytics (vitrine) | **Plausible (self-hosted ou cloud)** | Privacy-first, pas de cookies, ultra-leger. Pas de banniere de consentement necessaire. |
| Hebergement PostHog | **Cloud EU (Francfort)** au lancement | Zero maintenance. Self-hosting envisageable si > 100 USD/mois ou exigence data residency. |
| Feature flags | **PostHog (integre)** | Pas d'outil supplementaire. Gratuit jusqu'a 1M evaluations/mois. ADR-037 non necessaire. |
| Tracking Flutter | **Observer GoRouter + tracking manuel dans les Notifiers Riverpod** | Automatique pour les ecrans, explicite pour les events metier. |
| Buffering offline | **SDK PostHog natif** | Queue locale automatique, flush quand connexion revient. |
| Consentement | **Opt-in explicite avant tout tracking** | Conformite DPA 2017. PostHog initialise en `optOut: true`. |
| Data retention | **24 mois** | Suffisant pour l'analyse de tendances. Conforme DPA 2017. |
| Budget analytics | **~5-15 USD/mois au lancement** | ~10-15% du budget infra total. Negligeable vs la valeur apportee. |

---

## 13. References

### ADR liees
- ADR-001 : Stack backend (NestJS + Prisma + Supabase)
- ADR-012 : Offline-first et cache (Drift/SQLite, buffering)
- ADR-013 : PWA, distribution web et site vitrine (Astro)
- ADR-020 : Hebergement et infrastructure (Railway, Cloudflare, couts)
- ADR-021 : Conformite DPA 2017 et GDPR (consentement, anonymisation, retention)
- ADR-029 : Flutter state management (Riverpod, GoRouter, observers)

### Specs
- US-W010 : Compteur d'impact sur le site vitrine
- US-W011 : Mode "Coming Soon"
- US-C001 a US-C043 : Consumer user stories
- US-P001 a US-P030 : Partner user stories

### Ressources externes
- [PostHog Documentation](https://posthog.com/docs) -- Plateforme product analytics open source
- [PostHog Flutter SDK](https://posthog.com/docs/libraries/flutter) -- Package `posthog_flutter`
- [PostHog Node SDK](https://posthog.com/docs/libraries/node) -- Package `posthog-node`
- [PostHog Feature Flags](https://posthog.com/docs/feature-flags) -- Documentation feature flags
- [PostHog Pricing](https://posthog.com/pricing) -- Free tier et pay-as-you-go
- [PostHog EU Cloud](https://posthog.com/docs/cloud/hosting-options) -- Hebergement EU (Francfort)
- [Plausible Analytics](https://plausible.io/) -- Web analytics privacy-first
- [Plausible Self-Hosting](https://plausible.io/docs/self-hosting) -- Guide Docker
- [Mixpanel Flutter SDK](https://github.com/mixpanel/mixpanel-flutter) -- Reference (non retenu)
- [Firebase Analytics Flutter](https://firebase.google.com/docs/analytics/get-started?platform=flutter) -- Reference (non retenu)
- [Data Protection Act 2017 Maurice](https://rm.coe.int/dpa-2017-maurice/168077c5b8) -- Texte integral
- [Riverpod Documentation](https://riverpod.dev/) -- State management Flutter
