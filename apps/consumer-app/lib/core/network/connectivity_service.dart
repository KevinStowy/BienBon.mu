import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Stream of connectivity booleans.
///
/// Emits `true` when at least one [ConnectivityResult] is not
/// [ConnectivityResult.none], and `false` when all interfaces are offline.
///
/// Consumers can watch this provider to react to network changes:
///
/// ```dart
/// final isOnline = ref.watch(connectivityProvider).valueOrNull ?? true;
/// ```
///
/// The default assumption is online (`true`) when the stream has not yet
/// emitted its first value, which keeps the optimistic read path working.
final connectivityProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map(
    (results) => results.any((r) => r != ConnectivityResult.none),
  );
});
