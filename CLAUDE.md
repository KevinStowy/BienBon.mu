# CLAUDE.md

## MODE AUTONOME — "BOSSE"

Quand l'humain dit **"BOSSE"** (ou "go", "travaille", "lance-toi") :

1. **Lis `ROADMAP.yaml`** à la racine du projet
2. **Identifie ton worker** : lis `.claude/worker-id` (alpha ou beta). Si absent, demande.
3. **`git pull origin main`** pour synchroniser
4. **Trouve la prochaine tâche** : status=pending, assigned_to=<toi>, blocked_by toutes "done", plus petit ID d'abord
5. **Si `needs_human`** non null → affiche le besoin, marque `blocked_human`, passe à la suivante
6. **Claim** : mets status=claimed + worker=<toi>, commit+push ROADMAP.yaml
7. **Exécute** : lis la description, les ADR, spawne l'agent indiqué dans le champ `agent`
8. **Valide** : vérifie chaque `done_criteria`, lance lint+typecheck+tests, spawne code-reviewer
9. **Livre** : commit, push, marque status=done dans ROADMAP.yaml, commit+push
10. **Boucle** : retour à l'étape 3

**Tu t'arrêtes UNIQUEMENT quand** : plus de tâche faisable, blocage humain irrésoluble, ou erreur après 3 tentatives.

Détails complets de l'orchestration : `.claude/agents/orchestrator.md`

---

## Project Overview

BienBon.mu — mobile-first food waste reduction app for Mauritius. Surprise baskets of unsold products at discount. 37 ADRs in `dev-specs/ADR-*.md`. 206 user stories.

## Repository Structure

- **`dev-specs/`** — Product specs, user stories (FR), 37 ADRs
- **`DESIGN_SYSTEM.md`** — Source de vérité design : couleurs, typo, composants, tokens CSS
- **`ROADMAP.yaml`** — Machine-readable task tracker for autonomous execution
- **`.claude/agents/`** — 9 agents (orchestrator + 8 specialized)
- **`.claude/skills/`** — 53 reusable skills (backend, flutter, react, testing, quality, crosscutting)

## Agents

| Agent | Model | Role |
|-------|-------|------|
| `orchestrator` | opus | Reads ROADMAP, claims tasks, spawns agents, loops autonomously |
| `foundation` | opus | Scaffolding monorepo, Prisma, auth, CI/CD |
| `nestjs-module` | sonnet | Implements one NestJS bounded context |
| `flutter-dev` | sonnet | Flutter features (screens, widgets, providers) |
| `react-dev` | sonnet | Admin React + Astro site vitrine |
| `code-reviewer` | opus | Code quality review (read-only) |
| `security-auditor` | opus | OWASP security audit (read-only) |
| `test-engineer` | sonnet | Writes meaningful tests |
| `devops-engineer` | sonnet | CI/CD, Docker, Railway |

## Tech Stack

**Backend**: NestJS + Fastify + Prisma + PostgreSQL (Supabase) + Redis/BullMQ
**Mobile**: Flutter + Riverpod + GoRouter + Drift (offline-first)
**Admin**: React 19 + TanStack Router/Query/Table
**Site vitrine**: Astro + React islands
**Infra**: Railway + Supabase + GitHub Actions

## Architecture (ADR-002, ADR-024)

Monolithe modulaire NestJS. 16 bounded contexts. Hexagonal on complex BCs (ordering, payment, catalog, partner, review-claims). CRUD on simple BCs. Inter-BC: domain events only.

## Key Conventions

- TypeScript strict. No `any`. Zod for domain, class-validator for DTOs.
- OpenAPI decorators on every endpoint. Auth: Supabase JWT + RBAC guards.
- Tests: anti-trivial, mutation testing on critical modules. Coverage: 90%/80%/70%.
- i18n: fr (default), en, mfe. WCAG 2.1 AA accessibility.
- Naming: English code, French specs. Panier→Basket, Commerce→Store.

## Ignore

- `storybook-ui/` — legacy prototype, ne pas toucher ni référencer
- `us-validator/` — outil interne de validation, hors scope

## Development Commands

```bash
# Backend (after Phase 1)
cd apps/api && npm run dev
cd apps/api && npm run lint && npx tsc --noEmit && npx vitest run

# Flutter (after Phase 5)
cd apps/consumer-app && flutter run
cd apps/partner-app && flutter run
```

## ADR Quick Reference

| ADR | Topic |
|-----|-------|
| 001-002 | Stack NestJS + Monolithe modulaire |
| 003-004 | DB schema + REST API OpenAPI |
| 005-007 | Payments + PCI DSS + Ledger |
| 008-009 | Stock sync + Real-time SSE |
| 010-011 | Auth Supabase + RBAC |
| 012, 015 | Offline-first + i18n |
| 017-019 | State machines + Approbation + Fraud |
| 022-024 | OWASP + Tests + DDD |
| 025-028 | CI/CD + Quality + SOLID + Worktrees |
| 029-030 | Flutter Riverpod + GoRouter |
| 032-033 | Accessibility + Analytics |
| 037 | Feature flags |

## Design System

Source de vérité : `DESIGN_SYSTEM.md`. Green primary (#1B5E20/#2E7D32/#4CAF50), Orange accent (#E65100/#FF9800). Nunito font. Base 4px spacing. Mobile-first 390px. Background: `#F7F4EF`.
