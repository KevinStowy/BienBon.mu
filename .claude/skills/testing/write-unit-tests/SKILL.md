---
name: write-unit-tests
description: Écrit des tests unitaires Vitest pour un fichier/module
argument-hint: <file-or-module-path>
---

# Write Unit Tests

Écrit des tests unitaires Vitest significatifs pour `$ARGUMENTS` (ADR-023).

## Protocole anti-trivialité

1. **Lire le code source** et identifier :
   - Les invariants métier (règles qui doivent TOUJOURS être vraies)
   - Les edge cases (valeurs limites, null, vide, overflow)
   - Les chemins d'erreur (exceptions, rejets)
   - Les dépendances (ce qui doit être mocké)

2. **Ne PAS écrire de tests miroir** qui répètent l'implémentation :
   ```typescript
   // ❌ INTERDIT — test miroir
   expect(add(2, 3)).toBe(5);

   // ✅ CORRECT — test de propriété/invariant
   expect(add(a, b)).toBe(add(b, a)); // commutativité
   ```

3. **Écrire les tests AVANT de modifier le code** si possible

## Structure du test

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('<UnitName>', () => {
  // Setup
  let sut: <UnitType>; // System Under Test
  let mockDep: MockType;

  beforeEach(() => {
    mockDep = { method: vi.fn() };
    sut = new <UnitType>(mockDep);
  });

  describe('<method>', () => {
    it('should <expected behavior> when <condition>', () => {
      // Arrange
      const input = createValidInput();

      // Act
      const result = sut.method(input);

      // Assert
      expect(result).toMatchObject({ /* expected */ });
    });

    it('should throw <ErrorType> when <invalid condition>', () => {
      expect(() => sut.method(invalidInput)).toThrow(<ErrorType>);
    });

    it('should handle edge case: <description>', () => {
      // Edge case spécifique
    });
  });
});
```

## Nommage des tests

Format : `should <expected behavior> when <condition>`
- `should return empty array when no baskets found`
- `should throw InsufficientStockError when stock is 0`
- `should emit BasketCreatedEvent when basket is valid`

## Mocking

- Mocker UNIQUEMENT les ports (interfaces des dépendances externes)
- Ne JAMAIS mocker le SUT (System Under Test)
- Utiliser `vi.fn()` pour les fonctions, `vi.spyOn()` pour espionner

## Validation

- [ ] Chaque test vérifie un comportement ou invariant spécifique
- [ ] Edge cases couverts (null, vide, limites, overflow)
- [ ] Chemins d'erreur testés
- [ ] Pas de tests miroir
- [ ] Tests indépendants (pas d'ordre requis)
- [ ] `npx vitest run <path>` passe
