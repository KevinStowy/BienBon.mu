# ADR-015 : Strategie d'internationalisation (i18n)

| Champ         | Valeur                                                      |
|---------------|-------------------------------------------------------------|
| **Statut**    | Propose                                                     |
| **Date**      | 2026-02-27                                                  |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                         |
| **Decideurs** | Equipe technique BienBon                                    |
| **Scope**     | i18n Flutter (consumer + partner), React (admin), NestJS (API), React Email (emails transactionnels) |
| **Refs**      | US-T008, US-T009, US-E001 a US-E019, ADR-001, ADR-002, ADR-014 |

---

## 1. Contexte

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. L'application doit etre disponible en **3 langues** pour refléter la realite linguistique mauricienne :

- **Francais (fr)** : langue de l'education, de l'administration et du commerce formel. Langue par defaut de l'application.
- **Anglais (en)** : langue officielle, comprise par la majeure partie de la population.
- **Creole mauricien (mfe)** : langue maternelle de ~90% de la population, parlee au quotidien.

### 1.1 Exigences des specs (US-T008)

- 3 langues : FR, EN, Creole Mauricien
- Selecteur de langue dans le header (toutes les pages)
- Persistance du choix : cookie/localStorage (web non connecte), preference utilisateur en base (connecte)
- Monnaie : toujours Rs (Roupie mauricienne), pas de conversion
- Format date/heure selon la locale, avec fuseau fixe MUT (UTC+4) (US-T009)
- **Contenu genere par les utilisateurs NON traduit** (descriptions de paniers, avis, reclamations)
- Seuls les elements d'interface et les emails sont traduits
- Les CGU, FAQ, Mentions Legales et Politique de Confidentialite sont disponibles dans les 3 langues
- Attribut `lang` HTML mis a jour, balises `hreflang` pour le SEO

### 1.2 Emails multilingues (US-E001 a US-E019)

- 19 templates d'emails transactionnels (auth, reservations, partenaire, admin, marketing)
- Chaque template existe en 3 langues
- Envoye dans la langue preferee de l'utilisateur
- Donnees dynamiques (montant, date, QR code) identiques quelle que soit la langue

### 1.3 Interface admin

- L'interface admin n'a pas besoin d'etre en creole (les admins parlent FR/EN)
- L'admin peut editer les templates email (contenu textuel des notifications)
- L'admin web est en React + TypeScript (Vite)

### 1.4 Le defi du creole mauricien

Le creole mauricien pose des defis techniques specifiques :

| Aspect | Impact |
|--------|--------|
| **Pas de code ISO 639-1** | Le code standard est `mfe` (ISO 639-3). Les frameworks attendent generalement un code 2 lettres. |
| **Orthographe normalisee recemment** | Grafi Larmoni adopte en 2011 seulement. Les conventions orthographiques ne sont pas universellement stabilisees. |
| **Aucun support dans les outils de traduction automatique** | Google Translate, DeepL, etc. ne supportent pas le creole mauricien. Toute traduction doit etre faite par un humain natif. |
| **Pas de donnees de locale natives** | Les formatages de dates, nombres, pluralisation n'existent pas dans les frameworks standards pour `mfe`. |
| **Mots parfois plus longs que le francais** | Impact potentiel sur les layouts UI (boutons, badges, headers). |
| **Alphabet latin, LTR** | Pas de probleme de direction de texte. |

### 1.5 Stack technique (rappel)

| Couche | Technologie |
|--------|-------------|
| Mobile consumer | Flutter (Dart) |
| Mobile partenaire | Flutter (Dart) |
| Admin web | React + TypeScript (Vite) |
| Backend API | NestJS + Prisma + PostgreSQL (Supabase) |
| Emails | React Email (JSX) via Resend |

### 1.6 Pourquoi cette decision est necessaire maintenant

L'i18n est un choix structurant qui impacte chaque ecran, chaque message d'erreur, chaque email. Retro-fitter l'i18n dans une codebase existante est 5 a 10 fois plus couteux que de l'integrer des le debut. Le choix des librairies, du format de fichiers et du workflow de traduction conditionne la DX quotidienne de l'equipe.

---

## 2. Decisions a prendre

Cette ADR couvre **8 decisions interdependantes** :

1. Librairie i18n pour Flutter (consumer + partner)
2. Librairie i18n pour React (admin web)
3. Strategie i18n pour le backend NestJS
4. Format des fichiers de traduction
5. Gestion du creole mauricien comme locale
6. Strategie i18n pour les emails (React Email)
7. Workflow et outillage de traduction
8. RTL et considerations typographiques futures

---

## 3. Options considerees

### 3.1 Librairie i18n pour Flutter

#### Option F1 : `flutter_localizations` + `intl` (officiel Dart/Flutter)

**Description** : Solution officielle de Flutter. Utilise les fichiers ARB (Application Resource Bundle) et le package `intl` pour le formatage (dates, nombres, pluralisation ICU).

**Avantages** :
- Solution officielle, supportee et maintenue par l'equipe Flutter
- Format ARB = format natif de l'ecosysteme Dart
- Support ICU MessageFormat complet (pluralisation, genre, select)
- Formatage de dates/nombres via `intl` (couvre les locales standards)
- Generation de code via `flutter gen-l10n`

**Inconvenients** :
- **Pas de type-safety sur les cles de traduction** : les cles sont des strings, pas de verification a la compilation
- Pas de detection des cles manquantes a la compilation
- DX moyenne : pas d'autocompletion dans l'IDE pour les cles
- **Le code `mfe` n'est pas supporte nativement** par `intl` : `DateFormat('mfe')` et `NumberFormat('mfe')` plantent. Necessite un workaround lourd (enregistrer manuellement les symboles de date/nombre pour `mfe`).
- La commande `flutter gen-l10n` refuse les locales non standards depuis Flutter 3.x (issue #162869)

#### Option F2 : `easy_localization`

**Description** : Package communautaire populaire (~4.2K stars GitHub). Approche runtime : charge les traductions depuis JSON/YAML/CSV au demarrage. Utilise les `BuildContext` extensions pour acceder aux traductions.

**Avantages** :
- API simple et intuitive : `'hello'.tr()` ou `context.tr('hello')`
- Supporte JSON, YAML, CSV, fichiers distants
- Supporte les locales custom facilement (pas de validation stricte du code de locale)
- Hot reload des traductions en developpement
- Pluralisation via ICU MessageFormat
- Communaute active, mises a jour regulieres (derniere mise a jour : octobre 2025)

**Inconvenients** :
- **Pas de type-safety** : les cles sont des strings, erreurs detectees uniquement au runtime
- Pas d'autocompletion IDE pour les cles
- Parsing des fichiers de traduction au runtime (impact marginal sur le demarrage)
- Le formatage de dates/nombres repose toujours sur `intl` en interne → meme limitation pour `mfe`
- Maintenance communautaire (pas de garantie a long terme)

#### Option F3 : `slang` (type-safe, code generation)

**Description** : Package i18n moderne pour Dart/Flutter (~1.8K stars GitHub, version 3.32+). Approche code-generation : les fichiers JSON/YAML/ARB sont compiles en classes Dart type-safe. Chaque cle de traduction devient une methode Dart avec des parametres types.

**Avantages** :
- **Type-safety complete** : `t.home.greeting(name: 'Alice')` — erreur de compilation si la cle n'existe pas ou si un parametre manque
- **Autocompletion IDE** : navigation par `t.module.screen.key` avec autocompletion a chaque niveau
- Detection des cles manquantes a la compilation (si une traduction manque dans une locale, le build echoue ou un fallback est genere)
- CLI integre : `dart run slang` (generation), `dart run slang analyze` (detection des cles manquantes/inutilisees)
- Supporte JSON, YAML, ARB, CSV comme format source
- Pluralisation, interpolation, rich text, contextes (genre, etc.)
- **Locale custom possible** : slang gere les locales via le nom des fichiers de traduction, pas via `Locale()` de Flutter. On peut nommer un fichier `strings_mfe.json` et slang generera le code pour `mfe` sans probleme.
- Zero overhead runtime : les traductions sont compilees en Dart pur
- Fallback configurable (fallback vers la locale de base si une cle manque)
- Integration Flutter via `slang_flutter` (rebuild automatique des widgets au changement de locale)
- MCP server disponible pour l'assistance LLM (`slang_mcp`)

**Inconvenients** :
- Ecosysteme plus petit que `easy_localization` (mais en croissance rapide)
- La generation de code ajoute une etape au build (mitigeable avec `build_runner --watch`)
- Le formatage de dates/nombres n'est PAS inclus dans slang (il faut toujours `intl` pour ca)
- Courbe d'apprentissage initiale pour comprendre le code genere

#### Option F4 : `flutter_i18n`

**Description** : Package communautaire plus ancien. Approche similaire a `easy_localization` mais moins maintenu.

**Avantages** :
- API simple
- Support JSON

**Inconvenients** :
- **Moins maintenu** que les alternatives (derniere mise a jour moins recente)
- Pas de type-safety
- Communaute plus petite
- Aucun avantage distinctif par rapport a `easy_localization` ou `slang`

### 3.2 Librairie i18n pour React (admin web)

#### Option R1 : `react-intl` (FormatJS)

**Description** : Librairie i18n basee sur les standards ECMAScript Internationalization API et ICU MessageFormat. Composants JSX declaratifs (`<FormattedMessage>`, `<FormattedDate>`, `<FormattedNumber>`).

**Avantages** :
- Basee sur les standards (ICU MessageFormat, ECMAScript Intl)
- Composants declaratifs idiomatiques en React
- Bundle plus leger que react-i18next (17.8 KB minifie + gzippe)
- FormatJS fournit un CLI pour extraire les messages et les compiler
- Bonne documentation

**Inconvenients** :
- **Pas de type-safety native** sur les cles de traduction (ameliorable avec les outils FormatJS)
- Pas de solution integree pour le chargement de fichiers de traduction ou la detection de langue
- API moins flexible que i18next (pas de hooks simples, composants JSX obligatoires dans certains cas)
- Ecosysteme de plugins plus petit

#### Option R2 : `i18next` + `react-i18next`

**Description** : Framework i18n le plus populaire de l'ecosysteme JavaScript (~7.8K stars pour react-i18next). Framework-agnostic avec un binding React. Ecosysteme massif de plugins (chargement de fichiers, detection de langue, backends, caching).

**Avantages** :
- **Ecosysteme le plus riche** : plugins pour tout (lazy loading, namespaces, backend HTTP, detection de langue, caching localStorage)
- API flexible : hooks (`useTranslation()`), HOC, composant `<Trans>`
- Pluralisation ICU native
- Namespaces pour organiser les traductions par module/ecran
- Lazy loading des langues (charge uniquement la langue active)
- Type-safety possible via `@types/i18next` et le module `i18next` v23+ avec des generics TypeScript
- ~2M downloads/semaine npm (le plus populaire)
- Documentation exhaustive
- **Compatible avec React Email** via `i18next` core (sans le binding React)

**Inconvenients** :
- Bundle plus lourd (22.2 KB minifie + gzippe pour i18next + react-i18next)
- La type-safety native requiert une configuration specifique (module augmentation TypeScript)
- Suringenierie potentielle pour un projet avec seulement 2 langues admin (FR + EN)

#### Option R3 : `Paraglide` (Inlang, compile, type-safe)

**Description** : Librairie i18n compilee par le projet Inlang. Les traductions sont compilees en fonctions JavaScript a l'import. Type-safe, tree-shakable, zero runtime.

**Avantages** :
- Type-safety complete (chaque message est une fonction TypeScript)
- Tree-shaking : seuls les messages utilises sont inclus dans le bundle
- Zero runtime overhead
- Extension VS Code (Sherlock) pour visualiser les traductions inline
- Bundle ultra-leger

**Inconvenients** :
- **Encore en pre-release** (pas recommande pour la production en 2026)
- Ecosysteme immature, communaute petite
- Moins de plugins et d'integrations que i18next
- Risque d'instabilite API

### 3.3 Strategie i18n pour le backend NestJS

#### Option B1 : `nestjs-i18n`

**Description** : Module NestJS dedie a l'i18n. Fournit un service `I18nService`, un decorateur `@I18n()`, des pipes de validation localises, et la resolution automatique de la langue via headers/query/cookies.

**Avantages** :
- Integration native NestJS (decorateurs, pipes, guards, interceptors)
- Resolution automatique de la langue (`Accept-Language` header, query param, cookie)
- Type-safety sur les cles via la generation de types
- Pipes de validation localises (class-validator + i18n)
- Support `async_hooks` (v10+) : `I18nContext.current()` accessible partout sans injection
- Fichiers JSON organises par langue et par module
- Documentation complete

**Inconvenients** :
- Dependance supplementaire
- Peut etre excessif si on choisit de ne PAS localiser les messages API (option B2)

#### Option B2 : API avec codes d'erreur — traduction cote client

**Description** : L'API retourne des codes d'erreur structures (ex: `BASKET_SOLD_OUT`, `PAYMENT_DECLINED_INSUFFICIENT_FUNDS`) et le client se charge de traduire ces codes en messages lisibles dans la langue de l'utilisateur.

**Avantages** :
- Backend plus simple (pas d'i18n cote serveur)
- Un seul endroit pour gerer les traductions : le client
- Les codes d'erreur sont stables et versionnes (pas de risque de casser les traductions lors d'un changement de libelle)
- Les apps Flutter et React admin ont deja un systeme i18n — autant tout centraliser cote client

**Inconvenients** :
- Les emails transactionnels et les notifications push DOIVENT etre generes cote serveur dans la bonne langue → le backend a quand meme besoin de connaitre la langue de l'utilisateur et de generer du contenu localise
- Les messages de validation (class-validator) seraient en anglais brut dans les reponses API
- Le client doit maintenir un mapping code → message pour chaque langue

#### Option B3 : Approche hybride

**Description** : L'API retourne des codes d'erreur structures pour les erreurs metier, MAIS le backend utilise `nestjs-i18n` pour :
- Les emails (generation des templates localises)
- Les notifications push (texte localise)
- Les messages de validation (optionnel, via les pipes i18n)

Les messages d'erreur API visibles par l'utilisateur final sont traduits cote client a partir des codes.

**Avantages** :
- Separation claire : le backend gere la localisation du contenu sortant (emails, push), le client gere la localisation de l'UI
- Les codes d'erreur API sont stables et testables
- Pas de duplication : les traductions UI sont dans le client, les traductions emails/push sont dans le backend

**Inconvenients** :
- Deux systemes de traduction a maintenir (client + backend pour les emails/push)
- Complexite accrue par rapport a B1 pur ou B2 pur

### 3.4 Format des fichiers de traduction

#### Option T1 : JSON

**Avantages** :
- Standard universel, supporte par TOUS les outils et frameworks
- slang (Flutter), i18next (React), nestjs-i18n (NestJS) supportent tous JSON
- Editable par un non-developpeur
- Supporte par toutes les plateformes de traduction (Crowdin, Weblate, Lokalise)
- Structures imbriquees pour organiser par module/ecran

**Inconvenients** :
- Pas de commentaires natifs (pas de contexte pour les traducteurs dans le fichier)
- Pas de support ICU natif dans la syntaxe (les messages ICU sont des strings dans les valeurs)

#### Option T2 : ARB (Application Resource Bundle)

**Avantages** :
- Format natif de Flutter/Dart (`flutter gen-l10n`)
- Supporte les metadonnees par cle (`@key` pour description, placeholders, types)
- Contextuel : les descriptions aident les traducteurs

**Inconvenients** :
- **Specifique a l'ecosysteme Dart** : react-i18next et nestjs-i18n ne le supportent pas nativement
- Imposer ARB impliquerait un outil de conversion ARB → JSON pour React et NestJS
- Moins connu des traducteurs et des plateformes de traduction

#### Option T3 : YAML

**Avantages** :
- Supporte les commentaires (contexte pour les traducteurs)
- Plus lisible que JSON pour les structures imbriquees

**Inconvenients** :
- Moins universel que JSON
- Sensible a l'indentation (source d'erreurs)
- Pas supporte nativement par tous les frameworks (react-i18next necessite un plugin)

#### Option T4 : Un format unique partage (JSON) vs formats specifiques par plateforme

**Sous-option T4a : JSON unique partage** — Un seul depot de fichiers JSON, consomme par Flutter (slang), React (i18next) et NestJS (nestjs-i18n). Les fichiers sont organises par module (`common.json`, `auth.json`, `baskets.json`, etc.) et par langue (`fr/`, `en/`, `mfe/`).

**Sous-option T4b : Formats specifiques** — ARB pour Flutter, JSON pour React et NestJS. Conversion automatique via un script CI.

### 3.5 Gestion du creole mauricien comme locale

#### Option C1 : Locale custom complete

**Description** : Creer une locale `mfe` complete avec ses propres regles de formatage de dates, nombres et pluralisation.

**Avantages** :
- Semantiquement correct (les dates/nombres s'affichent selon les conventions creoles)
- Independance totale vis-a-vis du francais

**Inconvenients** :
- **Travail enorme** : le creole mauricien n'a pas de conventions de formatage de date/nombre formellement definies et distinctes du francais
- Le package `intl` de Dart ne supportera pas `mfe` sans un patch massif (enregistrement manuel de `dateTimeSymbolMap`, `dateTimePatternMap`, `numberSymbols`)
- Maintenance perpetuelle de ces definitions custom a chaque mise a jour de `intl`
- Flutter refuse les locales non standard dans `flutter gen-l10n` (issue #162869)

#### Option C2 : Fallback sur `fr` pour le formatage, `mfe` pour les strings (recommandee)

**Description** : Utiliser `fr` (francais) comme locale sous-jacente pour le formatage des dates, nombres et devises, mais utiliser `mfe` comme identifiant interne pour les chaines de traduction.

Concretement :
- slang (Flutter) : les fichiers sont nommes `strings_mfe.i18n.json` → slang genere le code pour `mfe` sans probleme
- `intl` (Dart) : les appels `DateFormat` et `NumberFormat` utilisent la locale `fr` quand l'utilisateur est en creole
- i18next (React) : la locale `mfe` est ajoutee comme locale custom, le formatage de date/nombre utilise la locale `fr-MU` d'Intl
- nestjs-i18n : les fichiers sont dans un dossier `mfe/`, pas de probleme

**Avantages** :
- **Pragmatique** : en pratique, les conventions de formatage de date/nombre en creole mauricien sont identiques au francais (jours et mois en francais sont compris par tous les Mauriciens)
- Zero patch du package `intl`
- Fonctionne out-of-the-box avec tous les frameworks
- Clairement separable : les strings UI sont en creole pur, le formatage est en francais

**Inconvenients** :
- Les noms de jours/mois s'afficheront en francais meme quand l'interface est en creole (ex: "Lundi 14 fevrier" au lieu de "Lindi 14 fevriye"). Acceptable car ces termes francais sont universellement compris a Maurice.
- Semantiquement imparfait (la locale de formatage ne correspond pas a la locale d'affichage)

#### Option C3 : Utiliser un code custom court (`kr`) au lieu de `mfe`

**Description** : Utiliser un code interne de 2 lettres `kr` (comme mentionne dans les specs US-T008 : "KR/MFE") pour identifier le creole dans l'application.

**Avantages** :
- Plus court et plus simple dans les URLs, cookies et selecteurs
- Coherent avec les specs existantes

**Inconvenients** :
- `kr` est deja le code ISO 639-1 du **kanuri** (langue africaine). Collision potentielle si un framework fait une correspondance automatique.
- Non standard → confusion pour les outils tiers et les plateformes de traduction
- **Recommandation** : utiliser `mfe` en interne et en BDD, mais proposer `kr` comme alias dans les URLs user-facing si souhaite (ex: `bienbon.mu/kr/...`)

### 3.6 Emails multilingues (React Email)

#### Option E1 : Un template JSX par langue

**Description** : Creer 3 fichiers par email : `ConfirmationReservation.fr.tsx`, `ConfirmationReservation.en.tsx`, `ConfirmationReservation.mfe.tsx`.

**Avantages** :
- Simplicite : chaque fichier est autonome
- Pas de dependance i18n dans les templates

**Inconvenients** :
- **Explosion du nombre de fichiers** : 19 templates x 3 langues = 57 fichiers
- Duplication massive du layout et de la logique
- Modifier le design d'un email = modifier 3 fichiers
- Risque eleve d'inconsistance entre les langues

#### Option E2 : Templates parametres avec i18next

**Description** : Un seul template JSX par email. Les textes sont injectes via `i18next` (le core, sans le binding React). Les fichiers de traduction JSON contiennent les textes de chaque email par langue.

```tsx
// ConfirmationReservation.tsx
import { t } from './i18n'; // i18next initialise avec la locale du user

export const ConfirmationReservation = ({ locale, basket, user }) => {
  const tt = t(locale);
  return (
    <Email>
      <Heading>{tt('email.confirmation.title')}</Heading>
      <Text>{tt('email.confirmation.greeting', { name: user.firstName })}</Text>
      <Text>{tt('email.confirmation.body', { basketName: basket.name, amount: basket.price })}</Text>
    </Email>
  );
};
```

**Avantages** :
- **Un seul template par email** : le layout et la logique sont factorisables
- Coherence avec le systeme i18n du reste du projet (meme format JSON, memes cles)
- Les fichiers de traduction des emails peuvent etre dans le meme depot que les autres traductions
- Facilite l'ajout d'une 4eme langue (ajouter un fichier JSON, pas 19 templates)

**Inconvenients** :
- Necessite d'initialiser i18next cote serveur pour le rendu des emails
- Les textes longs (paragraphes d'email) sont moins lisibles dans un fichier JSON que dans du JSX
- Complexite initiale de setup

#### Option E3 : Templates avec dictionnaire inline (sans librairie)

**Description** : Chaque template importe un dictionnaire simple `{ fr: {...}, en: {...}, mfe: {...} }` defini dans un fichier co-localise.

```tsx
const dict = {
  fr: { title: 'Reservation confirmee !', greeting: 'Bonjour {name},' },
  en: { title: 'Reservation confirmed!', greeting: 'Hello {name},' },
  mfe: { title: 'Rezervasion konfirme !', greeting: 'Bonzour {name},' },
};
```

**Avantages** :
- Zero dependance
- Textes visibles directement a cote du template
- Simple pour une petite equipe

**Inconvenients** :
- Pas de partage de traductions entre templates (le footer, les mentions legales, etc. seraient dupliques)
- Pas de pluralisation ou d'interpolation avancee
- Ne scale pas si le nombre de langues ou de templates augmente

### 3.7 Workflow et outillage de traduction

#### Option W1 : Fichiers manuels (JSON dans le repo Git)

**Description** : Les fichiers de traduction sont edites directement dans le repo par les developpeurs et/ou un traducteur qui fait des PR.

**Avantages** :
- Zero cout, zero dependance externe
- Historique Git complet
- Revue de code sur les traductions (PR review)
- Simple pour une startup early-stage avec 3 langues et un volume de contenu modere

**Inconvenients** :
- Le traducteur doit savoir utiliser Git (ou le developpeur sert d'intermediaire)
- Pas de vue d'ensemble du taux de traduction
- Pas de memoire de traduction (pas de reutilisation automatique)
- Risque d'oubli de cles non traduites

#### Option W2 : Crowdin (SaaS)

**Description** : Plateforme SaaS leader en gestion de traduction. Plan gratuit pour l'open source, payant pour le prive (a partir de 50 USD/mois pour le plan Team).

**Avantages** :
- Interface web pour les traducteurs (pas besoin de Git)
- **Support des langues custom** : on peut ajouter `mfe` comme langue custom dans les parametres du projet avec son propre code, nom, direction de texte et regles de pluralisation
- Integration GitHub/GitLab : sync automatique des fichiers de traduction
- Memoire de traduction, glossaire, QA automatique
- Machine Translation pre-remplissage (mais PAS pour le creole)
- Vue d'ensemble du taux de traduction par langue

**Inconvenients** :
- Cout : ~50 USD/mois pour le plan Team (payant pour un repo prive)
- Dependance a un SaaS
- Courbe d'apprentissage pour configurer l'integration Git + les mappings de fichiers

#### Option W3 : Weblate (self-hosted ou Cloud)

**Description** : Plateforme open source de gestion de traduction. Peut etre self-hosted (gratuit) ou utilise en SaaS (plan Libre pour l'open source, a partir de ~40 EUR/mois pour le hosted prive).

**Avantages** :
- **Open source** : self-hosting possible sans cout de licence
- **Support natif des codes ISO 639-3** : Weblate reconnait `mfe` et peut creer des definitions de langue custom avec alias
- Integration Git native (push/pull automatique)
- Memoire de traduction, glossaire, QA automatique
- Interface web pour les traducteurs
- API REST pour l'automatisation

**Inconvenients** :
- Self-hosting = maintenance du serveur (Docker, base de donnees, etc.)
- Hosted prive payant (~40 EUR/mois)
- Interface moins polished que Crowdin
- Communaute plus petite

#### Option W4 : Lokalise (SaaS)

**Description** : Plateforme SaaS premium de gestion de traduction.

**Avantages** :
- Excellente DX et UI
- SDK et plugins pour les frameworks majeurs
- Support des langues custom

**Inconvenients** :
- **Prix eleve** : a partir de 120 USD/mois pour le plan Team
- Suringenierie pour un projet avec 3 langues et un volume modere

### 3.8 RTL et considerations typographiques

#### Option RTL1 : Pas de support RTL, pas de preparation

**Description** : L'application est LTR uniquement. Si un support arabe est necessaire plus tard, on l'ajoutera.

#### Option RTL2 : Preparation minimale pour RTL futur

**Description** : Utiliser les proprietes CSS/Flutter logiques (`start`/`end` au lieu de `left`/`right`, `margin-inline-start` au lieu de `margin-left`) pour faciliter un eventuel passage RTL. Ne pas implementer RTL maintenant.

---

## 4. Matrice de decision

### 4.1 Criteres et poids

| Critere | Poids | Justification |
|---------|-------|---------------|
| Type-safety (erreurs a la compilation si cle manquante) | 20% | Reduit les bugs, essentiel avec 3 langues dont une sans traduction auto |
| DX (autocompletion, hot reload, productivite) | 20% | Petite equipe, la velocite quotidienne compte |
| Support du creole mauricien (locale non standard) | 20% | Contrainte incontournable du projet |
| Coherence inter-plateformes (Flutter + React + NestJS + emails) | 15% | Reduit la charge cognitive et la duplication |
| Facilite d'ajout d'une 4eme langue | 10% | Extensibilite future (hindi, mandarin pour la diaspora ?) |
| Performance (bundle size, lazy loading) | 10% | Mobile-first, reseau 3G/4G a Maurice |
| Maintenabilite (source de verite unique, outillage) | 5% | Important a long terme mais l'equipe est petite au lancement |

### 4.2 Flutter i18n

| Critere (poids) | `flutter_localizations` + `intl` (F1) | `easy_localization` (F2) | **`slang`** (F3) | `flutter_i18n` (F4) |
|-----------------|:--------------------------------------:|:------------------------:|:----------------:|:--------------------:|
| Type-safety (20%) | 2 | 1.5 | **5** | 1.5 |
| DX (20%) | 3 | 3.5 | **5** | 3 |
| Support mfe (20%) | 1.5 | 3.5 | **4.5** | 3 |
| Coherence (15%) | 3 | 3.5 | **4** | 3 |
| 4eme langue (10%) | 4 | 4 | **4.5** | 3.5 |
| Performance (10%) | 4 | 3 | **5** | 3 |
| Maintenabilite (5%) | 3.5 | 3 | **4.5** | 3 |

**Scores ponderes :**

| Option | Score |
|--------|:-----:|
| **`slang` (F3)** | **4.63** |
| `easy_localization` (F2) | 3.00 |
| `flutter_localizations` + `intl` (F1) | 2.68 |
| `flutter_i18n` (F4) | 2.60 |

**Justification F1 (officiel)** : Score bas a cause de la gestion catastrophique des locales non standards. `flutter gen-l10n` refuse `mfe`, et le package `intl` plante sur les formatages `mfe`. Contourner ces limitations est lourd et fragile.

**Justification F2 (easy_localization)** : Bonne tolerance aux locales custom mais l'absence de type-safety est un handicap majeur avec 3 langues dont une traduite manuellement. Les cles manquantes ne seront detectees qu'au runtime.

**Justification F3 (slang)** : Type-safety complete, les fichiers `strings_mfe.i18n.json` fonctionnent sans hack, le CLI detecte les cles manquantes, et le code genere offre une DX superieure.

### 4.3 React i18n (admin web)

| Critere (poids) | `react-intl` (R1) | **`i18next` + `react-i18next`** (R2) | `Paraglide` (R3) |
|-----------------|:------------------:|:------------------------------------:|:-----------------:|
| Type-safety (20%) | 3 | 3.5 | 5 |
| DX (20%) | 3.5 | 4.5 | 4 |
| Support mfe (20%) | 4 | 4.5 | 3 |
| Coherence (15%) | 3 | **4.5** | 2 |
| 4eme langue (10%) | 4 | 4.5 | 4 |
| Performance (10%) | 4 | 3.5 | 5 |
| Maintenabilite (5%) | 3.5 | 4 | 3 |

**Scores ponderes :**

| Option | Score |
|--------|:-----:|
| **`i18next` + `react-i18next` (R2)** | **4.08** |
| `react-intl` (R1) | 3.55 |
| `Paraglide` (R3) | 3.70 |

**Justification R2** : i18next est le framework i18n JavaScript le plus populaire, avec un ecosysteme de plugins inegale. Il utilise JSON comme format natif — le meme format que slang (Flutter) et nestjs-i18n. Le support des locales custom est natif. La compatibilite avec React Email (via le core i18next sans binding React) est un avantage decisif pour la coherence.

**Justification R3** : Paraglide est prometteur mais encore en pre-release, ce qui l'elimine pour la production.

### 4.4 Backend NestJS

| Critere | Codes d'erreur client-side (B2) | **Hybride** (B3) | nestjs-i18n complet (B1) |
|---------|:-------------------------------:|:-----------------:|:------------------------:|
| Simplicite backend | 5 | 3.5 | 3 |
| Emails/push localises | 1 | **5** | 5 |
| Coherence API | 4 | **4** | 3.5 |
| Maintenabilite | 3.5 | **4** | 3 |

**Choix : B3 (hybride)** — Le backend DOIT generer les emails et les notifications push dans la bonne langue. `nestjs-i18n` est utilise pour cette generation cote serveur. Les messages d'erreur API restent des codes structures traduits cote client.

---

## 5. Decisions

### D1 : Flutter — `slang` + `slang_flutter` + `intl` (formatage)

| Composant | Choix |
|-----------|-------|
| Strings i18n | `slang` v3.x + `slang_flutter` |
| Formatage dates/nombres | `intl` (avec fallback locale `fr` pour le creole) |
| Format source | JSON (fichiers `strings_<locale>.i18n.json`) |
| Locales | `fr` (base), `en`, `mfe` |

**Configuration slang** (`slang.yaml` a la racine du projet Flutter) :

```yaml
base_locale: fr
input_directory: lib/i18n
input_file_pattern: strings_<locale>.i18n.json
output_directory: lib/i18n
output_file_name: translations.g.dart
fallback_strategy: base_locale
locale_handling: true
flutter_integration: true
```

**Exemple de fichier** `lib/i18n/strings_fr.i18n.json` :

```json
{
  "common": {
    "appName": "BienBon",
    "currency": "Rs",
    "loading": "Chargement...",
    "retry": "Reessayer",
    "cancel": "Annuler",
    "confirm": "Confirmer",
    "save": "Enregistrer",
    "languageSelector": {
      "fr": "Francais",
      "en": "English",
      "mfe": "Kreol Morisien"
    }
  },
  "home": {
    "title": "Paniers pres de chez vous",
    "searchPlaceholder": "Rechercher un commerce...",
    "noResults": "Aucun panier disponible dans votre zone",
    "categories": {
      "bakery": "Boulangerie",
      "restaurant": "Restaurant",
      "grocery": "Epicerie",
      "hotel": "Hotel"
    }
  },
  "basket": {
    "surprise": "Panier Surprise",
    "pickup": "Retrait : $startTime - $endTime",
    "soldOut": "Epuise",
    "remaining(context=one)": "Plus que $count panier !",
    "remaining(context=other)": "Plus que $count paniers !",
    "reserve": "Reserver",
    "value": "Valeur $amount"
  }
}
```

**Exemple de fichier** `lib/i18n/strings_mfe.i18n.json` :

```json
{
  "common": {
    "appName": "BienBon",
    "currency": "Rs",
    "loading": "Pe sarze...",
    "retry": "Re-esey",
    "cancel": "Anile",
    "confirm": "Konfirme",
    "save": "Anrezistre",
    "languageSelector": {
      "fr": "Francais",
      "en": "English",
      "mfe": "Kreol Morisien"
    }
  },
  "home": {
    "title": "Panye pre kot ou",
    "searchPlaceholder": "Rod enn komers...",
    "noResults": "Pena panye disponib dan ou landrwa",
    "categories": {
      "bakery": "Boulanzer",
      "restaurant": "Restoran",
      "grocery": "Laboutik",
      "hotel": "Lotel"
    }
  },
  "basket": {
    "surprise": "Panye Sirpriz",
    "pickup": "Retir : $startTime - $endTime",
    "soldOut": "Fini",
    "remaining(context=one)": "Res $count panye !",
    "remaining(context=other)": "Res $count panye !",
    "reserve": "Rezerve",
    "value": "Valer $amount"
  }
}
```

**Usage dans le code Flutter** :

```dart
import 'package:bienbon/i18n/translations.g.dart';

// Acces type-safe aux traductions
Text(t.home.title) // "Paniers pres de chez vous" ou "Panye pre kot ou"
Text(t.basket.remaining(count: 3)) // "Plus que 3 paniers !"

// Changement de locale
LocaleSettings.setLocale(AppLocale.mfe);

// Formatage de date (via intl, avec fallback fr pour mfe)
String formatDate(DateTime date) {
  final formatLocale = LocaleSettings.currentLocale == AppLocale.mfe ? 'fr' : LocaleSettings.currentLocale.languageTag;
  return DateFormat.yMMMMd(formatLocale).format(date);
}
```

### D2 : React (admin) — `i18next` + `react-i18next`

| Composant | Choix |
|-----------|-------|
| Framework i18n | `i18next` + `react-i18next` |
| Format | JSON (namespaces par module) |
| Langues admin | `fr`, `en` (pas de creole pour l'admin) |
| Detection de langue | `i18next-browser-languagedetector` |
| Lazy loading | `i18next-http-backend` (chargement par namespace a la demande) |

**Configuration** :

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    ns: ['common', 'dashboard', 'partners', 'baskets', 'users', 'settings'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: {
      escapeValue: false, // React deja securise
    },
  });
```

**Structure des fichiers** :

```
public/locales/
  fr/
    common.json
    dashboard.json
    partners.json
    baskets.json
    users.json
    settings.json
  en/
    common.json
    dashboard.json
    ...
```

### D3 : Backend NestJS — Approche hybride (`nestjs-i18n` pour emails/push, codes d'erreur pour l'API)

**Messages d'erreur API** : L'API retourne des reponses structurees avec des codes d'erreur :

```json
{
  "statusCode": 409,
  "error": "BASKET_SOLD_OUT",
  "params": { "basketId": "abc-123" }
}
```

Le client Flutter/React traduit `BASKET_SOLD_OUT` en message localise via son propre systeme i18n :
- Flutter : `t.errors.basketSoldOut`
- React : `t('errors.basketSoldOut')`

**Emails et notifications push** : `nestjs-i18n` est utilise pour generer le contenu localise cote serveur :

```typescript
// email.service.ts
@Injectable()
export class EmailService {
  constructor(private readonly i18n: I18nService) {}

  async sendReservationConfirmation(user: User, reservation: Reservation) {
    const locale = user.preferredLanguage; // 'fr' | 'en' | 'mfe'
    const subject = this.i18n.t('email.confirmation.subject', { lang: locale });
    const html = await this.renderEmail('ConfirmationReservation', {
      locale,
      user,
      reservation,
    });
    await this.resend.send({ to: user.email, subject, html });
  }
}
```

**Structure des fichiers de traduction backend** :

```
src/i18n/
  fr/
    email.json       # Textes des emails
    notification.json # Textes des notifications push
    validation.json   # Messages de validation (optionnel)
  en/
    email.json
    notification.json
    validation.json
  mfe/
    email.json
    notification.json
    validation.json
```

### D4 : Format de fichiers — JSON partout

| Plateforme | Format | Organisation |
|------------|--------|-------------|
| Flutter (slang) | JSON | `strings_<locale>.i18n.json` (1 fichier par locale, structure imbriquee par module) |
| React admin (i18next) | JSON | `<locale>/<namespace>.json` (1 fichier par namespace et par locale) |
| NestJS (nestjs-i18n) | JSON | `<locale>/<domain>.json` (1 fichier par domaine — email, notification, validation) |
| React Email | JSON | Memes fichiers que NestJS (`email.json` par locale) |

**Pourquoi JSON et pas ARB** : L'ARB est un format Dart-centrique. Imposer ARB obligerait a maintenir un outil de conversion pour React et NestJS. JSON est universel, supporte par tous les frameworks choisis, et par toutes les plateformes de traduction.

**Structure globale des traductions dans le monorepo** :

```
i18n/
  flutter/                    # Consomme par les apps Flutter
    strings_fr.i18n.json
    strings_en.i18n.json
    strings_mfe.i18n.json
  web-admin/                  # Consomme par l'app React admin
    fr/
      common.json
      dashboard.json
      partners.json
      ...
    en/
      common.json
      ...
  backend/                    # Consomme par NestJS (emails + push + validation)
    fr/
      email.json
      notification.json
      validation.json
    en/
      email.json
      notification.json
      validation.json
    mfe/
      email.json
      notification.json
      validation.json
```

> **Note** : Certaines cles sont partagees entre Flutter et le web (ex: noms de categories, messages d'erreur). Plutot que de maintenir une source de verite unique avec un systeme de sync complexe, on accepte la duplication legere des cles communes et on s'appuie sur la plateforme de traduction (phase 2) pour garantir la coherence.

### D5 : Creole mauricien — `mfe` partout, fallback `fr` pour le formatage

| Aspect | Decision |
|--------|----------|
| Code de locale interne | `mfe` (ISO 639-3) |
| Code en base de donnees | `mfe` (colonne `preferred_language` de la table `users`) |
| Code dans les URLs user-facing | `mfe` (ex: balise `hreflang="mfe"`) |
| Formatage dates/nombres | Fallback sur les regles `fr` (francais) |
| Pluralisation | Regles identiques au francais (0-1 = singulier, 2+ = pluriel) |
| Traduction automatique | **Interdite** — toutes les traductions creoles sont faites par un humain natif |

**Implementation dans Flutter** :

```dart
// locale_utils.dart

/// Retourne la locale de formatage Intl pour la locale applicative
String getIntlLocale(AppLocale locale) {
  switch (locale) {
    case AppLocale.fr:
      return 'fr_MU';  // Francais de Maurice
    case AppLocale.en:
      return 'en_MU';  // Anglais de Maurice
    case AppLocale.mfe:
      return 'fr_MU';  // Fallback francais pour le formatage
  }
}
```

**Implementation dans React (admin)** — L'admin ne supporte pas le creole, mais pour le site vitrine futur ou les composants partages :

```typescript
// i18n/format.ts
const FORMAT_LOCALE_MAP: Record<string, string> = {
  fr: 'fr-MU',
  en: 'en-MU',
  mfe: 'fr-MU', // Fallback francais pour le formatage
};

export function getFormatLocale(appLocale: string): string {
  return FORMAT_LOCALE_MAP[appLocale] ?? 'fr-MU';
}
```

### D6 : Emails — Templates React Email parametres avec i18next

Un seul template JSX par type d'email. Les textes sont injectes via le core `i18next` initialise avec la locale de l'utilisateur. Les fichiers de traduction sont les memes que ceux de `nestjs-i18n` (`backend/fr/email.json`, etc.).

**Exemple** :

```tsx
// emails/ConfirmationReservation.tsx
import { Html, Head, Body, Container, Heading, Text, Img } from '@react-email/components';
import { getTranslation } from '../i18n/email-i18n';

interface Props {
  locale: 'fr' | 'en' | 'mfe';
  userName: string;
  basketName: string;
  pickupDate: string;
  pickupTime: string;
  amount: string;
  qrCodeUrl: string;
  pinCode: string;
}

export const ConfirmationReservation = ({ locale, userName, basketName, pickupDate, pickupTime, amount, qrCodeUrl, pinCode }: Props) => {
  const t = getTranslation(locale, 'email');

  return (
    <Html lang={locale === 'mfe' ? 'fr' : locale}>
      <Head />
      <Body>
        <Container>
          <Img src="https://bienbon.mu/logo.png" alt="BienBon" />
          <Heading>{t('confirmation.title')}</Heading>
          <Text>{t('confirmation.greeting', { name: userName })}</Text>
          <Text>{t('confirmation.body', { basketName, date: pickupDate, time: pickupTime })}</Text>
          <Text>{t('confirmation.amount', { amount })}</Text>
          <Img src={qrCodeUrl} alt="QR Code" />
          <Text>{t('confirmation.pin', { pin: pinCode })}</Text>
          <Text>{t('confirmation.footer')}</Text>
        </Container>
      </Body>
    </Html>
  );
};
```

**Note sur `lang`** : L'attribut `lang` de l'email est `fr` quand la locale est `mfe`, car les clients mail ne reconnaissent pas `mfe` et pourraient afficher un avertissement ou appliquer un mauvais rendu typographique. Le creole mauricien etant base sur le francais, `lang="fr"` est le fallback le plus semantique.

### D7 : Workflow de traduction — Fichiers manuels (Phase 1) + Crowdin (Phase 2)

#### Phase 1 (Lancement — 0-6 mois)

| Aspect | Decision |
|--------|----------|
| Qui traduit ? | FR = developpeurs, EN = developpeurs, MFE = traducteur natif (freelance ou membre de l'equipe) |
| Ou ? | Fichiers JSON dans le repo Git |
| Workflow | Le developpeur ajoute les cles en FR, cree les cles EN, le traducteur MFE traduit via PR |
| QA | Script CI qui compare les cles entre les 3 fichiers de chaque plateforme et echoue si une cle manque |
| Budget | 0 EUR (hors remuneration du traducteur MFE) |

**Script de verification CI** (a integrer dans le pipeline) :

```bash
#!/bin/bash
# check-i18n-completeness.sh
# Verifie que toutes les cles presentes dans la locale de base (fr) existent dans les autres locales

set -e

check_flutter() {
  echo "Checking Flutter translations..."
  npx json-diff i18n/flutter/strings_fr.i18n.json i18n/flutter/strings_en.i18n.json --keys-only
  npx json-diff i18n/flutter/strings_fr.i18n.json i18n/flutter/strings_mfe.i18n.json --keys-only
}

check_backend() {
  echo "Checking backend translations..."
  for domain in email notification validation; do
    npx json-diff i18n/backend/fr/$domain.json i18n/backend/en/$domain.json --keys-only
    npx json-diff i18n/backend/fr/$domain.json i18n/backend/mfe/$domain.json --keys-only
  done
}

check_flutter
check_backend
echo "All translations complete!"
```

> **Note** : slang fournit nativement la commande `dart run slang analyze` qui detecte les cles manquantes et inutilisees pour les traductions Flutter. Ce check est a integrer dans le CI en plus du script generique.

#### Phase 2 (Post-lancement — 6+ mois, si necessaire)

| Aspect | Decision |
|--------|----------|
| Plateforme | **Crowdin** (plan Team, ~50 USD/mois) |
| Pourquoi Crowdin | Support des langues custom (ajout de `mfe` dans les parametres projet), integration GitHub native, glossaire et memoire de traduction, interface web pour le traducteur MFE |
| Configuration | Ajout de `mfe` comme langue custom dans les parametres du projet Crowdin, avec mapping vers le code `mfe` dans les fichiers de sortie |
| Sync | Bidirectionnelle via l'integration GitHub : les developpeurs poussent les nouvelles cles, Crowdin notifie le traducteur, le traducteur traduit via l'interface web, Crowdin cree une PR avec les traductions |

> **Alternative** : si le budget est contraint, **Weblate self-hosted** (Docker) est une option gratuite avec un support natif des codes ISO 639-3. Le cout se reporte sur la maintenance du serveur.

### D8 : RTL — Pas d'implementation, preparation minimale

| Decision | Detail |
|----------|--------|
| RTL maintenant | **Non** — les 3 langues sont LTR |
| Preparation | Utiliser les proprietes logiques CSS (`margin-inline-start`, `padding-inline-end`, etc.) dans le web admin et les emails. Utiliser `EdgeInsetsDirectional` et `AlignmentDirectional` dans Flutter. |
| Future support arabe | Si necessaire, l'ajout de RTL sera facilite par les proprietes logiques. Budget estime : 2-3 semaines de travail. |

---

## 6. Architecture globale

```
                    ┌─────────────────────────────┐
                    │   Fichiers de traduction     │
                    │   (JSON dans le repo Git)    │
                    │                              │
                    │  i18n/                        │
                    │    flutter/                   │
                    │      strings_fr.i18n.json     │
                    │      strings_en.i18n.json     │
                    │      strings_mfe.i18n.json    │
                    │    web-admin/                 │
                    │      fr/ en/                  │
                    │    backend/                   │
                    │      fr/ en/ mfe/             │
                    └──────────┬──────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
    ┌───────v───────┐  ┌───────v───────┐  ┌───────v───────┐
    │  Flutter app  │  │  React admin  │  │  NestJS API   │
    │               │  │               │  │               │
    │  slang        │  │  i18next +    │  │  nestjs-i18n  │
    │  (code-gen)   │  │  react-i18next│  │  (emails +    │
    │               │  │               │  │   push notif) │
    │  intl         │  │  Intl API     │  │               │
    │  (formatage)  │  │  (formatage)  │  │  i18next core │
    │               │  │               │  │  (React Email)│
    └───────────────┘  └───────────────┘  └───────┬───────┘
                                                  │
                                          ┌───────v───────┐
                                          │  React Email  │
                                          │  (templates   │
                                          │   localises)  │
                                          └───────────────┘
```

### 6.1 Flux de resolution de la langue

```
Utilisateur ouvre l'app/le site
        │
        v
  ┌─ Utilisateur connecte ? ──┐
  │                            │
  Oui                         Non
  │                            │
  v                            v
  Lire preferred_language      Lire cookie/localStorage
  depuis la table users        'bienbon_lang'
  │                            │
  v                            v
  ┌─ Valeur trouvee ? ────────┐─── Non ──> Defaut : 'fr'
  │                            │
  Oui                         │
  │                            │
  v                            │
  Appliquer la locale ◄────────┘
  (fr / en / mfe)
        │
        v
  Stocker dans le header
  'Accept-Language' pour
  les appels API
```

### 6.2 Persistance de la preference linguistique

| Contexte | Stockage | Cle |
|----------|----------|-----|
| Flutter (mobile, non connecte) | `SharedPreferences` | `bienbon_lang` |
| Flutter (mobile, connecte) | Base de donnees (`users.preferred_language`) + `SharedPreferences` (cache local) |
| React admin (web) | `localStorage` + `i18next-browser-languagedetector` | `i18nextLng` |
| API NestJS (emails/push) | Lecture de `users.preferred_language` en base |

### 6.3 Schema de base de donnees (complement a ADR-003)

```sql
-- Ajout a la table users existante
ALTER TABLE users
  ADD COLUMN preferred_language VARCHAR(3) NOT NULL DEFAULT 'fr'
  CONSTRAINT chk_preferred_language CHECK (preferred_language IN ('fr', 'en', 'mfe'));

-- Index pour les requetes de notification par langue
CREATE INDEX idx_users_preferred_language ON users(preferred_language);
```

---

## 7. Consequences

### 7.1 Positives

- **Type-safety Flutter** : slang garantit qu'aucune cle de traduction ne manque a la compilation. Avec 3 langues dont une sans traduction automatique, c'est un filet de securite essentiel.
- **DX superieure** : autocompletion `t.module.screen.key` dans Flutter, `useTranslation()` hooks dans React. Le developpeur ne manipule jamais de strings magiques.
- **Coherence JSON** : un seul format de fichier pour toutes les plateformes, compatible avec toutes les plateformes de traduction.
- **Creole sans hacks** : slang accepte `mfe` nativement, i18next aussi, nestjs-i18n aussi. Le seul compromis est le fallback de formatage sur `fr`, qui est parfaitement acceptable dans le contexte mauricien.
- **Emails maintenables** : un seul template JSX par email, les textes sont externalises dans les fichiers JSON. Ajouter une 4eme langue = ajouter un fichier JSON, pas 19 templates.
- **Extensibilite** : ajouter une 4eme langue (hindi, mandarin) = ajouter des fichiers JSON dans chaque dossier + configurer la nouvelle locale dans slang/i18next/nestjs-i18n. Pas de changement d'architecture.

### 7.2 Negatives

- **Deux systemes de traduction** : slang (Flutter) et i18next (React/NestJS/emails) ont des syntaxes de pluralisation et d'interpolation legerement differentes. Les cles ne sont pas directement copiables entre les plateformes.
  - slang : `$count paniers` / `remaining(context=one)`
  - i18next : `{{count}} paniers` / `remaining_one`
  - **Mitigation** : la plateforme de traduction (Crowdin, phase 2) gere cette conversion automatiquement.
- **Duplication de certaines cles** : les noms de categories, les messages d'erreur, etc. existent en double (Flutter + React/NestJS).
  - **Mitigation** : pour les cles metier critiques (ex: categories, statuts), un script CI peut verifier la coherence entre les fichiers Flutter et backend.
- **Pas de "single source of truth"** au sens strict : les traductions sont reparties dans 3 dossiers. C'est un compromis delibere pour eviter la complexite d'un systeme de sync centralise a ce stade.
- **Dependance a un traducteur creole** : sans traduction automatique, le creole est un goulot d'etranglement humain.

---

## 8. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Le traducteur creole n'est pas disponible (maladie, depart) | Moyenne | Eleve | Constituer un petit pool de 2-3 traducteurs creoles des le lancement. Documenter un glossaire des termes techniques en creole (anti-gaspi, panye sirpriz, etc.) pour faciliter l'onboarding d'un nouveau traducteur. |
| Les mots creoles sont plus longs et cassent le layout | Moyenne | Moyen | Tester systematiquement chaque ecran en creole. Prevoir des `TextOverflow.ellipsis` et des layouts flexibles. Integrer le creole dans les tests visuels Storybook/widget tests. |
| slang change de version majeure et casse l'API | Faible | Moyen | Verrouiller la version dans `pubspec.yaml`. slang est stable depuis v3.x. La migration serait localisee (fichiers de config + regeneration du code). |
| Les conventions orthographiques du creole evoluent (Grafi Larmoni) | Faible | Faible | Garder un glossaire de reference et mettre a jour les traductions si necessaire. Impact limite car il s'agit d'ajustements orthographiques, pas de restructuration. |
| L'equipe oublie de traduire les nouvelles cles en creole | Moyenne | Moyen | Le script CI de verification des cles + `dart run slang analyze` echouent si une cle manque. Rendre ce check bloquant dans le pipeline CI/CD. |
| Un framework ne supporte plus `mfe` dans une mise a jour | Tres faible | Moyen | slang et i18next traitent les locales comme des strings arbitraires, pas comme des locales validees. Le risque est quasi nul. Le seul point fragile est le package `intl` de Dart, mais on utilise `fr` comme locale de formatage, pas `mfe`. |

---

## 9. Plan de validation

Avant de finaliser cette decision, l'equipe devrait :

1. **PoC slang + Flutter (0.5 jour)** : Creer un ecran Flutter avec 3 langues (fr, en, mfe), verifier la generation de code, l'autocompletion, le hot reload et le changement de locale dynamique.

2. **PoC formatage mfe (0.25 jour)** : Verifier que `DateFormat('fr_MU')` et `NumberFormat.currency(locale: 'fr_MU', symbol: 'Rs')` affichent correctement les dates et montants quand la locale applicative est `mfe`.

3. **PoC React Email + i18next (0.5 jour)** : Rendre un template d'email en 3 langues avec i18next core cote serveur, verifier le rendu HTML.

4. **PoC nestjs-i18n (0.25 jour)** : Configurer nestjs-i18n avec les fichiers JSON, verifier la resolution de langue depuis le header `Accept-Language` et la generation de contenu localise pour un email.

5. **Test de layout creole (0.5 jour)** : Traduire 5-10 ecrans representatifs en creole et verifier les problemes de layout (mots longs, boutons, headers).

**Duree totale estimee : 2 jours.**

---

## 10. Glossaire technique creole

Pour reference, voici un glossaire initial des termes de l'application en creole mauricien (Grafi Larmoni) :

| Francais | Anglais | Kreol Morisien |
|----------|---------|----------------|
| Panier surprise | Surprise basket | Panye sirpriz |
| Reserver | Reserve | Rezerve |
| Retrait | Pickup | Retir |
| Commerce | Store | Komers |
| Boulangerie | Bakery | Boulanzer |
| Restaurant | Restaurant | Restoran |
| Epicerie | Grocery | Laboutik |
| Anti-gaspillage | Anti-waste | Anti-gaspiyaz |
| Disponible | Available | Disponib |
| Epuise | Sold out | Fini |
| Mon compte | My account | Mo kont |
| Se connecter | Log in | Konekte |
| Se deconnecter | Log out | Dekonekte |
| Rechercher | Search | Rod |
| Confirmer | Confirm | Konfirme |
| Annuler | Cancel | Anile |
| Favoris | Favorites | Prefere |
| Avis | Review | Lopinion |
| Reclamation | Complaint | Reklamasion |
| Notifications | Notifications | Notifikasion |

> Ce glossaire est a valider et enrichir par un locuteur natif du creole mauricien. Il servira de reference pour le traducteur et sera integre comme glossaire dans Crowdin (phase 2).

---

## 11. Decision finale resumee

| Question | Decision |
|----------|----------|
| i18n Flutter | **slang** (v3.x) + `slang_flutter` + `intl` (formatage) |
| i18n React admin | **i18next** + `react-i18next` |
| i18n Backend NestJS | **Hybride** : codes d'erreur API + `nestjs-i18n` pour emails/push |
| i18n Emails | **React Email** + `i18next` core (memes fichiers JSON que le backend) |
| Format de fichiers | **JSON** partout |
| Locale creole | **`mfe`** (ISO 639-3), fallback `fr` pour le formatage dates/nombres |
| Workflow traduction | **Phase 1** : fichiers manuels + script CI. **Phase 2** : Crowdin |
| RTL | **Non** pour l'instant, proprietes logiques CSS/Flutter pour preparer |
| Pluralisation creole | Regles identiques au francais (singulier/pluriel) |
| Langue par defaut | **Francais** (fr) |
| Langues admin | FR + EN uniquement (pas de creole) |

---

## 12. References

### Packages et frameworks
- [slang — Type-safe i18n for Dart and Flutter (GitHub)](https://github.com/slang-i18n/slang)
- [slang sur pub.dev](https://pub.dev/packages/slang)
- [slang_flutter sur pub.dev](https://pub.dev/packages/slang_flutter)
- [easy_localization sur pub.dev](https://pub.dev/packages/easy_localization)
- [Flutter Localization Packages Comparison 2025](https://flutterlocalisation.com/blog/flutter-localization-packages-comparison)
- [i18next documentation](https://www.i18next.com/)
- [react-i18next documentation](https://react.i18next.com/)
- [react-intl vs react-i18next comparison](https://www.locize.com/blog/react-intl-vs-react-i18next/)
- [i18next vs react-intl vs paraglide (npm-compare)](https://npm-compare.com/@inlang/paraglide-js,i18next,next-i18next,react-intl,vue-i18n)
- [nestjs-i18n (GitHub)](https://github.com/toonvanstrijp/nestjs-i18n)
- [nestjs-i18n sur npm](https://www.npmjs.com/package/nestjs-i18n)
- [NestJS Localization Guide (Phrase)](https://phrase.com/blog/posts/nestjs-localization/)

### Creole mauricien
- [Mauritian Creole — ISO 639:mfe (Wikipedia)](https://en.wikipedia.org/wiki/ISO_639:mfe)
- [Morisyen Language (Ethnologue)](https://www.ethnologue.com/language/mfe/)
- [Flutter issue #66553 — Adding unsupported locale is challenging](https://github.com/flutter/flutter/issues/66553)
- [Flutter issue #162869 — Can't generate localizations for custom locale](https://github.com/flutter/flutter/issues/162869)

### Emails i18n
- [React Email i18n issue #431](https://github.com/resend/react-email/issues/431)
- [How to Send i18n HTML Emails using React Email (dev.to)](https://dev.to/femtowork/how-to-send-i18n-html-emails-from-scripts-using-react-email-3lea)
- [@languine/react-email (npm)](https://www.npmjs.com/package/@languine/react-email)

### Plateformes de traduction
- [Crowdin Language Settings](https://support.crowdin.com/project-settings/languages/)
- [Crowdin — How to add a custom language](https://community.crowdin.com/t/how-to-add-my-my-own-language-to-crowdin-project-if-it-is-not-officially-supported/253)
- [Weblate Language Definitions](https://docs.weblate.org/en/latest/admin/languages.html)

### Formats et standards
- [ICU MessageFormat Guide (Phrase)](https://phrase.com/blog/posts/guide-to-the-icu-message-format/)
- [ICU MessageFormat Syntax (Crowdin)](https://crowdin.com/blog/2022/04/13/icu-guide)
- [Internationalization in React: Complete Guide 2026 (GloryWebs)](https://www.glorywebs.com/blog/internationalization-in-react)
