# Onboarding

> **Ecrans couverts :** Ecrans de decouverte swipables (5 ecrans), choix de langue
> **User Stories :** US-C011, US-C012

---

## US-C011 -- Onboarding premiere utilisation (swipe to discover)

**En tant que** nouveau consommateur, **je veux** decouvrir le concept BienBon a travers des ecrans de presentation interactifs **afin de** comprendre comment fonctionne le service avant de l'utiliser.

**Criteres d'acceptation :**
- L'onboarding est affiche automatiquement au premier lancement de l'app apres inscription
- L'onboarding se compose de 3 a 5 ecrans swipables horizontalement
- Ecran 1 : Presentation du concept anti-gaspi - "Sauvez des repas, faites des economies" avec visuel attractif
- Ecran 2 : Explication du panier surprise - "Des paniers surprise composes par les commerces pres de chez vous, a prix reduit" avec visuel
- Ecran 3 : Le parcours simplifie - "Cherchez > Reservez > Retirez" avec icones etape par etape
- Ecran 4 : L'impact positif - "Chaque panier sauve, c'est moins de gaspillage et plus de sourires" avec visuel
- Ecran 5 (optionnel) : Activation des notifications et de la geolocalisation
- Des indicateurs de progression (dots) sont affiches en bas de l'ecran
- Le dernier ecran affiche un bouton "C'est parti !" qui redirige vers l'ecran d'accueil
- L'onboarding est affiche une seule fois et n'est plus repropose apres
- Le contenu de l'onboarding est affiche dans la langue selectionnee par le consommateur (FR/EN/Creole)

---

## US-C012 -- Passer l'onboarding

**En tant que** consommateur, **je veux** pouvoir passer l'onboarding **afin d'** acceder directement a l'application si je connais deja le concept.

**Criteres d'acceptation :**
- Un bouton "Passer" est visible en haut a droite de chaque ecran d'onboarding
- Le clic sur "Passer" redirige immediatement vers l'ecran d'accueil
- L'onboarding est marque comme "vu" et ne se reaffiche plus apres
- L'onboarding reste accessible depuis Profil > Aide > Revoir l'introduction pour consultation ulterieure

---

## Mockup -- Onboarding Consommateur (consumer-onboarding)

### Ecran 1 -- Concept anti-gaspi
```
┌─────────────────────────────────┐
│                        Passer > │
│                                 │
│       ┌─────────────────┐       │
│       │                 │       │
│       │   🍽 🥖 🥗       │       │
│       │                 │       │
│       │   Illustration  │       │
│       │   anti-gaspi    │       │
│       │                 │       │
│       └─────────────────┘       │
│                                 │
│    Sauvez des repas,            │
│    faites des economies !       │
│                                 │
│  Chaque jour, des commerces     │
│  pres de chez vous jettent des  │
│  repas encore bons.             │
│  Ensemble, changeons cela !     │
│                                 │
│          ● ○ ○ ○ ○              │
│                                 │
│  ┌───────────────────────────┐  │
│  │        SUIVANT  >         │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Ecran 3 -- Parcours simplifie
```
┌─────────────────────────────────┐
│                        Passer > │
│                                 │
│   ┌────────┐ ┌────────┐ ┌────────┐
│   │   🔍   │ │   📱   │ │   🛍   │
│   │Cherchez│ │Reservez│ │Retirez│
│   └────────┘ └────────┘ └────────┘
│       │          │          │     │
│       └──────────┴──────────┘     │
│                                 │
│    Un parcours simplifie        │
│                                 │
│  1. Cherchez un panier          │
│     pres de chez vous           │
│  2. Reservez et payez           │
│     en quelques secondes        │
│  3. Retirez votre panier        │
│     au commerce                 │
│                                 │
│          ○ ○ ● ○ ○              │
│                                 │
│  ┌───────────────────────────┐  │
│  │        SUIVANT  >         │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Ecran 5 -- Permissions
```
┌─────────────────────────────────┐
│                        Passer > │
│                                 │
│       ┌─────────────────┐       │
│       │   📍 🔔          │       │
│       │   Illustration  │       │
│       │   notifications │       │
│       │   et position   │       │
│       └─────────────────┘       │
│                                 │
│    Restez informe !             │
│                                 │
│  Activez les notifications      │
│  pour etre alerte des           │
│  nouveaux paniers.              │
│                                 │
│  ┌───────────────────────────┐  │
│  │  🔔 Activer notifs        │  │
│  └───────────────────────────┘  │
│                                 │
│  Activez la geolocalisation     │
│  pour voir les paniers          │
│  pres de vous.                  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  📍 Activer localisation  │  │
│  └───────────────────────────┘  │
│                                 │
│          ○ ○ ○ ○ ●              │
│                                 │
│  ┌───────────────────────────┐  │
│  │      C'EST PARTI !        │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

---

## Assets requis

**Illustrations onboarding :**
- `../../assets/illustrations/onboarding/onboarding-1-anti-gaspi.png` -- Ecran 1, concept anti-gaspi
- `../../assets/illustrations/onboarding/onboarding-2-panier-surprise.png` -- Ecran 2, panier surprise
- `../../assets/illustrations/onboarding/onboarding-3-notifications.png` -- Ecran 5, permissions notifications/geolocalisation

**Illustrations impact :**
- `../../assets/illustrations/impact/impact-planete.png` -- Ecran 4, impact positif

**Logo :**
- `../../assets/logos/logo-principal.png`
