---
name: create-flutter-form
description: Crée un formulaire Flutter avec validation + i18n erreurs
argument-hint: <FormName>
---

# Create Flutter Form

Crée un formulaire Flutter `$ARGUMENTS` avec validation et messages i18n.

## Étape 1 — Créer le widget formulaire

Fichier : `lib/features/<feature>/widgets/<form_name>_form.dart`

```dart
class <FormName>Form extends ConsumerStatefulWidget {
  const <FormName>Form({super.key, this.onSubmit});
  final void Function(<FormData> data)? onSubmit;

  @override
  ConsumerState<<FormName>Form> createState() => _<FormName>FormState();
}

class _<FormName>FormState extends ConsumerState<<FormName>Form> {
  final _formKey = GlobalKey<FormState>();
  bool _isSubmitting = false;

  // Controllers
  late final _nameController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          TextFormField(
            controller: _nameController,
            decoration: InputDecoration(
              labelText: context.t.<feature>.<form>.nameLabel,
              hintText: context.t.<feature>.<form>.nameHint,
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return context.t.validation.required;
              }
              if (value.length < 2) {
                return context.t.validation.minLength(min: 2);
              }
              return null;
            },
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          // ... autres champs
          ElevatedButton(
            onPressed: _isSubmitting ? null : _submit,
            child: _isSubmitting
                ? const CircularProgressIndicator()
                : Text(context.t.common.submit),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    try {
      widget.onSubmit?.call(<FormData>(name: _nameController.text.trim()));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}
```

## Étape 2 — Messages de validation i18n

Dans `lib/i18n/strings_fr.i18n.yaml` :
```yaml
validation:
  required: Ce champ est obligatoire
  minLength: Minimum {min} caractères
  maxLength: Maximum {max} caractères
  email: Adresse email invalide
  phone: Numéro de téléphone invalide
```

## Étape 3 — Accessibilité

- `labelText` sur tous les champs (pas juste `hintText`)
- Messages d'erreur liés au champ via `errorText`
- Focus order logique (`textInputAction: TextInputAction.next`)
- Bouton submit désactivé pendant le chargement

## Étape 4 — Tests

- Tester la validation (champs vides, trop courts, invalides)
- Tester la soumission réussie
- Tester l'état de chargement pendant la soumission
- Tester l'accessibilité (labels, error messages)

## Validation

- [ ] Tous les champs ont un `labelText`
- [ ] Validation côté client sur chaque champ
- [ ] Messages d'erreur internationalisés
- [ ] État de chargement pendant la soumission
- [ ] Tests passent
