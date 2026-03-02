import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/filter_state.dart';
import '../../providers/baskets_provider.dart';

/// Horizontal filter bar with [Jour][Heure][Type][Preferences] chips (US-C016 to US-C019).
class FilterBar extends ConsumerWidget {
  const FilterBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filterState = ref.watch(filterStateProvider);

    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        children: [
          // Day filter
          _FilterChipButton(
            label: filterState.selectedDay != null
                ? _formatDay(filterState.selectedDay!)
                : 'Jour',
            isActive: filterState.selectedDay != null,
            onTap: () => _showDayPicker(context, ref),
          ),
          const SizedBox(width: AppSpacing.sm),
          // Time slot filter
          _FilterChipButton(
            label: filterState.timeSlots.isNotEmpty
                ? '${filterState.timeSlots.length} creneau${filterState.timeSlots.length > 1 ? "x" : ""}'
                : 'Heure',
            isActive: filterState.timeSlots.isNotEmpty,
            onTap: () => _showTimeSlotSheet(context, ref),
          ),
          const SizedBox(width: AppSpacing.sm),
          // Category filter
          _FilterChipButton(
            label: filterState.categoryIds.isNotEmpty
                ? '${filterState.categoryIds.length} type${filterState.categoryIds.length > 1 ? "s" : ""}'
                : 'Type',
            isActive: filterState.categoryIds.isNotEmpty,
            onTap: () => _showCategorySheet(context, ref),
          ),
          const SizedBox(width: AppSpacing.sm),
          // Dietary preferences filter
          _FilterChipButton(
            label: filterState.dietaryTags.isNotEmpty
                ? '${filterState.dietaryTags.length} pref.'
                : 'Preferences',
            isActive: filterState.dietaryTags.isNotEmpty,
            onTap: () => _showDietarySheet(context, ref),
          ),
          const SizedBox(width: AppSpacing.sm),
          // Sort
          _FilterChipButton(
            label: _sortLabel(filterState.sortBy),
            isActive: filterState.sortBy != SortOption.proximity,
            icon: Icons.sort,
            onTap: () => _showSortSheet(context, ref),
          ),
          // Reset button if filters active
          if (filterState.hasActiveFilters) ...[
            const SizedBox(width: AppSpacing.sm),
            Semantics(
              button: true,
              label: 'Reinitialiser les filtres',
              child: ActionChip(
                label: const Text('Reinitialiser'),
                avatar:
                    const Icon(Icons.close, size: 16, color: AppColors.error),
                onPressed: () =>
                    ref.read(filterStateProvider.notifier).resetFilters(),
                backgroundColor: AppColors.white,
                side: const BorderSide(color: AppColors.error),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatDay(DateTime day) {
    final now = DateTime.now();
    if (day.year == now.year &&
        day.month == now.month &&
        day.day == now.day) {
      return "Aujourd'hui";
    }
    final tomorrow = now.add(const Duration(days: 1));
    if (day.year == tomorrow.year &&
        day.month == tomorrow.month &&
        day.day == tomorrow.day) {
      return 'Demain';
    }
    return '${day.day}/${day.month}';
  }

  String _sortLabel(SortOption sort) => switch (sort) {
        SortOption.proximity => 'Proximite',
        SortOption.priceAsc => 'Prix croissant',
        SortOption.priceDesc => 'Prix decroissant',
        SortOption.pickupTime => 'Heure retrait',
      };

  void _showDayPicker(BuildContext context, WidgetRef ref) {
    showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 7)),
    ).then((picked) {
      if (picked != null) {
        ref.read(filterStateProvider.notifier).updateDay(picked);
      }
    });
  }

  void _showTimeSlotSheet(BuildContext context, WidgetRef ref) {
    final currentSlots =
        ref.read(filterStateProvider).timeSlots;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppRadius.bottomSheet),
        ),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Creneau horaire',
                  style: Theme.of(ctx).textTheme.headlineLarge),
              const SizedBox(height: AppSpacing.md),
              ...TimeSlot.values.map((slot) {
                final isSelected = currentSlots.contains(slot);
                return Semantics(
                  button: true,
                  selected: isSelected,
                  label: slot.label,
                  child: CheckboxListTile(
                    value: isSelected,
                    title: Text(slot.label),
                    activeColor: AppColors.green700,
                    onChanged: (_) {
                      ref
                          .read(filterStateProvider.notifier)
                          .toggleTimeSlot(slot);
                      Navigator.pop(ctx);
                    },
                  ),
                );
              }),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        );
      },
    );
  }

  void _showCategorySheet(BuildContext context, WidgetRef ref) {
    final currentCats =
        ref.read(filterStateProvider).categoryIds;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppRadius.bottomSheet),
        ),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Type de commerce',
                  style: Theme.of(ctx).textTheme.headlineLarge),
              const SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: BasketCategories.all.map((cat) {
                  final isSelected = currentCats.contains(cat);
                  return Semantics(
                    button: true,
                    selected: isSelected,
                    label: '$cat${isSelected ? ", selectionne" : ""}',
                    child: FilterChip(
                      label: Text(cat),
                      selected: isSelected,
                      selectedColor: AppColors.green100,
                      checkmarkColor: AppColors.green700,
                      onSelected: (_) {
                        ref
                            .read(filterStateProvider.notifier)
                            .toggleCategory(cat);
                      },
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: AppSpacing.lg),
              Semantics(
                button: true,
                label: 'Appliquer les filtres',
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Appliquer'),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        );
      },
    );
  }

  void _showDietarySheet(BuildContext context, WidgetRef ref) {
    final currentTags =
        ref.read(filterStateProvider).dietaryTags;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppRadius.bottomSheet),
        ),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Preferences alimentaires',
                  style: Theme.of(ctx).textTheme.headlineLarge),
              const SizedBox(height: AppSpacing.md),
              ...DietaryTags.all.map((tag) {
                final isSelected = currentTags.contains(tag);
                return Semantics(
                  button: true,
                  selected: isSelected,
                  label: '$tag${isSelected ? ", selectionne" : ""}',
                  child: CheckboxListTile(
                    value: isSelected,
                    title: Text(tag),
                    activeColor: AppColors.green700,
                    onChanged: (_) {
                      ref
                          .read(filterStateProvider.notifier)
                          .toggleDietaryTag(tag);
                    },
                  ),
                );
              }),
              const SizedBox(height: AppSpacing.md),
              Semantics(
                button: true,
                label: 'Appliquer les filtres',
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Appliquer'),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        );
      },
    );
  }

  void _showSortSheet(BuildContext context, WidgetRef ref) {
    final currentSort = ref.read(filterStateProvider).sortBy;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppRadius.bottomSheet),
        ),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Trier par',
                  style: Theme.of(ctx).textTheme.headlineLarge),
              const SizedBox(height: AppSpacing.md),
              ...SortOption.values.map((opt) {
                return Semantics(
                  button: true,
                  selected: currentSort == opt,
                  label: _sortLabel(opt),
                  child: RadioListTile<SortOption>(
                    value: opt,
                    groupValue: currentSort,
                    title: Text(_sortLabel(opt)),
                    activeColor: AppColors.green700,
                    onChanged: (v) {
                      ref
                          .read(filterStateProvider.notifier)
                          .updateSort(v!);
                      Navigator.pop(ctx);
                    },
                  ),
                );
              }),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        );
      },
    );
  }
}

class _FilterChipButton extends StatelessWidget {
  const _FilterChipButton({
    required this.label,
    required this.isActive,
    required this.onTap,
    this.icon,
  });

  final String label;
  final bool isActive;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.xs,
          ),
          decoration: BoxDecoration(
            color: isActive ? AppColors.green100 : AppColors.white,
            borderRadius: BorderRadius.circular(AppRadius.chip),
            border: Border.all(
              color: isActive ? AppColors.green700 : AppColors.divider,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 14,
                    color: isActive
                        ? AppColors.green700
                        : AppColors.textSecondary),
                const SizedBox(width: AppSpacing.xs),
              ],
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isActive ? FontWeight.w700 : FontWeight.w400,
                  color: isActive
                      ? AppColors.green700
                      : AppColors.textPrimary,
                ),
              ),
              if (isActive) ...[
                const SizedBox(width: AppSpacing.xs),
                const Icon(Icons.check,
                    size: 14, color: AppColors.green700),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
