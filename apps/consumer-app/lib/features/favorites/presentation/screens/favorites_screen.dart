import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/store.dart';
import '../../providers/favorites_provider.dart';

/// Favorites screen (US-C050 to US-C053).
class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final favoritesAsync = ref.watch(favoritesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Mes favoris', style: theme.textTheme.headlineLarge),
        backgroundColor: AppColors.white,
        elevation: 0,
      ),
      body: favoritesAsync.when(
        data: (stores) {
          if (stores.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.favorite_border,
                        size: 72, color: AppColors.neutral200),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      'Aucun favori',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Ajoutez des commerces a vos favoris pour les retrouver facilement.',
                      style: theme.textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Semantics(
                      button: true,
                      label: 'Decouvrir les commerces',
                      child: ElevatedButton(
                        onPressed: () =>
                            context.goNamed(RouteNames.explore),
                        child: const Text('Decouvrir les commerces'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.read(favoritesProvider.notifier).refresh(),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${stores.length} commerce${stores.length > 1 ? "s" : ""} favori${stores.length > 1 ? "s" : ""}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Expanded(
                    child: GridView.builder(
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: AppSpacing.sm,
                        mainAxisSpacing: AppSpacing.sm,
                        childAspectRatio: 0.85,
                      ),
                      itemCount: stores.length,
                      itemBuilder: (context, index) {
                        final store = stores[index];
                        return _FavoriteStoreCard(
                          store: store,
                          onToggleFavorite: () => ref
                              .read(favoritesProvider.notifier)
                              .toggleFavorite(store.id),
                          onTap: () => context.goNamed(
                            RouteNames.storeDetail,
                            pathParameters: {'storeId': store.id},
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.green700),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erreur : $e', style: theme.textTheme.bodyLarge),
              const SizedBox(height: AppSpacing.md),
              ElevatedButton(
                onPressed: () =>
                    ref.read(favoritesProvider.notifier).refresh(),
                child: const Text('Reessayer'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FavoriteStoreCard extends StatelessWidget {
  const _FavoriteStoreCard({
    required this.store,
    required this.onToggleFavorite,
    required this.onTap,
  });

  final Store store;
  final VoidCallback onToggleFavorite;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      button: true,
      label:
          '${store.name}, ${store.category}, note ${store.rating}, ${store.basketCount} paniers',
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(AppRadius.card),
            boxShadow: AppShadow.sm,
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image placeholder with heart
              Stack(
                children: [
                  Container(
                    height: 110,
                    color: AppColors.green100,
                    child: store.imageUrl != null
                        ? Image.network(
                            store.imageUrl!,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            height: 110,
                            errorBuilder: (_, __, ___) => const Center(
                              child: Icon(Icons.storefront,
                                  size: 44, color: AppColors.green700),
                            ),
                          )
                        : const Center(
                            child: Icon(Icons.storefront,
                                size: 44, color: AppColors.green700),
                          ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Semantics(
                      button: true,
                      label: 'Retirer des favoris',
                      child: GestureDetector(
                        onTap: onToggleFavorite,
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: const BoxDecoration(
                            color: AppColors.white,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.favorite,
                              size: 18, color: AppColors.green500),
                        ),
                      ),
                    ),
                  ),
                  if (store.basketCount > 0)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.green700,
                          borderRadius:
                              BorderRadius.circular(AppRadius.chip),
                        ),
                        child: Text(
                          '${store.basketCount}',
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: AppColors.white,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(store.name,
                        style: theme.textTheme.headlineMedium,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(
                      store.category,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: [
                        const Icon(Icons.star,
                            size: 12, color: AppColors.orange500),
                        const SizedBox(width: 2),
                        Text(
                          store.rating.toStringAsFixed(1),
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: AppColors.orange500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
