import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';

enum _OrderStatus { active, completed, cancelled }

class _Order {
  const _Order({
    required this.id,
    required this.basketName,
    required this.storeName,
    required this.pickupWindow,
    required this.price,
    required this.status,
    required this.date,
  });

  final String id;
  final String basketName;
  final String storeName;
  final String pickupWindow;
  final double price;
  final _OrderStatus status;
  final String date;
}

final _activeOrders = [
  _Order(
    id: 'res-basket-001',
    basketName: 'Panier Viennoiseries',
    storeName: 'Boulangerie Paul',
    pickupWindow: 'Aujourd\'hui, 17:00 - 19:00',
    price: 120,
    status: _OrderStatus.active,
    date: '01/03/2026',
  ),
];

final _historyOrders = [
  _Order(
    id: 'res-basket-hist-001',
    basketName: 'Panier Repas du Soir',
    storeName: 'Restaurant Chez Pierre',
    pickupWindow: '28/02/2026, 20:00 - 21:00',
    price: 200,
    status: _OrderStatus.completed,
    date: '28/02/2026',
  ),
  _Order(
    id: 'res-basket-hist-002',
    basketName: 'Panier Epicerie',
    storeName: 'Super U Port-Louis',
    pickupWindow: '25/02/2026, 18:00 - 20:00',
    price: 280,
    status: _OrderStatus.completed,
    date: '25/02/2026',
  ),
  _Order(
    id: 'res-basket-hist-003',
    basketName: 'Panier Cafe',
    storeName: 'Cafe Creole',
    pickupWindow: '20/02/2026, 08:00 - 10:00',
    price: 90,
    status: _OrderStatus.cancelled,
    date: '20/02/2026',
  ),
];

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Mes commandes', style: theme.textTheme.headlineLarge),
        backgroundColor: AppColors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.green700,
          labelColor: AppColors.green700,
          unselectedLabelColor: AppColors.textSecondary,
          labelStyle: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
          tabs: [
            Tab(
              child: Semantics(
                label: 'Commandes en cours, ${_activeOrders.length}',
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('En cours'),
                    if (_activeOrders.isNotEmpty) ...[
                      const SizedBox(width: AppSpacing.xs),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.green700,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${_activeOrders.length}',
                          style: const TextStyle(
                            color: AppColors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const Tab(text: 'Historique'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Active orders tab
          _activeOrders.isEmpty
              ? _EmptyState(
                  icon: Icons.receipt_long_outlined,
                  title: 'Aucune commande en cours',
                  subtitle: 'Reservez un panier pour commencer !',
                  actionLabel: 'Explorer les paniers',
                  onAction: () =>
                      context.goNamed(RouteNames.explore),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  itemCount: _activeOrders.length,
                  itemBuilder: (context, index) {
                    return _OrderCard(
                      order: _activeOrders[index],
                      onTap: () => context.goNamed(
                        RouteNames.qrPickup,
                        pathParameters: {
                          'reservationId': _activeOrders[index].id,
                        },
                      ),
                    );
                  },
                ),
          // History tab
          _historyOrders.isEmpty
              ? const _EmptyState(
                  icon: Icons.history,
                  title: 'Aucun historique',
                  subtitle: 'Vos paniers passes apparaitront ici.',
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  itemCount: _historyOrders.length,
                  itemBuilder: (context, index) {
                    return _OrderCard(order: _historyOrders[index]);
                  },
                ),
        ],
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order, this.onTap});

  final _Order order;
  final VoidCallback? onTap;

  Color get _statusColor {
    return switch (order.status) {
      _OrderStatus.active => AppColors.green700,
      _OrderStatus.completed => AppColors.textSecondary,
      _OrderStatus.cancelled => AppColors.error,
    };
  }

  String get _statusLabel {
    return switch (order.status) {
      _OrderStatus.active => 'En cours',
      _OrderStatus.completed => 'Retire',
      _OrderStatus.cancelled => 'Annule',
    };
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      button: onTap != null,
      label:
          '${order.basketName} chez ${order.storeName}, ${order.price.toStringAsFixed(0)} MUR, statut : $_statusLabel',
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.only(bottom: AppSpacing.sm),
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(AppRadius.card),
            boxShadow: AppShadow.sm,
          ),
          child: Row(
            children: [
              // Basket icon
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: order.status == _OrderStatus.active
                      ? AppColors.green100
                      : AppColors.neutral50,
                  borderRadius: BorderRadius.circular(AppRadius.button),
                ),
                child: Icon(
                  Icons.shopping_basket,
                  color: order.status == _OrderStatus.active
                      ? AppColors.green700
                      : AppColors.textSecondary,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.basketName,
                      style: theme.textTheme.headlineMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      order.storeName,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: [
                        const Icon(
                          Icons.access_time,
                          size: 12,
                          color: AppColors.textSecondary,
                        ),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(
                            order.pickupWindow,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              // Price + status
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${order.price.toStringAsFixed(0)} MUR',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      color: AppColors.green700,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: _statusColor.withAlpha(26),
                      borderRadius:
                          BorderRadius.circular(AppRadius.chip),
                    ),
                    child: Text(
                      _statusLabel,
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: _statusColor,
                        fontSize: 10,
                      ),
                    ),
                  ),
                  if (onTap != null) ...[
                    const SizedBox(height: AppSpacing.xs),
                    const Icon(
                      Icons.qr_code,
                      size: 16,
                      color: AppColors.green700,
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 72, color: AppColors.neutral200),
            const SizedBox(height: AppSpacing.md),
            Text(
              title,
              style: theme.textTheme.headlineMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              subtitle,
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: AppSpacing.lg),
              Semantics(
                button: true,
                label: actionLabel,
                child: ElevatedButton(
                  onPressed: onAction,
                  child: Text(actionLabel!),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
