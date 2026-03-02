import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../orders/providers/reservations_provider.dart';

/// QR pickup screen (US-C039 to US-C044).
class QrPickupScreen extends ConsumerWidget {
  const QrPickupScreen({super.key, required this.reservationId});

  final String reservationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final reservationAsync = ref.watch(reservationByIdProvider(reservationId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mon QR de retrait'),
        leading: Semantics(
          button: true,
          label: 'Retour',
          child: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
      ),
      body: reservationAsync.when(
        data: (reservation) {
          final qrData =
              reservation.qrCodeData ?? 'bienbon://pickup/$reservationId';
          final pin = reservation.pinCode ?? '----';

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: AppSpacing.md),
                // Instructions
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.green100,
                    borderRadius: BorderRadius.circular(AppRadius.card),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline,
                          color: AppColors.green700),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          'Presentez ce QR code au commerce lors du retrait de votre panier.',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: AppColors.green900,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                // QR code
                Semantics(
                  label:
                      'QR code de retrait pour la reservation $reservationId',
                  image: true,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(AppRadius.card),
                        boxShadow: AppShadow.md,
                      ),
                      child: QrImageView(
                        data: qrData,
                        version: QrVersions.auto,
                        size: 240,
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
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                // PIN display
                Center(
                  child: Column(
                    children: [
                      Text(
                        'Code PIN de secours',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Semantics(
                        label: 'Code PIN $pin',
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.xl,
                            vertical: AppSpacing.md,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.neutral50,
                            borderRadius:
                                BorderRadius.circular(AppRadius.card),
                            border: Border.all(color: AppColors.divider),
                          ),
                          child: Text(
                            pin.split('').join('  '),
                            style: theme.textTheme.displayLarge?.copyWith(
                              letterSpacing: 8,
                              fontWeight: FontWeight.w800,
                              color: AppColors.green900,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                // Store info
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
                      Text('Details du retrait',
                          style: theme.textTheme.headlineMedium),
                      const SizedBox(height: AppSpacing.md),
                      _InfoRow(
                        icon: Icons.storefront,
                        label: 'Commerce',
                        value: reservation.storeName,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      _InfoRow(
                        icon: Icons.location_on,
                        label: 'Adresse',
                        value: reservation.storeAddress,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      _InfoRow(
                        icon: Icons.access_time,
                        label: 'Creneau',
                        value: reservation.pickupWindow,
                        valueColor: AppColors.orange600,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                // GPS navigation button (US-C044)
                if (reservation.storeLatitude != null &&
                    reservation.storeLongitude != null)
                  Semantics(
                    button: true,
                    label: 'Ouvrir la navigation GPS vers le commerce',
                    child: OutlinedButton.icon(
                      onPressed: () {
                        final url =
                            'https://www.google.com/maps/dir/?api=1&destination=${reservation.storeLatitude},${reservation.storeLongitude}';
                        launchUrl(Uri.parse(url),
                            mode: LaunchMode.externalApplication);
                      },
                      icon: const Icon(Icons.directions),
                      label: const Text('Itineraire GPS'),
                    ),
                  ),
                const SizedBox(height: AppSpacing.md),
                // Status chip
                Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: AppSpacing.sm,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.green100,
                      borderRadius: BorderRadius.circular(AppRadius.chip),
                      border: Border.all(color: AppColors.green500),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_circle,
                            color: AppColors.green700, size: 16),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          'Paiement confirme',
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: AppColors.green700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
              ],
            ),
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.green700),
        ),
        error: (e, _) => Center(child: Text('Erreur : $e')),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
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
        Icon(icon, size: 16, color: AppColors.textSecondary),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: '$label : ',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                TextSpan(
                  text: value,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: valueColor ?? AppColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
