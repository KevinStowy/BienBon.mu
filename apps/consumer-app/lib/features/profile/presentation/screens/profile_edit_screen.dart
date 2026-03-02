import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/filter_state.dart';
import '../../providers/profile_provider.dart';

/// Profile editing screen (US-C054, US-C055, US-C056, US-C057).
class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  ConsumerState<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  Set<String> _dietaryPrefs = {};
  String _language = 'fr';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Pre-fill from current profile
    final profileAsync = ref.read(profileProvider);
    profileAsync.whenData((p) {
      _firstNameController.text = p.firstName;
      _lastNameController.text = p.lastName;
      _phoneController.text = p.phone ?? '';
      _dietaryPrefs = Set.from(p.dietaryPreferences);
      _language = p.language;
    });
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _isLoading = true);
    await ref.read(profileProvider.notifier).updateProfile(
          firstName: _firstNameController.text.trim(),
          lastName: _lastNameController.text.trim(),
          phone: _phoneController.text.trim().isNotEmpty
              ? _phoneController.text.trim()
              : null,
          dietaryPreferences: _dietaryPrefs.toList(),
          language: _language,
        );
    if (mounted) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profil mis a jour'),
          backgroundColor: AppColors.green700,
        ),
      );
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Modifier le profil'),
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
            // Personal info
            Text('Informations personnelles',
                style: theme.textTheme.headlineLarge),
            const SizedBox(height: AppSpacing.md),
            Semantics(
              label: 'Prenom',
              textField: true,
              child: TextField(
                controller: _firstNameController,
                decoration: const InputDecoration(
                  labelText: 'Prenom',
                  prefixIcon: Icon(Icons.person),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Semantics(
              label: 'Nom',
              textField: true,
              child: TextField(
                controller: _lastNameController,
                decoration: const InputDecoration(
                  labelText: 'Nom',
                  prefixIcon: Icon(Icons.person_outline),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Semantics(
              label: 'Telephone',
              textField: true,
              child: TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Telephone',
                  prefixIcon: Icon(Icons.phone),
                  hintText: '+230 5XXX XXXX',
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            // Dietary preferences (US-C055)
            Text('Preferences alimentaires',
                style: theme.textTheme.headlineLarge),
            const SizedBox(height: AppSpacing.md),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: DietaryTags.all.map((tag) {
                final isSelected = _dietaryPrefs.contains(tag);
                return Semantics(
                  button: true,
                  selected: isSelected,
                  label: '$tag${isSelected ? ", selectionne" : ""}',
                  child: FilterChip(
                    label: Text(tag),
                    selected: isSelected,
                    onSelected: (v) {
                      setState(() {
                        if (v) {
                          _dietaryPrefs.add(tag);
                        } else {
                          _dietaryPrefs.remove(tag);
                        }
                      });
                    },
                    selectedColor: AppColors.green100,
                    checkmarkColor: AppColors.green700,
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.lg),
            // Language (US-C057)
            Text('Langue', style: theme.textTheme.headlineLarge),
            const SizedBox(height: AppSpacing.md),
            ...['fr', 'en', 'mfe'].map((lang) {
              final isSelected = _language == lang;
              final label = switch (lang) {
                'fr' => 'Francais',
                'en' => 'English',
                'mfe' => 'Kreol Morisien',
                _ => lang,
              };
              return Semantics(
                button: true,
                selected: isSelected,
                label: '$label${isSelected ? ", selectionne" : ""}',
                child: RadioListTile<String>(
                  value: lang,
                  groupValue: _language,
                  title: Text(label),
                  activeColor: AppColors.green700,
                  onChanged: (v) => setState(() => _language = v!),
                ),
              );
            }),
            const SizedBox(height: AppSpacing.xl),
            Semantics(
              button: true,
              label: 'Enregistrer les modifications',
              child: ElevatedButton(
                onPressed: _isLoading ? null : _save,
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.white,
                        ),
                      )
                    : const Text('Enregistrer'),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],
        ),
      ),
    );
  }
}
