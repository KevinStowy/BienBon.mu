import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';

enum StoreStatus { active, suspended, pending }

enum BasketStatus { draft, published, soldOut }

enum ReservationStatus { confirmed, ready, pickedUp, noShow }

class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    required this.color,
    required this.backgroundColor,
  });

  final String label;
  final Color color;
  final Color backgroundColor;

  factory StatusBadge.storeStatus(StoreStatus status) {
    return switch (status) {
      StoreStatus.active => StatusBadge(
          label: 'Actif',
          color: AppColors.green700,
          backgroundColor: AppColors.green100,
        ),
      StoreStatus.suspended => StatusBadge(
          label: 'Suspendu',
          color: AppColors.error,
          backgroundColor: AppColors.error.withValues(alpha: 0.12),
        ),
      StoreStatus.pending => StatusBadge(
          label: 'En attente',
          color: AppColors.orange600,
          backgroundColor: AppColors.orange100,
        ),
    };
  }

  factory StatusBadge.basketStatus(BasketStatus status) {
    return switch (status) {
      BasketStatus.draft => StatusBadge(
          label: 'Brouillon',
          color: AppColors.neutral600,
          backgroundColor: AppColors.neutral200,
        ),
      BasketStatus.published => StatusBadge(
          label: 'Publie',
          color: AppColors.green700,
          backgroundColor: AppColors.green100,
        ),
      BasketStatus.soldOut => StatusBadge(
          label: 'Epuise',
          color: AppColors.orange600,
          backgroundColor: AppColors.orange100,
        ),
    };
  }

  factory StatusBadge.reservationStatus(ReservationStatus status) {
    return switch (status) {
      ReservationStatus.confirmed => StatusBadge(
          label: 'Confirme',
          color: AppColors.green700,
          backgroundColor: AppColors.green100,
        ),
      ReservationStatus.ready => StatusBadge(
          label: 'Pret',
          color: AppColors.orange600,
          backgroundColor: AppColors.orange100,
        ),
      ReservationStatus.pickedUp => StatusBadge(
          label: 'Retire',
          color: AppColors.neutral600,
          backgroundColor: AppColors.neutral200,
        ),
      ReservationStatus.noShow => StatusBadge(
          label: 'Absent',
          color: AppColors.error,
          backgroundColor: AppColors.error.withValues(alpha: 0.12),
        ),
    };
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(AppRadius.chip),
        ),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: color,
                fontSize: 11,
              ),
        ),
      ),
    );
  }
}
