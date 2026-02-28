---
name: write-integration-tests
description: Écrit des tests d'intégration avec Testcontainers (PostgreSQL)
argument-hint: <module-or-feature-path>
---

# Write Integration Tests

Écrit des tests d'intégration pour `$ARGUMENTS` avec Testcontainers.

## Setup Testcontainers

```typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgis/postgis:16-3.4')
    .withExposedPorts(5432)
    .start();

  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;

  // Appliquer les migrations
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url } });

  prisma = new PrismaClient({ datasources: { db: { url } } });
}, 60_000);

afterAll(async () => {
  await prisma.$disconnect();
  await container.stop();
});

afterEach(async () => {
  // Cleanup entre les tests
  await prisma.$transaction([
    prisma.<entity>.deleteMany(),
    // ... autres tables
  ]);
});
```

## Patterns de test

### Repository adapter

```typescript
describe('<Entity>PrismaRepository', () => {
  it('should persist and retrieve an entity', async () => {
    const entity = createTest<Entity>();
    await repository.create(entity);
    const found = await repository.findById(entity.id);
    expect(found).toMatchObject(entity);
  });

  it('should return null for non-existent entity', async () => {
    const found = await repository.findById('non-existent-id');
    expect(found).toBeNull();
  });

  it('should filter by criteria', async () => {
    await repository.create(createTest<Entity>({ status: 'ACTIVE' }));
    await repository.create(createTest<Entity>({ status: 'INACTIVE' }));
    const results = await repository.findMany({ status: 'ACTIVE' });
    expect(results).toHaveLength(1);
  });
});
```

### Controller (NestJS testing module)

```typescript
describe('<Controller> (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('POST /<entity> should create', async () => {
    const response = await request(app.getHttpServer())
      .post('/<entity>')
      .set('Authorization', `Bearer ${validToken}`)
      .send(validPayload)
      .expect(201);
    expect(response.body.id).toBeDefined();
  });
});
```

## Conventions

- Timeout élevé pour le setup container : `60_000` ms
- Cleanup entre chaque test (pas de données résiduelles)
- Utiliser des factories pour les données de test
- Tester les vrais queries SQL (pas de mock Prisma)

## Validation

- [ ] Testcontainers PostgreSQL configuré
- [ ] Migrations appliquées
- [ ] Cleanup entre les tests
- [ ] Tests vérifient le comportement réel (pas de mocks DB)
- [ ] `npx vitest run <path>` passe
