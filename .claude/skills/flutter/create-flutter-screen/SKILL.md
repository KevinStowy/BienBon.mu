---
name: create-flutter-screen
description: Crée un écran Flutter avec scaffold Riverpod + GoRouter integration
argument-hint: <ScreenName> [--app consumer|partner]
---

# Create Flutter Screen

Crée un écran Flutter `$ARGUMENTS` avec Riverpod et GoRouter.

## Étape 1 — Créer le fichier screen

Fichier : `lib/features/<feature>/screens/<screen_name>_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class <ScreenName>Screen extends ConsumerWidget {
  const <ScreenName>Screen({super.key});

  static const String routePath = '/<screen-path>';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(<featureName>Provider);

    return Scaffold(
      appBar: AppBar(
        title: Text(context.t.<feature>.<screen>.title),
      ),
      body: state.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => ErrorWidget(error: error, onRetry: () => ref.invalidate(<featureName>Provider)),
        data: (data) => _buildContent(context, data),
      ),
    );
  }

  Widget _buildContent(BuildContext context, <DataType> data) {
    return SafeArea(
      child: // ... contenu
    );
  }
}
```

## Étape 2 — Enregistrer la route GoRouter

Dans `lib/core/router/app_router.dart` :

```dart
GoRoute(
  path: <ScreenName>Screen.routePath,
  builder: (context, state) => const <ScreenName>Screen(),
),
```

## Étape 3 — Accessibilité (ADR-032)

- `Semantics` sur tous les éléments interactifs
- Touch targets minimum 48x48
- Contraste texte ≥ 4.5:1
- Labels pour le lecteur d'écran

## Étape 4 — i18n (ADR-015)

Toutes les strings visibles via slang :
```dart
Text(context.t.<feature>.<screen>.title)
```

Ajouter les clés dans `lib/i18n/strings_fr.i18n.yaml`, `strings_en.i18n.yaml`, `strings_mfe.i18n.yaml`.

## Étape 5 — Tests

Fichier : `test/features/<feature>/screens/<screen_name>_screen_test.dart`

- Widget test avec ProviderScope et mocks
- Tester les 3 états : loading, error, data
- Tester les interactions

## Validation

- [ ] L'écran gère loading/error/data
- [ ] Route GoRouter enregistrée
- [ ] Semantics sur les éléments interactifs
- [ ] Strings internationalisées
- [ ] Test widget écrit
