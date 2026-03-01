import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/status_badge.dart';

class StoreModel {
  const StoreModel({
    required this.id,
    required this.name,
    required this.address,
    required this.status,
    required this.totalBaskets,
    required this.activeBaskets,
  });

  final String id;
  final String name;
  final String address;
  final StoreStatus status;
  final int totalBaskets;
  final int activeBaskets;
}

final _demoStores = [
  const StoreModel(
    id: 'store-001',
    name: 'Boulangerie Le Croissant',
    address: '12 Rue des Fleurs, Port-Louis',
    status: StoreStatus.active,
    totalBaskets: 8,
    activeBaskets: 3,
  ),
  const StoreModel(
    id: 'store-002',
    name: 'Epicerie du Marche',
    address: '45 Avenue Victoria, Curepipe',
    status: StoreStatus.active,
    totalBaskets: 5,
    activeBaskets: 2,
  ),
  const StoreModel(
    id: 'store-003',
    name: 'Patisserie Belle Vue',
    address: '8 Rue Labourdonnais, Rose-Hill',
    status: StoreStatus.pending,
    totalBaskets: 0,
    activeBaskets: 0,
  ),
];

class StoresListScreen extends ConsumerWidget {
  const StoresListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mes commerces'),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(AppSpacing.md),
        itemCount: _demoStores.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
        itemBuilder: (context, index) {
          final store = _demoStores[index];
          return _StoreCard(
            store: store,
            onTap: () => context.goNamed(
              RouteNames.storeDetail,
              pathParameters: {'storeId': store.id},
            ),
          );
        },
      ),
    );
  }
}

class _StoreCard extends StatelessWidget {
  const _StoreCard({required this.store, this.onTap});

  final StoreModel store;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '${store.name}, ${store.address}',
      button: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.card),
        child: Container(
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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.green100,
                      borderRadius: BorderRadius.circular(AppRadius.card),
                    ),
                    child: const Icon(
                      Icons.store_rounded,
                      color: AppColors.green700,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          store.name,
                          style: Theme.of(context).textTheme.headlineMedium,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          store.address,
                          style: Theme.of(context).textTheme.bodyMedium,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  StatusBadge.storeStatus(store.status),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              const Divider(),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  _StoreStat(
                    icon: Icons.shopping_bag_outlined,
                    label: '${store.totalBaskets} paniers',
                  ),
                  const SizedBox(width: AppSpacing.lg),
                  _StoreStat(
                    icon: Icons.visibility_outlined,
                    label: '${store.activeBaskets} actifs',
                    color: AppColors.green700,
                  ),
                  const Spacer(),
                  const Icon(
                    Icons.chevron_right,
                    color: AppColors.textSecondary,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StoreStat extends StatelessWidget {
  const _StoreStat({
    required this.icon,
    required this.label,
    this.color = AppColors.textSecondary,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: color),
        ),
      ],
    );
  }
}
