---
name: create-drift-table
description: Crée une table Drift avec chiffrement AES-256-GCM si sensible
argument-hint: <TableName> [--encrypted]
---

# Create Drift Table

Crée une table Drift `$ARGUMENTS` pour le cache local (ADR-012).

## Étape 1 — Définir la table

Fichier : `lib/core/database/tables/<table_name>.dart`

```dart
class <TableName> extends Table {
  TextColumn get id => text()();
  TextColumn get data => text()(); // JSON sérialisé
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get syncedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}
```

## Étape 2 — Si --encrypted (données sensibles)

Utiliser `encrypted_moor` ou `sqlcipher_flutter_libs` pour le chiffrement AES-256 de la base entière. Alternativement, chiffrer les champs sensibles individuellement :

```dart
TextColumn get sensitiveData => text().map(const EncryptedConverter())();

class EncryptedConverter extends TypeConverter<String, String> {
  const EncryptedConverter();

  @override
  String fromSql(String fromDb) => decrypt(fromDb);

  @override
  String toSql(String value) => encrypt(value);
}
```

## Étape 3 — Créer le DAO

Fichier : `lib/core/database/daos/<table_name>_dao.dart`

```dart
@DriftAccessor(tables: [<TableName>])
class <TableName>Dao extends DatabaseAccessor<AppDatabase> with _$<TableName>DaoMixin {
  <TableName>Dao(super.db);

  Future<List<<TableName>Data>> getAll() => select(<tableName>).get();

  Future<<TableName>Data?> getById(String id) =>
      (select(<tableName>)..where((t) => t.id.equals(id))).getSingleOrNull();

  Future<void> insertOrReplace(<TableName>Companion companion) =>
      into(<tableName>).insertOnConflictUpdate(companion);

  Future<void> insertAll(List<<TableName>Companion> companions) =>
      batch((b) => b.insertAllOnConflictUpdate(<tableName>, companions));

  Future<int> deleteById(String id) =>
      (delete(<tableName>)..where((t) => t.id.equals(id))).go();

  Future<void> replaceAll(List<<TableName>Companion> companions) async {
    await transaction(() async {
      await delete(<tableName>).go();
      await batch((b) => b.insertAll(<tableName>, companions));
    });
  }
}
```

## Étape 4 — Enregistrer dans AppDatabase

Ajouter la table et le DAO dans `lib/core/database/app_database.dart`.

## Étape 5 — Migration

Ajouter la migration dans `schemaVersion` et `migration`:
```dart
@override
int get schemaVersion => X; // Incrémenter

@override
MigrationStrategy get migration => MigrationStrategy(
  onCreate: (m) => m.createAll(),
  onUpgrade: (m, from, to) async {
    if (from < X) {
      await m.createTable(<tableName>);
    }
  },
);
```

## Étape 6 — Générer le code

```bash
dart run build_runner build
```

## Validation

- [ ] Table définie avec les bons types
- [ ] DAO avec opérations CRUD
- [ ] Migration incrémentale
- [ ] Chiffrement si données sensibles
- [ ] Code généré
- [ ] Tests passent
