import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_database.dart';
import 'database_connection.dart';

/// Global Riverpod provider for the Drift [AppDatabase].
///
/// Disposed automatically when the [ProviderContainer] is destroyed, which
/// closes the underlying SQLite connection cleanly and flushes any pending
/// writes (important for the [OfflinePickupQueue] integrity).
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = constructDb();
  ref.onDispose(db.close);
  return db;
});
