import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';

class PickupConfirmationScreen extends ConsumerWidget {
  const PickupConfirmationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),

              // Success icon with animation
              Semantics(
                label: 'Retrait confirme avec succes',
                child: Container(
                  width: 120,
                  height: 120,
                  margin: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xl,
                  ),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppColors.green100,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle_rounded,
                    color: AppColors.green700,
                    size: 72,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              Text(
                'Retrait confirme !',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      color: AppColors.green700,
                    ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Le retrait a ete valide avec succes.\nLe client peut repartir avec son panier.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.textSecondary,
                    ),
              ),
              const SizedBox(height: AppSpacing.xl),

              // Summary card
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(AppRadius.card),
                  boxShadow: AppShadow.sm,
                ),
                child: Column(
                  children: [
                    _SummaryRow(
                      icon: Icons.shopping_bag_outlined,
                      label: 'Panier',
                      value: 'Panier Surprise du Matin',
                    ),
                    const Divider(),
                    _SummaryRow(
                      icon: Icons.person_outline,
                      label: 'Client',
                      value: 'Client A***',
                    ),
                    const Divider(),
                    _SummaryRow(
                      icon: Icons.euro_outlined,
                      label: 'Montant',
                      value: 'Rs 150',
                    ),
                    const Divider(),
                    _SummaryRow(
                      icon: Icons.schedule_outlined,
                      label: 'Heure',
                      value: _formatNow(),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Actions
              ElevatedButton.icon(
                onPressed: () => context.goNamed(RouteNames.pickupScan),
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Scanner un autre retrait'),
              ),
              const SizedBox(height: AppSpacing.md),
              OutlinedButton(
                onPressed: () => context.goNamed(RouteNames.dashboard),
                child: const Text('Retour au tableau de bord'),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        ),
      ),
    );
  }

  String _formatNow() {
    final now = DateTime.now();
    final h = now.hour.toString().padLeft(2, '0');
    final m = now.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$label: $value',
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        child: Row(
          children: [
            Icon(icon, size: 18, color: AppColors.textSecondary),
            const SizedBox(width: AppSpacing.sm),
            Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const Spacer(),
            Text(
              value,
              style: Theme.of(context).textTheme.labelLarge,
            ),
          ],
        ),
      ),
    );
  }
}
