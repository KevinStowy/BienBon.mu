import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/reservation_card.dart';
import '../../../shared/widgets/status_badge.dart';
import '../providers/reservations_provider.dart';

class ReservationsListScreen extends ConsumerStatefulWidget {
  const ReservationsListScreen({super.key});

  @override
  ConsumerState<ReservationsListScreen> createState() =>
      _ReservationsListScreenState();
}

class _ReservationsListScreenState
    extends ConsumerState<ReservationsListScreen> {
  ReservationStatus? _selectedStatus;

  @override
  Widget build(BuildContext context) {
    final reservations = ref.watch(reservationsProvider);
    final filtered = _selectedStatus == null
        ? reservations
        : reservations
            .where((r) => r.status == _selectedStatus)
            .toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Reservations'),
      ),
      body: Column(
        children: [
          // Status filter bar
          Container(
            color: AppColors.white,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _StatusFilterChip(
                    label: 'Toutes',
                    isSelected: _selectedStatus == null,
                    onTap: () => setState(() => _selectedStatus = null),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _StatusFilterChip(
                    label: 'Confirme',
                    isSelected: _selectedStatus == ReservationStatus.confirmed,
                    onTap: () => setState(
                      () => _selectedStatus = ReservationStatus.confirmed,
                    ),
                    color: AppColors.green700,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _StatusFilterChip(
                    label: 'Pret',
                    isSelected: _selectedStatus == ReservationStatus.ready,
                    onTap: () => setState(
                      () => _selectedStatus = ReservationStatus.ready,
                    ),
                    color: AppColors.orange600,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _StatusFilterChip(
                    label: 'Retire',
                    isSelected: _selectedStatus == ReservationStatus.pickedUp,
                    onTap: () => setState(
                      () => _selectedStatus = ReservationStatus.pickedUp,
                    ),
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  _StatusFilterChip(
                    label: 'Absent',
                    isSelected: _selectedStatus == ReservationStatus.noShow,
                    onTap: () => setState(
                      () => _selectedStatus = ReservationStatus.noShow,
                    ),
                    color: AppColors.error,
                  ),
                ],
              ),
            ),
          ),
          // Summary badge
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            child: Row(
              children: [
                Text(
                  '${filtered.length} reservation(s)',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ),
          ),
          // List
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.inbox_outlined,
                          size: 48,
                          color: AppColors.textDisabled,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'Aucune reservation',
                          style: Theme.of(context).textTheme.bodyLarge
                              ?.copyWith(color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.md,
                      0,
                      AppSpacing.md,
                      AppSpacing.md,
                    ),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: AppSpacing.md),
                    itemBuilder: (context, index) {
                      final reservation = filtered[index];
                      return ReservationCard(
                        reservation: reservation,
                        onTap: () => context.goNamed(
                          RouteNames.reservationDetail,
                          pathParameters: {
                            'reservationId': reservation.id,
                          },
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _StatusFilterChip extends StatelessWidget {
  const _StatusFilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.color = AppColors.green700,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      selected: isSelected,
      button: true,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            color: isSelected ? color : AppColors.neutral200,
            borderRadius: BorderRadius.circular(AppRadius.chip),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: isSelected ? AppColors.white : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}
