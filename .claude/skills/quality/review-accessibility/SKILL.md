---
name: review-accessibility
description: Audit WCAG 2.1 AA pour un composant/écran (ADR-032)
argument-hint: <component-or-screen>
---

# Review Accessibility

Audit WCAG 2.1 AA pour `$ARGUMENTS` (ADR-032).

## Checklist WCAG AA

### Perceivable (Percevoir)

- [ ] **1.1.1** Images : `alt` text ou `aria-label` (pas de `alt=""` sauf décoratif)
- [ ] **1.3.1** Structure : headings hiérarchiques (h1 > h2 > h3), landmarks
- [ ] **1.4.1** Couleur : information pas transmise uniquement par la couleur
- [ ] **1.4.3** Contraste : texte ≥ 4.5:1, grands textes ≥ 3:1
- [ ] **1.4.4** Resize : contenu lisible à 200% zoom
- [ ] **1.4.11** Non-text contrast : UI components ≥ 3:1

### Operable (Utiliser)

- [ ] **2.1.1** Clavier : tout est accessible au clavier (Tab, Enter, Escape, Espace)
- [ ] **2.1.2** Pas de piège clavier (on peut toujours sortir)
- [ ] **2.4.1** Skip links : lien "Skip to main content"
- [ ] **2.4.3** Focus order : ordre logique de tabulation
- [ ] **2.4.4** Link purpose : liens descriptifs (pas "cliquez ici")
- [ ] **2.4.7** Focus visible : indicateur de focus visible
- [ ] **2.5.5** Touch target : minimum 44x44 CSS px (48x48 recommandé)

### Understandable (Comprendre)

- [ ] **3.1.1** Langue : `lang="fr"` sur l'élément html
- [ ] **3.2.1** On focus : pas de changement de contexte au focus
- [ ] **3.3.1** Error identification : messages d'erreur clairs
- [ ] **3.3.2** Labels : chaque input a un label associé

### Robust

- [ ] **4.1.1** Parsing : HTML/JSX valide
- [ ] **4.1.2** Name/Role/Value : rôles ARIA corrects, states mis à jour

## Outils de vérification

### React (Storybook a11y addon)
```bash
# Le addon @storybook/addon-a11y vérifie axe-core automatiquement
npm run storybook
# Onglet "Accessibility" dans chaque story
```

### Flutter
```dart
// Dans les widget tests
testWidgets('has correct semantics', (tester) async {
  await tester.pumpWidget(widget);
  expect(tester.getSemantics(find.byType(Widget)), matchesSemantics(...));
});
```

### Contraste
Vérifier avec un outil en ligne ou `npx @axe-core/cli <url>`.

## Format du rapport

```markdown
## Accessibility Audit — <component>

### Violations
- 🔴 **1.4.3** Contraste insuffisant : texte gris #999 sur fond #F7F4EF (ratio 2.8:1, min 4.5:1)
  → Utiliser #666 minimum
- 🟡 **2.5.5** Touch target 36x36 sur le bouton favoris (min 44x44)
  → Augmenter à 48x48

### Verdict : ✅ Conforme AA | ⚠️ Corrections mineures | ❌ Non conforme
```
