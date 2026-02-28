---
name: create-storybook-story
description: Crée une story Storybook avec variants + a11y checks
argument-hint: <ComponentName>
---

# Create Storybook Story

Crée une story Storybook `$ARGUMENTS` avec variants et vérifications a11y.

## Étape 1 — Créer le fichier story

Fichier : `src/components/<ComponentName>.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { <ComponentName> } from './<ComponentName>';

const meta = {
  title: 'Components/<ComponentName>',
  component: <ComponentName>,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    // Background BienBon par défaut
    backgrounds: { default: 'bienbon' },
    // Viewport mobile par défaut
    viewport: { defaultViewport: 'mobile1' },
  },
  argTypes: {
    // Contrôles interactifs pour chaque prop
  },
} satisfies Meta<typeof <ComponentName>>;

export default meta;
type Story = StoryObj<typeof meta>;
```

## Étape 2 — Variants

```typescript
export const Default: Story = {
  args: { /* props par défaut */ },
};

export const WithLongText: Story = {
  args: { label: 'Un texte très long pour tester le débordement et le comportement responsive' },
};

export const Loading: Story = {
  args: { isLoading: true },
};

export const Error: Story = {
  args: { error: 'Une erreur est survenue' },
};

export const Mobile: Story = {
  args: { /* props */ },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

export const Desktop: Story = {
  args: { /* props */ },
  parameters: { viewport: { defaultViewport: 'desktop' } },
};
```

## Étape 3 — Interaction tests

```typescript
export const WithInteraction: Story = {
  args: { /* props */ },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Trouver et cliquer
    const button = canvas.getByRole('button', { name: /label/i });
    await userEvent.click(button);

    // Vérifier le résultat
    await expect(canvas.getByText('Expected result')).toBeInTheDocument();
  },
};
```

## Étape 4 — a11y

Le addon a11y de Storybook vérifie automatiquement les règles axe-core. S'assurer que :
- Pas de violations a11y dans la story
- Contraste OK
- Rôles ARIA corrects

## Conventions Storybook BienBon

- Background par défaut : `#F7F4EF`
- Viewport par défaut : mobile (390px iPhone 14 Pro)
- `tags: ['autodocs']` pour la documentation automatique
- Nommer les stories par comportement, pas par variation visuelle

## Validation

- [ ] Story avec `tags: ['autodocs']`
- [ ] Au moins 3 variants (default, edge case, état différent)
- [ ] Interaction test si composant interactif
- [ ] 0 violation a11y axe-core
- [ ] Background et viewport BienBon
