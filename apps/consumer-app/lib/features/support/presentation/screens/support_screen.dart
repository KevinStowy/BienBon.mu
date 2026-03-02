import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';

/// FAQ & Support screen (US-C061).
class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  static const _faqItems = [
    _FaqItem(
      question: 'Qu\'est-ce qu\'un panier surprise ?',
      answer:
          'Un panier surprise contient des invendus du jour de nos commerces partenaires. Le contenu exact est une surprise, mais vous savez toujours la categorie et la valeur estimee.',
    ),
    _FaqItem(
      question: 'Comment fonctionne le retrait ?',
      answer:
          'Apres votre reservation, vous recevez un QR code et un code PIN. Presentez-les au commerce pendant le creneau de retrait indique. Le partenaire scanne votre code pour valider la remise.',
    ),
    _FaqItem(
      question: 'Puis-je annuler ma reservation ?',
      answer:
          'Oui, vous pouvez annuler votre reservation tant que le creneau de retrait n\'a pas commence. Le remboursement est automatique.',
    ),
    _FaqItem(
      question: 'Que faire si le commerce est ferme ?',
      answer:
          'Si le commerce est ferme pendant le creneau de retrait, ouvrez une reclamation depuis votre commande. Vous serez rembourse integralement.',
    ),
    _FaqItem(
      question: 'Comment fonctionne le parrainage ?',
      answer:
          'Partagez votre code parrainage avec vos amis. Quand ils s\'inscrivent et font leur premier achat, ils obtiennent 50 MUR de reduction et vous gagnez un badge !',
    ),
    _FaqItem(
      question: 'Les allergenes sont-ils indiques ?',
      answer:
          'Les allergenes possibles sont indiques sur chaque fiche panier. Comme le contenu est surprise, la liste peut varier. En cas d\'allergie severe, contactez le commerce avant le retrait.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Aide et support'),
        leading: Semantics(
          button: true,
          label: 'Retour',
          child: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Questions frequentes',
                style: theme.textTheme.headlineLarge),
            const SizedBox(height: AppSpacing.md),
            ..._faqItems.map((item) => _FaqTile(item: item)),
            const SizedBox(height: AppSpacing.lg),
            const Divider(),
            const SizedBox(height: AppSpacing.lg),
            Text('Contacter le support',
                style: theme.textTheme.headlineLarge),
            const SizedBox(height: AppSpacing.md),
            Semantics(
              button: true,
              label: 'Envoyer un email au support',
              child: ListTile(
                leading: const Icon(Icons.email, color: AppColors.green700),
                title: const Text('Email'),
                subtitle: const Text('support@bienbon.mu'),
                trailing: const Icon(Icons.chevron_right,
                    color: AppColors.textSecondary),
                onTap: () async {
                  final uri = Uri.parse('mailto:support@bienbon.mu');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri);
                  }
                },
              ),
            ),
            Semantics(
              button: true,
              label: 'Appeler le support',
              child: ListTile(
                leading: const Icon(Icons.phone, color: AppColors.green700),
                title: const Text('Telephone'),
                subtitle: const Text('+230 5XX XXXX'),
                trailing: const Icon(Icons.chevron_right,
                    color: AppColors.textSecondary),
                onTap: () async {
                  final uri = Uri.parse('tel:+2305000000');
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri);
                  }
                },
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
        ),
      ),
    );
  }
}

class _FaqItem {
  const _FaqItem({required this.question, required this.answer});
  final String question;
  final String answer;
}

class _FaqTile extends StatefulWidget {
  const _FaqTile({required this.item});
  final _FaqItem item;

  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      button: true,
      label: widget.item.question,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(AppRadius.card),
          boxShadow: AppShadow.sm,
        ),
        child: Column(
          children: [
            ListTile(
              title: Text(
                widget.item.question,
                style: theme.textTheme.headlineMedium,
              ),
              trailing: Icon(
                _expanded
                    ? Icons.keyboard_arrow_up
                    : Icons.keyboard_arrow_down,
                color: AppColors.green700,
              ),
              onTap: () => setState(() => _expanded = !_expanded),
            ),
            if (_expanded)
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  0,
                  AppSpacing.md,
                  AppSpacing.md,
                ),
                child: Text(
                  widget.item.answer,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                    height: 1.5,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
