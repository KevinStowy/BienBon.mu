import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../auth/providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final theme = Theme.of(context);

    final displayName = authState.userName ?? 'Utilisateur';
    final displayEmail = authState.userEmail ?? '';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Mon profil', style: theme.textTheme.headlineLarge),
        backgroundColor: AppColors.white,
        elevation: 0,
        actions: [
          Semantics(
            button: true,
            label: 'Modifier le profil',
            child: IconButton(
              icon: const Icon(Icons.edit_outlined),
              onPressed: () {},
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // User header
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                children: [
                  // Avatar
                  Semantics(
                    label: 'Photo de profil de $displayName',
                    child: CircleAvatar(
                      radius: 44,
                      backgroundColor: AppColors.green700,
                      child: Text(
                        displayName.isNotEmpty
                            ? displayName[0].toUpperCase()
                            : 'U',
                        style: theme.textTheme.displayLarge?.copyWith(
                          color: AppColors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 36,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    displayName,
                    style: theme.textTheme.headlineLarge,
                  ),
                  if (displayEmail.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      displayEmail,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.md),
                  // Stats row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _StatItem(label: 'Paniers\nsauves', value: '12'),
                      Container(
                        width: 1,
                        height: 40,
                        color: AppColors.divider,
                      ),
                      _StatItem(label: 'CO2 evite', value: '14.4 kg'),
                      Container(
                        width: 1,
                        height: 40,
                        color: AppColors.divider,
                      ),
                      _StatItem(label: 'Economies', value: '1 580 MUR'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            // Settings sections
            _ProfileSection(
              title: 'Preferences',
              items: [
                _ProfileItem(
                  icon: Icons.restaurant_menu,
                  label: 'Preferences alimentaires',
                  onTap: () {},
                ),
                _ProfileItem(
                  icon: Icons.notifications_outlined,
                  label: 'Notifications',
                  onTap: () {},
                  trailing: Switch(
                    value: true,
                    onChanged: (_) {},
                    activeThumbColor: AppColors.green700,
                  ),
                ),
                _ProfileItem(
                  icon: Icons.language,
                  label: 'Langue',
                  onTap: () {},
                  trailingText: 'Francais',
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            _ProfileSection(
              title: 'Mon compte',
              items: [
                _ProfileItem(
                  icon: Icons.card_giftcard,
                  label: 'Mon code parrainage',
                  onTap: () => _showReferralCode(context),
                  trailingText: 'BIEN-001',
                ),
                _ProfileItem(
                  icon: Icons.history,
                  label: 'Historique des commandes',
                  onTap: () => context.goNamed(RouteNames.orders),
                ),
                _ProfileItem(
                  icon: Icons.payment,
                  label: 'Moyens de paiement',
                  onTap: () {},
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            _ProfileSection(
              title: 'Support',
              items: [
                _ProfileItem(
                  icon: Icons.help_outline,
                  label: 'Aide et FAQ',
                  onTap: () {},
                ),
                _ProfileItem(
                  icon: Icons.mail_outline,
                  label: 'Contacter le support',
                  onTap: () {},
                ),
                _ProfileItem(
                  icon: Icons.privacy_tip_outlined,
                  label: 'Politique de confidentialite',
                  onTap: () {},
                ),
                _ProfileItem(
                  icon: Icons.description_outlined,
                  label: "Conditions d'utilisation",
                  onTap: () {},
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            // Logout
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Semantics(
                button: true,
                label: 'Se deconnecter',
                child: OutlinedButton.icon(
                  onPressed: () => _confirmLogout(context, ref),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error),
                  ),
                  icon: const Icon(Icons.logout),
                  label: const Text('Deconnexion'),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'BienBon v1.0.0',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: AppColors.textDisabled,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      ),
    );
  }

  void _showReferralCode(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppRadius.bottomSheet),
        ),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Mon code parrainage',
                style: Theme.of(context).textTheme.headlineLarge,
              ),
              const SizedBox(height: AppSpacing.md),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xl,
                  vertical: AppSpacing.md,
                ),
                decoration: BoxDecoration(
                  color: AppColors.green100,
                  borderRadius: BorderRadius.circular(AppRadius.card),
                ),
                child: Text(
                  'BIEN-001',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    color: AppColors.green700,
                    letterSpacing: 4,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Partagez ce code avec vos amis.\nIls obtiennent 50 MUR de reduction sur leur premier panier !',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.lg),
              Semantics(
                button: true,
                label: 'Partager le code parrainage',
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.share),
                  label: const Text('Partager mon code'),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        );
      },
    );
  }

  void _confirmLogout(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Deconnexion'),
        content: const Text(
          'Etes-vous sur de vouloir vous deconnecter ?',
        ),
        actions: [
          Semantics(
            button: true,
            label: 'Annuler',
            child: TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler'),
            ),
          ),
          Semantics(
            button: true,
            label: 'Se deconnecter',
            child: TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                ref.read(authStateProvider.notifier).logout();
              },
              style: TextButton.styleFrom(
                foregroundColor: AppColors.error,
              ),
              child: const Text('Deconnecter'),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      label: '$label : $value',
      child: Column(
        children: [
          Text(
            value,
            style: theme.textTheme.headlineLarge?.copyWith(
              color: AppColors.green700,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _ProfileSection extends StatelessWidget {
  const _ProfileSection({required this.title, required this.items});

  final String title;
  final List<_ProfileItem> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.sm,
            AppSpacing.md,
            AppSpacing.xs,
          ),
          child: Text(
            title.toUpperCase(),
            style: theme.textTheme.labelLarge?.copyWith(
              color: AppColors.textSecondary,
              letterSpacing: 1,
              fontSize: 11,
            ),
          ),
        ),
        Container(
          color: AppColors.white,
          child: Column(
            children: items.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              return Column(
                children: [
                  item,
                  if (index < items.length - 1)
                    const Divider(
                      height: 1,
                      indent: AppSpacing.md + 20 + AppSpacing.md,
                    ),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _ProfileItem extends StatelessWidget {
  const _ProfileItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.trailing,
    this.trailingText,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Widget? trailing;
  final String? trailingText;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      button: true,
      label: label,
      child: ListTile(
        onTap: onTap,
        leading: Icon(icon, color: AppColors.green700, size: 22),
        title: Text(label, style: theme.textTheme.bodyLarge),
        trailing: trailing ??
            (trailingText != null
                ? Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        trailingText!,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      const Icon(
                        Icons.chevron_right,
                        color: AppColors.textSecondary,
                        size: 18,
                      ),
                    ],
                  )
                : const Icon(
                    Icons.chevron_right,
                    color: AppColors.textSecondary,
                    size: 18,
                  )),
        minLeadingWidth: 20,
      ),
    );
  }
}
