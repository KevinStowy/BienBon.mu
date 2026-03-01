import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/route_names.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Profil & Parametres'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Partner info card
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
                boxShadow: AppShadow.sm,
              ),
              child: Row(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.green700,
                      borderRadius: BorderRadius.circular(32),
                    ),
                    child: Center(
                      child: Text(
                        (auth.partnerName?.isNotEmpty == true)
                            ? auth.partnerName![0].toUpperCase()
                            : 'P',
                        style: const TextStyle(
                          color: AppColors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          auth.partnerName ?? 'Partenaire',
                          style: Theme.of(context).textTheme.headlineLarge,
                        ),
                        Text(
                          auth.partnerEmail ?? '',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.green100,
                            borderRadius: BorderRadius.circular(AppRadius.chip),
                          ),
                          child: const Text(
                            'Partenaire verifie',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.green700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Semantics(
                    label: 'Modifier le profil',
                    button: true,
                    child: IconButton(
                      icon: const Icon(Icons.edit_outlined),
                      onPressed: () {},
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Store hours management
            _SectionHeader(title: 'Mon commerce'),
            _SettingTile(
              icon: Icons.access_time_outlined,
              title: 'Horaires du commerce',
              subtitle: 'Lun-Sam: 7h00-19h00',
              onTap: () => _showHoursDialog(context),
            ),
            _SettingTile(
              icon: Icons.store_outlined,
              title: 'Mes commerces',
              subtitle: 'Gerer mes points de vente',
              onTap: () => context.goNamed(RouteNames.storesList),
            ),
            _SettingTile(
              icon: Icons.account_balance_outlined,
              title: 'Reversements',
              subtitle: 'Historique et methode de paiement',
              onTap: () => context.goNamed(RouteNames.revenue),
            ),
            const SizedBox(height: AppSpacing.md),

            // Notifications
            _SectionHeader(title: 'Notifications'),
            _ToggleTile(
              icon: Icons.notifications_outlined,
              title: 'Nouvelles reservations',
              value: true,
              onChanged: (_) {},
            ),
            _ToggleTile(
              icon: Icons.alarm_outlined,
              title: 'Rappels de retrait',
              value: true,
              onChanged: (_) {},
            ),
            _ToggleTile(
              icon: Icons.trending_up_outlined,
              title: 'Rapport hebdomadaire',
              value: false,
              onChanged: (_) {},
            ),
            const SizedBox(height: AppSpacing.md),

            // App settings
            _SectionHeader(title: 'Application'),
            _SettingTile(
              icon: Icons.language_outlined,
              title: 'Langue',
              subtitle: 'Francais',
              onTap: () => _showLanguageDialog(context),
            ),
            _SettingTile(
              icon: Icons.help_outline,
              title: 'Aide & Support',
              subtitle: 'FAQ, contact, tutoriels',
              onTap: () {},
            ),
            _SettingTile(
              icon: Icons.description_outlined,
              title: 'Conditions partenaires',
              onTap: () {},
            ),
            _SettingTile(
              icon: Icons.privacy_tip_outlined,
              title: 'Politique de confidentialite',
              onTap: () {},
            ),
            const SizedBox(height: AppSpacing.md),

            // App version
            Center(
              child: Text(
                'BienBon Partner v1.0.0',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Logout button
            Semantics(
              label: 'Se deconnecter',
              button: true,
              child: OutlinedButton.icon(
                onPressed: () async {
                  final confirmed = await _showLogoutConfirmation(context);
                  if (confirmed == true) {
                    await ref.read(authStateProvider.notifier).logout();
                    if (context.mounted) {
                      context.goNamed(RouteNames.login);
                    }
                  }
                },
                icon: const Icon(
                  Icons.logout,
                  color: AppColors.error,
                ),
                label: const Text(
                  'Se deconnecter',
                  style: TextStyle(color: AppColors.error),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.error),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      ),
    );
  }

  Future<bool?> _showLogoutConfirmation(BuildContext context) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Se deconnecter'),
        content: const Text(
          'Etes-vous sur de vouloir vous deconnecter ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Deconnecter'),
          ),
        ],
      ),
    );
  }

  void _showHoursDialog(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppRadius.bottomSheet),
        ),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Horaires du commerce',
              style: Theme.of(context).textTheme.headlineLarge,
            ),
            const SizedBox(height: AppSpacing.md),
            ...['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
                .map(
              (day) => Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(day, style: Theme.of(context).textTheme.bodyLarge),
                    Text(
                      '7h00 - 19h00',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: AppColors.green700,
                          ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Dimanche', style: Theme.of(context).textTheme.bodyLarge),
                  Text(
                    'Ferme',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Fermer'),
            ),
          ],
        ),
      ),
    );
  }

  void _showLanguageDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Langue'),
        children: ['Francais', 'English', 'Kreol Morisyen'].map((lang) {
          return SimpleDialogOption(
            onPressed: () => Navigator.pop(context),
            child: Row(
              children: [
                const Icon(Icons.language, size: 18),
                const SizedBox(width: AppSpacing.sm),
                Text(lang),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Text(
        title,
        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
              color: AppColors.textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _SettingTile extends StatelessWidget {
  const _SettingTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$title${subtitle != null ? ': $subtitle' : ''}',
      button: onTap != null,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(AppRadius.card),
          boxShadow: AppShadow.sm,
        ),
        child: ListTile(
          leading: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.green100,
              borderRadius: BorderRadius.circular(AppRadius.card),
            ),
            child: Icon(icon, color: AppColors.green700, size: 20),
          ),
          title: Text(
            title,
            style: Theme.of(context).textTheme.labelLarge,
          ),
          subtitle: subtitle != null
              ? Text(
                  subtitle!,
                  style: Theme.of(context).textTheme.bodyMedium,
                )
              : null,
          trailing: onTap != null
              ? const Icon(
                  Icons.chevron_right,
                  color: AppColors.textSecondary,
                )
              : null,
          onTap: onTap,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.card),
          ),
        ),
      ),
    );
  }
}

class _ToggleTile extends StatelessWidget {
  const _ToggleTile({
    required this.icon,
    required this.title,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String title;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: title,
      toggled: value,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(AppRadius.card),
          boxShadow: AppShadow.sm,
        ),
        child: SwitchListTile(
          secondary: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.green100,
              borderRadius: BorderRadius.circular(AppRadius.card),
            ),
            child: Icon(icon, color: AppColors.green700, size: 20),
          ),
          title: Text(
            title,
            style: Theme.of(context).textTheme.labelLarge,
          ),
          value: value,
          onChanged: onChanged,
          activeThumbColor: AppColors.green700,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.card),
          ),
        ),
      ),
    );
  }
}
