/// Filter state for explore screen (US-C016 to US-C019).
enum SortOption { proximity, priceAsc, priceDesc, pickupTime }

enum TimeSlot { morning, noon, afternoon, evening }

class FilterState {
  const FilterState({
    this.selectedDay,
    this.timeSlots = const {},
    this.categoryIds = const {},
    this.dietaryTags = const {},
    this.sortBy = SortOption.proximity,
    this.searchQuery = '',
  });

  /// Null means "all days", otherwise specific date.
  final DateTime? selectedDay;
  final Set<TimeSlot> timeSlots;
  final Set<String> categoryIds;
  final Set<String> dietaryTags;
  final SortOption sortBy;
  final String searchQuery;

  bool get hasActiveFilters =>
      selectedDay != null ||
      timeSlots.isNotEmpty ||
      categoryIds.isNotEmpty ||
      dietaryTags.isNotEmpty;

  int get activeFilterCount {
    var count = 0;
    if (selectedDay != null) count++;
    if (timeSlots.isNotEmpty) count++;
    if (categoryIds.isNotEmpty) count++;
    if (dietaryTags.isNotEmpty) count++;
    return count;
  }

  FilterState copyWith({
    DateTime? selectedDay,
    bool clearDay = false,
    Set<TimeSlot>? timeSlots,
    Set<String>? categoryIds,
    Set<String>? dietaryTags,
    SortOption? sortBy,
    String? searchQuery,
  }) {
    return FilterState(
      selectedDay: clearDay ? null : (selectedDay ?? this.selectedDay),
      timeSlots: timeSlots ?? this.timeSlots,
      categoryIds: categoryIds ?? this.categoryIds,
      dietaryTags: dietaryTags ?? this.dietaryTags,
      sortBy: sortBy ?? this.sortBy,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }

  static const FilterState empty = FilterState();

  /// Build query params for the API request.
  Map<String, dynamic> toQueryParams() {
    final params = <String, dynamic>{};
    if (selectedDay != null) {
      params['pickupDay'] = selectedDay!.toIso8601String().split('T').first;
    }
    if (timeSlots.isNotEmpty) {
      params['pickupTimeSlot'] =
          timeSlots.map((t) => t.name).join(',');
    }
    if (categoryIds.isNotEmpty) {
      params['categoryId'] = categoryIds.join(',');
    }
    if (dietaryTags.isNotEmpty) {
      params['dietaryTags'] = dietaryTags.join(',');
    }
    if (searchQuery.isNotEmpty) {
      params['search'] = searchQuery;
    }
    return params;
  }
}

/// Available dietary tags.
abstract final class DietaryTags {
  static const List<String> all = [
    'Vegetarien',
    'Vegan',
    'Halal',
  ];
}

/// Available basket categories.
abstract final class BasketCategories {
  static const List<String> all = [
    'Boulangerie',
    'Patisserie',
    'Restaurant',
    'Supermarche',
    'Fruits & Legumes',
    'Hotel',
    'Traiteur',
    'Cafe',
  ];
}

/// Time slot labels.
extension TimeSlotLabel on TimeSlot {
  String get label => switch (this) {
        TimeSlot.morning => 'Matin (6h-12h)',
        TimeSlot.noon => 'Midi (11h-14h)',
        TimeSlot.afternoon => 'Apres-midi (14h-18h)',
        TimeSlot.evening => 'Soir (18h-22h)',
      };

  String get shortLabel => switch (this) {
        TimeSlot.morning => 'Matin',
        TimeSlot.noon => 'Midi',
        TimeSlot.afternoon => 'Apres-midi',
        TimeSlot.evening => 'Soir',
      };
}
