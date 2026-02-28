---
name: add-i18n
description: Ajoute une clé de traduction (slang Flutter / i18next React) en FR/EN/MFE
argument-hint: <key-path> <text-fr>
---

# Add i18n

Ajoute une clé de traduction `$ARGUMENTS` dans les 3 locales (ADR-015).

## Flutter (slang)

### Étape 1 — Ajouter dans strings_fr.i18n.yaml (source)

```yaml
# lib/i18n/strings_fr.i18n.yaml
feature:
  screen:
    title: "Titre en français"
    description: "Description en français"
    button:
      submit: "Valider"
      cancel: "Annuler"
```

### Étape 2 — Ajouter dans strings_en.i18n.yaml

```yaml
feature:
  screen:
    title: "English title"
    description: "English description"
```

### Étape 3 — Ajouter dans strings_mfe.i18n.yaml (créole mauricien)

```yaml
feature:
  screen:
    title: "Tit an kreol"
    description: "Deskripson an kreol"
```

### Étape 4 — Générer le code

```bash
dart run slang
```

### Utilisation

```dart
Text(context.t.feature.screen.title)
```

### Pluralisation

```yaml
basket:
  count(param=count):
    one: "{count} panier"
    other: "{count} paniers"
```

## React (i18next)

### Étape 1 — Ajouter dans fr.json

```json
{
  "feature": {
    "screen": {
      "title": "Titre en français"
    }
  }
}
```

### Étape 2 — en.json et mfe.json

Idem pour les 2 autres locales.

### Utilisation

```typescript
const { t } = useTranslation();
<span>{t('feature.screen.title')}</span>
```

## Conventions

- Clés structurées : `<feature>.<screen>.<element>`
- Français = locale par défaut
- Créole mauricien (MFE) : adapter au registre local, pas du français traduit mot-à-mot
- Pas de texte hardcodé dans les composants

## Validation

- [ ] Clé ajoutée dans les 3 locales (fr, en, mfe)
- [ ] Code généré (slang) ou fichier JSON mis à jour (i18next)
- [ ] Utilisé dans le composant via `context.t.` ou `t()`
