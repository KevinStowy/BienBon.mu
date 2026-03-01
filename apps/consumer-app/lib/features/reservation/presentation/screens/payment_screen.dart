import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key, required this.reservationId});

  final String reservationId;

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  int _selectedMethod = 0;
  bool _isLoading = false;

  static const _paymentMethods = [
    _PaymentMethod(
      id: 'card',
      label: 'Carte bancaire',
      subtitle: 'Visa, Mastercard, MCB',
      icon: Icons.credit_card,
    ),
    _PaymentMethod(
      id: 'juice',
      label: 'Juice by MCB',
      subtitle: 'Paiement mobile',
      icon: Icons.phone_android,
    ),
    _PaymentMethod(
      id: 'cash',
      label: 'Especes au retrait',
      subtitle: 'Payer directement au commerce',
      icon: Icons.money,
    ),
  ];

  Future<void> _onPay() async {
    setState(() => _isLoading = true);
    // Simulate payment processing
    await Future.delayed(const Duration(seconds: 1));
    if (mounted) {
      setState(() => _isLoading = false);
      context.goNamed(
        RouteNames.confirmation,
        pathParameters: {'reservationId': widget.reservationId},
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Paiement'),
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
            // Security badge
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: AppColors.green100,
                borderRadius: BorderRadius.circular(AppRadius.card),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.lock,
                    size: 16,
                    color: AppColors.green700,
                  ),
                  const SizedBox(width: AppSpacing.xs),
                  Text(
                    'Paiement securise par BienBon',
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: AppColors.green700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Choisissez votre mode de paiement',
              style: theme.textTheme.headlineLarge,
            ),
            const SizedBox(height: AppSpacing.md),
            // Payment methods
            ..._paymentMethods.asMap().entries.map((entry) {
              final index = entry.key;
              final method = entry.value;
              final isSelected = _selectedMethod == index;

              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: Semantics(
                  button: true,
                  selected: isSelected,
                  label:
                      '${method.label}, ${method.subtitle}${isSelected ? ", selectionne" : ""}',
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedMethod = index),
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: AppColors.white,
                        borderRadius: BorderRadius.circular(AppRadius.card),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.green700
                              : AppColors.divider,
                          width: isSelected ? 2 : 1,
                        ),
                        boxShadow: isSelected ? AppShadow.sm : null,
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.green100
                                  : AppColors.neutral50,
                              borderRadius:
                                  BorderRadius.circular(AppRadius.button),
                            ),
                            child: Icon(
                              method.icon,
                              color: isSelected
                                  ? AppColors.green700
                                  : AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  method.label,
                                  style: theme.textTheme.headlineMedium
                                      ?.copyWith(
                                    color: isSelected
                                        ? AppColors.green900
                                        : AppColors.textPrimary,
                                  ),
                                ),
                                Text(
                                  method.subtitle,
                                  style: theme.textTheme.bodyMedium,
                                ),
                              ],
                            ),
                          ),
                          Icon(
                            isSelected
                                ? Icons.radio_button_checked
                                : Icons.radio_button_unchecked,
                            color: isSelected
                                ? AppColors.green700
                                : AppColors.neutral400,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),
            // Card details (shown only for card payment)
            if (_selectedMethod == 0) ...[
              const SizedBox(height: AppSpacing.md),
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
                    Text(
                      'Coordonnees de la carte',
                      style: theme.textTheme.headlineMedium,
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Semantics(
                      label: 'Numero de carte bancaire',
                      textField: true,
                      child: TextFormField(
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Numero de carte',
                          hintText: '4242 4242 4242 4242',
                          prefixIcon: Icon(Icons.credit_card),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: Semantics(
                            label: "Date d'expiration",
                            textField: true,
                            child: TextFormField(
                              keyboardType: TextInputType.datetime,
                              decoration: const InputDecoration(
                                labelText: 'MM/AA',
                                hintText: '12/27',
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: Semantics(
                            label: 'Code CVV',
                            textField: true,
                            child: TextFormField(
                              keyboardType: TextInputType.number,
                              obscureText: true,
                              decoration: const InputDecoration(
                                labelText: 'CVV',
                                hintText: '123',
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.xl),
            // Pay button
            Semantics(
              button: true,
              label: 'Payer maintenant',
              child: ElevatedButton(
                onPressed: _isLoading ? null : _onPay,
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.white,
                        ),
                      )
                    : const Text('Payer maintenant'),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],
        ),
      ),
    );
  }
}

class _PaymentMethod {
  const _PaymentMethod({
    required this.id,
    required this.label,
    required this.subtitle,
    required this.icon,
  });

  final String id;
  final String label;
  final String subtitle;
  final IconData icon;
}
