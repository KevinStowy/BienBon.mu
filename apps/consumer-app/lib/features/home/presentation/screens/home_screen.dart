import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/basket_card.dart';
import '../../../../shared/widgets/store_card.dart';

// Demo data — replace with Riverpod providers once API is wired.
final _demoStores = [
  _StoreDemo(
    id: 'store-001',
    name: 'Boulangerie Paul',
    category: 'Boulangerie',
    distanceKm: 0.3,
    rating: 4.8,
    basketCount: 3,
  ),
  _StoreDemo(
    id: 'store-002',
    name: 'Restaurant Chez Pierre',
    category: 'Restaurant',
    distanceKm: 0.7,
    rating: 4.5,
    basketCount: 2,
  ),
  _StoreDemo(
    id: 'store-003',
    name: 'Super U Port-Louis',
    category: 'Supermarche',
    distanceKm: 1.2,
    rating: 4.2,
    basketCount: 5,
  ),
  _StoreDemo(
    id: 'store-004',
    name: 'Cafe Creole',
    category: 'Cafe',
    distanceKm: 0.5,
    rating: 4.6,
    basketCount: 1,
  ),
];

final _demoBaskets = [
  _BasketDemo(
    id: 'basket-001',
    name: 'Panier Viennoiseries',
    storeName: 'Boulangerie Paul',
    originalPrice: 350,
    discountedPrice: 120,
    pickupWindow: '17h - 19h',
    remaining: 3,
  ),
  _BasketDemo(
    id: 'basket-002',
    name: 'Panier Repas du Soir',
    storeName: 'Restaurant Chez Pierre',
    originalPrice: 600,
    discountedPrice: 200,
    pickupWindow: '20h - 21h',
    remaining: 2,
  ),
  _BasketDemo(
    id: 'basket-003',
    name: 'Panier Epicerie',
    storeName: 'Super U Port-Louis',
    originalPrice: 800,
    discountedPrice: 280,
    pickupWindow: '18h - 20h',
    remaining: 5,
  ),
  _BasketDemo(
    id: 'basket-004',
    name: 'Panier Petit-Dej',
    storeName: 'Cafe Creole',
    originalPrice: 250,
    discountedPrice: 90,
    pickupWindow: '08h - 10h',
    remaining: 1,
  ),
];

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // App bar
          SliverAppBar(
            floating: true,
            snap: true,
            backgroundColor: AppColors.white,
            elevation: 0,
            title: Row(
              children: [
                const Icon(Icons.eco, color: AppColors.green700, size: 28),
                const SizedBox(width: AppSpacing.xs),
                Text(
                  'BienBon',
                  style: theme.textTheme.headlineLarge?.copyWith(
                    color: AppColors.green900,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            actions: [
              Semantics(
                label: 'Localisation : Port-Louis',
                child: TextButton.icon(
                  onPressed: () {},
                  icon: const Icon(
                    Icons.location_on,
                    color: AppColors.orange600,
                    size: 16,
                  ),
                  label: Text(
                    'Port-Louis',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: AppColors.orange600,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Hero banner
                _HeroBanner(),
                const SizedBox(height: AppSpacing.lg),
                // Near me section
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Pres de chez moi',
                        style: theme.textTheme.headlineLarge,
                      ),
                      Semantics(
                        button: true,
                        label: 'Voir tous les commerces',
                        child: TextButton(
                          onPressed: () =>
                              context.goNamed(RouteNames.explore),
                          child: const Text('Voir tout'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                SizedBox(
                  height: 220,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                    ),
                    itemCount: _demoStores.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(width: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final store = _demoStores[index];
                      return StoreCard(
                        storeId: store.id,
                        storeName: store.name,
                        category: store.category,
                        distanceKm: store.distanceKm,
                        rating: store.rating,
                        basketCount: store.basketCount,
                        onTap: () => context.goNamed(
                          RouteNames.storeDetail,
                          pathParameters: {'storeId': store.id},
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                // Baskets section
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                  ),
                  child: Text(
                    'Paniers du moment',
                    style: theme.textTheme.headlineLarge,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                SizedBox(
                  height: 260,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                    ),
                    itemCount: _demoBaskets.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(width: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final basket = _demoBaskets[index];
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
                const SizedBox(height: AppSpacing.xl),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.all(AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.green100, Color(0xFFC8E6C9)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sauvez des\npaniers surprise !',
                  style: theme.textTheme.displayLarge?.copyWith(
                    color: AppColors.green900,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Jusqu\'a -70% sur les invendus du jour',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: AppColors.green700,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Container(
            width: 80,
            height: 80,
            decoration: const BoxDecoration(
              color: AppColors.green700,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.eco,
              size: 48,
              color: AppColors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _StoreDemo {
  const _StoreDemo({
    required this.id,
    required this.name,
    required this.category,
    required this.distanceKm,
    required this.rating,
    required this.basketCount,
  });

  final String id;
  final String name;
  final String category;
  final double distanceKm;
  final double rating;
  final int basketCount;
}

class _BasketDemo {
  const _BasketDemo({
    required this.id,
    required this.name,
    required this.storeName,
    required this.originalPrice,
    required this.discountedPrice,
    required this.pickupWindow,
    required this.remaining,
  });

  final String id;
  final String name;
  final String storeName;
  final double originalPrice;
  final double discountedPrice;
  final String pickupWindow;
  final int remaining;
}
