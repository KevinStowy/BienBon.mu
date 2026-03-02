import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/reservation.dart';
import '../../providers/reservations_provider.dart';

/// Orders screen with Active/History tabs (US-C028, US-C029).
class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen>
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
    final activeAsync = ref.watch(activeReservationsProvider);
    final historyAsync = ref.watch(historyReservationsProvider);

    final activeCount = activeAsync.valueOrNull?.length ?? 0;

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
                label: 'Commandes en cours, $activeCount',
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('En cours'),
                    if (activeCount > 0) ...[
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
                          '$activeCount',
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
          // Active tab
          _ReservationList(
            asyncList: activeAsync,
            emptyIcon: Icons.receipt_long_outlined,
            emptyTitle: 'Aucune commande en cours',
            emptySubtitle: 'Reservez un panier pour commencer !',
            emptyAction: 'Explorer les paniers',
            onEmptyAction: () => context.goNamed(RouteNames.explore),
            isActive: true,
          ),
          // History tab
          _ReservationList(
            asyncList: historyAsync,
            emptyIcon: Icons.history,
            emptyTitle: 'Aucun historique',
            emptySubtitle: 'Vos paniers passes apparaitront ici.',
            isActive: false,
          ),
        ],
      ),
    );
  }
}

class _ReservationList extends StatelessWidget {
  const _ReservationList({
    required this.asyncList,
    required this.emptyIcon,
    required this.emptyTitle,
    required this.emptySubtitle,
    required this.isActive,
    this.emptyAction,
    this.onEmptyAction,
  });

  final AsyncValue<List<Reservation>> asyncList;
  final IconData emptyIcon;
  final String emptyTitle;
  final String emptySubtitle;
  final bool isActive;
  final String? emptyAction;
  final VoidCallback? onEmptyAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return asyncList.when(
      data: (reservations) {
        if (reservations.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(emptyIcon, size: 72, color: AppColors.neutral200),
                  const SizedBox(height: AppSpacing.md),
                  Text(emptyTitle,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                      textAlign: TextAlign.center),
                  const SizedBox(height: AppSpacing.xs),
                  Text(emptySubtitle,
                      style: theme.textTheme.bodyMedium,
                      textAlign: TextAlign.center),
                  if (emptyAction != null && onEmptyAction != null) ...[
                    const SizedBox(height: AppSpacing.lg),
                    Semantics(
                      button: true,
                      label: emptyAction,
                      child: ElevatedButton(
                        onPressed: onEmptyAction,
                        child: Text(emptyAction!),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.all(AppSpacing.md),
          itemCount: reservations.length,
          itemBuilder: (context, index) {
            final res = reservations[index];
            return _OrderCard(
              reservation: res,
              isActive: isActive,
              onTap: isActive
                  ? () => context.goNamed(
                        RouteNames.qrPickup,
                        pathParameters: {'reservationId': res.id},
                      )
                  : null,
              onRate: res.canRate
                  ? () => context.pushNamed(
                        RouteNames.review,
                        pathParameters: {'reservationId': res.id},
                      )
                  : null,
              onClaim: res.canClaim
                  ? () => context.pushNamed(
                        RouteNames.newClaim,
                        pathParameters: {'reservationId': res.id},
                      )
                  : null,
            );
          },
        );
      },
      loading: () => const Center(
        child: CircularProgressIndicator(color: AppColors.green700),
      ),
      error: (e, _) => Center(
        child: Text('Erreur : $e', style: theme.textTheme.bodyLarge),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.reservation,
    required this.isActive,
    this.onTap,
    this.onRate,
    this.onClaim,
  });

  final Reservation reservation;
  final bool isActive;
  final VoidCallback? onTap;
  final VoidCallback? onRate;
  final VoidCallback? onClaim;

  Color get _statusColor => switch (reservation.status) {
        ReservationStatus.reserved ||
        ReservationStatus.slotActive =>
          AppColors.green700,
        ReservationStatus.pickedUp => AppColors.textSecondary,
        ReservationStatus.noShow => AppColors.error,
        ReservationStatus.cancelledByConsumer ||
        ReservationStatus.cancelledByPartner =>
          AppColors.error,
      };

  String get _statusLabel => switch (reservation.status) {
        ReservationStatus.reserved => 'Reserve',
        ReservationStatus.slotActive => 'En cours',
        ReservationStatus.pickedUp => 'Retire',
        ReservationStatus.noShow => 'Non retire',
        ReservationStatus.cancelledByConsumer => 'Annule',
        ReservationStatus.cancelledByPartner => 'Annule par le commerce',
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      button: onTap != null,
      label:
          '${reservation.basketTitle} chez ${reservation.storeName}, ${reservation.totalPrice.toStringAsFixed(0)} MUR, statut : $_statusLabel',
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
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: isActive
                          ? AppColors.green100
                          : AppColors.neutral50,
                      borderRadius:
                          BorderRadius.circular(AppRadius.button),
                    ),
                    child: Icon(
                      Icons.shopping_basket,
                      color: isActive
                          ? AppColors.green700
                          : AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(reservation.basketTitle,
                            style: theme.textTheme.headlineMedium,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 2),
                        Text(reservation.storeName,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: AppColors.textSecondary,
                            )),
                        const SizedBox(height: AppSpacing.xs),
                        Row(
                          children: [
                            const Icon(Icons.access_time,
                                size: 12, color: AppColors.textSecondary),
                            const SizedBox(width: 2),
                            Expanded(
                              child: Text(
                                reservation.pickupWindow,
                                style:
                                    theme.textTheme.bodyMedium?.copyWith(
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
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${reservation.totalPrice.toStringAsFixed(0)} MUR',
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
                        const Icon(Icons.qr_code,
                            size: 16, color: AppColors.green700),
                      ],
                    ],
                  ),
                ],
              ),
              // Action buttons for history
              if (onRate != null || onClaim != null) ...[
                const SizedBox(height: AppSpacing.sm),
                const Divider(height: 1),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (onRate != null)
                      Semantics(
                        button: true,
                        label: 'Donner un avis',
                        child: TextButton.icon(
                          onPressed: onRate,
                          icon: const Icon(Icons.star_border, size: 16),
                          label: const Text('Avis'),
                        ),
                      ),
                    if (onClaim != null)
                      Semantics(
                        button: true,
                        label: 'Ouvrir une reclamation',
                        child: TextButton.icon(
                          onPressed: onClaim,
                          icon: const Icon(Icons.flag_outlined, size: 16),
                          label: const Text('Reclamer'),
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.orange600,
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
