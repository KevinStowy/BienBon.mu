import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/store.dart';
import '../../../shared/repositories/favorites_repository.dart';

/// Manages the set of favorite store IDs.
class FavoritesNotifier extends StateNotifier<AsyncValue<List<Store>>> {
  FavoritesNotifier(this._repo) : super(const AsyncValue.loading()) {
    _load();
  }

  final FavoritesRepository _repo;

  Future<void> _load() async {
    try {
      final stores = await _repo.getFavorites();
      state = AsyncValue.data(stores);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Set<String> get favoriteIds {
    return state.when(
      data: (stores) => stores.map((s) => s.id).toSet(),
      loading: () => <String>{},
      error: (_, __) => <String>{},
    );
  }

  bool isFavorite(String storeId) => favoriteIds.contains(storeId);

  Future<void> toggleFavorite(String storeId) async {
    final current = state.valueOrNull ?? [];
    if (favoriteIds.contains(storeId)) {
      // Optimistic remove
      state = AsyncValue.data(
          current.where((s) => s.id != storeId).toList());
      try {
        await _repo.removeFavorite(storeId);
      } catch (_) {
        // Revert on error
        await _load();
      }
    } else {
      // Optimistic add placeholder
      try {
        await _repo.addFavorite(storeId);
        await _load(); // Reload to get full store data
      } catch (_) {
        await _load();
      }
    }
  }

  Future<void> refresh() async => _load();
}

final favoritesProvider =
    StateNotifierProvider<FavoritesNotifier, AsyncValue<List<Store>>>((ref) {
  final repo = ref.watch(favoritesRepositoryProvider);
  return FavoritesNotifier(repo);
});

/// Quick lookup: is this store in favorites?
final isFavoriteProvider = Provider.family<bool, String>((ref, storeId) {
  final favorites = ref.watch(favoritesProvider);
  return favorites.when(
    data: (stores) => stores.any((s) => s.id == storeId),
    loading: () => false,
    error: (_, __) => false,
  );
});
