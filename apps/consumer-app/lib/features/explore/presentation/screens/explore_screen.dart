import 'package:consumer_app/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/analytics/analytics_provider.dart';
import '../../../../core/analytics/analytics_service.dart';
import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/basket_card.dart';

final _allBaskets = [
  _BasketItem(
    id: 'basket-001',
    name: 'Panier Viennoiseries',
    storeName: 'Boulangerie Paul',
    category: 'Boulangerie',
    originalPrice: 350,
    discountedPrice: 120,
    pickupWindow: '17h - 19h',
    remaining: 3,
  ),
  _BasketItem(
    id: 'basket-002',
    name: 'Panier Repas du Soir',
    storeName: 'Restaurant Chez Pierre',
    category: 'Restaurant',
    originalPrice: 600,
    discountedPrice: 200,
    pickupWindow: '20h - 21h',
    remaining: 2,
  ),
  _BasketItem(
    id: 'basket-003',
    name: 'Panier Epicerie',
    storeName: 'Super U Port-Louis',
    category: 'Supermarche',
    originalPrice: 800,
    discountedPrice: 280,
    pickupWindow: '18h - 20h',
    remaining: 5,
  ),
  _BasketItem(
    id: 'basket-004',
    name: 'Panier Petit-Dej',
    storeName: 'Cafe Creole',
    category: 'Cafe',
    originalPrice: 250,
    discountedPrice: 90,
    pickupWindow: '08h - 10h',
    remaining: 1,
  ),
  _BasketItem(
    id: 'basket-005',
    name: 'Panier Pain & Patisserie',
    storeName: 'Au Bon Pain',
    category: 'Boulangerie',
    originalPrice: 420,
    discountedPrice: 150,
    pickupWindow: '16h - 18h',
    remaining: 4,
  ),
  _BasketItem(
    id: 'basket-006',
    name: 'Panier Dejeuner',
    storeName: 'Le Planteur',
    category: 'Restaurant',
    originalPrice: 500,
    discountedPrice: 180,
    pickupWindow: '14h - 15h',
    remaining: 2,
  ),
];

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  String? _selectedCategory;
  String _searchQuery = '';

  List<String> _buildCategories(AppLocalizations l10n) => [
        l10n.exploreCategoryAll,
        l10n.exploreCategoryBakery,
        l10n.exploreCategoryRestaurant,
        l10n.exploreCategorySupermarket,
        l10n.exploreCategoryCafe,
        'Traiteur',
      ];

  List<_BasketItem> _filteredBaskets(String categoryAll) {
    return _allBaskets.where((basket) {
      final matchesCategory = _selectedCategory == null ||
          _selectedCategory == categoryAll ||
          basket.category == _selectedCategory;
      final matchesSearch = _searchQuery.isEmpty ||
          basket.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          basket.storeName.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    final categories = _buildCategories(l10n);

    // Initialize the default selected category from l10n on first build.
    _selectedCategory ??= l10n.exploreCategoryAll;

    final filtered = _filteredBaskets(l10n.exploreCategoryAll);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          l10n.exploreTitle,
          style: theme.textTheme.headlineLarge,
        ),
        backgroundColor: AppColors.white,
        elevation: 0,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.sm,
            ),
            child: Semantics(
              label: 'Rechercher des paniers ou commerces',
              textField: true,
              child: TextField(
                onChanged: (v) => setState(() => _searchQuery = v),
                onSubmitted: (v) {
                  if (v.isNotEmpty) {
                    ref.read(analyticsProvider).logEvent(
                      AnalyticsEvents.searchPerformed,
                      {
                        'query': v,
                        'category': _selectedCategory ?? 'all',
                      },
                    );
                  }
                },
                decoration: InputDecoration(
                  hintText: l10n.exploreSearchHint,
                  prefixIcon: const Icon(
                    Icons.search,
                    color: AppColors.textSecondary,
                  ),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? Semantics(
                          button: true,
                          label: 'Effacer la recherche',
                          child: IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () =>
                                setState(() => _searchQuery = ''),
                          ),
                        )
                      : null,
                ),
              ),
            ),
          ),
          // Category chips
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
              ),
              itemCount: categories.length,
              separatorBuilder: (context, index) =>
                  const SizedBox(width: AppSpacing.sm),
              itemBuilder: (context, index) {
                final cat = categories[index];
                final isSelected = cat == _selectedCategory;

                return Semantics(
                  button: true,
                  selected: isSelected,
                  label: 'Categorie $cat${isSelected ? ", selectionnee" : ""}',
                  child: FilterChip(
                    label: Text(cat),
                    selected: isSelected,
                    onSelected: (_) =>
                        setState(() => _selectedCategory = cat),
                    selectedColor: AppColors.green100,
                    checkmarkColor: AppColors.green700,
                    labelStyle: TextStyle(
                      color: isSelected
                          ? AppColors.green700
                          : AppColors.textPrimary,
                      fontWeight: isSelected
                          ? FontWeight.w700
                          : FontWeight.w400,
                    ),
                    side: BorderSide(
                      color: isSelected
                          ? AppColors.green700
                          : AppColors.divider,
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          // Results count
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Text(
              l10n.exploreResultsCount(filtered.length),
              style: theme.textTheme.bodyMedium,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          // Grid of baskets
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.search_off,
                          size: 64,
                          color: AppColors.neutral200,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          l10n.exploreNoResults,
                          style: theme.textTheme.headlineMedium?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          l10n.exploreNoResultsSubtitle,
                          style: theme.textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                    ),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: AppSpacing.sm,
                      mainAxisSpacing: AppSpacing.sm,
                      childAspectRatio: 0.78,
                    ),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final basket = filtered[index];
                      return BasketCard(
                        basketId: basket.id,
                        basketName: basket.name,
                        storeName: basket.storeName,
                        originalPrice: basket.originalPrice,
                        discountedPrice: basket.discountedPrice,
                        pickupWindow: basket.pickupWindow,
                        remainingCount: basket.remaining,
                        onTap: () => context.goNamed(
                          RouteNames.basketDetail,
                          pathParameters: {'basketId': basket.id},
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _BasketItem {
  const _BasketItem({
    required this.id,
    required this.name,
    required this.storeName,
    required this.category,
    required this.originalPrice,
    required this.discountedPrice,
    required this.pickupWindow,
    required this.remaining,
  });

  final String id;
  final String name;
  final String storeName;
  final String category;
  final double originalPrice;
  final double discountedPrice;
  final String pickupWindow;
  final int remaining;
}
