import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart' show Share;

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../explore/providers/baskets_provider.dart';

/// Basket detail screen (US-C022, US-C058).
class BasketDetailScreen extends ConsumerWidget {
  const BasketDetailScreen({super.key, required this.basketId});

  final String basketId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final basketAsync = ref.watch(basketByIdProvider(basketId));

    return basketAsync.when(
      data: (basket) {
        final discountPercent =
            ((1 - basket.discountedPrice / basket.originalPrice) * 100)
                .round();

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
                    icon:
                        const Icon(Icons.arrow_back, color: AppColors.white),
                    onPressed: () => context.pop(),
                  ),
                ),
                actions: [
                  Semantics(
                    button: true,
                    label: 'Partager ce panier',
                    child: IconButton(
                      icon: const Icon(Icons.share, color: AppColors.white),
                      onPressed: () {
                        Share.share(
                          'Decouvre ce panier surprise "${basket.title}" chez ${basket.storeName} a seulement ${basket.discountedPrice.toStringAsFixed(0)} MUR sur BienBon ! https://bienbon.mu/basket/${basket.id}',
                        );
                      },
                    ),
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: basket.imageUrl != null
                      ? Image.network(
                          basket.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _PlaceholderImage(),
                        )
                      : _PlaceholderImage(),
                ),
              ),
              // Detail content
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Discount badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: AppSpacing.xs,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.orange600,
                          borderRadius:
                              BorderRadius.circular(AppRadius.chip),
                        ),
                        child: Text(
                          '-$discountPercent%',
                          style: theme.textTheme.headlineMedium?.copyWith(
                            color: AppColors.white,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      // Store name
                      Semantics(
                        button: true,
                        label: 'Voir le commerce ${basket.storeName}',
                        child: GestureDetector(
                          onTap: () => context.goNamed(
                            RouteNames.storeDetail,
                            pathParameters: {'storeId': basket.storeId},
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.storefront,
                                  size: 16, color: AppColors.green700),
                              const SizedBox(width: 4),
                              Text(
                                basket.storeName,
                                style: theme.textTheme.bodyLarge?.copyWith(
                                  color: AppColors.green700,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const Icon(Icons.chevron_right,
                                  size: 16, color: AppColors.green700),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      // Basket name
                      Text(
                        basket.title,
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
                              style:
                                  theme.textTheme.headlineMedium?.copyWith(
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
                          borderRadius:
                              BorderRadius.circular(AppRadius.card),
                          border: Border.all(color: AppColors.orange500),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.access_time,
                                color: AppColors.orange600, size: 20),
                            const SizedBox(width: AppSpacing.sm),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Creneau de retrait',
                                  style:
                                      theme.textTheme.labelLarge?.copyWith(
                                    color: AppColors.orange600,
                                  ),
                                ),
                                Text(
                                  basket.pickupWindow,
                                  style: theme.textTheme.headlineMedium
                                      ?.copyWith(
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
                      if (basket.description != null &&
                          basket.description!.isNotEmpty) ...[
                        Text('Description',
                            style: theme.textTheme.headlineLarge),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          basket.description!,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: AppColors.textSecondary,
                            height: 1.6,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                      ],
                      // Dietary tags
                      if (basket.dietaryTags.isNotEmpty) ...[
                        Wrap(
                          spacing: AppSpacing.sm,
                          runSpacing: AppSpacing.xs,
                          children: basket.dietaryTags.map((tag) {
                            return Chip(
                              label: Text(tag),
                              backgroundColor: AppColors.green100,
                              labelStyle:
                                  const TextStyle(color: AppColors.green700),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: AppSpacing.md),
                      ],
                      // Store address
                      if (basket.storeAddress != null) ...[
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: AppColors.neutral50,
                            borderRadius:
                                BorderRadius.circular(AppRadius.card),
                            border: Border.all(color: AppColors.divider),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.location_on,
                                  size: 16, color: AppColors.textSecondary),
                              const SizedBox(width: AppSpacing.xs),
                              Expanded(
                                child: Text(
                                  basket.storeAddress!,
                                  style: theme.textTheme.bodyLarge?.copyWith(
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
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
                  onPressed: basket.isAvailable
                      ? () => context.goNamed(
                            RouteNames.reservation,
                            pathParameters: {'basketId': basketId},
                          )
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.green700,
                    padding: const EdgeInsets.symmetric(
                        vertical: AppSpacing.md),
                  ),
                  child: Text(
                    basket.isAvailable
                        ? 'Reserver ce panier'
                        : 'Rupture de stock',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
      loading: () => Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: const Center(
          child: CircularProgressIndicator(color: AppColors.green700),
        ),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erreur : $e', style: theme.textTheme.bodyLarge),
              const SizedBox(height: AppSpacing.md),
              ElevatedButton(
                onPressed: () =>
                    ref.invalidate(basketByIdProvider(basketId)),
                child: const Text('Reessayer'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlaceholderImage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.green100,
      child: const Center(
        child:
            Icon(Icons.shopping_basket, size: 100, color: AppColors.green700),
      ),
    );
  }
}
