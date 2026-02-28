# ADR-026 : Qualite du code IA -- conventions, guardrails et assurance qualite

| Champ         | Valeur                                                                  |
|---------------|-------------------------------------------------------------------------|
| **Statut**    | Propose                                                                 |
| **Date**      | 2026-02-27                                                              |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                                     |
| **Decideurs** | Equipe technique BienBon                                                |
| **Scope**     | CLAUDE.md, conventions de code, linting, review automatisee, enforcement architectural, coherence inter-sessions, metriques qualite, supervision humaine |
| **Prereqs**   | ADR-001 (stack), ADR-002 (architecture), ADR-022 (securite OWASP), ADR-023 (tests), ADR-024 (DDD), ADR-025 (CI/CD SAST) |
| **Refs**      | OpenSSF Security-Focused Guide for AI Code Assistants, CodeScene AI Guardrails, OWASP Top 10 2025, Qodo multi-agent review research |

---

## 1. Contexte

### 1.1 Pourquoi cette ADR est necessaire

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. **100% du code sera genere par des agents IA** (Claude Code / Claude Opus). L'equipe humaine (2-5 personnes) supervise, review et valide -- mais ne code pas directement.

Cette approche inedite cree un paradigme ou les mecanismes traditionnels de qualite (pair programming humain, conventions implicites, memoire collective de l'equipe) n'existent pas. Il faut les remplacer par des **guardrails automatises, explicites et enforceables**.

### 1.2 Chiffres cles (recherche 2025-2026)

| Metrique | Source | Impact BienBon |
|----------|--------|---------------|
| 25-30% du code AI contient des CWE (Common Weakness Enumerations) | CSA 2025 | Chaque PR doit etre scannee automatiquement |
| 75% de plus d'erreurs de logique dans les PR generees par IA | CodeRabbit, dec. 2025 | Les tests doivent valider la logique, pas juste la couverture |
| 20% des packages recommandes par les LLM n'existent pas ("slopsquatting") | Lasso Security, mars 2025 | Verification systematique des dependances |
| 43% des noms de packages hallucines sont repetes de maniere consistante | Idem | L'agent re-hallucine les memes packages entre sessions |
| 65% des devs identifient les lacunes de contexte comme source #1 de code IA de mauvaise qualite | Qodo 2025 | CLAUDE.md et contexte persistant sont critiques |
| Code IA : 2.74x plus de vulnerabilites que le code humain | Veracode 2025 | SAST obligatoire, pas optionnel |
| 4% de score en mutation testing malgre 100% de couverture de lignes | HumanEval-Java | La couverture seule ne suffit pas |

### 1.3 Les 10 risques specifiques du code IA

| # | Risque | Probabilite | Impact | Mitigation (section) |
|---|--------|:-----------:|:------:|---------------------|
| R1 | **Hallucination de packages** (imports inexistants -> slopsquatting) | Elevee | Critique | S3.5 (lockfile-lint), S5 (CI checks) |
| R2 | **Code plausible mais faux** (logique subtillement incorrecte) | Elevee | Eleve | S5 (review agent), ADR-023 (mutation testing) |
| R3 | **Over-engineering** (abstractions non demandees) | Elevee | Moyen | S2.3 (regles anti-patterns), S3.1 (CLAUDE.md) |
| R4 | **Inconsistance de style entre sessions** | Tres elevee | Moyen | S3 (CLAUDE.md persistant), S2 (linting strict) |
| R5 | **Secrets hardcodes** | Moyenne | Critique | S5.2 (secret detection CI), S2.1 (lint rules) |
| R6 | **Dependances obsoletes** | Moyenne | Eleve | S5.3 (Dependabot, npm audit) |
| R7 | **Patterns insecures reproduits** (eval, innerHTML, SQL concat) | Elevee | Critique | S2.2 (banned patterns), ADR-022 |
| R8 | **Tests triviaux qui passent toujours** | Tres elevee | Eleve | ADR-023 (mutation testing), S5 (review checklist) |
| R9 | **Documentation hallucinee** | Moyenne | Moyen | S7 (review humaine), S3 (templates) |
| R10 | **Contexte perdu entre sessions** | Tres elevee | Eleve | S3 (CLAUDE.md + memory), S4 (generators) |

### 1.4 Ce que cette ADR couvre

| # | Question |
|---|----------|
| Q1 | Structure et contenu des CLAUDE.md -- un par module ? |
| Q2 | Conventions de code strictes enforceables par linting |
| Q3 | Code review automatisee -- deuxieme agent IA, Danger.js, checks PR |
| Q4 | Architecture Decision Enforcement -- ADR -> lint rules, dependency-cruiser |
| Q5 | Coherence inter-sessions -- memory files, templates, generators |
| Q6 | Metriques de qualite -- seuils bloquants en CI |
| Q7 | Matrice de supervision humaine par type de tache |
| Q8 | Onboarding de nouveaux agents -- conventions dans le repo |

### 1.5 Ce que cette ADR ne couvre pas

- Strategie de tests detaillee -> ADR-023
- Securite applicative et OWASP -> ADR-022
- CI/CD pipeline et SAST -> ADR-025
- DDD et bounded contexts -> ADR-024

---

## 2. Q1 : CLAUDE.md -- structure, contenu, hierarchie

### 2.1 Probleme

Le CLAUDE.md actuel (76 lignes) est centre sur la phase Storybook/UI. Quand le backend NestJS, les apps Flutter et le panel admin React seront en cours, un seul fichier deviendra soit :
- Trop long (> 200 lignes), ce qui fait que Claude **ignore les instructions** (phenomene documente : les fichiers CLAUDE.md bloated causent la perte de regles critiques)
- Trop vague pour donner des instructions specifiques a chaque workspace

### 2.2 Options

| Option | Description | Avantages | Inconvenients |
|--------|-------------|-----------|---------------|
| **A** | Un seul CLAUDE.md a la racine | Simple, une source de verite | Trop long, instructions noyees |
| **B** | CLAUDE.md racine + un par workspace | Hierarchie, chaque agent a son contexte | Risque de duplication, sync manuelle |
| **C** | CLAUDE.md racine lean + `.claude/skills/` + CLAUDE.md par workspace | Modulaire, skills reutilisables, pas de bloat | Setup initial plus complexe |

### 2.3 Decision : Option C -- CLAUDE.md hierarchique + skills

**Architecture des fichiers d'instructions :**

```
bienbon/
  CLAUDE.md                          # Racine : projet, principes, regles universelles (~40 lignes)
  .claude/
    skills/
      nestjs-module.md               # Skill : creer un module NestJS DDD
      flutter-screen.md              # Skill : creer un ecran Flutter
      react-admin-page.md            # Skill : creer une page admin React
      prisma-migration.md            # Skill : creer une migration Prisma
      security-review.md             # Skill : revue de securite
      api-endpoint.md                # Skill : creer un endpoint REST
    agents/
      code-reviewer.md               # Sub-agent : revue de code automatisee
      security-auditor.md            # Sub-agent : audit securite
      architecture-checker.md        # Sub-agent : verification architecture
  backend/
    CLAUDE.md                        # Backend : NestJS, Prisma, conventions backend (~50 lignes)
  mobile/
    CLAUDE.md                        # Flutter : conventions Dart, architecture BLoC (~40 lignes)
  admin/
    CLAUDE.md                        # React admin : conventions React, RTL (~30 lignes)
  storybook-ui/
    CLAUDE.md                        # UI components : existant, mis a jour (~40 lignes)
```

**Principe : chaque CLAUDE.md < 60 lignes.** Si un fichier depasse ce seuil, extraire le contenu dans un skill ou un fichier de reference.

### 2.4 Template CLAUDE.md racine

```markdown
# CLAUDE.md

## Projet
BienBon.mu -- marketplace anti-gaspi, ile Maurice. Monolithe modulaire NestJS + Flutter + React admin.

## Architecture
- Backend : NestJS + Prisma + PostgreSQL (ADR-001). Monolithe modulaire (ADR-002). DDD leger sur modules complexes (ADR-024).
- Mobile : Flutter (consumer + partner apps). BLoC pattern. OpenAPI codegen.
- Admin : React + Vite + Storybook. Tailwind CSS v4.
- Tests : Vitest (backend + admin), flutter_test, mutation testing modules critiques (ADR-023).

## Regles universelles
1. TypeScript strict : `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Dart strict mode.
2. JAMAIS de `any` en TypeScript. JAMAIS de `dynamic` en Dart sauf FFI.
3. JAMAIS de `eval()`, `innerHTML`, `dangerouslySetInnerHTML`, `$queryRawUnsafe`, `Function()`.
4. JAMAIS de secrets hardcodes. Utiliser `process.env` + validation Zod au demarrage.
5. JAMAIS d'import cross-bounded-context sauf via interfaces publiques (voir ADR-024).
6. Chaque endpoint avec `:id` DOIT avoir un ownership guard OU une policy RLS (ADR-022 REGLE-SEC-001).
7. Tests AVANT ou EN MEME TEMPS que le code, jamais apres (ADR-023).
8. Les messages de commit suivent Conventional Commits : `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.
9. Langue : code en anglais, commentaires en anglais, specs et US en francais.
10. Verifier que tout package importe existe reellement sur npm/pub.dev AVANT de l'utiliser.

## Specs et ADR
- User stories : `dev-specs/us/` (francais, par module)
- ADR : `dev-specs/ADR-*.md` (25 decisions d'architecture)
- Design system : `DESIGN_SYSTEM.md` (tokens, couleurs, typographie)

## Commandes
- Backend : `cd backend && npm run test && npm run lint`
- Mobile : `cd mobile && flutter analyze && flutter test`
- Admin : `cd admin && npm run lint && npx vitest --run`
- Storybook : `cd storybook-ui && npm run storybook`
```

### 2.5 Template CLAUDE.md backend (NestJS)

```markdown
# CLAUDE.md -- Backend NestJS

## Stack
NestJS + Fastify + Prisma v7+ + PostgreSQL + BullMQ + Redis. Voir ADR-001.

## Structure par module (ADR-024)
```
src/modules/{module-name}/
  domain/              # Entities, value objects, domain events (modules DDD)
    {entity}.entity.ts
    {name}.value-object.ts
    {name}.event.ts
  application/         # Use cases, command/query handlers
    commands/
    queries/
    {module-name}.service.ts
  infrastructure/      # Prisma repos, external API clients
    {module-name}.repository.ts
  presentation/        # Controllers, DTOs, guards
    {module-name}.controller.ts
    dto/
  {module-name}.module.ts
```

## Conventions
- Un module NestJS = un bounded context (ADR-024)
- DTOs : class-validator pour la validation. Zod pour les configs.
- Erreurs : exceptions NestJS standard (NotFoundException, ForbiddenException). Pas d'exceptions custom sauf domaine.
- Nommage fichiers : `kebab-case`. Classes : `PascalCase`. Variables/fonctions : `camelCase`. Enums : `PascalCase` + membres `UPPER_SNAKE_CASE`.
- Chaque service public a une interface (port). Les modules importent via l'interface, pas l'implementation.
- Logger : `@nestjs/common` Logger. Structured JSON en production. JAMAIS de `console.log`.
- State machines : transition table typee (ADR-017). Guards et effets en fonctions pures.

## Patterns interdits
- `@Inject()` avec des strings magiques -> utiliser des tokens symboliques
- `any` -> utiliser `unknown` + type narrowing
- `console.log` -> utiliser `Logger` de NestJS
- `prisma.$queryRawUnsafe()` -> utiliser `$queryRaw` avec tagged template
- Import depuis `../../../` (3+ niveaux) -> utiliser path aliases `@modules/`, `@common/`, `@config/`
- Import cross-module direct (ex: `import { X } from '../payments/...'`) -> utiliser le module public API

## Tests
- Framework : Vitest (pas Jest). Voir ADR-023.
- Chaque service public : >= 3 tests unitaires (happy path, edge case, erreur).
- Modules critiques (ordering, payment, catalog, partner, claims) : mutation testing obligatoire.
- Integration : Supertest sur les endpoints, base de test PostgreSQL avec migrations.

## Commandes
```bash
npm run test              # Vitest watch mode
npm run test:run          # Single run
npm run test:cov          # Coverage report
npm run lint              # ESLint strict
npm run lint:fix          # Auto-fix
npx prisma migrate dev    # Appliquer migrations
npx prisma generate       # Regenerer client
```
```

### 2.6 Template CLAUDE.md mobile (Flutter)

```markdown
# CLAUDE.md -- Mobile Flutter

## Stack
Flutter 3.x + Dart 3.x. Deux apps : consumer (`lib/`) et partner (`lib_partner/`).
State management : flutter_bloc. HTTP : dio + retrofit. Codegen : openapi_generator_cli.

## Structure
```
lib/
  core/                # Theme, routing, DI, constants
  features/            # Feature-first organization
    {feature}/
      data/            # Repositories impl, data sources, models
      domain/          # Entities, repository interfaces, use cases
      presentation/    # Screens, widgets, BLoCs
        bloc/
        screens/
        widgets/
  shared/              # Widgets partages, utils, extensions
```

## Conventions
- Fichiers : `snake_case.dart`. Classes : `PascalCase`. Variables/fonctions : `camelCase`.
- JAMAIS de `dynamic` sauf FFI. Strict mode dans `analysis_options.yaml`.
- BLoC : un Bloc/Cubit par feature. Events en sealed class. States en freezed.
- Navigation : go_router. Routes typees.
- i18n : ARB files (ADR-015). `context.l10n.keyName`.
- Assets : images en webp, icones via flutter_svg.

## Patterns interdits
- `setState()` dans les ecrans (sauf widgets stateless simples) -> utiliser BLoC
- `http` package direct -> utiliser Dio avec intercepteurs (auth, retry, logging)
- `print()` -> utiliser `Logger` package
- Tailles hardcodees (`width: 350`) -> utiliser MediaQuery ou LayoutBuilder
- Couleurs hardcodees (`Color(0xFF1B5E20)`) -> utiliser le theme `Theme.of(context)`

## Tests
- `flutter test` pour les tests unitaires et widget.
- `flutter test --coverage` pour le coverage.
- BLoC : tester tous les evenements et etats avec `bloc_test`.
- Widgets : tester rendu + interactions avec `flutter_test` + `mocktail`.

## Commandes
```bash
flutter analyze          # Lint strict
flutter test             # Tests unitaires + widget
flutter test --coverage  # Avec couverture
dart fix --apply         # Auto-fix
flutter pub get          # Installer deps
```
```

---

## 3. Q2 : Conventions de code enforceables par linting

### 3.1 Philosophie : tout ce qui peut etre automatise DOIT l'etre

Un agent IA ne retient pas les feedbacks de review d'une session a l'autre. La seule facon de garantir la coherence est d'automatiser les verifications :

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Pyramide d'enforcement                           │
│                                                                     │
│                    ┌──────────┐                                     │
│                   / Review     \        Humain : jugement, UX,      │
│                  /  humaine     \       adequation metier            │
│                 ┌────────────────┐                                   │
│                / Review agent IA  \     Sub-agent : logique,         │
│               /  (code-reviewer)   \   patterns, securite            │
│              ┌──────────────────────┐                                │
│             /  CI quality gates      \  CI : coverage, complexity,   │
│            /   (metriques bloquantes)  \ bundle size, mutation score │
│           ┌──────────────────────────────┐                           │
│          /  Linting + type checking       \  IDE + pre-commit :      │
│         /   (ESLint, dart analyze, tsc)    \ erreurs instantanees    │
│        └──────────────────────────────────────┘                      │
│                                                                     │
│   Plus on descend, plus le feedback est rapide et moins cher.       │
│   L'objectif : que 80% des problemes soient catches au niveau       │
│   linting, pas en review humaine.                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Regles ESLint -- Backend NestJS + Admin React

#### 3.2.1 Config de base

```typescript
// eslint.config.ts (backend)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';
import nestjsTyped from '@darraghor/eslint-plugin-nestjs-typed';
import noSecrets from 'eslint-plugin-no-secrets';

export default tseslint.config(
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,    // Strict, pas juste recommended
  tseslint.configs.stylisticTypeChecked,
  nestjsTyped.configs.recommended,       // Regles NestJS-specifiques
  {
    plugins: { boundaries, 'no-secrets': noSecrets },
    rules: {
      // --- Securite ---
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-secrets/no-secrets': 'error',

      // --- TypeScript strict ---
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },       // Optionnel, a discuter
        { selector: 'typeAlias', format: ['PascalCase'] },
        { selector: 'enum', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        { selector: 'function', format: ['camelCase'] },
        { selector: 'class', format: ['PascalCase'] },
      ],

      // --- Qualite ---
      'complexity': ['error', { max: 15 }],                    // Complexite cyclomatique max 15
      'max-lines-per-function': ['warn', { max: 80 }],         // Warn a 80 lignes par fonction
      'max-depth': ['error', { max: 4 }],                      // Profondeur de nesting max 4
      'no-console': 'error',                                    // Utiliser Logger NestJS
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['../../../*'], message: 'Import trop profond. Utiliser les path aliases @modules/, @common/.' },
        ],
      }],

      // --- Patterns interdits NestJS ---
      'no-restricted-syntax': ['error',
        {
          selector: 'CallExpression[callee.property.name="$queryRawUnsafe"]',
          message: 'Utiliser $queryRaw avec tagged template literals. $queryRawUnsafe est interdit (injection SQL).',
        },
        {
          selector: 'CallExpression[callee.property.name="$executeRawUnsafe"]',
          message: 'Utiliser $executeRaw avec tagged template literals. $executeRawUnsafe est interdit.',
        },
        {
          selector: 'MemberExpression[property.name="innerHTML"]',
          message: 'innerHTML est interdit. Utiliser textContent ou le framework de rendu.',
        },
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: 'dangerouslySetInnerHTML est interdit. Utiliser une librairie de sanitization.',
        },
      ],
    },
  },
);
```

#### 3.2.2 Regles eslint-plugin-boundaries (enforcement architectural DDD)

```typescript
// Dans eslint.config.ts -- section boundaries
{
  settings: {
    'boundaries/elements': [
      { type: 'module', pattern: 'src/modules/*', mode: 'folder' },
      { type: 'common', pattern: 'src/common/*', mode: 'folder' },
      { type: 'config', pattern: 'src/config/*', mode: 'folder' },
    ],
    'boundaries/ignore': ['**/*.spec.ts', '**/*.test.ts'],
  },
  rules: {
    'boundaries/element-types': ['error', {
      default: 'disallow',
      rules: [
        // Un module peut importer de common et config
        { from: 'module', allow: ['common', 'config'] },
        // Un module NE PEUT PAS importer d'un autre module directement
        // Il doit passer par le module public API (l'export du .module.ts)
        // Exception : les types/interfaces partagees dans common
        { from: 'common', allow: ['config'] },
      ],
    }],
    'boundaries/no-private': ['error', {
      allowUncles: false,
    }],
  },
}
```

#### 3.2.3 Tableau recapitulatif des regles ESLint custom

| Categorie | Regle | Severite | Justification | Risque IA mitigue |
|-----------|-------|:--------:|---------------|:-----------------:|
| **Securite** | `no-eval` | error | Execution de code arbitraire | R7 |
| **Securite** | `no-new-func` | error | Equivalent de eval | R7 |
| **Securite** | `no-secrets/no-secrets` | error | Detection de secrets hardcodes | R5 |
| **Securite** | Ban `$queryRawUnsafe` | error | Injection SQL | R7 |
| **Securite** | Ban `innerHTML` | error | XSS | R7 |
| **Securite** | Ban `dangerouslySetInnerHTML` | error | XSS | R7 |
| **TypeScript** | `no-explicit-any` | error | Type safety | R2, R4 |
| **TypeScript** | `no-unsafe-*` (5 regles) | error | Propagation virale du `any` | R2 |
| **TypeScript** | `no-non-null-assertion` | error | Runtime errors potentiels | R2 |
| **TypeScript** | `strict-boolean-expressions` | error | Truthy/falsy bugs subtils | R2 |
| **TypeScript** | `switch-exhaustiveness-check` | error | Enum cases oublies | R2 |
| **TypeScript** | `consistent-type-imports` | error | Bundle size, coherence | R4 |
| **TypeScript** | `naming-convention` | error | Coherence inter-sessions | R4 |
| **Qualite** | `complexity` max 15 | error | Fonctions trop complexes | R3 |
| **Qualite** | `max-lines-per-function` 80 | warn | Over-engineering | R3 |
| **Qualite** | `max-depth` 4 | error | Nesting excessif | R3 |
| **Qualite** | `no-console` | error | Utiliser Logger NestJS | R4 |
| **Architecture** | Ban imports profonds `../../../*` | error | Couplage | R3, R4 |
| **Architecture** | `boundaries/element-types` | error | Isolation bounded contexts (ADR-024) | R3 |
| **NestJS** | `nestjs-typed/*` | error | Decorateurs corrects, DI propre | R4 |

### 3.3 Regles Dart Analyzer -- Mobile Flutter

```yaml
# analysis_options.yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  language:
    strict-casts: true        # Pas de downcasts implicites
    strict-inference: true     # Pas d'inference vague
    strict-raw-types: true     # Generics toujours explicites
  errors:
    missing_return: error
    dead_code: warning
    unused_import: warning
    unused_local_variable: warning
  exclude:
    - "**/*.g.dart"            # Fichiers generes (freezed, json_serializable)
    - "**/*.freezed.dart"

linter:
  rules:
    # --- Securite & robustesse ---
    - avoid_dynamic_calls          # Pas de dynamic
    - avoid_print                  # Utiliser Logger
    - avoid_web_libraries_in_flutter
    - no_logic_in_create_state
    - use_build_context_synchronously
    - cancel_subscriptions
    - close_sinks

    # --- Style strict ---
    - always_declare_return_types
    - always_put_required_named_parameters_first
    - annotate_overrides
    - avoid_catches_without_on_clauses
    - avoid_empty_else
    - avoid_relative_lib_imports
    - prefer_const_constructors
    - prefer_const_declarations
    - prefer_final_fields
    - prefer_final_locals
    - prefer_single_quotes
    - sort_constructors_first
    - sort_unnamed_constructors_first
    - type_annotate_public_apis    # Pas de types inferes sur l'API publique
    - unawaited_futures
    - unnecessary_lambdas
    - unnecessary_null_checks
    - unnecessary_nullable_for_final_variable_declarations

    # --- Architecture ---
    - depend_on_referenced_packages
    - avoid_relative_lib_imports   # Imports absolus
    - library_private_types_in_public_api
```

### 3.4 Regles ESLint -- Admin React (extension du config Storybook existant)

```typescript
// eslint.config.ts (admin) -- etend la config storybook-ui existante
// Ajouter aux regles existantes :
{
  rules: {
    // Memes regles TypeScript strict que le backend (section 3.2.1)
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-argument': 'error',
    // ...

    // React-specifique
    'react/no-danger': 'error',                    // Ban dangerouslySetInnerHTML
    'react/jsx-no-script-url': 'error',            // Ban javascript: URLs
    'react/no-unescaped-entities': 'error',

    // Accessibilite (renforcement du mode 'todo' actuel)
    // Migrer progressivement de 'todo' a 'error' sur jsx-a11y
  },
}
```

---

## 4. Q3 : Code review automatisee

### 4.1 Probleme

Quand l'agent IA ecrit le code ET fait la review, il a un biais de confirmation. Il faut :
1. Un **deuxieme regard automatise** (agent IA reviewer separe)
2. Des **checks mecaniques** sur chaque PR (Danger.js)
3. Une **review humaine** guidee par une checklist

### 4.2 Architecture de review multi-couches

```
                          ┌────────────────────┐
                          │   Push sur branch   │
                          └─────────┬──────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
           │  CI Pipeline  │ │  Danger.js   │ │  AI Reviewer │
           │  (ADR-025)    │ │  (PR checks) │ │  (sub-agent) │
           │               │ │              │ │              │
           │ - Lint        │ │ - Taille PR  │ │ - Logique    │
           │ - Types       │ │ - Coverage   │ │ - Securite   │
           │ - Tests       │ │ - Deps new   │ │ - Patterns   │
           │ - SAST        │ │ - Secrets    │ │ - ADR comply │
           │ - Build       │ │ - Lockfile   │ │ - Edge cases │
           └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
                  │                │                │
                  └────────────────┼────────────────┘
                                   ▼
                          ┌────────────────────┐
                          │  Review humaine     │
                          │  (guidee par        │
                          │   checklist + AI    │
                          │   reviewer output)  │
                          └────────────────────┘
```

### 4.3 Danger.js -- checks automatiques sur les PR

```typescript
// dangerfile.ts

import { danger, warn, fail, message } from 'danger';

// --- Taille de la PR ---
const bigPRThreshold = 500;
const modifiedLines = danger.github.pr.additions + danger.github.pr.deletions;
if (modifiedLines > bigPRThreshold) {
  warn(`Cette PR fait ${modifiedLines} lignes modifiees. Envisager de la decouper.`);
}
if (modifiedLines > 1000) {
  fail(`PR de ${modifiedLines} lignes. Decouper en plusieurs PRs.`);
}

// --- Fichiers modifies sans tests ---
const srcFiles = danger.git.modified_files.filter(f =>
  f.match(/src\/.*\.(ts|tsx|dart)$/) && !f.match(/\.(spec|test|stories)\./));
const testFiles = danger.git.modified_files.filter(f =>
  f.match(/\.(spec|test)\.(ts|tsx|dart)$/));
if (srcFiles.length > 0 && testFiles.length === 0) {
  warn('Code source modifie sans tests correspondants. Verifier ADR-023.');
}

// --- Nouvelles dependances ---
const packageLockChanged = danger.git.modified_files.includes('package-lock.json');
const packageJsonChanged = danger.git.modified_files.includes('package.json');
if (packageJsonChanged) {
  warn('package.json modifie. Verifier que toutes les nouvelles deps existent sur npm et sont legit.');
}
if (packageJsonChanged && !packageLockChanged) {
  fail('package.json modifie mais pas package-lock.json. Lancer `npm install`.');
}

// --- Secrets potentiels ---
const suspiciousPatterns = /(?:password|secret|api_key|token|private_key)\s*[:=]\s*['"][^'"]+['"]/gi;
for (const file of danger.git.modified_files) {
  const content = await danger.git.diffForFile(file);
  if (content && suspiciousPatterns.test(content.added)) {
    fail(`Secret potentiel detecte dans ${file}. Utiliser les variables d'environnement.`);
  }
}

// --- console.log residuels ---
for (const file of srcFiles) {
  const content = await danger.git.diffForFile(file);
  if (content && /console\.(log|debug|info|warn|error)/.test(content.added)) {
    warn(`console.log() detecte dans ${file}. Utiliser le Logger du framework.`);
  }
}

// --- Fichiers generes commites par erreur ---
const generatedFiles = danger.git.created_files.filter(f =>
  f.match(/\.(g\.dart|freezed\.dart|swagger\.ts|openapi\.ts)$/));
if (generatedFiles.length > 0) {
  warn(`Fichiers generes commites : ${generatedFiles.join(', ')}. Verifier le .gitignore.`);
}

// --- Description de PR obligatoire ---
if (!danger.github.pr.body || danger.github.pr.body.length < 50) {
  fail('La PR doit avoir une description d\'au moins 50 caracteres.');
}

// --- Conventional commits ---
const title = danger.github.pr.title;
if (!/^(feat|fix|refactor|test|docs|chore|ci|perf|style|build)(\(.+\))?:\s/.test(title)) {
  fail('Le titre de la PR doit suivre Conventional Commits (ex: feat(ordering): add reservation endpoint).');
}
```

### 4.4 Sub-agent IA reviewer

**Fichier : `.claude/agents/code-reviewer.md`**

```markdown
---
name: code-reviewer
description: Reviews code changes for logic errors, security issues, and ADR compliance
tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Code Reviewer Agent

Tu es un reviewer de code senior specialise dans les projets BienBon.mu.

## Ta mission
Analyser le diff de la PR et produire un rapport structure.

## Checklist de review

### 1. Logique metier
- Les conditions sont-elles correctes ? (pas d'inversions, pas d'off-by-one)
- Les edge cases sont-ils geres ? (null, empty, boundaries, concurrence)
- La logique correspond-elle a la user story specifiee ?

### 2. Securite (ADR-022)
- Pas de secrets hardcodes
- Pas de SQL brut non parametre
- Ownership guard sur les endpoints avec :id
- Input validation sur tous les DTOs
- Rate limiting sur les endpoints publics

### 3. Conformite architecture (ADR-024)
- Imports respectent les bounded contexts
- Pas d'import cross-module direct
- Domain logic dans la couche domain, pas dans les controllers
- DTOs separes des entities de domaine

### 4. Qualite des tests (ADR-023)
- Tests non triviaux (pas de simple assert true)
- Edge cases couverts
- Mocks realistes (pas de mocks qui retournent toujours le happy path)
- Tests d'erreur presents

### 5. Anti-patterns IA
- Pas d'over-engineering (abstractions inutiles, interfaces pour une seule implementation)
- Pas de code mort ou duplique
- Pas de commentaires evidents (// increment counter)
- Pas de TODO sans ticket associe

## Format de sortie
Produire un rapport avec :
- BLOQUANT : problemes a corriger avant merge (securite, logique incorrecte)
- ATTENTION : problemes a surveiller (performance, dette technique)
- SUGGESTION : ameliorations optionnelles
- OK : ce qui est bien fait (renforcement positif pour l'agent auteur)
```

### 4.5 Decision : quand utiliser quel niveau de review

| Type de changement | Danger.js | Sub-agent reviewer | Review humaine |
|-------------------|:---------:|:------------------:|:--------------:|
| Refactoring simple (rename, reorganisation) | Oui | Non | Legere |
| Nouveau composant UI | Oui | Non | Visuelle |
| Nouveau endpoint CRUD simple | Oui | Oui | Legere |
| Logique metier (state machine, calculs) | Oui | Oui | **Approfondie** |
| Paiement / finance / ledger | Oui | Oui | **Bloquante** |
| Auth / securite / RBAC | Oui | Oui | **Bloquante** |
| Migration DB / schema change | Oui | Oui | **Bloquante** |
| Config infra / CI | Oui | Non | **Bloquante** |
| Dependance nouvelle | Oui | Oui (verification npm) | Moderee |

---

## 5. Q4 : Architecture Decision Enforcement

### 5.1 Probleme

Les ADR sont des documents textuels. Un agent IA peut les lire mais ne les respecte pas systematiquement, surtout si le contexte est long. Il faut transformer les decisions critiques en **checks automatises**.

### 5.2 ADR -> Regles automatisees : mapping

| ADR | Decision enforceable | Outil d'enforcement | Type |
|-----|---------------------|---------------------|------|
| ADR-001 | Pas de Jest, uniquement Vitest | ESLint `no-restricted-imports` (ban `jest`, `@jest/*`) | Lint |
| ADR-001 | Fastify, pas Express | ESLint `no-restricted-imports` (ban `express`) | Lint |
| ADR-002 | Monolithe modulaire, pas de deps entre modules | `eslint-plugin-boundaries` | Lint |
| ADR-003 | UUIDs v4 pour les IDs, pas d'IDs sequentiels | Test d'architecture (scan des migrations) | Test |
| ADR-004 | REST + OpenAPI, pas de GraphQL | ESLint `no-restricted-imports` (ban `@nestjs/graphql`, `apollo-server`) | Lint |
| ADR-006 | Jamais de PAN/CVV en base ou en logs | Regex scan CI (ADR-025) | CI |
| ADR-010 | Auth via Supabase, pas de auth custom | ESLint `no-restricted-imports` (ban `passport`, `passport-*`) | Lint |
| ADR-017 | State machines via transition table, pas de switch/case | `no-restricted-syntax` (ban switch sur statut) | Lint |
| ADR-022 | Ownership guard obligatoire sur endpoints `:id` | Test d'architecture (scan controllers) | Test |
| ADR-023 | Tests avant/avec le code | Danger.js (warn si src sans test) | CI |
| ADR-024 | Bounded contexts respectes | `eslint-plugin-boundaries` + `dependency-cruiser` | Lint + CI |

### 5.3 dependency-cruiser : validation d'architecture en CI

```javascript
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    // Pas d'import cross-module direct (doit passer par le module.ts)
    {
      name: 'no-cross-module-imports',
      severity: 'error',
      comment: 'ADR-024 : les modules communiquent via leurs interfaces publiques, pas par import direct.',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/',
        pathNot: [
          // Meme module = OK
          '^src/modules/$1/',
          // Types partages dans common = OK
          '^src/common/',
        ],
      },
    },
    // Pas de dependance cyclique entre modules
    {
      name: 'no-circular-module-deps',
      severity: 'error',
      comment: 'ADR-024 : pas de dependances circulaires entre bounded contexts.',
      from: { path: '^src/modules/' },
      to: { circular: true },
    },
    // La couche domain ne depend pas de l'infrastructure
    {
      name: 'domain-no-infra-dependency',
      severity: 'error',
      comment: 'ADR-024 : la couche domain est pure, pas de dependance vers Prisma, NestJS, ou HTTP.',
      from: { path: '/domain/' },
      to: {
        path: [
          'node_modules/@nestjs/',
          'node_modules/@prisma/',
          'node_modules/fastify/',
          '/infrastructure/',
        ],
      },
    },
    // Les controllers ne contiennent pas de logique metier
    {
      name: 'presentation-no-domain-logic',
      severity: 'warn',
      comment: 'ADR-024 : les controllers delegent aux services, pas de logique metier directe.',
      from: { path: '/presentation/' },
      to: { path: '/domain/' },
      // Note : ceci est un warn car les controllers peuvent importer des types du domain
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    reporterOptions: {
      dot: { theme: { graph: { rankdir: 'TB' } } },
    },
  },
};
```

**Commande CI :**
```bash
npx depcruise src --config .dependency-cruiser.cjs --output-type err
```

### 5.4 Tests d'architecture (architecture fitness functions)

```typescript
// src/__tests__/architecture.spec.ts
import { describe, it, expect } from 'vitest';
import { glob } from 'glob';
import { readFileSync } from 'fs';

describe('Architecture Fitness Functions (ADR enforcement)', () => {

  it('ADR-022: chaque controller avec :id doit avoir un ownership guard', async () => {
    const controllers = await glob('src/modules/**/presentation/*.controller.ts');
    for (const file of controllers) {
      const content = readFileSync(file, 'utf-8');
      // Chercher les routes avec :id
      const hasIdParam = /:id|:reservationId|:storeId|:basketId/.test(content);
      if (hasIdParam) {
        const hasOwnershipGuard = /@CheckOwnership|@UseGuards\(.*Ownership/.test(content);
        const hasPublicDecorator = /@Public\(\)/.test(content);
        expect(
          hasOwnershipGuard || hasPublicDecorator,
          `${file} a un parametre :id mais pas d'ownership guard (ADR-022 REGLE-SEC-001)`
        ).toBe(true);
      }
    }
  });

  it('ADR-024: les fichiers domain/ ne doivent pas importer de @nestjs/ ou @prisma/', async () => {
    const domainFiles = await glob('src/modules/**/domain/**/*.ts');
    for (const file of domainFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/from\s+['"]@nestjs\//);
      expect(content).not.toMatch(/from\s+['"]@prisma\//);
    }
  });

  it('ADR-001: aucun import de jest ou @jest/', async () => {
    const tsFiles = await glob('src/**/*.ts');
    for (const file of tsFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/from\s+['"]jest['"]/);
      expect(content).not.toMatch(/from\s+['"]@jest\//);
    }
  });

  it('ADR-003: les migrations utilisent uuid_generate_v4(), pas de SERIAL', async () => {
    const migrations = await glob('prisma/migrations/**/*.sql');
    for (const file of migrations) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/SERIAL\s+(PRIMARY\s+KEY)?/i);
    }
  });

  it('ADR-017: pas de switch/case sur les colonnes de statut', async () => {
    const serviceFiles = await glob('src/modules/**/application/**/*.ts');
    for (const file of serviceFiles) {
      const content = readFileSync(file, 'utf-8');
      // Heuristique : un switch sur une variable qui contient "status" ou "state"
      const switchOnStatus = /switch\s*\(\s*\w*(status|state|Status|State)\w*\s*\)/.test(content);
      expect(
        switchOnStatus,
        `${file} utilise switch/case sur un statut. Utiliser la transition table (ADR-017).`
      ).toBe(false);
    }
  });
});
```

---

## 6. Q5 : Coherence inter-sessions

### 6.1 Probleme

Le risque R10 (contexte perdu entre sessions) est le plus frequent. Chaque nouvelle conversation avec l'agent IA repart de zero. Sans mecanisme de persistance, l'agent :
- Reinvente des patterns deja resolus
- Propose des noms differents pour les memes concepts
- Ignore des decisions prises dans des sessions precedentes
- Introduit des inconsistances stylistiques

### 6.2 Mecanismes de coherence

```
┌────────────────────────────────────────────────────────────────┐
│                   Sources de verite persistantes                │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  CLAUDE.md   │  │  ADR/*.md    │  │  DESIGN_SYSTEM.md     │  │
│  │  (par        │  │  (decisions  │  │  (tokens visuels)     │  │
│  │   workspace) │  │   techniques)│  │                       │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                │                       │              │
│  ┌──────┴──────┐  ┌──────┴───────┐  ┌───────────┴───────────┐  │
│  │  .claude/    │  │  Templates   │  │  Generators           │  │
│  │  skills/     │  │  (Plop.js)   │  │  (NestJS CLI custom)  │  │
│  │  agents/     │  │              │  │                       │  │
│  │  MEMORY.md   │  │              │  │                       │  │
│  └─────────────┘  └──────────────┘  └───────────────────────┘  │
│                                                                 │
│  Tout ce qui est dans le repo EST le contexte.                  │
│  Rien ne vit dans l'outil (Cursor settings, VS Code, etc.)     │
└────────────────────────────────────────────────────────────────┘
```

### 6.3 Templates et generators NestJS (Plop.js)

Pour eviter que chaque session d'agent cree une structure de module differente, on utilise des generators :

```javascript
// plopfile.mjs
export default function (plop) {
  // --- Generator : module NestJS DDD ---
  plop.setGenerator('nestjs-module', {
    description: 'Creer un module NestJS conforme ADR-024 (DDD leger)',
    prompts: [
      { type: 'input', name: 'name', message: 'Nom du module (kebab-case)' },
      { type: 'confirm', name: 'ddd', message: 'Module DDD (domain layer) ?' },
    ],
    actions: (data) => {
      const base = 'src/modules/{{kebabCase name}}';
      const actions = [
        { type: 'add', path: `${base}/{{kebabCase name}}.module.ts`, templateFile: 'templates/module.ts.hbs' },
        { type: 'add', path: `${base}/presentation/{{kebabCase name}}.controller.ts`, templateFile: 'templates/controller.ts.hbs' },
        { type: 'add', path: `${base}/presentation/dto/index.ts`, templateFile: 'templates/dto-index.ts.hbs' },
        { type: 'add', path: `${base}/application/{{kebabCase name}}.service.ts`, templateFile: 'templates/service.ts.hbs' },
        { type: 'add', path: `${base}/infrastructure/{{kebabCase name}}.repository.ts`, templateFile: 'templates/repository.ts.hbs' },
      ];
      if (data.ddd) {
        actions.push(
          { type: 'add', path: `${base}/domain/{{kebabCase name}}.entity.ts`, templateFile: 'templates/entity.ts.hbs' },
          { type: 'add', path: `${base}/domain/events/index.ts`, templateFile: 'templates/events-index.ts.hbs' },
        );
      }
      // Toujours generer les tests
      actions.push(
        { type: 'add', path: `${base}/application/__tests__/{{kebabCase name}}.service.spec.ts`, templateFile: 'templates/service.spec.ts.hbs' },
        { type: 'add', path: `${base}/presentation/__tests__/{{kebabCase name}}.controller.spec.ts`, templateFile: 'templates/controller.spec.ts.hbs' },
      );
      return actions;
    },
  });

  // --- Generator : endpoint REST ---
  plop.setGenerator('endpoint', {
    description: 'Ajouter un endpoint REST a un module existant',
    prompts: [
      { type: 'input', name: 'module', message: 'Nom du module existant' },
      { type: 'list', name: 'method', choices: ['GET', 'POST', 'PATCH', 'DELETE'] },
      { type: 'input', name: 'path', message: 'Path de l\'endpoint (ex: :id, :id/cancel)' },
    ],
    actions: [
      // Append dans le controller existant
      { type: 'append', path: 'src/modules/{{module}}/presentation/{{module}}.controller.ts',
        pattern: /\/\/ --- ENDPOINTS ---/,
        templateFile: 'templates/endpoint.ts.hbs' },
    ],
  });
}
```

**Instruction CLAUDE.md pour utiliser les generators :**

> Quand tu crees un nouveau module NestJS, utilise `npx plop nestjs-module` au lieu de creer les fichiers manuellement. Cela garantit la conformite ADR-024.

### 6.4 Memory file automatique

Claude Code (>= v2.1.32, fevrier 2026) gere automatiquement un fichier `MEMORY.md` qui capture les patterns et preferences observes. En complement :

- **`.claude/MEMORY.md`** : auto-genere par Claude Code, captures des conventions emergentes
- **Les skills `.claude/skills/*.md`** : procedures codifiees manuellement, invocables par l'agent
- **Les agents `.claude/agents/*.md`** : roles specialises delegables

**Regle : les skills et agents sont versiones dans git.** Ils font partie du codebase, pas de l'outil.

---

## 7. Q6 : Metriques de qualite et seuils bloquants

### 7.1 Dashboard de metriques

| Metrique | Outil | Seuil WARNING | Seuil BLOQUANT | Frequence | Justification |
|----------|-------|:------------:|:--------------:|:---------:|---------------|
| **Test coverage (lines)** | Vitest / flutter_test | < 85% | < 80% | Chaque push | ADR-023 : filet de securite principal |
| **Test coverage (branches)** | Vitest / flutter_test | < 75% | < 70% | Chaque push | Branches non couvertes = edge cases oublies |
| **Mutation score** (modules critiques) | Stryker / custom | < 70% | < 60% | Nightly | ADR-023 : detecte les tests triviaux |
| **Complexite cyclomatique** | ESLint `complexity` | > 10 | > 15 | Chaque push | Fonctions complexes = bugs IA subtils |
| **`any` count** | `grep -c "any"` + ESLint | > 0 (nouveau) | > 0 | Chaque push | Zero tolerance sur les nouveaux `any` |
| **`dynamic` count (Dart)** | dart analyze | > 0 (nouveau) | > 0 | Chaque push | Equivalent du `any` en Dart |
| **Duplication** | jscpd | > 5% | > 10% | Chaque push | L'IA copie-colle facilement |
| **Bundle size (admin)** | Vite build stats | > 500 KB (gzip) | > 1 MB (gzip) | Pre-merge | Performance mobile |
| **Dependances nouvelles** | Danger.js | Toute nouvelle dep | Dep sans justification | Chaque PR | Risque slopsquatting (R1) |
| **Lockfile integrity** | lockfile-lint | - | Hash mismatch | Chaque push | Supply chain (ADR-022 A06) |
| **SAST findings** | Semgrep / CodeQL | Medium | High / Critical | Chaque push | ADR-025 |
| **Secrets detectes** | TruffleHog / gitleaks | - | Tout finding | Chaque push | R5 |
| **Dep vulnerabilites** | npm audit / pub audit | Low / Moderate | High / Critical | Chaque push | R6 |
| **PR size** | Danger.js | > 500 lignes | > 1000 lignes | Chaque PR | PRs massives = review impossible |

### 7.2 Quality gate CI (configuration)

```yaml
# .github/workflows/quality-gate.yml (extrait conceptuel)
quality-gate:
  needs: [lint, test, security-scan]
  steps:
    - name: Check coverage threshold
      run: |
        COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
        if (( $(echo "$COVERAGE < 80" | bc -l) )); then
          echo "::error::Coverage ${COVERAGE}% is below 80% threshold"
          exit 1
        fi

    - name: Check any count (zero new any)
      run: |
        # Compare le nombre de 'any' entre main et la branche
        MAIN_COUNT=$(git stash && git checkout main && grep -r ":\s*any\b" src/ --include="*.ts" | wc -l && git checkout -)
        BRANCH_COUNT=$(grep -r ":\s*any\b" src/ --include="*.ts" | wc -l)
        if [ "$BRANCH_COUNT" -gt "$MAIN_COUNT" ]; then
          echo "::error::New 'any' types introduced. Count: main=$MAIN_COUNT, branch=$BRANCH_COUNT"
          exit 1
        fi

    - name: Check code duplication
      run: |
        npx jscpd src/ --threshold 10 --reporters consoleFull
        # Exit code non-zero si > 10%

    - name: Lockfile integrity
      run: npx lockfile-lint --path package-lock.json --type npm --allowed-hosts npm --validate-https

    - name: Dependency verification (anti-slopsquatting)
      run: |
        # Verifier que chaque package dans package.json existe sur npm
        node scripts/verify-deps.js
```

### 7.3 Script anti-slopsquatting

```typescript
// scripts/verify-deps.ts
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

const failures: string[] = [];

for (const [name, version] of Object.entries(allDeps)) {
  try {
    // Verifier que le package existe sur le registry npm
    execSync(`npm view ${name} version`, { stdio: 'pipe', timeout: 10000 });
  } catch {
    failures.push(`ERREUR: le package "${name}" (version: ${version}) n'existe pas sur npm. Possible hallucination IA.`);
  }
}

if (failures.length > 0) {
  console.error('=== PACKAGES HALLUCINES DETECTES ===');
  failures.forEach(f => console.error(f));
  process.exit(1);
}

console.log(`Tous les ${Object.keys(allDeps).length} packages verifies avec succes.`);
```

---

## 8. Q7 : Matrice de supervision humaine par type de tache

### 8.1 Niveaux de supervision

| Niveau | Description | Temps humain | Quand |
|--------|-------------|:------------:|-------|
| **Autonome** | L'agent travaille seul. Le humain review la PR apres coup. | ~5 min / PR | Taches repetitives, low risk |
| **Supervise** | L'agent travaille, le humain verifie le plan avant execution. | ~15 min / PR | Taches moderees, logique metier simple |
| **Collaboratif** | L'humain et l'agent travaillent en pair. L'humain guide, challenge, valide etape par etape. | ~30-60 min / session | Taches critiques, haute complexite |
| **Humain-led** | L'humain decide et dicte, l'agent execute les instructions precises. | Variable | Config, infra, decisions d'architecture |

### 8.2 Matrice tache x supervision

| Type de tache | Niveau | Justification |
|---------------|--------|---------------|
| **Composant UI simple** (bouton, badge, chip) | Autonome | Templates Storybook, linting strict, risque faible |
| **Page/ecran UI** (assemblage de composants) | Supervise | Verifier l'adequation UX, accessibilite |
| **Endpoint CRUD simple** (favoris, profil) | Autonome | Generator Plop, tests auto, linting boundaries |
| **Endpoint avec logique metier** (reservation, annulation) | Supervise | Verifier la logique, les edge cases, les transitions |
| **State machine** (reservation, panier, partenaire) | **Collaboratif** | Invariants metier critiques, erreur = perte financiere |
| **Calculs financiers** (ledger, commissions, TVA) | **Collaboratif** | Erreur = impact financier reel. Property-based testing. |
| **Paiement** (integration PSP, capture, refund) | **Collaboratif** | PCI DSS, argent reel, securite critique |
| **Auth / RBAC** (guards, permissions, JWT) | **Collaboratif** | Securite, IDOR, privilege escalation |
| **Migration DB / schema change** | **Humain-led** | Irreversible en production, risque de perte de donnees |
| **Config infra** (Docker, Railway, Cloudflare) | **Humain-led** | Erreur = downtime, couts inattendus |
| **CI/CD pipeline** | **Humain-led** | Erreur = supply chain compromise, secrets exposes |
| **Refactoring large** (rename, reorganisation) | Supervise | L'agent est bon pour ca, mais verifier la completude |
| **Tests unitaires** (module non-critique) | Autonome | ADR-023 garde-fous, mutation testing en nightly |
| **Tests integration** (module critique) | Supervise | Verifier que les scenarios couvrent les edge cases reels |
| **Documentation technique** | Supervise | Risque de documentation hallucinee (R9) |
| **Nouvelle dependance** | **Collaboratif** | Verifier que le package existe, est maintenu, est securise |

### 8.3 Decision tree pour le superviseur

```
La tache touche-t-elle a l'argent, a la securite, ou aux donnees personnelles ?
  OUI -> Collaboratif ou Humain-led
  NON ->
    La tache a-t-elle un generator/template ?
      OUI -> Autonome
      NON ->
        La tache implique-t-elle de la logique metier avec des edge cases ?
          OUI -> Supervise
          NON -> Autonome
```

---

## 9. Q8 : Onboarding de nouveaux agents

### 9.1 Principe fondamental

> **Les conventions vivent dans le repo, jamais dans l'outil.**

Un nouvel agent (que ce soit une nouvelle session Claude Code, un Cursor, un Copilot, ou un humain) doit pouvoir comprendre toutes les conventions en lisant uniquement les fichiers du repository.

### 9.2 Checklist d'onboarding

Un nouvel agent qui arrive sur le projet doit :

1. Lire `CLAUDE.md` (racine) -- 2 minutes
2. Lire le `CLAUDE.md` du workspace concerne (backend/, mobile/, admin/) -- 2 minutes
3. Lire les ADR pertinentes pour sa tache -- 5-10 minutes
4. Utiliser les generators (`npx plop`) pour creer les structures de fichiers -- 1 minute
5. Lancer `npm run lint` / `flutter analyze` pour verifier la conformite -- instantane
6. Lancer les tests existants pour verifier que rien n'est casse -- 2-5 minutes

**Temps total d'onboarding : < 20 minutes.**

### 9.3 Structure de fichiers pour l'onboarding

```
bienbon/
  CLAUDE.md                              # Point d'entree universel
  DESIGN_SYSTEM.md                       # Tokens visuels
  dev-specs/
    ADR-*.md                             # Decisions d'architecture (26 ADR)
    us/                                  # User stories par module
  .claude/
    skills/                              # Procedures reutilisables
    agents/                              # Roles specialises (reviewer, auditor)
    MEMORY.md                            # Conventions emergentes (auto-genere)
  backend/
    CLAUDE.md                            # Conventions backend specifiques
    plopfile.mjs                         # Generators de code
    templates/                           # Templates Plop (module, endpoint, etc.)
    .dependency-cruiser.cjs              # Regles d'architecture
    eslint.config.ts                     # Regles de lint
    src/
      __tests__/architecture.spec.ts     # Tests d'architecture (fitness functions)
  mobile/
    CLAUDE.md                            # Conventions Flutter specifiques
    analysis_options.yaml                # Lint Dart strict
  admin/
    CLAUDE.md                            # Conventions React admin specifiques
    eslint.config.ts                     # Lint React strict
  dangerfile.ts                          # Checks automatiques PR
  scripts/
    verify-deps.ts                       # Anti-slopsquatting
```

### 9.4 Ce qui NE DOIT PAS etre dans le repo

| Element | Pourquoi | Ou le mettre |
|---------|----------|-------------|
| Secrets, tokens API | Securite (R5) | Variables d'environnement, secrets manager |
| Config specifique a un IDE | Portabilite | `.vscode/` dans `.gitignore` (sauf `extensions.json`) |
| Config specifique a un agent IA | Portabilite | `.claude/` est versionne (fait partie du codebase) |
| Fichiers generes (`.g.dart`, `openapi.ts`) | Reproductibilite | `.gitignore`, regeneres en CI |
| `node_modules/`, `.dart_tool/` | Standard | `.gitignore` |

---

## 10. Checklist review code IA

### 10.1 Checklist complete

Cette checklist est utilisee par le reviewer humain ET le sub-agent reviewer.

#### A. Conformite architecturale

- [ ] **ADR-024** : Les imports respectent les bounded contexts (pas d'import cross-module direct)
- [ ] **ADR-024** : La couche domain ne depend pas de NestJS, Prisma, ou de l'infra
- [ ] **ADR-024** : Les DTOs sont dans la couche presentation, pas dans le domain
- [ ] **ADR-002** : Pas de communication reseau entre modules (appels in-process uniquement)
- [ ] **ADR-017** : Les transitions d'etat passent par la transition table, pas par switch/case
- [ ] **ADR-001** : Vitest pour les tests (pas Jest), Fastify (pas Express)

#### B. Securite

- [ ] **ADR-022** : Tout endpoint avec `:id` a un ownership guard OU une policy RLS
- [ ] **ADR-022** : Input validation sur tous les DTOs (class-validator)
- [ ] **ADR-022** : Pas de `$queryRawUnsafe`, `eval`, `innerHTML`, `dangerouslySetInnerHTML`
- [ ] **ADR-022** : Pas de secrets hardcodes (strings qui ressemblent a des tokens, passwords, API keys)
- [ ] **ADR-006** : Aucune donnee PCI (PAN, CVV) en base ou dans les logs
- [ ] **ADR-010** : Les endpoints proteges utilisent les guards d'auth Supabase
- [ ] **OWASP** : Rate limiting sur les endpoints publics

#### C. Qualite du code

- [ ] **Pas de `any`** en TypeScript, pas de `dynamic` en Dart (sauf cas justifie et commente)
- [ ] **Complexite** : aucune fonction > 15 de complexite cyclomatique, aucune > 80 lignes
- [ ] **Nommage** : coherent avec les conventions (PascalCase classes, camelCase fonctions, kebab-case fichiers)
- [ ] **Pas de code mort** : pas de fonctions non appelees, pas de variables non utilisees
- [ ] **Pas de duplication** : pas de copier-coller > 10 lignes identiques
- [ ] **Pas d'over-engineering** : pas d'abstractions sans justification, pas d'interfaces pour une seule implementation (sauf ports DDD)
- [ ] **Pas de TODO sans ticket** : chaque TODO reference un ticket/issue
- [ ] **Pas de `console.log`** : utiliser le Logger du framework

#### D. Tests (ADR-023)

- [ ] **Tests presents** : chaque fichier source a un fichier de test correspondant
- [ ] **Tests non triviaux** : au moins un edge case et un cas d'erreur par fonction publique
- [ ] **Pas de tests miroir** : les tests ne repetent pas simplement l'implementation
- [ ] **Mocks realistes** : les mocks simulent des comportements reels (erreurs, timeouts, donnees vides)
- [ ] **Assertions specifiques** : pas de `expect(result).toBeTruthy()` sans precision

#### E. Dependances

- [ ] **Package existe** : chaque nouvelle dependance existe reellement sur npm/pub.dev
- [ ] **Package maintenu** : derniere release < 12 mois, pas de vulnerabilites connues
- [ ] **Package necessaire** : pas d'ajout de dependance pour une fonctionnalite triviale (< 20 lignes de code)
- [ ] **Lockfile a jour** : `package-lock.json` / `pubspec.lock` coherent avec les manifestes

#### F. Documentation

- [ ] **JSDoc/DartDoc** sur les fonctions publiques des modules critiques
- [ ] **Pas de documentation hallucinee** : les references a des API, packages, ou fonctionnalites sont verifiables
- [ ] **Commentaires utiles** : expliquent le "pourquoi", pas le "quoi"

---

## 11. Synthese des decisions

| # | Decision | Justification |
|---|----------|---------------|
| D1 | CLAUDE.md hierarchique : racine lean (~40 lignes) + un par workspace + skills | Evite le bloat (perte d'instructions), contexte cible par workspace |
| D2 | `typescript-eslint/strict-type-checked` + `no-explicit-any: error` partout | Zero tolerance `any` -- le risque R2 (code plausible mais faux) est trop eleve |
| D3 | `eslint-plugin-boundaries` + `dependency-cruiser` pour enforcement DDD | ADR-024 ne peut pas etre enforce par la discipline seule avec du code IA |
| D4 | `@darraghor/eslint-plugin-nestjs-typed` pour conventions NestJS | L'IA oublie souvent les decorateurs ou les utilise mal |
| D5 | Dart strict mode (`strict-casts`, `strict-inference`, `strict-raw-types`) | Equivalent du no-any pour Flutter |
| D6 | Danger.js pour les checks mecaniques sur chaque PR | Feedback rapide, pas de fatigue reviewer sur les checks triviaux |
| D7 | Sub-agent `code-reviewer` pour la review IA automatisee | Deuxieme regard sans biais de confirmation du meme agent |
| D8 | 3 niveaux de checks : lint (instantane) -> CI (minutes) -> review (humain) | 80% des problemes catches au niveau lint, le plus rapide et le moins cher |
| D9 | Generators Plop.js pour les structures de modules NestJS | Coherence structurelle inter-sessions (risque R10) |
| D10 | Script `verify-deps.ts` anti-slopsquatting en CI | Risque R1 : 20% des packages recommandes par les LLM n'existent pas |
| D11 | Coverage >= 80% bloquant, mutation score >= 60% bloquant (nightly) | ADR-023 : les tests sont LE filet de securite principal |
| D12 | Zero nouveau `any`/`dynamic` par PR | Ratchet effect : on n'ajoute jamais de dette, on la reduit progressivement |
| D13 | Matrice supervision : 4 niveaux (Autonome, Supervise, Collaboratif, Humain-led) | Adapter l'effort humain au risque de la tache |
| D14 | Conventions dans le repo, jamais dans l'outil | Portabilite entre agents, onboarding < 20 minutes |
| D15 | `lockfile-lint` + `npm ci` (pas `npm install`) en CI | Prevention supply chain attacks (ADR-022 A06, A08) |

---

## 12. Consequences

### 12.1 Positives

- **Coherence automatisee** : 80% des problemes de coherence sont elimines par le linting strict, pas par la review humaine
- **Onboarding instantane** : un nouvel agent ou un nouvel humain est productif en < 20 minutes
- **Securite par defaut** : les patterns insecures sont interdits au niveau syntaxique (lint), pas au niveau semantique (review)
- **Traçabilite** : chaque decision d'architecture (ADR) a au moins un check automatise qui la fait respecter
- **Ratchet effect** : la qualite ne peut que s'ameliorer (zero nouveau `any`, coverage ne baisse pas)
- **Multi-agent safe** : les conventions vivent dans le repo, plusieurs agents peuvent travailler en parallele sur des modules differents

### 12.2 Negatives

- **Setup initial consequent** : configurer ESLint strict, dependency-cruiser, Danger.js, les generators, les tests d'architecture, les scripts anti-slopsquatting prend 2-3 jours
- **Faux positifs** : les regles strictes peuvent bloquer du code valide dans des cas limites (ex: `any` justifie pour un wrapper de librairie tierce). Mitigation : `// eslint-disable-next-line` avec commentaire justificatif obligatoire
- **Rigidite** : les conventions sont enforceables mais pas toujours adaptees a l'evolution du projet. Les ADR et les regles doivent etre revisees trimestriellement
- **Overhead CI** : les checks supplementaires (dependency-cruiser, lockfile-lint, verify-deps, mutation testing nightly) ajoutent du temps de CI. Budget : +2-3 minutes par push, +15 minutes en nightly

### 12.3 Risques residuels

| Risque residuel | Probabilite | Mitigation |
|----------------|:-----------:|------------|
| L'agent contourne les regles via `eslint-disable` abusifs | Moyenne | Danger.js : warn si > 3 `eslint-disable` dans une PR |
| Tests qui passent la mutation mais ne couvrent pas les vrais edge cases metier | Moyenne | Review humaine des tests sur les modules critiques |
| Context window trop petit pour lire tous les CLAUDE.md + ADR | Faible (modeles 200K+ tokens) | CLAUDE.md lean, skills invoquees a la demande |
| Nouvelle vulnerabilite dans une dep existante (pas hallucinee) | Certaine (long terme) | Dependabot + npm audit + Snyk/Socket en CI |
| L'agent hallucine de la documentation ou des references | Moyenne | Review humaine pour les docs, liens verifiables |

---

## 13. Plan d'implementation

| Phase | Taches | Duree estimee | Prerequis |
|-------|--------|:------------:|-----------|
| **Phase 1** | CLAUDE.md hierarchique + ESLint strict backend + Dart strict mode | 1 jour | ADR-001, ADR-024 acceptees |
| **Phase 2** | eslint-plugin-boundaries + dependency-cruiser + tests d'architecture | 1 jour | Phase 1 |
| **Phase 3** | Danger.js + quality gate CI (coverage, any count, lockfile) | 1 jour | Phase 2, ADR-025 CI pipeline |
| **Phase 4** | Generators Plop.js + templates modules NestJS | 0.5 jour | Phase 1 |
| **Phase 5** | Sub-agent code-reviewer + skills .claude/ | 0.5 jour | Phase 3 |
| **Phase 6** | Script anti-slopsquatting + verify-deps.ts | 0.5 jour | Phase 3 |
| **Phase 7** | Mutation testing nightly (Stryker) sur modules critiques | 1 jour | ADR-023, modules critiques implementes |
| **Phase 8** | Revue trimestrielle des seuils et des regles | Continu | Toutes les phases |

**Total setup initial : ~5.5 jours-homme** (realistes pour un projet qui sera developpe pendant 12-18 mois).

---

## 14. References

### Recherche et donnees

- [OpenSSF Security-Focused Guide for AI Code Assistant Instructions](https://best.openssf.org/Security-Focused-Guide-for-AI-Code-Assistant-Instructions) -- Guide de reference pour les instructions de securite dans les fichiers CLAUDE.md, copilot-instructions, etc.
- [CSA: Understanding Security Risks in AI-Generated Code](https://cloudsecurityalliance.org/blog/2025/07/09/understanding-security-risks-in-ai-generated-code) -- 62% du code IA contient des failles de design
- [CodeScene: AI Code Guardrails](https://codescene.com/resources/use-cases/prevent-ai-generated-technical-debt) -- Quality gates pour le code AI-generated
- [CodeScene: Guardrails and Metrics for AI-assisted Coding](https://codescene.com/blog/implement-guardrails-for-ai-assisted-coding) -- Metriques de sante du code
- [Mend.io: The Hallucinated Package Attack (Slopsquatting)](https://www.mend.io/blog/the-hallucinated-package-attack-slopsquatting/) -- 20% des packages recommandes par les LLM n'existent pas
- [Bleeping Computer: AI-hallucinated code dependencies](https://www.bleepingcomputer.com/news/security/ai-hallucinated-code-dependencies-become-new-supply-chain-risk/) -- 43% des noms hallucines sont repetes de maniere consistante
- [Qodo: Single-Agent vs Multi-Agent Code Review](https://www.qodo.ai/blog/single-agent-vs-multi-agent-code-review/) -- Multi-agent review reduit les biais de confirmation
- [Veracode GenAI Code Security Report](https://checkmarx.com/blog/ai-is-writing-your-code-whos-keeping-it-secure/) -- Code IA : 2.74x plus de vulnerabilites

### Outils

- [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) -- Enforcement des frontieres architecturales
- [@darraghor/eslint-plugin-nestjs-typed](https://github.com/darraghoriordan/eslint-plugin-nestjs-typed) -- Regles ESLint specifiques NestJS (decorateurs, DI)
- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) -- Validation de regles de dependances et detection de cycles
- [Danger.js](https://danger.systems/js/) -- Automatisation de checks sur les PR
- [lockfile-lint](https://github.com/lirantal/lockfile-lint) -- Verification d'integrite des lockfiles
- [typescript-eslint strict configs](https://typescript-eslint.io/users/configs/) -- Configurations strict et strict-type-checked
- [Dart linter rules](https://dart.dev/tools/linter-rules) -- Regles de lint Dart officielles
- [Flutter AI rules](https://docs.flutter.dev/ai/ai-rules) -- Regles AI pour Flutter (fichiers d'instructions)

### Claude Code et agents IA

- [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) -- Guide officiel Anthropic
- [Claude Code Custom Subagents](https://code.claude.com/docs/en/sub-agents) -- Creation de sub-agents specialises
- [Claude Code Multiple Agent Systems Guide 2026](https://www.eesel.ai/blog/claude-code-multiple-agent-systems-complete-2026-guide) -- Orchestration multi-agents
- [Agentic AI Coding: Best Practice Patterns](https://codescene.com/blog/agentic-ai-coding-best-practice-patterns-for-speed-with-quality) -- Patterns pour l'equilibre vitesse/qualite

### ADR internes BienBon

- ADR-001 : Stack backend (NestJS + Prisma + PostgreSQL)
- ADR-002 : Architecture applicative (monolithe modulaire)
- ADR-022 : Securite applicative OWASP
- ADR-023 : Strategie de tests (mutation testing, test-alongside)
- ADR-024 : Domain-Driven Design (bounded contexts, tactique leger)
- ADR-025 : CI/CD SAST, dependency scanning, secret detection
