---
name: create-riverpod-provider
description: Crée un provider Riverpod (async/state/future/family) avec tests
argument-hint: <ProviderName> [--type async|state|future|family]
---

# Create Riverpod Provider

Crée un provider Riverpod `$ARGUMENTS` selon le pattern ADR-029.

## Types de providers

### AsyncNotifierProvider — Données serveur (CRUD)

```dart
@riverpod
class <ProviderName> extends _$<ProviderName> {
  @override
  Future<List<<Model>>> build() async {
    return ref.read(<repository>Provider).getAll();
  }

  Future<void> add(<Model> item) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      await ref.read(<repository>Provider).create(item);
      return ref.read(<repository>Provider).getAll();
    });
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
  }
}
```

### StateNotifierProvider — État UI local

```dart
@riverpod
class <ProviderName> extends _$<ProviderName> {
  @override
  <StateType> build() => <StateType>.initial();

  void update<Field>(<FieldType> value) {
    state = state.copyWith(<field>: value);
  }

  void reset() {
    state = <StateType>.initial();
  }
}
```

### FutureProvider — One-shot (détails)

```dart
@riverpod
Future<<Model>> <providerName>(ref, {required String id}) {
  return ref.read(<repository>Provider).getById(id);
}
```

### Family — Paramétré

```dart
@riverpod
Future<List<<Model>>> <providerName>(ref, {required String storeId}) {
  return ref.read(<repository>Provider).getByStore(storeId);
}
```

## Étape 1 — Choisir le type

| Besoin | Type |
|--------|------|
| Liste + CRUD depuis API | AsyncNotifierProvider |
| État formulaire / filtres | StateNotifierProvider |
| Détail par ID | FutureProvider.family |
| État global (auth, theme) | NotifierProvider |

## Étape 2 — Créer le provider

Fichier : `lib/features/<feature>/providers/<provider_name>_provider.dart`

Utiliser l'annotation `@riverpod` pour la code generation.

## Étape 3 — Générer le code

```bash
dart run build_runner build
```

## Étape 4 — Tests

Fichier : `test/features/<feature>/providers/<provider_name>_provider_test.dart`

```dart
test('initial state is loading then data', () async {
  final container = ProviderContainer(overrides: [
    <repository>Provider.overrideWithValue(MockRepository()),
  ]);

  // Vérifier l'état initial
  expect(container.read(<providerName>Provider), isA<AsyncLoading>());

  // Attendre le chargement
  await container.read(<providerName>Provider.future);
  expect(container.read(<providerName>Provider).value, isNotEmpty);
});
```

## Validation

- [ ] Le type de provider est approprié au besoin
- [ ] `@riverpod` annotation en place
- [ ] Code généré (`build_runner`)
- [ ] Gestion d'erreur dans les mutations
- [ ] Tests passent
