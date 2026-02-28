---
name: write-e2e-tests
description: Écrit des tests E2E Playwright
argument-hint: <feature-or-flow>
---

# Write E2E Tests

Écrit des tests E2E Playwright pour `$ARGUMENTS`.

## Structure

Fichier : `e2e/<feature>/<flow-name>.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('<Feature> - <Flow>', () => {
  test.beforeEach(async ({ page }) => {
    // Setup : login, seed data, etc.
    await page.goto('/');
  });

  test('should complete the happy path', async ({ page }) => {
    // Étape 1 : navigation
    await page.click('[data-testid="nav-explore"]');
    await expect(page).toHaveURL('/explore');

    // Étape 2 : interaction
    await page.fill('[data-testid="search-input"]', 'boulangerie');
    await page.click('[data-testid="search-button"]');

    // Étape 3 : vérification
    await expect(page.locator('[data-testid="store-card"]')).toHaveCount(3);

    // Étape 4 : action
    await page.click('[data-testid="store-card"]');
    await expect(page).toHaveURL(/\/stores\/[\w-]+/);
  });
});
```

## Page Object Model

```typescript
class ExplorePage {
  constructor(private page: Page) {}

  async searchFor(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.click('[data-testid="search-button"]');
  }

  async getStoreCards() {
    return this.page.locator('[data-testid="store-card"]').all();
  }

  async clickFirstStore() {
    await this.page.click('[data-testid="store-card"]:first-child');
  }
}
```

## Conventions

- `data-testid` pour les sélecteurs (pas de classes CSS fragiles)
- Un test par user story critique
- Page Object Model pour les écrans complexes
- Pas de `sleep` — utiliser `waitFor` et `expect` auto-retry
- Screenshots sur échec (configuré dans `playwright.config.ts`)

## Scénarios à couvrir en priorité

1. **Inscription / Connexion** consumer
2. **Parcours découverte** : explorer → détail commerce → détail panier
3. **Réservation** : sélectionner → payer → confirmation
4. **Retrait** : QR code → validation → avis
5. **Admin** : login → dashboard → gestion partenaire

## Validation

- [ ] Tests stables (pas flaky)
- [ ] Page Object Model pour les écrans complexes
- [ ] `data-testid` sur les éléments ciblés
- [ ] Screenshots on failure
- [ ] `npx playwright test` passe
