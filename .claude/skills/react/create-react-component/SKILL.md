---
name: create-react-component
description: Crée un composant React + story Storybook + tests
argument-hint: <ComponentName>
---

# Create React Component

Crée un composant React `$ARGUMENTS` avec story Storybook et tests.

## Étape 1 — Créer le composant

Fichier : `src/components/<ComponentName>.tsx`

```typescript
import { type ComponentProps } from 'react';

interface <ComponentName>Props {
  // Props typées
  label: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export function <ComponentName>({ label, variant = 'primary', onClick }: <ComponentName>Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      className={cn(
        'base-classes',
        variant === 'primary' && 'primary-classes',
        variant === 'secondary' && 'secondary-classes',
      )}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {label}
    </div>
  );
}
```

## Étape 2 — Créer la story Storybook

Fichier : `src/components/<ComponentName>.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { <ComponentName> } from './<ComponentName>';

const meta = {
  title: 'Components/<ComponentName>',
  component: <ComponentName>,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary'] },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof <ComponentName>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { label: 'Click me', variant: 'primary' },
};

export const Secondary: Story = {
  args: { label: 'Click me', variant: 'secondary' },
};
```

## Étape 3 — Styling

- Tailwind CSS v4 utility classes uniquement
- Tokens du DESIGN_SYSTEM.md (couleurs, typo, espacement)
- Responsive : mobile-first (390px → desktop)
- Pas de CSS-in-JS

## Étape 4 — Accessibilité (ADR-032)

- Rôle ARIA approprié
- `aria-label` si pas de texte visible
- Navigation clavier (Tab, Enter, Escape)
- Contraste WCAG AA (4.5:1)

## Étape 5 — Tests

Le story Storybook sert de test via le plugin vitest-storybook.

## Validation

- [ ] Composant typé (interface Props)
- [ ] Story avec variants
- [ ] a11y : rôle, label, clavier
- [ ] Tailwind pour le styling
- [ ] `npm run build` passe
