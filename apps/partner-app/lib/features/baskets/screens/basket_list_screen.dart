import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/basket_card_partner.dart';
import '../../../shared/widgets/status_badge.dart';
import '../providers/baskets_provider.dart';

class BasketListScreen extends ConsumerStatefulWidget {
  const BasketListScreen({super.key});

  @override
  ConsumerState<BasketListScreen> createState() => _BasketListScreenState();
}

class _BasketListScreenState extends ConsumerState<BasketListScreen> {
  BasketStatus? _selectedFilter;

  @override
  Widget build(BuildContext context) {
    final baskets = ref.watch(partnersBasketListProvider);

    final filtered = _selectedFilter == null
        ? baskets
        : baskets.where((b) => b.status == _selectedFilter).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mes paniers'),
        actions: [
          Semantics(
            label: 'Creer un nouveau panier',
            button: true,
            child: IconButton(
              icon: const Icon(Icons.add_circle_outline),
              onPressed: () => context.goNamed(RouteNames.basketCreate),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter chips
          _FilterBar(
            selectedFilter: _selectedFilter,
            onFilterChanged: (f) => setState(() => _selectedFilter = f),
          ),
          // List
          Expanded(
            child: filtered.isEmpty
                ? _EmptyBasketList(
                    onCreateTap: () => context.goNamed(RouteNames.basketCreate),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: AppSpacing.md),
                    itemBuilder: (context, index) {
                      final basket = filtered[index];
                      return BasketCardPartner(
                        basket: basket,
                        onTap: () => context.goNamed(
                          RouteNames.basketDetail,
                          pathParameters: {'basketId': basket.id},
                        ),
                        onStatusToggle: () => ref
                            .read(partnersBasketListProvider.notifier)
                            .toggleStatus(basket.id),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.goNamed(RouteNames.basketCreate),
        backgroundColor: AppColors.green700,
        foregroundColor: AppColors.white,
        icon: const Icon(Icons.add),
        label: const Text('Nouveau panier'),
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({
    required this.selectedFilter,
    required this.onFilterChanged,
  });

  final BasketStatus? selectedFilter;
  final ValueChanged<BasketStatus?> onFilterChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.white,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _FilterChip(
              label: 'Tous',
              isSelected: selectedFilter == null,
              onTap: () => onFilterChanged(null),
            ),
            const SizedBox(width: AppSpacing.sm),
            _FilterChip(
              label: 'Publies',
              isSelected: selectedFilter == BasketStatus.published,
              onTap: () => onFilterChanged(BasketStatus.published),
            ),
            const SizedBox(width: AppSpacing.sm),
            _FilterChip(
              label: 'Brouillons',
              isSelected: selectedFilter == BasketStatus.draft,
              onTap: () => onFilterChanged(BasketStatus.draft),
            ),
            const SizedBox(width: AppSpacing.sm),
            _FilterChip(
              label: 'Epuises',
              isSelected: selectedFilter == BasketStatus.soldOut,
              onTap: () => onFilterChanged(BasketStatus.soldOut),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

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
            color: isSelected ? AppColors.green700 : AppColors.neutral200,
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

class _EmptyBasketList extends StatelessWidget {
  const _EmptyBasketList({required this.onCreateTap});

  final VoidCallback onCreateTap;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.green100,
                borderRadius: BorderRadius.circular(40),
              ),
              child: const Icon(
                Icons.shopping_bag_outlined,
                color: AppColors.green700,
                size: 40,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Aucun panier',
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Creez votre premier panier pour commencer a vendre.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.lg),
            ElevatedButton.icon(
              onPressed: onCreateTap,
              icon: const Icon(Icons.add),
              label: const Text('Creer un panier'),
            ),
          ],
        ),
      ),
    );
  }
}
