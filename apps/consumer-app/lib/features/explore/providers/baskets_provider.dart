import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/models/basket.dart';
import '../../../shared/models/filter_state.dart';
import '../../../shared/repositories/basket_repository.dart';

/// Provider for the current filter state.
final filterStateProvider =
    StateNotifierProvider<FilterStateNotifier, FilterState>((ref) {
  return FilterStateNotifier();
});

class FilterStateNotifier extends StateNotifier<FilterState> {
  FilterStateNotifier() : super(FilterState.empty);

  void updateDay(DateTime? day) {
    if (day == null) {
      state = state.copyWith(clearDay: true);
    } else {
      state = state.copyWith(selectedDay: day);
    }
  }

  void toggleTimeSlot(TimeSlot slot) {
    final current = Set<TimeSlot>.from(state.timeSlots);
    if (current.contains(slot)) {
      current.remove(slot);
    } else {
      current.add(slot);
    }
    state = state.copyWith(timeSlots: current);
  }

  void toggleCategory(String categoryId) {
    final current = Set<String>.from(state.categoryIds);
    if (current.contains(categoryId)) {
      current.remove(categoryId);
    } else {
      current.add(categoryId);
    }
    state = state.copyWith(categoryIds: current);
  }

  void toggleDietaryTag(String tag) {
    final current = Set<String>.from(state.dietaryTags);
    if (current.contains(tag)) {
      current.remove(tag);
    } else {
      current.add(tag);
    }
    state = state.copyWith(dietaryTags: current);
  }

  void updateSort(SortOption sort) {
    state = state.copyWith(sortBy: sort);
  }

  void updateSearch(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void resetFilters() {
    state = FilterState.empty;
  }
}

/// Fetches baskets from API using current filters.
final basketsProvider = FutureProvider<List<Basket>>((ref) async {
  final filterState = ref.watch(filterStateProvider);
  final repo = ref.watch(basketRepositoryProvider);
  final params = filterState.toQueryParams();
  return repo.getBaskets(queryParams: params.isNotEmpty ? params : null);
});

/// Single basket by ID.
final basketByIdProvider =
    FutureProvider.family<Basket, String>((ref, basketId) async {
  final repo = ref.watch(basketRepositoryProvider);
  return repo.getBasketById(basketId);
});
