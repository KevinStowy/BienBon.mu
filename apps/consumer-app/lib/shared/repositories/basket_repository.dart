import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/providers/api_provider.dart';
import '../models/basket.dart';

/// Repository for basket operations.
class BasketRepository {
  BasketRepository(this._api);
  final ApiClient _api;

  Future<List<Basket>> getBaskets({
    Map<String, dynamic>? queryParams,
  }) async {
    final data = await _api.get('/api/baskets', queryParams: queryParams);
    if (data is List) {
      return data
          .map((e) => Basket.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => Basket.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<Basket> getBasketById(String id) async {
    final data = await _api.get('/api/baskets/$id');
    return Basket.fromJson(data as Map<String, dynamic>);
  }
}

final basketRepositoryProvider = Provider<BasketRepository>((ref) {
  return BasketRepository(ref.watch(apiClientProvider));
});
