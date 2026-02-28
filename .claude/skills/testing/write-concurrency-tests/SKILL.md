---
name: write-concurrency-tests
description: Écrit des tests de concurrence (race conditions stock/réservations)
argument-hint: <module>
---

# Write Concurrency Tests

Écrit des tests de concurrence pour `$ARGUMENTS` (ADR-008).

## Cas d'usage principal : stock / double-booking

Le scénario critique : N utilisateurs tentent de réserver le même panier simultanément. Seuls les `stock` premiers doivent réussir.

```typescript
describe('Basket reservation concurrency', () => {
  it('should not oversell: 10 concurrent reservations for stock=3', async () => {
    // Arrange: créer un panier avec stock = 3
    const basket = await createBasketWithStock(3);

    // Act: 10 réservations simultanées
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        reservationService.create({
          basketId: basket.id,
          consumerId: `consumer-${i}`,
        })
      )
    );

    // Assert
    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    expect(succeeded).toHaveLength(3);  // Exactement stock
    expect(failed).toHaveLength(7);     // Les autres échouent

    // Vérifier le stock final
    const updatedBasket = await prisma.basket.findUnique({ where: { id: basket.id } });
    expect(updatedBasket.stock).toBe(0);
  });

  it('should handle concurrent cancel + reserve', async () => {
    // Un cancel libère du stock, un reserve le consomme
    const basket = await createBasketWithStock(0);
    const existingReservation = await createReservation(basket.id);

    const [cancelResult, reserveResult] = await Promise.allSettled([
      reservationService.cancel(existingReservation.id),
      reservationService.create({ basketId: basket.id, consumerId: 'new-consumer' }),
    ]);

    // Le stock ne doit jamais être négatif
    const updatedBasket = await prisma.basket.findUnique({ where: { id: basket.id } });
    expect(updatedBasket.stock).toBeGreaterThanOrEqual(0);
  });
});
```

## Pattern : optimistic locking

```typescript
it('should retry on optimistic lock conflict', async () => {
  // L'implémentation utilise un UPDATE ... WHERE version = X
  // Si version a changé entre le SELECT et l'UPDATE, on retry

  const basket = await createBasketWithStock(5);

  // Simuler 2 mises à jour simultanées
  const [r1, r2] = await Promise.allSettled([
    updateBasketStock(basket.id, -1),
    updateBasketStock(basket.id, -1),
  ]);

  // Les deux doivent réussir (grâce au retry)
  expect(r1.status).toBe('fulfilled');
  expect(r2.status).toBe('fulfilled');

  // Stock final = 5 - 1 - 1 = 3
  const updated = await prisma.basket.findUnique({ where: { id: basket.id } });
  expect(updated.stock).toBe(3);
});
```

## Pattern : payment idempotency

```typescript
it('should process payment exactly once despite double webhook', async () => {
  const webhookPayload = createPaymentSuccessWebhook();

  // Envoyer le même webhook 2 fois en parallèle
  await Promise.all([
    webhookHandler.process(webhookPayload),
    webhookHandler.process(webhookPayload),
  ]);

  // Vérifier qu'un seul paiement est enregistré
  const payments = await prisma.payment.findMany({ where: { externalId: webhookPayload.id } });
  expect(payments).toHaveLength(1);
});
```

## Setup

Ces tests nécessitent **Testcontainers PostgreSQL** (vraie concurrence DB, pas possible avec mocks).

## Validation

- [ ] Pas de sur-réservation (stock never < 0)
- [ ] Pas de double traitement (idempotence)
- [ ] Optimistic locking fonctionne sous concurrence
- [ ] Tests passent de manière stable (pas flaky)
