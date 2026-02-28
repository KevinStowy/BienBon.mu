---
name: create-gorouter-route
description: Ajoute une route GoRouter avec guards et deep link
argument-hint: <path> [--guard auth|role|onboarding]
---

# Create GoRouter Route

Ajoute une route GoRouter `$ARGUMENTS` (ADR-030).

## Étape 1 — Définir la route

Dans `lib/core/router/app_router.dart` :

```dart
GoRoute(
  path: '<path>',
  name: '<routeName>',
  builder: (context, state) {
    final id = state.pathParameters['id'];
    return <ScreenName>Screen(id: id!);
  },
  redirect: (context, state) {
    // Guard logic si nécessaire
    return null; // null = pas de redirect
  },
),
```

## Étape 2 — Guards (redirect)

### Auth guard
```dart
redirect: (context, state) {
  final isLoggedIn = ref.read(authProvider).isAuthenticated;
  if (!isLoggedIn) return '/login?redirect=${state.uri}';
  return null;
},
```

### Role guard
```dart
redirect: (context, state) {
  final role = ref.read(authProvider).user?.role;
  if (role != UserRole.partner) return '/unauthorized';
  return null;
},
```

### Onboarding guard
```dart
redirect: (context, state) {
  final onboarded = ref.read(onboardingProvider).isComplete;
  if (!onboarded) return '/onboarding';
  return null;
},
```

## Étape 3 — Deep link

- Le `path` défini est automatiquement un deep link
- Configurer le domaine dans `apple-app-site-association` (iOS) et `assetlinks.json` (Android)
- Path parameters : `/baskets/:id` → `state.pathParameters['id']`
- Query parameters : `/search?q=pain` → `state.uri.queryParameters['q']`

## Étape 4 — Transition personnalisée

```dart
GoRoute(
  path: '<path>',
  pageBuilder: (context, state) => CustomTransitionPage(
    child: <ScreenName>Screen(),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      return SlideTransition(
        position: Tween(begin: const Offset(1, 0), end: Offset.zero)
            .animate(CurvedAnimation(parent: animation, curve: Curves.easeInOut)),
        child: child,
      );
    },
  ),
),
```

## Validation

- [ ] Route ajoutée dans le router
- [ ] Guard redirect fonctionne
- [ ] Path/query parameters correctement extraits
- [ ] Deep link testable
