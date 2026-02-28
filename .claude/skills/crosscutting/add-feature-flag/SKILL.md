---
name: add-feature-flag
description: Ajoute un feature flag PostHog avec intégration Riverpod/NestJS
argument-hint: <flag-name>
---

# Add Feature Flag

Ajoute un feature flag PostHog `$ARGUMENTS` (ADR-037).

## Étape 1 — Définir le flag

Fichier : `packages/shared-types/src/feature-flags.ts`

```typescript
export const FEATURE_FLAGS = {
  // Flags existants...
  '<flag_name>': '<flag-name>',
} as const;

export type FeatureFlag = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];
```

## Étape 2 — NestJS (backend)

```typescript
// Guard feature flag
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flag = this.reflector.get<string>('featureFlag', context.getHandler());
    return this.posthog.isFeatureEnabled(flag, userId);
  }
}

// Usage sur un controller
@UseGuards(FeatureFlagGuard)
@FeatureFlag(FEATURE_FLAGS.<flag_name>)
@Get('new-feature')
async newFeature() { ... }
```

## Étape 3 — Flutter (Riverpod)

```dart
@riverpod
Future<bool> isFeatureEnabled(ref, {required String flag}) async {
  return ref.read(posthogProvider).isFeatureEnabled(flag);
}

// Usage dans un widget
final isEnabled = ref.watch(isFeatureEnabledProvider(flag: FEATURE_FLAGS.flagName));

if (isEnabled.value == true) {
  return NewFeatureWidget();
} else {
  return OldFeatureWidget();
}
```

## Étape 4 — React (admin)

```typescript
import { useFeatureFlagEnabled } from 'posthog-js/react';

function Component() {
  const isEnabled = useFeatureFlagEnabled('<flag-name>');

  if (isEnabled) {
    return <NewFeature />;
  }
  return <OldFeature />;
}
```

## Conventions

- kebab-case pour les noms de flags PostHog
- Flags temporaires : supprimer après rollout complet
- Flags permanents : pour A/B testing ou fonctionnalités premium
- Toujours avoir un fallback (flag désactivé = ancien comportement)

## Validation

- [ ] Flag défini dans shared-types
- [ ] Intégré dans le(s) client(s) concerné(s)
- [ ] Fallback quand le flag est désactivé
- [ ] Testable (mock du flag dans les tests)
