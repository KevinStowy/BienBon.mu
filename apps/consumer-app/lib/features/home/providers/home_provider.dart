import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/basket.dart';
import '../../../shared/models/store.dart';
import '../../../shared/repositories/basket_repository.dart';
import '../../../shared/repositories/store_repository.dart';

/// Nearby stores for the home screen.
final nearbyStoresProvider = FutureProvider<List<Store>>((ref) async {
  final repo = ref.watch(storeRepositoryProvider);
  return repo.getStores(queryParams: {'limit': '10'});
});

/// Featured baskets for the home screen.
final featuredBasketsProvider = FutureProvider<List<Basket>>((ref) async {
  final repo = ref.watch(basketRepositoryProvider);
  return repo.getBaskets(queryParams: {'limit': '10', 'featured': 'true'});
});
