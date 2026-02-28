# Performance

> US couvertes : US-T005, US-T006, US-T007, US-T008

---

### US-T005 — Géolocalisation
**En tant que** consommateur, **je veux** que l'application utilise ma position géographique **afin de** voir les paniers disponibles autour de moi et calculer les distances.

**Critères d'acceptation :**
- Lors de la première utilisation de la carte ou de la recherche, l'application demande la permission de géolocalisation via l'API du navigateur
- Le message de demande de permission est clair et explique pourquoi la localisation est nécessaire (ex: "BienBon souhaite accéder à votre position pour vous montrer les paniers près de chez vous")
- Si l'utilisateur accorde la permission, sa position est utilisée pour :
  - Centrer la carte sur sa position
  - Trier les résultats par proximité
  - Calculer et afficher la distance vers chaque partenaire
- Si l'utilisateur refuse la permission, un formulaire de saisie manuelle est proposé :
  - Saisie d'une adresse ou d'un nom de ville/quartier à Maurice
  - Autocomplétion basée sur une liste de localités mauriciennes ou via un service de géocodage
  - La position saisie manuellement est utilisée comme référence pour le tri et le calcul des distances
- L'utilisateur peut modifier sa position de référence à tout moment (via les paramètres ou un bouton "Changer de position" sur la carte)
- Si la géolocalisation échoue (GPS indisponible, erreur technique), un message clair est affiché et la saisie manuelle est proposée
- La position n'est pas partagée avec des tiers ; elle est utilisée uniquement côté client pour le tri et l'affichage

---

### US-T006 — Installation PWA
**En tant que** consommateur, **je veux** pouvoir installer la webapp BienBon sur l'écran d'accueil de mon téléphone comme une application native **afin d'** y accéder facilement et avoir une expérience fluide.

**Critères d'acceptation :**
- La webapp est une Progressive Web App (PWA) valide avec un fichier `manifest.json` correctement configuré (nom, icônes, couleurs, orientation, display: standalone)
- Un Service Worker est enregistré pour permettre l'installation et le fonctionnement hors ligne partiel (au minimum : affichage d'un écran "Pas de connexion" élégant au lieu d'une erreur navigateur)
- Sur les navigateurs compatibles (Chrome Android, Safari iOS, etc.), une bannière d'invitation à l'installation est affichée :
  - Sur Android/Chrome : la bannière native "Ajouter à l'écran d'accueil" est déclenchée après que les critères d'engagement sont remplis (2 visites espacées de 5+ minutes), ou déclenchée manuellement via un bouton
  - Sur iOS/Safari : un message personnalisé explique comment ajouter l'app à l'écran d'accueil (via le bouton "Partager" puis "Sur l'écran d'accueil")
- Après installation, l'application s'ouvre en mode plein écran (standalone) sans la barre d'adresse du navigateur
- La page d'accueil de la PWA installée est la webapp (carte/liste des paniers), PAS la landing page du site vitrine. Le manifest.json définit start_url vers la webapp. Si l'utilisateur n'est pas connecté, il est redirigé vers la page de connexion de la webapp.
- L'icône de l'application sur l'écran d'accueil est l'icône BienBon (plusieurs tailles fournies : 192x192, 512x512 minimum)
- Un écran de démarrage (splash screen) est affiché au lancement de la PWA avec le logo BienBon
- L'invitation à l'installation n'est affichée qu'une seule fois par session (ne pas harceler l'utilisateur)
- L'utilisateur peut retrouver l'option d'installation dans les paramètres de l'application

---

### US-T007 — Accessibilité (LACUNE #10)
**En tant que** utilisateur en situation de handicap ou utilisant des technologies d'assistance, **je veux** que l'application et le site vitrine soient accessibles **afin de** pouvoir utiliser BienBon de manière autonome.

**Critères d'acceptation :**
- **Contraste :** Tous les textes respectent un ratio de contraste minimum de 4,5:1 pour le texte normal et 3:1 pour le texte agrandi (conforme WCAG 2.1 niveau AA)
- **Taille de texte :** La taille de texte minimale est de 16px pour le corps de texte. L'utilisateur peut augmenter la taille du texte via les paramètres natifs du navigateur/OS sans perte de fonctionnalité ni de lisibilité (mise en page responsive au zoom)
- **Navigation clavier :** Toutes les fonctionnalités de l'application sont accessibles et utilisables uniquement au clavier (tabulation, entrée, échap, flèches). L'ordre de tabulation est logique et cohérent. Un indicateur de focus visible est présent sur tous les éléments interactifs (outline visible)
- **Lecteur d'écran :** Tous les éléments interactifs possèdent des labels ARIA appropriées (`aria-label`, `aria-describedby`, `role`). Les images significatives possèdent un texte alternatif descriptif (`alt`). Les images décoratives sont marquées comme telles (`alt=""`, `role="presentation"`). Les zones de la page sont identifiées par des landmarks ARIA (`nav`, `main`, `banner`, `contentinfo`). Les messages d'erreur et les notifications sont annoncés au lecteur d'écran via `aria-live`
- **Formulaires :** Chaque champ de formulaire est associé à un label visible. Les erreurs de validation sont affichées à proximité du champ concerné et annoncées au lecteur d'écran. Les champs obligatoires sont identifiés visuellement et programmatiquement (`aria-required`)
- **Animations :** Les animations respectent la préférence système `prefers-reduced-motion`. L'utilisateur peut désactiver les animations
- **Touch targets :** Les zones cliquables sur mobile ont une taille minimale de 44x44 pixels
- Un audit d'accessibilité est réalisé avec un outil automatisé (Lighthouse, axe) avec un score minimum de 90

---

### US-T008 — Multi-langue (LACUNE #11)
**En tant que** utilisateur, **je veux** pouvoir utiliser BienBon dans ma langue préférée (français, anglais ou créole mauricien) **afin de** comprendre et utiliser le service dans la langue qui m'est la plus confortable.

**Critères d'acceptation :**
- Trois langues sont disponibles : Français (FR), Anglais (EN), Créole mauricien (KR/MFE)
- Un sélecteur de langue est accessible depuis toutes les pages (header ou menu de navigation) sous forme d'un bouton ou dropdown avec les drapeaux/codes de langue
- Le changement de langue s'applique immédiatement à l'ensemble de l'interface sans rechargement complet de la page (ou avec un rechargement rapide)
- La langue par défaut est le français (FR) pour les nouveaux visiteurs
- La langue choisie est persistée :
  - Pour les visiteurs non connectés : dans un cookie ou le localStorage
  - Pour les utilisateurs connectés : dans les préférences du compte (associée au profil)
- Tous les éléments de l'interface sont traduits : menus, boutons, labels, messages d'erreur, messages de confirmation, notifications, contenu des tooltips, contenu des emails (cf. Partie 5)
- Le contenu dynamique généré par les utilisateurs (descriptions de paniers, avis, réclamations) n'est pas traduit automatiquement (il est affiché dans la langue dans laquelle il a été saisi)
- La FAQ, les CGU, les Mentions Légales et la Politique de Confidentialité sont disponibles dans les trois langues
- Les formats de date, d'heure et de devise s'adaptent à la langue choisie (ex: "14 février 2026" en FR, "14 February 2026" en EN)
- La devise reste la roupie mauricienne (Rs/MUR) quelle que soit la langue
- La direction du texte reste LTR (left-to-right) pour les trois langues
- L'attribut `lang` de la page HTML est mis à jour en fonction de la langue sélectionnée
- Les balises `hreflang` sont présentes pour le SEO (cf. US-W013)

---

## Mockups

### transversal-performance

```
┌───────────────────────────────────────────────────────┐
│  DEMANDE DE PERMISSION GÉOLOCALISATION                │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌───────────────────────────────────────────────┐    │
│  │                                               │    │
│  │  BienBon souhaite accéder à votre position    │    │
│  │  pour vous montrer les paniers près de        │    │
│  │  chez vous.                                   │    │
│  │                                               │    │
│  │   [ Autoriser ]      [ Refuser ]              │    │
│  │                                               │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  ── APRÈS AUTORISATION ────────────────────────────  │
│                                                       │
│  ┌───────────────────────────────────────────────┐    │
│  │                                               │    │
│  │  CARTE - Centrée sur ma position              │    │
│  │                                               │    │
│  │          [📍 Vous êtes ici]                    │    │
│  │                                               │    │
│  │    [A] 0.3 km - Boulangerie du Port           │    │
│  │    [B] 0.8 km - Restaurant Le Chamarel        │    │
│  │    [C] 1.2 km - Hôtel Le Morne                │    │
│  │                                               │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  ── SI PERMISSION REFUSÉE ─────────────────────────  │
│                                                       │
│  ┌───────────────────────────────────────────────┐    │
│  │                                               │    │
│  │  Saisissez votre position manuellement :      │    │
│  │                                               │    │
│  │  ┌─────────────────────────────────────────┐  │    │
│  │  │ Ville ou quartier...          🔍        │  │    │
│  │  ├─────────────────────────────────────────┤  │    │
│  │  │ Port-Louis                              │  │    │
│  │  │ Curepipe                                │  │    │
│  │  │ Quatre Bornes                           │  │    │
│  │  │ Rose Hill                               │  │    │
│  │  │ Vacoas-Phoenix                          │  │    │
│  │  └─────────────────────────────────────────┘  │    │
│  │                                               │    │
│  │  ┌───────────────────────┐                    │    │
│  │  │ Changer de position   │                    │    │
│  │  └───────────────────────┘                    │    │
│  │                                               │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  ── ERREUR GPS ─────────────────────────────────────  │
│                                                       │
│  ┌───────────────────────────────────────────────┐    │
│  │ Impossible de déterminer votre position.      │    │
│  │ Saisissez votre adresse manuellement.         │    │
│  │                                               │    │
│  │ ┌─────────────────────────────────────────┐   │    │
│  │ │ Adresse ou ville...           🔍        │   │    │
│  │ └─────────────────────────────────────────┘   │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

