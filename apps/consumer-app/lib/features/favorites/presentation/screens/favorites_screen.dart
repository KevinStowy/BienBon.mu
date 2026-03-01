import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';

class _FavoriteStore {
  const _FavoriteStore({
    required this.id,
    required this.name,
    required this.category,
    required this.rating,
    required this.basketCount,
  });

  final String id;
  final String name;
  final String category;
  final double rating;
  final int basketCount;
}

final _favoriteStores = [
  const _FavoriteStore(
    id: 'store-001',
    name: 'Boulangerie Paul',
    category: 'Boulangerie',
    rating: 4.8,
    basketCount: 3,
  ),
  const _FavoriteStore(
    id: 'store-004',
    name: 'Cafe Creole',
    category: 'Cafe',
    rating: 4.6,
    basketCount: 1,
  ),
  const _FavoriteStore(
    id: 'store-003',
    name: 'Super U Port-Louis',
    category: 'Supermarche',
    rating: 4.2,
    basketCount: 5,
  ),
];

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  final Set<String> _favorites = {
    'store-001',
    'store-004',
    'store-003',
  };

  void _toggleFavorite(String storeId) {
    setState(() {
      if (_favorites.contains(storeId)) {
        _favorites.remove(storeId);
      } else {
        _favorites.add(storeId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final visibleStores = _favoriteStores
        .where((s) => _favorites.contains(s.id))
        .toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Mes favoris', style: theme.textTheme.headlineLarge),
        backgroundColor: AppColors.white,
        elevation: 0,
      ),
      body: visibleStores.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.favorite_border,
                      size: 72,
                      color: AppColors.neutral200,
                    ),
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
            )
          : Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${visibleStores.length} commerce${visibleStores.length > 1 ? "s" : ""} favori${visibleStores.length > 1 ? "s" : ""}',
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
                      itemCount: visibleStores.length,
                      itemBuilder: (context, index) {
                        final store = visibleStores[index];
                        return _FavoriteStoreCard(
                          store: store,
                          isFavorite: _favorites.contains(store.id),
                          onToggleFavorite: () =>
                              _toggleFavorite(store.id),
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
  }
}

class _FavoriteStoreCard extends StatelessWidget {
  const _FavoriteStoreCard({
    required this.store,
    required this.isFavorite,
    required this.onToggleFavorite,
    required this.onTap,
  });

  final _FavoriteStore store;
  final bool isFavorite;
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
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Center(
                          child: Icon(
                            Icons.storefront,
                            size: 44,
                            color: AppColors.green700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Semantics(
                      button: true,
                      label: isFavorite
                          ? 'Retirer des favoris'
                          : 'Ajouter aux favoris',
                      child: GestureDetector(
                        onTap: onToggleFavorite,
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: const BoxDecoration(
                            color: AppColors.white,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isFavorite
                                ? Icons.favorite
                                : Icons.favorite_outline,
                            size: 18,
                            color: isFavorite
                                ? AppColors.green500
                                : AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Basket count badge
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
              // Store info
              Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      store.name,
                      style: theme.textTheme.headlineMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
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
                        const Icon(
                          Icons.star,
                          size: 12,
                          color: AppColors.orange500,
                        ),
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
