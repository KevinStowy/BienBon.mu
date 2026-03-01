import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../auth/providers/auth_provider.dart';

class _OnboardingPage {
  const _OnboardingPage({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.backgroundColor,
    required this.iconColor,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color backgroundColor;
  final Color iconColor;
}

const _pages = [
  _OnboardingPage(
    icon: Icons.eco,
    title: 'Sauvez des paniers',
    subtitle:
        'Recuperez des paniers surprise de commerces locaux a prix reduit et contribuez a reduire le gaspillage alimentaire a Maurice.',
    backgroundColor: AppColors.green100,
    iconColor: AppColors.green700,
  ),
  _OnboardingPage(
    icon: Icons.qr_code_scanner,
    title: 'Retrait simple et rapide',
    subtitle:
        'Reservez en quelques clics et presentez votre QR code lors du retrait. Simple, rapide, sans contact.',
    backgroundColor: AppColors.orange100,
    iconColor: AppColors.orange600,
  ),
  _OnboardingPage(
    icon: Icons.favorite,
    title: 'Agissez pour la planete',
    subtitle:
        'Chaque panier sauve, c\'est 1,2 kg de CO2 evite. Ensemble, protegeon notre belle ile Maurice !',
    backgroundColor: AppColors.green100,
    iconColor: AppColors.green900,
  ),
];

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pageController = PageController();
  int _currentPage = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onNext() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _onGetStarted();
    }
  }

  void _onSkip() {
    _onGetStarted();
  }

  Future<void> _onGetStarted() async {
    await ref.read(authStateProvider.notifier).completeOnboarding();
    if (mounted) {
      context.goNamed(RouteNames.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isLast = _currentPage == _pages.length - 1;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Skip button
            Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: isLast
                    ? const SizedBox.shrink()
                    : Semantics(
                        button: true,
                        label: 'Passer l\'introduction',
                        child: TextButton(
                          onPressed: _onSkip,
                          child: const Text('Passer'),
                        ),
                      ),
              ),
            ),
            // Pages
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _pages.length,
                onPageChanged: (index) =>
                    setState(() => _currentPage = index),
                itemBuilder: (context, index) {
                  return _OnboardingPageView(page: _pages[index]);
                },
              ),
            ),
            // Page indicator dots
            Padding(
              padding:
                  const EdgeInsets.symmetric(vertical: AppSpacing.md),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_pages.length, (index) {
                  final isActive = index == _currentPage;
                  return Semantics(
                    label:
                        'Page ${index + 1} sur ${_pages.length}${isActive ? ", page actuelle" : ""}',
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: isActive ? 24 : 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: isActive
                            ? AppColors.green700
                            : AppColors.neutral200,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  );
                }),
              ),
            ),
            // Navigation buttons
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.sm,
                AppSpacing.md,
                AppSpacing.lg,
              ),
              child: Column(
                children: [
                  Semantics(
                    button: true,
                    label: isLast ? 'Commencer' : 'Suivant',
                    child: ElevatedButton(
                      onPressed: _onNext,
                      child: Text(isLast ? 'Commencer' : 'Suivant'),
                    ),
                  ),
                  if (!isLast) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      '${_currentPage + 1} / ${_pages.length}',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardingPageView extends StatelessWidget {
  const _OnboardingPageView({required this.page});

  final _OnboardingPage page;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Illustration circle
          Container(
            width: 180,
            height: 180,
            decoration: BoxDecoration(
              color: page.backgroundColor,
              shape: BoxShape.circle,
            ),
            child: Icon(
              page.icon,
              size: 96,
              color: page.iconColor,
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          Text(
            page.title,
            style: theme.textTheme.displayLarge?.copyWith(
              color: AppColors.green900,
              fontWeight: FontWeight.w800,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            page.subtitle,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: AppColors.textSecondary,
              height: 1.6,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
