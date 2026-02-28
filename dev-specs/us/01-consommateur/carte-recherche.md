# Carte, Recherche & Filtres

> **Ecrans couverts :** Vue carte, vue liste, filtres (jour, heure, type, preferences alimentaires), mode invite
> **User Stories :** US-C013, US-C014, US-C015, US-C016, US-C017, US-C018, US-C019

---

## US-C013 -- Naviguer en mode invite sans inscription

**En tant que** visiteur non inscrit, **je veux** explorer les paniers disponibles et la carte des partenaires sans m'inscrire **afin de** decouvrir l'offre BienBon avant de m'engager a creer un compte (LACUNE #1).

**Criteres d'acceptation :**
- L'application est accessible sans inscription ni connexion
- Le visiteur peut voir la carte des partenaires et les paniers disponibles
- Le visiteur peut utiliser les filtres (jour, heure, type, preference alimentaire)
- Le visiteur peut consulter les fiches partenaires et les details des paniers
- Le visiteur peut effectuer des recherches par nom de partenaire
- Le visiteur ne peut PAS reserver un panier : au clic sur "Reserver", il est redirige vers l'ecran d'inscription/connexion avec un message "Inscrivez-vous pour reserver votre panier"
- Le visiteur ne peut PAS ajouter de favoris : au clic sur le bouton favori, il est redirige vers l'inscription avec le message "Inscrivez-vous pour sauvegarder vos favoris"
- Le visiteur ne peut PAS laisser d'avis
- Le visiteur ne peut PAS acceder au profil (pas de profil)
- Une banniere discrete en haut ou en bas de l'ecran invite le visiteur a s'inscrire : "Inscrivez-vous pour reserver des paniers et profiter de toutes les fonctionnalites"
- La demande de geolocalisation est proposee au visiteur pour afficher les paniers autour de lui
- Si la geolocalisation est refusee, les paniers sont affiches sur une zone par defaut (ex. Port-Louis, Maurice)

---

## US-C014 -- Voir la carte des partenaires

**En tant que** consommateur, **je veux** voir une carte interactive avec les partenaires autour de moi **afin de** reperer facilement les paniers disponibles a proximite.

**Criteres d'acceptation :**
- La carte se centre sur la position geographique du consommateur (si la geolocalisation est activee)
- Si la geolocalisation est desactivee, la carte se centre sur la derniere position connue ou sur une zone par defaut (Port-Louis)
- Les partenaires ayant au moins un panier disponible sont affiches avec un marqueur colore/actif
- Les partenaires sans panier disponible ne sont pas affiches sur la carte (pour ne pas encombrer)
- Un tap sur un marqueur affiche une infobulle avec : nom du partenaire, photo miniature, nombre de paniers disponibles, fourchette de prix, distance
- Un tap sur l'infobulle ouvre la fiche partenaire (US-C019)
- La carte est zoomable et deplacable (pinch et drag)
- Un bouton "Recentrer sur ma position" est disponible
- La carte se met a jour en temps reel (si un panier est reserve par quelqu'un d'autre, le stock est mis a jour)
- Un bouton permet de basculer entre la vue carte et la vue liste (US-C015)

---

## US-C015 -- Voir la liste des paniers disponibles

**En tant que** consommateur, **je veux** voir la liste des paniers disponibles autour de moi **afin de** choisir celui qui me convient le mieux.

**Criteres d'acceptation :**
- La liste est triee par proximite par defaut (du plus proche au plus eloigne)
- Chaque carte de panier affiche : photo (du panier ou du commerce en fallback), nom du partenaire, type de panier (icone/badge), prix barre (valeur initiale estimee), prix de vente BienBon, creneau de retrait (date + heure debut - heure fin), distance depuis la position du consommateur, nombre de paniers restants, tags de preference alimentaire (vegetarien, vegan, halal) sous forme de badges
- Les paniers epuises ne sont PAS affiches dans la liste
- Les paniers dont le creneau de retrait est passe ne sont PAS affiches
- La liste supporte le scroll infini ou la pagination
- Un tap sur une carte de panier ouvre le detail du panier (US-C020)
- Un bouton permet de basculer entre la vue liste et la vue carte (US-C014)
- Le tri est modifiable : par proximite, par prix croissant, par prix decroissant, par heure de retrait

---

## US-C016 -- Filtrer par jour de collecte

**En tant que** consommateur, **je veux** filtrer les paniers par jour de collecte **afin de** trouver un panier disponible quand ca m'arrange.

**Criteres d'acceptation :**
- Un filtre "Jour" est accessible depuis la barre de filtres au-dessus de la liste/carte
- Options disponibles : "Aujourd'hui", "Demain", selection d'une date specifique via un calendrier
- Le filtre ne propose que les dates pour lesquelles au moins un panier est disponible (ou toutes les dates des 7 prochains jours)
- Les resultats (liste et carte) se mettent a jour instantanement apres selection
- Le filtre selectionne est visuellement identifiable (badge, couleur)
- Le filtre est combinable avec les autres filtres (heure, type, preference alimentaire)
- Un bouton "Reinitialiser les filtres" permet de revenir a l'affichage par defaut

---

## US-C017 -- Filtrer par heure de collecte

**En tant que** consommateur, **je veux** filtrer les paniers par heure de collecte **afin de** trouver un panier compatible avec mon emploi du temps.

**Criteres d'acceptation :**
- Un filtre "Heure" est accessible depuis la barre de filtres
- Options sous forme de tranches horaires : "Matin (6h-12h)", "Midi (11h-14h)", "Apres-midi (14h-18h)", "Soir (18h-22h)" ou un selecteur d'heure plus precis
- Les resultats se mettent a jour instantanement apres selection
- Le filtre est combinable avec les autres filtres
- Le filtre selectionne est visuellement identifiable

---

## US-C018 -- Filtrer par type de panier

**En tant que** consommateur, **je veux** filtrer par type de panier **afin de** trouver un panier qui correspond a mes envies.

**Criteres d'acceptation :**
- Un filtre "Type" est accessible depuis la barre de filtres
- Les types de paniers correspondent aux categories definies par l'admin BienBon (exemples : Boulangerie, Restaurant, Supermarche, Fruits & Legumes, Patisserie, etc.)
- Selection multiple possible (ex. "Boulangerie" ET "Patisserie")
- Les resultats se mettent a jour instantanement apres selection
- Le filtre est combinable avec les autres filtres
- Le nombre de paniers disponibles pour chaque type est affiche a cote du label

---

## US-C019 -- Filtrer par preference alimentaire

**En tant que** consommateur, **je veux** filtrer par preference alimentaire **afin de** trouver un panier compatible avec mon regime ou mes convictions.

**Criteres d'acceptation :**
- Un filtre "Preferences" est accessible depuis la barre de filtres
- Options : Vegetarien, Vegan, Halal (et autres tags definis par l'admin BienBon)
- Selection multiple possible
- Les resultats se mettent a jour instantanement apres selection
- Le filtre est combinable avec les autres filtres
- Si le consommateur a defini des preferences alimentaires dans son profil, ces filtres sont pre-appliques par defaut (mais desactivables)

---

## Mockup -- Carte & Navigation (consumer-map)

### Vue Carte -- Defaut
```
┌─────────────────────────────────┐
│ ┌───────────────────────────┐   │
│ │ 🔍 Rechercher un commerce │ 🔔│
│ └───────────────────────────┘   │
│                                 │
│ [Jour ▾][Heure ▾][Type ▾][Pref]│
│                                 │
│ ┌───────────────────────────────┐
│ │                               │
│ │        📍                     │
│ │    📍      📍                 │
│ │                               │
│ │  Port-Louis  📍               │
│ │       📍                      │
│ │            📍                 │
│ │                    📍         │
│ │   📍                          │
│ │            📍                 │
│ │                               │
│ │                     ◎         │
│ │              (Ma position)    │
│ │                               │
│ └───────────────────────────────┘
│                           [⊕]   │
│                                 │
│ Inscrivez-vous pour reserver    │
│ des paniers !           [X]     │
│                                 │
│ ┌──────┬──────┬──────┬──────┐   │
│ │Carte │Liste │Favoris│Profil│  │
│ │  ●   │      │      │      │   │
│ └──────┴──────┴──────┴──────┘   │
└─────────────────────────────────┘
```

### Vue Liste -- Paniers disponibles
```
┌─────────────────────────────────┐
│ ┌───────────────────────────┐   │
│ │ 🔍 Rechercher un commerce │ 🔔│
│ └───────────────────────────┘   │
│                                 │
│ [Jour ▾][Heure ▾][Type ▾][Pref]│
│ Trier: Proximite ▾             │
│                                 │
│ ┌───────────────────────────┐   │
│ │ 🖼 │ Le Chamarel           │   │
│ │    │ Panier Surprise       │   │
│ │    │ 🏷 Rs 150 → Rs 50     │   │
│ │    │ 📅 Auj. 12h-14h       │   │
│ │    │ 📍 0.8 km  [Vege] ♡  │   │
│ │    │ 2 restants            │   │
│ └───────────────────────────┘   │
│ ┌───────────────────────────┐   │
│ │ 🖼 │ Royal Bakery           │   │
│ │    │ Panier Boulangerie    │   │
│ │    │ 🏷 Rs 200 → Rs 65     │   │
│ │    │ 📅 Auj. 16h-18h       │   │
│ │    │ 📍 1.2 km         ♡  │   │
│ │    │ 5 restants            │   │
│ └───────────────────────────┘   │
│                                 │
│ ┌──────┬──────┬──────┬──────┐   │
│ │Carte │Liste │Favoris│Profil│  │
│ │      │  ●   │      │      │   │
│ └──────┴──────┴──────┴──────┘   │
└─────────────────────────────────┘
```

## Mockup -- Recherche & Filtres (consumer-search-results)

### Filtre Type -- Selection
```
┌─────────────────────────────────┐
│ ┌───────────────────────────┐   │
│ │ 🔍 Rechercher un commerce │ 🔔│
│ └───────────────────────────┘   │
│                                 │
│ [Jour ▾][Heure ▾][Type●][Pref] │
│                                 │
│ ┌───────────────────────────┐   │
│ │  Type de panier            │   │
│ │  (selection multiple)      │   │
│ │                           │   │
│ │  ☑ Boulangerie      (12) │   │
│ │  ☑ Patisserie        (8) │   │
│ │  ☐ Restaurant       (15) │   │
│ │  ☐ Supermarche       (6) │   │
│ │  ☐ Fruits & Legumes  (4) │   │
│ │  ☐ Hotel             (3) │   │
│ │  ☐ Traiteur          (5) │   │
│ │                           │   │
│ │  ┌───────────────────┐    │   │
│ │  │   APPLIQUER (20)  │    │   │
│ │  └───────────────────┘    │   │
│ │  Reinitialiser les filtres│   │
│ └───────────────────────────┘   │
│                                 │
│ ┌──────┬──────┬──────┬──────┐   │
│ │Carte │Liste │Favoris│Profil│  │
│ │      │  ●   │      │      │   │
│ └──────┴──────┴──────┴──────┘   │
└─────────────────────────────────┘
```

### Filtre Preferences alimentaires
```
┌─────────────────────────────────┐
│ ┌───────────────────────────┐   │
│ │ 🔍 Rechercher un commerce │ 🔔│
│ └───────────────────────────┘   │
│                                 │
│ [Jour ▾][Heure ▾][Type ▾][Pref●]
│                                 │
│ ┌───────────────────────────┐   │
│ │  Preferences alimentaires  │   │
│ │  (selection multiple)      │   │
│ │                           │   │
│ │  ☑ Vegetarien             │   │
│ │  ☐ Vegan                  │   │
│ │  ☑ Halal                  │   │
│ │                           │   │
│ │  ℹ Vos preferences        │   │
│ │  personnelles sont pre-   │   │
│ │  appliquees. Vous pouvez  │   │
│ │  les modifier ici ou dans │   │
│ │  Profil > Preferences.    │   │
│ │                           │   │
│ │  ┌───────────────────┐    │   │
│ │  │   APPLIQUER       │    │   │
│ │  └───────────────────┘    │   │
│ │  Reinitialiser les filtres│   │
│ └───────────────────────────┘   │
└─────────────────────────────────┘
```

---

## Assets requis

**Illustrations etats vides :**
- `../../assets/illustrations/empty-states/empty-state-aucun-panier.png` -- Aucun panier disponible dans la zone
- `../../assets/illustrations/empty-states/empty-state-carte-vide.png` -- Carte sans resultats

**Logo :**
- `../../assets/logos/logo-principal.png`
