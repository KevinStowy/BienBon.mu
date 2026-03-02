import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/services/location_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/basket_card.dart';
import '../../../../shared/widgets/store_card.dart';
import '../../../notifications/providers/notifications_provider.dart';
import '../../providers/home_provider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final storesAsync = ref.watch(nearbyStoresProvider);
    final basketsAsync = ref.watch(featuredBasketsProvider);
    final userLocation = ref.watch(locationProvider);
    final unreadCount = ref.watch(unreadNotificationCountProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(nearbyStoresProvider);
          ref.invalidate(featuredBasketsProvider);
        },
        child: CustomScrollView(
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
                // Notifications
                Semantics(
                  button: true,
                  label: unreadCount > 0
                      ? '$unreadCount notifications non lues'
                      : 'Notifications',
                  child: Stack(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.notifications_outlined),
                        onPressed: () =>
                            context.pushNamed(RouteNames.notifications),
                      ),
                      if (unreadCount > 0)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            width: 16,
                            height: 16,
                            decoration: const BoxDecoration(
                              color: AppColors.orange600,
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                '$unreadCount',
                                style: const TextStyle(
                                  color: AppColors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                // Location indicator
                Semantics(
                  label: 'Position actuelle',
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
                    child: storesAsync.when(
                      data: (stores) => stores.isEmpty
                          ? const Center(
                              child: Text('Aucun commerce a proximite'))
                          : ListView.separated(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.md,
                              ),
                              itemCount: stores.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(width: AppSpacing.sm),
                              itemBuilder: (context, index) {
                                final store = stores[index];
                                final dist = calculateDistanceKm(
                                  lat1: userLocation.latitude,
                                  lon1: userLocation.longitude,
                                  lat2: store.latitude,
                                  lon2: store.longitude,
                                );
                                return StoreCard(
                                  storeId: store.id,
                                  storeName: store.name,
                                  category: store.category,
                                  distanceKm: dist,
                                  rating: store.rating,
                                  basketCount: store.basketCount,
                                  imageUrl: store.imageUrl,
                                  onTap: () => context.goNamed(
                                    RouteNames.storeDetail,
                                    pathParameters: {'storeId': store.id},
                                  ),
                                );
                              },
                            ),
                      loading: () => const Center(
                        child: CircularProgressIndicator(
                            color: AppColors.green700),
                      ),
                      error: (e, _) => Center(
                        child: Text('Erreur : $e'),
                      ),
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
                    child: basketsAsync.when(
                      data: (baskets) => baskets.isEmpty
                          ? const Center(
                              child:
                                  Text('Aucun panier disponible pour le moment'))
                          : ListView.separated(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.md,
                              ),
                              itemCount: baskets.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(width: AppSpacing.sm),
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
                      loading: () => const Center(
                        child: CircularProgressIndicator(
                            color: AppColors.green700),
                      ),
                      error: (e, _) => Center(
                        child: Text('Erreur : $e'),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                ],
              ),
            ),
          ],
        ),
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
