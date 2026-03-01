import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../core/router/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/status_badge.dart';
import '../providers/reservations_provider.dart';

class ReservationDetailScreen extends ConsumerWidget {
  const ReservationDetailScreen({super.key, required this.reservationId});

  final String reservationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reservations = ref.watch(reservationsProvider);
    final reservation = reservations.firstWhere(
      (r) => r.id == reservationId,
      orElse: () => reservations.first,
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Detail de la reservation'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status & summary
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
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Reservation #${reservation.id.toUpperCase()}',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      StatusBadge.reservationStatus(reservation.status),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  const Divider(),
                  const SizedBox(height: AppSpacing.md),
                  _DetailRow(
                    icon: Icons.shopping_bag_outlined,
                    label: 'Panier',
                    value: reservation.basketTitle,
                  ),
                  _DetailRow(
                    icon: Icons.store_outlined,
                    label: 'Commerce',
                    value: reservation.storeName,
                  ),
                  _DetailRow(
                    icon: Icons.person_outline,
                    label: 'Client',
                    value: reservation.consumerAlias,
                  ),
                  _DetailRow(
                    icon: Icons.shopping_cart_outlined,
                    label: 'Quantite',
                    value: '${reservation.quantity} panier(s)',
                  ),
                  _DetailRow(
                    icon: Icons.payments_outlined,
                    label: 'Montant total',
                    value: 'Rs ${reservation.totalAmount.toStringAsFixed(0)}',
                    valueColor: AppColors.green700,
                  ),
                  _DetailRow(
                    icon: Icons.schedule_outlined,
                    label: 'Reserve le',
                    value: _formatDateTime(reservation.reservedAt),
                  ),
                  if (reservation.pickupTime != null)
                    _DetailRow(
                      icon: Icons.check_circle_outline,
                      label: 'Retire le',
                      value: _formatDateTime(reservation.pickupTime!),
                    ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),

            // QR Code & PIN
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
                boxShadow: AppShadow.sm,
              ),
              child: Column(
                children: [
                  Text(
                    'Code de retrait',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      // QR Code
                      Semantics(
                        label:
                            'QR code de la reservation ${reservation.id}',
                        image: true,
                        child: QrImageView(
                          data: 'bienbon://pickup/${reservation.id}',
                          version: QrVersions.auto,
                          size: 120,
                          backgroundColor: AppColors.white,
                          eyeStyle: const QrEyeStyle(
                            eyeShape: QrEyeShape.square,
                            color: AppColors.green900,
                          ),
                          dataModuleStyle: const QrDataModuleStyle(
                            dataModuleShape: QrDataModuleShape.square,
                            color: AppColors.green900,
                          ),
                        ),
                      ),
                      // Divider
                      Container(
                        width: 1,
                        height: 80,
                        color: AppColors.divider,
                      ),
                      // PIN
                      Column(
                        children: [
                          Text(
                            'PIN',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Semantics(
                            label:
                                'PIN de retrait: ${reservation.pickupCode}',
                            child: Text(
                              reservation.pickupCode,
                              style: Theme.of(context)
                                  .textTheme
                                  .displayLarge
                                  ?.copyWith(
                                    fontSize: 36,
                                    color: AppColors.green900,
                                    letterSpacing: 8,
                                  ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Validate button (only for non-picked-up reservations)
            if (reservation.status == ReservationStatus.confirmed ||
                reservation.status == ReservationStatus.ready)
              Semantics(
                label: 'Valider ce retrait',
                button: true,
                child: ElevatedButton.icon(
                  onPressed: () => context.goNamed(RouteNames.pickupScan),
                  icon: const Icon(Icons.qr_code_scanner),
                  label: const Text('Valider le retrait'),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _formatDateTime(DateTime dt) {
    final date =
        '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    final time =
        '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    return '$date a $time';
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
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Semantics(
        label: '$label: $value',
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: AppColors.textSecondary),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              flex: 2,
              child: Text(
                label,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            Expanded(
              flex: 3,
              child: Text(
                value,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: valueColor,
                    ),
                textAlign: TextAlign.end,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
