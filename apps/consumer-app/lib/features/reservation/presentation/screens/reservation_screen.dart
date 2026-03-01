import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';

class ReservationScreen extends StatelessWidget {
  const ReservationScreen({super.key, required this.basketId});

  final String basketId;

  // Demo basket lookup
  static final _baskets = <String, _ReservationBasket>{
    'basket-001': _ReservationBasket(
      name: 'Panier Viennoiseries',
      storeName: 'Boulangerie Paul',
      address: '12 Rue de la Paix, Port-Louis',
      pickupWindow: '17:00 - 19:00',
      discountedPrice: 120,
      originalPrice: 350,
    ),
    'basket-002': _ReservationBasket(
      name: 'Panier Repas du Soir',
      storeName: 'Restaurant Chez Pierre',
      address: '45 Avenue du Commerce, Port-Louis',
      pickupWindow: '20:00 - 21:00',
      discountedPrice: 200,
      originalPrice: 600,
    ),
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final basket = _baskets[basketId] ??
        _ReservationBasket(
          name: 'Panier Surprise',
          storeName: 'Commerce BienBon',
          address: 'Port-Louis',
          pickupWindow: '17:00 - 19:00',
          discountedPrice: 99,
          originalPrice: 300,
        );

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Recapitulatif'),
        leading: Semantics(
          button: true,
          label: 'Retour',
          child: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: AppSpacing.md),
            // Success header
            Semantics(
              label: 'Recapitulatif de votre reservation',
              child: Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.green100,
                  borderRadius: BorderRadius.circular(AppRadius.card),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.shopping_basket,
                      color: AppColors.green700,
                      size: 40,
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            basket.name,
                            style: theme.textTheme.headlineLarge,
                          ),
                          Text(
                            basket.storeName,
                            style: theme.textTheme.bodyLarge?.copyWith(
                              color: AppColors.green700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            // Details card
            Container(
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
                boxShadow: AppShadow.sm,
              ),
              child: Column(
                children: [
                  _DetailRow(
                    icon: Icons.storefront,
                    label: 'Commerce',
                    value: basket.storeName,
                  ),
                  const Divider(height: 1),
                  _DetailRow(
                    icon: Icons.location_on,
                    label: 'Adresse',
                    value: basket.address,
                  ),
                  const Divider(height: 1),
                  _DetailRow(
                    icon: Icons.access_time,
                    label: 'Creneau de retrait',
                    value: basket.pickupWindow,
                    valueColor: AppColors.orange600,
                  ),
                  const Divider(height: 1),
                  _DetailRow(
                    icon: Icons.confirmation_number,
                    label: 'Quantite',
                    value: '1 panier',
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            // Price summary
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
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Prix original',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      Text(
                        '${basket.originalPrice.toStringAsFixed(0)} MUR',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          decoration: TextDecoration.lineThrough,
                          color: AppColors.textDisabled,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Remise BienBon',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: AppColors.green700,
                        ),
                      ),
                      Text(
                        '-${(basket.originalPrice - basket.discountedPrice).toStringAsFixed(0)} MUR',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: AppColors.green700,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: AppSpacing.md),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total a payer',
                        style: theme.textTheme.headlineLarge,
                      ),
                      Text(
                        '${basket.discountedPrice.toStringAsFixed(0)} MUR',
                        style: theme.textTheme.headlineLarge?.copyWith(
                          color: AppColors.green700,
                          fontSize: 20,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            // Info box
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.orange100,
                borderRadius: BorderRadius.circular(AppRadius.card),
                border: Border.all(color: AppColors.orange500),
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
                    child: Text(
                      'Votre reservation sera confirmee apres le paiement. Vous recevrez un QR code pour le retrait.',
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: AppColors.orange600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            // Confirm button
            Semantics(
              button: true,
              label: 'Confirmer et payer ${basket.discountedPrice.toStringAsFixed(0)} MUR',
              child: ElevatedButton(
                onPressed: () => context.goNamed(
                  RouteNames.payment,
                  pathParameters: {'reservationId': 'res-$basketId'},
                ),
                child: Text(
                  'Confirmer et payer ${basket.discountedPrice.toStringAsFixed(0)} MUR',
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Semantics(
              button: true,
              label: 'Annuler',
              child: OutlinedButton(
                onPressed: () => context.pop(),
                child: const Text('Annuler'),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
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

    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.textSecondary),
          const SizedBox(width: AppSpacing.md),
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
      ),
    );
  }
}

class _ReservationBasket {
  const _ReservationBasket({
    required this.name,
    required this.storeName,
    required this.address,
    required this.pickupWindow,
    required this.discountedPrice,
    required this.originalPrice,
  });

  final String name;
  final String storeName;
  final String address;
  final String pickupWindow;
  final double discountedPrice;
  final double originalPrice;
}
