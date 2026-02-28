---
name: write-property-tests
description: Écrit des tests property-based avec fast-check (financier, state machines)
argument-hint: <module-or-function>
---

# Write Property-Based Tests

Écrit des tests property-based avec fast-check pour `$ARGUMENTS`.

## Quand utiliser

- **Calculs financiers** : commissions, remboursements, ledger balancing
- **State machines** : toute séquence valide d'events → état valide
- **Validation** : toute donnée valide est acceptée, toute donnée invalide est rejetée
- **Idempotence** : f(f(x)) === f(x)
- **Sérialisation** : parse(serialize(x)) === x

## Propriétés financières (ADR-007)

```typescript
import * as fc from 'fast-check';

describe('Commission calculation', () => {
  it('commission + payout = discountedPrice for any valid price and rate', () => {
    fc.assert(fc.property(
      fc.integer({ min: 100, max: 1_000_000 }),  // price in cents
      fc.integer({ min: 1, max: 50 }),             // commission rate %
      (priceCents, commissionRate) => {
        const commission = calculateCommission(priceCents, commissionRate);
        const payout = priceCents - commission;

        // Invariant : commission + payout = prix total
        expect(commission + payout).toBe(priceCents);

        // Invariant : commission > 0
        expect(commission).toBeGreaterThan(0);

        // Invariant : commission < prix
        expect(commission).toBeLessThan(priceCents);
      }
    ));
  });

  it('ledger is always balanced (sum debits = sum credits)', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        amount: fc.integer({ min: 1, max: 100000 }),
        type: fc.constantFrom('RESERVATION', 'CANCELLATION', 'REFUND', 'PAYOUT'),
      }), { minLength: 1, maxLength: 50 }),
      (operations) => {
        const ledger = new Ledger();
        for (const op of operations) {
          ledger.record(op);
        }
        expect(ledger.totalDebits()).toBe(ledger.totalCredits());
      }
    ));
  });
});
```

## Propriétés state machine (ADR-017)

```typescript
describe('Reservation state machine', () => {
  it('any valid event sequence produces a valid state', () => {
    fc.assert(fc.property(
      fc.array(fc.constantFrom(...Object.values(ReservationEvent)), { minLength: 0, maxLength: 20 }),
      (events) => {
        let state = ReservationState.PENDING;
        for (const event of events) {
          try {
            state = transition(state, event, defaultContext).newState;
          } catch {
            // Invalid transition — state should remain unchanged
          }
          expect(Object.values(ReservationState)).toContain(state);
        }
      }
    ));
  });

  it('terminal states cannot be left', () => {
    const terminalStates = [ReservationState.COMPLETED, ReservationState.CANCELLED, ReservationState.EXPIRED];
    fc.assert(fc.property(
      fc.constantFrom(...terminalStates),
      fc.constantFrom(...Object.values(ReservationEvent)),
      (terminalState, event) => {
        expect(() => transition(terminalState, event, defaultContext)).toThrow();
      }
    ));
  });
});
```

## Propriétés de sérialisation

```typescript
it('roundtrip: parse(serialize(entity)) === entity', () => {
  fc.assert(fc.property(
    arbitraryEntity(),  // Générateur custom
    (entity) => {
      const serialized = serialize(entity);
      const parsed = parse(serialized);
      expect(parsed).toEqual(entity);
    }
  ));
});
```

## Validation

- [ ] Propriétés identifiées et documentées
- [ ] Générateurs (arbitraries) réalistes
- [ ] Au moins 100 runs par propriété (défaut fast-check)
- [ ] Tests passent
