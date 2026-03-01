import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';

class QrScannerScreen extends ConsumerStatefulWidget {
  const QrScannerScreen({super.key});

  @override
  ConsumerState<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends ConsumerState<QrScannerScreen> {
  final _pinController = TextEditingController();
  bool _showPinEntry = false;
  bool _isValidating = false;
  bool _scanned = false;

  // Demo reservation shown after scan
  final _demoReservation = _MockReservation(
    id: 'res-001',
    consumerAlias: 'Client A***',
    basketTitle: 'Panier Surprise du Matin',
    storeName: 'Boulangerie Le Croissant',
    quantity: 1,
    amount: 150.0,
    pickupCode: '4821',
  );

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  void _simulateScan() {
    setState(() => _scanned = true);
  }

  Future<void> _validatePickup() async {
    if (_pinController.text.isEmpty && !_scanned) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez scanner le QR ou saisir le PIN')),
      );
      return;
    }
    setState(() => _isValidating = true);
    await Future.delayed(const Duration(milliseconds: 800));
    if (mounted) {
      setState(() => _isValidating = false);
      context.goNamed(RouteNames.pickupConfirmation);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Valider un retrait'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Toggle: Scanner / PIN
            Container(
              decoration: BoxDecoration(
                color: AppColors.neutral200,
                borderRadius: BorderRadius.circular(AppRadius.button),
              ),
              padding: const EdgeInsets.all(4),
              child: Row(
                children: [
                  Expanded(
                    child: Semantics(
                      label: 'Scanner un QR code',
                      button: true,
                      selected: !_showPinEntry,
                      child: GestureDetector(
                        onTap: () =>
                            setState(() => _showPinEntry = false),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                            vertical: AppSpacing.sm,
                          ),
                          decoration: BoxDecoration(
                            color: !_showPinEntry
                                ? AppColors.white
                                : Colors.transparent,
                            borderRadius:
                                BorderRadius.circular(AppRadius.button - 2),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.qr_code_scanner,
                                size: 18,
                                color: !_showPinEntry
                                    ? AppColors.green700
                                    : AppColors.textSecondary,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Scanner QR',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: !_showPinEntry
                                      ? AppColors.green700
                                      : AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Semantics(
                      label: 'Saisir le PIN manuellement',
                      button: true,
                      selected: _showPinEntry,
                      child: GestureDetector(
                        onTap: () =>
                            setState(() => _showPinEntry = true),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                            vertical: AppSpacing.sm,
                          ),
                          decoration: BoxDecoration(
                            color: _showPinEntry
                                ? AppColors.white
                                : Colors.transparent,
                            borderRadius:
                                BorderRadius.circular(AppRadius.button - 2),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.pin_outlined,
                                size: 18,
                                color: _showPinEntry
                                    ? AppColors.green700
                                    : AppColors.textSecondary,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Saisir PIN',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: _showPinEntry
                                      ? AppColors.green700
                                      : AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            if (!_showPinEntry) ...[
              // Camera placeholder / scan area
              _CameraPlaceholder(
                scanned: _scanned,
                onSimulateScan: _simulateScan,
              ),
            ] else ...[
              // PIN entry
              _PinEntrySection(controller: _pinController),
            ],

            const SizedBox(height: AppSpacing.lg),

            // Reservation details (shown after scan or PIN entry)
            if (_scanned || _pinController.text.length == 4)
              _ReservationPreview(reservation: _demoReservation),

            const SizedBox(height: AppSpacing.lg),

            // Validate button
            Semantics(
              label: 'Valider le retrait',
              button: true,
              child: ElevatedButton(
                onPressed:
                    (_scanned || _pinController.text.isNotEmpty) &&
                            !_isValidating
                        ? _validatePickup
                        : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.green700,
                ),
                child: _isValidating
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.white,
                        ),
                      )
                    : const Text('Valider le retrait'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CameraPlaceholder extends StatelessWidget {
  const _CameraPlaceholder({
    required this.scanned,
    required this.onSimulateScan,
  });

  final bool scanned;
  final VoidCallback onSimulateScan;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 260,
      decoration: BoxDecoration(
        color: AppColors.neutral900,
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Scan frame
          Container(
            width: 180,
            height: 180,
            decoration: BoxDecoration(
              border: Border.all(
                color: scanned ? AppColors.green500 : AppColors.white,
                width: 2,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          if (scanned)
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.check_circle,
                  color: AppColors.green500,
                  size: 64,
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'QR scanne !',
                  style: TextStyle(
                    color: AppColors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ],
            )
          else
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.qr_code_scanner,
                  color: AppColors.white,
                  size: 40,
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Camera en attente...',
                  style: TextStyle(
                    color: AppColors.white.withValues(alpha: 0.7),
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Semantics(
                  label: 'Simuler un scan pour la demo',
                  button: true,
                  child: OutlinedButton(
                    onPressed: onSimulateScan,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.white,
                      side: const BorderSide(color: AppColors.white),
                    ),
                    child: const Text('Simuler scan (demo)'),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _PinEntrySection extends StatelessWidget {
  const _PinEntrySection({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Saisir le PIN du client',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: AppSpacing.md),
        Semantics(
          label: 'PIN a 4 chiffres',
          child: TextFormField(
            controller: controller,
            keyboardType: TextInputType.number,
            maxLength: 4,
            textAlign: TextAlign.center,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            style: Theme.of(context).textTheme.displayLarge?.copyWith(
                  letterSpacing: 12,
                  color: AppColors.green900,
                ),
            decoration: const InputDecoration(
              hintText: '0000',
              counterText: '',
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Le client doit vous communiquer son code PIN a 4 chiffres.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    );
  }
}

class _MockReservation {
  const _MockReservation({
    required this.id,
    required this.consumerAlias,
    required this.basketTitle,
    required this.storeName,
    required this.quantity,
    required this.amount,
    required this.pickupCode,
  });

  final String id;
  final String consumerAlias;
  final String basketTitle;
  final String storeName;
  final int quantity;
  final double amount;
  final String pickupCode;
}

class _ReservationPreview extends StatelessWidget {
  const _ReservationPreview({required this.reservation});

  final _MockReservation reservation;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        boxShadow: AppShadow.sm,
        border: Border.all(color: AppColors.green100, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.check_circle,
                color: AppColors.green700,
                size: 20,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'Reservation trouvee',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: AppColors.green700,
                    ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          const Divider(),
          const SizedBox(height: AppSpacing.md),
          _Row(label: 'Client', value: reservation.consumerAlias),
          _Row(label: 'Panier', value: reservation.basketTitle),
          _Row(label: 'Commerce', value: reservation.storeName),
          _Row(label: 'Quantite', value: '${reservation.quantity}x'),
          _Row(
            label: 'Montant',
            value: 'Rs ${reservation.amount.toStringAsFixed(0)}',
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Semantics(
        label: '$label: $value',
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
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
