import 'package:drift/drift.dart';

part 'app_database.g.dart';

/// Cached partner store records for offline use.
///
/// A partner may manage one or more stores; this table caches the stores
/// assigned to the authenticated partner account so that dashboard and
/// basket-management screens remain functional offline (ADR-012).
class CachedPartnerStores extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get category => text()();
  TextColumn get address => text()();
  TextColumn get status => text()();

  /// Number of active baskets currently published for this store.
  IntColumn get activeBasketCount =>
      integer().withDefault(const Constant(0))();
  DateTimeColumn get cachedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// Cached partner baskets for offline management.
///
/// Mirrors the partner-facing view of a basket (stock, pricing, window)
/// so that the basket list and detail screens load instantly.
class CachedPartnerBaskets extends Table {
  TextColumn get id => text()();
  TextColumn get storeId => text()();
  TextColumn get name => text()();
  RealColumn get originalPrice => real()();
  RealColumn get discountedPrice => real()();

  /// Serialised as an ISO-8601 interval string.
  TextColumn get pickupWindow => text()();
  IntColumn get totalStock => integer()();
  IntColumn get remainingStock => integer()();
  TextColumn get status => text()();
  DateTimeColumn get cachedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// Cached reservations for a partner store.
///
/// Used by the reservations list screen and, crucially, by the QR
/// validation flow so that pick-up confirmation can be pre-loaded and
/// matched offline (ADR-012: offline QR validation).
class CachedPartnerReservations extends Table {
  TextColumn get id => text()();
  TextColumn get basketId => text()();
  TextColumn get basketName => text()();
  TextColumn get consumerName => text()();

  /// QR code payload used for offline matching; stored so the scanner can
  /// validate the code even with no internet connection.
  TextColumn get qrCode => text()();
  TextColumn get status => text()();
  TextColumn get pickupWindow => text()();
  DateTimeColumn get reservedAt => dateTime()();
  DateTimeColumn get cachedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// Offline pickup validation queue (ADR-012).
///
/// When a partner validates a QR code while offline, the action is stored
/// here and replayed against the API when connectivity is restored.
///
/// [actionType] is always 'pickup_validate' for now; kept generic for
/// future extension (e.g. 'mark_no_show').
/// [qrPayload] is the raw string scanned from the consumer QR code.
/// [status] lifecycle: pending → syncing → synced | failed.
class OfflinePickupQueue extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get actionType => text()();
  TextColumn get reservationId => text()();
  TextColumn get qrPayload => text()();
  TextColumn get status =>
      text().withDefault(const Constant('pending'))();
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
}

@DriftDatabase(
  tables: [
    CachedPartnerStores,
    CachedPartnerBaskets,
    CachedPartnerReservations,
    OfflinePickupQueue,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase(super.e);

  @override
  int get schemaVersion => 1;
}
