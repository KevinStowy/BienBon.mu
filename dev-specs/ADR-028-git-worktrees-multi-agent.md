# ADR-028 : Workflow de developpement multi-agent avec git worktrees

| Champ         | Valeur                                                                  |
|---------------|-------------------------------------------------------------------------|
| **Statut**    | Propose                                                                 |
| **Date**      | 2026-02-27                                                              |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                                     |
| **Decideurs** | Equipe technique BienBon                                                |
| **Scope**     | Workflow multi-agent, git worktrees, orchestration parallele, conventions de merge, sequencement d'implementation, supervision humaine |
| **Prereqs**   | ADR-024 (DDD bounded contexts), ADR-025 (CI/CD pipeline), ADR-026 (qualite code IA guardrails) |
| **Refs**      | Documentation officielle Claude Code (worktrees, agent teams), Anthropic "Building a C compiler with parallel Claudes", incident.io retour d'experience, Simon Willison "Parallel coding agents" |

---

## 1. Contexte

### 1.1 Pourquoi cette ADR est necessaire

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. **100% du code est genere par des agents IA** (Claude Code / Claude Opus 4.6). L'humain supervise et valide.

Le projet a 26 ADR a implementer, couvrant 11 bounded contexts (ADR-024), 206 user stories, et 4 applications (backend NestJS, app consumer Flutter, app partner Flutter, admin React). Un seul humain supervise l'ensemble.

**Le probleme :** coder sequentiellement (un module a la fois, un agent a la fois) est extremement lent. Si chaque module prend 2-4 heures de travail agent, implementer les 26 ADR en sequence prend **52 a 104 heures de supervision active**. L'humain ne peut pas superviser 8 heures par jour pendant 13 jours consecutifs.

**La solution :** le developpement parallele avec **git worktrees**. Chaque agent IA travaille dans son propre worktree (une copie de travail isolee du meme repo, avec sa propre branche). L'humain lance N agents en parallele, et review les PR par batch.

### 1.2 Ce que les pionniers ont appris

Les retours d'experience de 2025-2026 convergent sur plusieurs lecons cles :

**Anthropic -- Compilateur C avec 16 agents paralleles** (fevrier 2026) :
- 16 agents paralleles, 2000+ sessions Claude Code, 100 000 lignes de Rust, $20 000 en tokens
- **Lecon #1 :** "The task verifier must be nearly perfect, otherwise Claude will solve the wrong problem." La qualite des tests est le facteur #1 de succes.
- **Lecon #2 :** Synchronisation simple par fichiers de lock (`current_tasks/`), pas d'orchestration complexe. Git push/pull entre agents suffit.
- **Lecon #3 :** La specialisation des agents (code, dedup, performance, documentation) est plus efficace que des agents generalistes.
- **Lecon #4 :** Les regressions sont le risque principal -- "New features and bugfixes frequently broke existing functionality."

**incident.io -- 4-5 agents paralleles en production** (2025) :
- Chaque session Claude Code dans son propre worktree, via une fonction bash `w` qui cree un worktree isole.
- "All your Claude conversations are stepping on each other in the same working directory -- until you discover Git Worktrees."
- **Lecon :** Plan Mode avant execution pour construire la confiance. Les developers "confidently leave Claude running in plan mode without worrying about unauthorised changes."
- **Lecon :** Resource conflicts (ports, databases) sont le premier point de friction quand on scale.

**Simon Willison -- Parallel coding agents** (octobre 2025) :
- "Code that started from your own specification is a lot less effort to review."
- L'approche "reconnaissance" : envoyer un agent pour explorer un probleme, comprendre ou sont les difficultes, puis briefer un second agent avec le contexte.
- Ne pas depasser la capacite de review humaine : "Balance parallel tasks by dedicating focus to one significant change while running auxiliary tasks simultaneously."

**Claude Code -- Support natif des worktrees** (fevrier 2026) :
- Flag `--worktree` (`-w`) pour creer un worktree isole : `claude --worktree feature-auth`
- Les worktrees sont crees dans `<repo>/.claude/worktrees/<name>` avec une branche `worktree-<name>`
- Les subagents supportent `isolation: worktree` pour travailler en parallele sans conflits
- Agent Teams (experimental) : un lead coordonne des teammates, chacun avec son propre context window, task list partagee, messagerie inter-agents
- Recommandation Anthropic : 3-5 teammates, 5-6 taches par teammate

### 1.3 Ce que cette ADR couvre

| # | Question |
|---|----------|
| Q1 | Quand utiliser les worktrees vs le flow sequentiel ? |
| Q2 | Organisation des worktrees : conventions, limites, duree de vie |
| Q3 | Strategie de merge et resolution de conflits |
| Q4 | Gestion du contexte par agent/worktree |
| Q5 | Review et validation par l'humain |
| Q6 | Orchestration des agents |
| Q7 | Sequencement optimal des 26 ADR en phases |
| Q8 | Risques du multi-agent et mitigations |

### 1.4 Ce que cette ADR ne couvre pas

- Conventions de code detaillees -> ADR-026
- Pipeline CI/CD -> ADR-025
- Structure des bounded contexts -> ADR-024
- Strategie de tests -> ADR-023

---

## 2. Q1 : Quand utiliser les worktrees vs le flow sequentiel ?

### 2.1 Matrice type de tache x workflow

| Type de tache | Workflow | Justification |
|---|---|---|
| **Setup monorepo** (scaffolding, ESLint, Prisma schema initial) | Sequentiel, un seul agent | Tout le reste en depend. Pas de parallellisme possible. |
| **Module auth** (Supabase, JWT, RBAC) | Sequentiel, supervision etroite | Module fondation, tous les autres modules en dependent via `@UseGuards()`. |
| **Schema Prisma initial** (tables communes) | Sequentiel, un seul agent | Fichier unique `schema.prisma`, point de conflit maximal. |
| **Bounded contexts independants** (Catalog, Payment, Consumer, Partner) | **Parallele via worktrees** | BCs isoles par design (ADR-024). Chaque agent dans son module, pas de fichiers partages. |
| **Modules CRUD simples** (Favorites, Reviews, Notifications) | **Parallele via worktrees** | Logique simple, peu de dependances, faible risque de conflit. |
| **Modules critiques** (Payment ledger, Ordering state machine) | Sequentiel, supervision etroite | Invariants financiers, state machines complexes. La review doit etre minutieuse. |
| **Flutter apps** (consumer, partner) | **Parallele** (repos separes) | Repos Flutter distincts (ADR-025). Zero conflit avec le backend. |
| **Admin React** | **Parallele via worktree** (dans le monorepo) | Workspace separe dans le monorepo, peu de fichiers partages avec le backend. |
| **Tests d'integration cross-modules** | Sequentiel apres merge | Necessite que les modules soient merges dans main. Teste les interfaces reelles. |
| **Infra/DevOps** (CI/CD pipelines, Docker, deploy) | Sequentiel, un seul agent | Fichiers `.github/workflows/` partages, configs globales. |

### 2.2 Regle de decision

```
L'agent peut-il travailler UNIQUEMENT dans son bounded context
(un dossier src/modules/{module}/ + ses tests) sans toucher aux
fichiers partages (schema.prisma, package.json, app.module.ts,
.github/workflows/) ?

  OUI -> Worktree parallele
  NON -> Sequentiel (ou coordination explicite)
```

### 2.3 Indicateurs pour le flow sequentiel

Un agent DOIT travailler en sequentiel si :
1. Sa tache modifie `schema.prisma` (migrations DB)
2. Sa tache modifie `app.module.ts` (enregistrement de modules NestJS)
3. Sa tache modifie `package.json` ou `package-lock.json` (nouvelles dependances)
4. Sa tache modifie `.github/workflows/` (pipelines CI/CD)
5. Sa tache a une dependance directe non mergee (ex: Ordering depend de Catalog.decrementStock() qui n'est pas encore dans main)
6. Sa tache touche a des invariants financiers ou de securite qui necessitent une supervision humaine etroite

**Exception :** Un agent peut ajouter une dependance npm dans son worktree si c'est une dependance de son module uniquement. Le conflit `package.json` sera resolu au merge par un rebase + `npm install`.

---

## 3. Q2 : Organisation des worktrees

### 3.1 Conventions de nommage

**Branches :**

```
feat/<bounded-context>/<description-courte>
fix/<bounded-context>/<description-courte>
refactor/<bounded-context>/<description-courte>
test/<bounded-context>/<description-courte>
```

Exemples :
```
feat/catalog/basket-crud-and-stock
feat/payment/ledger-double-entry
feat/ordering/reservation-state-machine
feat/consumer/profile-and-favorites
feat/notifications/fcm-email-inapp
fix/payment/commission-rounding-edge-case
refactor/catalog/extract-stock-service
```

**Worktrees :**

Le flag `--worktree` de Claude Code cree automatiquement dans `.claude/worktrees/<name>`.

```bash
# Methode recommandee : utiliser le flag Claude Code natif
claude --worktree catalog-baskets
# Cree : .claude/worktrees/catalog-baskets/
# Branche : worktree-catalog-baskets

# Methode manuelle (si besoin de nommer la branche differemment)
git worktree add .claude/worktrees/payment-ledger -b feat/payment/ledger-double-entry
cd .claude/worktrees/payment-ledger && claude
```

**Convention :** le nom du worktree = `<bounded-context>-<feature>` en kebab-case.

### 3.2 Limites de worktrees simultanes

| Ressource | Limite pratique | Justification |
|---|---|---|
| **RAM** | 2-4 GB par worktree actif (npm install + Vitest + agent) | Sur 16 GB : max 4 worktrees. Sur 32 GB : max 6-8. |
| **CPU** | 1-2 cores par agent en execution active | Les agents ne sont pas CPU-bound en permanence (ils attendent les API calls). |
| **Capacite de review humaine** | **3-4 PR en parallele** | Le facteur limitant reel. Au-dela, l'humain perd le fil. |
| **Tokens/cout** | ~$3-8 par module complet (estimation) | Budget a anticiper : 26 modules x $5 avg = ~$130 total. |

**Recommandation : 3 worktrees simultanes maximum** pour un seul humain superviseur.

Raison : chaque PR necessite 15-30 minutes de review humaine. Avec 3 agents en parallele, l'humain a un roulement continu : pendant qu'il review la PR de l'agent A, les agents B et C codent. Quand il finit la review de A, B ou C a termine et soumis sa PR.

### 3.3 Duree de vie d'un worktree

| Scenario | Duree de vie | Nettoyage |
|---|---|---|
| **Feature complete** (un module entier) | 2-6 heures | Merge la PR, supprimer le worktree. |
| **Sous-feature** (ex: CRUD baskets, puis stock, puis recurrence) | 1-2 heures par sous-feature | Merge chaque PR, reutiliser le worktree avec rebase sur main. |
| **Exploration/spike** | 30 min - 1 heure | Evaluer, jeter ou garder. Claude Code nettoie auto si pas de changements. |
| **Session interrompue** | Persiste jusqu'a reprise | `claude --continue` dans le worktree pour reprendre. |

**Regle :** un worktree ne devrait pas vivre plus de **24 heures**. Au-dela, le delta avec main devient trop grand et les conflits de merge augmentent exponentiellement.

### 3.4 Initialisation d'un worktree

Chaque nouveau worktree necessite une initialisation. Script recommande :

```bash
#!/bin/bash
# scripts/init-worktree.sh
# Usage: ./scripts/init-worktree.sh <worktree-name>

WORKTREE_NAME=$1
WORKTREE_PATH=".claude/worktrees/$WORKTREE_NAME"

echo "--- Initialisation du worktree $WORKTREE_NAME ---"

# 1. Installer les dependances (npm workspaces)
cd "$WORKTREE_PATH" && npm ci

# 2. Generer le client Prisma
npx prisma generate

# 3. Verifier que le lint passe
npm run lint -- --quiet

# 4. Verifier que les tests passent
npx vitest run --reporter=dot

echo "--- Worktree $WORKTREE_NAME pret ---"
```

### 3.5 Gitignore

Ajouter a `.gitignore` racine du monorepo :

```gitignore
# Worktrees Claude Code (ADR-028)
.claude/worktrees/
```

---

## 4. Q3 : Strategie de merge et resolution de conflits

### 4.1 Fichiers partages -- la source de tous les conflits

Dans le monorepo BienBon, les fichiers partages entre bounded contexts sont :

| Fichier | Risque de conflit | Strategie |
|---|---|---|
| `prisma/schema.prisma` | **Tres eleve** | Un seul agent modifie le schema a la fois. Les autres attendent. |
| `apps/backend/src/app.module.ts` | **Eleve** | Chaque agent ajoute son module. Merge manuel simple (ajout de ligne). |
| `package.json` / `package-lock.json` | **Moyen** | Rebase + `npm install` apres merge. |
| `.github/workflows/*.yml` | **Faible** | Rarement modifies en parallele. Un agent infra dedie. |
| `packages/shared-types/` | **Moyen** | Types partages. Coordination : definir les interfaces AVANT le travail parallele. |
| `packages/api-contract/` | **Moyen** | Schemas OpenAPI/Zod. Definir les endpoints AVANT le travail parallele. |

### 4.2 Strategie de merge : "Schema First, Modules After"

```
ETAPE 1 : Schema Prisma                    [SEQUENTIEL - 1 agent]
  L'agent cree le schema complet (tables, relations, indexes)
  pour tous les bounded contexts prévus.
  Merge dans main.

ETAPE 2 : Interfaces publiques             [SEQUENTIEL - 1 agent]
  L'agent definit les interfaces (ports) de chaque module :
  - PaymentService interface (preAuthorize, capture, refund...)
  - CatalogService interface (decrementStock, getBasket...)
  - NotificationService interface (send, schedule...)
  Merge dans main.

ETAPE 3 : Implementation des modules       [PARALLELE - N agents]
  Chaque agent implemente un bounded context.
  Il a le schema Prisma et les interfaces dans main.
  Il n'a PAS besoin de toucher aux fichiers partages.
  Il code les implementations concretes de ses interfaces.

ETAPE 4 : Integration                      [SEQUENTIEL - 1 agent]
  Un agent branche les modules ensemble dans app.module.ts.
  Tests d'integration cross-modules.
```

### 4.3 Ordre de merge des PR

L'ordre de merge est critique. Regle : **les modules fondation d'abord, les modules dependants ensuite.**

```
Priorite 1 (merge en premier) :
  feat/identity/auth-supabase-rbac
  feat/schema/initial-prisma-schema
  feat/shared/module-interfaces

Priorite 2 (merge apres Priorite 1) :
  feat/catalog/basket-crud-stock        # Depend du schema
  feat/payment/ledger-double-entry      # Depend du schema
  feat/partner/onboarding-stores        # Depend du schema + auth
  feat/consumer/profile-favorites       # Depend du schema + auth

Priorite 3 (merge apres les modules dont ils dependent) :
  feat/ordering/reservation-state-machine  # Depend de Catalog + Payment
  feat/claims/state-machine-refund         # Depend de Ordering + Payment
  feat/notifications/fcm-email-inapp       # Depend de tous (downstream)
  feat/fraud/rules-counters-alerts         # Depend de Ordering (events)

Priorite 4 (merge en dernier) :
  feat/admin/dashboard-moderation          # Consomme les donnees de tous
  feat/integration/e2e-reservation-flow    # Tests end-to-end cross-modules
```

### 4.4 Resolution de conflits

| Scenario | Qui resout ? | Comment ? |
|---|---|---|
| **Conflit sur schema.prisma** | L'humain | Ne devrait pas arriver si la regle "un agent a la fois" est respectee. Si ca arrive : merge manuel, re-run `prisma generate`. |
| **Conflit sur app.module.ts** | Un agent de merge dedie | Conflit trivial (ajout de lignes). L'agent rebase, ajoute les imports manquants. |
| **Conflit sur package.json** | Un agent de merge dedie | Rebase, `npm install`, verifier que les deps ne conflictent pas. |
| **Conflit sur du code metier** | **L'humain** | Deux agents ont touche au meme fichier metier -> violation de bounded context. Analyser pourquoi et corriger l'architecture. |
| **Conflit sur les tests** | Un agent | Rebase, re-run les tests. Si un test d'un autre module casse, c'est un signal d'alarme architectural. |

### 4.5 Commandes de merge recommandees

```bash
# Depuis le worktree, avant de soumettre la PR :
git fetch origin main
git rebase origin/main            # Pas de merge commit, historique lineaire (ADR-025)

# Si conflit :
git rebase --abort                # En cas de doute, avorter et demander a l'humain

# Merge de la PR dans main (via GitHub) :
# Utiliser "Squash and merge" (ADR-025) pour un commit propre par feature
```

---

## 5. Q4 : Gestion du contexte par agent/worktree

### 5.1 Hierarchie des fichiers de contexte

L'ADR-026 a defini une hierarchie CLAUDE.md (racine + par workspace). Pour les worktrees, cette hierarchie fonctionne naturellement :

```
bienbon/                              # Repo principal
  CLAUDE.md                           # Regles universelles (~40 lignes)
  .claude/
    agents/
      code-reviewer.md                # Sub-agent review (ADR-026)
    skills/
      nestjs-module.md                # Skill creation module NestJS
      ...
  apps/backend/
    CLAUDE.md                         # Conventions backend NestJS (~50 lignes)
  .claude/worktrees/
    catalog-baskets/                   # Worktree agent A
      (copie complete du repo)
      (CLAUDE.md racine + backend/ sont automatiquement charges)
    payment-ledger/                    # Worktree agent B
      (copie complete du repo)
```

**Pas besoin de CLAUDE.md par worktree.** Chaque worktree est une copie complete du repo, donc il herite automatiquement des CLAUDE.md existants.

### 5.2 Template de briefing agent

Quand l'humain lance un agent dans un worktree, il doit lui donner un **briefing initial** clair. Template recommande :

```markdown
## Briefing : Module {NOM_DU_MODULE}

### Ton perimetre
Tu travailles sur le bounded context **{BC_NAME}** (ADR-024 section {X.X}).
Tes fichiers sont dans `apps/backend/src/modules/{module-name}/`.
Tu NE DOIS PAS modifier de fichiers en dehors de ce dossier
(sauf les tests dans `apps/backend/test/{module-name}/`).

### ADR de reference
Lis et applique les ADR suivantes :
- ADR-024 section {X.X} : {BC_NAME} -- entites, frontieres, invariants
- ADR-{NNN} : {titre} -- decision specifique a ce module
- ADR-026 : conventions de code et guardrails

### Interfaces avec les autres modules
Tu consommes ces interfaces (deja definies dans main) :
- `{InterfaceName}` depuis `@modules/{other-module}/ports/` : {description}

Tu exposes ces interfaces (a implementer) :
- `{InterfaceName}` : {methodes et signatures}

### Domain events
Tu ecoutes : {liste des events recus}
Tu emets : {liste des events emis}

### Schema Prisma
Les tables de ton module sont deja definies dans `prisma/schema.prisma` :
- `{table1}`, `{table2}`, `{table3}`
N'ajoute PAS de nouvelles tables sans validation humaine.

### Livrables attendus
1. [ ] Module NestJS complet (`{module-name}.module.ts`)
2. [ ] Service(s) avec implementation des interfaces
3. [ ] Controller(s) avec DTOs et validation
4. [ ] Tests unitaires (>= 80% coverage)
5. [ ] Tests d'integration pour les endpoints
6. [ ] Domain events emission (si applicable)

### Commandes de validation
```bash
cd apps/backend
npm run lint
npx vitest run --reporter=verbose src/modules/{module-name}/
```
```

### 5.3 Memory files : partages, pas par worktree

Les memory files Claude Code (`~/.claude/memory/`) sont globaux a l'utilisateur. Dans un contexte multi-agent :

- Les memory files sont **partages** entre toutes les sessions
- C'est un avantage : les lecons apprises par un agent sont disponibles pour les autres
- Risque : un agent ecrit un memory qui contredit le contexte d'un autre
- **Mitigation :** le CLAUDE.md racine est la source de verite. Les memory files sont des hints supplementaires, pas des overrides.

### 5.4 Contexte ADR par module

Pour eviter de surcharger le contexte d'un agent, ne lui donner que les ADR pertinentes :

| Bounded Context | ADR a charger dans le prompt |
|---|---|
| Identity & Access | 001, 010, 011, 022, 024 (BC-1) |
| Consumer | 001, 024 (BC-2), 015 (i18n) |
| Partner | 001, 017 (state machines), 018 (approbation), 024 (BC-3) |
| Catalog | 001, 008 (stock), 017 (state machines), 024 (BC-4) |
| Ordering | 001, 008 (stock), 017 (state machines), 024 (BC-5) |
| Payment | 001, 005 (paiement), 006 (PCI-DSS), 007 (ledger), 024 (BC-6) |
| Review & Claims | 001, 017 (state machines), 024 (BC-8) |
| Notification | 001, 009 (temps reel), 014 (notifications), 024 (BC-9) |
| Fraud | 001, 019 (detection fraude), 024 (BC-10) |
| Admin | 001, 018 (approbation), 024 (BC-11), 011 (RBAC) |
| Flutter apps | 012 (offline), 015 (i18n), 016 (geolocalisation) |

---

## 6. Q5 : Review et validation

### 6.1 Mode de review : batch synchronise, pas un par un

L'humain ne review pas les PR au fil de l'eau (interruptions constantes). Il travaille en **cycles de review** :

```
CYCLE DE TRAVAIL (repetition de 2-3 heures) :

  [10 min] Briefer et lancer 3 agents dans 3 worktrees
       |
       v
  [60-120 min] Les agents travaillent. L'humain fait autre chose
               (spec, ADR, design, tests manuels, coordination).
       |
       v
  [45-90 min] Review batch : 3 PR soumises, l'humain les review
              une par une. Merge ou demande de corrections.
       |
       v
  [10 min] Rebaser les worktrees sur main, briefer les agents
           pour le cycle suivant.
```

### 6.2 Checklist de review par type de module

**Module DDD (Ordering, Payment, Catalog, Partner, Claims) :**
- [ ] Les invariants du bounded context (ADR-024) sont respectes
- [ ] La state machine (ADR-017) est correctement implementee
- [ ] Les domain events sont emis aux bons moments
- [ ] Les interfaces (ports) sont implementees conformement aux specs
- [ ] Les tests couvrent les cas limites et les transitions d'etat
- [ ] Pas d'import cross-module direct (eslint-plugin-boundaries)
- [ ] Les DTOs valident toutes les entrees (class-validator)
- [ ] Le code ne contient pas de `any`, `console.log`, `eval`

**Module CRUD (Favorites, Reviews, Notifications, Media) :**
- [ ] Le CRUD est complet (create, read, update, delete)
- [ ] Les guards d'ownership sont en place (ADR-022)
- [ ] La pagination est implementee pour les listes
- [ ] Les tests couvrent happy path + erreurs
- [ ] Les DTOs valident les entrees

**Flutter app :**
- [ ] Architecture BLoC respectee (pas de setState dans les ecrans)
- [ ] Navigation via go_router
- [ ] i18n via ARB files (pas de strings hardcodees)
- [ ] Pas de tailles/couleurs hardcodees
- [ ] Tests widget pour les ecrans principaux

### 6.3 Tests d'integration cross-modules apres merge

Apres chaque batch de merges, l'humain lance un agent d'integration :

```bash
# Agent d'integration dans le repo principal (pas un worktree)
cd bienbon/
claude

> Les modules suivants viennent d'etre merges : catalog, payment, ordering.
> Lance les tests d'integration cross-modules.
> Verifie que :
> 1. Le flux reservation complet fonctionne (reserver -> payer -> retirer)
> 2. Les domain events sont correctement emis et recus
> 3. Le ledger enregistre les bonnes ecritures
> 4. Les state machines transitionnent correctement
```

### 6.4 Le sub-agent code-reviewer (ADR-026)

Avant la review humaine, chaque PR passe par un sub-agent de review automatise (defini dans `.claude/agents/code-reviewer.md`). Ce sub-agent :
- Verifie la conformite avec les conventions (ADR-026)
- Detecte les patterns interdits
- Verifie que les tests existent et passent
- Signale les imports cross-module
- Evalue la complexite cyclomatique

L'humain review ensuite avec les commentaires du sub-agent comme guide.

---

## 7. Q6 : Orchestration des agents

### 7.1 Decision : orchestration manuelle par l'humain

Trois options d'orchestration ont ete evaluees :

| Option | Description | Pour | Contre |
|---|---|---|---|
| **A** : Humain ouvre N terminaux | L'humain lance `claude --worktree X` dans N terminaux | Simple, controle total | Fastidieux, pas de coordination auto |
| **B** : Agent Teams Claude Code | Un lead coordonne des teammates automatiquement | Coordination automatique, task list partagee | Experimental, cout tokens 3-4x, limitations connues |
| **C** : Script d'orchestration custom | Un script bash lance N agents headless | Automatise, reproductible | Complexe a maintenir, pas de supervision interactive |

**Decision : Option A pour la phase initiale, migration vers Option B quand Agent Teams sera stable.**

**Justification :**
1. Agent Teams est encore **experimental** (fevrier 2026) avec des limitations connues : pas de session resumption des teammates, task status qui peut laguer, shutdown lent.
2. Pour un seul humain superviseur avec 3 agents paralleles, l'overhead de coordination manuelle est faible (10 min de briefing par cycle).
3. L'humain garde le controle total sur le sequencement et les priorites.
4. Le cout en tokens est 1x au lieu de 3-4x (pas de lead agent qui consomme des tokens pour coordonner).

**Migration vers Agent Teams :** quand la fonctionnalite sera stable et que le cout de coordination manuelle depassera le cout en tokens de Agent Teams (probablement quand l'equipe passe a 2+ superviseurs ou 5+ agents paralleles).

### 7.2 Workflow de l'humain superviseur

```
┌──────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW SUPERVISEUR HUMAIN                        │
│                                                                      │
│  1. PLANIFIER                                                        │
│     Consulter le backlog des modules a implementer.                  │
│     Identifier 3 modules independants (pas de dependances croisees). │
│     Verifier que les prereqs sont dans main (schema, interfaces).    │
│                                                                      │
│  2. BRIEFER & LANCER                                                 │
│     Terminal 1 : claude --worktree catalog-baskets                   │
│       > [Coller le briefing module Catalog]                          │
│     Terminal 2 : claude --worktree payment-ledger                    │
│       > [Coller le briefing module Payment]                          │
│     Terminal 3 : claude --worktree consumer-profile                  │
│       > [Coller le briefing module Consumer]                         │
│                                                                      │
│  3. SUPERVISER (passif)                                              │
│     Configurer les notifications (hook Notification de Claude Code). │
│     Les agents travaillent. L'humain fait du travail de spec, design │
│     ou admin. Il est notifie quand un agent a besoin d'input.        │
│                                                                      │
│  4. REVIEW BATCH                                                     │
│     Les agents soumettent leurs PR.                                  │
│     L'humain review avec la checklist (section 6.2).                 │
│     Sub-agent code-reviewer a deja commente la PR.                   │
│     Merge ou demande de corrections.                                 │
│                                                                      │
│  5. INTEGRATION                                                      │
│     Lancer les tests d'integration cross-modules.                    │
│     Corriger les problemes d'integration (un seul agent).            │
│                                                                      │
│  6. ITERER                                                           │
│     Nettoyer les worktrees termines.                                 │
│     Rebaser les worktrees actifs sur main.                           │
│     Retour a l'etape 1 pour le prochain batch.                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.3 Suivi de l'avancement

L'humain utilise un fichier `dev-specs/IMPLEMENTATION-TRACKER.md` comme dashboard :

```markdown
# Implementation Tracker

## Phase 1 : Fondations (sequentiel)
- [x] ADR-025 : Setup monorepo, npm workspaces, ESLint
- [x] ADR-001/003 : Schema Prisma initial (toutes les tables)
- [x] ADR-010/011 : Module auth + RBAC
- [x] ADR-024 : Interfaces publiques des modules

## Phase 2 : Modules independants (parallele)
- [x] Catalog (baskets, stock, recurrence)     -- PR #12, merged
- [ ] Payment (ledger, PSP, commissions)        -- PR #13, en review
- [ ] Partner (onboarding, stores, mod requests) -- Agent en cours
- [ ] Consumer (profile, favorites, badges)     -- Agent en cours
- [ ] Notifications (FCM, email, in-app)        -- Backlog

## Phase 3 : Modules dependants (sequentiel)
- [ ] Ordering (reservation state machine)      -- Bloque par Catalog + Payment
- [ ] Fulfillment (pickup QR/PIN)               -- Bloque par Ordering
- [ ] Claims (state machine, refund)            -- Bloque par Ordering + Payment

## Phase 4 : Modules auxiliaires (parallele)
- [ ] Fraud (rules, counters, alerts)
- [ ] Admin (dashboard, moderation)
- [ ] Reviews (notes, comments)

## Phase 5 : Integration & Flutter
- [ ] Tests E2E reservation flow complet
- [ ] Flutter consumer app
- [ ] Flutter partner app
```

### 7.4 Notifications

Configurer les hooks de notification Claude Code pour etre prevenu quand un agent a besoin d'attention :

```json
// .claude/settings.json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "command": "notify-send 'Claude Code' 'Un agent a besoin de votre attention'"
      }
    ]
  }
}
```

---

## 8. Q7 : Sequencement optimal des 26 ADR en phases

### 8.1 Graphe de dependances des ADR

```
ADR-001 (stack)
  └── ADR-002 (architecture) ─── ADR-024 (DDD)
  └── ADR-003 (schema DB)    ─── ADR-024 (DDD)
  └── ADR-004 (API)
  └── ADR-010 (auth)         ─── ADR-011 (RBAC)
  └── ADR-022 (securite)     ─── ADR-025 (CI/CD) ─── ADR-026 (qualite IA)
  └── ADR-023 (tests)

ADR-005 (paiement) ─── ADR-006 (PCI-DSS) ─── ADR-007 (ledger)
ADR-008 (stock) ─── depend de ADR-003
ADR-009 (temps reel)
ADR-012 (offline) ─── Flutter
ADR-013 (PWA) ─── Frontend web
ADR-014 (notifications) ─── depend de ADR-009
ADR-015 (i18n)
ADR-016 (geolocalisation) ─── Flutter
ADR-017 (state machines) ─── depend de ADR-003
ADR-018 (approbation) ─── depend de ADR-017 + ADR-011
ADR-019 (fraude) ─── depend de ADR-017
ADR-020 (hebergement)
ADR-021 (RGPD/data protection)
```

### 8.2 Plan de sequencement en 5 phases

#### Phase 1 : Fondations (semaine 1) -- SEQUENTIEL

Tout le reste en depend. Un seul agent a la fois, supervision etroite.

| Ordre | Tache | ADR | Duree estimee | Dependances |
|---|---|---|---|---|
| 1.1 | Setup monorepo, npm workspaces, ESLint, Prettier, Husky | 025 | 2h | - |
| 1.2 | Schema Prisma complet (toutes les tables des 11 BC) | 003, 024 | 4h | 1.1 |
| 1.3 | Module auth (Supabase, JWT, guards, RBAC) | 010, 011 | 4h | 1.1, 1.2 |
| 1.4 | Interfaces publiques des modules (ports) | 024 | 3h | 1.2 |
| 1.5 | Config CI/CD GitHub Actions (pipeline backend) | 025 | 2h | 1.1 |
| 1.6 | Setup module common (decorators, filters, interceptors, pipes) | 001, 022 | 2h | 1.1 |

**Duree totale Phase 1 : ~17h de travail agent, ~3-4 jours avec supervision.**

#### Phase 2 : Bounded contexts independants (semaines 2-3) -- PARALLELE

Les 5 modules suivants sont independants les uns des autres. Ils dependent tous de la Phase 1 (schema + auth + interfaces).

| Batch | Agent A | Agent B | Agent C |
|---|---|---|---|
| **2.1** | **Catalog** (BC-4) : baskets CRUD, stock atomique (ADR-008), recurrence, tags, state machine basket (ADR-017) | **Payment** (BC-6) : ledger double-entry (ADR-007), Peach Payments integration (ADR-005), commissions, payouts | **Partner** (BC-3) : onboarding, stores CRUD, modification requests (ADR-018), state machine partner (ADR-017) |
| **2.2** | **Consumer** (BC-2) : profile, preferences, favorites, gamification, referrals | **Notification** (BC-9) : FCM push, email Resend, in-app, preferences, rappels schedules (ADR-014) | **Fraud** (BC-10) : regles configurables (ADR-019), compteurs Redis, alertes, suspension auto |

**Batch 2.1** : 3 agents paralleles. Chaque module prend 4-6h agent. L'humain review 3 PR apres.
**Batch 2.2** : 3 agents paralleles. Modules plus simples, 2-4h agent chacun.

**Duree totale Phase 2 : ~30h de travail agent, ~1.5 semaine avec 3 agents paralleles.**

#### Phase 3 : Modules dependants (semaine 3-4) -- SEQUENTIEL avec supervision

Ces modules dependent de Catalog, Payment et Partner. Ils doivent etre codes apres le merge de la Phase 2.

| Ordre | Tache | Depend de | Duree |
|---|---|---|---|
| 3.1 | **Ordering** (BC-5) : reservation state machine 8 etats (ADR-017), orchestration Catalog.decrementStock + Payment.preAuthorize, hold 5 min, concurrence | Catalog, Payment | 6h |
| 3.2 | **Fulfillment** : pickup QR/PIN, no-show detection, rappels (sous-module de Ordering) | Ordering | 3h |
| 3.3 | **Claims** (BC-8) : state machine reclamations (ADR-017), photos, remboursement via Payment.refund() | Ordering, Payment | 3h |
| 3.4 | **Reviews** (BC-8) : notes/avis post-retrait, moderation, fenetre 24h | Ordering | 2h |

**Note :** 3.3 et 3.4 peuvent etre parallelises (2 agents) puisqu'ils sont dans le meme BC mais sur des sous-modules distincts.

**Duree totale Phase 3 : ~14h de travail agent, ~1 semaine avec supervision.**

#### Phase 4 : Admin, temps reel et transversal (semaine 4-5) -- MIXTE

| Batch | Agent A | Agent B | Agent C |
|---|---|---|---|
| **4.1** | **Admin** (BC-11) : dashboard KPI, moderation queue, config plateforme, audit trail (ADR-018) | **Temps reel** : WebSocket gateway, SSE stock updates (ADR-009) | **i18n backend** : messages localises, templates email FR/EN/Creole (ADR-015) |
| **4.2** | **PWA / site vitrine** : Astro, SEO, pages marketing (ADR-013) | **Emails** : 14 templates transactionnels Resend (ADR-014) | **API contract** : generation OpenAPI, client Dart (ADR-004) |

**Duree totale Phase 4 : ~24h de travail agent, ~1 semaine avec parallellisme.**

#### Phase 5 : Flutter apps et integration E2E (semaines 5-7) -- PARALLELE (repos separes)

Les apps Flutter sont dans des repos separes (ADR-025). Aucun conflit avec le backend.

| Batch | Agent A (repo consumer) | Agent B (repo partner) | Agent C (repo backend) |
|---|---|---|---|
| **5.1** | **Consumer app** : navigation, ecrans principaux, BLoC, theme | **Partner app** : navigation, ecrans, BLoC, theme | **Tests E2E** : flux reservation complet, integration cross-modules |
| **5.2** | Consumer : panier, reservation, paiement, QR retrait | Partner : creation paniers, gestion stock, validation retrait | Tests E2E : paiement, fulfillment, claims |
| **5.3** | Consumer : profil, favoris, gamification, notifications | Partner : analytics, reversements, moderation | Tests de charge, securite, RGPD |

**Duree totale Phase 5 : ~40h de travail agent, ~2 semaines avec 3 agents paralleles.**

### 8.3 Resume du plan

```
Semaine 1   : Phase 1 (fondations)           17h agent, sequentiel
Semaines 2-3: Phase 2 (BC independants)       30h agent, 3 paralleles
Semaines 3-4: Phase 3 (modules dependants)    14h agent, sequentiel/2 paralleles
Semaines 4-5: Phase 4 (admin, transversal)    24h agent, 3 paralleles
Semaines 5-7: Phase 5 (Flutter, E2E)          40h agent, 3 paralleles
                                             ─────────────────────────
TOTAL                                        ~125h de travail agent
                                             ~7 semaines calendaires
                                             ~$300-650 en tokens (estimation)
```

**Comparaison avec le sequentiel pur :** ~125h sequentielles = 16+ jours de 8h = 3+ semaines calendaires, sans parallellisme, sans repos. Le multi-agent reduit a ~7 semaines calendaires avec un rythme de 4-5h/jour de supervision.

---

## 9. Q8 : Risques du multi-agent et mitigations

### 9.1 Matrice des risques

| # | Risque | Probabilite | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Inconsistance de style entre agents** | Tres elevee | Moyen | CLAUDE.md hierarchique (ADR-026), ESLint strict, sub-agent code-reviewer. |
| R2 | **Conflits de merge sur fichiers partages** | Elevee | Moyen | Strategie "Schema First" (section 4.2), un seul agent sur les fichiers partages. |
| R3 | **Un agent casse les tests d'un autre module** | Moyenne | Eleve | Tests d'integration cross-modules apres chaque batch de merge (section 6.3). CI bloquante. |
| R4 | **Duplication de code entre agents** | Elevee | Moyen | Definir les utilitaires partages en Phase 1 (`packages/shared-types/`, `common/`). Sub-agent dedup apres merge. |
| R5 | **L'humain perd le fil** | Elevee | Eleve | Max 3 agents paralleles. IMPLEMENTATION-TRACKER.md. Cycles de review batch. Notifications. |
| R6 | **Delta trop grand avec main** | Moyenne | Eleve | Worktrees < 24h de vie. Rebase frequent. Petites PR (1 module = 1 PR). |
| R7 | **Agent qui diverge du brief** | Moyenne | Moyen | Briefing structure (section 5.2). Plan Mode pour valider l'approche avant execution. |
| R8 | **Cout en tokens qui explose** | Faible | Moyen | Budget plafonne par session. Monitoring du cout via les logs Claude Code. |
| R9 | **Regressions apres merge** | Elevee | Eleve | CI pipeline bloquante (ADR-025). Tests d'integration obligatoires. Pas de merge sans green CI. |
| R10 | **Interfaces incompatibles entre modules** | Moyenne | Eleve | Definir les interfaces AVANT le travail parallele (Phase 1, etape 1.4). Les agents implementent, pas definissent. |

### 9.2 Mitigations detaillees pour les risques critiques

**R5 : L'humain perd le fil**

C'est le risque le plus pernicieux. L'humain supervise 3 agents qui codent chacun 300-800 lignes. En 2 heures, il a 900-2400 lignes a reviewer. Strategies :

1. **Max 3 agents paralleles.** Pas 5, pas 8. Trois.
2. **PR courtes.** Chaque PR = un module ou sous-module. Pas de PR "4 modules en un".
3. **IMPLEMENTATION-TRACKER.md** mis a jour apres chaque cycle.
4. **Session naming.** Chaque session Claude Code est nommee (`/rename catalog-baskets-v1`) pour la retrouver facilement via `claude --resume`.
5. **Notifications.** Hook `Notification` pour etre prevenu quand un agent est idle ou attend un input.

**R9 : Regressions apres merge**

Les regressions sont le risque #1 identifie par Anthropic dans le projet compilateur. Strategies :

1. **CI pipeline bloquante** (ADR-025) : aucun merge possible sans green CI.
2. **Tests d'integration post-merge** : un agent dedie lance les tests cross-modules apres chaque batch.
3. **Squash merge** : chaque PR est un commit unique dans main. Facile a reverter si necessaire.
4. **Feature flags** (pour les modules critiques) : deployer desactive, valider en staging, activer en production.

**R10 : Interfaces incompatibles entre modules**

Si l'agent A implemente `PaymentService.preAuthorize(orderId: string, amount: number)` et l'agent B appelle `PaymentService.preAuthorize({ orderId, amount, currency })`, c'est la catastrophe. Strategies :

1. **Interfaces definies en Phase 1** (etape 1.4) avant tout travail parallele.
2. **Les interfaces sont des fichiers TypeScript dans `packages/shared-types/`** : types, pas des implementations.
3. **Lint rule** : un module ne peut pas importer l'implementation d'un autre module, seulement son interface publique.
4. **Tests contract** : chaque interface a un test qui verifie la signature.

---

## 10. Diagrammes recapitulatifs

### 10.1 Cycle de vie d'un worktree

```
                     ┌──────────────────┐
                     │   PLANIFICATION   │
                     │   (humain)        │
                     │                  │
                     │ Identifier le    │
                     │ module a coder.  │
                     │ Verifier les     │
                     │ prereqs dans     │
                     │ main.            │
                     └────────┬─────────┘
                              │
                     ┌────────v─────────┐
                     │   CREATION        │
                     │                  │
                     │ claude --worktree │
                     │   module-name     │
                     │                  │
                     │ npm ci            │
                     │ prisma generate   │
                     └────────┬─────────┘
                              │
                     ┌────────v─────────┐
                     │   BRIEFING        │
                     │                  │
                     │ Coller le brief   │
                     │ du module.        │
                     │ (template 5.2)    │
                     │                  │
                     │ Optionnel :       │
                     │ Plan Mode pour    │
                     │ valider approche. │
                     └────────┬─────────┘
                              │
                     ┌────────v─────────┐
                     │   EXECUTION       │
                     │                  │
                     │ L'agent code.     │
                     │ Commit reguliers. │
                     │ Tests locaux.     │
                     │                  │
                     │ Si besoin input : │
                     │ notification      │
                     │ a l'humain.       │
                     └────────┬─────────┘
                              │
                     ┌────────v─────────┐
                     │   SOUMISSION PR   │
                     │                  │
                     │ git push          │
                     │ gh pr create      │
                     │                  │
                     │ Sub-agent review  │
                     │ commente la PR.   │
                     └────────┬─────────┘
                              │
                     ┌────────v─────────┐
                     │   REVIEW HUMAINE  │
                     │                  │
                     │ Checklist 6.2.    │
                     │ Merge ou feedback │
                     │ de corrections.   │
                     └────────┬─────────┘
                              │
                ┌─────────────┴──────────────┐
                │                            │
       ┌────────v─────────┐        ┌─────────v────────┐
       │   MERGE OK        │        │   CORRECTIONS     │
       │                  │        │                  │
       │ Squash merge     │        │ L'humain donne   │
       │ dans main.       │        │ le feedback.     │
       │                  │        │ L'agent corrige  │
       │ Supprimer le     │        │ dans le meme     │
       │ worktree.        │        │ worktree.        │
       │                  │        │ Retour a          │
       │ git worktree     │        │ SOUMISSION PR.   │
       │   remove ...     │        │                  │
       └──────────────────┘        └──────────────────┘
```

### 10.2 Vue d'ensemble du parallellisme par phase

```
Semaine  1         2         3         4         5         6         7
         |---------|---------|---------|---------|---------|---------|
Phase 1  ████████████
         [sequentiel: setup, schema, auth, interfaces, CI]

Phase 2            ███████████████████
         Agent A:  [====Catalog====]  [==Consumer==]
         Agent B:  [====Payment====]  [==Notif.====]
         Agent C:  [====Partner====]  [==Fraud=====]

Phase 3                      ████████████
         Agent A:            [========Ordering========]
         Agent B:                     [==Claims==][Reviews]
         Agent C:                     [=Fulfillment=]

Phase 4                                ██████████████
         Agent A:                      [====Admin====]
         Agent B:                      [==Realtime==][i18n]
         Agent C:                      [=PWA=][Emails][API]

Phase 5                                          █████████████████████
         Agent A (consumer repo):                [===Flutter Consumer===]
         Agent B (partner repo):                 [===Flutter Partner====]
         Agent C (backend repo):                 [===Tests E2E==========]
```

---

## 11. Recommandations pour l'humain superviseur

### 11.1 Avant de lancer les agents

1. **Verifier que main est stable.** Tous les tests passent. CI verte.
2. **Identifier 3 modules independants** qui ne partagent pas de fichiers.
3. **Verifier que les prereqs sont dans main** (schema, interfaces, auth).
4. **Preparer les briefings** avec le template (section 5.2).
5. **Estimer le temps** : les modules DDD prennent 4-6h, les CRUD 2-3h.

### 11.2 Pendant l'execution des agents

1. **Ne pas interrompre les agents sauf urgence.** Les interruptions cassent le flow et le contexte.
2. **Utiliser les notifications** pour etre prevenu quand un agent est idle.
3. **Faire autre chose d'utile :** rediger des specs, preparer les briefings du prochain batch, reviewer les ADR, tester manuellement les features mergees.
4. **Si un agent semble bloquer** (10+ minutes sans activite), verifier son etat. Donner un hint ou rediriger.

### 11.3 Pendant la review

1. **Commencer par le rapport du sub-agent code-reviewer.** Il a deja identifie les problemes evidents.
2. **Verifier les invariants du BC** (ADR-024) en priorite. Un bug de logique metier est plus grave qu'un probleme de style.
3. **Lancer les tests localement** si la CI n'est pas encore configuree.
4. **Merger dans l'ordre de priorite** (section 4.3).
5. **Ne pas merger une PR avec des tests cassees.** Jamais. Meme "temporairement".

### 11.4 Apres le merge

1. **Mettre a jour IMPLEMENTATION-TRACKER.md.**
2. **Lancer les tests d'integration cross-modules** si les modules merges interagissent.
3. **Rebaser les worktrees actifs sur main** : `cd .claude/worktrees/X && git fetch origin main && git rebase origin/main`
4. **Nettoyer les worktrees termines** : `git worktree remove .claude/worktrees/X`
5. **Faire un commit "checkpoint"** de IMPLEMENTATION-TRACKER.md dans main.

### 11.5 Erreurs courantes a eviter

| Erreur | Pourquoi c'est un probleme | Alternative |
|---|---|---|
| Lancer 5+ agents en parallele | Capacite de review depassee. L'humain merge sans lire. | Max 3 agents. |
| Pas de briefing structure | L'agent interprete librement les specs. Resultat imprevisible. | Template de briefing obligatoire. |
| Laisser un worktree vivre 3+ jours | Delta enorme avec main, merge conflicts catastrophiques. | Max 24h, rebase quotidien. |
| Merger sans tests CI | "Je merge et je fixe apres." Le "apres" n'arrive jamais. | CI verte obligatoire. |
| Deux agents sur le meme fichier | Conflit garanti, travail perdu. | Un agent par bounded context. |
| Pas de Plan Mode pour les modules critiques | L'agent part dans la mauvaise direction, 4h de travail a jeter. | Plan Mode validation avant execution. |
| Ignorer les warnings du sub-agent review | "C'est juste un warning, ca passera." | Chaque warning est un bug potentiel. |

---

## 12. Decisions

| # | Decision | Justification |
|---|---|---|
| D1 | **Max 3 worktrees paralleles** | Facteur limitant = capacite de review humaine, pas la RAM. |
| D2 | **Schema Prisma et interfaces definis en Phase 1 (sequentiel)** | Elimine 80% des conflits de merge. |
| D3 | **Orchestration manuelle par l'humain** (pas Agent Teams pour le moment) | Agent Teams experimental. Un humain avec 3 agents n'a pas besoin d'un orchestrateur. |
| D4 | **Worktrees via `claude --worktree <name>`** (methode native) | Standard Claude Code, cleanup automatique, convention de nommage coherente. |
| D5 | **Briefing structure obligatoire** (template section 5.2) | Reduit le risque de divergence entre l'agent et les specs. |
| D6 | **Review batch** (3 PR apres chaque cycle de 2h) | Plus efficace que la review au fil de l'eau. L'humain reste concentre. |
| D7 | **Squash merge sur main** | Un commit par feature. Historique propre. Facile a reverter. |
| D8 | **5 phases de sequencement** (fondations -> BC independants -> dependants -> transversal -> Flutter/E2E) | Respecte les dependances. Maximise le parallellisme. |
| D9 | **Tests d'integration cross-modules apres chaque batch de merge** | Detecte les problemes d'integration avant qu'ils ne s'accumulent. |
| D10 | **Rebase quotidien des worktrees actifs** | Minimise le delta avec main et les conflits de merge. |
| D11 | **IMPLEMENTATION-TRACKER.md comme dashboard** | Simple, versionne, visible par tous. Pas besoin d'outil externe. |
| D12 | **Plan Mode pour les modules critiques** (Payment, Ordering) | Valider l'approche avant d'investir 4-6h de travail agent. |

---

## 13. Consequences

### 13.1 Consequences positives

- **Velocite x2-3** par rapport au sequentiel pur : 7 semaines au lieu de 15+.
- **Meilleure utilisation du temps humain** : supervision passive pendant le coding, review batch concentree.
- **Isolation naturelle** : les bounded contexts DDD (ADR-024) se mappent directement aux worktrees.
- **Historique propre** : squash merge donne un commit par feature dans main.
- **Scalabilite** : si l'equipe passe a 2 humains, on peut passer a 6 agents paralleles (3 par humain).

### 13.2 Consequences negatives

- **Cout en tokens plus eleve** (~$300-650 au lieu de ~$200-400 en sequentiel) a cause des initialisations multiples et des rebase.
- **Complexite cognitive** pour l'humain : suivre 3 agents en parallele demande de la discipline.
- **Risque de regressions** plus eleve qu'en sequentiel : les tests d'integration post-merge sont obligatoires.
- **Dependance a la stabilite de `claude --worktree`** : si le feature est bugge, fallback sur `git worktree add` manuel.

### 13.3 Consequences neutres

- Le workflow reste compatible avec le flow sequentiel classique. On peut toujours coder un module a la fois si necessaire.
- La structure CLAUDE.md (ADR-026) fonctionne sans modification dans les worktrees.
- La CI (ADR-025) ne change pas : chaque PR est validee par le meme pipeline.

---

## 14. References

### Documentation officielle
- [Claude Code -- Git worktrees pour sessions paralleles](https://code.claude.com/docs/en/common-workflows#run-parallel-claude-code-sessions-with-git-worktrees)
- [Claude Code -- Agent Teams](https://code.claude.com/docs/en/agent-teams)

### Retours d'experience
- [Anthropic -- Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler) (fevrier 2026)
- [incident.io -- Shipping faster with Claude Code and Git Worktrees](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees) (2025)
- [Simon Willison -- Embracing the parallel coding agent lifestyle](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/) (octobre 2025)

### Articles complementaires
- [Nx Blog -- How Git Worktrees Changed My AI Agent Workflow](https://nx.dev/blog/git-worktrees-ai-agents)
- [Digital Applied -- Multi-Agent Coding: Parallel Development Guide](https://www.digitalapplied.com/blog/multi-agent-coding-parallel-development)
- [Upsun -- Git worktrees for parallel AI coding agents](https://devcenter.upsun.com/posts/git-worktrees-for-parallel-ai-coding-agents/)
- [Medium (Yee Fei) -- Parallel AI Development with Git Worktrees](https://medium.com/@ooi_yee_fei/parallel-ai-development-with-git-worktrees-f2524afc3e33)
- [DEV Community -- How We Built True Parallel Agents With Git Worktrees](https://dev.to/getpochi/how-we-built-true-parallel-agents-with-git-worktrees-2580)

### ADR internes
- ADR-024 : DDD bounded contexts (perimetre de chaque agent)
- ADR-025 : CI/CD pipeline (validation automatique des PR)
- ADR-026 : Qualite code IA (CLAUDE.md, conventions, sub-agent review)
- ADR-023 : Strategie de tests (couverture, mutation testing)
