import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart' show Share;

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/gamification.dart' as gamification;
import '../../providers/gamification_provider.dart';

/// Impact & gamification screen (US-C059, US-C060).
class GamificationScreen extends ConsumerWidget {
  const GamificationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final statsAsync = ref.watch(impactStatsProvider);
    final referralAsync = ref.watch(referralCodeProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mon impact'),
        leading: Semantics(
          button: true,
          label: 'Retour',
          child: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
      ),
      body: statsAsync.when(
        data: (stats) => SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Impact stats header
              _ImpactHeader(stats: stats),
              const SizedBox(height: AppSpacing.lg),
              // Badges section
              Text('Mes badges', style: theme.textTheme.headlineLarge),
              const SizedBox(height: AppSpacing.md),
              _BadgesGrid(stats: stats),
              const SizedBox(height: AppSpacing.lg),
              // Referral section (US-C060)
              Text('Parrainage', style: theme.textTheme.headlineLarge),
              const SizedBox(height: AppSpacing.md),
              referralAsync.when(
                data: (code) => _ReferralCard(code: code),
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              ),
              const SizedBox(height: AppSpacing.xl),
            ],
          ),
        ),
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.green700),
        ),
        error: (e, _) => Center(
          child: Text('Erreur : $e', style: theme.textTheme.bodyLarge),
        ),
      ),
    );
  }
}

class _ImpactHeader extends StatelessWidget {
  const _ImpactHeader({required this.stats});
  final gamification.ImpactStats stats;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final co2Saved = (stats.totalBasketsSaved * 1.2).toStringAsFixed(1);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.green100, Color(0xFFC8E6C9)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Semantics(
                label: '${stats.totalBasketsSaved} paniers sauves',
                child: _StatColumn(
                  value: '${stats.totalBasketsSaved}',
                  label: 'Paniers\nsauves',
                  icon: Icons.shopping_basket,
                ),
              ),
              Semantics(
                label: '$co2Saved kg de CO2 evites',
                child: _StatColumn(
                  value: '$co2Saved kg',
                  label: 'CO2\nevite',
                  icon: Icons.eco,
                ),
              ),
              Semantics(
                label: '${stats.totalSavings.toStringAsFixed(0)} MUR economises',
                child: _StatColumn(
                  value: '${stats.totalSavings.toStringAsFixed(0)} MUR',
                  label: 'Economies\nrealisees',
                  icon: Icons.savings,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Chaque panier sauve evite 1,2 kg de CO2',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.green900,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  const _StatColumn({
    required this.value,
    required this.label,
    required this.icon,
  });

  final String value;
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Icon(icon, color: AppColors.green700, size: 28),
        const SizedBox(height: AppSpacing.xs),
        Text(
          value,
          style: theme.textTheme.headlineLarge?.copyWith(
            color: AppColors.green900,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: AppColors.green700,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _BadgesGrid extends StatelessWidget {
  const _BadgesGrid({required this.stats});
  final gamification.ImpactStats stats;

  @override
  Widget build(BuildContext context) {
    // Merge default badges with user's unlocked status
    final allBadges = gamification.DefaultBadges.all.map((def) {
      final userBadge = stats.badges.where((b) => b.id == def.id).firstOrNull;
      if (userBadge != null) return userBadge;
      return def;
    }).toList();

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: AppSpacing.sm,
        mainAxisSpacing: AppSpacing.sm,
        childAspectRatio: 0.85,
      ),
      itemCount: allBadges.length,
      itemBuilder: (context, index) => _BadgeCard(badge: allBadges[index]),
    );
  }
}

class _BadgeCard extends StatelessWidget {
  const _BadgeCard({required this.badge});
  final gamification.Badge badge;

  IconData get _badgeIcon => switch (badge.iconName) {
        'footprint' => Icons.directions_walk,
        'leaf' => Icons.eco,
        'shield' => Icons.shield,
        'star' => Icons.star,
        'trophy' => Icons.emoji_events,
        'people' => Icons.people,
        'flag' => Icons.flag,
        _ => Icons.workspace_premium,
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      label:
          '${badge.name}, ${badge.description}${badge.isUnlocked ? ", debloque" : ", verrouille"}',
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: badge.isUnlocked ? AppColors.green100 : AppColors.neutral50,
          borderRadius: BorderRadius.circular(AppRadius.card),
          border: Border.all(
            color: badge.isUnlocked ? AppColors.green500 : AppColors.divider,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _badgeIcon,
              size: 32,
              color: badge.isUnlocked
                  ? AppColors.green700
                  : AppColors.textDisabled,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              badge.name,
              style: theme.textTheme.labelLarge?.copyWith(
                color: badge.isUnlocked
                    ? AppColors.green900
                    : AppColors.textDisabled,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              badge.description,
              style: theme.textTheme.labelSmall?.copyWith(
                color: badge.isUnlocked
                    ? AppColors.textSecondary
                    : AppColors.textDisabled,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _ReferralCard extends StatelessWidget {
  const _ReferralCard({required this.code});
  final String code;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        boxShadow: AppShadow.sm,
      ),
      child: Column(
        children: [
          const Icon(Icons.card_giftcard, color: AppColors.green700, size: 36),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Votre code parrainage',
            style: theme.textTheme.headlineMedium,
          ),
          const SizedBox(height: AppSpacing.sm),
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
              code.isNotEmpty ? code : 'Non disponible',
              style: theme.textTheme.displayLarge?.copyWith(
                color: AppColors.green700,
                letterSpacing: 4,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Partagez ce code avec vos amis.\nIls obtiennent 50 MUR de reduction !',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.md),
          Semantics(
            button: true,
            label: 'Partager le code parrainage',
            child: ElevatedButton.icon(
              onPressed: () {
                if (code.isNotEmpty) {
                  Share.share(
                    'Rejoins BienBon et sauve des paniers surprise ! Utilise mon code $code pour 50 MUR de reduction. https://bienbon.mu/referral/$code',
                  );
                }
              },
              icon: const Icon(Icons.share),
              label: const Text('Partager mon code'),
            ),
          ),
        ],
      ),
    );
  }
}
