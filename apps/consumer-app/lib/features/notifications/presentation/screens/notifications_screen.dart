import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/notification_item.dart';
import '../../providers/notifications_provider.dart';

/// Notification center (US-C062).
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final notificationsAsync = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        leading: Semantics(
          button: true,
          label: 'Retour',
          child: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        actions: [
          Semantics(
            button: true,
            label: 'Tout marquer comme lu',
            child: TextButton(
              onPressed: () =>
                  ref.read(notificationsProvider.notifier).markAllAsRead(),
              child: const Text('Tout lire'),
            ),
          ),
        ],
      ),
      body: notificationsAsync.when(
        data: (items) {
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.notifications_none,
                        size: 72, color: AppColors.neutral200),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      'Aucune notification',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Vos notifications apparaitront ici.',
                      style: theme.textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => ref.read(notificationsProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: items.length,
              separatorBuilder: (_, __) =>
                  const SizedBox(height: AppSpacing.xs),
              itemBuilder: (context, index) {
                final item = items[index];
                return _NotificationTile(
                  item: item,
                  onTap: () {
                    ref
                        .read(notificationsProvider.notifier)
                        .markAsRead(item.id);
                    _navigateToTarget(context, item);
                  },
                );
              },
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
              Semantics(
                button: true,
                label: 'Reessayer',
                child: ElevatedButton(
                  onPressed: () =>
                      ref.read(notificationsProvider.notifier).refresh(),
                  child: const Text('Reessayer'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _navigateToTarget(BuildContext context, NotificationItem item) {
    if (item.targetId == null) return;
    switch (item.type) {
      case NotificationType.reservationConfirmed:
      case NotificationType.pickupReminder:
      case NotificationType.cancelledByPartner:
      case NotificationType.noShow:
        context.goNamed(
          RouteNames.qrPickup,
          pathParameters: {'reservationId': item.targetId!},
        );
      case NotificationType.refundProcessed:
        context.goNamed(RouteNames.orders);
      case NotificationType.claimResolved:
        context.push('${RoutePaths.claims}/${item.targetId}');
      case NotificationType.badgeUnlocked:
        context.goNamed(RouteNames.gamification);
      case NotificationType.favoriteNewBasket:
        context.goNamed(
          RouteNames.basketDetail,
          pathParameters: {'basketId': item.targetId!},
        );
      case NotificationType.referralValidated:
        context.goNamed(RouteNames.gamification);
    }
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item, required this.onTap});

  final NotificationItem item;
  final VoidCallback onTap;

  IconData get _icon => switch (item.type) {
        NotificationType.favoriteNewBasket => Icons.shopping_basket,
        NotificationType.reservationConfirmed => Icons.check_circle,
        NotificationType.pickupReminder => Icons.access_time,
        NotificationType.cancelledByPartner => Icons.cancel,
        NotificationType.refundProcessed => Icons.account_balance_wallet,
        NotificationType.noShow => Icons.warning,
        NotificationType.claimResolved => Icons.gavel,
        NotificationType.badgeUnlocked => Icons.workspace_premium,
        NotificationType.referralValidated => Icons.people,
      };

  Color get _iconColor => switch (item.type) {
        NotificationType.cancelledByPartner ||
        NotificationType.noShow =>
          AppColors.error,
        NotificationType.refundProcessed => AppColors.orange600,
        _ => AppColors.green700,
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      button: true,
      label: '${item.title}, ${item.body}${item.isRead ? "" : ", non lu"}',
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: item.isRead ? AppColors.white : AppColors.green100,
            borderRadius: BorderRadius.circular(AppRadius.card),
            boxShadow: item.isRead ? null : AppShadow.sm,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: _iconColor.withAlpha(26),
                  borderRadius: BorderRadius.circular(AppRadius.button),
                ),
                child: Icon(_icon, color: _iconColor, size: 20),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight:
                            item.isRead ? FontWeight.w600 : FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.body,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      _formatDate(item.createdAt),
                      style: theme.textTheme.labelSmall,
                    ),
                  ],
                ),
              ),
              if (!item.isRead)
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.green700,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours}h';
    if (diff.inDays < 7) return 'Il y a ${diff.inDays} jour${diff.inDays > 1 ? "s" : ""}';
    return '${date.day}/${date.month}/${date.year}';
  }
}
