import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers/api_provider.dart';
import '../models/store.dart';

/// Repository for store operations.
class StoreRepository {
  StoreRepository(this._api);
  final ApiClient _api;

  Future<List<Store>> getStores({
    Map<String, dynamic>? queryParams,
  }) async {
    final data = await _api.get('/api/stores', queryParams: queryParams);
    if (data is List) {
      return data
          .map((e) => Store.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => Store.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<Store> getStoreById(String id) async {
    final data = await _api.get('/api/stores/$id');
    return Store.fromJson(data as Map<String, dynamic>);
  }
}

final storeRepositoryProvider = Provider<StoreRepository>((ref) {
  return StoreRepository(ref.watch(apiClientProvider));
});
