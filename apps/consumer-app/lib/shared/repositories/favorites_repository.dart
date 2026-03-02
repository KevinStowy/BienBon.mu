import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers/api_provider.dart';
import '../models/store.dart';

/// Repository for favorites operations.
class FavoritesRepository {
  FavoritesRepository(this._api);
  final ApiClient _api;

  Future<List<Store>> getFavorites() async {
    final data = await _api.get('/api/favorites');
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

  Future<void> addFavorite(String storeId) async {
    await _api.post('/api/favorites', body: {'storeId': storeId});
  }

  Future<void> removeFavorite(String storeId) async {
    await _api.delete('/api/favorites/$storeId');
  }
}

final favoritesRepositoryProvider = Provider<FavoritesRepository>((ref) {
  return FavoritesRepository(ref.watch(apiClientProvider));
});
