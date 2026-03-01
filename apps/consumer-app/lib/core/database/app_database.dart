import 'package:drift/drift.dart';

part 'app_database.g.dart';

/// Cached stores table for offline browsing.
///
/// Populated when the user fetches the explore/home screen. Allows
/// browsing stores without a network connection (ADR-012: offline-first
/// read path).
class CachedStores extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get category => text()();
  RealColumn get latitude => real().nullable()();
  RealColumn get longitude => real().nullable()();
  TextColumn get address => text()();
  RealColumn get rating => real().withDefault(const Constant(0))();
  IntColumn get basketCount => integer().withDefault(const Constant(0))();
  DateTimeColumn get cachedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// Cached baskets table for offline browsing.
///
/// Mirrors the server-side Basket entity for the fields needed by the
/// consumer listing and detail screens.
class CachedBaskets extends Table {
  TextColumn get id => text()();
  TextColumn get storeId => text()();
  TextColumn get name => text()();
  TextColumn get storeName => text()();
  RealColumn get originalPrice => real()();
  RealColumn get discountedPrice => real()();

  /// Serialised as an ISO-8601 interval string, e.g.
  /// "2026-03-01T17:00:00/2026-03-01T19:00:00".
  TextColumn get pickupWindow => text()();
  IntColumn get remainingCount => integer()();
  TextColumn get status =>
      text().withDefault(const Constant('available'))();
  DateTimeColumn get cachedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// User's reservations for offline access.
///
/// Written after a successful reservation and kept in sync so the user
/// can see their QR code even when offline.
class CachedReservations extends Table {
  TextColumn get id => text()();
  TextColumn get basketId => text()();
  TextColumn get basketName => text()();
  TextColumn get storeName => text()();
  TextColumn get status => text()();
  TextColumn get pickupWindow => text()();

  /// Base64-encoded QR code data; nullable for pending reservations that
  /// have not yet received a code from the server.
  TextColumn get qrCode => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get cachedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// Offline action queue — mutations performed while offline, replayed
/// when connectivity is restored (ADR-012: write path).
///
/// Supported [actionType] values: 'reserve', 'cancel', 'pickup_validate'.
/// [payload] is a JSON-encoded map that carries the data needed to replay
/// the action against the REST API.
/// [status] lifecycle: pending → syncing → synced | failed.
class OfflineActionQueue extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get actionType => text()();
  TextColumn get payload => text()();
  TextColumn get status =>
      text().withDefault(const Constant('pending'))();
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
}

@DriftDatabase(
  tables: [
    CachedStores,
    CachedBaskets,
    CachedReservations,
    OfflineActionQueue,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase(super.e);

  @override
  int get schemaVersion => 1;
}
