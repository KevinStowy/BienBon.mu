import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import 'status_badge.dart';

/// Data model for a reservation (partner view).
class ReservationModel {
  const ReservationModel({
    required this.id,
    required this.basketTitle,
    required this.storeName,
    required this.consumerAlias,
    required this.quantity,
    required this.totalAmount,
    required this.status,
    required this.reservedAt,
    required this.pickupCode,
    this.pickupTime,
  });

  final String id;
  final String basketTitle;
  final String storeName;
  final String consumerAlias;
  final int quantity;
  final double totalAmount;
  final ReservationStatus status;
  final DateTime reservedAt;
  final String pickupCode;
  final DateTime? pickupTime;
}

class ReservationCard extends StatelessWidget {
  const ReservationCard({
    super.key,
    required this.reservation,
    this.onTap,
  });

  final ReservationModel reservation;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label:
          'Reservation ${reservation.consumerAlias} — ${reservation.basketTitle}',
      button: onTap != null,
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          reservation.basketTitle,
                          style: Theme.of(context).textTheme.headlineMedium,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          reservation.storeName,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                  StatusBadge.reservationStatus(reservation.status),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              const Divider(),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  const Icon(
                    Icons.person_outline,
                    size: 14,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    reservation.consumerAlias,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const Spacer(),
                  Text(
                    'Rs ${reservation.totalAmount.toStringAsFixed(0)}',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: AppColors.green700,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              Row(
                children: [
                  const Icon(
                    Icons.confirmation_number_outlined,
                    size: 14,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'PIN: ${reservation.pickupCode}',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: AppColors.green900,
                          letterSpacing: 1.5,
                        ),
                  ),
                  const Spacer(),
                  Text(
                    '${reservation.quantity} x panier',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
