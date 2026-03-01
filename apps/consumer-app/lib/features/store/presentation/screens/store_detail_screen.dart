import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/basket_card.dart';

class StoreDetailScreen extends StatelessWidget {
  const StoreDetailScreen({super.key, required this.storeId});

  final String storeId;

  // Demo store data
  static final _storeData = <String, _StoreDetail>{
    'store-001': _StoreDetail(
      id: 'store-001',
      name: 'Boulangerie Paul',
      category: 'Boulangerie',
      address: '12 Rue de la Paix, Port-Louis',
      rating: 4.8,
      reviewCount: 124,
      description:
          'Boulangerie artisanale depuis 1987. Pains, viennoiseries et patisseries maison chaque jour.',
      baskets: [
        _BasketSummary(
          id: 'basket-001',
          name: 'Panier Viennoiseries',
          originalPrice: 350,
          discountedPrice: 120,
          pickupWindow: '17h - 19h',
          remaining: 3,
        ),
        _BasketSummary(
          id: 'basket-001b',
          name: 'Panier Pain & Brioches',
          originalPrice: 280,
          discountedPrice: 95,
          pickupWindow: '18h - 20h',
          remaining: 2,
        ),
      ],
    ),
    'store-002': _StoreDetail(
      id: 'store-002',
      name: 'Restaurant Chez Pierre',
      category: 'Restaurant',
      address: '45 Avenue du Commerce, Port-Louis',
      rating: 4.5,
      reviewCount: 89,
      description:
          'Cuisine mauricienne authentique. Plats du jour prepares avec des produits frais locaux.',
      baskets: [
        _BasketSummary(
          id: 'basket-002',
          name: 'Panier Repas du Soir',
          originalPrice: 600,
          discountedPrice: 200,
          pickupWindow: '20h - 21h',
          remaining: 2,
        ),
      ],
    ),
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final store = _storeData[storeId] ??
        _StoreDetail(
          id: storeId,
          name: 'Commerce',
          category: 'Divers',
          address: 'Adresse inconnue',
          rating: 0,
          reviewCount: 0,
          description: 'Informations non disponibles.',
          baskets: const [],
        );

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // Image header
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: AppColors.green700,
            leading: Semantics(
              button: true,
              label: 'Retour',
              child: IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.white),
                onPressed: () => context.pop(),
              ),
            ),
            actions: [
              Semantics(
                button: true,
                label: 'Ajouter aux favoris',
                child: IconButton(
                  icon: const Icon(Icons.favorite_outline,
                      color: AppColors.white),
                  onPressed: () {},
                ),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.green100,
                child: const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.storefront, size: 80, color: AppColors.green700),
                    SizedBox(height: AppSpacing.sm),
                  ],
                ),
              ),
            ),
          ),
          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Store header
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              store.name,
                              style: theme.textTheme.headlineLarge,
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.sm,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.green100,
                                borderRadius:
                                    BorderRadius.circular(AppRadius.chip),
                              ),
                              child: Text(
                                store.category,
                                style: theme.textTheme.labelLarge?.copyWith(
                                  color: AppColors.green700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Rating
                      Column(
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.star,
                                  color: AppColors.orange500, size: 20),
                              const SizedBox(width: 4),
                              Text(
                                store.rating.toStringAsFixed(1),
                                style: theme.textTheme.headlineMedium?.copyWith(
                                  color: AppColors.orange500,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            '${store.reviewCount} avis',
                            style: theme.textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  // Address
                  Row(
                    children: [
                      const Icon(Icons.location_on,
                          color: AppColors.textSecondary, size: 16),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          store.address,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  // Description
                  Text(
                    store.description,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: AppColors.textSecondary,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  const Divider(),
                  const SizedBox(height: AppSpacing.md),
                  // Baskets section
                  Text(
                    'Paniers disponibles',
                    style: theme.textTheme.headlineLarge,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  if (store.baskets.isEmpty)
                    Center(
                      child: Padding(
                        padding:
                            const EdgeInsets.all(AppSpacing.xl),
                        child: Text(
                          'Aucun panier disponible pour le moment',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    )
                  else
                    ...store.baskets.map(
                      (basket) => Padding(
                        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                        child: BasketCard(
                          basketId: basket.id,
                          basketName: basket.name,
                          storeName: store.name,
                          originalPrice: basket.originalPrice,
                          discountedPrice: basket.discountedPrice,
                          pickupWindow: basket.pickupWindow,
                          remainingCount: basket.remaining,
                          onTap: () => context.goNamed(
                            RouteNames.basketDetail,
                            pathParameters: {'basketId': basket.id},
                          ),
                        ),
                      ),
                    ),
                  const SizedBox(height: AppSpacing.xl),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StoreDetail {
  const _StoreDetail({
    required this.id,
    required this.name,
    required this.category,
    required this.address,
    required this.rating,
    required this.reviewCount,
    required this.description,
    required this.baskets,
  });

  final String id;
  final String name;
  final String category;
  final String address;
  final double rating;
  final int reviewCount;
  final String description;
  final List<_BasketSummary> baskets;
}

class _BasketSummary {
  const _BasketSummary({
    required this.id,
    required this.name,
    required this.originalPrice,
    required this.discountedPrice,
    required this.pickupWindow,
    required this.remaining,
  });

  final String id;
  final String name;
  final double originalPrice;
  final double discountedPrice;
  final String pickupWindow;
  final int remaining;
}
