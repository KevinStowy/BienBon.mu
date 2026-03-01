import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/basket_card_partner.dart';
import '../../../shared/widgets/status_badge.dart';
import 'stores_list_screen.dart';

final _demoBaskets = [
  BasketModel(
    id: 'basket-001',
    title: 'Panier Surprise du Matin',
    originalPrice: 350,
    discountedPrice: 150,
    stock: 3,
    totalStock: 5,
    status: BasketStatus.published,
    storeId: 'store-001',
    storeName: 'Boulangerie Le Croissant',
    category: 'Boulangerie',
    pickupStart: DateTime.now().copyWith(hour: 18),
    pickupEnd: DateTime.now().copyWith(hour: 20),
  ),
  BasketModel(
    id: 'basket-002',
    title: 'Corbeille Viennoiseries',
    originalPrice: 500,
    discountedPrice: 200,
    stock: 0,
    totalStock: 4,
    status: BasketStatus.soldOut,
    storeId: 'store-001',
    storeName: 'Boulangerie Le Croissant',
    category: 'Patisserie',
  ),
  BasketModel(
    id: 'basket-003',
    title: 'Box Sandwich & Boissons',
    originalPrice: 600,
    discountedPrice: 250,
    stock: 2,
    totalStock: 2,
    status: BasketStatus.draft,
    storeId: 'store-001',
    storeName: 'Boulangerie Le Croissant',
    category: 'Traiteur',
  ),
];

class StoreDetailScreen extends ConsumerWidget {
  const StoreDetailScreen({super.key, required this.storeId});

  final String storeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Demo: always show store-001 data
    const store = StoreModel(
      id: 'store-001',
      name: 'Boulangerie Le Croissant',
      address: '12 Rue des Fleurs, Port-Louis',
      status: StoreStatus.active,
      totalBaskets: 8,
      activeBaskets: 3,
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Detail du commerce'),
        actions: [
          Semantics(
            label: 'Modifier le commerce',
            button: true,
            child: IconButton(
              icon: const Icon(Icons.edit_outlined),
              onPressed: () {},
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.goNamed(RouteNames.basketCreate),
        backgroundColor: AppColors.green700,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('Nouveau panier'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Store info card
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
                  Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppColors.green100,
                          borderRadius: BorderRadius.circular(AppRadius.card),
                        ),
                        child: const Icon(
                          Icons.store_rounded,
                          color: AppColors.green700,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              store.name,
                              style:
                                  Theme.of(context).textTheme.headlineLarge,
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            StatusBadge.storeStatus(store.status),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  const Divider(),
                  const SizedBox(height: AppSpacing.md),
                  _InfoRow(
                    icon: Icons.location_on_outlined,
                    label: store.address,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  _InfoRow(
                    icon: Icons.access_time_outlined,
                    label: 'Lun–Sam: 7h00–19h00',
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  _InfoRow(
                    icon: Icons.phone_outlined,
                    label: '+230 5701 2345',
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Baskets section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Paniers (${_demoBaskets.length})',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _demoBaskets.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
              itemBuilder: (context, index) {
                final basket = _demoBaskets[index];
                return BasketCardPartner(
                  basket: basket,
                  onTap: () => context.goNamed(
                    RouteNames.basketDetail,
                    pathParameters: {'basketId': basket.id},
                  ),
                );
              },
            ),
            const SizedBox(height: AppSpacing.xxl),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.textSecondary),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ),
      ],
    );
  }
}
