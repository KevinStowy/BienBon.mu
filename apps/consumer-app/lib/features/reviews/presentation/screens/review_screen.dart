import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/repositories/review_repository.dart';

/// Review submission screen (US-C045).
class ReviewScreen extends ConsumerStatefulWidget {
  const ReviewScreen({super.key, required this.reservationId});

  final String reservationId;

  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  int _rating = 0;
  final _commentController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez donner une note')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final repo = ref.read(reviewRepositoryProvider);
      await repo.submitReview(
        reservationId: widget.reservationId,
        rating: _rating,
        comment: _commentController.text.trim().isNotEmpty
            ? _commentController.text.trim()
            : null,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Avis envoye, merci !'),
            backgroundColor: AppColors.green700,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur : $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Donner un avis'),
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
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: AppSpacing.lg),
            Center(
              child: Text(
                'Comment etait votre panier ?',
                style: theme.textTheme.headlineLarge,
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            // Star rating
            Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(5, (index) {
                  final starValue = index + 1;
                  return Semantics(
                    button: true,
                    label: '$starValue etoile${starValue > 1 ? "s" : ""}',
                    selected: _rating >= starValue,
                    child: GestureDetector(
                      onTap: () => setState(() => _rating = starValue),
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.xs),
                        child: Icon(
                          _rating >= starValue
                              ? Icons.star
                              : Icons.star_border,
                          size: 48,
                          color: _rating >= starValue
                              ? AppColors.orange500
                              : AppColors.neutral400,
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
            if (_rating > 0) ...[
              const SizedBox(height: AppSpacing.sm),
              Center(
                child: Text(
                  _ratingLabel(_rating),
                  style: theme.textTheme.headlineMedium?.copyWith(
                    color: AppColors.orange600,
                  ),
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.xl),
            Text(
              'Commentaire (optionnel)',
              style: theme.textTheme.headlineMedium,
            ),
            const SizedBox(height: AppSpacing.sm),
            Semantics(
              label: 'Commentaire optionnel',
              textField: true,
              child: TextField(
                controller: _commentController,
                maxLines: 4,
                decoration: const InputDecoration(
                  hintText:
                      'Partagez votre experience (qualite, quantite, fraicheur...)',
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            Semantics(
              button: true,
              label: 'Envoyer mon avis',
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.white,
                        ),
                      )
                    : const Text('Envoyer mon avis'),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],
        ),
      ),
    );
  }

  String _ratingLabel(int rating) => switch (rating) {
        1 => 'Tres decu',
        2 => 'Decu',
        3 => 'Correct',
        4 => 'Bien',
        5 => 'Excellent',
        _ => '',
      };
}
