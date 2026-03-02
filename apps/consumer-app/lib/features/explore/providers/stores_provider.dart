import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/store.dart';
import '../../../shared/repositories/store_repository.dart';

/// Fetches all stores from API.
final storesProvider = FutureProvider<List<Store>>((ref) async {
  final repo = ref.watch(storeRepositoryProvider);
  return repo.getStores();
});

/// Single store by ID.
final storeByIdProvider =
    FutureProvider.family<Store, String>((ref, storeId) async {
  final repo = ref.watch(storeRepositoryProvider);
  return repo.getStoreById(storeId);
});
