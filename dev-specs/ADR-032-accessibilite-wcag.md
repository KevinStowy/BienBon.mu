# ADR-032 : Accessibilite WCAG -- strategie multi-plateforme

| Champ         | Valeur                                                                  |
|---------------|-------------------------------------------------------------------------|
| **Statut**    | Propose                                                                 |
| **Date**      | 2026-02-27                                                              |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                                     |
| **Decideurs** | Equipe technique BienBon                                                |
| **Scope**     | Flutter (consumer + partner), React (admin + Storybook), Astro (site vitrine), Design System |
| **Prereqs**   | ADR-002 (architecture), ADR-015 (i18n), DESIGN_SYSTEM.md               |
| **Refs**      | WCAG 2.1, Section 508, EN 301 549, ADR-015, ADR-023 (tests), ADR-025 (CI/CD), ADR-026 (qualite code) |

---

## 1. Contexte

### 1.1 Pourquoi cette ADR est necessaire

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. L'application cible un public large : consommateurs de tous ages, partenaires commercants, administrateurs. L'accessibilite n'est pas un "nice-to-have" mais un engagement envers l'inclusivite -- coherent avec la mission sociale de reduction du gaspillage alimentaire.

L'accessibilite impacte chaque composant, chaque ecran, chaque interaction. Comme pour l'i18n (ADR-015), retro-fitter l'accessibilite dans une codebase existante coute 5 a 10 fois plus cher que de l'integrer des le depart. Cette ADR definit les regles, les outils et les processus pour garantir l'accessibilite sur les 4 plateformes de BienBon :

| Plateforme | Technologie | Utilisateurs |
|------------|-------------|-------------|
| App consommateur | Flutter (iOS + Android) | Grand public mauricien |
| App partenaire | Flutter (iOS + Android) | Commercants, restaurateurs |
| Admin web | React + Vite + Storybook | Equipe interne BienBon |
| Site vitrine | Astro | Visiteurs web, prospects |

### 1.2 Cadre legal a Maurice

L'ile Maurice ne dispose pas de legislation specifique sur l'accessibilite web ou mobile (pas d'equivalent du ADA americain, du EAA europeen ou du RGAA francais). Cependant :

- La **Disability Act 2012** de Maurice interdit la discrimination envers les personnes en situation de handicap, sans exigences techniques specifiques pour le numerique.
- L'ile Maurice est signataire de la **Convention des Nations Unies relative aux droits des personnes handicapees** (CRPD).
- L'**Information and Communication Technologies Authority (ICTA)** n'impose pas de normes d'accessibilite web.

**L'absence de contrainte legale ne signifie pas l'absence de raison d'agir.** L'accessibilite est :

1. **Un avantage concurrentiel** : aucune app de food tech a Maurice ne priorise l'accessibilite. Etre le premier positionne BienBon comme leader responsable.
2. **Un elargissement du marche** : ~15% de la population mondiale vit avec une forme de handicap (OMS). A Maurice, les donnees specifiques sont limitees, mais le vieillissement de la population (16% de 60+ en 2025) rend l'accessibilite de plus en plus pertinente.
3. **Un standard de qualite** : les pratiques d'accessibilite ameliorent l'UX pour TOUS les utilisateurs (contraste, tailles tactiles, navigation clavier).
4. **Une preparation reglementaire** : si Maurice adopte des normes d'accessibilite numerique (tendance mondiale), BienBon sera deja conforme.

### 1.3 Niveau cible : WCAG 2.1 AA

Nous ciblons le **niveau AA des WCAG 2.1** (Web Content Accessibility Guidelines) comme standard minimum pour toutes les plateformes.

#### Pourquoi AA et pas AAA ?

| Critere | AA | AAA |
|---------|:--:|:---:|
| Ratio de contraste texte normal | 4.5:1 | 7:1 |
| Ratio de contraste texte large (>= 18px bold / >= 24px) | 3:1 | 4.5:1 |
| Faisabilite pour une startup | Realiste | Extremement contraignant |
| Adoption dans l'industrie | Standard mondial | Rarement atteint globalement |
| Impact sur le design | Compatible avec le branding | Requiert des compromis visuels majeurs |

**Justification du choix AA :**

1. **AAA est le "gold standard" mais est inaccessible en pratique** : le W3C lui-meme indique qu'il "n'est pas possible de satisfaire tous les criteres AAA pour certains contenus". Le niveau AAA impose des contraintes (contraste 7:1, pas de texte en image, comprehension de lecture avancee) qui sont incompatibles avec un design system riche et colore.
2. **AA est le standard legal dans les pays qui legifèrent** : ADA (USA), EAA (Europe), RGAA (France) ciblent tous le niveau AA. C'est le consensus international.
3. **AA couvre les besoins les plus courants** : contraste suffisant pour la majorite des deficiences visuelles, navigation clavier complete, compatibilite lecteurs d'ecran, tailles tactiles adequates.
4. **Strategie progressive** : nous visons AA sur l'ensemble, avec des criteres AAA atteints "par defaut" la ou c'est possible sans compromis (ex. : les textes Neutral 900 sur White atteignent 17.40:1, bien au-dela de AAA).

---

## 2. Flutter accessibility (apps consumer + partner)

### 2.1 Semantics widgets obligatoires

Flutter possede un arbre semantique (`Semantics tree`) distinct du render tree, qui est utilise par les technologies d'assistance (TalkBack, VoiceOver). Chaque widget interactif ou informatif doit contribuer correctement a cet arbre.

#### Regles obligatoires

| Widget | Quand l'utiliser | Exemple |
|--------|-----------------|---------|
| `Semantics` | Ajouter un label, une description ou un role semantique a un widget | `Semantics(label: 'Panier de La Pizzetta, 3.99 roupies', child: StoreCard(...))` |
| `ExcludeSemantics` | Exclure un widget decoratif de l'arbre semantique | `ExcludeSemantics(child: DecorativeGreenLeaf())` |
| `MergeSemantics` | Regrouper plusieurs widgets en une seule entite semantique | `MergeSemantics(child: Row(children: [Icon(star), Text('4.8')]))` |
| `Semantics.fromProperties` | Quand on a besoin de plusieurs proprietes semantiques | Boutons complexes, cartes interactives |

#### Bonnes pratiques

```dart
// BON : Image avec semanticLabel
Image.asset(
  'assets/store_photo.jpg',
  semanticLabel: 'Photo de la boulangerie La Mie Doree',
)

// BON : Icone avec semanticLabel
Icon(
  Icons.favorite,
  semanticLabel: 'Ajouter aux favoris',
)

// BON : Regrouper une carte pour le lecteur d'ecran
MergeSemantics(
  child: StoreCard(
    storeName: 'La Pizzetta',
    rating: 4.8,
    price: 3.99,
  ),
)

// BON : Bouton avec label explicite
Semantics(
  button: true,
  label: 'Reserver ce panier pour 3.99 roupies',
  child: CTAButton(text: 'Reserver'),
)

// MAUVAIS : Image decorative sans ExcludeSemantics
Image.asset('assets/bg_pattern.png') // Le lecteur d'ecran va lire le nom du fichier

// BON : Image decorative exclue
ExcludeSemantics(
  child: Image.asset('assets/bg_pattern.png'),
)
```

### 2.2 Navigation par lecteur d'ecran

#### TalkBack (Android) et VoiceOver (iOS)

| Aspect | Exigence | Implementation |
|--------|----------|----------------|
| Ordre de navigation | Logique et previsible (haut-bas, gauche-droite) | `Semantics(sortKey: OrdinalSortKey(n))` si l'ordre naturel du widget tree n'est pas suffisant |
| Annonces dynamiques | Les changements d'etat doivent etre annonces | `SemanticsService.announce('Panier ajoute aux favoris', TextDirection.ltr)` |
| Actions custom | Les gestes complexes doivent avoir des alternatives | `Semantics(onTap: ..., onLongPress: ..., customSemanticsActions: ...)` |
| Focus trap | Les modals et bottom sheets doivent pieger le focus | Utiliser `ModalBarrier` + `FocusScope` |
| Navigation retour | Le bouton retour doit fermer les overlays avant de naviguer | `WillPopScope` / `PopScope` avec gestion semantique |

#### Focus order

L'ordre de focus doit suivre la hierarchie visuelle de chaque ecran. Pour l'ecran Explorer (consumer) :

1. Header (logo, avatar)
2. Hero banner (titre, barre de recherche)
3. Categories (scroll horizontal)
4. Section "Pres de chez moi" (titre, lien "Nout >>")
5. Grille de cartes (carte par carte, de gauche a droite, de haut en bas)
6. Navigation basse (Explorer, Carte, Favoris, Mes paniers)

Si l'ordre naturel du widget tree ne correspond pas, utiliser `Semantics(sortKey: OrdinalSortKey(n))`.

### 2.3 Touch targets minimum 48x48dp

Tous les elements interactifs doivent avoir une zone tactile d'au moins **48x48dp** (density-independent pixels). C'est la recommandation WCAG 2.1 (critere 2.5.8 niveau AA pour 24x24 CSS pixels, mais les Material Design Guidelines recommandent 48dp et nous suivons cette recommendation plus stricte).

| Composant actuel | Taille visuelle | Zone tactile requise | Action |
|-----------------|:---------------:|:-------------------:|--------|
| Bouton Favori | 32x32px | 48x48dp | Agrandir la zone tactile avec `padding` ou `GestureDetector` |
| Etoiles notation | 12px | 48x48dp | Non interactif en consultation (OK). En saisie, agrandir. |
| Chips categorie | 72x72px | 48x48dp | OK |
| Tab nav | 64px hauteur | 48x48dp | OK (toute la zone du tab est cliquable) |
| Barre de recherche | 48px | 48x48dp | OK |
| Avatar | 40px | 48x48dp | Agrandir la zone tactile |

```dart
// BON : Zone tactile elargie pour un petit bouton
SizedBox(
  width: 48,
  height: 48,
  child: Center(
    child: FavoriteButton(size: 32), // Visuel 32px, tactile 48px
  ),
)

// Ou avec Material :
IconButton(
  iconSize: 32,
  constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
  icon: const Icon(Icons.favorite_border),
  onPressed: () {},
)
```

### 2.4 Contraste de couleurs

Voir la section 6 (Design system compliance) pour l'audit complet des contrastes. Les couleurs du design system sont globalement conformes pour les textes importants, mais certaines combinaisons requierent une attention particuliere dans Flutter :

- **Green 500 sur blanc** : ratio 2.78:1 -- FAIL AA. Ne pas utiliser comme couleur de texte. OK uniquement pour les icones decoratives accompagnees d'un label textuel conforme.
- **Orange 500 sur blanc** : ratio 2.16:1 -- FAIL AA. Les etoiles de notation doivent etre accompagnees du texte de la note (ex. "4.8") dans une couleur conforme (Neutral 900).
- **Texte blanc sur gradient Pickup Badge** : la partie claire du gradient (#66BB6A) donne un ratio de 2.36:1 -- FAIL. Voir les recommandations section 6.

### 2.5 Texte scalable

L'application doit respecter les parametres systeme de taille de police. Flutter utilise `MediaQuery.textScaleFactor` (deprecated) puis `MediaQuery.textScaler` (Flutter 3.16+).

```dart
// BON : Utiliser TextScaler pour adapter le texte
final textScaler = MediaQuery.textScalerOf(context);

// BON : Ne pas limiter le scaling
Text('Panier surprise', style: theme.textTheme.headlineMedium)

// MAUVAIS : Bloquer le scaling
MediaQuery(
  data: MediaQuery.of(context).copyWith(textScaler: TextScaler.noScaling),
  child: child, // Interdit !
)

// ATTENTION : Gerer le depassement (overflow) pour les textes longs en scaling x2
Text(
  'Recuperer aujourd\'hui de 12:00 - 14:00',
  overflow: TextOverflow.ellipsis,
  maxLines: 2, // Permettre 2 lignes en cas de scaling
)
```

**Regles :**
- Ne JAMAIS desactiver le `textScaler` globalement.
- Tester chaque ecran avec un facteur de scaling x1.5 et x2.0.
- Les layouts doivent etre flexibles (`Flexible`, `Expanded`, `Wrap`) et non de taille fixe pour s'adapter au texte agrandi.
- Utiliser `FittedBox` avec parcimonie : il peut rendre le texte illisible en le reduisant.

### 2.6 Animations reduites

```dart
// Verifier la preference systeme
final reduceMotion = MediaQuery.disableAnimationsOf(context);

// Adapter les animations
AnimatedContainer(
  duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 300),
  curve: Curves.easeOut,
  // ...
)

// Pour les animations complexes (Lottie, Rive, Hero, etc.)
if (!reduceMotion) {
  // Animation complete
} else {
  // Etat final sans animation, ou transition instantanee
}
```

**Regles :**
- Toutes les animations du design system (section 10 de DESIGN_SYSTEM.md) doivent respecter `MediaQuery.disableAnimationsOf(context)`.
- Les animations essentielles a la comprehension (ex. : progression d'un chargement) peuvent etre conservees en mode reduit, mais simplifiees.
- Les animations decoratives (parallax hero, bounce favori) doivent etre completement desactivees.

### 2.7 Tests d'accessibilite en CI

| Outil | Usage | Integration |
|-------|-------|-------------|
| `flutter test --accessibility` | Verifie les semantics de base | CI sur chaque PR |
| `accessibility_scanner` (package) | Audit automatise des touch targets, contrastes, labels | CI sur chaque PR |
| Patrol (integration tests) | Tests end-to-end avec verification des Semantics | CI nightly |
| TalkBack / VoiceOver | Test manuel sur devices reels | Test trimestriel (voir section 8) |

```yaml
# Extrait du pipeline CI (GitHub Actions)
- name: Flutter accessibility tests
  run: |
    flutter test --accessibility
    flutter test integration_test/accessibility/

- name: Accessibility scanner
  run: |
    flutter pub run accessibility_scanner --threshold 95
```

---

## 3. React accessibility (admin + Storybook)

### 3.1 ARIA landmarks, roles et labels

Chaque page de l'admin doit avoir une structure semantique claire :

```tsx
// Structure type d'une page admin
<div role="application" aria-label="BienBon Administration">
  <header role="banner">
    <nav role="navigation" aria-label="Navigation principale">
      {/* Menu latéral */}
    </nav>
  </header>

  <main role="main" aria-label="Gestion des partenaires">
    <h1>Partenaires</h1>
    {/* Contenu principal */}
  </main>

  <aside role="complementary" aria-label="Filtres">
    {/* Panneau de filtres */}
  </aside>
</div>
```

#### Regles ARIA

| Regle | Description | Exemple |
|-------|------------|---------|
| Pas d'ARIA si HTML natif suffit | Utiliser `<button>` au lieu de `<div role="button">` | `<button onClick={...}>` et non `<div role="button" tabIndex={0} onClick={...} onKeyDown={...}>` |
| Labels sur les inputs | Tout champ doit avoir un label associe | `<label htmlFor="search">` ou `aria-label` |
| Live regions | Annoncer les changements dynamiques | `aria-live="polite"` pour les toasts, `aria-live="assertive"` pour les erreurs |
| States | Communiquer l'etat des composants interactifs | `aria-expanded`, `aria-selected`, `aria-checked`, `aria-disabled` |
| Descriptions | Fournir du contexte supplementaire | `aria-describedby` pour les instructions de formulaire |

### 3.2 Navigation clavier complete

Tout l'admin doit etre 100% operable au clavier :

| Touche | Action |
|--------|--------|
| `Tab` / `Shift+Tab` | Naviguer entre les elements interactifs |
| `Enter` / `Space` | Activer un bouton, ouvrir un lien |
| `Escape` | Fermer un modal, drawer, dropdown, toast |
| `Arrow keys` | Naviguer dans les menus, tabs, listes, tableaux |
| `Home` / `End` | Premier / dernier element d'une liste |

```tsx
// BON : Composant navigable au clavier
function AdminTabs({ tabs, activeTab, onTabChange }: AdminTabsProps) {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowRight':
        onTabChange((index + 1) % tabs.length);
        break;
      case 'ArrowLeft':
        onTabChange((index - 1 + tabs.length) % tabs.length);
        break;
      case 'Home':
        onTabChange(0);
        break;
      case 'End':
        onTabChange(tabs.length - 1);
        break;
    }
  };

  return (
    <div role="tablist" aria-label="Sections administration">
      {tabs.map((tab, i) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={i === activeTab}
          aria-controls={`panel-${tab.id}`}
          tabIndex={i === activeTab ? 0 : -1}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onClick={() => onTabChange(i)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### 3.3 Focus management

#### Modals

```tsx
// Le focus doit etre piege dans le modal
function AccessibleModal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      // Focus le premier element focusable dans le modal
      modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )?.focus();
    } else {
      // Restaurer le focus a l'element precedent
      previousFocus.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={modalRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
        // Trap focus logic...
      }}
    >
      <h2 id="modal-title">{title}</h2>
      {children}
    </div>
  );
}
```

#### Drawers et toasts

| Composant | Focus a l'ouverture | Focus a la fermeture | Annonce |
|-----------|--------------------|--------------------|---------|
| Modal | Premier element focusable du modal | Element qui a ouvert le modal | `aria-modal="true"` |
| Drawer | Premier element du drawer | Bouton qui a ouvert le drawer | `aria-modal="true"` |
| Toast | Ne deplace pas le focus | N/A | `aria-live="polite"` ou `role="status"` |
| Alert / Erreur | Ne deplace pas le focus | N/A | `aria-live="assertive"` ou `role="alert"` |
| Dropdown | Premier item du menu | Bouton qui a ouvert le menu | `aria-expanded="true"` |

### 3.4 Storybook a11y addon : passage de 'todo' a 'error'

Le Storybook du projet a deja l'addon `@storybook/addon-a11y` installe (actuellement en mode `'todo'`). La strategie de migration vers le mode `'error'` est progressive :

| Phase | Echeance | Mode | Action |
|-------|----------|------|--------|
| Phase 1 | Immediate | `todo` | Corriger les violations existantes sur les composants actuels (Avatar, Badge, BottomNav, Button, CategoryChip, FavoriteButton, Header, HeroBanner, PickupBadge, Price, Rating, SearchBar, SectionHeader, StoreCard) |
| Phase 2 | Sprint suivant | `warn` | Passer en mode `warn` -- les violations apparaissent comme warnings dans Storybook |
| Phase 3 | +1 mois | `error` | Passer en mode `error` -- les violations bloquent la story |

```typescript
// .storybook/preview.ts -- Phase 3 (cible)
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    a11y: {
      // Mode 'error' : les violations a11y font echouer la story
      mode: 'error',
    },
  },
};

export default preview;
```

**Pour chaque composant existant, les corrections a11y incluent :**
- Verifier que tous les `<img>` ont un `alt`
- Verifier que les elements interactifs sont des `<button>` ou `<a>` natifs
- Ajouter les `aria-label` manquants sur les icones sans texte visible
- Verifier les contrastes de couleurs dans chaque variant de story

### 3.5 ESLint plugin jsx-a11y

Ajouter `eslint-plugin-jsx-a11y` a la configuration ESLint existante (flat config) :

```bash
npm install --save-dev eslint-plugin-jsx-a11y
```

```typescript
// eslint.config.js (extrait)
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  // ... config existante ...
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // Regles recommandees activees en 'error'
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-access-key': 'error',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'error',
      'jsx-a11y/no-noninteractive-tabindex': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',
    },
  },
];
```

---

## 4. Astro (site vitrine) accessibility

### 4.1 HTML semantique

Le site vitrine Astro doit utiliser les elements HTML5 semantiques pour structurer chaque page :

```astro
---
// Layout.astro
---
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BienBon.mu - Paniers anti-gaspi a Maurice</title>
  </head>
  <body>
    <!-- Skip navigation -->
    <a href="#main-content" class="skip-link">
      Aller au contenu principal
    </a>

    <header>
      <nav aria-label="Navigation principale">
        <!-- Logo, menu -->
      </nav>
    </header>

    <main id="main-content">
      <slot />
    </main>

    <footer>
      <nav aria-label="Navigation pied de page">
        <!-- Liens legaux, reseaux sociaux -->
      </nav>
    </footer>
  </body>
</html>
```

### 4.2 Skip navigation link

Le lien "skip to content" est obligatoire. Il est visuellement masque mais accessible au clavier :

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  padding: 8px 16px;
  background: var(--color-green-900);
  color: white;
  z-index: 1000;
  font-weight: 700;
}

.skip-link:focus {
  top: 0;
}
```

### 4.3 Images et alt text

| Type d'image | Attribut `alt` | Exemple |
|-------------|----------------|---------|
| Image informative | Description du contenu | `alt="Un panier de fruits et legumes frais"` |
| Image decorative | Vide | `alt=""` ou `role="presentation"` |
| Logo | Nom de la marque | `alt="BienBon.mu"` |
| Mascotte Dodo | Description contextuelle | `alt="Dodo, la mascotte BienBon, vous salue"` |
| Image dans un lien | Description de la destination | `alt="Telecharger l'app sur l'App Store"` |
| Screenshots app | Description de l'ecran | `alt="Ecran de l'app montrant les paniers disponibles pres de chez vous"` |

### 4.4 Formulaires accessibles

Le site vitrine peut contenir des formulaires (newsletter, contact, inscription partenaire) :

```astro
<form aria-labelledby="form-title">
  <h2 id="form-title">Inscrivez-vous a la newsletter</h2>

  <div>
    <label for="email">Adresse email</label>
    <input
      type="email"
      id="email"
      name="email"
      required
      aria-required="true"
      aria-describedby="email-hint"
      aria-invalid={hasError ? "true" : undefined}
      aria-errormessage={hasError ? "email-error" : undefined}
    />
    <span id="email-hint">Nous ne partagerons jamais votre email.</span>
    {hasError && (
      <span id="email-error" role="alert">
        Veuillez entrer une adresse email valide.
      </span>
    )}
  </div>

  <button type="submit">S'inscrire</button>
</form>
```

**Regles pour les formulaires :**
- Chaque `<input>` doit avoir un `<label>` associe (via `for`/`id`)
- Les champs requis doivent avoir `aria-required="true"` ET l'attribut HTML `required`
- Les messages d'erreur doivent etre associes via `aria-errormessage` et avoir `role="alert"`
- Le focus doit etre deplace sur le premier champ en erreur apres soumission
- Les instructions (hints) doivent etre associees via `aria-describedby`

### 4.5 Contraste et taille de police

- Appliquer les memes regles de contraste que le design system (section 6)
- Taille de police minimum : 16px pour le body text (evite le zoom automatique sur iOS)
- Le texte doit etre redimensionnable jusqu'a 200% sans perte de contenu ou de fonctionnalite
- Ne pas utiliser de texte dans les images (sauf le logo)

---

## 5. Multilingual accessibility

### 5.1 Attribut `lang` correct

L'attribut `lang` est essentiel pour que les lecteurs d'ecran prononcent correctement le texte. Il doit etre defini a 3 niveaux :

| Niveau | Attribut | Exemple |
|--------|----------|---------|
| Page | `<html lang="fr">` | Change dynamiquement selon la langue choisie par l'utilisateur |
| Section | `lang="en"` sur un `<span>` | Pour un mot ou une phrase dans une langue differente du reste de la page |
| Flutter | `Locale('fr')` dans `MaterialApp` | `locale: Locale('fr')` / `locale: Locale.fromSubtags(languageCode: 'mfe')` |

**Codes de langue a utiliser :**

| Langue | Code HTML | Code Flutter | Code BCP 47 |
|--------|-----------|-------------|-------------|
| Francais | `fr` | `Locale('fr')` | `fr` |
| Anglais | `en` | `Locale('en')` | `en` |
| Creole mauricien | `mfe` | `Locale.fromSubtags(languageCode: 'mfe')` | `mfe` |

Conformement a ADR-015, le code ISO 639-3 `mfe` est utilise pour le creole mauricien (pas de code ISO 639-1 existant).

### 5.2 Lecteurs d'ecran et creole mauricien

Le creole mauricien (`mfe`) pose des defis specifiques avec les technologies d'assistance :

| Aspect | Realite | Impact | Solution |
|--------|---------|--------|----------|
| **Synthese vocale** | Aucun moteur TTS ne supporte nativement `mfe` | Le lecteur d'ecran ne peut pas prononcer correctement le creole | Fallback vers la voix francaise (`fr`), car le creole mauricien est a base lexicale francaise |
| **Reconnaissance du code `mfe`** | TalkBack et VoiceOver ne reconnaissent pas `mfe` | Le moteur TTS pourrait utiliser une voix par defaut inappropriee (anglais US) | Forcer le fallback `fr` dans la configuration TTS |
| **Orthographe** | Grafi Larmoni (2011), base phonetique | La pronunciation TTS francaise sera approximative mais comprehensible | Acceptable : 80%+ du vocabulaire creole est d'origine francaise |
| **Contenu mixte** | Les interfaces peuvent melanger creole et termes techniques en francais | Pas de conflit majeur (meme base phonetique) | Utiliser `lang="mfe"` pour la coherence, meme si le fallback est `fr` |

**Implementation Flutter :**

```dart
// Configuration du fallback TTS pour le creole mauricien
import 'package:flutter_tts/flutter_tts.dart';

Future<void> configureAccessibility(Locale appLocale) async {
  final tts = FlutterTts();

  if (appLocale.languageCode == 'mfe') {
    // Creole mauricien : fallback vers la voix francaise
    await tts.setLanguage('fr-FR');
  } else {
    await tts.setLanguage(appLocale.toLanguageTag());
  }
}
```

**Implementation web (Astro + React admin) :**

```html
<!-- Meme si le TTS fait un fallback, le lang doit etre correct semantiquement -->
<html lang="mfe">
<!-- Les navigateurs et outils d'analyse voient la bonne langue -->
```

### 5.3 Direction du texte

Les 3 langues de BienBon (francais, anglais, creole mauricien) sont toutes **LTR** (left-to-right). Aucune adaptation RTL n'est necessaire pour les langues actuelles.

Cependant, conformement a ADR-015, les proprietes CSS logiques (`margin-inline-start` au lieu de `margin-left`) et les widgets Flutter directionnels (`EdgeInsetsDirectional` au lieu de `EdgeInsets`) sont preferees pour faciliter un eventuel ajout de langue RTL.

---

## 6. Design system compliance -- audit des contrastes

### 6.1 Tableau complet des ratios de contraste

L'audit suivant couvre toutes les combinaisons couleur de texte / couleur de fond utilisees dans le design system (DESIGN_SYSTEM.md). Les ratios sont calcules selon la formule WCAG 2.1 (luminance relative).

#### Legende

- **AA Normal** : ratio >= 4.5:1 (texte < 18px bold / < 24px regular)
- **AA Large** : ratio >= 3:1 (texte >= 18px bold / >= 24px regular)

#### Combinaisons conformes (AA Normal)

| Texte | Fond | Ratio | AA Normal | AA Large | Usage dans le design system |
|-------|------|:-----:|:---------:|:--------:|----------------------------|
| Green 900 `#1B5E20` | White `#FFFFFF` | 7.87:1 | OK | OK | Titres, logo, prix |
| Green 900 `#1B5E20` | Neutral 50 `#F7F4EF` | 7.17:1 | OK | OK | Titres sur fond de page |
| Green 900 `#1B5E20` | Green 100 `#E8F5E9` | 7.00:1 | OK | OK | Badges categorie |
| Green 900 `#1B5E20` | Orange 100 `#FFF3E0` | 7.18:1 | OK | OK | Texte sur fond orange clair |
| Green 700 `#2E7D32` | White `#FFFFFF` | 5.13:1 | OK | OK | Lien "Nout >>", boutons texte |
| Green 700 `#2E7D32` | Neutral 50 `#F7F4EF` | 4.67:1 | OK | OK | Liens sur fond de page |
| Neutral 900 `#1A1A1A` | White `#FFFFFF` | 17.40:1 | OK | OK | Titres principaux, noms |
| Neutral 900 `#1A1A1A` | Neutral 50 `#F7F4EF` | 15.86:1 | OK | OK | Titres sur fond de page |
| Neutral 600 `#6B7280` | White `#FFFFFF` | 4.83:1 | OK | OK | Texte secondaire |
| White `#FFFFFF` | Green 700 `#2E7D32` | 5.13:1 | OK | OK | Texte boutons primaires |
| White `#FFFFFF` | Green 900 `#1B5E20` | 7.87:1 | OK | OK | Texte sur fond vert fonce |
| White `#FFFFFF` | Neutral 900 `#1A1A1A` | 17.40:1 | OK | OK | Texte sur fond sombre |

#### Combinaisons partiellement conformes (AA Large uniquement)

| Texte | Fond | Ratio | AA Normal | AA Large | Usage dans le design system |
|-------|------|:-----:|:---------:|:--------:|----------------------------|
| Orange 600 `#E65100` | White `#FFFFFF` | 3.79:1 | FAIL | OK | Titres hero (Display 24px 800w = "large text") |
| Orange 600 `#E65100` | Neutral 50 `#F7F4EF` | 3.45:1 | FAIL | OK | Nav active sur fond de page |
| Neutral 600 `#6B7280` | Neutral 50 `#F7F4EF` | 4.41:1 | FAIL | OK | Texte secondaire sur fond page (Body 14px) |
| White `#FFFFFF` | `#43A047` (gradient pickup sombre) | 3.30:1 | FAIL | OK | Pickup badge (partie sombre du gradient) |

#### Combinaisons non conformes (FAIL AA)

| Texte | Fond | Ratio | AA Normal | AA Large | Usage dans le design system |
|-------|------|:-----:|:---------:|:--------:|----------------------------|
| Green 500 `#4CAF50` | White `#FFFFFF` | 2.78:1 | FAIL | FAIL | Icones actives, coeurs favoris |
| Green 500 `#4CAF50` | Neutral 50 `#F7F4EF` | 2.53:1 | FAIL | FAIL | Icones sur fond page |
| Orange 500 `#FF9800` | White `#FFFFFF` | 2.16:1 | FAIL | FAIL | Etoiles notation |
| Orange 500 `#FF9800` | Neutral 50 `#F7F4EF` | 1.96:1 | FAIL | FAIL | Etoiles sur fond page |
| Neutral 400 `#9CA3AF` | White `#FFFFFF` | 2.54:1 | FAIL | FAIL | Placeholders, texte desactive |
| Neutral 400 `#9CA3AF` | Neutral 50 `#F7F4EF` | 2.31:1 | FAIL | FAIL | Placeholders sur fond page |
| White `#FFFFFF` | Green 500 `#4CAF50` | 2.78:1 | FAIL | FAIL | Texte sur icones/boutons verts clairs |
| White `#FFFFFF` | `#66BB6A` (gradient pickup clair) | 2.36:1 | FAIL | FAIL | Pickup badge (partie claire du gradient) |
| White `#FFFFFF` | `#4CAF50` (gradient CTA clair) | 2.78:1 | FAIL | FAIL | CTA button (partie claire du gradient) |

### 6.2 Recommandations pour les combinaisons non conformes

#### R1 : Green 500 (#4CAF50) -- icones et coeurs favoris

**Probleme** : Green 500 sur fond blanc ou creme n'atteint pas le ratio 3:1 minimum.

**Recommandation** : Green 500 est acceptable pour les **elements decoratifs non-textuels** (icones accompagnees d'un label, coeur favori avec etat annonce par le lecteur d'ecran). Pour les elements ou la couleur est le SEUL vecteur d'information, utiliser Green 700 (#2E7D32, ratio 5.13:1) a la place.

**Action** : Aucun changement necessaire si les icones Green 500 sont toujours accompagnees d'un texte ou d'un label ARIA dans une couleur conforme. Documenter cette exception dans les guidelines du design system.

#### R2 : Orange 600 (#E65100) -- titres hero, navigation active

**Probleme** : Orange 600 sur blanc donne un ratio de 3.79:1, insuffisant pour du texte normal (< 18px bold).

**Recommandation** : Orange 600 est conforme pour le **texte large** (>= 18px bold ou >= 24px regular). Dans le design system, Orange 600 est utilise pour :
- Titres hero : Display 24px ExtraBold (800w) -- c'est du **texte large** -> **AA OK** (3.79:1 >= 3:1).
- Labels navigation active : Nav Label 10px SemiBold (600w) -- c'est du **texte normal** -> **AA FAIL**.

**Action** : Pour les labels de navigation active (10px), passer de Orange 600 (`#E65100`) a une variante plus foncee, par exemple **Orange 800** (`#BF3600`, ratio ~5.5:1) ou utiliser Neutral 900 (`#1A1A1A`). Alternative : augmenter la taille des labels nav a 12px SemiBold pour se rapprocher du seuil "large text".

#### R3 : Orange 500 (#FF9800) -- etoiles de notation

**Probleme** : Orange 500 sur blanc donne un ratio de 2.16:1, echec total AA.

**Recommandation** : Les etoiles de notation sont des **elements graphiques non-textuels** (WCAG 1.4.11 -- ratio minimum 3:1 pour les elements graphiques). Meme a 3:1, Orange 500 echoue.

**Action** : Deux options :
1. **Remplacer Orange 500 par Orange 600 (#E65100)** pour les etoiles : ratio 3.79:1, conforme pour les elements graphiques (>= 3:1).
2. **Conserver Orange 500 pour les etoiles** mais s'assurer que la note numerique ("4.8") est toujours affichee a cote dans une couleur conforme (Neutral 900 ou Green 900). L'information n'est alors pas vehiculee uniquement par la couleur.

**Recommandation retenue** : Option 2 (pas de changement visuel) + option 1 en phase 2 si des retours utilisateurs le justifient.

#### R4 : Neutral 400 (#9CA3AF) -- placeholders et texte desactive

**Probleme** : Neutral 400 sur blanc donne un ratio de 2.54:1.

**Recommandation** : C'est intentionnel. Les placeholders et le texte desactive sont, par definition, des elements de faible importance. WCAG 2.1 (critere 1.4.3) exempte explicitement le **texte inactif ou desactive** et les **placeholders** des exigences de contraste.

**Action** : Aucun changement necessaire. Documenter cette exemption. S'assurer que les placeholders ne sont jamais le seul moyen de communiquer une instruction (toujours avoir un `<label>` visible).

#### R5 : Neutral 600 (#6B7280) sur Neutral 50 (#F7F4EF)

**Probleme** : Ratio de 4.41:1, tres proche de AA (4.5:1) mais en dessous.

**Recommandation** : Pour le texte secondaire (Body 14px) sur fond de page, le ratio est insuffisant de 0.09 point.

**Action** : Deux options :
1. Assombrir legerement Neutral 600 a `#636B78` (ratio ~4.6:1) -- changement minimal visuellement.
2. Accepter le ratio 4.41:1 pour la phase actuelle et corriger en phase 2.

**Recommandation retenue** : Option 1 si un ajustement global est possible sans impacter l'ensemble du design system. Sinon, option 2 avec un ticket dedie.

#### R6 : Gradients -- CTA et Pickup Badge

**Probleme** : Les gradients posent un defi unique car le contraste varie le long du degrade. La partie la plus claire du gradient CTA (#4CAF50) donne un ratio de 2.78:1 avec le texte blanc, et la partie claire du Pickup Badge (#66BB6A) donne 2.36:1.

**Recommandation** : Le contraste doit etre conforme sur **toute** la surface du gradient, pas seulement au point le plus fonce.

**Action** :
1. **Gradient CTA** : Remplacer `linear-gradient(135deg, #4CAF50, #2E7D32)` par `linear-gradient(135deg, #2E7D32, #1B5E20)` (ratio minimum 5.13:1). Alternativement, ajuster la borne claire a `#388E3C` (ratio ~3.7:1, conforme AA Large si le texte des CTA est >= 18px bold).
2. **Gradient Pickup Badge** : Remplacer `linear-gradient(135deg, #66BB6A, #43A047)` par `linear-gradient(135deg, #43A047, #2E7D32)` (ratio minimum 3.30:1, conforme AA Large pour le texte SemiBold 12px -- note : 12px n'est pas "large text"). **Meilleure option** : `linear-gradient(135deg, #2E7D32, #1B5E20)` avec texte blanc (ratio minimum 5.13:1, AA Normal).

### 6.3 Resume des actions sur le design system

| Priorite | Combinaison | Action | Impact visuel |
|:--------:|-------------|--------|:------------:|
| P0 | Gradient CTA + texte blanc | Assombrir la borne claire du gradient | Faible |
| P0 | Gradient Pickup Badge + texte blanc | Assombrir la borne claire du gradient | Faible |
| P1 | Orange 600 sur nav labels (10px) | Assombrir a ~#BF3600 ou augmenter la taille | Faible |
| P1 | Neutral 600 sur Neutral 50 | Assombrir a ~#636B78 | Imperceptible |
| P2 | Orange 500 etoiles | Passer a Orange 600 pour les etoiles | Modere |
| -- | Green 500 icones | Pas d'action (decoratif + label textuel) | Aucun |
| -- | Neutral 400 placeholders | Pas d'action (exemption WCAG) | Aucun |

---

## 7. Testing

### 7.1 Flutter : tests automatises

| Outil | Type | Frequence | Seuil bloquant |
|-------|------|-----------|----------------|
| `flutter test --accessibility` | Verification des Semantics de base | Chaque PR | 0 violation |
| `accessibility_scanner` (pub.dev) | Audit touch targets, labels, contrastes | Chaque PR | Score >= 95% |
| Patrol (integration tests) | Tests E2E avec navigation par Semantics | CI nightly | 0 echec |
| Flutter `SemanticsDebugger` | Debug visuel de l'arbre semantique | Dev local | N/A |

#### Exemple de test d'accessibilite Flutter

```dart
testWidgets('StoreCard a une semantique complete', (tester) async {
  await tester.pumpWidget(
    MaterialApp(
      home: StoreCard(
        storeName: 'La Pizzetta',
        rating: 4.8,
        price: 3.99,
        pickupTime: '12:00 - 14:00',
      ),
    ),
  );

  // Verifier que le lecteur d'ecran peut acceder aux informations cles
  final semantics = tester.getSemantics(find.byType(StoreCard));
  expect(semantics.label, contains('La Pizzetta'));
  expect(semantics.label, contains('4.8'));
  expect(semantics.label, contains('3.99'));

  // Verifier la zone tactile minimum
  final size = tester.getSize(find.byType(FavoriteButton));
  expect(size.width, greaterThanOrEqualTo(48.0));
  expect(size.height, greaterThanOrEqualTo(48.0));
});

testWidgets('L ecran respecte l ordre de focus', (tester) async {
  await tester.pumpWidget(const MaterialApp(home: ExplorerScreen()));

  // Verifier l'ordre de navigation par focus
  final semanticsOwner = tester.binding.pipelineOwner.semanticsOwner!;
  final nodes = <SemanticsNode>[];
  semanticsOwner.rootSemanticsNode!.visitChildren((node) {
    if (node.isFocusable) nodes.add(node);
    return true;
  });

  // Le header doit etre avant le hero banner, qui est avant les categories...
  // Verification de l'ordre logique
});
```

### 7.2 React : axe-core dans Vitest + Storybook a11y

| Outil | Type | Frequence | Seuil bloquant |
|-------|------|-----------|----------------|
| `@storybook/addon-a11y` | Audit a11y de chaque story | Dev + CI | Mode 'error' (phase 3) |
| `vitest-axe` / `jest-axe` | Tests unitaires axe-core dans Vitest | Chaque PR | 0 violation |
| `eslint-plugin-jsx-a11y` | Lint statique des patterns a11y | Chaque commit | 0 error |

#### Exemple de test axe-core dans Vitest

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { StoreCard } from './StoreCard';

expect.extend(toHaveNoViolations);

describe('StoreCard accessibility', () => {
  it('should have no a11y violations', async () => {
    const { container } = render(
      <StoreCard
        storeName="La Pizzetta"
        rating={4.8}
        price={3.99}
        pickupTime="12:00 - 14:00"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 7.3 Astro : pa11y-ci / Lighthouse CI

| Outil | Type | Frequence | Seuil bloquant |
|-------|------|-----------|----------------|
| `pa11y-ci` | Audit WCAG automatise de chaque page | Chaque PR | 0 erreur WCAG AA |
| Lighthouse CI | Score accessibilite dans le pipeline | Chaque PR | Score >= 95 |
| `html-validate` | Validation HTML semantique | Chaque PR | 0 erreur |

```yaml
# .github/workflows/a11y-astro.yml (extrait)
- name: Build Astro site
  run: npm run build
  working-directory: site-vitrine

- name: Run pa11y-ci
  run: |
    npx pa11y-ci --config .pa11yci.json
  working-directory: site-vitrine

- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v12
  with:
    urls: |
      http://localhost:4321/
      http://localhost:4321/partenaires
      http://localhost:4321/comment-ca-marche
    budgetPath: .lighthouserc.json
```

```json
// .pa11yci.json
{
  "defaults": {
    "standard": "WCAG2AA",
    "runners": ["axe"],
    "chromeLaunchConfig": {
      "args": ["--no-sandbox"]
    }
  },
  "urls": [
    "http://localhost:4321/",
    "http://localhost:4321/partenaires",
    "http://localhost:4321/comment-ca-marche",
    "http://localhost:4321/contact"
  ]
}
```

### 7.4 Test manuel trimestriel

Les outils automatises ne detectent que ~30% des problemes d'accessibilite (source : WebAIM). Un test manuel trimestriel est indispensable :

| Aspect | Methode | Qui |
|--------|---------|-----|
| Navigation lecteur d'ecran | Parcourir chaque ecran avec TalkBack (Android) et VoiceOver (iOS/Mac) | 1 membre de l'equipe |
| Navigation clavier | Parcourir l'admin web et le site vitrine uniquement au clavier | 1 membre de l'equipe |
| Zoom texte | Augmenter la taille du texte a 200% sur chaque plateforme | 1 membre de l'equipe |
| Daltonisme | Utiliser un simulateur (ex. : Color Oracle) sur les ecrans principaux | 1 membre de l'equipe |
| Animations reduites | Activer "Reduce motion" sur iOS/Android/macOS et verifier chaque animation | 1 membre de l'equipe |

**Livrables du test trimestriel :**
- Rapport avec captures d'ecran des problemes detectes
- Tickets crees dans le backlog avec le label `a11y`
- Mise a jour de cette ADR si de nouvelles regles sont necessaires

**Calendrier :**
- T2 2026 : premier audit (apres le lancement de la v1)
- Ensuite : chaque trimestre

---

## 8. Checklist par composant

Cette checklist doit etre suivie par les agents IA (Claude Code) et l'equipe a chaque creation ou modification d'un composant, que ce soit un Flutter widget ou un React component.

### 8.1 Checklist Flutter Widget

```
## Accessibilite -- Checklist Flutter Widget

### Semantics
- [ ] Le widget a un `Semantics` label descriptif (ou `semanticLabel` sur Image/Icon)
- [ ] Les images decoratives sont enveloppees dans `ExcludeSemantics`
- [ ] Les groupes logiques utilisent `MergeSemantics` (ex. : icone + texte)
- [ ] Les boutons ont `Semantics(button: true, label: '...')`
- [ ] Les elements toggle ont `Semantics(toggled: true/false, label: '...')`
- [ ] Les changements d'etat declenchent `SemanticsService.announce(...)`

### Touch targets
- [ ] Tous les elements interactifs ont une zone tactile >= 48x48dp
- [ ] Les petits boutons (< 48dp visuels) ont un padding ou SizedBox englobant

### Contraste
- [ ] Les couleurs de texte sur fond respectent le ratio AA (voir section 6)
- [ ] Les elements graphiques porteurs d'information respectent le ratio 3:1
- [ ] Le widget est lisible en mode sombre (si applicable)

### Texte
- [ ] Le texte utilise les styles du theme (pas de taille fixe en dur)
- [ ] Le layout supporte textScaler x1.5 et x2.0 sans overflow
- [ ] Les textes longs ont `overflow: TextOverflow.ellipsis` et `maxLines` adequat

### Animations
- [ ] Les animations respectent `MediaQuery.disableAnimationsOf(context)`
- [ ] Les animations decoratives sont desactivees en mode "reduce motion"
- [ ] Les animations essentielles sont simplifiees en mode "reduce motion"

### Navigation
- [ ] L'ordre de focus est logique (pas besoin de `sortKey` sauf exception)
- [ ] Les modals/bottom sheets piègent le focus
- [ ] Le bouton retour ferme les overlays avant de naviguer

### Tests
- [ ] Test unitaire avec verification des Semantics (`tester.getSemantics()`)
- [ ] Test de zone tactile minimum (>= 48x48dp)
- [ ] Test avec `SemanticsDebugger` en local (verification visuelle)
```

### 8.2 Checklist React Component

```
## Accessibilite -- Checklist React Component

### HTML semantique
- [ ] Utilisation d'elements HTML natifs (`<button>`, `<a>`, `<input>`, `<label>`)
- [ ] Pas de `<div>` ou `<span>` avec `onClick` sans `role`, `tabIndex` et `onKeyDown`
- [ ] Les headings (`<h1>` - `<h6>`) respectent la hierarchie

### ARIA
- [ ] Les images ont un attribut `alt` (vide pour les decoratives : `alt=""`)
- [ ] Les icones sans texte visible ont un `aria-label`
- [ ] Les etats dynamiques utilisent `aria-expanded`, `aria-selected`, etc.
- [ ] Les zones de mise a jour dynamique ont `aria-live` appropriate
- [ ] Les formulaires ont des `<label>` associes et `aria-required`, `aria-invalid`, `aria-errormessage`

### Clavier
- [ ] Le composant est entierement operable au clavier
- [ ] `Tab` / `Shift+Tab` navigent logiquement entre les elements
- [ ] `Enter` / `Space` activent les boutons
- [ ] `Escape` ferme les overlays (modal, dropdown, drawer)
- [ ] Les Arrow keys fonctionnent pour les listes, tabs, menus

### Focus
- [ ] Le focus est visible (outline par defaut du navigateur ou custom 2px Green 500)
- [ ] Les modals piègent le focus et le restaurent a la fermeture
- [ ] Les toasts n'interrompent pas le focus

### Contraste
- [ ] Les couleurs de texte sur fond respectent le ratio AA (voir section 6)
- [ ] Les etats focus/hover/active ont un contraste suffisant

### Storybook
- [ ] La story est conforme avec l'addon a11y (0 violation)
- [ ] La story inclut les variants d'accessibilite (focus visible, hover, disabled)
- [ ] Le composant est teste avec `jest-axe` dans Vitest

### ESLint
- [ ] 0 erreur `jsx-a11y/*` dans le composant
```

### 8.3 Checklist Astro Page/Component

```
## Accessibilite -- Checklist Astro Page/Component

### Structure
- [ ] La page utilise les landmarks HTML5 (<header>, <nav>, <main>, <footer>)
- [ ] Le skip navigation link est present
- [ ] Les headings respectent la hierarchie (un seul <h1>, pas de saut de niveau)
- [ ] Les sections ont des titres (`<section aria-labelledby="...">`)

### Images
- [ ] Toutes les images ont un `alt` descriptif
- [ ] Les images decoratives ont `alt=""` ou `role="presentation"`
- [ ] Les SVG ont un `<title>` et/ou `aria-label`

### Formulaires
- [ ] Chaque input a un `<label>` associe via `for`/`id`
- [ ] Les champs requis ont `required` ET `aria-required="true"`
- [ ] Les erreurs sont annoncees via `role="alert"` ou `aria-live="assertive"`
- [ ] Le focus est deplace sur le premier champ en erreur

### Multimedia
- [ ] Les videos ont des sous-titres
- [ ] Les contenus audio ont une transcription

### Langue
- [ ] L'attribut `lang` de `<html>` correspond a la langue de la page
- [ ] Les passages dans une autre langue ont un attribut `lang` local
- [ ] Les balises `hreflang` sont presentes pour le SEO multilingue

### Performance et motion
- [ ] Le site respecte `prefers-reduced-motion`
- [ ] Les animations CSS sont desactivees ou simplifiees en mode "reduce motion"
- [ ] Le contenu est lisible sans JavaScript (progressive enhancement)
```

---

## 9. Plan de mise en oeuvre

| Phase | Echeance | Actions | Responsable |
|-------|----------|---------|-------------|
| **Phase 0** | Immediate | Integrer `eslint-plugin-jsx-a11y` dans le Storybook. Corriger les violations existantes. Documenter les exceptions de contraste dans DESIGN_SYSTEM.md. | Agent IA + review humaine |
| **Phase 1** | Sprint +1 | Passer Storybook a11y en mode `warn`. Ajouter les tests `jest-axe` pour les composants React existants. Definir les regles Semantics Flutter dans le CLAUDE.md Flutter. | Agent IA |
| **Phase 2** | Sprint +2 | Passer Storybook a11y en mode `error`. Ajuster les gradients CTA et Pickup Badge. Corriger Orange 600 pour les nav labels. Integrer `accessibility_scanner` dans le CI Flutter. | Agent IA + review humaine |
| **Phase 3** | Pre-launch | Audit complet avec lecteurs d'ecran (TalkBack, VoiceOver). Configurer pa11y-ci pour le site Astro. Premier test manuel trimestriel. | Equipe humaine |
| **Phase 4** | Post-launch | Tests manuels trimestriels. Suivi des metriques Lighthouse. Iteration sur les retours utilisateurs. | Equipe humaine |

---

## 10. Decision finale resumee

| Question | Decision |
|----------|----------|
| Niveau cible | **WCAG 2.1 AA** minimum, AAA la ou c'est gratuit |
| Flutter Semantics | Obligatoires sur tous les widgets interactifs et informatifs |
| Touch targets Flutter | **48x48dp** minimum pour tous les elements interactifs |
| React ARIA | HTML semantique natif prioritaire, ARIA en complement |
| Storybook a11y | Migration progressive `todo` -> `warn` -> `error` |
| ESLint a11y | `eslint-plugin-jsx-a11y` en mode `error` |
| Astro | HTML semantique + skip nav + pa11y-ci en CI |
| Contrastes design system | 12 combinaisons conformes, 4 partiellement conformes, corrections planifiees pour les gradients et nav labels |
| Neutral 400 (placeholders) | Exempte WCAG (texte inactif) -- pas d'action |
| Creole mauricien TTS | Fallback voix francaise (`fr-FR`) pour `mfe` |
| Attribut `lang` | `fr`, `en`, `mfe` selon la langue active |
| Direction texte | LTR pour les 3 langues (proprietes logiques CSS/Flutter pour preparer RTL) |
| Tests automatises Flutter | `flutter test --accessibility` + `accessibility_scanner` (CI) + Patrol (nightly) |
| Tests automatises React | `jest-axe` dans Vitest + Storybook addon a11y |
| Tests automatises Astro | pa11y-ci + Lighthouse CI |
| Tests manuels | Trimestriels avec lecteurs d'ecran, clavier, zoom, daltonisme |
| Checklist composant | Obligatoire pour chaque nouveau widget Flutter et composant React |

---

## 11. References

### Standards et guidelines
- [WCAG 2.1 — W3C Recommendation](https://www.w3.org/TR/WCAG21/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA 1.2 Specification](https://www.w3.org/TR/wai-aria-1.2/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)

### Flutter accessibility
- [Flutter Accessibility Documentation](https://docs.flutter.dev/ui/accessibility-and-internationalization/accessibility)
- [Semantics class (Flutter API)](https://api.flutter.dev/flutter/widgets/Semantics-class.html)
- [SemanticsService class (Flutter API)](https://api.flutter.dev/flutter/semantics/SemanticsService-class.html)
- [accessibility_scanner (pub.dev)](https://pub.dev/packages/accessibility_scanner)
- [Patrol — Flutter integration testing](https://patrol.leancode.co/)
- [Material Design Accessibility Guidelines](https://m3.material.io/foundations/accessible-design/overview)

### React accessibility
- [React Accessibility Documentation](https://react.dev/reference/react-dom/components#accessibility)
- [eslint-plugin-jsx-a11y (GitHub)](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
- [jest-axe (GitHub)](https://github.com/nickcolley/jest-axe)
- [axe-core (Deque)](https://github.com/dequelabs/axe-core)
- [Storybook Accessibility Addon](https://storybook.js.org/addons/@storybook/addon-a11y)

### Astro accessibility
- [pa11y-ci (GitHub)](https://github.com/pa11y/pa11y-ci)
- [Lighthouse CI (GitHub)](https://github.com/GoogleChrome/lighthouse-ci)
- [html-validate (npm)](https://www.npmjs.com/package/html-validate)

### Outils de contraste
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Color Oracle — Daltonism Simulator](https://colororacle.org/)
- [Accessible Colors](https://accessible-colors.com/)

### Maurice
- [Disability Act 2012 — Mauritius](https://www.ilo.org/dyn/natlex/natlex4.detail?p_isn=93993)
- [CRPD — UN Convention on the Rights of Persons with Disabilities](https://www.un.org/development/desa/disabilities/convention-on-the-rights-of-persons-with-disabilities.html)
- [Statistics Mauritius — Population Ageing](https://statsmauritius.govmu.org/)

### Recherche
- [WebAIM Million — Annual Accessibility Analysis](https://webaim.org/projects/million/)
- [WHO — Disability and Health (15% statistic)](https://www.who.int/news-room/fact-sheets/detail/disability-and-health)
