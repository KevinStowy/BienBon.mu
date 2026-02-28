---
name: create-flutter-widget
description: Crée un widget Flutter avec Semantics (a11y WCAG AA)
argument-hint: <WidgetName>
---

# Create Flutter Widget

Crée un widget Flutter `$ARGUMENTS` accessible et conforme au design system.

## Étape 1 — Créer le widget

Fichier : `lib/shared/widgets/<widget_name>.dart` (partagé) ou `lib/features/<feature>/widgets/<widget_name>.dart` (spécifique)

```dart
import 'package:flutter/material.dart';

class <WidgetName> extends StatelessWidget {
  const <WidgetName>({
    super.key,
    required this.label,
    this.onTap,
  });

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      button: onTap != null,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
          // ... design
        ),
      ),
    );
  }
}
```

## Étape 2 — Design System tokens

Utiliser les tokens du `DESIGN_SYSTEM.md` :
- Couleurs : `Theme.of(context).colorScheme` mappé aux tokens
- Typo : `Theme.of(context).textTheme` (Nunito, 8 styles)
- Espacement : multiples de 8 (`const double kSpacing = 8.0`)
- Coins : 8px (cards), 12px (buttons), 24px (bottom sheets)

## Étape 3 — Accessibilité (ADR-032)

- `Semantics` wrapper avec label descriptif
- `excludeSemantics: true` sur les éléments décoratifs
- Touch targets minimum 48x48 dp
- `Tooltip` sur les icônes seules

## Étape 4 — Tests

Fichier : `test/shared/widgets/<widget_name>_test.dart`

```dart
testWidgets('renders correctly', (tester) async {
  await tester.pumpWidget(MaterialApp(home: <WidgetName>(label: 'Test')));
  expect(find.text('Test'), findsOneWidget);
});

testWidgets('has correct semantics', (tester) async {
  await tester.pumpWidget(MaterialApp(home: <WidgetName>(label: 'Test')));
  expect(tester.getSemantics(find.byType(<WidgetName>)), matchesSemantics(label: 'Test'));
});

testWidgets('tap triggers callback', (tester) async {
  var tapped = false;
  await tester.pumpWidget(MaterialApp(home: <WidgetName>(label: 'Test', onTap: () => tapped = true)));
  await tester.tap(find.byType(<WidgetName>));
  expect(tapped, isTrue);
});
```

## Validation

- [ ] Widget rend correctement
- [ ] Semantics en place (label, rôle)
- [ ] Touch target ≥ 48x48
- [ ] Tokens design system utilisés
- [ ] Tests widget passent
