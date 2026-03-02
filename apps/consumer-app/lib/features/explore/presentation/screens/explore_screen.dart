import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/services/location_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/basket.dart';
import '../../../../shared/widgets/basket_card.dart';
import '../../providers/baskets_provider.dart';
import '../widgets/filter_bar.dart';

/// Explore screen with map/list toggle (US-C013 to US-C019).
class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  bool _showMap = true;
  final _mapController = MapController();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final basketsAsync = ref.watch(basketsProvider);
    final userLocation = ref.watch(locationProvider);
    final filterState = ref.watch(filterStateProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Explorer', style: theme.textTheme.headlineLarge),
        backgroundColor: AppColors.white,
        elevation: 0,
        actions: [
          // Notifications bell
          Semantics(
            button: true,
            label: 'Notifications',
            child: IconButton(
              icon: const Icon(Icons.notifications_outlined),
              onPressed: () => context.pushNamed(RouteNames.notifications),
            ),
          ),
          // Map/list toggle
          Semantics(
            button: true,
            label: _showMap ? 'Afficher en liste' : 'Afficher sur la carte',
            child: IconButton(
              icon: Icon(_showMap ? Icons.list : Icons.map),
              onPressed: () => setState(() => _showMap = !_showMap),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md, AppSpacing.sm, AppSpacing.md, AppSpacing.xs,
            ),
            child: Semantics(
              label: 'Rechercher des paniers ou commerces',
              textField: true,
              child: TextField(
                onChanged: (v) =>
                    ref.read(filterStateProvider.notifier).updateSearch(v),
                decoration: InputDecoration(
                  hintText: 'Rechercher un panier ou un commerce...',
                  prefixIcon: const Icon(Icons.search,
                      color: AppColors.textSecondary),
                  suffixIcon: filterState.searchQuery.isNotEmpty
                      ? Semantics(
                          button: true,
                          label: 'Effacer la recherche',
                          child: IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () => ref
                                .read(filterStateProvider.notifier)
                                .updateSearch(''),
                          ),
                        )
                      : null,
                ),
              ),
            ),
          ),
          // Filter bar (US-C016 to US-C019)
          const FilterBar(),
          // Content
          Expanded(
            child: basketsAsync.when(
              data: (baskets) {
                if (_showMap) {
                  return _MapView(
                    baskets: baskets,
                    userLocation: userLocation,
                    mapController: _mapController,
                    onRecenter: () {
                      _mapController.move(
                        LatLng(
                          userLocation.latitude,
                          userLocation.longitude,
                        ),
                        14,
                      );
                    },
                  );
                } else {
                  return _ListView(baskets: baskets);
                }
              },
              loading: () => const Center(
                child:
                    CircularProgressIndicator(color: AppColors.green700),
              ),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_off,
                        size: 64, color: AppColors.neutral200),
                    const SizedBox(height: AppSpacing.md),
                    Text('Erreur de chargement',
                        style: theme.textTheme.headlineMedium),
                    const SizedBox(height: AppSpacing.xs),
                    Text('$e', style: theme.textTheme.bodyMedium),
                    const SizedBox(height: AppSpacing.md),
                    Semantics(
                      button: true,
                      label: 'Reessayer',
                      child: ElevatedButton(
                        onPressed: () => ref.invalidate(basketsProvider),
                        child: const Text('Reessayer'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Interactive map view using flutter_map + OpenStreetMap (US-C013).
class _MapView extends ConsumerWidget {
  const _MapView({
    required this.baskets,
    required this.userLocation,
    required this.mapController,
    required this.onRecenter,
  });

  final List<Basket> baskets;
  final UserLocation userLocation;
  final MapController mapController;
  final VoidCallback onRecenter;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final center = LatLng(userLocation.latitude, userLocation.longitude);

    // Build markers from baskets with store coordinates
    final markers = <Marker>[];
    for (final basket in baskets) {
      if (basket.storeLatitude != null && basket.storeLongitude != null) {
        markers.add(
          Marker(
            point: LatLng(basket.storeLatitude!, basket.storeLongitude!),
            width: 44,
            height: 44,
            child: Semantics(
              button: true,
              label:
                  '${basket.storeName}, ${basket.title}, ${basket.discountedPrice.toStringAsFixed(0)} MUR',
              child: GestureDetector(
                onTap: () => _showBasketPopup(context, basket),
                child: Container(
                  decoration: BoxDecoration(
                    color: basket.remaining <= 3
                        ? AppColors.orange600
                        : AppColors.green700,
                    shape: BoxShape.circle,
                    boxShadow: AppShadow.sm,
                  ),
                  child: Center(
                    child: Text(
                      '${basket.discountedPrice.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: AppColors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }
    }

    return Stack(
      children: [
        FlutterMap(
          mapController: mapController,
          options: MapOptions(
            initialCenter: center,
            initialZoom: 14,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'mu.bienbon.consumer',
            ),
            MarkerLayer(markers: markers),
          ],
        ),
        // Guest mode banner
        if (!ref.watch(_isAuthenticatedProvider))
          Positioned(
            top: AppSpacing.sm,
            left: AppSpacing.md,
            right: AppSpacing.md,
            child: Semantics(
              label: 'Vous naviguez en mode invite. Connectez-vous pour reserver.',
              child: Container(
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
                  children: [
                    const Icon(Icons.info_outline,
                        color: AppColors.orange600, size: 18),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        'Mode invite — connectez-vous pour reserver',
                        style: theme.textTheme.labelLarge?.copyWith(
                          color: AppColors.orange600,
                        ),
                      ),
                    ),
                    Semantics(
                      button: true,
                      label: 'Se connecter',
                      child: TextButton(
                        onPressed: () =>
                            context.pushNamed(RouteNames.login),
                        child: const Text('Connexion'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        // Recenter FAB
        Positioned(
          bottom: AppSpacing.md,
          right: AppSpacing.md,
          child: Semantics(
            button: true,
            label: 'Recentrer la carte sur ma position',
            child: FloatingActionButton(
              mini: true,
              backgroundColor: AppColors.white,
              onPressed: onRecenter,
              child: const Icon(Icons.my_location, color: AppColors.green700),
            ),
          ),
        ),
        // Results count at bottom
        Positioned(
          bottom: AppSpacing.md,
          left: AppSpacing.md,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(AppRadius.chip),
              boxShadow: AppShadow.sm,
            ),
            child: Text(
              '${baskets.length} panier${baskets.length != 1 ? "s" : ""}',
              style: theme.textTheme.labelLarge?.copyWith(
                color: AppColors.green700,
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _showBasketPopup(BuildContext context, Basket basket) {
    final theme = Theme.of(context);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppRadius.bottomSheet),
        ),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.neutral200,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(basket.storeName,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: AppColors.green700,
                    fontWeight: FontWeight.w600,
                  )),
              const SizedBox(height: AppSpacing.xs),
              Text(basket.title, style: theme.textTheme.headlineLarge),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Text(
                    '${basket.discountedPrice.toStringAsFixed(0)} MUR',
                    style: theme.textTheme.headlineLarge?.copyWith(
                      color: AppColors.green700,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    '${basket.originalPrice.toStringAsFixed(0)} MUR',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      decoration: TextDecoration.lineThrough,
                      color: AppColors.textDisabled,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  const Icon(Icons.access_time,
                      size: 14, color: AppColors.orange600),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    basket.pickupWindow,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: AppColors.orange600,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${basket.remaining} restant${basket.remaining > 1 ? "s" : ""}',
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: basket.remaining <= 3
                          ? AppColors.orange600
                          : AppColors.green700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Semantics(
                button: true,
                label: 'Voir les details du panier ${basket.title}',
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    context.goNamed(
                      RouteNames.basketDetail,
                      pathParameters: {'basketId': basket.id},
                    );
                  },
                  child: const Text('Voir les details'),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
            ],
          ),
        );
      },
    );
  }
}

/// Provider to check if user is authenticated (for guest mode banner).
final _isAuthenticatedProvider = Provider<bool>((ref) {
  // Returns false by default — auth state managed by authProvider
  return false;
});

/// List view of baskets (US-C015).
class _ListView extends StatelessWidget {
  const _ListView({required this.baskets});

  final List<Basket> baskets;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (baskets.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.search_off,
                size: 64, color: AppColors.neutral200),
            const SizedBox(height: AppSpacing.md),
            Text('Aucun panier trouve',
                style: theme.textTheme.headlineMedium?.copyWith(
                  color: AppColors.textSecondary,
                )),
            const SizedBox(height: AppSpacing.xs),
            Text('Essayez une autre recherche ou modifiez vos filtres',
                style: theme.textTheme.bodyMedium,
                textAlign: TextAlign.center),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          child: Text(
            '${baskets.length} panier${baskets.length > 1 ? "s" : ""} trouve${baskets.length > 1 ? "s" : ""}',
            style: theme.textTheme.bodyMedium,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: AppSpacing.sm,
              mainAxisSpacing: AppSpacing.sm,
              childAspectRatio: 0.78,
            ),
            itemCount: baskets.length,
            itemBuilder: (context, index) {
              final basket = baskets[index];
              return BasketCard(
                basketId: basket.id,
                basketName: basket.title,
                storeName: basket.storeName,
                originalPrice: basket.originalPrice,
                discountedPrice: basket.discountedPrice,
                pickupWindow: basket.pickupWindow,
                remainingCount: basket.remaining,
                imageUrl: basket.imageUrl,
                onTap: () => context.goNamed(
                  RouteNames.basketDetail,
                  pathParameters: {'basketId': basket.id},
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
