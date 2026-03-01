import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';

class ConfirmationScreen extends StatelessWidget {
  const ConfirmationScreen({super.key, required this.reservationId});

  final String reservationId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            children: [
              const Spacer(),
              // Success animation
              Semantics(
                label: 'Reservation confirmee avec succes',
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: const BoxDecoration(
                    color: AppColors.green100,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle,
                    size: 80,
                    color: AppColors.green700,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                'Reservation confirmee !',
                style: theme.textTheme.displayLarge?.copyWith(
                  color: AppColors.green900,
                  fontWeight: FontWeight.w800,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Votre panier est reserve.\nPresentez votre QR code au commerce lors du retrait.',
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: AppColors.textSecondary,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl),
              // Reservation details
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(AppRadius.card),
                  boxShadow: AppShadow.sm,
                ),
                child: Column(
                  children: [
                    _ConfirmationRow(
                      icon: Icons.confirmation_number,
                      label: 'N° de reservation',
                      value: reservationId.toUpperCase(),
                    ),
                    const Divider(height: AppSpacing.md),
                    _ConfirmationRow(
                      icon: Icons.shopping_basket,
                      label: 'Panier',
                      value: 'Panier Viennoiseries',
                    ),
                    const Divider(height: AppSpacing.md),
                    _ConfirmationRow(
                      icon: Icons.storefront,
                      label: 'Commerce',
                      value: 'Boulangerie Paul',
                    ),
                    const Divider(height: AppSpacing.md),
                    _ConfirmationRow(
                      icon: Icons.access_time,
                      label: 'Retrait',
                      value: '17:00 - 19:00',
                      valueColor: AppColors.orange600,
                    ),
                  ],
                ),
              ),
              const Spacer(),
              // Actions
              Semantics(
                button: true,
                label: 'Voir mon QR code de retrait',
                child: ElevatedButton.icon(
                  onPressed: () => context.goNamed(
                    RouteNames.qrPickup,
                    pathParameters: {'reservationId': reservationId},
                  ),
                  icon: const Icon(Icons.qr_code),
                  label: const Text('Voir mon QR code'),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Semantics(
                button: true,
                label: 'Retourner a l\'accueil',
                child: OutlinedButton(
                  onPressed: () => context.goNamed(RouteNames.home),
                  child: const Text("Retour a l'accueil"),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConfirmationRow extends StatelessWidget {
  const _ConfirmationRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.textSecondary),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              Text(
                value,
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: valueColor ?? AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
