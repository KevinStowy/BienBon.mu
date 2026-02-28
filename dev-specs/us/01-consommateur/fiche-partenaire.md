# Fiche Partenaire & Detail Panier

> **Ecrans couverts :** Recherche partenaire, fiche partenaire, detail panier, ecrans d'etats vides
> **User Stories :** US-C020, US-C021, US-C022, US-C023

---

## US-C020 -- Rechercher un partenaire par nom

**En tant que** consommateur, **je veux** rechercher un partenaire par son nom **afin de** trouver directement un commerce que je connais.

**Criteres d'acceptation :**
- Une barre de recherche est accessible en haut de l'ecran d'accueil (liste ou carte)
- La recherche est tolerante aux fautes de frappe (fuzzy search)
- La recherche est insensible a la casse et aux accents
- Les resultats s'affichent en temps reel pendant la saisie (auto-completion)
- Les resultats affichent : nom du partenaire, type de commerce, distance, nombre de paniers disponibles
- Un tap sur un resultat ouvre la fiche partenaire (US-C021)
- Si aucun resultat ne correspond, l'ecran d'etat vide est affiche (US-C023)
- L'historique des dernieres recherches est propose a l'ouverture du champ de recherche (maximum 5 recherches recentes)
- Un bouton "Effacer" permet de vider le champ de recherche

---

## US-C021 -- Voir la fiche d'un partenaire

**En tant que** consommateur, **je veux** voir la fiche complete d'un partenaire **afin d'** en savoir plus sur le commerce avant de reserver un panier.

**Criteres d'acceptation :**
- La fiche affiche : nom du commerce, description, galerie de photos du commerce (scrollable), adresse complete, horaires d'ouverture, note moyenne (etoiles, avec une decimale ex. 4.3), nombre total de notes, distance depuis la position du consommateur, type de commerce (badge)
- Aucun avis textuel public n'est affiche ; seule la note moyenne (etoiles) et le nombre total de notes sont visibles. Pas de liste d'avis, pas de commentaires visibles.
- Section "Paniers disponibles" : liste des paniers actuellement disponibles chez ce partenaire avec prix, creneau, stock restant
- Bouton favori (coeur) pour ajouter/retirer le partenaire des favoris
- Bouton "Itineraire" pour lancer la navigation GPS (US-C045)
- Bouton de partage pour partager la fiche du partenaire (US-C054)
- Si le partenaire n'a aucun panier disponible, un message l'indique : "Aucun panier disponible pour le moment. Ajoutez ce partenaire en favori pour etre alerte des prochaines offres."

---

## US-C022 -- Voir le detail d'un panier

**En tant que** consommateur, **je veux** voir le detail complet d'un panier **afin de** decider si je souhaite le reserver.

**Criteres d'acceptation :**
- La page de detail affiche : nom du partenaire (cliquable vers la fiche partenaire), photo du panier (ou photo du commerce en fallback si aucune photo de panier), titre du panier, description du panier (si renseignee par le partenaire), contenu indicatif (si renseigne -- mention "Le contenu exact peut varier"), tags de preference alimentaire (vegetarien, vegan, halal) sous forme de badges, valeur initiale estimee (prix barre), prix de vente BienBon, pourcentage de reduction affiche ("- 60%"), creneau de retrait (date + heure debut - heure fin), adresse du partenaire avec mini-carte, distance depuis la position du consommateur, nombre de paniers restants
- Mention "Ce que vous allez sauver" avec une estimation de l'impact (ex. "1 panier sauve")
- Bouton "Reserver" bien visible
- Si le panier est epuise, le bouton "Reserver" est desactive et affiche "Epuise" ; le consommateur peut ajouter le partenaire en favori pour etre alerte de la prochaine offre
- Si le creneau de retrait est passe, le panier n'est plus accessible
- Bouton de partage pour partager le panier (US-C054)

---

## US-C023 -- Ecrans d'etats vides

**En tant que** consommateur, **je veux** voir des ecrans informatifs et engageants lorsque aucun contenu n'est disponible **afin de** comprendre la situation et savoir quoi faire (LACUNE #29).

**Criteres d'acceptation :**
- **Aucun panier disponible** (accueil/carte/liste) : illustration sympathique + message "Aucun panier disponible pour le moment autour de vous. Revenez bientot ou elargissez votre zone de recherche !" + bouton "Elargir la zone" ou "Activer les alertes"
- **Aucun resultat de recherche** : illustration + message "Aucun resultat pour '[terme recherche]'. Verifiez l'orthographe ou essayez un autre terme." + suggestions de partenaires populaires
- **Aucun favori** : illustration + message "Vous n'avez pas encore de favoris. Explorez les partenaires et ajoutez vos preferes !" + bouton "Explorer les partenaires"
- **Aucune reservation en cours** : illustration + message "Aucune reservation en cours. Decouvrez les paniers disponibles pres de chez vous !" + bouton "Voir les paniers"
- **Aucun historique de reservation** : illustration + message "Vous n'avez pas encore de reservations passees. Reservez votre premier panier !" + bouton "Decouvrir les paniers"
- **Aucune notification** : illustration + message "Pas de notification pour le moment. Ajoutez des favoris pour etre alerte des nouvelles offres !"
- Chaque ecran vide comporte une illustration coherente avec la charte graphique BienBon
- Le texte est affiche dans la langue selectionnee par le consommateur

---

## Mockup -- Fiche Partenaire & Detail Panier (consumer-shop-detail)

### Recherche partenaire -- Saisie
```
┌─────────────────────────────────┐
│ ┌───────────────────────────┐   │
│ │ 🔍 Le Cha             [X] │   │
│ └───────────────────────────┘   │
│                                 │
│  Recherches recentes            │
│  ┌───────────────────────────┐  │
│  │ 🕐 Royal Bakery           │  │
│  │ 🕐 Chez Nando             │  │
│  │ 🕐 Grand Baie Hotel       │  │
│  └───────────────────────────┘  │
│                                 │
│  Resultats                      │
│  ┌───────────────────────────┐  │
│  │ 🏪 Le Chamarel            │  │
│  │    Restaurant - 0.8 km    │  │
│  │    3 paniers disponibles  │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🏪 Le Chateau de Bel Ombre│  │
│  │    Hotel - 15.2 km        │  │
│  │    1 panier disponible    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Fiche Partenaire -- Defaut
```
┌─────────────────────────────────┐
│  < Retour           ♡    🔗    │
│                                 │
│ ┌───────────────────────────────┐
│ │  🖼 🖼 🖼 (galerie photos)     │
│ │  < Photo 1/3 >               │
│ └───────────────────────────────┘
│                                 │
│  Le Chamarel                    │
│  [Restaurant]                   │
│  ⭐ 4.5 (127 notes)             │
│                                 │
│  📍 12 Rue Royale, Port-Louis   │
│     0.8 km de vous              │
│  🕐 Ouvert · Ferme a 22h        │
│                                 │
│  Un restaurant creole           │
│  authentique au coeur de        │
│  Port-Louis, cuisine maison.    │
│                                 │
│  ┌───────────────────────────┐  │
│  │  📍 ITINERAIRE            │  │
│  └───────────────────────────┘  │
│                                 │
│  -- Paniers disponibles (3) --  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Panier Surprise           │  │
│  │ Rs 150 → Rs 50 (-67%)    │  │
│  │ 📅 Auj. 12h-14h           │  │
│  │ 2 restants                │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Panier Vege              │  │
│  │ Rs 120 → Rs 40 (-67%)    │  │
│  │ 📅 Auj. 18h-20h           │  │
│  │ 1 restant                 │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Detail Panier -- Defaut
```
┌─────────────────────────────────┐
│  < Retour                  🔗  │
│                                 │
│ ┌───────────────────────────────┐
│ │  🖼 Photo du panier           │
│ └───────────────────────────────┘
│                                 │
│  Le Chamarel                 >  │
│                                 │
│  Panier Surprise                │
│  [Vege] [Halal]                 │
│                                 │
│  Un assortiment de plats du     │
│  jour et accompagnements.       │
│  Le contenu exact peut varier.  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Valeur estimee  Rs 150    │  │
│  │ Prix BienBon    Rs 50     │  │
│  │                 -67%      │  │
│  └───────────────────────────┘  │
│                                 │
│  📅 Retrait : Auj. 12h00-14h00  │
│  📍 12 Rue Royale, Port-Louis   │
│     0.8 km de vous              │
│  ┌──────────────────────┐       │
│  │ Mini-carte            │       │
│  └──────────────────────┘       │
│                                 │
│  🌍 Ce que vous allez sauver :  │
│  1 panier sauve                 │
│                                 │
│  2 paniers restants             │
│                                 │
│  ┌───────────────────────────┐  │
│  │       RESERVER            │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Etats vides -- Aucun panier dans la zone
```
┌─────────────────────────────────┐
│ ┌───────────────────────────┐   │
│ │ 🔍 Rechercher un commerce │ 🔔│
│ └───────────────────────────┘   │
│                                 │
│ [Jour ▾][Heure ▾][Type ▾][Pref]│
│                                 │
│       ┌─────────────────┐       │
│       │                 │       │
│       │   Illustration  │       │
│       │   ville vide    │       │
│       │                 │       │
│       └─────────────────┘       │
│                                 │
│  Aucun panier disponible        │
│  pour le moment autour de       │
│  vous.                          │
│                                 │
│  Revenez bientot ou             │
│  elargissez votre zone de       │
│  recherche !                    │
│                                 │
│  ┌───────────────────────────┐  │
│  │   ELARGIR LA ZONE        │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │   ACTIVER LES ALERTES    │  │
│  └───────────────────────────┘  │
│                                 │
│ ┌──────┬──────┬──────┬──────┐   │
│ │Carte │Liste │Favoris│Profil│  │
│ │      │  ●   │      │      │   │
│ └──────┴──────┴──────┴──────┘   │
└─────────────────────────────────┘
```

---

## Assets requis

**Illustrations etats vides :**
- `../../assets/illustrations/empty-states/empty-state-aucun-panier.png` -- Aucun panier disponible
- `../../assets/illustrations/empty-states/empty-state-404.png` -- Aucun resultat de recherche
- `../../assets/illustrations/empty-states/empty-state-carte-vide.png` -- Carte vide
- `../../assets/illustrations/empty-states/empty-state-favoris.png` -- Aucun favori
- `../../assets/illustrations/empty-states/empty-state-reservations.png` -- Aucune reservation
- `../../assets/illustrations/empty-states/empty-state-notifications.png` -- Aucune notification
