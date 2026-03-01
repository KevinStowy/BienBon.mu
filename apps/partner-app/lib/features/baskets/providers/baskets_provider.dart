import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/widgets/basket_card_partner.dart';
import '../../../shared/widgets/status_badge.dart';

/// Provides the list of partner baskets (demo data).
final partnersBasketListProvider =
    StateNotifierProvider<BasketListNotifier, List<BasketModel>>((ref) {
  return BasketListNotifier();
});

class BasketListNotifier extends StateNotifier<List<BasketModel>> {
  BasketListNotifier() : super(_demoBaskets);

  void toggleStatus(String basketId) {
    state = state.map((basket) {
      if (basket.id != basketId) return basket;
      final newStatus = basket.status == BasketStatus.published
          ? BasketStatus.draft
          : BasketStatus.published;
      return BasketModel(
        id: basket.id,
        title: basket.title,
        originalPrice: basket.originalPrice,
        discountedPrice: basket.discountedPrice,
        stock: basket.stock,
        totalStock: basket.totalStock,
        status: newStatus,
        storeId: basket.storeId,
        storeName: basket.storeName,
        category: basket.category,
        pickupStart: basket.pickupStart,
        pickupEnd: basket.pickupEnd,
      );
    }).toList();
  }

  void adjustStock(String basketId, int delta) {
    state = state.map((basket) {
      if (basket.id != basketId) return basket;
      final newStock = (basket.stock + delta).clamp(0, basket.totalStock);
      return BasketModel(
        id: basket.id,
        title: basket.title,
        originalPrice: basket.originalPrice,
        discountedPrice: basket.discountedPrice,
        stock: newStock,
        totalStock: basket.totalStock,
        status: newStock == 0 ? BasketStatus.soldOut : basket.status,
        storeId: basket.storeId,
        storeName: basket.storeName,
        category: basket.category,
        pickupStart: basket.pickupStart,
        pickupEnd: basket.pickupEnd,
      );
    }).toList();
  }
}

final _demoBaskets = <BasketModel>[
  BasketModel(
    id: 'basket-001',
    title: 'Panier Surprise du Matin',
    originalPrice: 350,
    discountedPrice: 150,
    stock: 3,
    totalStock: 5,
    status: BasketStatus.published,
    storeId: 'store-001',
    storeName: 'Boulangerie Le Croissant',
    category: 'Boulangerie',
    pickupStart: DateTime.now().copyWith(hour: 18, minute: 0),
    pickupEnd: DateTime.now().copyWith(hour: 20, minute: 0),
  ),
  BasketModel(
    id: 'basket-002',
    title: 'Corbeille Viennoiseries',
    originalPrice: 500,
    discountedPrice: 200,
    stock: 4,
    totalStock: 4,
    status: BasketStatus.published,
    storeId: 'store-001',
    storeName: 'Boulangerie Le Croissant',
    category: 'Patisserie',
    pickupStart: DateTime.now().copyWith(hour: 17, minute: 30),
    pickupEnd: DateTime.now().copyWith(hour: 19, minute: 30),
  ),
  BasketModel(
    id: 'basket-003',
    title: 'Box Sandwich & Boissons',
    originalPrice: 600,
    discountedPrice: 250,
    stock: 2,
    totalStock: 2,
    status: BasketStatus.draft,
    storeId: 'store-002',
    storeName: 'Epicerie du Marche',
    category: 'Traiteur',
  ),
  BasketModel(
    id: 'basket-004',
    title: 'Delices du Marche',
    originalPrice: 800,
    discountedPrice: 300,
    stock: 0,
    totalStock: 3,
    status: BasketStatus.soldOut,
    storeId: 'store-002',
    storeName: 'Epicerie du Marche',
    category: 'Epicerie',
  ),
];
