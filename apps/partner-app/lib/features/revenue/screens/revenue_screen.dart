import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';

class _Payout {
  const _Payout({
    required this.month,
    required this.grossRevenue,
    required this.commission,
    required this.net,
    required this.status,
  });

  final String month;
  final double grossRevenue;
  final double commission;
  final double net;
  final String status;
}

final _payouts = [
  const _Payout(
    month: 'Fevrier 2026',
    grossRevenue: 18400,
    commission: 4600,
    net: 13800,
    status: 'Vire',
  ),
  const _Payout(
    month: 'Janvier 2026',
    grossRevenue: 21000,
    commission: 5250,
    net: 15750,
    status: 'Vire',
  ),
  const _Payout(
    month: 'Decembre 2025',
    grossRevenue: 15800,
    commission: 3950,
    net: 11850,
    status: 'Vire',
  ),
];

class RevenueScreen extends ConsumerWidget {
  const RevenueScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const currentGross = 4250.0;
    const currentCommission = currentGross * 0.25;
    const currentNet = currentGross - currentCommission;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mes reversements'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Current month hero card
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.green900, AppColors.green700],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(AppRadius.card),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Mars 2026 (en cours)',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.white.withValues(alpha: 0.8),
                        ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Semantics(
                    label: 'Chiffre affaires brut: Rs 4250',
                    child: Text(
                      'Rs ${currentGross.toStringAsFixed(0)}',
                      style: Theme.of(context)
                          .textTheme
                          .displayLarge
                          ?.copyWith(
                            color: AppColors.white,
                            fontSize: 36,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                  Text(
                    "Chiffre d'affaires brut",
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.white.withValues(alpha: 0.8),
                        ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  const Divider(color: Colors.white24),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      Expanded(
                        child: _RevenueMetric(
                          label: 'Commission BienBon (25%)',
                          value: 'Rs ${currentCommission.toStringAsFixed(0)}',
                          textColor:
                              AppColors.white.withValues(alpha: 0.8),
                        ),
                      ),
                      Container(
                        width: 1,
                        height: 40,
                        color: Colors.white24,
                      ),
                      Expanded(
                        child: _RevenueMetric(
                          label: 'Net partenaire',
                          value: 'Rs ${currentNet.toStringAsFixed(0)}',
                          textColor: AppColors.white,
                          isBold: true,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Commission explanation
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.orange100,
                borderRadius: BorderRadius.circular(AppRadius.card),
                border: Border.all(color: AppColors.orange100),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.info_outline,
                    color: AppColors.orange600,
                    size: 20,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Commission BienBon',
                          style: Theme.of(context)
                              .textTheme
                              .labelLarge
                              ?.copyWith(color: AppColors.orange600),
                        ),
                        Text(
                          'BienBon preleve 25% sur chaque vente pour couvrir '
                          'la plateforme, le paiement et le marketing. '
                          'Le reste vous est reverse mensuellement.',
                          style:
                              Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Stats this month
            Text(
              'Ce mois-ci',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppSpacing.md),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: AppSpacing.md,
              mainAxisSpacing: AppSpacing.md,
              childAspectRatio: 1.4,
              children: const [
                _StatTile(
                  label: 'Ventes',
                  value: '28',
                  icon: Icons.receipt_outlined,
                  color: AppColors.green700,
                ),
                _StatTile(
                  label: 'Paniers vendus',
                  value: '31',
                  icon: Icons.shopping_bag_outlined,
                  color: AppColors.green700,
                ),
                _StatTile(
                  label: 'Ticket moyen',
                  value: 'Rs 152',
                  icon: Icons.trending_up,
                  color: AppColors.orange600,
                ),
                _StatTile(
                  label: 'Taux de retrait',
                  value: '96%',
                  icon: Icons.check_circle_outline,
                  color: AppColors.green700,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),

            // Past payouts
            Text(
              'Historique des reversements',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: AppSpacing.md),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _payouts.length,
              separatorBuilder: (_, _) =>
                  const SizedBox(height: AppSpacing.md),
              itemBuilder: (context, index) {
                return _PayoutCard(payout: _payouts[index]);
              },
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      ),
    );
  }
}

class _RevenueMetric extends StatelessWidget {
  const _RevenueMetric({
    required this.label,
    required this.value,
    required this.textColor,
    this.isBold = false,
  });

  final String label;
  final String value;
  final Color textColor;
  final bool isBold;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: $value',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                    color: textColor,
                    fontWeight:
                        isBold ? FontWeight.w800 : FontWeight.w600,
                  ),
              textAlign: TextAlign.center,
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: textColor,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: $value',
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(AppRadius.card),
          boxShadow: AppShadow.sm,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: color, size: 20),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                        color: color,
                        fontWeight: FontWeight.w800,
                      ),
                ),
                Text(
                  label,
                  style: Theme.of(context).textTheme.bodyMedium,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PayoutCard extends StatelessWidget {
  const _PayoutCard({required this.payout});

  final _Payout payout;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label:
          '${payout.month}: net Rs ${payout.net.toStringAsFixed(0)} — ${payout.status}',
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
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  payout.month,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: AppSpacing.xs,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.green100,
                    borderRadius: BorderRadius.circular(AppRadius.chip),
                  ),
                  child: Text(
                    payout.status,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.green700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            const Divider(),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: _PayoutRow(
                    label: 'Brut',
                    value: 'Rs ${payout.grossRevenue.toStringAsFixed(0)}',
                    color: AppColors.textPrimary,
                  ),
                ),
                Expanded(
                  child: _PayoutRow(
                    label: 'Commission',
                    value: '-Rs ${payout.commission.toStringAsFixed(0)}',
                    color: AppColors.orange600,
                  ),
                ),
                Expanded(
                  child: _PayoutRow(
                    label: 'Net',
                    value: 'Rs ${payout.net.toStringAsFixed(0)}',
                    color: AppColors.green700,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PayoutRow extends StatelessWidget {
  const _PayoutRow({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium,
          textAlign: TextAlign.center,
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: color,
              ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
