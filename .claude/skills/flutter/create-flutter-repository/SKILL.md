---
name: create-flutter-repository
description: Crée un repository Flutter (API + Drift cache + sync)
argument-hint: <RepositoryName>
---

# Create Flutter Repository

Crée un repository `$ARGUMENTS` avec cache Drift et sync API (ADR-012).

## Étape 1 — Interface

Fichier : `lib/shared/repositories/<repository_name>.dart`

```dart
abstract class <RepositoryName> {
  Future<List<<Model>>> getAll();
  Future<<Model>?> getById(String id);
  Future<<Model>> create(<CreateInput> input);
  Future<<Model>> update(String id, <UpdateInput> input);
  Future<void> delete(String id);
}
```

## Étape 2 — Implémentation avec cache

Fichier : `lib/shared/repositories/<repository_name>_impl.dart`

```dart
class <RepositoryName>Impl implements <RepositoryName> {
  final ApiClient _api;
  final <TableName>Dao _dao;

  <RepositoryName>Impl(this._api, this._dao);

  @override
  Future<List<<Model>>> getAll() async {
    // 1. Retourner le cache immédiatement
    final cached = await _dao.getAll();
    if (cached.isNotEmpty) {
      // 2. Rafraîchir en arrière-plan
      _refreshInBackground();
      return cached.map((e) => e.toModel()).toList();
    }

    // 3. Si pas de cache, fetch API
    final remote = await _api.get<Model>s();
    await _dao.insertAll(remote.map((e) => e.toCompanion()).toList());
    return remote;
  }

  Future<void> _refreshInBackground() async {
    try {
      final remote = await _api.get<Model>s();
      await _dao.replaceAll(remote.map((e) => e.toCompanion()).toList());
    } catch (_) {
      // Silently fail — cache is still valid
    }
  }
}
```

## Étape 3 — Provider Riverpod

```dart
@riverpod
<RepositoryName> <repositoryName>(ref) {
  return <RepositoryName>Impl(
    ref.read(apiClientProvider),
    ref.read(databaseProvider).<tableName>Dao,
  );
}
```

## Étape 4 — Offline write queue (ADR-012)

Pour les opérations d'écriture en mode offline :
```dart
Future<<Model>> create(<CreateInput> input) async {
  try {
    final result = await _api.create<Model>(input);
    await _dao.insert(result.toCompanion());
    return result;
  } on NetworkException {
    // Queue for later sync
    await _pendingActionsDao.add(PendingAction.create('<model>', input.toJson()));
    return <Model>.fromInput(input, localId: generateLocalId());
  }
}
```

## Étape 5 — Tests

- Mock ApiClient (succès, erreur réseau, erreur serveur)
- Mock Dao (cache hit, cache miss)
- Tester : cache-first, background refresh, offline queue
- Tester : sync quand retour online

## Validation

- [ ] Interface abstraite définie
- [ ] Stratégie cache-first implémentée
- [ ] Background refresh pour les données fraîches
- [ ] Offline write queue pour les mutations
- [ ] Provider Riverpod enregistré
- [ ] Tests couvrent online + offline
