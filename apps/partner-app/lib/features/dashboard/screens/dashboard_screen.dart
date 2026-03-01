import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../features/auth/providers/auth_provider.dart';
import '../../../shared/widgets/stat_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bonjour, ${auth.partnerName ?? 'Partenaire'}',
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            Text(
              "Tableau de bord d'aujourd'hui",
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
        actions: [
          Semantics(
            label: 'Notifications',
            button: true,
            child: IconButton(
              icon: const Icon(Icons.notifications_outlined),
              onPressed: () {},
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.green700,
        onRefresh: () async {
          await Future.delayed(const Duration(milliseconds: 600));
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Stats grid
              Text(
                "Statistiques du jour",
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: AppSpacing.md),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: AppSpacing.md,
                mainAxisSpacing: AppSpacing.md,
                childAspectRatio: 1.2,
                children: const [
                  StatCard(
                    label: 'Paniers publies',
                    value: '12',
                    icon: Icons.shopping_bag_outlined,
                    color: AppColors.green700,
                    backgroundColor: AppColors.green100,
                    trend: '+3',
                  ),
                  StatCard(
                    label: 'Reservations',
                    value: '8',
                    icon: Icons.bookmark_outlined,
                    color: AppColors.orange600,
                    backgroundColor: AppColors.orange100,
                    trend: '+2',
                  ),
                  StatCard(
                    label: 'Retraits valides',
                    value: '5',
                    icon: Icons.check_circle_outline,
                    color: AppColors.green900,
                    backgroundColor: AppColors.green100,
                  ),
                  StatCard(
                    label: "Chiffre d'affaires",
                    value: 'Rs 4 250',
                    icon: Icons.trending_up,
                    color: AppColors.green700,
                    backgroundColor: AppColors.green100,
                    trend: '+12%',
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),

              // Weekly chart placeholder
              _WeeklyChartPlaceholder(),
              const SizedBox(height: AppSpacing.lg),

              // Quick actions
              Text(
                'Actions rapides',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: _QuickActionCard(
                      icon: Icons.add_shopping_cart,
                      label: 'Creer un panier',
                      color: AppColors.green700,
                      backgroundColor: AppColors.green100,
                      onTap: () => context.goNamed(RouteNames.basketCreate),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: _QuickActionCard(
                      icon: Icons.qr_code_scanner,
                      label: 'Scanner un retrait',
                      color: AppColors.orange600,
                      backgroundColor: AppColors.orange100,
                      onTap: () => context.goNamed(RouteNames.pickupScan),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: _QuickActionCard(
                      icon: Icons.store_outlined,
                      label: 'Mes commerces',
                      color: AppColors.green900,
                      backgroundColor: AppColors.green100,
                      onTap: () => context.goNamed(RouteNames.storesList),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: _QuickActionCard(
                      icon: Icons.receipt_long_outlined,
                      label: 'Reservations',
                      color: AppColors.orange600,
                      backgroundColor: AppColors.orange100,
                      onTap: () => context.goNamed(RouteNames.reservations),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),

              // Recent activity
              _RecentActivitySection(),
              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }
}

class _WeeklyChartPlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 180,
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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Ventes cette semaine',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              Text(
                'Rs 18 400',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: AppColors.green700,
                    ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _Bar(height: 0.4, day: 'L'),
                _Bar(height: 0.6, day: 'M'),
                _Bar(height: 0.8, day: 'Me'),
                _Bar(height: 0.5, day: 'J'),
                _Bar(height: 0.9, day: 'V'),
                _Bar(height: 0.7, day: 'S'),
                _Bar(height: 0.3, day: 'D', isToday: true),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({
    required this.height,
    required this.day,
    this.isToday = false,
  });

  final double height;
  final String day;
  final bool isToday;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$day: ${(height * 100).toInt()}%',
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Container(
            width: 28,
            height: 90 * height,
            decoration: BoxDecoration(
              color: isToday ? AppColors.green700 : AppColors.green100,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(4),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            day,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: isToday
                      ? AppColors.green700
                      : AppColors.textSecondary,
                  fontWeight:
                      isToday ? FontWeight.w700 : FontWeight.normal,
                ),
          ),
        ],
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.backgroundColor,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final Color backgroundColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
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
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: backgroundColor,
                  borderRadius: BorderRadius.circular(AppRadius.card),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.labelLarge,
                  maxLines: 2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RecentActivitySection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Activite recente',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: AppSpacing.md),
        _ActivityItem(
          icon: Icons.check_circle,
          iconColor: AppColors.green700,
          title: 'Retrait valide',
          subtitle: 'Panier Surprise — Camille D.',
          time: 'il y a 14 min',
        ),
        const SizedBox(height: AppSpacing.sm),
        _ActivityItem(
          icon: Icons.bookmark_added,
          iconColor: AppColors.orange600,
          title: 'Nouvelle reservation',
          subtitle: 'Corbeille du Marche — Alex M.',
          time: 'il y a 32 min',
        ),
        const SizedBox(height: AppSpacing.sm),
        _ActivityItem(
          icon: Icons.shopping_bag,
          iconColor: AppColors.green700,
          title: 'Panier publie',
          subtitle: 'Delices du Matin — 5 disponibles',
          time: 'il y a 1h',
        ),
      ],
    );
  }
}

class _ActivityItem extends StatelessWidget {
  const _ActivityItem({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.time,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final String time;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$title: $subtitle — $time',
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(AppRadius.card),
          boxShadow: AppShadow.sm,
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppRadius.card),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Text(
              time,
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ],
        ),
      ),
    );
  }
}
