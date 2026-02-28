# ADR-025 : Pipeline CI/CD securise pour du code genere par IA

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-001 (stack backend), ADR-002 (architecture applicative), ADR-020 (hebergement/infrastructure), ADR-022 (securite OWASP), ADR-023 (strategie tests)

---

## 1. Contexte

### 1.1 Pourquoi un pipeline CI/CD renforce est vital

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. **L'integralite du code est generee par des agents IA** (Claude Code). L'equipe humaine (2-5 developpeurs) supervise, revoit et pilote les agents, mais ne tape pas la majorite du code manuellement.

Cette approche fait du pipeline CI/CD **le principal garde-fou de qualite et de securite** du projet. Contrairement a un projet classique ou la review humaine attrape la majorite des problemes, ici :

- **Le code IA peut halluciner des dependances** : une etude de 2025 sur 576 000 echantillons de code produits par 16 LLM a montre que **pres de 20% des dependances referees n'existent pas** (packages fantomes). Les modeles open-source hallucinaient ~22% des dependances vs ~5% pour les modeles commerciaux.
- **Le "slopsquatting"** : des attaquants enregistrent des packages portant les noms hallucines par les LLM et y injectent du code malveillant. 43% des memes packages hallucines sont suggeres de maniere repetable par le meme modele.
- **Le code IA contient plus de failles** : une analyse CodeRabbit (2025) sur 470 PR open-source a montre +75% d'erreurs de logique et +57% de failles de securite dans les PR generees par IA vs les PR humaines (ref. ADR-023).
- **L'IA peut hardcoder des secrets** : cles API, tokens, mots de passe inseres "en dur" dans le code, meme quand le prompt dit de ne pas le faire.

Le pipeline CI/CD doit donc integrer des **security gates automatises** bien au-dela d'un projet classique.

### 1.2 Stack technique (rappel)

| Composant | Technologie | Hebergement (ADR-020) |
|-----------|-------------|-----------------------|
| Backend API | NestJS + Prisma + PostgreSQL | Railway (Singapour) |
| Queue/Workers | BullMQ + Redis | Railway |
| Mobile consumer | Flutter | App stores (iOS/Android) |
| Mobile partner | Flutter | App stores (iOS/Android) |
| Admin web | React + Storybook | Cloudflare Pages |
| Site vitrine | Astro | Cloudflare Pages |
| DB | Supabase (PostgreSQL manage) | Supabase (Singapour) |

### 1.3 Outils deja decides dans les ADR precedentes

- ESLint strict + typescript-eslint (ADR-001)
- Vitest pour les tests backend (ADR-023)
- `flutter_test` + `flutter analyze` pour Flutter (ADR-023)
- Prisma Migrate pour les migrations DB (ADR-001)
- Sentry pour le monitoring (ADR-020)
- Dependabot pour les alertes de vulnerabilites npm (ADR-020)
- GitHub Actions comme plateforme CI/CD (ADR-020)

---

## 2. Question 1 : Structure du repository

### 2.1 Options evaluees

#### Option A : Monorepo (un seul repository pour tout)

```
bienbon/
  apps/
    backend/          # NestJS + Prisma
    consumer/         # Flutter (app consommateur)
    partner/          # Flutter (app partenaire)
    admin/            # React (backoffice)
    vitrine/          # Astro (site marketing)
  packages/
    shared-types/     # Types TypeScript partages (backend/admin)
    dart-api-client/  # Client API genere pour Flutter
    eslint-config/    # Config ESLint partagee
  .github/
    workflows/        # Pipelines CI/CD
```

**Outils monorepo possibles :**

| Outil | Langages | Complexite | Ideal pour |
|-------|----------|------------|-----------|
| **Turborepo** | JS/TS uniquement | Faible | Projets 100% JS/TS. Task runner rapide, caching intelligent. Ne supporte pas Flutter. |
| **Nx** | Polyglot (JS, Java, Go, Python...) | Moyenne | Grands monorepos multi-langages. Plugins pour NestJS et React. Pas de plugin Flutter officiel. |
| **Simple workspace** | Agnostique | Tres faible | Dossiers simples, scripts manuels, path filters dans GitHub Actions. |

**Avantages monorepo :**
- Atomic commits cross-composant (ex: changement d'API backend + mise a jour du client Flutter dans le meme commit)
- Configuration partagee (ESLint, Prettier, Husky, lint-staged)
- Un seul `.github/workflows/` avec des path filters
- Visibilite globale du projet
- Dependabot/Renovate sur un seul repo

**Inconvenients monorepo :**
- Flutter et Node.js ont des ecosystemes completement separes (pubspec.yaml vs package.json). Aucun outil de monorepo ne gere nativement les deux.
- Le repo devient volumineux (node_modules + Flutter SDK cache + builds)
- Un CI qui touche tout a chaque push (sans path filters configures correctement)
- Les agents IA doivent naviguer un arbre plus large, ce qui augmente la fenetre de contexte necessaire

#### Option B : Multi-repo (un repo par application)

```
bienbon-backend/     # NestJS + Prisma
bienbon-consumer/    # Flutter (app consommateur)
bienbon-partner/     # Flutter (app partenaire)
bienbon-admin/       # React (backoffice)
bienbon-vitrine/     # Astro (site marketing)
bienbon-shared/      # Types partages (package npm prive ou Git submodule)
```

**Avantages multi-repo :**
- Isolation totale : un bug dans le CI Flutter n'impacte pas le backend
- Pipelines simples, dedies a chaque technologie
- Clone rapide (pas besoin de tout le projet)
- Permissions granulaires (un freelance Flutter ne voit pas le backend)

**Inconvenients multi-repo :**
- Changements cross-repo difficiles a coordonner (changement d'API = 3 repos a modifier)
- Configuration dupliquee (Husky, ESLint, Dependabot sur chaque repo)
- Pas d'atomic commits cross-composant

#### Option C : Monorepo hybride (decision retenue)

**Backend + Admin + Vitrine dans un monorepo Node.js, Flutter apps dans des repos separes.**

```
# Repo 1 : bienbon (monorepo Node.js)
bienbon/
  apps/
    backend/          # NestJS + Prisma
    admin/            # React
    vitrine/          # Astro
  packages/
    shared-types/     # Types TypeScript partages
    eslint-config/    # Config ESLint
    api-contract/     # Schemas OpenAPI / Zod
  .github/workflows/
  .husky/
  package.json        # Workspace root (npm workspaces)

# Repo 2 : bienbon-consumer (Flutter)
bienbon-consumer/
  lib/
  test/
  .github/workflows/

# Repo 3 : bienbon-partner (Flutter)
bienbon-partner/
  lib/
  test/
  .github/workflows/
```

### 2.2 Decision : Option C -- Monorepo hybride

**Justification :**

1. **Separation naturelle par ecosysteme** : Node.js (backend, React, Astro) et Dart (Flutter) sont des mondes separes. Les faire cohabiter dans un monorepo force l'utilisation d'un outil comme Nx sans benefice reel -- Nx n'a pas de plugin Flutter officiel et le graph de dependances cross-langage est artificiel.

2. **Le monorepo Node.js a une vraie valeur** : types TypeScript partages entre backend et admin, config ESLint mutualisee, schemas API (Zod/OpenAPI) consommes par le backend et l'admin. `npm workspaces` (natif, zero outil supplementaire) suffit.

3. **Les apps Flutter partagent un contrat API, pas du code** : le client API Dart est genere a partir du schema OpenAPI (dans le monorepo Node.js) et publie comme package Dart. Les apps Flutter le consomment comme une dependance, pas comme du code local.

4. **CI simplifiee** : pas besoin de Turborepo ni Nx. Le monorepo Node.js utilise `npm workspaces` + path filters GitHub Actions. Les repos Flutter ont des pipelines Flutter classiques.

5. **Taille d'equipe** : pour 2-5 devs, la complexite d'un outil monorepo polyglot (Nx) n'est pas justifiee. `npm workspaces` + path filters est suffisant et zero-maintenance.

**Structure du monorepo Node.js avec `npm workspaces` :**

```jsonc
// package.json (racine)
{
  "name": "bienbon",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

---

## 3. Question 2 : Pipeline CI -- etapes et ordre

### 3.1 Principe : pipeline en entonnoir

Chaque etape est un **gate** : si elle echoue, le pipeline s'arrete. Les etapes les plus rapides et les moins couteuses sont en premier (fail fast).

```
                    RAPIDE / CHEAP
                    ┌────────────────┐
                    │  Secret scan   │  < 10s
                    └───────┬────────┘
                    ┌───────v────────┐
                    │  Lint + Format │  < 30s
                    └───────┬────────┘
                    ┌───────v────────┐
                    │  Type check    │  < 60s
                    └───────┬────────┘
                    ┌───────v────────┐
                    │  Unit tests    │  1-3 min
                    └───────┬────────┘
                    ┌───────v────────┐
                    │  Integ. tests  │  2-5 min
                    └───────┬────────┘
                    ┌───────v────────┐
                    │  Security scan │  1-3 min
                    │  (SAST + deps) │
                    └───────┬────────┘
                    ┌───────v────────┐
                    │  Build         │  1-2 min
                    └───────┬────────┘
                    ┌───────v────────┐
                    │  Deploy        │  1-2 min
                    └────────────────┘
                    LENT / COUTEUX
```

### 3.2 Pipeline Backend NestJS

```yaml
# Declenchement : push sur main, PR vers main
# Path filter : apps/backend/**, packages/**, prisma/**

jobs:
  # ── Gate 0 : Secrets ──────────────────────
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0               # historique complet pour scanner les commits
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ── Gate 1 : Qualite statique ─────────────
  lint-typecheck:
    needs: secrets-scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint            # ESLint strict + typescript-eslint
      - run: npx tsc --noEmit        # Type-check sans build
      - run: npx prisma validate     # Schema Prisma valide

  # ── Gate 2 : Tests unitaires ──────────────
  unit-tests:
    needs: lint-typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx vitest run --coverage
      # Coverage minimum : 80% lignes, 70% branches (ADR-023)

  # ── Gate 3 : Tests d'integration ──────────
  integration-tests:
    needs: lint-typecheck
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: bienbon_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/bienbon_test
      - run: npx vitest run --config vitest.integration.config.ts
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/bienbon_test
          REDIS_URL: redis://localhost:6379

  # ── Gate 4 : Securite ────────────────────
  security-scan:
    needs: lint-typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci

      # 4a. Audit des dependances npm
      - run: npm audit --audit-level=high

      # 4b. Verification des packages hallucines
      - name: Check for hallucinated packages
        run: |
          node scripts/check-phantom-packages.js

      # 4c. SAST avec Semgrep
      - uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/typescript
            p/nodejs
            p/owasp-top-ten
            p/jwt
            p/sql-injection

      # 4d. License compliance
      - run: npx license-checker --production --failOn "GPL-3.0;AGPL-3.0"

  # ── Gate 5 : Build ───────────────────────
  build:
    needs: [unit-tests, integration-tests, security-scan]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build

  # ── Gate 6 : Deploy ──────────────────────
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/railway-action@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
```

**Temps de pipeline estime : 6-10 minutes** (avec parallelisation des gates 2, 3 et 4).

### 3.3 Pipeline Flutter (consumer + partner)

```yaml
# Declenchement : push sur main, PR vers main

jobs:
  # ── Gate 0 : Secrets ──────────────────────
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2

  # ── Gate 1 : Qualite statique ─────────────
  analyze:
    needs: secrets-scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable
          cache: true
      - run: flutter pub get
      - run: dart format --set-exit-if-changed .    # Format check
      - run: flutter analyze --fatal-infos          # Lint strict
      - run: dart run custom_lint                   # Regles custom si configurees

  # ── Gate 2 : Tests unitaires ──────────────
  unit-tests:
    needs: analyze
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable
          cache: true
      - run: flutter pub get
      - run: flutter test --coverage
      # Coverage minimum : 80% lignes

  # ── Gate 3 : Widget tests ────────────────
  widget-tests:
    needs: analyze
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable
          cache: true
      - run: flutter pub get
      - run: flutter test test/widgets/ --coverage

  # ── Gate 4 : Securite deps ───────────────
  security-scan:
    needs: analyze
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable
          cache: true
      - run: flutter pub get

      # Verification des packages Dart hallucines
      - name: Verify pub.dev packages exist
        run: dart run scripts/check_phantom_packages.dart

      # Audit des dependances Dart (outil tiers ou script custom)
      - name: Check outdated and vulnerable deps
        run: flutter pub outdated

      # Semgrep (regles Dart disponibles)
      - uses: semgrep/semgrep-action@v1
        with:
          config: p/dart

  # ── Gate 5 : Build Android ───────────────
  build-android:
    needs: [unit-tests, widget-tests, security-scan]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable
          cache: true
      - run: flutter pub get
      - run: flutter build apk --release --split-per-abi
      - uses: actions/upload-artifact@v4
        with:
          name: apk-release
          path: build/app/outputs/flutter-apk/

  # ── Gate 5b : Build iOS ──────────────────
  build-ios:
    needs: [unit-tests, widget-tests, security-scan]
    runs-on: macos-latest            # ATTENTION : 10x le cout en minutes
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable
          cache: true
      - run: flutter pub get
      - run: flutter build ios --release --no-codesign
      # Le signing et upload seront geres par Codemagic ou Fastlane
```

**Temps de pipeline estime : 8-15 minutes** (build iOS le plus lent a cause de macOS runner).

### 3.4 Pipeline React Admin

```yaml
# Path filter : apps/admin/**

jobs:
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2

  quality:
    needs: secrets-scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npx vitest run --coverage
      - run: npm run build

  # Tests visuels via Storybook + Chromatic (optionnel)
  visual-regression:
    needs: quality
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}

  deploy:
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=bienbon-admin
```

### 3.5 Pipeline Astro (site vitrine)

```yaml
# Path filter : apps/vitrine/**

jobs:
  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2

  build-deploy:
    needs: secrets-scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - if: github.ref == 'refs/heads/main'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=bienbon-vitrine
```

---

## 4. Question 3 : Security gates (critique avec du code IA)

### 4.1 SAST : Semgrep

#### Options evaluees

| Outil | Precision | Faux positifs | Vitesse | Prix | CI integration |
|-------|-----------|--------------|---------|------|----------------|
| **Semgrep** | 82% | 12% | **Rapide** (pas de compilation requise, pattern matching semantique) | OSS gratuit, Pro payant | GitHub Action officielle, < 60s scan typique |
| **CodeQL** | 88% | 5% | **Lent** (construit une DB semantique, puis execute des queries) | Gratuit pour repos publics, payant pour prives (GitHub Advanced Security ~$49/user/mois) | GitHub natif mais 5-15 min de scan |
| **SonarCloud** | Bonne | Moderee | Moyenne | Gratuit open-source, payant prive ($14+/mois) | Bonne integration mais lourde a configurer |

#### Decision : Semgrep (OSS)

**Justification :**

1. **Vitesse** : scan en < 60 secondes dans le CI. CodeQL prend 5-15 minutes pour construire sa base de donnees et executer les queries. Sur un pipeline cible de 6-10 minutes, 10 minutes de SAST est inacceptable.

2. **Regles YAML lisibles** : les regles Semgrep ressemblent au code qu'elles detectent. L'equipe (et les agents IA) peut ecrire des regles custom pour les patterns specifiques a BienBon (ex: detecter l'usage de `eval()`, des `console.log` avec des donnees PII, des raw SQL queries hors Prisma).

3. **Cout** : gratuit en mode OSS avec les rulesets communautaires (`p/typescript`, `p/nodejs`, `p/owasp-top-ten`, `p/jwt`, `p/sql-injection`). Les rulesets Pro (detecteurs proprietaires avances) sont payants mais non necessaires au lancement.

4. **Support TypeScript + Dart** : Semgrep a des rulesets pour TypeScript (mature) et Dart (plus recent, communautaire). CodeQL n'a pas de support Dart.

5. **Regles custom pour code IA** : on peut ajouter des regles specifiques comme :

```yaml
# .semgrep/rules/bienbon-custom.yml
rules:
  - id: no-hardcoded-secrets
    patterns:
      - pattern: |
          $KEY = "..."
      - metavariable-regex:
          metavariable: $KEY
          regex: (api_key|secret|password|token|jwt|private_key)
    message: "Secret potentiellement hardcode. Utiliser les variables d'environnement."
    severity: ERROR
    languages: [typescript, javascript]

  - id: no-raw-sql
    pattern: |
      $DB.query($SQL)
    message: "Utiliser Prisma au lieu de requetes SQL brutes."
    severity: WARNING
    languages: [typescript]

  - id: no-console-log-pii
    patterns:
      - pattern: |
          console.log(..., $DATA, ...)
      - metavariable-regex:
          metavariable: $DATA
          regex: (email|phone|password|token|userId)
    message: "Eviter de logger des donnees PII. Utiliser le logger structure (Pino)."
    severity: WARNING
    languages: [typescript, javascript]
```

**Plan d'evolution** : si le budget le permet apres le lancement, evaluer CodeQL en complement (pas en remplacement) de Semgrep, execute en mode non-bloquant pour enrichir les rapports de securite.

### 4.2 Dependency scanning : defense en profondeur

Le code IA est particulierement vulnerable aux attaques de supply chain. Trois couches de defense :

#### Couche 1 : Dependabot (deja active, ADR-020)

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "bienbon-team"
    labels:
      - "dependencies"
      - "security"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

#### Couche 2 : npm audit en CI (bloquant)

```bash
npm audit --audit-level=high
```

Si des vulnerabilites de niveau `high` ou `critical` sont detectees, le pipeline est bloque. Les vulnerabilites `moderate` sont loguees mais non bloquantes (trop de faux positifs).

#### Couche 3 : Detection de packages hallucines (CRITIQUE pour code IA)

Script custom qui verifie que chaque dependance dans `package.json` existe reellement sur le registre npm et n'est pas un package fantome cree par un attaquant exploitant le slopsquatting.

```javascript
// scripts/check-phantom-packages.js
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

const suspicious = [];
const phantoms = [];

for (const [name, version] of Object.entries(allDeps)) {
  try {
    const info = JSON.parse(
      execSync(`npm view ${name} --json 2>/dev/null`, { encoding: 'utf8' })
    );

    // Signaux de suspicion pour un package slopsquatting :
    const weeklyDownloads = info.downloads || 0;
    const ageMs = Date.now() - new Date(info.time?.created || 0).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (weeklyDownloads < 100 && ageDays < 90) {
      suspicious.push({
        name,
        version,
        downloads: weeklyDownloads,
        ageDays: Math.round(ageDays),
        reason: 'Package recent avec tres peu de telechargements',
      });
    }
  } catch {
    phantoms.push({ name, version, reason: 'Package introuvable sur npm' });
  }
}

if (phantoms.length > 0) {
  console.error('ERREUR CRITIQUE : packages introuvables sur npm (hallucination IA ?)');
  console.error(JSON.stringify(phantoms, null, 2));
  process.exit(1);
}

if (suspicious.length > 0) {
  console.warn('ATTENTION : packages suspects (possibles slopsquatting)');
  console.warn(JSON.stringify(suspicious, null, 2));
  console.warn('Verifier manuellement avant de merger.');
  // Ne bloque pas le pipeline, mais log un warning visible
}
```

**Equivalent Dart** pour les repos Flutter :

```dart
// scripts/check_phantom_packages.dart
// Verifie que chaque dependance dans pubspec.yaml existe sur pub.dev
import 'dart:convert';
import 'dart:io';
import 'package:yaml/yaml.dart';

void main() async {
  final pubspec = loadYaml(File('pubspec.yaml').readAsStringSync());
  final deps = <String, dynamic>{
    ...?pubspec['dependencies'] as Map?,
    ...?pubspec['dev_dependencies'] as Map?,
  };

  final phantoms = <String>[];

  for (final name in deps.keys) {
    if (name == 'flutter' || name == 'flutter_test' || name == 'flutter_localizations') continue;
    final result = await Process.run('curl', [
      '-s', '-o', '/dev/null', '-w', '%{http_code}',
      'https://pub.dev/api/packages/$name',
    ]);
    if (result.stdout.toString().trim() != '200') {
      phantoms.add(name);
    }
  }

  if (phantoms.isNotEmpty) {
    stderr.writeln('ERREUR : packages introuvables sur pub.dev : $phantoms');
    exit(1);
  }
  stdout.writeln('Toutes les dependances existent sur pub.dev.');
}
```

### 4.3 Secret detection : Gitleaks

#### Options evaluees

| Outil | Detection | Vitesse | Faux positifs | Pre-commit | CI | Prix |
|-------|-----------|---------|---------------|------------|-----|------|
| **Gitleaks** | 1533+ patterns, regex | **Rapide** (< 10s sur un repo moyen) | Modere, configurable | Oui (hook natif) | GitHub Action officielle | Gratuit (OSS) |
| **TruffleHog** | Regex + entropie + verification active | **Lent** (scan profond, historique complet) | Plus eleve | Oui | GitHub Action | Gratuit (OSS) |
| **GitHub Secret Scanning** | Partenariats avec providers (AWS, Stripe, etc.) | Transparent | Tres faible | Non (serveur-side) | Natif GitHub | Gratuit (public), payant (prive avec Advanced Security) |

#### Decision : Gitleaks (en CI et en pre-commit)

**Justification :**

1. **Critique pour code IA** : les agents IA sont connus pour hardcoder des secrets dans le code, meme quand on leur demande de ne pas le faire. La detection de secrets doit etre **la toute premiere etape** du pipeline (avant meme le lint), et aussi en **pre-commit** pour bloquer localement.

2. **Rapidite** : Gitleaks scanne un repo typique en < 10 secondes. TruffleHog est beaucoup plus lent (scan d'entropie, verification active des cles), ce qui n'est pas adapte a un pre-commit hook.

3. **Personnalisation** : Gitleaks permet de configurer des regles custom via `.gitleaks.toml` :

```toml
# .gitleaks.toml
title = "BienBon Gitleaks config"

# Regles supplementaires pour les secrets BienBon
[[rules]]
  id = "peach-payments-key"
  description = "Peach Payments API key"
  regex = '''peach[_-]?payments?[_-]?(api[_-]?key|secret|token)\s*[:=]\s*["']?[A-Za-z0-9+/=]{20,}'''
  tags = ["key", "peach"]

[[rules]]
  id = "supabase-service-key"
  description = "Supabase service role key"
  regex = '''eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'''
  tags = ["key", "supabase", "jwt"]

[[rules]]
  id = "railway-token"
  description = "Railway API token"
  regex = '''railway[_-]?token\s*[:=]\s*["']?[A-Za-z0-9-]{30,}'''
  tags = ["key", "railway"]

# Fichiers a ignorer (faux positifs connus)
[allowlist]
  paths = [
    '''\.env\.example$''',
    '''.*test.*fixture.*''',
    '''.*mock.*''',
  ]
```

4. **Pre-commit + CI** : double protection. Gitleaks en pre-commit bloque le commit localement avant meme qu'il n'atteigne le repo. Gitleaks en CI est le filet de securite si le hook est contourne.

5. **Complement avec GitHub Secret Scanning** : activer GitHub Secret Scanning (gratuit pour les repos publics) en complement. Il detecte les secrets des providers partenaires (AWS, Stripe, Supabase) et les revoque automatiquement quand c'est possible.

### 4.4 License compliance

```bash
npx license-checker --production --failOn "GPL-3.0;AGPL-3.0;SSPL-1.0"
```

Les licences GPL-3.0, AGPL-3.0 et SSPL-1.0 sont bloquantes car elles imposent des obligations de copyleft incompatibles avec un produit commercial. Le pipeline echoue si une dependance utilise ces licences.

### 4.5 Lockfile-lint : integrite du lockfile (ref ADR-022 OWASP supply chain)

Le lockfile (`package-lock.json` ou `pnpm-lock.yaml`) est un vecteur d'attaque supply chain souvent neglige. Un attaquant peut manipuler le lockfile dans une PR pour :

- Remplacer un registre npm officiel par un registre malveillant (`resolved` pointe vers un serveur tiers)
- Modifier les hashes d'integrite (`integrity`) pour accepter un package altere
- Ajouter une dependance non declaree dans `package.json` mais presente dans le lockfile

**lockfile-lint** verifie l'integrite du lockfile en CI :

```bash
npx lockfile-lint --path package-lock.json --type npm --allowed-hosts npm --validate-https --validate-integrity
```

**Regles appliquees :**

| Regle | Effet |
|-------|-------|
| `--allowed-hosts npm` | Tous les packages doivent etre resolus depuis le registre npm officiel (`registry.npmjs.org`). Bloque les registres tiers. |
| `--validate-https` | Toutes les URLs `resolved` doivent utiliser HTTPS. Bloque les URLs HTTP non securisees. |
| `--validate-integrity` | Chaque package doit avoir un hash `integrity` (SHA-512). Bloque les packages sans verification d'integrite. |

**Integration dans le pipeline backend** (ajout dans le job `security-scan`) :

```yaml
      # 4e. Lockfile integrity check
      - name: Lockfile lint
        run: npx lockfile-lint --path package-lock.json --type npm --allowed-hosts npm --validate-https --validate-integrity
```

Ce check est rapide (< 5 secondes) et ajoute une couche de defense critique contre les attaques supply chain documentees dans l'ADR-022 (OWASP A06:2021 - Vulnerable and Outdated Components).

### 4.6 dependency-cruiser : validation des regles d'architecture (ref ADR-024 DDD, ADR-027 SOLID)

dependency-cruiser analyse le graphe de dependances du code source et valide des regles architecturales. C'est un garde-fou automatise pour s'assurer que le code IA respecte les bounded contexts (ADR-024 DDD) et les principes SOLID (ADR-027).

**Regles configurees :**

```javascript
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    // ── Pas de dependances circulaires ──────────
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Les dependances circulaires rendent le code difficile a tester et a refactorer.',
      from: {},
      to: { circular: true },
    },

    // ── Respect des bounded contexts (ADR-024 DDD) ──────────
    {
      name: 'no-cross-bounded-context',
      severity: 'error',
      comment: 'Les modules metier ne doivent pas importer directement depuis un autre bounded context. Utiliser les events ou le module shared.',
      from: { path: '^src/modules/ordering/' },
      to: { path: '^src/modules/(payment|notification|partner)/', pathNot: '^src/modules/shared/' },
    },
    {
      name: 'no-cross-bounded-context-payment',
      severity: 'error',
      from: { path: '^src/modules/payment/' },
      to: { path: '^src/modules/(ordering|notification|partner)/', pathNot: '^src/modules/shared/' },
    },

    // ── Architecture hexagonale : domain ne depend pas de l'infra ──────────
    {
      name: 'domain-no-infra-dependency',
      severity: 'error',
      comment: 'Le domain layer ne doit jamais importer depuis l\'infrastructure (Prisma, Redis, HTTP, etc.).',
      from: { path: '/domain/' },
      to: { path: '/(infrastructure|adapters|prisma|redis)/' },
    },

    // ── Pas d'import direct de node_modules internes ──────────
    {
      name: 'no-orphan-imports',
      severity: 'warn',
      comment: 'Eviter les imports de fichiers orphelins ou non indexes.',
      from: { orphan: true, pathNot: '\\.(spec|test|stories|d)\\.ts$' },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    reporterOptions: {
      dot: { theme: { graph: { rankdir: 'LR' } } },
    },
  },
};
```

**Integration dans le pipeline backend** (ajout dans le job `quality` / Gate 1) :

```yaml
      # Architecture validation
      - name: Validate architecture rules (dependency-cruiser)
        run: npx depcruise --config .dependency-cruiser.cjs --output-type err-long src/
```

**Pourquoi dans Gate 1 (qualite statique) et pas dans Gate 4 (securite) :**
- dependency-cruiser est un outil d'analyse statique du graphe d'imports, pas un outil de securite
- Il est rapide (< 15 secondes sur un projet de taille moyenne)
- Les violations architecturales doivent bloquer la PR au plus tot, avant meme les tests

**Valeur specifique pour le code IA :** les agents IA ont tendance a creer des imports directs entre modules sans respecter les limites architecturales (bounded contexts, layers hexagonaux). dependency-cruiser est le filet de securite automatise qui empeche ces violations de passer en production.

### 4.7 Resume des security gates

```
┌──────────────────────────────────────────────────────────────┐
│                    SECURITY & QUALITY GATES                    │
│                                                               │
│  PRE-COMMIT (local)                                           │
│  ├── Gitleaks (secret detection)                              │
│  ├── lint-staged (ESLint + Prettier)                          │
│  └── Empecher --no-verify                                     │
│                                                               │
│  CI PIPELINE (GitHub Actions) -- sur chaque PR                │
│  ├── Gate 0 : Gitleaks (secrets dans tout l'historique)       │
│  ├── Gate 1 : ESLint strict + type-check                      │
│  ├── Gate 1b : dependency-cruiser (architecture DDD/SOLID)    │
│  ├── Gate 4a : npm audit (vulnerabilites connues)             │
│  ├── Gate 4b : Phantom packages check (slopsquatting)         │
│  ├── Gate 4c : Semgrep SAST (OWASP, custom rules)             │
│  ├── Gate 4d : License compliance                             │
│  ├── Gate 4e : lockfile-lint (integrite du lockfile)           │
│  └── Danger.js (automatisation review PR)                     │
│                                                               │
│  NIGHTLY (cron GitHub Actions)                                │
│  └── Stryker mutation testing (payment, ordering, fraud)      │
│                                                               │
│  POST-MERGE                                                   │
│  ├── Dependabot (mises a jour automatiques)                   │
│  └── GitHub Secret Scanning (revocation automatique)          │
│                                                               │
│  POST-DEPLOY                                                  │
│  ├── Sentry (erreurs runtime)                                 │
│  └── Health checks + rollback auto                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Question 4 : Pre-commit hooks

### 5.1 Configuration Husky + lint-staged

```bash
# Installation
npm install -D husky lint-staged
npx husky init
```

```jsonc
// package.json (racine du monorepo)
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
npx gitleaks protect --staged --verbose
npx lint-staged
```

```bash
# .husky/commit-msg
npx --no-install commitlint --edit "$1"
```

### 5.2 Empecher le bypass `--no-verify`

**Probleme** : un agent IA ou un humain presse peut utiliser `git commit --no-verify` pour contourner les hooks.

**Solutions :**

1. **Branch protection GitHub** (section 7) : meme si le hook local est bypass, la CI en amont rejectera le commit. C'est le vrai garde-fou.

2. **Documentation et convention** : le CLAUDE.md du repo inclura une instruction explicite :

```markdown
## Regles absolues
- NE JAMAIS utiliser `--no-verify` sur les commits
- NE JAMAIS hardcoder de secrets, tokens, cles API ou mots de passe
- TOUJOURS utiliser les variables d'environnement pour les configurations sensibles
```

3. **Monitoring** : un check CI peut detecter les commits sans hooks executes (en verifiant si le message suit le format commitlint).

### 5.3 Configuration pour les repos Flutter

Les repos Flutter utilisent un `Makefile` ou un script `pre-commit` equivalent :

```bash
# .husky/pre-commit (repos Flutter)
# Secret detection
gitleaks protect --staged --verbose

# Format check
dart format --set-exit-if-changed $(git diff --cached --name-only --diff-filter=ACMR | grep '\.dart$' || true)

# Analyze
flutter analyze --fatal-infos
```

---

## 6. Question 5 : Branch protection et workflow Git

### 6.1 Strategie de branching : Trunk-Based Development simplifie

#### Options evaluees

| Strategie | Complexite | Ideal pour | Inconvenients |
|-----------|------------|-----------|---------------|
| **GitFlow** | Elevee | Grandes equipes, releases planifiees | Branches `develop`, `release`, `hotfix` -- trop lourd pour 2-5 devs + IA |
| **GitHub Flow** | Faible | Equipes petites/moyennes, deploy continu | Branches feature + PR vers main. Simple mais pas de notion de release |
| **Trunk-Based** | Tres faible | Equipes petites, CI/CD mature | Tout sur main, feature flags si necessaire |

#### Decision : GitHub Flow (trunk-based simplifie)

```
main (protegee)          feature/xxx (courte duree)
  │                           │
  │──────── branch ──────────>│
  │                           │ (commits de l'agent IA)
  │                           │ (CI automatique sur PR)
  │<──────── PR ─────────────│
  │  (review + CI verts)      │
  │                           │ (supprimee apres merge)
  │──── deploy auto ────────>│ Railway / Cloudflare
```

**Regles :**

1. **`main` est toujours deployable** : chaque merge sur main declenche un deploiement automatique.
2. **Branches feature** : nommage `feature/xxx`, `fix/xxx`, `chore/xxx`. Duree de vie courte (< 1 semaine idealement, < 3 jours en cible).
3. **PR obligatoire** : pas de push direct sur main.
4. **Squash merge** : les commits intermediaires de l'agent IA (souvent nombreux et verbeux) sont squashes en un commit propre par PR.
5. **Delete branch on merge** : nettoyage automatique.

### 6.2 Branch protection rules

```yaml
# Regles de protection pour la branche main (a configurer dans GitHub Settings)

branch: main

protection_rules:
  # Pas de push direct
  require_pull_request: true
  required_approving_reviews: 1        # Au moins 1 approbation humaine
  dismiss_stale_reviews: true          # Re-review si nouveaux commits

  # Checks CI obligatoires
  require_status_checks: true
  strict_status_checks: true            # La branche doit etre a jour avec main
  required_checks:
    - "secrets-scan"
    - "lint-typecheck"
    - "unit-tests"
    - "integration-tests"
    - "security-scan"
    - "build"

  # Restrictions
  require_linear_history: true          # Squash merge only
  allow_force_push: false               # JAMAIS de force push sur main
  allow_deletions: false                # Pas de suppression de main
  require_signed_commits: false         # Pas necessaire au lancement

  # Conversations
  require_conversation_resolution: true # Tous les commentaires PR resolus
```

### 6.3 Qui review les PR ?

**Phase 1 (lancement) : review humaine obligatoire.**

Chaque PR doit etre approuvee par au moins 1 humain de l'equipe. Le reviewer verifie :
- Les cas de test couvrent les edge cases (pas de tests "miroir" triviaux)
- Pas de secrets hardcodes
- Le code suit les conventions du projet
- La logique metier est correcte (l'IA peut mal interpreter les specs)

**Phase 2 (si l'equipe s'agrandit) : review IA en complement.**

Ajouter un bot de review IA (CodeRabbit, Copilot PR review) comme **premier reviewer**. Le bot laisse des commentaires automatiques. Un humain valide ensuite. Le bot ne remplace pas la review humaine, il l'accelere.

**A ne JAMAIS faire :** permettre a l'agent IA qui a ecrit le code de "valider" sa propre PR automatiquement. Le reviewer (humain ou bot IA different) doit etre distinct de l'auteur.

### 6.4 Danger.js : automatisation des revues de PR

Danger.js est un outil qui s'execute dans le CI sur chaque PR et poste des commentaires automatiques pour signaler des problemes recurrents. Il automatise les verifications que le reviewer humain oublie souvent, et est particulierement utile avec du code genere par IA.

**Installation :**

```bash
npm install -D danger
```

**Configuration (`dangerfile.ts`) :**

```typescript
// dangerfile.ts
import { danger, fail, warn, message, markdown } from 'danger';

const modifiedFiles = danger.git.modified_files;
const createdFiles = danger.git.created_files;
const allFiles = [...modifiedFiles, ...createdFiles];
const prBody = danger.github.pr.body;

// ── 1. Migrations Prisma : rollback obligatoire ──────────
const hasPrismaMigration = allFiles.some((f) =>
  f.startsWith('prisma/migrations/')
);
const hasRollbackDoc = allFiles.some(
  (f) => f.includes('rollback') || f.includes('down.sql')
);

if (hasPrismaMigration && !hasRollbackDoc) {
  fail(
    'Cette PR contient une migration Prisma mais pas de plan de rollback. ' +
    'Ajouter un fichier `down.sql` ou documenter la procedure de rollback ' +
    'dans la description de la PR. (ref ADR-025, section 7.5)'
  );
}

// ── 2. Nouveaux endpoints : tests requis ──────────
const newControllerFiles = createdFiles.filter((f) =>
  f.match(/\.controller\.ts$/)
);
const newTestFiles = createdFiles.filter((f) =>
  f.match(/\.(spec|test)\.ts$/)
);

if (newControllerFiles.length > 0 && newTestFiles.length === 0) {
  fail(
    'Cette PR ajoute un nouveau controller mais aucun fichier de test. ' +
    'Chaque endpoint doit avoir des tests unitaires et/ou d\'integration. ' +
    '(ref ADR-023, strategie tests)'
  );
}

// ── 3. Couverture de tests : ne pas baisser ──────────
// Note : ce check depend de l'integration avec le reporter de coverage
// (vitest coverage reporter ou codecov). Le check est informatif ici.
if (prBody && !prBody.includes('coverage')) {
  warn(
    'La description de la PR ne mentionne pas la couverture de tests. ' +
    'Verifier que la couverture ne baisse pas (seuil : 80% lignes, 70% branches).'
  );
}

// ── 4. Fichiers volumineux (code IA verbeux) ──────────
const bigPR = danger.github.pr.additions + danger.github.pr.deletions > 1000;
if (bigPR) {
  warn(
    `Cette PR est volumineuse (${danger.github.pr.additions} ajouts, ` +
    `${danger.github.pr.deletions} suppressions). ` +
    'Envisager de la decouper en PRs plus petites pour faciliter la review.'
  );
}

// ── 5. Package.json modifie : verifier les nouvelles deps ──────────
const packageChanged = modifiedFiles.includes('package.json');
if (packageChanged) {
  warn(
    '`package.json` a ete modifie. Verifier que les nouvelles dependances ' +
    'ne sont pas des packages hallucines par l\'IA (slopsquatting). ' +
    'Le script `check-phantom-packages.js` en CI validera automatiquement.'
  );
}

// ── 6. Fichiers sensibles modifies ──────────
const sensitiveFiles = allFiles.filter((f) =>
  f.match(/\.(env|pem|key|cert|secret)/) ||
  f.includes('credentials') ||
  f.includes('.gitleaks')
);
if (sensitiveFiles.length > 0) {
  fail(
    'Cette PR modifie des fichiers potentiellement sensibles : ' +
    sensitiveFiles.join(', ') + '. Review de securite obligatoire.'
  );
}

// ── 7. Message informatif ──────────
message('Revue automatisee par Danger.js. Les checks manuels restent necessaires.');
```

**Integration dans le pipeline backend** (nouveau job dans le workflow) :

```yaml
  # ── Danger.js PR review ──────────────
  danger:
    name: Danger.js PR Review
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npx danger ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Pourquoi Danger.js plutot qu'un script bash custom :**
- Danger.js poste des **commentaires directement sur la PR** (fail = bloquant, warn = informatif), visibles dans l'interface GitHub
- Le `dangerfile.ts` est versionne avec le code, donc les regles evoluent avec le projet
- Ecosysteme de plugins (danger-plugin-coverage, danger-plugin-lint, etc.)
- Support natif de GitHub Actions, GitLab CI, CircleCI, etc.

---

## 7. Question 6 : Deploiement

### 7.1 Backend NestJS -- Railway

```
PR merge sur main
       │
       v
  GitHub Actions CI
  (lint, test, security, build)
       │ Tous les checks verts
       v
  Railway auto-deploy
  (detecte le push sur main, construit et deploie)
       │
       v
  Healthcheck Railway
  (GET /health → 200 OK en < 30s)
       │
       ├── OK → nouveau container actif, ancien arrete
       └── KO → rollback automatique vers la version precedente
```

**Configuration Railway :**

```
# railway.toml (racine du service backend)
[build]
  builder = "nixpacks"

[deploy]
  healthcheckPath = "/health"
  healthcheckTimeout = 30
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 3
```

**Railway "Wait for CI"** : activer l'option dans les settings Railway pour que le deploy ne se declenche que quand tous les checks GitHub Actions sont verts. Cela evite un deploy sur un push qui n'a pas passe le CI.

### 7.2 Admin React + Site vitrine -- Cloudflare Pages

```
PR merge sur main
       │
       v
  GitHub Actions CI (lint, test, build)
       │ Check vert
       v
  Cloudflare Pages auto-deploy (detecte le push)
       │
       v
  Preview URL (sur les PR)
  Production URL (sur merge dans main)
```

Cloudflare Pages est connecte au repo GitHub et deploie automatiquement. Les PR obtiennent une preview URL pour validation visuelle.

### 7.3 Apps Flutter -- Strategy de release

#### Build et distribution

| Etape | Outil | Justification |
|-------|-------|---------------|
| Build Android (APK/AAB) | GitHub Actions (ubuntu runner) | Gratuit, 2000 min/mois suffisent |
| Build iOS (IPA) | **Codemagic** | Les macOS runners GitHub Actions coutent 10x le prix Linux. Codemagic offre 500 min/mois gratuites sur macOS avec des outils Flutter pre-configures. |
| Signing Android | GitHub Actions + keystore dans Secrets | Standard, simple |
| Signing iOS | Codemagic (code signing automatique) | Gere les certificats Apple, provisioning profiles. Evite la douleur de `fastlane match`. |
| Distribution beta | Firebase App Distribution | Gratuit, installation simple, feedback in-app |
| Publication stores | **Fastlane** (via Codemagic ou GitHub Actions) | Automatise le upload vers Google Play et App Store Connect |

**Pourquoi Codemagic pour iOS plutot que GitHub Actions :**

1. **Cout** : les macOS runners GitHub Actions coutent 10x les Linux runners (1 minute macOS = 10 minutes du quota). Avec 2000 min/mois gratuites, un build iOS de 15 minutes consomme 150 minutes du quota. Codemagic offre 500 min/mois gratuites sur macOS M2 dediees au mobile.

2. **Flutter-first** : Codemagic est optimise pour Flutter avec des workflows preconfigures, le code signing Apple simplifie, et des integrations natives avec les stores.

3. **GitHub Actions pour Android** : les builds Android tournent sur ubuntu-latest (pas de surcout) et sont plus rapides (~5-8 min).

#### Workflow de release Flutter

```
feature/xxx
     │
     v
  PR → CI (analyze, test, build APK debug)
     │
     v merge
  main
     │
     v
  CI (analyze, test, security)
     │
     v
  Build APK/AAB release (GitHub Actions)
  Build IPA release (Codemagic)
     │
     v
  Firebase App Distribution (beta)
     │
     v (apres validation equipe)
  Tag vX.Y.Z
     │
     v
  Fastlane → Google Play (production)
  Fastlane → App Store Connect (TestFlight → production)
```

### 7.4 Rollback strategy

| Composant | Strategie de rollback | RTO (temps de restauration) |
|-----------|----------------------|----------------------------|
| **Backend NestJS** | Railway rollback (1 clic dans le dashboard ou `railway rollback` en CLI). Railway garde les 10 derniers deployments. | < 2 min |
| **Admin React** | Cloudflare Pages rollback (1 clic, rollback vers un deployment precedent) | < 1 min |
| **Site vitrine** | Idem Cloudflare Pages | < 1 min |
| **Flutter apps** | Pas de rollback instantane (les apps sont sur les devices utilisateurs). Mitigation : feature flags (RemoteConfig Firebase) pour desactiver une feature sans republier. En cas de bug critique : hotfix + expedited review Apple/Google. | 2-24h (review store) |
| **Base de donnees** | Prisma Migrate down (rollback de migration). En cas de corruption : restauration Supabase backup (daily, 7 jours de retention). | 5-30 min |

### 7.5 Database migrations en CI

```yaml
# Les migrations Prisma sont executees comme etape de pre-deploy
# JAMAIS en meme temps que le deploy applicatif

migration:
  steps:
    # 1. Verifier que la migration est backward-compatible
    - run: npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-migrations prisma/migrations --exit-code

    # 2. Appliquer la migration sur la DB de staging d'abord
    - run: npx prisma migrate deploy
      env:
        DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

    # 3. Verifier que l'app fonctionne avec le nouveau schema
    # (tests d'integration)

    # 4. Appliquer la migration sur la DB de production
    - run: npx prisma migrate deploy
      env:
        DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
```

**Regle pour les migrations IA** : toute migration generee par un agent IA doit etre **additive uniquement** (ajouter des colonnes/tables, pas en supprimer ou renommer). Les migrations destructives necessitent une review humaine explicite et un plan de rollback documente.

---

## 8. Question 7 : Monitoring post-deploy

### 8.1 Health checks

```typescript
// backend: src/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
      },
    };

    const allHealthy = Object.values(checks.checks).every(
      (c) => c.status === 'ok'
    );

    if (!allHealthy) {
      throw new ServiceUnavailableException(checks);
    }

    return checks;
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  private async checkRedis() {
    try {
      await this.redis.ping();
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}
```

### 8.2 Sentry release tracking

```yaml
# Etape post-deploy dans le CI
- name: Sentry release
  uses: getsentry/action-release@v3
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: bienbon
    SENTRY_PROJECT: backend
  with:
    environment: production
    version: ${{ github.sha }}
    set_commits: auto
```

Configuration Sentry pour le rollback automatique :

- **Alerte "regression"** : si le taux d'erreur augmente de > 200% dans les 10 minutes suivant un deploy, Sentry envoie une alerte critique.
- **Action** : l'alerte Sentry declenche un webhook qui execute `railway rollback` via un GitHub Actions workflow dispatch.

```yaml
# .github/workflows/auto-rollback.yml
name: Auto Rollback on Sentry Alert

on:
  repository_dispatch:
    types: [sentry-alert-critical]

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Rollback Railway
        run: |
          npm install -g @railway/cli
          railway login --token ${{ secrets.RAILWAY_TOKEN }}
          railway rollback --service ${{ secrets.RAILWAY_SERVICE_ID }}
      - name: Notify team
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "ROLLBACK AUTOMATIQUE execute sur le backend. Taux d'erreur critique detecte par Sentry. Verifier immediatement."
            }
```

### 8.3 Stack de monitoring post-deploy (rappel ADR-020)

| Couche | Outil | Seuil d'alerte |
|--------|-------|----------------|
| **Erreurs runtime** | Sentry | Nouvelle erreur non vue, ou regression > 200% post-deploy |
| **Uptime** | UptimeRobot | Endpoint `/health` ne repond pas 200 pendant 2 checks consecutifs (10 min) |
| **Latence API** | Grafana Cloud (metriques Prometheus) | p95 > 1s pendant 5 min |
| **Taux d'erreur HTTP** | Grafana Cloud | > 5% de reponses 5xx pendant 5 min |
| **Queue BullMQ** | Grafana Cloud (metriques Bull) | > 100 jobs en attente pendant 10 min, ou > 10 jobs failed en 5 min |
| **DB connexions** | Grafana Cloud | > 80% du pool de connexions utilise |

---

## 9. Question 8 : Caching et performance CI

### 9.1 Strategie de cache GitHub Actions

```yaml
# Cache npm (tous les workflows Node.js)
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: npm                       # Cache automatique de ~/.npm

# Cache Flutter SDK + pub cache
- uses: subosito/flutter-action@v2
  with:
    flutter-version: '3.x'
    channel: stable
    cache: true                      # Cache le Flutter SDK + pub cache

# Cache Gradle (builds Android)
- uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
    key: gradle-${{ runner.os }}-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
    restore-keys: gradle-${{ runner.os }}-

# Cache CocoaPods (builds iOS)
- uses: actions/cache@v4
  with:
    path: ios/Pods
    key: pods-${{ runner.os }}-${{ hashFiles('ios/Podfile.lock') }}

# Cache Prisma engine (evite le telechargement de ~40 MB a chaque CI)
- uses: actions/cache@v4
  with:
    path: node_modules/.prisma
    key: prisma-${{ runner.os }}-${{ hashFiles('prisma/schema.prisma') }}
```

### 9.2 Temps de build cibles

| Pipeline | Cible | Budget max | Notes |
|----------|-------|-----------|-------|
| **Backend NestJS** (PR) | 6-8 min | 10 min | lint + type-check + tests + security + build |
| **Backend NestJS** (deploy) | 8-10 min | 12 min | CI complete + deploy Railway |
| **Flutter (PR, Android only)** | 5-8 min | 10 min | analyze + tests + build APK debug |
| **Flutter (release, Android)** | 8-12 min | 15 min | CI + build APK/AAB release |
| **Flutter (release, iOS)** | 12-18 min | 25 min | Sur Codemagic (macOS M2) |
| **React Admin (PR)** | 3-5 min | 8 min | lint + type-check + tests + build |
| **Astro vitrine** | 2-3 min | 5 min | lint + build |

### 9.3 Estimation de consommation GitHub Actions

**Quotas gratuits (plan GitHub Free pour repos prives) :**
- 2 000 minutes Linux/mois
- macOS : 10x le cout (1 min macOS = 10 min du quota)

**Estimation d'usage mensuel (equipe de 3 devs, ~60 PR/mois) :**

| Pipeline | Executions/mois | Min/execution (Linux) | Total min |
|----------|-----------------|----------------------|-----------|
| Backend CI (PR) | 60 | 8 | 480 |
| Backend CI (deploy) | 30 | 10 | 300 |
| React Admin CI | 20 | 5 | 100 |
| Astro vitrine CI | 10 | 3 | 30 |
| Flutter Android CI (PR) | 40 | 8 | 320 |
| Flutter Android release | 8 | 12 | 96 |
| Dependabot CI | 20 | 5 | 100 |
| **Total Linux** | | | **~1 426 min** |

**Flutter iOS** : build sur Codemagic (500 min gratuites/mois). Estimation : 8 releases/mois x 18 min = 144 min.

**Conclusion** : le free tier GitHub Actions (2 000 min) est suffisant au lancement. Le build iOS est decharge sur Codemagic pour ne pas consommer le quota macOS (qui coute 10x).

---

## 9bis. Pipeline nightly : Stryker mutation testing (ref ADR-023)

### Contexte

L'ADR-023 (strategie tests) mentionne Stryker pour le mutation testing sur les modules critiques. Le mutation testing est trop lent pour le pipeline CI classique (10-30 minutes selon la taille du module), mais il est essentiel pour valider que les tests ecrits par l'IA ne sont pas de simples "tests miroirs" qui passent toujours.

**Principe du mutation testing :** Stryker modifie le code source (mutations : changer `>` en `>=`, remplacer `true` par `false`, supprimer des lignes, etc.) et re-execute les tests. Si un test ne detecte pas la mutation (le mutant "survit"), cela signifie que le test est faible ou absent pour ce cas. Le **mutation score** mesure le pourcentage de mutants tues.

### Modules cibles

Seuls les modules critiques sont testes en mutation (le mutation testing complet sur tout le codebase est prohibitivement lent) :

| Module | Justification | Seuil mutation score |
|--------|---------------|---------------------|
| `src/modules/payment/` | Logique financiere : erreur = perte d'argent | >= 80% |
| `src/modules/ordering/` | Logique de reservation : erreur = commande perdue | >= 75% |
| `src/modules/fraud/` | Detection de fraude : erreur = fraude non detectee | >= 80% |

### Configuration Stryker

```javascript
// stryker.config.mjs
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    'src/modules/payment/**/*.ts',
    '!src/modules/payment/**/*.spec.ts',
    '!src/modules/payment/**/*.test.ts',
    'src/modules/ordering/**/*.ts',
    '!src/modules/ordering/**/*.spec.ts',
    '!src/modules/ordering/**/*.test.ts',
    'src/modules/fraud/**/*.ts',
    '!src/modules/fraud/**/*.spec.ts',
    '!src/modules/fraud/**/*.test.ts',
  ],
  testRunner: 'vitest',
  reporters: ['html', 'json', 'clear-text'],
  thresholds: {
    high: 80,
    low: 60,
    break: 60,  // Le pipeline echoue si le mutation score est < 60%
  },
  concurrency: 4,
  timeoutMS: 30000,
};
```

### Workflow GitHub Actions nightly

```yaml
# .github/workflows/mutation-testing.yml
name: Mutation Testing (Stryker)

on:
  schedule:
    # Chaque nuit a 3h00 UTC (7h00 heure Maurice)
    - cron: '0 3 * * *'
  workflow_dispatch:       # Permet le declenchement manuel

concurrency:
  group: mutation-testing
  cancel-in-progress: true

env:
  NODE_VERSION: '22'

jobs:
  stryker:
    name: Stryker Mutation Testing
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: bienbon_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/bienbon_test
      REDIS_URL: redis://localhost:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npx prisma migrate deploy

      - name: Run Stryker
        run: npx stryker run
        continue-on-error: true
        id: stryker

      - name: Parse Stryker results
        id: results
        run: |
          if [ -f reports/mutation/mutation.json ]; then
            SCORE=$(node -e "
              const report = require('./reports/mutation/mutation.json');
              const killed = report.schemaVersion ? report.files : {};
              let totalMutants = 0, killedMutants = 0;
              for (const file of Object.values(killed)) {
                for (const mutant of file.mutants || []) {
                  totalMutants++;
                  if (mutant.status === 'Killed' || mutant.status === 'Timeout') killedMutants++;
                }
              }
              const score = totalMutants > 0 ? Math.round((killedMutants / totalMutants) * 100) : 0;
              console.log(score);
            ")
            echo "score=$SCORE" >> $GITHUB_OUTPUT
            echo "Mutation score: $SCORE%"
          else
            echo "score=N/A" >> $GITHUB_OUTPUT
            echo "No Stryker report found"
          fi

      - name: Post results to tracking issue
        uses: actions/github-script@v7
        with:
          script: |
            const issueNumber = 1;  // Issue GitHub dediee au suivi mutation testing
            const score = '${{ steps.results.outputs.score }}';
            const status = '${{ steps.stryker.outcome }}';
            const date = new Date().toISOString().split('T')[0];
            const runUrl = `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`;

            const body = [
              `## Rapport Stryker -- ${date}`,
              '',
              `| Metrique | Valeur |`,
              `|----------|--------|`,
              `| **Mutation score** | ${score}% |`,
              `| **Statut** | ${status === 'success' ? 'OK' : 'ATTENTION : seuil non atteint'} |`,
              `| **Run CI** | [Voir les details](${runUrl}) |`,
              '',
              status !== 'success'
                ? '> **Action requise** : le mutation score est en dessous du seuil. Des tests doivent etre renforces sur les modules critiques (payment, ordering, fraud).'
                : '> Tous les seuils de mutation score sont respectes.',
              '',
              '---',
            ].join('\n');

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: issueNumber,
              body: body,
            });

      - name: Upload Stryker HTML report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: stryker-report-${{ github.run_number }}
          path: reports/mutation/
          retention-days: 30
```

### Fonctionnement

1. **Declenchement** : le pipeline s'execute chaque nuit a 3h00 UTC (7h00 heure de Maurice, avant l'arrivee de l'equipe) via un cron GitHub Actions. Il peut aussi etre declenche manuellement via `workflow_dispatch`.

2. **Execution** : Stryker mute le code des 3 modules critiques et re-execute les tests Vitest. Duree estimee : 15-30 minutes.

3. **Reporting** : les resultats (mutation score par module, mutants survivants) sont postes comme commentaire sur une **issue GitHub dediee** (ex: issue #1 "Suivi mutation testing"). Cela cree un historique consultable du mutation score au fil du temps.

4. **Artefact** : le rapport HTML detaille de Stryker est uploade comme artefact du workflow, consultable pendant 30 jours.

5. **Alerte** : si le mutation score tombe en dessous de 60%, le commentaire inclut un avertissement "Action requise". L'equipe revoit les mutants survivants et renforce les tests.

### Estimation de consommation

- ~20-30 minutes par execution nightly
- 30 jours x 25 min = ~750 min/mois
- Impact sur le quota GitHub Actions : significatif. Si le quota de 2 000 min est serre, reduire la frequence a 3 fois par semaine (`cron: '0 3 * * 1,3,5'`) ou executer uniquement sur `workflow_dispatch`.

---

## 10. Diagramme du pipeline CI/CD complet

```
                           ┌─────────────────────────────┐
                           │     Developpeur + Agent IA   │
                           │     (Claude Code)            │
                           └──────────────┬──────────────┘
                                          │ git commit
                                          │
                            ┌─────────────v──────────────┐
                            │      PRE-COMMIT HOOKS       │
                            │  ┌────────────────────────┐ │
                            │  │ 1. Gitleaks (secrets)  │ │
                            │  │ 2. lint-staged         │ │
                            │  │    (ESLint + Prettier) │ │
                            │  │ 3. commitlint          │ │
                            │  └────────────────────────┘ │
                            └─────────────┬──────────────┘
                                          │ git push
                                          │
                            ┌─────────────v──────────────┐
                            │     GITHUB (Pull Request)    │
                            │  Branch protection rules     │
                            │  - 1 review humaine requise  │
                            │  - All checks must pass      │
                            └─────────────┬──────────────┘
                                          │
                    ┌─────────────────────┼──────────────────────┐
                    │                     │                      │
         ┌──────── v ────────┐  ┌─────── v ────────┐  ┌─────── v ────────┐
         │ MONOREPO NODE.JS  │  │ FLUTTER CONSUMER │  │ FLUTTER PARTNER  │
         │ (backend/admin/   │  │                  │  │                  │
         │  vitrine)         │  │                  │  │                  │
         └──────── ┬ ────────┘  └─────── ┬ ────────┘  └─────── ┬ ────────┘
                   │                     │                      │
    ┌──────────────┼──────────────────── ┼ ─────────────────── ┼──────┐
    │              │   GITHUB ACTIONS    │                      │      │
    │   ┌──────────v──────────┐  ┌──────v──────────┐  ┌───────v──┐   │
    │   │ Gate 0: Gitleaks    │  │ Gate 0: Gitleaks │  │ Gitleaks │   │
    │   └──────────┬──────────┘  └──────┬──────────┘  └───────┬──┘   │
    │   ┌──────────v──────────┐  ┌──────v──────────┐  ┌───────v──┐   │
    │   │ Gate 1: Lint+Types  │  │ analyze+format  │  │ analyze  │   │
    │   └──────────┬──────────┘  └──────┬──────────┘  └───────┬──┘   │
    │              │                     │                      │      │
    │   ┌──────────┼──────────┐         │                      │      │
    │   │          │          │  ┌──────v──────────┐  ┌───────v──┐   │
    │   │  ┌───── v ─────┐   │  │ unit+widget     │  │ tests    │   │
    │   │  │ Unit tests  │   │  │ tests            │  │          │   │
    │   │  └─────────────┘   │  └──────┬──────────┘  └───────┬──┘   │
    │   │  ┌─────────────┐   │         │                      │      │
    │   │  │ Integ tests │   │  ┌──────v──────────┐  ┌───────v──┐   │
    │   │  │ (PG+Redis)  │   │  │ security scan   │  │ security │   │
    │   │  └─────────────┘   │  └──────┬──────────┘  └───────┬──┘   │
    │   │  ┌─────────────┐   │         │                      │      │
    │   │  │ Security    │   │  ┌──────v──────────┐  ┌───────v──┐   │
    │   │  │ (Semgrep+   │   │  │ Build APK/AAB   │  │ Build    │   │
    │   │  │  npm audit+ │   │  │ (GitHub Actions) │  │ APK/AAB  │   │
    │   │  │  phantom)   │   │  └──────┬──────────┘  └───────┬──┘   │
    │   │  └─────────────┘   │         │                      │      │
    │   └──────────┬──────────┘        │                      │      │
    │   ┌──────────v──────────┐        │                      │      │
    │   │ Build               │        │                      │      │
    │   └──────────┬──────────┘        │                      │      │
    └──────────────┼───────────────────┼──────────────────────┼──────┘
                   │                   │                      │
    ┌──────────────v──────┐   ┌────────v───────┐   ┌─────────v──────┐
    │ DEPLOY              │   │ DEPLOY         │   │ DEPLOY         │
    │                     │   │                │   │                │
    │ Backend → Railway   │   │ Beta →         │   │ Beta →         │
    │ Admin → CF Pages    │   │ Firebase App   │   │ Firebase App   │
    │ Vitrine → CF Pages  │   │ Distribution   │   │ Distribution   │
    └──────────┬──────────┘   │                │   │                │
               │              │ Release →      │   │ Release →      │
    ┌──────────v──────────┐   │ Codemagic(iOS) │   │ Codemagic(iOS) │
    │ POST-DEPLOY         │   │ + Fastlane     │   │ + Fastlane     │
    │                     │   │ → Stores       │   │ → Stores       │
    │ Health check        │   └────────────────┘   └────────────────┘
    │ Sentry release      │
    │ UptimeRobot ping    │
    │ Rollback auto si KO │
    └─────────────────────┘
```

---

## 11. Liste des outils par etape

| Etape | Outil | Type | Prix |
|-------|-------|------|------|
| **Monorepo management** | npm workspaces | Built-in | Gratuit |
| **Pre-commit hooks** | Husky + lint-staged | OSS | Gratuit |
| **Commit messages** | Commitlint (Conventional Commits) | OSS | Gratuit |
| **Secret detection** | Gitleaks | OSS | Gratuit |
| **Linting TS** | ESLint + typescript-eslint (strict) | OSS | Gratuit |
| **Linting Dart** | `flutter analyze` + `dart format` | Built-in | Gratuit |
| **Type-checking** | TypeScript compiler (`tsc --noEmit`) | OSS | Gratuit |
| **Tests backend** | Vitest (unit + integration) | OSS | Gratuit |
| **Tests Flutter** | flutter_test (unit + widget) | Built-in | Gratuit |
| **Tests React** | Vitest + Storybook test runner | OSS | Gratuit |
| **Mutation testing** | Stryker (modules critiques) | OSS | Gratuit |
| **SAST** | Semgrep (OSS) | OSS | Gratuit |
| **Dependency audit** | npm audit + Dependabot | Built-in/GitHub | Gratuit |
| **Phantom packages** | Script custom (check-phantom-packages) | Custom | Gratuit |
| **License compliance** | license-checker | OSS | Gratuit |
| **Lockfile integrity** | lockfile-lint | OSS | Gratuit |
| **Architecture validation** | dependency-cruiser | OSS | Gratuit |
| **PR review automation** | Danger.js | OSS | Gratuit |
| **Visual regression** | Chromatic (Storybook) | SaaS | Gratuit (5K snapshots/mois) |
| **CI/CD orchestration** | GitHub Actions | SaaS | Gratuit (2000 min/mois) |
| **Build iOS** | Codemagic | SaaS | Gratuit (500 min/mois) |
| **Store deployment** | Fastlane | OSS | Gratuit |
| **Beta distribution** | Firebase App Distribution | SaaS | Gratuit |
| **Backend deploy** | Railway (auto-deploy + CLI) | PaaS | Inclus dans Railway |
| **Static deploy** | Cloudflare Pages + Wrangler | SaaS | Gratuit |
| **Error tracking** | Sentry (release tracking) | SaaS | Gratuit (5K events/mois) |
| **Uptime monitoring** | UptimeRobot | SaaS | Gratuit (50 monitors) |
| **Logs + metriques** | Grafana Cloud | SaaS | Gratuit (50 GB/mois) |
| **Alerting** | Sentry + Grafana + UptimeRobot | SaaS | Gratuit |

---

## 12. Templates GitHub Actions

### 12.1 Backend NestJS complet

```yaml
# .github/workflows/backend.yml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'apps/backend/**'
      - 'packages/**'
      - 'prisma/**'
      - '.github/workflows/backend.yml'
  pull_request:
    branches: [main]
    paths:
      - 'apps/backend/**'
      - 'packages/**'
      - 'prisma/**'

concurrency:
  group: backend-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '22'

jobs:
  # ── Secret scan ─────────────────────────
  secrets:
    name: Secret Detection
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ── Lint + Type-check ───────────────────
  quality:
    name: Lint & Type Check
    needs: secrets
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npx prisma validate

  # ── Unit tests ──────────────────────────
  unit-tests:
    name: Unit Tests
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npx vitest run --coverage --reporter=default --reporter=github-actions
      - name: Check coverage thresholds
        run: |
          npx vitest run --coverage --coverage.thresholds.lines=80 --coverage.thresholds.branches=70

  # ── Integration tests ──────────────────
  integration-tests:
    name: Integration Tests
    needs: quality
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: bienbon_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/bienbon_test
      REDIS_URL: redis://localhost:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - uses: actions/cache@v4
        with:
          path: node_modules/.prisma
          key: prisma-${{ runner.os }}-${{ hashFiles('prisma/schema.prisma') }}
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npx vitest run --config vitest.integration.config.ts

  # ── Security scan ───────────────────────
  security:
    name: Security Scan
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci

      - name: npm audit
        run: npm audit --audit-level=high

      - name: Check phantom packages
        run: node scripts/check-phantom-packages.js

      - name: Semgrep SAST
        uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/typescript
            p/nodejs
            p/owasp-top-ten
            p/jwt
            p/sql-injection
            .semgrep/

      - name: License compliance
        run: npx license-checker --production --failOn "GPL-3.0;AGPL-3.0;SSPL-1.0"

  # ── Build ───────────────────────────────
  build:
    name: Build
    needs: [unit-tests, integration-tests, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm
      - run: npm ci
      - run: npm run build

  # ── Deploy ──────────────────────────────
  deploy:
    name: Deploy to Railway
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: railwayapp/railway-action@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}

      - name: Sentry release
        uses: getsentry/action-release@v3
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: bienbon
          SENTRY_PROJECT: backend
        with:
          environment: production
          version: ${{ github.sha }}
          set_commits: auto

      - name: Wait for health check
        run: |
          for i in $(seq 1 30); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.bienbon.mu/health || true)
            if [ "$STATUS" = "200" ]; then
              echo "Health check passed"
              exit 0
            fi
            echo "Attempt $i/30 - Status: $STATUS - Waiting..."
            sleep 10
          done
          echo "Health check failed after 5 minutes"
          exit 1
```

### 12.2 Flutter (consumer/partner)

```yaml
# .github/workflows/flutter-ci.yml
name: Flutter CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: flutter-${{ github.ref }}
  cancel-in-progress: true

jobs:
  secrets:
    name: Secret Detection
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  analyze:
    name: Analyze & Format
    needs: secrets
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable
          cache: true
      - run: flutter pub get
      - run: dart format --set-exit-if-changed .
      - run: flutter analyze --fatal-infos

  test:
    name: Tests
    needs: analyze
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable
          cache: true
      - run: flutter pub get
      - run: flutter test --coverage
      - name: Check coverage
        run: |
          # Parse lcov et verifier > 80%
          TOTAL=$(grep -c "DA:" coverage/lcov.info || echo 0)
          HIT=$(grep "DA:" coverage/lcov.info | grep -v ",0$" | wc -l || echo 0)
          if [ "$TOTAL" -gt 0 ]; then
            PCT=$((HIT * 100 / TOTAL))
            echo "Coverage: $PCT%"
            if [ "$PCT" -lt 80 ]; then
              echo "Coverage $PCT% is below threshold of 80%"
              exit 1
            fi
          fi

  security:
    name: Security
    needs: analyze
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable
          cache: true
      - run: flutter pub get
      - name: Check phantom packages
        run: dart run scripts/check_phantom_packages.dart
      - uses: semgrep/semgrep-action@v1
        with:
          config: p/dart

  build-android:
    name: Build Android
    needs: [test, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: stable
          cache: true
      - uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: gradle-${{ runner.os }}-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
      - run: flutter pub get
      - run: flutter build apk --release --split-per-abi
        if: github.ref == 'refs/heads/main'
      - run: flutter build apk --debug
        if: github.ref != 'refs/heads/main'
      - uses: actions/upload-artifact@v4
        with:
          name: android-build
          path: build/app/outputs/flutter-apk/
          retention-days: 7

  # Build iOS est gere par Codemagic (voir section 7.3)
  # Deploiement beta via Firebase App Distribution
  distribute-beta:
    name: Distribute Beta
    needs: build-android
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: android-build
      - uses: wzieba/Firebase-Distribution-Github-Action@v1
        with:
          appId: ${{ secrets.FIREBASE_APP_ID }}
          serviceCredentialsFileContent: ${{ secrets.FIREBASE_CREDENTIALS }}
          file: app-armeabi-v7a-release.apk
          groups: testers
```

### 12.3 React Admin (dans le monorepo)

```yaml
# .github/workflows/admin.yml
name: Admin CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'apps/admin/**'
      - 'packages/**'
      - '.github/workflows/admin.yml'
  pull_request:
    branches: [main]
    paths:
      - 'apps/admin/**'
      - 'packages/**'

concurrency:
  group: admin-${{ github.ref }}
  cancel-in-progress: true

jobs:
  secrets:
    name: Secret Detection
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2

  quality:
    name: Quality & Tests
    needs: secrets
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm -w apps/admin run lint
      - run: npm -w apps/admin run typecheck
      - run: npm -w apps/admin run test -- --run --coverage
      - run: npm -w apps/admin run build

  visual-regression:
    name: Visual Regression (Chromatic)
    needs: quality
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - uses: chromaui/action@latest
        with:
          workingDir: apps/admin
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}

  deploy:
    name: Deploy to Cloudflare Pages
    needs: quality
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm -w apps/admin run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy apps/admin/dist --project-name=bienbon-admin
```

---

## 13. Estimation des couts CI

### 13.1 Phase 1 : Lancement

| Service | Plan | Cout/mois | Usage |
|---------|------|-----------|-------|
| GitHub Actions | Free (2000 min Linux) | **0 USD** | ~1 400 min estimees |
| Codemagic | Free (500 min macOS) | **0 USD** | ~150 min estimees (builds iOS) |
| Semgrep | OSS (gratuit) | **0 USD** | Rulesets communautaires |
| Gitleaks | OSS (gratuit) | **0 USD** | |
| Chromatic | Free (5K snapshots) | **0 USD** | Tests visuels admin React |
| Firebase App Distribution | Gratuit | **0 USD** | Distribution beta Flutter |
| **TOTAL CI/CD** | | **0 USD** | |

### 13.2 Phase 2 : Croissance (~60+ PR/mois, 2 releases Flutter/semaine)

| Service | Plan | Cout/mois | Justification |
|---------|------|-----------|---------------|
| GitHub Actions | Free (suffisant) ou Team ($4/user) | **0-16 USD** | Si > 2000 min, $0.008/min supplementaire |
| Codemagic | Free ou Pay as you go ($0.038/min) | **0-20 USD** | Si > 500 min iOS |
| Semgrep | OSS (suffisant) | **0 USD** | |
| Chromatic | Free ou Starter ($149/mois si > 5K snapshots) | **0-149 USD** | Selon volume de composants |
| **TOTAL CI/CD** | | **0-185 USD** | Typiquement < 50 USD |

### 13.3 Phase 3 : Maturite

| Service | Plan | Cout/mois |
|---------|------|-----------|
| GitHub Actions | Team | **16-40 USD** |
| Codemagic | Pay as you go ou Team | **20-50 USD** |
| Semgrep | OSS (ou Pro si regles avancees) | **0-40 USD** |
| Chromatic | Starter | **0-149 USD** |
| **TOTAL CI/CD** | | **36-280 USD** |

**Note** : a partir de mars 2026, GitHub facture $0.002/min pour les self-hosted runners. Cela ne nous impacte pas car nous utilisons les runners hosted par GitHub.

---

## 14. Recapitulatif des decisions

| Question | Decision | Alternative |
|----------|----------|-------------|
| **Structure repo** | Monorepo hybride (Node.js monorepo + repos Flutter separes) | Monorepo complet avec Nx si l'equipe grandit |
| **Monorepo tool** | npm workspaces (zero outil supplementaire) | Turborepo si > 5 apps Node.js |
| **Pipeline order** | Entonnoir : secrets → lint → types → tests → security → build → deploy | - |
| **SAST** | Semgrep OSS | CodeQL en complement (non bloquant) |
| **Dependency scan** | npm audit + Dependabot + script phantom packages | Renovate au lieu de Dependabot |
| **Secret detection** | Gitleaks (pre-commit + CI) | TruffleHog si besoin de scan historique profond |
| **License check** | license-checker (bloquer GPL/AGPL) | - |
| **Lockfile integrity** | lockfile-lint (verifier registres, HTTPS, hashes) | - |
| **Architecture validation** | dependency-cruiser (bounded contexts, pas de circulaire, hexagonal) | - |
| **PR review automation** | Danger.js (migrations avec rollback, endpoints avec tests, couverture) | CodeRabbit (payant) |
| **Mutation testing** | Stryker nightly (payment, ordering, fraud) -- resultats sur issue GitHub | - |
| **Pre-commit** | Husky + lint-staged + Gitleaks + commitlint | - |
| **Branching** | GitHub Flow (feature branches + PR + squash merge) | Trunk-based pur si < 3 devs |
| **Branch protection** | 1 review humaine, all checks pass, no force push | 2 reviews si equipe > 5 |
| **Backend deploy** | Railway auto-deploy (wait for CI) | Railway CLI dans GitHub Actions |
| **Static deploy** | Cloudflare Pages (auto-deploy) | Wrangler CLI dans GitHub Actions |
| **Flutter iOS build** | Codemagic (macOS M2 gratuit) | GitHub Actions macOS (10x plus cher en minutes) |
| **Flutter Android build** | GitHub Actions (ubuntu, gratuit) | Codemagic |
| **Store deployment** | Fastlane (via Codemagic/GHA) | Manuel (lent mais acceptable au debut) |
| **Beta distribution** | Firebase App Distribution | TestFlight (iOS) + Internal testing (Android) |
| **Rollback backend** | Railway rollback (auto si healthcheck KO) | - |
| **Rollback mobile** | Feature flags (Firebase RemoteConfig) + hotfix | - |
| **DB migrations** | Prisma Migrate (additive only pour code IA, review humaine pour destructives) | - |
| **Monitoring** | Sentry + Grafana Cloud + UptimeRobot (ref ADR-020) | - |
| **Auto-rollback** | Sentry alert → webhook → `railway rollback` | Manuel (acceptable au debut) |

---

## 15. Consequences

### Positives

1. **Defense en profondeur contre le code IA** : 6 couches de securite (pre-commit, secret scan, lint, SAST, dependency audit, phantom packages) attrapent les erreurs typiques des LLM avant qu'elles n'atteignent la production.

2. **Cout zero au lancement** : l'ensemble de la stack CI/CD est gratuit grace aux free tiers de GitHub Actions, Codemagic, Semgrep OSS, Gitleaks, et Firebase App Distribution.

3. **Feedback rapide** : les pipelines ciblent 6-10 minutes pour le backend et 8-15 minutes pour Flutter, ce qui garde le flux de developpement fluide meme avec des cycles agent IA frequents.

4. **Rollback automatise** : le couplage Sentry + Railway healthchecks permet un rollback sans intervention humaine en cas de regression post-deploy.

5. **Separation des responsabilites** : le monorepo hybride donne la cohesion la ou elle a de la valeur (TypeScript shared) sans forcer la cohabitation artificielle de Node.js et Dart.

6. **Auditabilite** : chaque changement passe par une PR, un pipeline complet, et une review humaine. L'historique Git + les logs CI forment un audit trail pour la conformite (ref ADR-021).

### Negatives

1. **Complexite initiale** : 7 workflows GitHub Actions + Codemagic + pre-commit hooks representent un investissement de setup de 2-3 jours. Mais c'est un investissement unique qui protege tout le cycle de vie du projet.

2. **Faux positifs** : Semgrep (12% de faux positifs), Gitleaks, et le script phantom packages peuvent bloquer le pipeline pour des raisons non justifiees. Mitigation : un fichier `.semgrep-ignore` et `.gitleaks.toml` bien configures, et la possibilite de marquer un finding comme "false positive" dans la PR.

3. **Dependance a GitHub** : le pipeline est entierement lie a GitHub (Actions, Dependabot, Secret Scanning, branch protection). Si GitHub tombe, rien ne se deploie. Mitigation : les tools sont tous standards et portables (Gitleaks, Semgrep, Vitest, Fastlane sont executables localement ou sur n'importe quelle CI).

4. **iOS builds sur Codemagic** : ajoute un second systeme CI a gerer. Mitigation : Codemagic ne gere que les builds iOS, tout le reste est sur GitHub Actions. Si Codemagic pose probleme, on peut basculer sur GitHub Actions macOS (en acceptant le surcout en minutes).

---

## 16. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| L'agent IA bypass `--no-verify` et push un secret | Moyenne | Critique | Gitleaks en CI (2eme couche). GitHub Secret Scanning (3eme couche). Rotation immediate des cles exposees. |
| Un package hallucine par l'IA est un slopsquat malveillant | Faible | Critique | Script phantom packages en CI. npm audit. Review humaine des ajouts de dependances. |
| Semgrep manque une vulnerabilite (faux negatif) | Moyenne | Eleve | Semgrep n'est pas le seul garde-fou : tests d'integration, review humaine, monitoring Sentry en production. Evaluer CodeQL en complement. |
| Le free tier GitHub Actions (2000 min) est depasse | Moyenne | Faible | Optimiser le caching. Limiter les builds inutiles (path filters, concurrency groups). Budget supplementaire < 20 USD/mois. |
| Codemagic change ses prix ou ferme | Faible | Moyen | Migration vers GitHub Actions macOS runners. Les workflows Fastlane sont portables. |
| Un deploy casse la production malgre le CI | Faible | Eleve | Healthcheck Railway + rollback auto. Sentry regression alert. Feature flags pour le mobile. |
| Les tests IA sont triviaux et n'attrapent pas les bugs | Moyenne | Eleve | Mutation testing (Stryker) sur modules critiques. Review humaine des tests. Metriques de mutation score en CI (ref ADR-023). |
| Race condition dans les migrations DB | Faible | Eleve | Migrations additives uniquement pour le code IA. Lock Prisma Migrate (`migrate deploy` est sequentiel). Staging avant production. |

---

## 17. Plan de validation

1. **Setup pre-commit (0.5 jour)** : installer Husky + lint-staged + Gitleaks + commitlint sur le monorepo Node.js. Verifier que `git commit --no-verify` est bloque par la branch protection.

2. **Pipeline backend MVP (1 jour)** : implementer le workflow `backend.yml` avec les 6 gates. Verifier les temps de build avec caching. Tester le deploy vers Railway.

3. **Pipeline Flutter MVP (1 jour)** : implementer le workflow `flutter-ci.yml`. Configurer Codemagic pour le build iOS. Tester Firebase App Distribution.

4. **Security gates (0.5 jour)** : configurer Semgrep avec les regles custom BienBon. Deployer le script phantom packages. Tester avec un faux package hallucine.

5. **Auto-rollback (0.5 jour)** : configurer le webhook Sentry → GitHub Actions → Railway rollback. Simuler une erreur post-deploy.

6. **Documentation (0.5 jour)** : mettre a jour le CLAUDE.md avec les regles CI/CD que les agents IA doivent suivre.

**Total : ~4 jours de setup**, incluant les tests de bout en bout.

---

## 18. References

### Supply chain et code IA
- [AI-Generated Code Packages Can Lead to 'Slopsquatting' Threat](https://devops.com/ai-generated-code-packages-can-lead-to-slopsquatting-threat-2/) -- DevOps.com
- [20% of AI-Generated Code Dependencies Don't Exist](https://www.traxtech.com/blog/20-of-ai-generated-code-dependencies-dont-exist-creating-supply-chain-security-risks) -- TraxTech
- [AI Hallucinations Create "Slopsquatting" Supply Chain Threat](https://www.infosecurity-magazine.com/news/ai-hallucinations-slopsquatting/) -- Infosecurity Magazine
- [AI code suggestions sabotage software supply chain](https://www.theregister.com/2025/04/12/ai_code_suggestions_sabotage_supply_chain) -- The Register

### SAST
- [2025 AI Code Security Benchmark: Snyk vs Semgrep vs CodeQL](https://sanj.dev/post/ai-code-security-tools-comparison) -- sanj.dev
- [Best SAST Tools of 2025](https://www.stackhawk.com/blog/best-sast-tools-comparison/) -- StackHawk
- [Comparing Semgrep and CodeQL](https://blog.doyensec.com/2022/10/06/semgrep-codeql.html) -- Doyensec
- [Semgrep vs SonarQube (2026)](https://www.peerspot.com/products/comparisons/semgrep_vs_sonarqube) -- PeerSpot

### Secret detection
- [TruffleHog vs. Gitleaks: A Detailed Comparison](https://www.jit.io/resources/appsec-tools/trufflehog-vs-gitleaks-a-detailed-comparison-of-secret-scanning-tools) -- Jit
- [Best Secret Scanning Tools in 2025](https://www.aikido.dev/blog/top-secret-scanning-tools) -- Aikido

### Flutter CI/CD
- [Codemagic vs GitHub Actions](https://blog.codemagic.io/codemagic-vs-github-actions-comparison/) -- Codemagic Blog
- [Best Mobile CI/CD Tools 2025](https://www.tridevtechnologies.com/article/best-mobile-ci-cd-tools-like-codemagic-appcircle-and-bitrise-your-2025-guide) -- TriDev Technologies

### Monorepo
- [Nx vs Turborepo: Integrated Ecosystem or High-Speed Task Runner?](https://dev.to/thedavestack/nx-vs-turborepo-integrated-ecosystem-or-high-speed-task-runner-the-key-decision-for-your-monorepo-279) -- DEV Community
- [Why I Chose Turborepo Over Nx](https://dev.to/saswatapal/why-i-chose-turborepo-over-nx-monorepo-performance-without-the-complexity-1afp) -- DEV Community

### GitHub Actions
- [Update to GitHub Actions pricing (2026)](https://github.blog/changelog/2025-12-16-coming-soon-simpler-pricing-and-a-better-experience-for-github-actions/) -- GitHub Blog
- [Pricing changes for GitHub Actions](https://resources.github.com/actions/2026-pricing-changes-for-github-actions/) -- GitHub

### Railway CI/CD
- [Controlling GitHub Autodeploys](https://docs.railway.com/deployments/github-autodeploys) -- Railway Docs
- [Using Github Actions with Railway](https://blog.railway.com/p/github-actions) -- Railway Blog
