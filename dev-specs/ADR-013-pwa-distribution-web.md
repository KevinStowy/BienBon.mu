# ADR-013 : Strategie PWA, distribution web et site vitrine

| Champ         | Valeur                                                                              |
|---------------|-------------------------------------------------------------------------------------|
| **Statut**    | Propose                                                                             |
| **Date**      | 2026-02-27                                                                          |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                                                 |
| **Decideurs** | Equipe technique BienBon                                                            |
| **Scope**     | Distribution web (PWA, site vitrine, Flutter Web), strategie de presence en ligne    |
| **Prerequis** | ADR-002 (architecture applicative, apps Flutter + admin React), ADR-012 (offline-first, SW par defaut Flutter Web), ADR-020 (hebergement Cloudflare Pages) |
| **US clefs**  | US-T006 (installation PWA), US-W001 a US-W011 (site vitrine), US-T005 (geolocalisation), US-T007 (accessibilite), US-T008 (i18n) |

---

## 1. Contexte

BienBon.mu est une marketplace mobile de paniers anti-gaspi a l'ile Maurice. L'ADR-002 a tranche l'architecture frontend globale :

- **Apps mobiles Flutter** : 2 apps separees (consumer + partner) dans un monorepo Melos
- **Admin web** : React (capitalise sur les composants Storybook existants dans `storybook-ui/`)
- **Flutter Web** mentionne comme possibilite pour consumer/partner web

L'ADR-020 a decide que tous les assets statiques (admin React, site vitrine, Flutter Web) sont heberges sur **Cloudflare Pages** (gratuit, CDN global, bandwidth illimitee).

L'ADR-012 a tranche que le Service Worker Flutter Web par defaut suffit -- pas de SW custom cote web.

Reste a formaliser **quatre questions ouvertes** :

1. Faut-il deployer Flutter Web pour le consumer/partner, ou se limiter aux apps mobiles natives ?
2. Quel framework pour le site vitrine (US-W001 a US-W011) ?
3. Ou placer la PWA et le manifest.json (US-T006) ?
4. Quelle strategie de distribution globale (stores + web) ?

---

## 2. Analyse du marche mauricien

### 2.1 Usage mobile vs desktop a Maurice

| Indicateur | Valeur | Source |
|------------|--------|--------|
| Penetration smartphones | ~85-90% de la population adulte | ICTA Mauritius 2025 |
| Trafic web mobile vs desktop | ~70% mobile, ~30% desktop | StatCounter Maurice |
| Usage apps vs web | Les apps food/delivery dominent (MCB Juice, Uber Eats MU, Deliveroo MU) | Observation locale |
| OS mobile dominant | Android ~65%, iOS ~35% | StatCounter Maurice |
| Navigateur mobile dominant | Chrome Android (~55%), Safari iOS (~30%) | StatCounter Maurice |

**Conclusion** : Le marche mauricien est **mobile-first**. Les utilisateurs de BienBon interagiront principalement via les apps mobiles natives. Le web est un canal secondaire, utile pour l'acquisition (site vitrine, SEO) et comme fallback pour les utilisateurs reticents a installer une app.

### 2.2 Profil des utilisateurs

| Segment | Appareil principal | Besoin web |
|---------|-------------------|------------|
| **Consommateur** (grand public) | Smartphone (Android majoritairement) | Decouverte via Google > installation app. Pas de besoin web recurrent. |
| **Partenaire** (commercant) | Smartphone + parfois un PC au comptoir | App mobile pour le quotidien (scanner QR). PC pour les stats eventuellement (couvert par l'admin/dashboard futur). |
| **Visiteur non converti** | Mobile ou desktop | Arrive depuis Google/reseaux sociaux, consulte le site vitrine, decide d'installer l'app ou non. |

---

## 3. Questions et decisions

### 3.1 Flutter Web pour le consumer/partner web ?

#### Arguments pour

- Code partage avec le mobile : une seule codebase Dart, maintenance simplifiee
- Les exigences PWA (US-T006) sont couvertes nativement par Flutter Web (manifest.json, SW, standalone mode)
- L'ADR-012 mentionne le SW par defaut de Flutter Web comme suffisant

#### Arguments contre

| Probleme | Impact | Detail |
|----------|--------|--------|
| **SEO nul** | Critique pour l'acquisition | Flutter Web utilise un canvas HTML (CanvasKit) ou un DOM shadow (HTML renderer). Le contenu n'est pas indexable par Google. Les meta tags sont statiques dans le `index.html` mais le contenu dynamique est invisible aux crawlers. |
| **Bundle size** | Mauvais pour la premiere visite | Flutter Web CanvasKit : 2-5 Mo de JS/Wasm. Flutter Web HTML renderer : 1.5-3 Mo. Sur une connexion 3G mauricienne (1-5 Mbps), ca represente 3-25 secondes de chargement initial. |
| **Performance** | Inferieure a React/Astro | Flutter Web est plus lent qu'un framework web natif pour le rendu initial (FCP, LCP). Les Lighthouse scores sont systematiquement inferieurs. |
| **Accessibilite** | Limitee | Flutter Web genere un arbre semantique approximatif. Les lecteurs d'ecran fonctionnent mais avec des artefacts. WCAG 2.1 AA (US-T007) est plus difficile a atteindre. |
| **Cout de maintenance** | Non nul malgre le code partage | Le responsive web a des patterns differents du mobile. Les interactions souris/clavier vs tactile necessitent des adaptations. Le debugging web Flutter est moins mature que le mobile. |

#### Le web consumer/partner est-il vraiment necessaire ?

Le parcours type d'un consommateur mauricien :

```
Google "anti-gaspi Maurice"
  -> Site vitrine (SEO, contenu marketing)
    -> CTA "Telecharger l'app" (App Store / Play Store)
      -> App native (experience complete)
```

Ou bien :

```
Lien partage sur WhatsApp/Facebook
  -> Deep link vers l'app (si installee)
  -> Sinon, page de fallback (site vitrine) avec CTA store
```

Le consommateur n'a **pas besoin** d'une webapp complete pour acheter des paniers. L'app mobile native est superieure en tous points : performance, notifications push, QR code natif, paiement mobile (MCB Juice, etc.), mode offline. Le web consumer serait un investissement pour un canal marginal.

#### Decision

**Pas de Flutter Web consumer/partner au lancement.**

L'app mobile native (iOS + Android) est le canal principal. Le site vitrine assure l'acquisition web et redirige vers les stores. Si une demande de webapp emerge (ex : consommateurs desktop, marches hors Maurice), la question sera reexaminee -- mais probablement avec un framework web natif (React/Next.js) plutot que Flutter Web.

### 3.2 Site vitrine : quel framework ?

Le site vitrine couvre les US-W001 a US-W011 : page d'accueil, "Comment ca marche", "Devenir partenaire", FAQ, CGU/CGV, mentions legales, politique de confidentialite, page 404, navigation vers la webapp, compteur d'impact, mode "Coming Soon".

#### Besoins identifies

| Besoin | Importance | Detail |
|--------|------------|--------|
| **SEO** | Critique | Le site vitrine est le canal d'acquisition web principal. Il doit etre indexable, rapide, avec des meta tags dynamiques, des hreflang FR/EN/KR, un sitemap, du JSON-LD (US-W009 mockup). |
| **Performance** | Critique | Chargement < 3s sur 3G (US-W001). Lighthouse Performance > 90. CDN Cloudflare Pages. |
| **i18n** | Eleve | FR, EN, Creole mauricien. URLs localisees (`/en/how-it-works`, `/kr/kouma-sa-marse`). Balises hreflang. |
| **Contenu dynamique** | Faible-Moyen | CGU/Mentions/Politique gerees depuis le backoffice (mais peuvent etre pre-buildees). Compteur d'impact via API (US-W010). Le reste est statique. |
| **Interactivite** | Faible | FAQ en accordeon, formulaire partenaire (US-W003), banniere cookies, selecteur de langue. Pas de SPA complexe. |
| **Blog** | Moyen | Mentionne dans la nav du mockup. Contenu markdown/CMS. |

#### Options evaluees

| Option | SEO | Perf (LCP) | i18n | Complexite | Reutilisation React existant |
|--------|-----|-----------|------|-----------|------------------------------|
| **Astro** | Excellent (SSG natif, HTML statique) | Excellent (<1s) | Bon (via `@astrojs/i18n` ou routage dossier) | Faible | Partielle (peut integrer des composants React en "islands") |
| **Next.js** (App Router, SSG/ISR) | Excellent (SSR/SSG, meta tags dynamiques) | Bon (<1.5s) | Bon (built-in i18n routing) | Moyenne | Totale (meme stack React + Tailwind) |
| **Remix** | Bon (SSR, pas de SSG natif) | Bon | Moyen (i18n a configurer manuellement) | Moyenne | Totale (React) |
| **HTML/CSS statique** | Excellent | Excellent | Manuel (duplication de fichiers) | Faible au debut, elevee a l'echelle | Nulle |
| **Flutter Web** | Nul | Mediocre | Natif (meme i18n que l'app) | Elevee | Nulle |

#### Decision

**Astro pour le site vitrine.**

Justification :

1. **SEO-first par conception.** Astro genere du HTML statique pur par defaut. Zero JavaScript envoye au client sauf quand c'est explicitement demande (architecture "islands"). Les pages US-W001 a US-W008 sont du contenu statique pur -- Astro est fait exactement pour ca.

2. **Performance imbattable.** HTML statique servi depuis Cloudflare Pages CDN. LCP < 1s meme sur 3G. Lighthouse Performance 100 atteignable sans effort. Le seuil de 3 secondes sur 3G (US-W001) est largement respecte.

3. **i18n via routage dossier.** Structure `src/pages/fr/`, `src/pages/en/`, `src/pages/kr/` avec des fichiers de traduction partages. URLs localisees conformes aux mockups (`/en/how-it-works`, `/kr/kouma-sa-marse`). Balises hreflang generees automatiquement.

4. **Islands pour l'interactivite.** Le compteur d'impact (US-W010, appel API) et la FAQ en accordeon (US-W004) sont des "islands" interactives dans des pages autrement statiques. Astro permet d'hydrater ces composants en React (reutilisation partielle de `storybook-ui/`) tout en gardant le reste en HTML statique.

5. **Blog/contenu via Astro Content Collections.** Le blog mentionne dans la nav du mockup est un cas d'usage natif d'Astro (markdown/MDX avec frontmatter).

6. **Faible complexite.** Astro est plus simple que Next.js pour un site vitrine. Pas de server-side runtime a gerer (SSG pur). Le build produit des fichiers statiques deployes sur Cloudflare Pages.

7. **Decouplement du stack applicatif.** Le site vitrine est un projet separe du backend et des apps Flutter. Il n'a pas besoin de React Router, state management, ou d'un framework full-stack. Astro est "juste ce qu'il faut".

**Pourquoi pas Next.js ?** Next.js est surdimensionne pour un site vitrine statique. Le App Router ajoute de la complexite (RSC, layouts, loading states) non necessaire. Le bundle JS est plus lourd qu'Astro pour le meme contenu. Next.js brille pour les webapps interactives -- pas pour les pages marketing.

### 3.3 PWA : ou et comment ?

#### Rappel des exigences (US-T006)

- `manifest.json` avec icones 192x192 et 512x512, `display: standalone`
- Service Worker pour installation et mode offline partiel
- Banniere d'installation (1 fois par session)
- Splash screen au lancement
- `start_url` pointe vers la webapp (pas la landing page)

#### Analyse

La PWA est un **mecanisme d'installation web**. Elle a du sens quand un utilisateur web veut "installer" une experience app-like sur son ecran d'accueil **sans passer par le store**.

| Scenario | PWA utile ? | Pourquoi |
|----------|-------------|----------|
| Site vitrine en PWA | Non | Le site vitrine est du contenu marketing. Personne n'installe un site marketing. |
| App consumer Flutter Web en PWA | Oui en theorie | C'est le scenario decrit dans US-T006. Mais on a decide de ne pas faire de Flutter Web consumer (section 3.1). |
| Apps natives sur les stores | Oui (c'est le canal principal) | Les apps Flutter sont distribuees sur App Store et Play Store. Pas de PWA necessaire. |

#### Decision

**Pas de PWA au lancement. La distribution se fait via les stores.**

Justification :

1. **On ne deploie pas de Flutter Web consumer** (section 3.1). Donc il n'y a pas de webapp a "installer" en PWA.

2. **Les apps natives sont superieures** pour chaque critere de l'US-T006 : notifications push natives (pas Web Push, qui est limite sur iOS), mode offline robuste (Drift/SQLite, ADR-012), QR code natif, paiement mobile natif.

3. **Le site vitrine Astro est purement informatif.** Il n'a aucune interactivite meritant une installation PWA.

4. **Economie de complexite.** Ne pas implementer de PWA evite la gestion du manifest, du Service Worker custom, des banniers d'installation, et du cycle de mise a jour du cache SW.

**Impact sur US-T006 :** L'US-T006 est **reportee**. Si a l'avenir une version web de l'app consumer est developee (React ou Flutter Web), la PWA sera implementee a ce moment. Les exigences de l'US-T006 restent valides comme spec future.

**Alternative low-cost** : le site vitrine peut inclure des **smart app banners** (meta tag `apple-itunes-app` sur iOS, banniere native Chrome sur Android) qui proposent d'installer l'app native depuis le store. Cela couvre le besoin "inciter a l'installation" sans implementer une PWA.

### 3.4 Strategie de distribution globale

#### Vue d'ensemble

```
Canaux de distribution BienBon.mu
=================================

                        +----------------------------+
                        |   Acquisition (decouverte) |
                        |                            |
                        |  Google / SEO              |
                        |  Reseaux sociaux           |
                        |  Bouche-a-oreille          |
                        |  WhatsApp (deep links)     |
                        +------------+---------------+
                                     |
                                     v
                        +----------------------------+
                        |   Site vitrine (Astro)     |
                        |   bienbon.mu               |
                        |                            |
                        |   - Landing page           |
                        |   - Comment ca marche      |
                        |   - Devenir partenaire     |
                        |   - FAQ, CGU, Blog         |
                        |   - Compteur d'impact      |
                        +---+--------------------+---+
                            |                    |
                            v                    v
              +-------------+------+   +---------+-----------+
              | CTA Consumer       |   | CTA Partenaire      |
              | "Telecharger       |   | Formulaire          |
              |  l'app"            |   | d'inscription       |
              +---+----------+-----+   | (US-W003)           |
                  |          |         +---------+-----------+
                  v          v                   |
        +---------+--+  +---+---------+          v
        | App Store  |  | Play Store  |   +------+---------+
        | (iOS)      |  | (Android)   |   | Traitement     |
        +------+-----+  +------+------+   | par l'equipe   |
               |               |           | BienBon        |
               v               v           +----------------+
        +------+---------------+------+
        |   App Flutter Consumer      |
        |   (experience complete)     |
        |   - Decouverte paniers      |
        |   - Reservation + paiement  |
        |   - Retrait QR/PIN          |
        |   - Notifications push      |
        |   - Mode offline            |
        +-----------------------------+

Partenaire :
        +-----------------------------+
        |   App Flutter Partner       |
        |   - Gestion paniers         |
        |   - Scanner QR / saisie PIN |
        |   - Statistiques            |
        +-----------------------------+

Admin :
        +-----------------------------+
        |   Admin React               |
        |   admin.bienbon.mu          |
        |   - Dashboard KPI           |
        |   - Moderation              |
        |   - Finance / Ledger        |
        +-----------------------------+
```

#### Sous-domaines

| Sous-domaine | Contenu | Framework | Hebergement |
|-------------|---------|-----------|-------------|
| `bienbon.mu` | Site vitrine | Astro (SSG) | Cloudflare Pages |
| `admin.bienbon.mu` | Backoffice admin | React (SPA) | Cloudflare Pages |
| `api.bienbon.mu` | API REST backend | NestJS | Railway (Singapour) |

Pas de sous-domaine `app.bienbon.mu` au lancement (pas de webapp consumer/partner).

#### Deep links et redirection store

Pour les liens partages (WhatsApp, SMS, email), implementer une redirection intelligente :

```
bienbon.mu/p/{basket-id}   (lien vers un panier specifique)
  -> Si app installee : deep link vers l'app Flutter (Universal Links iOS / App Links Android)
  -> Sinon : page vitrine avec apercu du panier + CTA "Installer l'app pour reserver"
```

Cette page de fallback est une page Astro legere avec les meta tags Open Graph (apercu riche dans WhatsApp/Facebook) et un lien vers les stores.

---

## 4. Architecture resultante

### 4.1 Projets et deploiements

```
bienbon/                         (monorepo racine)
  apps/
    consumer/                    Flutter mobile (iOS + Android)
    partner/                     Flutter mobile (iOS + Android)
  packages/
    bienbon_core/                Packages Dart partages
    bienbon_ui/
    ...
  backend/                       NestJS (monolithe modulaire)
  admin-web/                     React SPA (backoffice)
  site-vitrine/                  Astro (SSG) -- NOUVEAU
  storybook-ui/                  Bibliotheque de composants (existant)
```

### 4.2 Site vitrine -- structure Astro

```
site-vitrine/
  src/
    pages/
      index.astro                    # Accueil FR (US-W001)
      comment-ca-marche.astro        # Comment ca marche (US-W002)
      devenir-partenaire.astro       # Devenir partenaire (US-W003)
      faq.astro                      # FAQ (US-W004)
      cgu.astro                      # CGU et CGV (US-W005)
      mentions-legales.astro         # Mentions legales (US-W006)
      politique-de-confidentialite.astro  # Politique confidentialite (US-W007)
      404.astro                      # Page 404 (US-W008)
      en/
        index.astro                  # English homepage
        how-it-works.astro
        become-partner.astro
        faq.astro
        ...
      kr/
        index.astro                  # Kreol homepage
        kouma-sa-marse.astro
        ...
      p/
        [id].astro                   # Deep link fallback panier
    components/
      Header.astro                   # Navigation commune
      Footer.astro                   # Footer commun (US-W001)
      ImpactCounter.tsx              # Island React -- compteur temps reel (US-W010)
      FaqAccordion.tsx               # Island React -- FAQ interactive (US-W004)
      PartnerForm.tsx                # Island React -- formulaire inscription (US-W003)
      CookieBanner.tsx               # Island React -- banniere cookies
      SmartAppBanner.astro           # Banniere "Installer l'app" (substitut PWA)
      LanguageSwitcher.astro         # Selecteur FR/EN/KR
    layouts/
      BaseLayout.astro               # Layout avec meta SEO, hreflang, JSON-LD
    i18n/
      fr.json
      en.json
      kr.json
    content/
      blog/                          # Blog en markdown (Astro Content Collections)
  public/
    robots.txt
    sitemap.xml                      # Genere par @astrojs/sitemap
    og-image.png                     # Image Open Graph par defaut
  astro.config.mjs
  tailwind.config.mjs               # Reutilise les tokens du design system
```

### 4.3 Smart App Banner (substitut PWA)

Au lieu d'une PWA, le site vitrine affiche un bandeau natif invitant a installer l'app :

```html
<!-- iOS Smart App Banner (Safari) -->
<meta name="apple-itunes-app" content="app-id=XXXXXXXXXX">

<!-- Android : lien vers Play Store dans le header -->
<a href="https://play.google.com/store/apps/details?id=mu.bienbon.consumer">
  Installer l'app
</a>
```

Complement custom : un composant `SmartAppBanner` qui detecte la plateforme et affiche un bandeau discret (1 fois par session, meme logique que l'US-T006 demandait pour la PWA) :

- Sur Android : "Disponible sur le Play Store" + lien
- Sur iOS : "Disponible sur l'App Store" + lien
- Sur desktop : "Scannez le QR code pour telecharger" + QR code stores

### 4.4 Content Security Policy (CSP) pour le site vitrine Astro

Le site vitrine Astro doit deployer une Content Security Policy stricte pour se proteger contre les attaques XSS, le clickjacking et l'injection de contenu. Comme le site est principalement statique (HTML/CSS genere par Astro, avec quelques islands React), une CSP restrictive est possible et souhaitable.

#### Politique CSP recommandee

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://cdn.bienbon.mu;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.bienbon.mu;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
```

#### Detail des directives

| Directive | Valeur | Justification |
|-----------|--------|---------------|
| `default-src` | `'self'` | Par defaut, seules les ressources du meme domaine sont autorisees. Toute directive non definie herite de cette valeur. |
| `script-src` | `'self'` | Seuls les scripts servis depuis `bienbon.mu` sont executes. **Pas de scripts inline** si possible. Les islands React hydratees par Astro sont des fichiers JS separes generes au build, donc compatibles avec `'self'`. |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind CSS peut generer des styles inline via l'attribut `style` ou des `<style>` tags dans le HTML. `'unsafe-inline'` est necessaire pour cette raison. Si Astro extrait tous les styles dans des fichiers CSS externes au build, `'unsafe-inline'` pourra etre retire. |
| `img-src` | `'self' data: https://cdn.bienbon.mu` | Images locales, images encodees en base64 (`data:` pour les petites icones/SVG inline), et images servies depuis le CDN BienBon. |
| `font-src` | `'self' https://fonts.gstatic.com` | La police Nunito est chargee depuis Google Fonts. `fonts.gstatic.com` est le domaine de livraison des fichiers de police Google. |
| `connect-src` | `'self' https://api.bienbon.mu` | Autorise les appels API (fetch/XHR) vers le backend BienBon. Necessaire pour le compteur d'impact (US-W010) et le formulaire partenaire (US-W003). |
| `frame-ancestors` | `'none'` | **Anti-clickjacking** : empeche le site d'etre embarque dans un `<iframe>` sur un domaine tiers. Equivalent du header `X-Frame-Options: DENY`. |
| `base-uri` | `'self'` | Empeche l'injection d'un `<base>` tag qui redirigerait les URLs relatives vers un domaine malveillant. |
| `form-action` | `'self'` | Limite la soumission de formulaires au meme domaine. Le formulaire partenaire (US-W003) soumet vers `api.bienbon.mu`, qui est couvert par `connect-src` (les formulaires modernes utilisent `fetch`, pas un `<form action>`). |

#### Scripts inline et nonce-based CSP (si necessaire)

Si certains scripts inline sont inevitables (ex : Google Analytics, banniere cookies tiers), utiliser une strategie **nonce-based** au lieu de `'unsafe-inline'` :

```html
<!-- Dans le layout Astro -->
<script nonce="RANDOM_NONCE_GENERE_COTE_SERVEUR">
  // script inline autorise par le nonce
</script>
```

Avec la directive CSP :

```
script-src 'self' 'nonce-RANDOM_NONCE_GENERE_COTE_SERVEUR'
```

**Note :** Comme Astro est un generateur statique (SSG), les nonces ne peuvent pas etre generes dynamiquement cote serveur a chaque requete. Deux options :

1. **Eviter les scripts inline** (recommande) : deplacer tout le JavaScript dans des fichiers `.js` ou `.ts` servis en tant que fichiers statiques. Astro est concu pour cela.
2. **Generer les nonces via Cloudflare Workers** : utiliser un Cloudflare Worker (ou une Transform Rule) en amont de Pages pour injecter un nonce aleatoire dans le HTML et le header CSP a chaque requete. C'est plus complexe mais faisable.

**Recommandation** : privilegier l'option 1 (pas de scripts inline). Si c'est impossible, utiliser l'option 2 avec Cloudflare Workers.

#### Methode de deploiement de la CSP

**Option A : Header HTTP via Cloudflare Pages (recommande)**

Creer un fichier `_headers` a la racine du site Astro (dans le dossier `public/`) :

```
# public/_headers
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.bienbon.mu; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.bienbon.mu; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

Cloudflare Pages interprete ce fichier et ajoute les headers a chaque reponse. C'est la methode la plus simple et la plus fiable.

**Option B : Meta tag HTML (fallback)**

Si les headers ne sont pas configurables, ajouter un `<meta>` tag dans le layout Astro :

```html
<!-- src/layouts/BaseLayout.astro -->
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.bienbon.mu; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.bienbon.mu; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" />
```

**Limitation** : `frame-ancestors` est ignore dans un `<meta>` tag. Le header HTTP est donc preferable.

#### Monitoring des violations CSP (optionnel)

Pour detecter les violations CSP en production (scripts bloques, ressources refusees), ajouter un endpoint de reporting :

```
Content-Security-Policy: ...; report-uri https://api.bienbon.mu/csp-report
```

Ou avec la directive moderne `report-to` :

```
Content-Security-Policy: ...; report-to csp-endpoint
Report-To: {"group":"csp-endpoint","max_age":86400,"endpoints":[{"url":"https://api.bienbon.mu/csp-report"}]}
```

Le backend NestJS expose un endpoint `POST /csp-report` qui logue les violations dans Sentry ou dans un fichier de log. Cela permet de detecter les faux positifs (ressources legitimes bloquees) et les tentatives d'attaque XSS.

**Note** : le monitoring CSP est optionnel au lancement. Il est recommande de l'activer apres la mise en production pour affiner la politique sans casser le site.

---

## 5. Impact sur les US existantes

| US | Statut | Impact |
|----|--------|--------|
| **US-T006** (PWA) | **Reportee** | Pas de PWA au lancement. Le site vitrine inclut des smart app banners. Si une webapp consumer est developpee plus tard, l'US sera implementee. |
| **US-W001 a US-W008** | Inchange | Implementees dans le site vitrine Astro. Tous les criteres d'acceptation restent valides. |
| **US-W009** (navigation vers la webapp) | Adapte | Le CTA "Ouvrir l'app" redirige vers les stores (pas vers une webapp). Sur mobile, deep link vers l'app si installee. |
| **US-W010** (compteur d'impact) | Inchange | Implemente comme un island React dans Astro, appel API vers le backend. |
| **US-W011** (mode Coming Soon) | Inchange | Page Astro dediee. Le toggle ON/OFF est gere via une variable d'environnement au build ou un appel API au backend. |
| **US-T007** (accessibilite) | Facilite | Astro genere du HTML semantique natif, plus facile a rendre accessible que Flutter Web. WCAG 2.1 AA plus atteignable. |
| **US-T008** (i18n) | Inchange | Routage par dossier dans Astro (`/en/`, `/kr/`). Hreflang generes automatiquement. |

---

## 6. Consequences

### Positives

1. **SEO optimal.** Le site vitrine Astro produit du HTML statique pur, parfaitement indexable. Les meta tags, hreflang, JSON-LD, sitemap sont generes au build. C'est le meilleur resultat SEO possible.

2. **Performance maximale.** HTML statique sur Cloudflare CDN. LCP < 1s. Zero JavaScript par defaut (sauf les islands interactives). Le seuil de 3s sur 3G est largement respecte.

3. **Moins de code a maintenir.** Pas de Flutter Web a debugger, tester et maintenir en parallele du mobile natif. Pas de Service Worker custom a gerer. Une codebase de moins dans le monorepo.

4. **Accessibilite native.** HTML semantique genere par Astro vs. canvas/shadow DOM de Flutter Web. Les scores Lighthouse Accessibility sont naturellement eleves.

5. **Cout zero.** Astro SSG + Cloudflare Pages = gratuit. Pas de serveur supplementaire.

6. **Experience mobile native superieure.** Les consommateurs et partenaires utilisent les apps Flutter natives, qui sont superieures sur tous les axes : performance, notifications, offline, QR, paiement.

### Negatives

1. **Pas de webapp consumer.** Les utilisateurs qui refusent d'installer une app n'ont pas d'alternative web pour reserver des paniers. C'est un choix delibere : au lancement, l'effort doit aller vers la meilleure experience possible (native), pas vers un canal secondaire.

2. **Deux frameworks frontend (Astro + React + Flutter).** En realite trois : Astro pour la vitrine, React pour l'admin, Flutter pour le mobile. Attenuation : Astro et React partagent le meme ecosysteme (JSX, Tailwind, npm). Le site vitrine Astro est un projet simple (~10-15 pages) qui ne necessite pas de competences avancees.

3. **US-T006 reportee.** Les specs incluent des criteres d'acceptation PWA detailles qui ne seront pas implementes au lancement. A communiquer aux parties prenantes.

4. **Deep links a implementer.** La page de fallback panier (`/p/{id}`) et les Universal Links / App Links necessitent une configuration specifique (fichier `.well-known/assetlinks.json` pour Android, `apple-app-site-association` pour iOS).

---

## 7. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Les utilisateurs veulent une webapp consumer (pas d'installation) | Moyenne | Moyen | Mesurer le taux de rebond sur les CTA "Installer l'app". Si > 70% des visiteurs mobiles quittent sans installer, evaluer une webapp React (pas Flutter Web) en Phase 2. |
| Le SEO ne suffit pas pour l'acquisition | Faible | Moyen | Le site vitrine Astro est le meilleur outil pour le SEO. Si ca ne suffit pas, le probleme est le contenu/strategie marketing, pas la techno. |
| Astro est un framework relativement jeune | Faible | Faible | Astro est stable depuis la v1 (2022), en v5.x en 2026, avec une communaute large. Le projet est soutenu par une entreprise (The Astro Company). En cas de probleme : le code est du HTML/CSS/JS standard, migrable vers n'importe quel SSG. |
| Les deep links sont complexes a configurer | Moyenne | Faible | Documentation bien etablie pour Universal Links et App Links. Configuration one-time. Cloudflare Pages supporte les fichiers `.well-known/`. |
| Le mode Coming Soon (US-W011) necessite un mecanisme de toggle dynamique | Faible | Faible | Solution simple : variable d'environnement `COMING_SOON=true` au build Cloudflare Pages. Changement = rebuild (~30s). Pas besoin d'un toggle en temps reel pour un evenement unique (lancement). |

---

## 8. Decision ulterieure : webapp consumer en Phase 2+ ?

Si les metriques post-lancement montrent un besoin de webapp consumer, les options sont :

| Option | Quand la considerer | Avantages | Inconvenients |
|--------|---------------------|-----------|---------------|
| **React (Next.js)** sur `app.bienbon.mu` | Si > 20% du trafic est desktop, ou expansion hors Maurice | SEO (SSR), performance, accessibilite, ecosysteme React mature, reutilisation des composants `storybook-ui/` | Deux codebases frontend a maintenir (Flutter + React) |
| **Flutter Web** sur `app.bienbon.mu` | Si l'equipe est 100% Flutter et refuse une deuxieme stack | Code partage avec mobile | SEO nul, bundle size, accessibilite limitee, performance inferieure |
| **Ne rien faire** | Si le taux de conversion store est satisfaisant | Zero cout supplementaire | Perte des utilisateurs reticents a l'installation |

La recommandation future, si une webapp est necessaire, est **React (Next.js)** pour les memes raisons que le choix de l'admin en React (ADR-002) : ecosysteme web mature, composants existants, SEO, accessibilite.

---

## 9. Recapitulatif des decisions

| Question | Decision | Justification courte |
|----------|----------|---------------------|
| Flutter Web consumer/partner ? | **Non, pas au lancement** | SEO nul, bundle lourd, canal marginal a Maurice. Apps natives superieures. |
| Framework site vitrine ? | **Astro (SSG)** | SEO-first, performance maximale, HTML statique, islands React pour l'interactivite. |
| PWA ? | **Non, pas au lancement** | Pas de webapp a installer. Smart app banners vers les stores a la place. US-T006 reportee. |
| Distribution | **Stores (App Store + Play Store) + site vitrine SEO** | Mobile-first coherent avec le marche mauricien. Site vitrine pour l'acquisition. |
| Hebergement site vitrine | **Cloudflare Pages** (confirme ADR-020) | Gratuit, CDN global, deploy sur git push. |
| Sous-domaines | `bienbon.mu` (vitrine), `admin.bienbon.mu` (backoffice), `api.bienbon.mu` (backend) | Separation claire des concerns. |

---

## 10. References

### ADR liees
- ADR-002 : Architecture applicative (apps Flutter separees + admin React)
- ADR-012 : Strategie offline-first et cache (SW par defaut Flutter Web, Drift pour le mobile)
- ADR-020 : Hebergement et infrastructure (Cloudflare Pages pour les assets statiques)

### Specs
- US-T006 : Installation PWA (`dev-specs/us/04-web-emails-transversal/transversal-performance.md`)
- US-W001 a US-W011 : Site vitrine (`dev-specs/us/04-web-emails-transversal/site-vitrine-*.md`)

### Ressources externes
- [Astro Documentation](https://docs.astro.build/) -- Framework SSG
- [Astro + Cloudflare Pages](https://docs.astro.build/en/guides/deploy/cloudflare/) -- Guide de deploiement
- [Flutter Web Limitations 2025-2026](https://docs.flutter.dev/platform-integration/web) -- Limitations officielles
- [Smart App Banners (Apple)](https://developer.apple.com/documentation/webkit/promoting-apps-with-smart-app-banners) -- Meta tag iOS
- [Android App Links](https://developer.android.com/training/app-links) -- Deep links Android
- [Universal Links (Apple)](https://developer.apple.com/ios/universal-links/) -- Deep links iOS
- [ICTA Mauritius ICT Statistics](https://www.icta.mu/statistics/) -- Statistiques telecom Maurice
