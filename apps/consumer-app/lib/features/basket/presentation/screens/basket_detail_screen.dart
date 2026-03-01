import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';

class BasketDetailScreen extends StatelessWidget {
  const BasketDetailScreen({super.key, required this.basketId});

  final String basketId;

  static final _basketData = <String, _BasketDetail>{
    'basket-001': _BasketDetail(
      id: 'basket-001',
      name: 'Panier Viennoiseries',
      storeName: 'Boulangerie Paul',
      storeId: 'store-001',
      description:
          'Un delicieux assortiment de viennoiseries artisanales du jour : croissants, pains au chocolat, brioches et surprises selon arrivage. Contenu exact non previsible — c\'est la surprise !',
      originalPrice: 350,
      discountedPrice: 120,
      pickupStart: '17:00',
      pickupEnd: '19:00',
      remaining: 3,
      allergens: 'Gluten, lait, oeufs',
    ),
    'basket-002': _BasketDetail(
      id: 'basket-002',
      name: 'Panier Repas du Soir',
      storeName: 'Restaurant Chez Pierre',
      storeId: 'store-002',
      description:
          'Repas complet pour 2 personnes : entree, plat principal et dessert. Cuisine mauricienne traditionnelle preparee ce soir avec des produits frais.',
      originalPrice: 600,
      discountedPrice: 200,
      pickupStart: '20:00',
      pickupEnd: '21:00',
      remaining: 2,
      allergens: 'Poisson, crustaces',
    ),
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final basket = _basketData[basketId] ??
        _BasketDetail(
          id: basketId,
          name: 'Panier Surprise',
          storeName: 'Commerce BienBon',
          storeId: '',
          description: 'Details non disponibles.',
          originalPrice: 300,
          discountedPrice: 99,
          pickupStart: '17:00',
          pickupEnd: '19:00',
          remaining: 1,
          allergens: 'Non specifie',
        );

    final discountPercent =
        ((1 - basket.discountedPrice / basket.originalPrice) * 100).round();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // Image header
          SliverAppBar(
            expandedHeight: 260,
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
                label: 'Partager ce panier',
                child: IconButton(
                  icon: const Icon(Icons.share, color: AppColors.white),
                  onPressed: () {},
                ),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: AppColors.green100,
                child: Stack(
                  children: [
                    const Center(
                      child: Icon(
                        Icons.shopping_basket,
                        size: 100,
                        color: AppColors.green700,
                      ),
                    ),
                    // Discount badge
                    Positioned(
                      bottom: AppSpacing.md,
                      left: AppSpacing.md,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: AppSpacing.xs,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.orange600,
                          borderRadius: BorderRadius.circular(AppRadius.chip),
                        ),
                        child: Text(
                          '-$discountPercent%',
                          style: theme.textTheme.headlineMedium?.copyWith(
                            color: AppColors.white,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          // Detail content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Store name
                  Semantics(
                    button: true,
                    label: 'Voir le commerce ${basket.storeName}',
                    child: GestureDetector(
                      onTap: basket.storeId.isNotEmpty
                          ? () => context.goNamed(
                                RouteNames.storeDetail,
                                pathParameters: {'storeId': basket.storeId},
                              )
                          : null,
                      child: Row(
                        children: [
                          const Icon(
                            Icons.storefront,
                            size: 16,
                            color: AppColors.green700,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            basket.storeName,
                            style: theme.textTheme.bodyLarge?.copyWith(
                              color: AppColors.green700,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const Icon(
                            Icons.chevron_right,
                            size: 16,
                            color: AppColors.green700,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  // Basket name
                  Text(
                    basket.name,
                    style: theme.textTheme.displayLarge?.copyWith(
                      color: AppColors.neutral900,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  // Price row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${basket.discountedPrice.toStringAsFixed(0)} MUR',
                        style: theme.textTheme.displayLarge?.copyWith(
                          color: AppColors.green700,
                          fontWeight: FontWeight.w800,
                          fontSize: 28,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text(
                          '${basket.originalPrice.toStringAsFixed(0)} MUR',
                          style: theme.textTheme.headlineMedium?.copyWith(
                            decoration: TextDecoration.lineThrough,
                            color: AppColors.textDisabled,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  // Pickup window
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: AppSpacing.sm,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.orange100,
                      borderRadius: BorderRadius.circular(AppRadius.card),
                      border: Border.all(color: AppColors.orange500),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.access_time,
                          color: AppColors.orange600,
                          size: 20,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Creneau de retrait',
                              style: theme.textTheme.labelLarge?.copyWith(
                                color: AppColors.orange600,
                              ),
                            ),
                            Text(
                              '${basket.pickupStart} - ${basket.pickupEnd}',
                              style: theme.textTheme.headlineMedium?.copyWith(
                                color: AppColors.orange600,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  // Remaining count
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: basket.remaining <= 3
                              ? AppColors.orange600
                              : AppColors.green700,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      Text(
                        '${basket.remaining} panier${basket.remaining > 1 ? "s" : ""} restant${basket.remaining > 1 ? "s" : ""}',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: basket.remaining <= 3
                              ? AppColors.orange600
                              : AppColors.green700,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  const Divider(),
                  const SizedBox(height: AppSpacing.md),
                  // Description
                  Text(
                    'Description',
                    style: theme.textTheme.headlineLarge,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    basket.description,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: AppColors.textSecondary,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  // Allergens
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.neutral50,
                      borderRadius: BorderRadius.circular(AppRadius.card),
                      border: Border.all(color: AppColors.divider),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.info_outline,
                          size: 16,
                          color: AppColors.textSecondary,
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Allergenes possibles',
                                style: theme.textTheme.labelLarge?.copyWith(
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                basket.allergens,
                                style: theme.textTheme.bodyMedium,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                ],
              ),
            ),
          ),
        ],
      ),
      // Reserve button
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.sm,
            AppSpacing.md,
            AppSpacing.md,
          ),
          child: Semantics(
            button: true,
            label: 'Reserver ce panier',
            child: ElevatedButton(
              onPressed: () => context.goNamed(
                RouteNames.reservation,
                pathParameters: {'basketId': basketId},
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.green700,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              ),
              child: const Text(
                'Reserver ce panier',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BasketDetail {
  const _BasketDetail({
    required this.id,
    required this.name,
    required this.storeName,
    required this.storeId,
    required this.description,
    required this.originalPrice,
    required this.discountedPrice,
    required this.pickupStart,
    required this.pickupEnd,
    required this.remaining,
    required this.allergens,
  });

  final String id;
  final String name;
  final String storeName;
  final String storeId;
  final String description;
  final double originalPrice;
  final double discountedPrice;
  final String pickupStart;
  final String pickupEnd;
  final int remaining;
  final String allergens;
}
