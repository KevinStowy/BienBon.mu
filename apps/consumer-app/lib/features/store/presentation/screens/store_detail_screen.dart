import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart' show Share;

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/basket_card.dart';
import '../../../explore/providers/baskets_provider.dart';
import '../../../explore/providers/stores_provider.dart';
import '../../../favorites/providers/favorites_provider.dart';

/// Store detail screen (US-C020 to US-C023, US-C046, US-C058).
class StoreDetailScreen extends ConsumerWidget {
  const StoreDetailScreen({super.key, required this.storeId});

  final String storeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final storeAsync = ref.watch(storeByIdProvider(storeId));
    final isFavorite = ref.watch(isFavoriteProvider(storeId));

    return storeAsync.when(
      data: (store) {
        // Also fetch baskets for this store
        final basketsAsync = ref.watch(basketsProvider);

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
                    icon:
                        const Icon(Icons.arrow_back, color: AppColors.white),
                    onPressed: () => context.pop(),
                  ),
                ),
                actions: [
                  Semantics(
                    button: true,
                    label: isFavorite
                        ? 'Retirer des favoris'
                        : 'Ajouter aux favoris',
                    child: IconButton(
                      icon: Icon(
                        isFavorite ? Icons.favorite : Icons.favorite_outline,
                        color: AppColors.white,
                      ),
                      onPressed: () => ref
                          .read(favoritesProvider.notifier)
                          .toggleFavorite(storeId),
                    ),
                  ),
                  Semantics(
                    button: true,
                    label: 'Partager ce commerce',
                    child: IconButton(
                      icon: const Icon(Icons.share, color: AppColors.white),
                      onPressed: () {
                        Share.share(
                          'Decouvre ${store.name} sur BienBon ! https://bienbon.mu/store/${store.id}',
                        );
                      },
                    ),
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: store.imageUrl != null
                      ? Image.network(
                          store.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _StoreImagePlaceholder(),
                        )
                      : _StoreImagePlaceholder(),
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
                                Text(store.name,
                                    style: theme.textTheme.headlineLarge),
                                const SizedBox(height: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: AppSpacing.sm,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.green100,
                                    borderRadius: BorderRadius.circular(
                                        AppRadius.chip),
                                  ),
                                  child: Text(
                                    store.category,
                                    style:
                                        theme.textTheme.labelLarge?.copyWith(
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
                                    style: theme.textTheme.headlineMedium
                                        ?.copyWith(
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
                      if (store.phone != null) ...[
                        const SizedBox(height: AppSpacing.xs),
                        Row(
                          children: [
                            const Icon(Icons.phone,
                                color: AppColors.textSecondary, size: 16),
                            const SizedBox(width: 4),
                            Text(
                              store.phone!,
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                      if (store.openingHours != null) ...[
                        const SizedBox(height: AppSpacing.xs),
                        Row(
                          children: [
                            const Icon(Icons.access_time,
                                color: AppColors.textSecondary, size: 16),
                            const SizedBox(width: 4),
                            Text(
                              store.openingHours!,
                              style: theme.textTheme.bodyLarge?.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: AppSpacing.md),
                      // Description
                      if (store.description != null) ...[
                        Text(
                          store.description!,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: AppColors.textSecondary,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                      ],
                      const Divider(),
                      const SizedBox(height: AppSpacing.md),
                      // Baskets section
                      Text('Paniers disponibles',
                          style: theme.textTheme.headlineLarge),
                      const SizedBox(height: AppSpacing.sm),
                      basketsAsync.when(
                        data: (allBaskets) {
                          final storeBaskets = allBaskets
                              .where((b) => b.storeId == storeId)
                              .toList();
                          if (storeBaskets.isEmpty) {
                            return Center(
                              child: Padding(
                                padding:
                                    const EdgeInsets.all(AppSpacing.xl),
                                child: Column(
                                  children: [
                                    const Icon(Icons.shopping_basket_outlined,
                                        size: 48,
                                        color: AppColors.neutral200),
                                    const SizedBox(height: AppSpacing.sm),
                                    Text(
                                      'Aucun panier disponible pour le moment',
                                      style: theme.textTheme.bodyLarge
                                          ?.copyWith(
                                        color: AppColors.textSecondary,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }
                          return Column(
                            children: storeBaskets.map((basket) {
                              return Padding(
                                padding: const EdgeInsets.only(
                                    bottom: AppSpacing.sm),
                                child: BasketCard(
                                  basketId: basket.id,
                                  basketName: basket.title,
                                  storeName: store.name,
                                  originalPrice: basket.originalPrice,
                                  discountedPrice: basket.discountedPrice,
                                  pickupWindow: basket.pickupWindow,
                                  remainingCount: basket.remaining,
                                  imageUrl: basket.imageUrl,
                                  onTap: () => context.goNamed(
                                    RouteNames.basketDetail,
                                    pathParameters: {
                                      'basketId': basket.id,
                                    },
                                  ),
                                ),
                              );
                            }).toList(),
                          );
                        },
                        loading: () => const Center(
                          child: CircularProgressIndicator(
                              color: AppColors.green700),
                        ),
                        error: (_, __) => const Text(
                            'Impossible de charger les paniers'),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                    ],
                  ),
                ),
              ),
            ],
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
                    ref.invalidate(storeByIdProvider(storeId)),
                child: const Text('Reessayer'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StoreImagePlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.green100,
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.storefront, size: 80, color: AppColors.green700),
          SizedBox(height: AppSpacing.sm),
        ],
      ),
    );
  }
}
