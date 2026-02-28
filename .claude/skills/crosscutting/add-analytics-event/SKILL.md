---
name: add-analytics-event
description: Ajoute un événement PostHog avec properties typées
argument-hint: <event_name>
---

# Add Analytics Event

Ajoute un événement analytics PostHog `$ARGUMENTS` (ADR-033).

## Étape 1 — Définir l'événement

Fichier : `packages/shared-types/src/analytics/events.ts`

```typescript
export interface AnalyticsEvents {
  // Événements existants...

  '<event_name>': {
    // Properties typées
    basketId?: string;
    storeId?: string;
    amount?: number;
    source?: 'home' | 'explore' | 'search' | 'deep_link';
  };
}
```

## Étape 2 — NestJS (backend)

```typescript
// Injection du service analytics
this.analytics.capture({
  distinctId: userId,
  event: '<event_name>',
  properties: {
    basketId,
    storeId,
    amount,
  },
});
```

## Étape 3 — Flutter (mobile)

```dart
ref.read(analyticsProvider).capture(
  event: '<event_name>',
  properties: {
    'basketId': basket.id,
    'storeId': store.id,
  },
);
```

## Étape 4 — React (admin/web)

```typescript
posthog.capture('<event_name>', {
  basketId,
  storeId,
});
```

## Conventions de nommage

- snake_case pour les noms d'événements
- Préfixe par domaine : `basket_viewed`, `reservation_created`, `payment_completed`
- Properties en camelCase dans le code, snake_case dans PostHog

## Catégories d'événements

| Catégorie | Exemples |
|-----------|----------|
| Navigation | `screen_viewed`, `tab_switched` |
| Action | `basket_reserved`, `basket_cancelled`, `review_submitted` |
| Commerce | `payment_completed`, `payout_requested` |
| Engagement | `favorite_added`, `referral_sent`, `badge_earned` |
| Error | `payment_failed`, `reservation_timeout` |

## Validation

- [ ] Event typé dans shared-types
- [ ] Implémenté dans le(s) client(s) concerné(s)
- [ ] Properties pertinentes incluses
- [ ] Naming convention respectée
