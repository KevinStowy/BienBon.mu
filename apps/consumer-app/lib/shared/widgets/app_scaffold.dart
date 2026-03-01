import 'package:consumer_app/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';

/// Shell scaffold providing the bottom navigation bar for the 5 main tabs.
class AppScaffold extends StatelessWidget {
  const AppScaffold({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  void _onTabTap(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: _BienBonBottomNav(
        currentIndex: navigationShell.currentIndex,
        onTap: _onTabTap,
      ),
    );
  }
}

class _BienBonBottomNav extends StatelessWidget {
  const _BienBonBottomNav({
    required this.currentIndex,
    required this.onTap,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    final items = [
      _NavItem(
        label: l10n.tabHome,
        icon: Icons.home_outlined,
        activeIcon: Icons.home,
      ),
      _NavItem(
        label: l10n.tabExplore,
        icon: Icons.search_outlined,
        activeIcon: Icons.search,
      ),
      _NavItem(
        label: l10n.tabOrders,
        icon: Icons.receipt_long_outlined,
        activeIcon: Icons.receipt_long,
      ),
      _NavItem(
        label: l10n.tabFavorites,
        icon: Icons.favorite_outline,
        activeIcon: Icons.favorite,
      ),
      _NavItem(
        label: l10n.tabProfile,
        icon: Icons.person_outline,
        activeIcon: Icons.person,
      ),
    ];

    return NavigationBar(
      selectedIndex: currentIndex,
      onDestinationSelected: onTap,
      backgroundColor: AppColors.white,
      indicatorColor: AppColors.orange100,
      elevation: 8,
      destinations: items.asMap().entries.map((entry) {
        final index = entry.key;
        final item = entry.value;
        final isSelected = index == currentIndex;

        return Semantics(
          label: item.label,
          selected: isSelected,
          button: true,
          child: NavigationDestination(
            icon: Icon(item.icon),
            selectedIcon: Icon(item.activeIcon),
            label: item.label,
          ),
        );
      }).toList(),
    );
  }
}

class _NavItem {
  const _NavItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
  });

  final String label;
  final IconData icon;
  final IconData activeIcon;
}
