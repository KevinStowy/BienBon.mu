# BienBon.mu - Charte Graphique & Design System

> Application mobile anti-gaspillage alimentaire pour l'ile Maurice.
> Permet aux utilisateurs de recuperer des paniers surprise d'invendus a petit prix.

---

## 1. Identite de Marque

### Nom
- **Nom commercial** : BienBon.mu
- **Nom dans l'app** : BienBon
- **Baseline** : _Sauvez des paniers surprise !_

### Mascotte
- Dodo vert (echo de la faune mauricienne)
- Style illustratif, friendly, cartoon
- Utilise dans le hero banner, onboarding et etats vides

### Personnalite de marque
| Trait | Description |
|-------|-------------|
| Accessible | Langage simple, creole mauricien  |
| Ecologique | Mission anti-gaspillage, tons verts naturels |
| Joyeux | Illustrations colorees, mascotte sympathique |
| Local | Ancre a Maurice, references culturelles locales |

---

## 2. Palette de Couleurs

### Couleurs Primaires

| Nom | Hex | RGB | Usage |
|-----|-----|-----|-------|
| **Green 900** | `#1B5E20` | 27, 94, 32 | Texte logo, titres forts |
| **Green 700** | `#2E7D32` | 46, 125, 50 | Boutons primaires, CTA |
| **Green 500** | `#4CAF50` | 76, 175, 80 | Icones actives, coeurs favoris |
| **Green 100** | `#E8F5E9` | 232, 245, 233 | Fond de badges, hover states |

### Couleurs d'Accent

| Nom | Hex | RGB | Usage |
|-----|-----|-----|-------|
| **Orange 600** | `#E65100` | 230, 81, 0 | Titres hero, texte actif nav |
| **Orange 500** | `#FF9800` | 255, 152, 0 | Etoiles notation, icone active |
| **Orange 100** | `#FFF3E0` | 255, 243, 224 | Badge pickup time background |

### Couleurs Neutres

| Nom | Hex | RGB | Usage |
|-----|-----|-----|-------|
| **Neutral 900** | `#1A1A1A` | 26, 26, 26 | Titres principaux, noms |
| **Neutral 600** | `#6B7280` | 107, 114, 128 | Texte secondaire |
| **Neutral 400** | `#9CA3AF` | 156, 163, 175 | Texte desactive, placeholders |
| **Neutral 200** | `#E5E7EB` | 229, 231, 235 | Bordures, separateurs |
| **Neutral 50** | `#F7F4EF` | 247, 244, 239 | Fond de page (creme chaud) |
| **White** | `#FFFFFF` | 255, 255, 255 | Fond de cartes, surfaces |

### Gradients

| Nom | Definition | Usage |
|-----|------------|-------|
| **CTA Gradient** | `linear-gradient(135deg, #4CAF50, #2E7D32)` | Boutons d'action principaux |
| **Hero Gradient** | `linear-gradient(180deg, #E8F5E9, #C8E6C9)` | Fond du hero banner |
| **Pickup Badge** | `linear-gradient(135deg, #66BB6A, #43A047)` | Badge horaire de recuperation |

---

## 3. Typographie

### Police Principale : Nunito

| Style | Weight | Taille | Line Height | Usage |
|-------|--------|--------|-------------|-------|
| **Display** | 800 (ExtraBold) | 24px | 32px | Titre hero banner |
| **Heading 1** | 700 (Bold) | 20px | 28px | Titres de section |
| **Heading 2** | 700 (Bold) | 16px | 24px | Noms de commerces |
| **Body** | 400 (Regular) | 14px | 20px | Texte courant |
| **Body Small** | 400 (Regular) | 12px | 16px | Sous-textes, badges |
| **Caption** | 600 (SemiBold) | 11px | 14px | Labels, chips |
| **Price** | 800 (ExtraBold) | 20px | 24px | Prix affiche |
| **Nav Label** | 600 (SemiBold) | 10px | 12px | Labels navigation basse |

### Hierarchie Typographique

```
Sauvez des paniers surprise !     -> Display / Green 900
Recuperez des invendus...         -> Body / Neutral 600
Pres de chez moi                  -> Heading 1 / Neutral 900 / italic
La Pizzetta                       -> Heading 2 / Neutral 900
4.8                               -> Body Small / Neutral 600
3,99 EUR                          -> Price / Green 900
Recuperer aujourd'hui...          -> Body Small / White (sur fond vert)
```

---

## 4. Iconographie

### Style
- Trait arrondi (rounded), epaisseur 2px
- Style : outlined pour l'etat inactif, filled pour l'etat actif
- Taille par defaut : 24x24px
- Couleur par defaut : `Neutral 400` (inactif), `Orange 500` ou `Green 500` (actif)

### Icones Utilisees

| Icone | Usage | Etat actif |
|-------|-------|------------|
| Home | Tab Explorer | Orange rempli |
| Map Pin | Tab Carte | - |
| Heart | Tab Favoris / Bouton favori | Green rempli |
| Shopping Bag | Tab Mes paniers | - |
| Search | Barre de recherche | - |
| Star | Notation | Orange rempli |
| Thumbs Up | Nombre d'avis | - |
| Chevron Right | Navigation "Nout >>" | - |

### Icones de Categories
- Illustrations personnalisees dans des conteneurs 56x56px
- Fond blanc avec ombre douce
- Style : flat illustration avec couleurs chaudes

---

## 5. Espacements & Grille

### Systeme d'Espacement (base 4px)

| Token | Valeur | Usage |
|-------|--------|-------|
| `space-1` | 4px | Micro-espacement interne |
| `space-2` | 8px | Espacement intra-composant |
| `space-3` | 12px | Padding de badges, chips |
| `space-4` | 16px | Padding standard des cartes |
| `space-5` | 20px | Gap entre composants |
| `space-6` | 24px | Marges de section |
| `space-8` | 32px | Espacement entre sections |

### Grille Mobile

- **Largeur max** : 390px (iPhone 14 Pro)
- **Marges laterales** : 16px
- **Gouttiere** : 12px
- **Colonnes cartes** : 2 colonnes egales

---

## 6. Rayons de Bordure (Border Radius)

| Token | Valeur | Usage |
|-------|--------|-------|
| `radius-sm` | 8px | Badges, chips de categorie |
| `radius-md` | 12px | Cartes de commerce |
| `radius-lg` | 16px | Hero banner, images de carte |
| `radius-xl` | 24px | Barre de recherche, boutons CTA |
| `radius-full` | 9999px | Avatars, boutons favoris |

---

## 7. Ombres (Shadows)

| Token | Valeur | Usage |
|-------|--------|-------|
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Chips de categorie |
| `shadow-md` | `0 2px 8px rgba(0,0,0,0.10)` | Cartes de commerce |
| `shadow-lg` | `0 4px 16px rgba(0,0,0,0.12)` | Hero banner, barre de recherche |
| `shadow-nav` | `0 -2px 10px rgba(0,0,0,0.06)` | Navigation basse |

---

## 8. Composants UI

### 8.1 Header
- Hauteur : 56px
- Logo a gauche (mascotte + "BB Saver" en Green 900)
- Avatar utilisateur a droite (40px, cercle, bordure Green 500 2px)
- Fond : White

### 8.2 Hero Banner
- Border radius : `radius-lg`
- Padding : 20px
- Fond : illustration avec gradient vert nature
- Titre : Display / Green 900
- Sous-titre : Body / Neutral 600
- Contient la barre de recherche en bas

### 8.3 Barre de Recherche
- Hauteur : 48px
- Fond : Green 700 semi-transparent
- Border radius : `radius-xl`
- Icone search a gauche (White)
- Placeholder : "Trouver un panier" (White)
- Ombre : `shadow-lg`

### 8.4 Chips de Categorie
- Disposition : scroll horizontal
- Taille icone : 48x48px dans conteneur 72x72px
- Label en dessous : Caption / Neutral 900
- Etat actif : fond Green 100, bordure Green 500
- Etat inactif : fond White, bordure Neutral 200
- Border radius : `radius-sm`
- Ombre : `shadow-sm`

### 8.5 En-tete de Section
- Titre a gauche : Heading 1 / Neutral 900 / italic
- Lien a droite : "Nout >>" Body / Green 700
- Indicateurs de pagination (dots) : Green 500 actif, Neutral 200 inactif

### 8.6 Carte de Commerce (Store Card)
- Largeur : 50% - gouttiere
- Border radius : `radius-md`
- Ombre : `shadow-md`
- **Image** : ratio 4:3, radius-lg en haut
- **Bouton Favori** : 32px cercle, fond White/80%, icone coeur
- **Nom** : Heading 2 / Neutral 900
- **Badge categorie** : a cote du nom, fond Green 100, texte Green 900, radius-sm
- **Notation** : etoiles Orange 500 + note (Body Small) + icone + nombre
- **Disponibilite** : Body Small / Neutral 600 ("2 paniers disponibles")
- **Prix** : Price / Green 900 ("3,99 EUR")
- **Badge Pickup** : pleine largeur en bas, fond Pickup Badge gradient, texte White, radius-sm bas

### 8.7 Navigation Basse (Bottom Tab Bar)
- Hauteur : 64px + safe area
- Fond : White
- Ombre : `shadow-nav`
- 4 onglets : Explorer, Carte, Favoris, Mes paniers
- Etat actif : icone Orange 500 filled + label Orange 600
- Etat inactif : icone Neutral 400 outlined + label Neutral 400

### 8.8 Bouton Favori
- Taille : 32x32px
- Fond : White avec 80% opacite
- Border radius : `radius-full`
- Icone coeur : 18px
- Etat inactif : outline White
- Etat actif : filled Green 500

### 8.9 Badge de Notation
- Etoiles : 5 icones de 12px, Orange 500
- Note numerique : Body Small / Neutral 900 / SemiBold
- Separateur : icone (thumbs up ou coeur)
- Nombre d'avis : Body Small / Neutral 600

### 8.10 Badge Prix
- Texte : Price font / Green 900
- Symbole EUR : meme style, taille reduite

### 8.11 Badge Horaire de Recuperation
- Fond : `Pickup Badge` gradient
- Padding : 8px 12px
- Border radius : `radius-sm` (bas seulement sur carte)
- Texte : Body Small / White / SemiBold
- Format : "Recuperer aujourd'hui de HH:MM - HH:MM"

### 8.12 Avatar Utilisateur
- Taille : 40px
- Border radius : `radius-full`
- Bordure : 2px solid Green 500
- Fond : illustration ou initiales sur Green 100

---

## 9. Etats Interactifs

| Composant | Normal | Hover/Press | Desactive |
|-----------|--------|-------------|-----------|
| Bouton CTA | Gradient vert | Assombri 10% | Opacite 50% |
| Carte | shadow-md | shadow-lg + scale(1.02) | Opacite 60% |
| Chip | Fond blanc | Fond Green 100 | Opacite 50% |
| Chip Actif | Fond Green 100 | Fond Green 200 | - |
| Tab Nav | Neutral 400 | - | - |
| Tab Nav Actif | Orange 500 | - | - |
| Favori | Outline | Scale(1.2) + Green | - |

---

## 10. Animations & Transitions

| Element | Animation | Duree | Easing |
|---------|-----------|-------|--------|
| Changement d'onglet | Fade + slide | 200ms | ease-out |
| Press bouton | Scale down 0.96 | 100ms | ease-in-out |
| Favori toggle | Scale up 1.2 + bounce | 300ms | spring(1, 80, 10) |
| Apparition carte | Fade in + slide up | 300ms | ease-out |
| Hero banner | Parallax subtil | - | linear |

---

## 11. Tokens de Design (CSS Custom Properties)

```css
:root {
  /* Couleurs Primaires */
  --color-green-900: #1B5E20;
  --color-green-700: #2E7D32;
  --color-green-500: #4CAF50;
  --color-green-100: #E8F5E9;

  /* Couleurs d'Accent */
  --color-orange-600: #E65100;
  --color-orange-500: #FF9800;
  --color-orange-100: #FFF3E0;

  /* Neutres */
  --color-neutral-900: #1A1A1A;
  --color-neutral-600: #6B7280;
  --color-neutral-400: #9CA3AF;
  --color-neutral-200: #E5E7EB;
  --color-neutral-50: #F7F4EF;
  --color-white: #FFFFFF;

  /* Typographie */
  --font-family: 'Nunito', sans-serif;
  --font-display: 800 24px/32px var(--font-family);
  --font-h1: 700 20px/28px var(--font-family);
  --font-h2: 700 16px/24px var(--font-family);
  --font-body: 400 14px/20px var(--font-family);
  --font-small: 400 12px/16px var(--font-family);
  --font-caption: 600 11px/14px var(--font-family);
  --font-price: 800 20px/24px var(--font-family);
  --font-nav: 600 10px/12px var(--font-family);

  /* Espacements */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  /* Rayons */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Ombres */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.10);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.12);
  --shadow-nav: 0 -2px 10px rgba(0, 0, 0, 0.06);

  /* Gradients */
  --gradient-cta: linear-gradient(135deg, #4CAF50, #2E7D32);
  --gradient-hero: linear-gradient(180deg, #E8F5E9, #C8E6C9);
  --gradient-pickup: linear-gradient(135deg, #66BB6A, #43A047);
}
```

---

## 12. Accessibilite

- **Contrastes** : tous les textes respectent WCAG AA (ratio minimum 4.5:1)
- **Tailles tactiles** : minimum 44x44px pour les zones interactives
- **Labels** : toutes les icones ont un `aria-label`
- **Focus** : outline visible de 2px en Green 500 avec offset de 2px
- **Motion** : respecter `prefers-reduced-motion` pour desactiver les animations

---

## 13. Responsive (Breakpoints)

| Breakpoint | Largeur | Colonnes cartes |
|------------|---------|-----------------|
| Mobile S | < 360px | 1 |
| Mobile M | 360-413px | 2 |
| Mobile L | 414px+ | 2 |
| Tablet | 768px+ | 3 |
| Desktop | 1024px+ | 4 |
