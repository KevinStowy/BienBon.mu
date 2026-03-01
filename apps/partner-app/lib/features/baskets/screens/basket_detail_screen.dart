import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/reservation_card.dart';
import '../../../shared/widgets/status_badge.dart';
import '../providers/baskets_provider.dart';

final _demoReservations = [
  ReservationModel(
    id: 'res-001',
    basketTitle: 'Panier Surprise du Matin',
    storeName: 'Boulangerie Le Croissant',
    consumerAlias: 'Client A***',
    quantity: 1,
    totalAmount: 150,
    status: ReservationStatus.confirmed,
    reservedAt: DateTime.now().subtract(const Duration(hours: 2)),
    pickupCode: '4821',
  ),
  ReservationModel(
    id: 'res-002',
    basketTitle: 'Panier Surprise du Matin',
    storeName: 'Boulangerie Le Croissant',
    consumerAlias: 'Client B***',
    quantity: 1,
    totalAmount: 150,
    status: ReservationStatus.ready,
    reservedAt: DateTime.now().subtract(const Duration(hours: 1)),
    pickupCode: '7634',
  ),
];

class BasketDetailScreen extends ConsumerWidget {
  const BasketDetailScreen({super.key, required this.basketId});

  final String basketId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final baskets = ref.watch(partnersBasketListProvider);
    final basket = baskets.firstWhere(
      (b) => b.id == basketId,
      orElse: () => baskets.first,
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(basket.title, overflow: TextOverflow.ellipsis),
        actions: [
          Semantics(
            label: 'Modifier ce panier',
            button: true,
            child: IconButton(
              icon: const Icon(Icons.edit_outlined),
              onPressed: () => context.goNamed(
                RouteNames.basketEdit,
                pathParameters: {'basketId': basketId},
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status & publish toggle
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
                boxShadow: AppShadow.sm,
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Statut du panier',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            StatusBadge.basketStatus(basket.status),
                          ],
                        ),
                      ),
                      // Publish toggle
                      if (basket.status != BasketStatus.soldOut)
                        Semantics(
                          label: basket.status == BasketStatus.published
                              ? 'Retirer de la vente'
                              : 'Publier le panier',
                          button: true,
                          child: ElevatedButton(
                            onPressed: () => ref
                                .read(partnersBasketListProvider.notifier)
                                .toggleStatus(basketId),
                            style: ElevatedButton.styleFrom(
                              backgroundColor:
                                  basket.status == BasketStatus.published
                                      ? AppColors.orange600
                                      : AppColors.green700,
                              minimumSize: const Size(100, 40),
                            ),
                            child: Text(
                              basket.status == BasketStatus.published
                                  ? 'Retirer'
                                  : 'Publier',
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Stock management
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
                boxShadow: AppShadow.sm,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Gestion du stock',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Semantics(
                        label: 'Reduire le stock',
                        button: true,
                        child: IconButton.outlined(
                          icon: const Icon(Icons.remove),
                          iconSize: 28,
                          onPressed: () => ref
                              .read(partnersBasketListProvider.notifier)
                              .adjustStock(basketId, -1),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xl),
                      Column(
                        children: [
                          Text(
                            '${basket.stock}',
                            style: Theme.of(context)
                                .textTheme
                                .displayLarge
                                ?.copyWith(
                                  color: AppColors.green700,
                                  fontSize: 40,
                                ),
                          ),
                          Text(
                            '/ ${basket.totalStock} au total',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                      const SizedBox(width: AppSpacing.xl),
                      Semantics(
                        label: 'Augmenter le stock',
                        button: true,
                        child: IconButton.outlined(
                          icon: const Icon(Icons.add),
                          iconSize: 28,
                          onPressed: () => ref
                              .read(partnersBasketListProvider.notifier)
                              .adjustStock(basketId, 1),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  // Stock progress bar
                  Semantics(
                    label:
                        'Stock: ${basket.stock} sur ${basket.totalStock}',
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: basket.totalStock > 0
                            ? basket.stock / basket.totalStock
                            : 0,
                        backgroundColor: AppColors.neutral200,
                        color: AppColors.green700,
                        minHeight: 8,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${basket.totalStock - basket.stock} reserves',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      TextButton(
                        onPressed: () => context.goNamed(
                          RouteNames.manageStock,
                          pathParameters: {'basketId': basketId},
                        ),
                        child: const Text('Ajustement rapide'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // Price info
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
                boxShadow: AppShadow.sm,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _PriceInfo(
                      label: 'Prix original',
                      value: 'Rs ${basket.originalPrice.toStringAsFixed(0)}',
                      color: AppColors.textSecondary,
                    ),
                  ),
                  Container(
                    width: 1,
                    height: 40,
                    color: AppColors.divider,
                  ),
                  Expanded(
                    child: _PriceInfo(
                      label: 'Prix reduit',
                      value:
                          'Rs ${basket.discountedPrice.toStringAsFixed(0)}',
                      color: AppColors.green700,
                    ),
                  ),
                  Container(
                    width: 1,
                    height: 40,
                    color: AppColors.divider,
                  ),
                  Expanded(
                    child: _PriceInfo(
                      label: 'Remise',
                      value:
                          '-${basket.discountPercent.toStringAsFixed(0)}%',
                      color: AppColors.orange600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Reservations
            Text(
              'Reservations (${_demoReservations.length})',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppSpacing.md),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _demoReservations.length,
              separatorBuilder: (context, index) =>
                  const SizedBox(height: AppSpacing.md),
              itemBuilder: (context, index) {
                return ReservationCard(
                  reservation: _demoReservations[index],
                  onTap: () => context.goNamed(
                    RouteNames.reservationDetail,
                    pathParameters: {
                      'reservationId': _demoReservations[index].id,
                    },
                  ),
                );
              },
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      ),
    );
  }
}

class _PriceInfo extends StatelessWidget {
  const _PriceInfo({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: $value',
      child: Column(
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: color,
                ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
