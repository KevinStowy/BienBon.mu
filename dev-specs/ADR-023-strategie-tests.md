# ADR-023 : Strategie de tests -- filet de securite pour le code genere par IA

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-001 (stack backend), ADR-002 (architecture applicative), ADR-005 (paiement), ADR-007 (ledger/commissions), ADR-008 (stock/double-booking), ADR-017 (state machines)

---

## 1. Contexte

### 1.1 Pourquoi les tests sont critiques pour BienBon

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. **L'integralite du code sera generee par des agents IA** (Claude Code, et potentiellement d'autres). L'equipe humaine (2-5 developpeurs) supervise, revoit et pilote les agents, mais ne tape pas la majorite du code manuellement.

Cette approche change radicalement le role des tests :

- **Les tests ne sont pas un filet de securite supplementaire, ils sont LE filet de securite principal.**
- Le code IA est prolixe mais peut contenir des bugs subtils : edge cases oublies, race conditions, inversions de conditions, off-by-one, securite mal implementee.
- Une analyse CodeRabbit de decembre 2025 sur 470 pull requests open-source a montre que les PR generees par IA contiennent en moyenne **10.83 problemes** (vs 6.45 pour les PR humaines), avec une hausse de **75% des erreurs de logique** et **57% de plus de failles de securite**.
- Des recherches Qodo (2025) montrent que **65% des developpeurs** identifient les lacunes de contexte comme source principale de code IA de mauvaise qualite.

### 1.2 Le probleme des tests IA triviaux

Un piege bien documente : quand un agent IA ecrit a la fois le code ET les tests, il tend a ecrire des tests qui passent trivialement. Les tests "miroir" ne font que repeter l'implementation au lieu de la challenger.

Une etude sur HumanEval-Java a demontre un cas extreme : des tests generes par LLM atteignaient **100% de couverture de lignes et de branches**, mais seulement **4% de score en mutation testing** -- parce qu'ils manquaient systematiquement les cas limites (ex: gestion des annees bissextiles).

### 1.3 Stack technique

| Couche | Technologie | Ref ADR |
|--------|-------------|---------|
| Backend API | NestJS + Fastify + TypeScript | ADR-001 |
| ORM | Prisma (v7+) | ADR-001 |
| Base de donnees | PostgreSQL (Supabase) + PostGIS | ADR-001 |
| Queue | BullMQ (Redis) | ADR-001 |
| Paiements | Peach Payments | ADR-005 |
| Ledger | Double-entry bookkeeping | ADR-007 |
| State machines | Transition table typee | ADR-017 |
| Stock | Reservation atomique + optimistic locking | ADR-008 |
| Mobile (consumer) | Flutter | - |
| Mobile (partner) | Flutter | - |
| Admin web | React + Storybook (existant) | - |
| API contract | REST + OpenAPI codegen | ADR-004 |

### 1.4 Contraintes

- **Budget infra limite** : pas de cluster de test dedie, pas de services cloud de test couteux
- **Equipe reduite** : 2-5 devs + agents IA -- les tests doivent etre maintenables
- **Tests AVANT ou EN MEME TEMPS que le code** : jamais apres
- **CI rapide** : le feedback loop doit rester < 10 minutes pour la majorite des tests

---

## 2. Decisions

### 2.1 Approche de test : Test-Alongside avec garde-fous anti-trivialite

#### Decision

**Test-Alongside** : l'agent IA ecrit le code et les tests dans le meme cycle, avec les garde-fous suivants :

1. **Les tests sont ecrits en premier dans le prompt** : l'agent recoit la spec (user story, ADR, interface TypeScript) et doit produire les cas de test AVANT l'implementation
2. **Mutation testing obligatoire** sur les modules critiques (ledger, state machines, stock, auth) pour valider que les tests detectent vraiment les bugs
3. **Property-based testing** pour les calculs financiers (commissions, remboursements, ledger balancing)
4. **Review humaine des tests** : chaque PR doit inclure une revue explicite des cas de test, pas seulement du code

#### Options ecartees

| Option | Raison d'exclusion |
|--------|-------------------|
| **TDD strict (red-green-refactor)** | Trop rigide pour un agent IA. Le cycle red-green-refactor presuppose une ecriture incrementale que les LLM ne font pas naturellement. L'agent tend a generer le code complet d'un coup. Forcer le TDD strict produit du theatre : l'agent "pretend" iterer mais genere tout d'un bloc. |
| **BDD (Gherkin/Cucumber)** | Couche d'abstraction supplementaire sans valeur ajoutee dans notre contexte. Les specs sont deja en francais dans les US. Gherkin ajouterait un parseur et un mapping etape-code qui complexifient sans benefice pour un agent IA. Les tests d'integration en TypeScript/Dart lisibles suffisent. |
| **Test-after avec coverage minimum** | Incompatible avec notre contrainte fondamentale. Le code IA sans tests simultanes peut contenir des bugs que les tests ecrits apres ne detecteront jamais (biais de confirmation : l'agent qui a ecrit le code ecrit des tests qui valident ce code). |

#### Protocole pour l'agent IA

Chaque prompt de generation de code doit suivre cette structure :

```
1. Spec d'entree : [US, ADR, interface TypeScript]
2. GENERER D'ABORD les cas de test :
   - Happy path
   - Au minimum 3 edge cases par fonction publique
   - Au minimum 1 cas d'erreur / exception
   - Cas de concurrence si applicable
3. GENERER ENSUITE l'implementation
4. VERIFIER que tous les tests passent
5. LISTER les cas de test manquants identifies
```

---

### 2.2 Pyramide de tests

#### Decision

```
                    +--------+
                   /   E2E    \           ~5%   (~30 tests)
                  /   Flutter   \         Parcours critiques
                 +--------------+
                /   Integration   \       ~25%  (~150 tests)
               /   API + DB + Queue\      Endpoints, workflows complets
              +--------------------+
             /     Composants UI     \    ~10%  (~60 tests)
            /  Widget + Storybook     \   Rendu, interactions
           +--------------------------+
          /       Tests unitaires       \ ~55%  (~350 tests)
         /   Logique pure, calculs,      \Business rules isolees
        /    state machines, guards       \
       +----------------------------------+
              Property-based / Mutation      ~5%  (~30 tests)
              Calculs financiers, invariants
```

**Total estime au lancement (MVP) : ~620 tests**

#### Repartition par couche

| Couche | % | Nombre estime | Temps d'execution cible | Frequence CI |
|--------|:-:|:------------:|:-----------------------:|:------------:|
| Unitaires | 55% | ~350 | < 30s | Chaque push |
| Integration | 25% | ~150 | < 3 min | Chaque push |
| Composants UI (widget + Storybook) | 10% | ~60 | < 2 min | Chaque push |
| E2E Flutter | 5% | ~30 | < 10 min | Pre-merge + nightly |
| Property-based + Mutation | 5% | ~30 | < 15 min | Nightly + pre-release |

---

### 2.3 Matrice module x type de test x framework

#### Backend NestJS

| Module | Unitaire | Integration | Property-based | Mutation | Framework |
|--------|:--------:|:-----------:|:--------------:|:--------:|-----------|
| **State machines (ADR-017)** | Toutes les transitions, guards, effets | Workflow complet (reserve -> capture -> pickup) | - | Obligatoire | Vitest |
| **Ledger (ADR-007)** | Calculs commission, fee minimum, TVA | Ecritures DB, balance check, reconciliation | Invariants comptables (sum debits = sum credits) | Obligatoire | Vitest + fast-check |
| **Stock/concurrence (ADR-008)** | Logique de decrementation, rollback | Requetes paralleles, expiration hold 5min | - | Recommande | Vitest + Supertest |
| **Paiements (ADR-005)** | Parsing reponses Peach, calcul montants | Cycle PA -> CP -> RF avec mocks Peach | Montants, devises, arrondis | Obligatoire | Vitest + nock/msw |
| **Auth/RBAC (ADR-010/011)** | Guards, decorateurs, JWT parsing | Endpoints proteges, permissions cross-role | - | Recommande | Vitest + Supertest |
| **Notifications (ADR-014)** | Formatage messages, selection canal | Jobs BullMQ, templates email | - | - | Vitest |
| **CRON / jobs async** | Logique de chaque job | Execution via BullMQ, retries | - | - | Vitest |
| **API endpoints (CRUD)** | Validation DTO, transformations | Request -> Response, status codes, pagination | - | - | Vitest + Supertest |
| **Geolocalisation (ADR-016)** | Calculs distance, bounding box | Requetes PostGIS, recherche proximite | - | - | Vitest |

#### Flutter (consumer + partner)

| Module | Widget test | Integration test | Golden test | Framework |
|--------|:-----------:|:----------------:|:-----------:|-----------|
| **Ecrans principaux** | Rendu, interactions | - | Captures de reference | flutter_test + golden_toolkit |
| **Flux reservation** | - | Parcours complet mock API | - | integration_test |
| **Flux paiement** | - | Parcours avec mock Peach | - | integration_test |
| **State management** | Tests Cubit/Bloc | - | - | bloc_test + mocktail |
| **Composants partages** | Props, etats, animations | - | Composants stables | flutter_test |
| **Carte/geoloc** | Mock du provider | Navigation vers commerce | - | flutter_test + mocktail |

#### React Admin

| Module | Composant test | Visual regression | Framework |
|--------|:--------------:|:-----------------:|-----------|
| **Composants existants** (Avatar, Badge, Button, etc.) | Props, etats, interactions | Stories Storybook + Chromatic | Vitest + React Testing Library |
| **Pages admin** (dashboard, partenaires, etc.) | Rendu avec mock data | Stories composees | Vitest + RTL + Storybook |
| **Formulaires** | Validation, soumission | - | Vitest + RTL |
| **Tableaux/listes** | Pagination, tri, filtres | - | Vitest + RTL |

---

### 2.4 Frameworks de test

#### 2.4.1 Backend : Vitest (pas Jest)

**Decision** : Vitest pour tout le backend NestJS.

**Justification** :
- **Performance** : Vitest est 4x a 10x plus rapide que Jest en execution. Des benchmarks documentent des gains de 18.7s a 1.8s sur les memes suites de tests.
- **ESM natif** : le projet utilise `"type": "module"`. Jest necessite des transformations et configurations supplementaires pour ESM.
- **Coherence** : le front React admin utilise deja Vitest (via `@storybook/addon-vitest`). Un seul framework de test pour tout le TypeScript.
- **Watch mode superieur** : Hot Module Replacement applique aux tests, seuls les tests impactes par un changement sont re-executes.
- **API compatible Jest** : `describe`, `it`, `expect`, `vi.fn()`, `vi.mock()` -- la migration de toute documentation NestJS basee sur Jest est triviale.

**Configuration specifique NestJS** :
- Utiliser `unplugin-swc` comme transformer (les decorateurs NestJS + Prisma necessitent un transformer qui supporte les metadata de reflexion, ESBuild ne le fait pas)
- Configurer `pool: 'forks'` (pas `threads`) pour l'isolation des tests d'integration avec base de donnees

```typescript
// vitest.config.ts (backend)
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    root: './',
    pool: 'forks',           // isolation pour les tests DB
    fileParallelism: false,  // tests d'integration sequentiels
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/main.ts',
        'prisma/',
      ],
    },
    setupFiles: ['./test/setup.ts'],
  },
});
```

#### 2.4.2 Backend : bibliotheques complementaires

| Bibliotheque | Role | Justification |
|-------------|------|---------------|
| `supertest` | Tests HTTP d'integration | Standard NestJS, teste les endpoints via HTTP reel sans serveur externe |
| `@testcontainers/postgresql` | PostgreSQL ephemere en Docker | Tests d'integration avec PostgreSQL reel (pas SQLite), PostGIS inclus |
| `fast-check` | Property-based testing | Calculs financiers du ledger, invariants comptables |
| `nock` ou `msw` | Mock HTTP externe | Mocking de l'API Peach Payments, webhooks |
| `@stryker-mutator/core` | Mutation testing | Validation de la pertinence des tests sur modules critiques |
| `vitest-mock-extended` | Deep mocking type-safe | Mocking de PrismaClient en tests unitaires |
| `bullmq` (built-in test utils) | Tests de jobs | Execution de jobs en mode synchrone pour les tests |

#### 2.4.3 Flutter

| Bibliotheque | Role |
|-------------|------|
| `flutter_test` | Tests widget, tests unitaires |
| `integration_test` | Tests E2E sur emulateur/device |
| `mocktail` | Mocks type-safe (prefere a `mockito` pour la syntaxe sans code generation) |
| `bloc_test` | Tests de Cubits/Blocs (si Bloc est utilise pour le state management) |
| `golden_toolkit` | Golden tests simplifies avec `GoldenBuilder` |
| `http_mock_adapter` | Mock des appels HTTP (dio) |

#### 2.4.4 React Admin

| Bibliotheque | Role |
|-------------|------|
| `vitest` (v4+) | Runner de tests (deja dans le projet) |
| `@testing-library/react` | Tests de composants DOM |
| `@testing-library/user-event` | Simulation d'interactions utilisateur |
| `@storybook/addon-vitest` | Execution des stories comme tests (deja configure) |
| `@chromatic-com/storybook` | Visual regression testing via Chromatic (deja configure) |

---

### 2.5 Base de donnees de test

#### Decision : Testcontainers PostgreSQL pour l'integration, mocks Prisma pour l'unitaire

**Deux strategies complementaires** :

| Niveau | Strategie | Justification |
|--------|-----------|---------------|
| **Tests unitaires** | Mock de `PrismaClient` via `vitest-mock-extended` | Rapide (< 1ms par test), isole, pas de DB necessaire |
| **Tests d'integration** | PostgreSQL reel via `@testcontainers/postgresql` | Garantit la compatibilite PostgreSQL (types, contraintes, PostGIS, transactions). SQLite est exclu car incompatible avec PostGIS et les types PostgreSQL specifiques. |

#### Options ecartees

| Option | Raison d'exclusion |
|--------|-------------------|
| **SQLite en memoire** | Pas de PostGIS, differences de types (JSONB, ENUM, UUID), pas de `SELECT FOR UPDATE`, pas de `pg_advisory_lock`. Les tests passeraient en SQLite mais echoueraient en PostgreSQL reel. Inacceptable pour un projet financier. |
| **Base Supabase de dev/staging** | Couteux (instance supplementaire), lent (latence reseau), pas d'isolation entre CI runs paralleles, risque de pollution de donnees. |

#### Configuration Testcontainers

```typescript
// test/setup-integration.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;

beforeAll(async () => {
  // Demarre un conteneur PostgreSQL + PostGIS
  container = await new PostgreSqlContainer('postgis/postgis:16-3.4')
    .withDatabase('bienbon_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const databaseUrl = container.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;

  // Applique les migrations Prisma
  execSync(`npx prisma migrate deploy`, {
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$connect();
}, 60_000); // timeout genereux pour le pull de l'image Docker

afterAll(async () => {
  await prisma.$disconnect();
  await container.stop();
});
```

#### Isolation entre tests

**Strategie : truncate entre chaque test** (pas de transaction rollback)

```typescript
// test/helpers/db-cleanup.ts
import { PrismaClient } from '@prisma/client';

export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename != '_prisma_migrations'
  `;

  for (const { tablename } of tablenames) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "public"."${tablename}" CASCADE`
    );
  }
}
```

Raison du choix truncate vs transaction rollback : les tests de concurrence (ADR-008) necessitent de vraies transactions committees pour tester les `SELECT FOR UPDATE` et les advisory locks. Un rollback global envelopperait ces transactions imbriquees et fausserait les resultats.

---

### 2.6 Mocking des services externes

#### Matrice de mocking

| Service | Strategie de mock | Outil | Justification |
|---------|------------------|-------|---------------|
| **Peach Payments API** | Mock HTTP avec fixtures JSON | `nock` ou `msw` | Pas de sandbox Peach fiable en CI. Les reponses sont bien documentees dans l'API Peach. Fixtures pour chaque payment type (DB, PA, CP, RF, RV) et chaque erreur. |
| **Peach Webhooks** | Injection directe dans le controller | `supertest` | Simuler les webhooks entrants (payment.success, payment.failed, refund.completed) en appelant directement l'endpoint webhook avec les payloads signes. |
| **Supabase Auth** | Mock du module `AuthGuard` | `vi.mock()` / DI override | En tests unitaires : mock du guard qui injecte un user fictif. En tests d'integration : Supabase Auth n'est pas utilise, on utilise un JWT signe localement avec la meme cle. |
| **FCM (push notifications)** | Toujours mocke | `vi.mock()` | Aucune notification push envoyee en test. Le `NotificationService` est mocke pour verifier que les bonnes notifications sont enqueue. |
| **Resend (emails)** | Toujours mocke | `vi.mock()` | Aucun email envoye en test. Verification des appels : destinataire, template, variables. |
| **Redis / BullMQ** | Redis reel via Testcontainers OU mock | `@testcontainers/redis` / `vi.mock()` | Tests unitaires des jobs : mock. Tests d'integration du flux complet (ex: reservation -> job notification) : Redis reel. |
| **PostGIS** | PostgreSQL reel avec l'extension | Testcontainers `postgis/postgis` | Le conteneur PostgreSQL de test inclut PostGIS. Les requetes geo sont testees sur de vraies donnees spatiales. |

#### Fixtures Peach Payments

```typescript
// test/fixtures/peach-payments.ts
export const peachFixtures = {
  // Pre-autorisation carte reussie
  preAuthSuccess: {
    id: 'PAY_abc123',
    result: { code: '000.100.110', description: 'Request successfully processed' },
    paymentType: 'PA',
    amount: '150.00',
    currency: 'MUR',
    card: { bin: '411111', last4Digits: '1111', expiryMonth: '12', expiryYear: '2027' },
  },

  // Debit immediat MCB Juice reussi
  debitMcbJuiceSuccess: {
    id: 'PAY_def456',
    result: { code: '000.100.110', description: 'Request successfully processed' },
    paymentType: 'DB',
    amount: '150.00',
    currency: 'MUR',
    customParameters: { paymentMethod: 'MCBJUICE' },
  },

  // Echec : fonds insuffisants
  insufficientFunds: {
    id: 'PAY_ghi789',
    result: { code: '800.100.171', description: 'Transaction declined (insufficient funds)' },
    paymentType: 'DB',
    amount: '150.00',
    currency: 'MUR',
  },

  // Webhook : paiement confirme
  webhookPaymentSuccess: {
    type: 'payment.completed',
    payload: {
      id: 'PAY_abc123',
      result: { code: '000.100.110' },
      paymentType: 'DB',
      amount: '150.00',
      currency: 'MUR',
    },
    signature: 'hmac-sha256-signature-here',
  },

  // Webhook : remboursement complete
  webhookRefundCompleted: {
    type: 'refund.completed',
    payload: {
      id: 'REF_xyz999',
      referencedId: 'PAY_abc123',
      result: { code: '000.100.110' },
      paymentType: 'RF',
      amount: '150.00',
      currency: 'MUR',
    },
    signature: 'hmac-sha256-signature-here',
  },
};
```

---

### 2.7 Tests de concurrence (ADR-008)

Le stock et les reservations sont le coeur du systeme. Les tests de concurrence sont **obligatoires**, pas optionnels.

#### 2.7.1 Test du double-booking

```typescript
// test/integration/stock/double-booking.spec.ts
import { describe, it, expect } from 'vitest';

describe('Double-booking prevention (ADR-008)', () => {
  it('should not allow two consumers to reserve the last basket', async () => {
    // GIVEN : un panier avec stock = 1
    const basket = await seedBasket({ quantity: 5, reserved: 4 }); // 1 restant

    // WHEN : deux reservations simultanees
    const [result1, result2] = await Promise.all([
      request(app).post(`/api/v1/reservations`).send({
        basketId: basket.id,
        quantity: 1,
      }).set('Authorization', `Bearer ${consumerAToken}`),

      request(app).post(`/api/v1/reservations`).send({
        basketId: basket.id,
        quantity: 1,
      }).set('Authorization', `Bearer ${consumerBToken}`),
    ]);

    // THEN : exactement un succes et un echec
    const statuses = [result1.status, result2.status].sort();
    expect(statuses).toEqual([201, 409]); // Created + Conflict

    // ET : le stock final est exactement 0 (pas -1)
    const updatedBasket = await prisma.basket.findUnique({
      where: { id: basket.id },
    });
    expect(updatedBasket!.quantityAvailable).toBe(0);
  });

  it('should handle 10 simultaneous reservations for 3 remaining baskets', async () => {
    // GIVEN : un panier avec 3 places restantes
    const basket = await seedBasket({ quantity: 10, reserved: 7 });

    // WHEN : 10 reservations simultanees
    const promises = Array.from({ length: 10 }, (_, i) =>
      request(app).post(`/api/v1/reservations`).send({
        basketId: basket.id,
        quantity: 1,
      }).set('Authorization', `Bearer ${consumerTokens[i]}`),
    );
    const results = await Promise.all(promises);

    // THEN : exactement 3 succes et 7 echecs
    const successes = results.filter(r => r.status === 201);
    const conflicts = results.filter(r => r.status === 409);
    expect(successes).toHaveLength(3);
    expect(conflicts).toHaveLength(7);

    // ET : le stock est exactement 0
    const updatedBasket = await prisma.basket.findUnique({
      where: { id: basket.id },
    });
    expect(updatedBasket!.quantityAvailable).toBe(0);
  });
});
```

#### 2.7.2 Test de l'expiration du hold a 5 minutes

```typescript
describe('Hold expiration (ADR-008, E8)', () => {
  it('should release stock after 5 minutes if payment fails', async () => {
    // GIVEN : un panier avec stock = 2, une reservation avec hold
    const basket = await seedBasket({ quantity: 2, reserved: 0 });
    const reservation = await createReservationWithHold(basket.id, consumerToken);

    // Stock devrait etre decremente immediatement
    let updatedBasket = await prisma.basket.findUnique({ where: { id: basket.id } });
    expect(updatedBasket!.quantityAvailable).toBe(1);

    // WHEN : on avance le temps de 5 minutes et on declenche le job d'expiration
    await advanceTime(5 * 60 * 1000); // helper qui modifie l'horloge du test
    await runExpirationJob(); // declenche manuellement le job BullMQ

    // THEN : le stock est re-incremente
    updatedBasket = await prisma.basket.findUnique({ where: { id: basket.id } });
    expect(updatedBasket!.quantityAvailable).toBe(2);

    // ET : la reservation est annulee
    const updatedReservation = await prisma.reservation.findUnique({
      where: { id: reservation.id },
    });
    expect(updatedReservation!.status).toBe('EXPIRED');
  });
});
```

#### 2.7.3 Test de stress du stock atomique

```typescript
describe('Atomic stock stress test', () => {
  it('should maintain stock integrity under 50 concurrent operations', async () => {
    const basket = await seedBasket({ quantity: 20, reserved: 0 });

    // 30 reservations + 20 annulations simultanees
    const reservationPromises = Array.from({ length: 30 }, (_, i) =>
      request(app).post(`/api/v1/reservations`).send({
        basketId: basket.id, quantity: 1,
      }).set('Authorization', `Bearer ${consumerTokens[i]}`),
    );

    const results = await Promise.all(reservationPromises);
    const successfulReservations = results
      .filter(r => r.status === 201)
      .map(r => r.body.id);

    // Exactement 20 succes (stock = 20)
    expect(successfulReservations).toHaveLength(20);

    // Annuler 10 reservations en parallele
    const cancellationPromises = successfulReservations.slice(0, 10).map(id =>
      request(app).post(`/api/v1/reservations/${id}/cancel`)
        .set('Authorization', `Bearer ${consumerTokens[0]}`),
    );
    await Promise.all(cancellationPromises);

    // Stock doit etre exactement 10
    const updatedBasket = await prisma.basket.findUnique({
      where: { id: basket.id },
    });
    expect(updatedBasket!.quantityAvailable).toBe(10);

    // INVARIANT : stock + reservations actives = quantite totale
    const activeReservations = await prisma.reservation.count({
      where: {
        basketId: basket.id,
        status: { in: ['CONFIRMED', 'HELD'] },
      },
    });
    expect(updatedBasket!.quantityAvailable + activeReservations)
      .toBe(updatedBasket!.quantity);
  });
});
```

---

### 2.8 Tests de contrat API (OpenAPI)

#### Decision : OpenAPI spec comme source de verite + tests de conformite automatises

Le contrat API est defini par la spec OpenAPI generee par `@nestjs/swagger`. Les clients Flutter et React utilisent du codegen depuis cette spec. La coherence est critique.

#### Strategie en 3 couches

```
+--------------------------------------------------+
|  1. Generation : NestJS -> OpenAPI spec (JSON)    |
|     @nestjs/swagger genere automatiquement        |
+--------------------------------------------------+
           |
+--------------------------------------------------+
|  2. Validation : spec -> implementation           |
|     Tests de conformite : chaque endpoint         |
|     repond conformement au schema OpenAPI          |
+--------------------------------------------------+
           |
+--------------------------------------------------+
|  3. Detection de breaking changes                 |
|     Diff OpenAPI en CI (oasdiff / optic)          |
|     Bloquer le merge si breaking change non voulu  |
+--------------------------------------------------+
```

#### Outils

| Outil | Role |
|-------|------|
| `@nestjs/swagger` | Generation de la spec OpenAPI depuis les decorateurs NestJS |
| `oasdiff` | Detection de breaking changes entre deux versions de la spec OpenAPI. Execution en CI sur chaque PR. |
| Tests Supertest + schema validation | Chaque test d'integration valide que la reponse correspond au schema OpenAPI (status codes, types, champs obligatoires) |

#### Exemple de test de conformite

```typescript
import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import openapiSpec from '../openapi.json';

const ajv = new Ajv({ allErrors: true });

describe('API contract conformity', () => {
  it('GET /api/v1/baskets should match OpenAPI schema', async () => {
    const response = await request(app).get('/api/v1/baskets')
      .query({ lat: -20.1609, lng: 57.5012, radius: 5000 })
      .set('Authorization', `Bearer ${consumerToken}`);

    expect(response.status).toBe(200);

    // Valider la reponse contre le schema OpenAPI
    const schema = openapiSpec.paths['/api/v1/baskets'].get.responses['200']
      .content['application/json'].schema;
    const validate = ajv.compile(schema);
    const valid = validate(response.body);

    expect(valid).toBe(true);
    if (!valid) {
      console.error('Schema validation errors:', validate.errors);
    }
  });
});
```

#### Detection de breaking changes en CI

```yaml
# .github/workflows/api-contract.yml (extrait)
- name: Detect OpenAPI breaking changes
  run: |
    # Generer la spec de la branche courante
    npm run build
    npm run generate:openapi -- --output openapi-current.json

    # Comparer avec la spec de main
    git show origin/main:openapi.json > openapi-main.json

    # oasdiff detecte les breaking changes
    oasdiff breaking openapi-main.json openapi-current.json \
      --fail-on ERR
```

---

### 2.9 Tests de securite automatises

#### Decision : tests de permissions integres + scan OWASP en nightly

| Type | Outil | Frequence | Bloquant |
|------|-------|:---------:|:--------:|
| **Tests de permissions (RBAC)** | Vitest + Supertest | Chaque push | Oui |
| **Scan OWASP ZAP baseline** | OWASP ZAP (Docker) | Nightly | Non (alertes) |
| **Dependances vulnerables** | `npm audit` / `snyk` | Chaque push | Oui (critical/high) |
| **Secrets dans le code** | `gitleaks` | Pre-commit hook | Oui |

#### Tests de permissions RBAC obligatoires

Chaque endpoint de l'API doit avoir un test verifiant que les roles non autorises recoivent un 403.

```typescript
describe('RBAC - Partner endpoints', () => {
  const partnerEndpoints = [
    { method: 'POST', path: '/api/v1/baskets', body: { name: 'Test', quantity: 5 } },
    { method: 'PATCH', path: '/api/v1/baskets/:id', body: { quantity: 10 } },
    { method: 'GET', path: '/api/v1/partner/reservations' },
    { method: 'POST', path: '/api/v1/partner/reservations/:id/confirm-pickup' },
  ];

  for (const endpoint of partnerEndpoints) {
    it(`${endpoint.method} ${endpoint.path} should reject consumer role`, async () => {
      const response = await request(app)
        [endpoint.method.toLowerCase()](endpoint.path.replace(':id', 'test-id'))
        .send(endpoint.body)
        .set('Authorization', `Bearer ${consumerToken}`);

      expect(response.status).toBe(403);
    });

    it(`${endpoint.method} ${endpoint.path} should reject unauthenticated`, async () => {
      const response = await request(app)
        [endpoint.method.toLowerCase()](endpoint.path.replace(':id', 'test-id'))
        .send(endpoint.body);

      expect(response.status).toBe(401);
    });
  }
});
```

---

### 2.10 Garde-fous anti-trivialite : mutation testing et property-based testing

#### 2.10.1 Mutation testing avec Stryker

**Decision** : mutation testing obligatoire sur les modules critiques, recommande sur les autres.

Le mutation testing fonctionne en injectant des petites modifications dans le code source (remplacer `>` par `>=`, inverser un booleen, supprimer un return) et en verifiant que les tests echouent. Si un "mutant" survit (les tests passent toujours), c'est qu'il y a une lacune dans les tests.

**Pourquoi c'est indispensable pour le code IA** : une etude de Meta (septembre 2025) demontre que le mutation testing combiné aux LLM permet de generer des tests cibles sur les mutants survivants, creant un cycle d'amelioration continue. Les retours d'experience (Outsight AI) montrent que le score de mutation passe de 70% a 78% quand les mutants survivants sont resoumis a l'agent IA.

#### Modules et seuils

| Module | Score mutation minimum | Justification |
|--------|:---------------------:|---------------|
| **State machines (ADR-017)** | 85% | Un mutant survivant = une transition invalide potentielle = perte financiere |
| **Ledger (ADR-007)** | 90% | Calculs financiers, le moindre bug = ecritures comptables incorrectes |
| **Stock atomique (ADR-008)** | 80% | Race conditions, le mutation testing revele les conditions mal testees |
| **Paiements** | 85% | Montants, statuts, remboursements |
| **Auth/RBAC** | 80% | Permissions, un mutant survivant = faille de securite |
| **Autres modules** | Recommande, pas de seuil | CRUD simple, notifications, etc. |

#### Configuration Stryker

```json
// stryker.config.json (backend)
{
  "$schema": "https://raw.githubusercontent.com/stryker-mutator/stryker-js/master/packages/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "reporters": ["html", "clear-text", "progress", "json"],
  "testRunner": "vitest",
  "checkers": ["typescript"],
  "tsconfigFile": "tsconfig.json",
  "mutate": [
    "src/modules/reservation/state-machine/**/*.ts",
    "src/modules/ledger/**/*.ts",
    "src/modules/stock/**/*.ts",
    "src/modules/payment/**/*.ts",
    "src/modules/auth/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.dto.ts",
    "!src/**/*.module.ts"
  ],
  "thresholds": {
    "high": 85,
    "low": 75,
    "break": 70
  },
  "incremental": true,
  "incrementalFile": ".stryker-incremental.json"
}
```

Le mode `incremental` est essentiel : Stryker ne re-teste que les mutants dans le code modifie, ce qui reduit le temps d'execution de 80% en moyenne sur les runs suivants.

#### Workflow IA : boucle de renforcement

```
1. L'agent IA ecrit le code + les tests
2. CI execute Stryker sur les modules critiques
3. SI mutants survivants > seuil :
   a. La CI echoue
   b. Le rapport Stryker liste les mutants survivants avec le code concerne
   c. L'agent IA recoit le rapport et genere des tests supplementaires ciblant les mutants
   d. Retour a l'etape 2
```

#### 2.10.2 Property-based testing avec fast-check

**Decision** : obligatoire pour tous les calculs financiers du ledger et les invariants metier.

Le property-based testing genere des centaines d'entrees aleatoires et verifie que des proprietes (invariants) sont toujours respectees, au lieu de tester des exemples specifiques.

#### Proprietes a tester

```typescript
import { fc } from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Ledger invariants (ADR-007)', () => {
  // Propriete 1 : la somme des debits = la somme des credits (toujours)
  it('sum of debits should always equal sum of credits', () => {
    fc.assert(
      fc.property(
        // Generer un montant de panier (1 a 10000 MUR, en centimes)
        fc.integer({ min: 100, max: 1_000_000 }),
        // Generer un taux de commission (1% a 50%)
        fc.integer({ min: 100, max: 5000 }),
        // Generer un fee minimum (0 a 200 MUR, en centimes)
        fc.integer({ min: 0, max: 20_000 }),
        (amountCents, commissionBps, feeMinimumCents) => {
          const entries = calculateLedgerEntries({
            amount: amountCents,
            commissionRate: commissionBps / 10_000, // bps -> ratio
            feeMinimum: feeMinimumCents,
          });

          const totalDebits = entries
            .filter(e => e.type === 'DEBIT')
            .reduce((sum, e) => sum + e.amount, 0);
          const totalCredits = entries
            .filter(e => e.type === 'CREDIT')
            .reduce((sum, e) => sum + e.amount, 0);

          // INVARIANT : debits = credits (double-entry)
          expect(totalDebits).toBe(totalCredits);
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Propriete 2 : la commission est toujours >= fee minimum
  it('commission should always be >= fee minimum', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1_000_000 }),
        fc.integer({ min: 100, max: 5000 }),
        fc.integer({ min: 0, max: 20_000 }),
        (amountCents, commissionBps, feeMinimumCents) => {
          const commission = calculateCommission({
            amount: amountCents,
            commissionRate: commissionBps / 10_000,
            feeMinimum: feeMinimumCents,
          });

          expect(commission).toBeGreaterThanOrEqual(feeMinimumCents);
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Propriete 3 : le montant partenaire + commission = montant total
  it('partner amount + commission should equal total amount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1_000_000 }),
        fc.integer({ min: 100, max: 5000 }),
        fc.integer({ min: 0, max: 20_000 }),
        (amountCents, commissionBps, feeMinimumCents) => {
          const { partnerAmount, commission } = calculateSplit({
            amount: amountCents,
            commissionRate: commissionBps / 10_000,
            feeMinimum: feeMinimumCents,
          });

          // INVARIANT : pas de perte ni de gain d'argent
          expect(partnerAmount + commission).toBe(amountCents);
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Propriete 4 : un remboursement total annule exactement toutes les ecritures
  it('full refund should produce net zero balance on all accounts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1_000_000 }),
        fc.integer({ min: 100, max: 5000 }),
        fc.integer({ min: 0, max: 20_000 }),
        (amountCents, commissionBps, feeMinimumCents) => {
          const paymentEntries = calculateLedgerEntries({
            amount: amountCents,
            commissionRate: commissionBps / 10_000,
            feeMinimum: feeMinimumCents,
          });

          const refundEntries = calculateRefundEntries({
            amount: amountCents,
            commissionRate: commissionBps / 10_000,
            feeMinimum: feeMinimumCents,
            refundType: 'FULL',
          });

          const allEntries = [...paymentEntries, ...refundEntries];

          // Calculer le solde net par compte
          const balances = new Map<string, number>();
          for (const entry of allEntries) {
            const current = balances.get(entry.accountId) ?? 0;
            const delta = entry.type === 'DEBIT' ? entry.amount : -entry.amount;
            balances.set(entry.accountId, current + delta);
          }

          // INVARIANT : tous les comptes sont a zero apres remboursement total
          for (const [accountId, balance] of balances) {
            expect(balance, `Account ${accountId} should be zero`).toBe(0);
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});
```

#### Proprietes pour les state machines (ADR-017)

```typescript
describe('State machine invariants (ADR-017)', () => {
  // Propriete : toute sequence de transitions valides mene a un etat valide
  it('any valid transition sequence should produce a valid state', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant('CONFIRM'),
            fc.constant('CANCEL'),
            fc.constant('EXPIRE'),
            fc.constant('CAPTURE'),
            fc.constant('PICKUP'),
            fc.constant('NO_SHOW'),
            fc.constant('CLAIM'),
          ),
          { minLength: 1, maxLength: 10 },
        ),
        (events) => {
          let state = 'PENDING';
          for (const event of events) {
            const nextState = transition(state, event);
            if (nextState !== null) {
              state = nextState;
            }
            // L'etat doit toujours etre dans l'ensemble des etats valides
            expect(VALID_STATES).toContain(state);
          }
        },
      ),
      { numRuns: 2000 },
    );
  });

  // Propriete : un etat terminal ne peut plus transitionner
  it('terminal states should not accept any transition', () => {
    const terminalStates = ['COMPLETED', 'CANCELLED', 'EXPIRED', 'REFUNDED'];
    fc.assert(
      fc.property(
        fc.constantFrom(...terminalStates),
        fc.constantFrom('CONFIRM', 'CANCEL', 'EXPIRE', 'CAPTURE', 'PICKUP', 'NO_SHOW', 'CLAIM'),
        (terminalState, event) => {
          const result = transition(terminalState, event);
          expect(result).toBeNull();
        },
      ),
    );
  });
});
```

---

### 2.11 Coverage et seuils

#### Decision : seuils differencies par module

| Module | Couverture lignes min | Couverture branches min | Bloquant CI |
|--------|:--------------------:|:----------------------:|:-----------:|
| **Ledger** | 95% | 90% | Oui |
| **State machines** | 95% | 95% | Oui |
| **Stock/reservation** | 90% | 85% | Oui |
| **Paiements** | 90% | 85% | Oui |
| **Auth/RBAC** | 90% | 85% | Oui |
| **API endpoints (CRUD)** | 80% | 75% | Oui |
| **Notifications** | 75% | 70% | Oui |
| **Config / DTOs / modules** | Exempte | Exempte | Non |
| **Flutter UI (consumer)** | 70% | 60% | Oui |
| **Flutter UI (partner)** | 70% | 60% | Oui |
| **React Admin** | 75% | 65% | Oui |

#### Seuil global

- **Backend** : 85% lignes, 80% branches (global)
- **Flutter** : 70% lignes, 60% branches (global)
- **React Admin** : 75% lignes, 65% branches (global)

#### Fichiers exemptes

```typescript
// vitest.config.ts -- coverage.exclude
[
  'node_modules/',
  'dist/',
  'test/',
  'prisma/',
  'src/main.ts',               // bootstrap, pas de logique
  'src/**/*.module.ts',        // wiring NestJS, pas de logique
  'src/**/*.dto.ts',           // types purs, pas de logique
  'src/**/*.entity.ts',        // types Prisma generes
  'src/**/*.decorator.ts',     // decorateurs simples
  'src/config/**',             // configuration statique
  'src/**/*.constants.ts',     // constantes
]
```

#### Rappel important sur la couverture

La couverture de code est une **condition necessaire mais pas suffisante**. Comme demontre par l'etude HumanEval-Java, 100% de couverture peut correspondre a seulement 4% d'efficacite en mutation testing. C'est pourquoi le mutation testing est obligatoire sur les modules critiques (section 2.10.1). La couverture detecte le code non teste ; le mutation testing detecte le code mal teste.

---

### 2.12 Configuration CI

#### Pipeline CI principal

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # ──────────────────────────────────────────────
  # BACKEND
  # ──────────────────────────────────────────────
  backend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: cd backend && npm ci
      - run: cd backend && npm run lint
      - run: cd backend && npx tsc --noEmit

  backend-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: cd backend && npm ci
      - run: cd backend && npx vitest --run --reporter=verbose --coverage
      - name: Check coverage thresholds
        run: cd backend && node scripts/check-coverage.js

  backend-integration:
    runs-on: ubuntu-latest
    services:
      docker:
        image: docker:dind
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: cd backend && npm ci
      - run: cd backend && npx vitest --run --config vitest.integration.config.ts

  backend-api-contract:
    runs-on: ubuntu-latest
    needs: [backend-unit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: cd backend && npm ci && npm run build
      - run: cd backend && npm run generate:openapi -- --output openapi-current.json
      - name: Check breaking changes
        run: |
          git show origin/main:backend/openapi.json > openapi-main.json 2>/dev/null || exit 0
          npx oasdiff breaking openapi-main.json backend/openapi-current.json --fail-on ERR

  # ──────────────────────────────────────────────
  # FLUTTER
  # ──────────────────────────────────────────────
  flutter-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.x' }
      - run: cd apps/consumer && flutter pub get && flutter test --coverage
      - run: cd apps/partner && flutter pub get && flutter test --coverage
      - name: Check coverage
        run: |
          # Utiliser lcov pour verifier les seuils
          cd apps/consumer && genhtml coverage/lcov.info -o coverage/html
          cd apps/partner && genhtml coverage/lcov.info -o coverage/html

  flutter-golden:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.x' }
      - run: cd apps/consumer && flutter test --tags=golden --update-goldens=false
      - run: cd apps/partner && flutter test --tags=golden --update-goldens=false

  # ──────────────────────────────────────────────
  # REACT ADMIN
  # ──────────────────────────────────────────────
  admin-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: cd storybook-ui && npm ci
      - run: cd storybook-ui && npx vitest --run --coverage

  # ──────────────────────────────────────────────
  # SECURITY
  # ──────────────────────────────────────────────
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: cd backend && npm audit --audit-level=high
      - name: Gitleaks
        uses: gitleaks/gitleaks-action@v2
```

#### Pipeline nightly (mutation + E2E + securite)

```yaml
# .github/workflows/nightly.yml
name: Nightly

on:
  schedule:
    - cron: '0 2 * * *'  # 2h du matin UTC (6h Maurice)
  workflow_dispatch:

jobs:
  mutation-testing:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: cd backend && npm ci
      - run: cd backend && npx stryker run --incremental
      - name: Check mutation scores
        run: cd backend && node scripts/check-mutation-score.js
      - uses: actions/upload-artifact@v4
        with:
          name: stryker-report
          path: backend/reports/mutation/

  flutter-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.x' }
      - name: Start backend (test mode)
        run: cd backend && npm run start:test &
      - run: cd apps/consumer && flutter test integration_test/ --flavor staging

  owasp-zap:
    runs-on: ubuntu-latest
    needs: [mutation-testing]
    steps:
      - uses: actions/checkout@v4
      - name: Start backend
        run: cd backend && npm run start:test &
      - name: OWASP ZAP Baseline
        uses: zaproxy/action-baseline@v0.14.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap-rules.tsv'
```

---

### 2.13 Recommandations specifiques pour les tests ecrits par IA

#### 2.13.1 Regles du prompt pour l'agent IA

Quand l'agent IA ecrit des tests, le prompt doit inclure ces directives explicites :

```markdown
## Regles de test obligatoires

1. **Pas de tests miroir** : ne jamais re-implementer la logique du code dans le test.
   - MAUVAIS : `expect(add(2,3)).toBe(2+3)`
   - BON : `expect(add(2,3)).toBe(5)`

2. **Edge cases obligatoires** pour chaque fonction publique :
   - Valeurs limites (0, -1, MAX_SAFE_INTEGER, string vide, null, undefined)
   - Collections vides et a un element
   - Conditions aux bornes (>=, <=, ==)
   - Cas de concurrence (si applicable)

3. **Tests negatifs** : au minimum 1 test d'erreur par fonction publique
   - Que se passe-t-il avec des inputs invalides ?
   - Que se passe-t-il si la DB est indisponible ?
   - Que se passe-t-il si le service externe echoue ?

4. **Nomenclature** : `should [expected behavior] when [condition]`
   - BON : `should return 403 when consumer tries to access partner endpoint`
   - MAUVAIS : `test auth`

5. **Un assert par test** (sauf tests d'integration multi-etapes) :
   - Chaque test verifie UN comportement
   - Les tests sont independants les uns des autres

6. **Pas de mocks excessifs** : si on mock tout, on ne teste rien.
   - Rule of thumb : ne mocker que ce qui est en dehors de l'unite testee
```

#### 2.13.2 Checklist de review des tests IA

Chaque PR doit etre reviewee avec cette checklist :

- [ ] Les tests couvrent le happy path
- [ ] Les tests couvrent au minimum 3 edge cases non triviaux
- [ ] Les tests couvrent au minimum 1 cas d'erreur
- [ ] Les tests ne re-implementent pas la logique du code (pas de tests miroir)
- [ ] Les noms de tests decrivent le comportement attendu, pas l'implementation
- [ ] Les assertions sont specifiques (pas de `toBeTruthy()` quand on peut utiliser `toBe(specificValue)`)
- [ ] Les tests sont independants (pas de dependance a l'ordre d'execution)
- [ ] Les mocks sont justifies (pas de mock excessif)
- [ ] La couverture respecte le seuil du module
- [ ] Le mutation testing passe (si module critique)

#### 2.13.3 Strategie de renforcement continu

```
Semaine 1-4 (MVP) :
  - Tests unitaires + integration ecrits par l'agent IA
  - Coverage minimum active en CI
  - Review humaine de tous les tests

Semaine 5-8 :
  - Activation mutation testing (Stryker) sur state machines + ledger
  - Premiere boucle : mutants survivants -> agent IA genere tests supplementaires
  - Activation property-based testing sur les calculs financiers

Semaine 9-12 :
  - Extension mutation testing a paiements + auth
  - Activation tests E2E Flutter
  - Activation OWASP ZAP nightly

Mois 4+ :
  - Mutation testing en mode incremental sur chaque PR (modules critiques)
  - Golden tests Flutter stabilises
  - Chromatic pour visual regression React admin
```

---

## 3. Exemples de tests pour les modules critiques

### 3.1 State machine : reservation (ADR-017)

```typescript
// src/modules/reservation/state-machine/__tests__/reservation-sm.spec.ts
import { describe, it, expect } from 'vitest';
import { reservationMachine, ReservationState, ReservationEvent } from '../reservation-sm';

describe('Reservation state machine', () => {
  describe('happy path: PENDING -> CONFIRMED -> CAPTURED -> PICKED_UP -> COMPLETED', () => {
    it('should transition from PENDING to CONFIRMED on CONFIRM', () => {
      const result = reservationMachine.transition('PENDING', 'CONFIRM');
      expect(result.state).toBe('CONFIRMED');
    });

    it('should transition from CONFIRMED to CAPTURED on CAPTURE', () => {
      const result = reservationMachine.transition('CONFIRMED', 'CAPTURE');
      expect(result.state).toBe('CAPTURED');
    });

    it('should transition from CAPTURED to PICKED_UP on PICKUP', () => {
      const result = reservationMachine.transition('CAPTURED', 'PICKUP');
      expect(result.state).toBe('PICKED_UP');
    });

    it('should transition from PICKED_UP to COMPLETED on COMPLETE', () => {
      const result = reservationMachine.transition('PICKED_UP', 'COMPLETE');
      expect(result.state).toBe('COMPLETED');
    });
  });

  describe('cancellation paths', () => {
    it('should allow consumer cancellation from PENDING', () => {
      const result = reservationMachine.transition('PENDING', 'CANCEL_CONSUMER');
      expect(result.state).toBe('CANCELLED_CONSUMER');
      expect(result.effects).toContain('RELEASE_STOCK');
    });

    it('should allow consumer cancellation from CONFIRMED', () => {
      const result = reservationMachine.transition('CONFIRMED', 'CANCEL_CONSUMER');
      expect(result.state).toBe('CANCELLED_CONSUMER');
      expect(result.effects).toContain('RELEASE_STOCK');
      expect(result.effects).toContain('VOID_PRE_AUTH');
    });

    it('should NOT allow consumer cancellation from CAPTURED', () => {
      const result = reservationMachine.transition('CAPTURED', 'CANCEL_CONSUMER');
      expect(result).toBeNull();
    });

    it('should allow partner cancellation from any non-terminal state', () => {
      const nonTerminalStates: ReservationState[] = [
        'PENDING', 'CONFIRMED', 'CAPTURED',
      ];
      for (const state of nonTerminalStates) {
        const result = reservationMachine.transition(state, 'CANCEL_PARTNER');
        expect(result).not.toBeNull();
        expect(result!.state).toBe('CANCELLED_PARTNER');
        expect(result!.effects).toContain('REFUND_CONSUMER');
      }
    });
  });

  describe('no-show handling', () => {
    it('should transition from CAPTURED to NO_SHOW on NO_SHOW event', () => {
      const result = reservationMachine.transition('CAPTURED', 'NO_SHOW');
      expect(result!.state).toBe('NO_SHOW');
      // Le consommateur est debite (pas de remboursement)
      expect(result!.effects).not.toContain('REFUND_CONSUMER');
    });

    it('should NOT allow NO_SHOW from PENDING (paiement pas encore fait)', () => {
      const result = reservationMachine.transition('PENDING', 'NO_SHOW');
      expect(result).toBeNull();
    });
  });

  describe('guards', () => {
    it('should reject CONFIRM if basket has expired', () => {
      const context = {
        basketPickupEnd: new Date('2025-01-01T10:00:00Z'), // dans le passe
        now: new Date('2025-01-01T12:00:00Z'),
      };
      const result = reservationMachine.transition('PENDING', 'CONFIRM', context);
      expect(result).toBeNull();
    });

    it('should reject CONFIRM if stock is 0', () => {
      const context = { availableStock: 0 };
      const result = reservationMachine.transition('PENDING', 'CONFIRM', context);
      expect(result).toBeNull();
    });
  });

  describe('effects', () => {
    it('should trigger DECREMENT_STOCK on CONFIRM', () => {
      const result = reservationMachine.transition('PENDING', 'CONFIRM');
      expect(result!.effects).toContain('DECREMENT_STOCK');
    });

    it('should trigger NOTIFY_PARTNER on CONFIRM', () => {
      const result = reservationMachine.transition('PENDING', 'CONFIRM');
      expect(result!.effects).toContain('NOTIFY_PARTNER');
    });

    it('should trigger CAPTURE_PAYMENT on CAPTURE', () => {
      const result = reservationMachine.transition('CONFIRMED', 'CAPTURE');
      expect(result!.effects).toContain('CAPTURE_PAYMENT');
    });

    it('should trigger WRITE_LEDGER on CAPTURE', () => {
      const result = reservationMachine.transition('CONFIRMED', 'CAPTURE');
      expect(result!.effects).toContain('WRITE_LEDGER');
    });
  });
});
```

### 3.2 Ledger : calcul de commission (ADR-007)

```typescript
// src/modules/ledger/__tests__/commission.spec.ts
import { describe, it, expect } from 'vitest';
import { calculateCommission, calculateSplit } from '../commission';

describe('Commission calculation (ADR-007)', () => {
  describe('basic commission', () => {
    it('should calculate 25% commission on Rs 400', () => {
      const result = calculateCommission({
        amount: 40000,       // 400.00 MUR in cents
        commissionRate: 0.25,
        feeMinimum: 5000,    // 50.00 MUR minimum
      });
      expect(result).toBe(10000); // Rs 100
    });

    it('should apply fee minimum when commission is below threshold', () => {
      // 25% of Rs 100 = Rs 25, but minimum is Rs 50
      const result = calculateCommission({
        amount: 10000,       // Rs 100
        commissionRate: 0.25,
        feeMinimum: 5000,    // Rs 50 minimum
      });
      expect(result).toBe(5000); // Rs 50 (minimum applied)
    });

    it('should not apply fee minimum when commission exceeds it', () => {
      // 25% of Rs 400 = Rs 100 > Rs 50 minimum
      const result = calculateCommission({
        amount: 40000,
        commissionRate: 0.25,
        feeMinimum: 5000,
      });
      expect(result).toBe(10000); // Rs 100 (no minimum applied)
    });
  });

  describe('edge cases', () => {
    it('should handle zero commission rate', () => {
      const result = calculateCommission({
        amount: 40000,
        commissionRate: 0,
        feeMinimum: 5000,
      });
      // Fee minimum still applies
      expect(result).toBe(5000);
    });

    it('should handle commission that equals fee minimum exactly', () => {
      // 25% of Rs 200 = Rs 50 = fee minimum
      const result = calculateCommission({
        amount: 20000,
        commissionRate: 0.25,
        feeMinimum: 5000,
      });
      expect(result).toBe(5000); // Exactly the minimum
    });

    it('should handle very small amounts', () => {
      // 25% of Rs 1 = Rs 0.25 -> fee minimum Rs 50
      const result = calculateCommission({
        amount: 100,         // Rs 1
        commissionRate: 0.25,
        feeMinimum: 5000,
      });
      expect(result).toBe(5000); // Fee minimum applied
    });

    it('should handle fee minimum of zero', () => {
      const result = calculateCommission({
        amount: 10000,
        commissionRate: 0.25,
        feeMinimum: 0,
      });
      expect(result).toBe(2500); // 25% of Rs 100, no minimum
    });

    it('should always return an integer (no floating point)', () => {
      // 25% of Rs 333 = Rs 83.25 -> should round
      const result = calculateCommission({
        amount: 33300,
        commissionRate: 0.25,
        feeMinimum: 0,
      });
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('split calculation', () => {
    it('should split correctly: partner amount + commission = total', () => {
      const result = calculateSplit({
        amount: 15000,       // Rs 150
        commissionRate: 0.25,
        feeMinimum: 5000,
      });
      expect(result.partnerAmount + result.commission).toBe(15000);
    });

    it('should give partner the remaining after commission', () => {
      const result = calculateSplit({
        amount: 40000,       // Rs 400
        commissionRate: 0.25,
        feeMinimum: 5000,
      });
      expect(result.commission).toBe(10000);     // Rs 100
      expect(result.partnerAmount).toBe(30000);  // Rs 300
    });

    it('should handle fee minimum impacting partner amount', () => {
      const result = calculateSplit({
        amount: 10000,       // Rs 100
        commissionRate: 0.10, // 10% = Rs 10, but min Rs 50
        feeMinimum: 5000,
      });
      expect(result.commission).toBe(5000);      // Rs 50 (minimum)
      expect(result.partnerAmount).toBe(5000);   // Rs 50 (remaining)
    });
  });
});
```

### 3.3 Stock atomique (ADR-008)

```typescript
// src/modules/stock/__tests__/atomic-stock.spec.ts
import { describe, it, expect } from 'vitest';
import { StockService } from '../stock.service';

describe('Atomic stock operations (ADR-008)', () => {
  let stockService: StockService;

  // Ces tests utilisent un mock de PrismaClient
  // Les tests d'integration avec DB reelle sont dans test/integration/

  describe('decrementStock', () => {
    it('should decrement stock by requested quantity', async () => {
      mockPrisma.basket.update.mockResolvedValue({
        id: 'basket-1',
        quantityAvailable: 4,
        quantity: 5,
      });

      const result = await stockService.decrementStock('basket-1', 1);
      expect(result.quantityAvailable).toBe(4);
    });

    it('should throw InsufficientStockError when stock is 0', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ quantity_available: 0 }]);

      await expect(
        stockService.decrementStock('basket-1', 1),
      ).rejects.toThrow('INSUFFICIENT_STOCK');
    });

    it('should throw InsufficientStockError when requested > available', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ quantity_available: 2 }]);

      await expect(
        stockService.decrementStock('basket-1', 3),
      ).rejects.toThrow('INSUFFICIENT_STOCK');
    });

    it('should throw for quantity <= 0', async () => {
      await expect(
        stockService.decrementStock('basket-1', 0),
      ).rejects.toThrow('INVALID_QUANTITY');

      await expect(
        stockService.decrementStock('basket-1', -1),
      ).rejects.toThrow('INVALID_QUANTITY');
    });

    it('should throw for non-existent basket', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await expect(
        stockService.decrementStock('nonexistent', 1),
      ).rejects.toThrow('BASKET_NOT_FOUND');
    });
  });

  describe('incrementStock (on cancellation)', () => {
    it('should re-increment stock on cancellation', async () => {
      mockPrisma.basket.update.mockResolvedValue({
        id: 'basket-1',
        quantityAvailable: 3,
        quantity: 5,
      });

      const result = await stockService.incrementStock('basket-1', 1);
      expect(result.quantityAvailable).toBe(3);
    });

    it('should NOT allow stock to exceed total quantity', async () => {
      mockPrisma.basket.findUnique.mockResolvedValue({
        id: 'basket-1',
        quantityAvailable: 5,
        quantity: 5,
      });

      await expect(
        stockService.incrementStock('basket-1', 1),
      ).rejects.toThrow('STOCK_OVERFLOW');
    });
  });
});
```

### 3.4 Paiement : cycle complet avec mock Peach (ADR-005)

```typescript
// test/integration/payment/payment-cycle.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { peachFixtures } from '../../fixtures/peach-payments';
import nock from 'nock';

describe('Payment cycle integration (ADR-005)', () => {
  const PEACH_BASE_URL = 'https://eu-test.oppwa.com';

  beforeEach(() => {
    nock.cleanAll();
  });

  describe('Carte Visa : pre-autorisation + capture', () => {
    it('should pre-authorize, then capture on pickup window start', async () => {
      // GIVEN : mock Peach pour la pre-autorisation
      nock(PEACH_BASE_URL)
        .post('/v1/payments')
        .reply(200, peachFixtures.preAuthSuccess);

      // Creer une reservation (qui declenche la pre-auth)
      const reservation = await request(app)
        .post('/api/v1/reservations')
        .send({
          basketId: basket.id,
          quantity: 1,
          paymentMethod: 'CARD',
          cardToken: 'tok_visa_4242',
        })
        .set('Authorization', `Bearer ${consumerToken}`);

      expect(reservation.status).toBe(201);
      expect(reservation.body.paymentStatus).toBe('PRE_AUTHORIZED');

      // GIVEN : mock Peach pour la capture
      nock(PEACH_BASE_URL)
        .post(`/v1/payments/${peachFixtures.preAuthSuccess.id}`)
        .reply(200, {
          ...peachFixtures.preAuthSuccess,
          paymentType: 'CP', // Capture
        });

      // WHEN : le job de capture se declenche (debut du creneau de retrait)
      await runCaptureJob(reservation.body.id);

      // THEN : le paiement est capture
      const updated = await prisma.reservation.findUnique({
        where: { id: reservation.body.id },
        include: { payment: true },
      });
      expect(updated!.payment!.status).toBe('CAPTURED');
      expect(updated!.status).toBe('CAPTURED');
    });

    it('should void pre-auth on consumer cancellation before pickup', async () => {
      // GIVEN : reservation avec pre-auth reussie
      nock(PEACH_BASE_URL)
        .post('/v1/payments')
        .reply(200, peachFixtures.preAuthSuccess);

      const reservation = await request(app)
        .post('/api/v1/reservations')
        .send({
          basketId: basket.id, quantity: 1,
          paymentMethod: 'CARD', cardToken: 'tok_visa_4242',
        })
        .set('Authorization', `Bearer ${consumerToken}`);

      // GIVEN : mock Peach pour le void (reversal)
      nock(PEACH_BASE_URL)
        .post(`/v1/payments/${peachFixtures.preAuthSuccess.id}`)
        .reply(200, {
          ...peachFixtures.preAuthSuccess,
          paymentType: 'RV', // Reversal (void)
        });

      // WHEN : le consommateur annule
      const cancel = await request(app)
        .post(`/api/v1/reservations/${reservation.body.id}/cancel`)
        .set('Authorization', `Bearer ${consumerToken}`);

      // THEN : pre-auth annulee, aucun montant debite
      expect(cancel.status).toBe(200);
      const updated = await prisma.payment.findFirst({
        where: { reservationId: reservation.body.id },
      });
      expect(updated!.status).toBe('VOIDED');
    });
  });

  describe('MCB Juice : debit immediat (pas de pre-auth)', () => {
    it('should debit immediately and refund on cancellation', async () => {
      // GIVEN : mock Peach pour le debit immediat MCB Juice
      nock(PEACH_BASE_URL)
        .post('/v1/payments')
        .reply(200, peachFixtures.debitMcbJuiceSuccess);

      const reservation = await request(app)
        .post('/api/v1/reservations')
        .send({
          basketId: basket.id, quantity: 1,
          paymentMethod: 'MCBJUICE',
          juicePhoneNumber: '+23057001234',
        })
        .set('Authorization', `Bearer ${consumerToken}`);

      expect(reservation.status).toBe(201);
      expect(reservation.body.paymentStatus).toBe('DEBITED');

      // GIVEN : mock Peach pour le remboursement
      nock(PEACH_BASE_URL)
        .post(`/v1/payments/${peachFixtures.debitMcbJuiceSuccess.id}`)
        .reply(200, {
          id: 'REF_001',
          referencedId: peachFixtures.debitMcbJuiceSuccess.id,
          result: { code: '000.100.110', description: 'Request successfully processed' },
          paymentType: 'RF',
          amount: '150.00',
          currency: 'MUR',
        });

      // WHEN : le consommateur annule (remboursement, pas de void)
      const cancel = await request(app)
        .post(`/api/v1/reservations/${reservation.body.id}/cancel`)
        .set('Authorization', `Bearer ${consumerToken}`);

      // THEN : remboursement initie
      expect(cancel.status).toBe(200);
      expect(cancel.body.paymentStatus).toBe('REFUND_PENDING');
    });
  });

  describe('Echecs de paiement', () => {
    it('should handle insufficient funds gracefully', async () => {
      nock(PEACH_BASE_URL)
        .post('/v1/payments')
        .reply(200, peachFixtures.insufficientFunds);

      const reservation = await request(app)
        .post('/api/v1/reservations')
        .send({
          basketId: basket.id, quantity: 1,
          paymentMethod: 'CARD', cardToken: 'tok_visa_declined',
        })
        .set('Authorization', `Bearer ${consumerToken}`);

      // Le endpoint renvoie 402 (Payment Required)
      expect(reservation.status).toBe(402);
      expect(reservation.body.error.code).toBe('PAYMENT_DECLINED');
      expect(reservation.body.error.message).toContain('fonds insuffisants');

      // Le stock ne doit PAS etre decremente
      const updatedBasket = await prisma.basket.findUnique({
        where: { id: basket.id },
      });
      expect(updatedBasket!.quantityAvailable).toBe(basket.quantityAvailable);
    });

    it('should handle Peach API timeout with 5-min hold', async () => {
      nock(PEACH_BASE_URL)
        .post('/v1/payments')
        .delayConnection(30_000) // timeout
        .reply(504);

      const reservation = await request(app)
        .post('/api/v1/reservations')
        .send({
          basketId: basket.id, quantity: 1,
          paymentMethod: 'CARD', cardToken: 'tok_visa_4242',
        })
        .set('Authorization', `Bearer ${consumerToken}`);

      // Le stock est decremente avec un hold de 5 min (ADR-008 E8)
      expect(reservation.status).toBe(202); // Accepted (pending payment)
      expect(reservation.body.status).toBe('PAYMENT_PENDING');
      expect(reservation.body.holdExpiresAt).toBeDefined();
    });
  });

  describe('Webhooks Peach Payments', () => {
    it('should process payment.completed webhook and update reservation', async () => {
      // GIVEN : une reservation en attente de confirmation webhook
      const reservation = await seedReservation({
        status: 'PAYMENT_PENDING',
        paymentExternalId: 'PAY_abc123',
      });

      // WHEN : Peach envoie le webhook de confirmation
      const webhook = await request(app)
        .post('/api/v1/webhooks/peach')
        .send(peachFixtures.webhookPaymentSuccess)
        .set('X-Peach-Signature', generatePeachSignature(
          peachFixtures.webhookPaymentSuccess,
          process.env.PEACH_WEBHOOK_SECRET!,
        ));

      // THEN : la reservation est confirmee
      expect(webhook.status).toBe(200);

      const updated = await prisma.reservation.findUnique({
        where: { id: reservation.id },
      });
      expect(updated!.status).toBe('CONFIRMED');
    });

    it('should reject webhook with invalid signature', async () => {
      const webhook = await request(app)
        .post('/api/v1/webhooks/peach')
        .send(peachFixtures.webhookPaymentSuccess)
        .set('X-Peach-Signature', 'invalid-signature');

      expect(webhook.status).toBe(401);
    });

    it('should handle duplicate webhook idempotently', async () => {
      const reservation = await seedReservation({
        status: 'PAYMENT_PENDING',
        paymentExternalId: 'PAY_abc123',
      });

      const signature = generatePeachSignature(
        peachFixtures.webhookPaymentSuccess,
        process.env.PEACH_WEBHOOK_SECRET!,
      );

      // Envoyer le meme webhook 3 fois
      await request(app).post('/api/v1/webhooks/peach')
        .send(peachFixtures.webhookPaymentSuccess)
        .set('X-Peach-Signature', signature);
      await request(app).post('/api/v1/webhooks/peach')
        .send(peachFixtures.webhookPaymentSuccess)
        .set('X-Peach-Signature', signature);
      const third = await request(app).post('/api/v1/webhooks/peach')
        .send(peachFixtures.webhookPaymentSuccess)
        .set('X-Peach-Signature', signature);

      // Le troisieme renvoie 200 (idempotent) mais ne change rien
      expect(third.status).toBe(200);

      // Une seule ecriture ledger
      const ledgerEntries = await prisma.ledgerEntry.count({
        where: { reservationId: reservation.id },
      });
      // 2 ecritures (debit consumer + credit platform) -- pas 6
      expect(ledgerEntries).toBeLessThanOrEqual(4);
    });
  });
});
```

### 3.5 BullMQ : tests de jobs asynchrones

```typescript
// src/modules/notification/__tests__/notification-job.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationProcessor } from '../notification.processor';
import { Job } from 'bullmq';

describe('Notification job processor', () => {
  let processor: NotificationProcessor;
  let mockFcmService: { sendPush: ReturnType<typeof vi.fn> };
  let mockResendService: { sendEmail: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockFcmService = { sendPush: vi.fn().mockResolvedValue({ messageId: 'msg_123' }) };
    mockResendService = { sendEmail: vi.fn().mockResolvedValue({ id: 'email_123' }) };
    processor = new NotificationProcessor(mockFcmService, mockResendService);
  });

  it('should send push notification for RESERVATION_CONFIRMED', async () => {
    const job = {
      data: {
        type: 'RESERVATION_CONFIRMED',
        userId: 'user-1',
        channels: ['PUSH'],
        payload: {
          reservationId: 'res-1',
          basketName: 'Panier Surprise',
          partnerName: 'Boulangerie du Port',
          pickupWindow: '17h00 - 18h00',
        },
      },
    } as Job;

    await processor.process(job);

    expect(mockFcmService.sendPush).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        title: expect.stringContaining('Reservation confirmee'),
        body: expect.stringContaining('Boulangerie du Port'),
      }),
    );
  });

  it('should send both push and email for RESERVATION_CANCELLED_PARTNER', async () => {
    const job = {
      data: {
        type: 'RESERVATION_CANCELLED_PARTNER',
        userId: 'user-1',
        channels: ['PUSH', 'EMAIL'],
        payload: {
          reservationId: 'res-1',
          partnerName: 'Epicerie Flacq',
          refundAmount: 15000,
        },
      },
    } as Job;

    await processor.process(job);

    expect(mockFcmService.sendPush).toHaveBeenCalledTimes(1);
    expect(mockResendService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'reservation-cancelled-partner',
        to: expect.any(String),
        variables: expect.objectContaining({
          refundAmount: 'Rs 150.00',
        }),
      }),
    );
  });

  it('should retry on FCM transient failure (not throw)', async () => {
    mockFcmService.sendPush.mockRejectedValueOnce(new Error('FCM_UNAVAILABLE'));

    const job = {
      data: {
        type: 'RESERVATION_CONFIRMED',
        userId: 'user-1',
        channels: ['PUSH'],
        payload: { reservationId: 'res-1' },
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job;

    // Le processor doit lever l'erreur pour que BullMQ retry
    await expect(processor.process(job)).rejects.toThrow('FCM_UNAVAILABLE');
  });

  it('should not send push if user has disabled notifications', async () => {
    const job = {
      data: {
        type: 'RESERVATION_CONFIRMED',
        userId: 'user-no-push',
        channels: [], // vide car l'utilisateur a desactive
        payload: { reservationId: 'res-1' },
      },
    } as Job;

    await processor.process(job);

    expect(mockFcmService.sendPush).not.toHaveBeenCalled();
    expect(mockResendService.sendEmail).not.toHaveBeenCalled();
  });
});

// test/integration/notification/notification-queue.spec.ts
describe('Notification queue integration', () => {
  // Ces tests utilisent un Redis reel via Testcontainers
  it('should enqueue notification job when reservation is confirmed', async () => {
    // GIVEN : un panier et un consumer
    const basket = await seedBasket({ quantity: 5 });

    // Mock Peach pour la pre-auth
    nock(PEACH_BASE_URL)
      .post('/v1/payments')
      .reply(200, peachFixtures.preAuthSuccess);

    // WHEN : le consumer cree une reservation
    await request(app)
      .post('/api/v1/reservations')
      .send({
        basketId: basket.id,
        quantity: 1,
        paymentMethod: 'CARD',
        cardToken: 'tok_visa_4242',
      })
      .set('Authorization', `Bearer ${consumerToken}`);

    // THEN : un job de notification est en queue
    const waitingJobs = await notificationQueue.getWaiting();
    expect(waitingJobs.length).toBeGreaterThanOrEqual(1);

    const notifJob = waitingJobs.find(
      j => j.data.type === 'RESERVATION_CONFIRMED',
    );
    expect(notifJob).toBeDefined();
    expect(notifJob!.data.channels).toContain('PUSH');
  });
});
```

### 3.6 Flutter : widget test + golden test + bloc test

```dart
// apps/consumer/test/widgets/basket_card_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:bienbon_consumer/widgets/basket_card.dart';
import 'package:bienbon_consumer/models/basket.dart';

void main() {
  final testBasket = Basket(
    id: 'basket-1',
    name: 'Panier Surprise',
    partnerName: 'Boulangerie du Port',
    originalPrice: 400,
    discountedPrice: 150,
    quantityAvailable: 3,
    pickupStart: DateTime(2026, 3, 1, 17, 0),
    pickupEnd: DateTime(2026, 3, 1, 18, 0),
    imageUrl: 'https://example.com/basket.jpg',
    distance: 1.2,
  );

  group('BasketCard widget', () {
    testWidgets('should display partner name and basket name', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: BasketCard(basket: testBasket)),
      );

      expect(find.text('Boulangerie du Port'), findsOneWidget);
      expect(find.text('Panier Surprise'), findsOneWidget);
    });

    testWidgets('should display discounted price with Rs prefix', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: BasketCard(basket: testBasket)),
      );

      expect(find.text('Rs 150'), findsOneWidget);
    });

    testWidgets('should display original price with strikethrough', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: BasketCard(basket: testBasket)),
      );

      final originalPriceWidget = tester.widget<Text>(
        find.text('Rs 400'),
      );
      expect(
        originalPriceWidget.style?.decoration,
        TextDecoration.lineThrough,
      );
    });

    testWidgets('should show "Epuise" badge when quantity is 0', (tester) async {
      final soldOutBasket = testBasket.copyWith(quantityAvailable: 0);
      await tester.pumpWidget(
        MaterialApp(home: BasketCard(basket: soldOutBasket)),
      );

      expect(find.text('Epuise'), findsOneWidget);
    });

    testWidgets('should display pickup window formatted in French', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: BasketCard(basket: testBasket)),
      );

      expect(find.text('17h00 - 18h00'), findsOneWidget);
    });

    testWidgets('should call onTap when card is tapped', (tester) async {
      var tapped = false;
      await tester.pumpWidget(
        MaterialApp(
          home: BasketCard(
            basket: testBasket,
            onTap: () => tapped = true,
          ),
        ),
      );

      await tester.tap(find.byType(BasketCard));
      expect(tapped, isTrue);
    });

    testWidgets('should display distance with km suffix', (tester) async {
      await tester.pumpWidget(
        MaterialApp(home: BasketCard(basket: testBasket)),
      );

      expect(find.text('1.2 km'), findsOneWidget);
    });
  });
}
```

```dart
// apps/consumer/test/golden/basket_card_golden_test.dart
@Tags(['golden'])
import 'package:flutter_test/flutter_test.dart';
import 'package:golden_toolkit/golden_toolkit.dart';
import 'package:bienbon_consumer/widgets/basket_card.dart';
import 'package:bienbon_consumer/models/basket.dart';

void main() {
  final testBasket = Basket(
    id: 'basket-1',
    name: 'Panier Surprise',
    partnerName: 'Boulangerie du Port',
    originalPrice: 400,
    discountedPrice: 150,
    quantityAvailable: 3,
    pickupStart: DateTime(2026, 3, 1, 17, 0),
    pickupEnd: DateTime(2026, 3, 1, 18, 0),
    imageUrl: null, // pas d'image pour golden test (determinisme)
    distance: 1.2,
  );

  group('BasketCard golden tests', () {
    testGoldens('BasketCard - available', (tester) async {
      final builder = GoldenBuilder.grid(columns: 2, widthToHeightRatio: 0.8)
        ..addScenario(
          'Available (3 left)',
          BasketCard(basket: testBasket),
        )
        ..addScenario(
          'Last one',
          BasketCard(basket: testBasket.copyWith(quantityAvailable: 1)),
        )
        ..addScenario(
          'Sold out',
          BasketCard(basket: testBasket.copyWith(quantityAvailable: 0)),
        )
        ..addScenario(
          'Long partner name',
          BasketCard(
            basket: testBasket.copyWith(
              partnerName: 'Restaurant Le Chateau de Mon Plaisir Pamplemousses',
            ),
          ),
        );

      await tester.pumpWidgetBuilder(builder.build());
      await screenMatchesGolden(tester, 'basket_card_grid');
    });
  });
}
```

```dart
// apps/consumer/test/bloc/reservation_cubit_test.dart
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:bienbon_consumer/cubits/reservation_cubit.dart';
import 'package:bienbon_consumer/repositories/reservation_repository.dart';

class MockReservationRepository extends Mock implements ReservationRepository {}

void main() {
  late MockReservationRepository mockRepo;

  setUp(() {
    mockRepo = MockReservationRepository();
  });

  group('ReservationCubit', () {
    blocTest<ReservationCubit, ReservationState>(
      'emits [Loading, Success] when createReservation succeeds',
      build: () {
        when(() => mockRepo.createReservation(
          basketId: any(named: 'basketId'),
          quantity: any(named: 'quantity'),
          paymentMethod: any(named: 'paymentMethod'),
        )).thenAnswer((_) async => Reservation(
          id: 'res-1',
          status: ReservationStatus.confirmed,
          basketName: 'Panier Surprise',
        ));

        return ReservationCubit(repository: mockRepo);
      },
      act: (cubit) => cubit.createReservation(
        basketId: 'basket-1',
        quantity: 1,
        paymentMethod: PaymentMethod.card,
      ),
      expect: () => [
        isA<ReservationLoading>(),
        isA<ReservationSuccess>()
          .having((s) => s.reservation.id, 'id', 'res-1')
          .having((s) => s.reservation.status, 'status', ReservationStatus.confirmed),
      ],
    );

    blocTest<ReservationCubit, ReservationState>(
      'emits [Loading, Error] when basket is sold out',
      build: () {
        when(() => mockRepo.createReservation(
          basketId: any(named: 'basketId'),
          quantity: any(named: 'quantity'),
          paymentMethod: any(named: 'paymentMethod'),
        )).thenThrow(InsufficientStockException());

        return ReservationCubit(repository: mockRepo);
      },
      act: (cubit) => cubit.createReservation(
        basketId: 'basket-1',
        quantity: 1,
        paymentMethod: PaymentMethod.card,
      ),
      expect: () => [
        isA<ReservationLoading>(),
        isA<ReservationError>()
          .having((e) => e.type, 'type', ReservationErrorType.soldOut),
      ],
    );

    blocTest<ReservationCubit, ReservationState>(
      'emits [Loading, PaymentDeclined] when payment fails',
      build: () {
        when(() => mockRepo.createReservation(
          basketId: any(named: 'basketId'),
          quantity: any(named: 'quantity'),
          paymentMethod: any(named: 'paymentMethod'),
        )).thenThrow(PaymentDeclinedException(reason: 'insufficient_funds'));

        return ReservationCubit(repository: mockRepo);
      },
      act: (cubit) => cubit.createReservation(
        basketId: 'basket-1',
        quantity: 1,
        paymentMethod: PaymentMethod.card,
      ),
      expect: () => [
        isA<ReservationLoading>(),
        isA<ReservationError>()
          .having((e) => e.type, 'type', ReservationErrorType.paymentDeclined),
      ],
    );

    blocTest<ReservationCubit, ReservationState>(
      'emits [CancelLoading, CancelSuccess] when cancel succeeds',
      build: () {
        when(() => mockRepo.cancelReservation(any()))
          .thenAnswer((_) async => CancelResult(refundStatus: 'initiated'));

        return ReservationCubit(repository: mockRepo);
      },
      seed: () => ReservationSuccess(reservation: Reservation(
        id: 'res-1',
        status: ReservationStatus.confirmed,
        basketName: 'Panier Surprise',
      )),
      act: (cubit) => cubit.cancelReservation('res-1'),
      expect: () => [
        isA<ReservationCancelLoading>(),
        isA<ReservationCancelSuccess>(),
      ],
    );
  });
}
```

### 3.7 React Admin : composant existant + test d'integration Storybook

```typescript
// storybook-ui/src/components/__tests__/StoreCard.spec.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreCard } from '../StoreCard';

describe('StoreCard component', () => {
  const defaultProps = {
    name: 'Boulangerie du Port',
    category: 'Boulangerie',
    distance: '1.2 km',
    basketCount: 3,
    rating: 4.5,
    reviewCount: 28,
    imageUrl: '/test-image.jpg',
    priceOriginal: 400,
    priceDiscounted: 150,
  };

  it('should render store name and category', () => {
    render(<StoreCard {...defaultProps} />);

    expect(screen.getByText('Boulangerie du Port')).toBeInTheDocument();
    expect(screen.getByText('Boulangerie')).toBeInTheDocument();
  });

  it('should display the discount percentage', () => {
    render(<StoreCard {...defaultProps} />);

    // (400 - 150) / 400 = 62.5% -> "-63%"
    expect(screen.getByText(/-6[23]%/)).toBeInTheDocument();
  });

  it('should call onFavoriteToggle when favorite button is clicked', async () => {
    const user = userEvent.setup();
    const onFavorite = vi.fn();

    render(<StoreCard {...defaultProps} onFavoriteToggle={onFavorite} />);

    const favoriteBtn = screen.getByRole('button', { name: /favori/i });
    await user.click(favoriteBtn);

    expect(onFavorite).toHaveBeenCalledTimes(1);
  });

  it('should show "Epuise" when basketCount is 0', () => {
    render(<StoreCard {...defaultProps} basketCount={0} />);

    expect(screen.getByText(/epuise/i)).toBeInTheDocument();
  });

  it('should display rating with star icon', () => {
    render(<StoreCard {...defaultProps} />);

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(28)')).toBeInTheDocument();
  });
});
```

### 3.8 Tests d'autorisation RBAC exhaustifs (ADR-010/011)

```typescript
// test/integration/auth/rbac-matrix.spec.ts
import { describe, it, expect } from 'vitest';

/**
 * Matrice RBAC exhaustive.
 * Chaque endpoint est teste avec chaque role pour garantir
 * qu'aucun role ne peut acceder a des ressources non autorisees.
 */
describe('RBAC authorization matrix (ADR-010/011)', () => {
  // Tokens de test pour chaque role
  const tokens = {
    consumer: 'Bearer consumer-jwt',
    partner: 'Bearer partner-jwt',
    admin: 'Bearer admin-jwt',
    anonymous: undefined,
  };

  type RoleAccess = {
    consumer: number;
    partner: number;
    admin: number;
    anonymous: number;
  };

  const endpoints: Array<{
    method: string;
    path: string;
    body?: Record<string, unknown>;
    expectedStatus: RoleAccess;
  }> = [
    // Consumer endpoints
    {
      method: 'GET', path: '/api/v1/baskets',
      expectedStatus: { consumer: 200, partner: 200, admin: 200, anonymous: 200 },
    },
    {
      method: 'POST', path: '/api/v1/reservations',
      body: { basketId: 'test', quantity: 1, paymentMethod: 'CARD' },
      expectedStatus: { consumer: 201, partner: 403, admin: 403, anonymous: 401 },
    },
    {
      method: 'GET', path: '/api/v1/me/reservations',
      expectedStatus: { consumer: 200, partner: 403, admin: 200, anonymous: 401 },
    },
    // Partner endpoints
    {
      method: 'POST', path: '/api/v1/partner/baskets',
      body: { name: 'Test', quantity: 5, price: 150 },
      expectedStatus: { consumer: 403, partner: 201, admin: 403, anonymous: 401 },
    },
    {
      method: 'GET', path: '/api/v1/partner/reservations',
      expectedStatus: { consumer: 403, partner: 200, admin: 403, anonymous: 401 },
    },
    {
      method: 'POST', path: '/api/v1/partner/reservations/test-id/confirm-pickup',
      expectedStatus: { consumer: 403, partner: 200, admin: 403, anonymous: 401 },
    },
    {
      method: 'GET', path: '/api/v1/partner/statistics',
      expectedStatus: { consumer: 403, partner: 200, admin: 403, anonymous: 401 },
    },
    // Admin endpoints
    {
      method: 'GET', path: '/api/v1/admin/partners',
      expectedStatus: { consumer: 403, partner: 403, admin: 200, anonymous: 401 },
    },
    {
      method: 'PATCH', path: '/api/v1/admin/partners/test-id/approve',
      expectedStatus: { consumer: 403, partner: 403, admin: 200, anonymous: 401 },
    },
    {
      method: 'GET', path: '/api/v1/admin/claims',
      expectedStatus: { consumer: 403, partner: 403, admin: 200, anonymous: 401 },
    },
    {
      method: 'GET', path: '/api/v1/admin/ledger/reconciliation',
      expectedStatus: { consumer: 403, partner: 403, admin: 200, anonymous: 401 },
    },
    {
      method: 'POST', path: '/api/v1/admin/claims/test-id/resolve',
      body: { resolution: 'FULL_REFUND' },
      expectedStatus: { consumer: 403, partner: 403, admin: 200, anonymous: 401 },
    },
  ];

  for (const endpoint of endpoints) {
    for (const [role, token] of Object.entries(tokens)) {
      const expectedStatus = endpoint.expectedStatus[role as keyof RoleAccess];

      it(`${endpoint.method} ${endpoint.path} -> ${expectedStatus} for ${role}`, async () => {
        const req = request(app)
          [endpoint.method.toLowerCase() as 'get' | 'post' | 'patch'](endpoint.path);

        if (endpoint.body) req.send(endpoint.body);
        if (token) req.set('Authorization', token);

        const response = await req;

        // On accepte le status exact OU 404 (ressource inexistante mais auth OK)
        // car certains test-ids n'existent pas en DB
        if (expectedStatus >= 200 && expectedStatus < 300) {
          expect([expectedStatus, 404]).toContain(response.status);
        } else {
          expect(response.status).toBe(expectedStatus);
        }
      });
    }
  }

  describe('Cross-tenant isolation', () => {
    it('partner A should not see partner B reservations', async () => {
      const partnerABasket = await seedBasket({ partnerId: 'partner-a' });
      const partnerBBasket = await seedBasket({ partnerId: 'partner-b' });
      await seedReservation({ basketId: partnerABasket.id });
      await seedReservation({ basketId: partnerBBasket.id });

      const response = await request(app)
        .get('/api/v1/partner/reservations')
        .set('Authorization', `Bearer ${partnerBToken}`);

      expect(response.status).toBe(200);
      // Partner B ne doit voir que ses propres reservations
      for (const reservation of response.body.data) {
        expect(reservation.basket.partnerId).toBe('partner-b');
      }
    });

    it('consumer A should not cancel consumer B reservation', async () => {
      const reservation = await seedReservation({
        consumerId: 'consumer-b',
        status: 'CONFIRMED',
      });

      const response = await request(app)
        .post(`/api/v1/reservations/${reservation.id}/cancel`)
        .set('Authorization', `Bearer ${consumerAToken}`);

      expect(response.status).toBe(403);
    });
  });
});
```

---

## 4. Consequences

### Positives

- **Filet de securite robuste** : la combinaison coverage + mutation testing + property-based testing detecte les bugs que le code IA introduit le plus souvent (edge cases, conditions inversees, off-by-one)
- **Feedback rapide** : les tests unitaires + integration s'executent en < 5 minutes, permettant des iterations rapides avec les agents IA
- **Contrats API solides** : la detection de breaking changes via `oasdiff` empeche les regressions d'API qui casseraient les clients Flutter et React
- **Securite integree** : les tests RBAC systématiques et le scan OWASP couvrent les failles les plus courantes
- **Confiance dans les refactorings** : quand l'agent IA refactorise du code, les tests existants valident que le comportement est preserve
- **Documentation vivante** : les tests servent de documentation executable du comportement attendu

### Negatives

- **Temps d'execution CI** : le pipeline complet (unit + integration + contract + security) prend ~10-15 minutes. Le mutation testing nightly ajoute ~30-60 minutes.
- **Complexite de setup** : Testcontainers + Docker necessitent un runner CI avec Docker (GitHub Actions le supporte nativement)
- **Maintenance des fixtures** : les fixtures Peach Payments devront etre mises a jour si l'API Peach change
- **Courbe d'apprentissage** : mutation testing et property-based testing ne sont pas des pratiques mainstream, l'equipe devra monter en competence
- **Cout Chromatic** : le plan gratuit (5000 snapshots/mois) peut etre depasse si beaucoup de stories sont ajoutees. Plan Team a $149/mois si necessaire.

---

## 5. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| L'agent IA ecrit des tests triviaux malgre les directives | Haute | Moyen | Mutation testing detecte les tests inutiles. Checklist de review humaine. Boucle de renforcement (section 2.10.1). |
| Testcontainers ralentit trop la CI | Moyenne | Faible | L'image Docker PostgreSQL est cachee. Premiere execution ~30s (pull), suivantes < 5s (cache). |
| Stryker trop lent sur tout le backend | Moyenne | Faible | Mode incremental active. Execution uniquement sur les modules critiques, pas sur tout le code. Nightly, pas sur chaque PR. |
| Les golden tests Flutter cassent sur chaque update de dependance | Haute | Faible | Limiter les golden tests aux composants stables. Mettre a jour les goldens via `--update-goldens` dans un workflow dedie. |
| La spec OpenAPI diverge de l'implementation | Faible | Moyen | La spec est generee automatiquement par `@nestjs/swagger`. Les tests de conformite verifient la coherence. |
| Le budget Chromatic est depasse | Moyenne | Faible | Commencer avec le plan gratuit. Limiter les stories soumises a Chromatic (exclure les stories de dev/draft). |
| Les tests de concurrence sont flaky (non deterministes) | Moyenne | Moyen | Utiliser des retries (3 tentatives). Augmenter les timeouts. Executer sequentiellement, pas en parallele avec d'autres suites. |

---

## 6. Alternatives ecartees (resume)

| Decision | Alternative ecartee | Raison |
|----------|-------------------|--------|
| Vitest (backend) | Jest | Jest est 4-10x plus lent, mauvais support ESM, necessite babel/ts-jest. Vitest a une API compatible. |
| Testcontainers (PostgreSQL) | SQLite en memoire | SQLite n'a pas PostGIS, pas de `SELECT FOR UPDATE`, pas de types PostgreSQL. Tests non fiables. |
| Testcontainers (PostgreSQL) | Base Supabase de test | Lent (reseau), couteux, pas d'isolation entre runs CI paralleles. |
| Stryker (mutation) | Pas de mutation testing | La couverture seule ne detecte pas les tests triviaux (4% mutation score possible avec 100% coverage). |
| fast-check (property-based) | Tests exemples uniquement | Les calculs financiers ont trop de combinaisons pour des tests manuels. fast-check trouve les edge cases automatiquement. |
| `nock`/`msw` (mock Peach) | Sandbox Peach Payments | Pas de sandbox fiable en CI, latence reseau, rate limits. Les fixtures JSON sont deterministes et rapides. |
| `oasdiff` (contract) | Pact (consumer-driven) | Pact ajoute une complexite considerable (broker, pactflow). oasdiff est plus simple et suffisant quand la spec OpenAPI est la source de verite generee par le provider. |
| TDD strict | Test-alongside avec garde-fous | Le TDD strict est artificiel pour un agent IA qui genere le code d'un bloc. Le test-alongside avec mutation testing et review humaine est plus pragmatique. |

---

## 7. References

### Testing NestJS + Prisma
- [Prisma - Ultimate Guide to Testing: Integration Testing](https://www.prisma.io/blog/testing-series-3-aBUyF8nxAn)
- [Prisma - Ultimate Guide to Testing: Mocking Prisma Client](https://www.prisma.io/blog/testing-series-1-8eRB5p0Y8o)
- [NestJS + Testcontainers Integration Testing](https://dev.to/medaymentn/improving-intergratione2e-testing-using-nestjs-and-testcontainers-3eh0)
- [NestJS Official Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Switching from Jest to Vitest in NestJS](https://blog.ablo.ai/jest-to-vitest-in-nestjs)

### Testing AI-Generated Code
- [How to Test AI-Generated Code the Right Way in 2026](https://www.twocents.software/blog/how-to-test-ai-generated-code-the-right-way/)
- [AI Testing Strategies for AI-Generated Code at Scale (2025)](https://shapedthoughts.io/ai-software-quality-assurance-testing-strategies-for-2025/)
- [Meta - LLMs Are the Key to Mutation Testing and Better Compliance](https://engineering.fb.com/2025/09/30/security/llms-are-the-key-to-mutation-testing-and-better-compliance/)
- [Meta Applies Mutation Testing with LLM (InfoQ)](https://www.infoq.com/news/2026/01/meta-llm-mutation-testing/)

### Mutation Testing
- [Stryker Mutator - Official Site](https://stryker-mutator.io/)
- [Stryker TypeScript Checker](https://stryker-mutator.io/docs/stryker-js/typescript-checker/)
- [The Pitfalls of Test Coverage: Introducing Mutation Testing with Stryker](https://prodsens.live/2026/02/01/the-pitfalls-of-test-coverage-introducing-mutation-testing-with-stryker-and-cosmic-ray/)
- [Boost Your TypeScript Tests with Mutation Testing](https://typescript.tv/testing/boost-your-typescript-tests-with-mutation-testing/)

### Property-Based Testing
- [fast-check - Official Documentation](https://fast-check.dev/)
- [fast-check GitHub Repository](https://github.com/dubzzz/fast-check)
- [Property-Based Testing with TypeScript & fast-check](https://zenn.dev/samuraikun/articles/property-based-testing-in-typescript)
- [fast-check: A Comprehensive Guide to Property-Based Testing](https://medium.com/@joaovitorcoelho10/fast-check-a-comprehensive-guide-to-property-based-testing-2c166a979818)

### Vitest vs Jest
- [Jest vs Vitest: Which Test Runner in 2025?](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9)
- [Vitest vs Jest - Better Stack](https://betterstack.com/community/guides/scaling-nodejs/vitest-vs-jest/)
- [Vitest vs Jest Complete 2025 Comparison](https://generalistprogrammer.com/comparisons/vitest-vs-jest)

### Flutter Testing
- [Flutter Widget Testing Best Practices: Golden Tests](https://vibe-studio.ai/insights/flutter-widget-testing-best-practices-golden-tests-and-screenshot-diffs/)
- [Flutter Testing Methodologies Recap 2025](https://dev.to/3lvv0w/flutter-mobile-testing-methodologies-recap-2025-523j)
- [Flutter App Testing Guide 2025](https://solguruz.com/blog/flutter-app-testing/)

### Contract Testing
- [Pact vs OpenAPI: Choosing the Right Foundation](https://www.speakeasy.com/blog/pact-vs-openapi)
- [Top 5 Contract Testing Tools 2025](https://www.hypertest.co/contract-testing/best-api-contract-testing-tools)
- [Ultimate Guide - Best API Contract Testing Tools 2026](https://www.testsprite.com/use-cases/en/the-top-api-contract-testing-tools)
