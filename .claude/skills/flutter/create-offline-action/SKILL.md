---
name: create-offline-action
description: Crée une action offline avec queue de sync (ADR-012)
argument-hint: <ActionName>
---

# Create Offline Action

Crée une action offline `$ARGUMENTS` avec queue de synchronisation (ADR-012).

## Étape 1 — Définir l'action

Fichier : `lib/core/offline/actions/<action_name>_action.dart`

```dart
class <ActionName>Action implements OfflineAction {
  final String id;
  final String type = '<action_name>';
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  int retryCount;

  <ActionName>Action({
    required this.id,
    required this.payload,
    DateTime? createdAt,
    this.retryCount = 0,
  }) : createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'payload': payload,
    'createdAt': createdAt.toIso8601String(),
    'retryCount': retryCount,
  };

  factory <ActionName>Action.fromJson(Map<String, dynamic> json) => <ActionName>Action(
    id: json['id'],
    payload: json['payload'],
    createdAt: DateTime.parse(json['createdAt']),
    retryCount: json['retryCount'] ?? 0,
  );
}
```

## Étape 2 — Table Drift pour la queue

```dart
class PendingActions extends Table {
  TextColumn get id => text()();
  TextColumn get type => text()();
  TextColumn get payload => text()(); // JSON
  DateTimeColumn get createdAt => dateTime()();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {id};
}
```

## Étape 3 — Service de sync

Fichier : `lib/core/offline/sync_service.dart`

```dart
class SyncService {
  final PendingActionsDao _dao;
  final ApiClient _api;
  final ConnectivityService _connectivity;

  SyncService(this._dao, this._api, this._connectivity);

  /// Enqueue une action pour sync ultérieur
  Future<void> enqueue(OfflineAction action) async {
    await _dao.insert(action.toCompanion());
  }

  /// Sync toutes les actions en attente
  Future<void> syncAll() async {
    if (!await _connectivity.isOnline) return;

    final pending = await _dao.getAllOrderedByDate();
    for (final action in pending) {
      try {
        await _processAction(action);
        await _dao.delete(action.id);
      } catch (e) {
        if (action.retryCount >= 3) {
          await _dao.delete(action.id); // Dead-letter
          // Log error
        } else {
          await _dao.incrementRetry(action.id);
        }
      }
    }
  }

  Future<void> _processAction(PendingActionData action) async {
    switch (action.type) {
      case '<action_name>':
        await _api.execute<ActionName>(jsonDecode(action.payload));
        break;
      // ... autres types
    }
  }
}
```

## Étape 4 — Connectivity listener

```dart
// Déclencher la sync quand on revient online
_connectivity.onStatusChange.listen((status) {
  if (status == ConnectivityStatus.online) {
    syncService.syncAll();
  }
});
```

## Étape 5 — Conflit resolution

Stratégie **last-write-wins** :
- Chaque action a un `createdAt` timestamp
- Le serveur accepte si le timestamp est plus récent que la dernière mise à jour
- Sinon, le serveur retourne un conflit et le client rafraîchit ses données

## Validation

- [ ] Action sérialisable en JSON
- [ ] Queue Drift persistante
- [ ] Sync se déclenche automatiquement au retour online
- [ ] Retry avec max 3 tentatives
- [ ] Dead-letter après épuisement des retries
- [ ] Tests couvrent le flux complet
