import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/claim.dart';
import '../../providers/claims_provider.dart';

/// Claims list screen (US-C048).
class ClaimsScreen extends ConsumerWidget {
  const ClaimsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final claimsAsync = ref.watch(claimsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Mes reclamations'),
        leading: Semantics(
          button: true,
          label: 'Retour',
          child: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
      ),
      body: claimsAsync.when(
        data: (claims) {
          if (claims.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.gavel,
                        size: 72, color: AppColors.neutral200),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      'Aucune reclamation',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Vos reclamations apparaitront ici.',
                      style: theme.textTheme.bodyMedium,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: claims.length,
            separatorBuilder: (_, __) =>
                const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) {
              final claim = claims[index];
              return _ClaimCard(
                claim: claim,
                onTap: () => context.push('${RoutePaths.claims}/${claim.id}'),
              );
            },
          );
        },
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

class _ClaimCard extends StatelessWidget {
  const _ClaimCard({required this.claim, required this.onTap});

  final Claim claim;
  final VoidCallback onTap;

  Color get _statusColor => switch (claim.status) {
        ClaimStatus.open => AppColors.orange600,
        ClaimStatus.inProgress => AppColors.green700,
        ClaimStatus.resolved => AppColors.textSecondary,
      };

  String get _statusLabel => switch (claim.status) {
        ClaimStatus.open => 'Ouverte',
        ClaimStatus.inProgress => 'En cours',
        ClaimStatus.resolved => 'Resolue',
      };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      button: true,
      label:
          'Reclamation ${claim.reason}, statut $_statusLabel',
      child: GestureDetector(
        onTap: onTap,
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
                children: [
                  Expanded(
                    child: Text(
                      claim.storeName ?? 'Commerce',
                      style: theme.textTheme.headlineMedium,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: _statusColor.withAlpha(26),
                      borderRadius: BorderRadius.circular(AppRadius.chip),
                    ),
                    child: Text(
                      _statusLabel,
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: _statusColor,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                claim.reason,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (claim.resolution != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Resolution : ${_resolutionLabel(claim.resolution!)}',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: AppColors.green700,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _resolutionLabel(ClaimResolution r) => switch (r) {
        ClaimResolution.fullRefund => 'Remboursement total',
        ClaimResolution.partialRefund => 'Remboursement partiel',
        ClaimResolution.rejected => 'Rejetee',
      };
}
