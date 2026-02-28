# Favoris

> US couvertes : US-C050, US-C051, US-C052, US-C053

---

### US-C050 — Ajouter un partenaire en favori
**En tant que** consommateur, **je veux** ajouter un partenaire à mes favoris **afin de** le retrouver facilement et être alerté de ses prochains paniers.

**Critères d'acceptation :**
- Un bouton favori (icône cœur) est présent sur : la fiche du partenaire, la carte de panier dans la liste, le marqueur du partenaire sur la carte (dans l'infobulle)
- Le clic sur le cœur l'active (cœur plein, couleur) et ajoute le partenaire aux favoris
- L'ajout est instantané (pas de temps de chargement)
- Une micro-animation confirme l'ajout (le cœur se remplit)
- Un toast (message temporaire) confirme : "[Nom du partenaire] ajouté à vos favoris"
- Le consommateur commencera à recevoir des notifications quand ce partenaire publiera un nouveau panier
- L'action est possible uniquement si le consommateur est connecté (en mode invité, redirection vers l'inscription — US-C013)

---

---

### US-C051 — Retirer un partenaire des favoris
**En tant que** consommateur, **je veux** retirer un partenaire de mes favoris **afin de** ne plus recevoir d'alertes le concernant.

**Critères d'acceptation :**
- Le retrait est possible depuis : la fiche du partenaire (clic sur le cœur plein), la liste des favoris (swipe gauche ou bouton)
- Le clic sur le cœur le désactive (cœur vide)
- Le retrait est instantané
- Un toast confirme : "[Nom du partenaire] retiré de vos favoris"
- Le consommateur ne reçoit plus les notifications de nouveau panier pour ce partenaire
- Aucune confirmation supplémentaire n'est demandée (action réversible facilement)

---

---

### US-C052 — Voir la liste de mes favoris
**En tant que** consommateur, **je veux** voir la liste de mes partenaires favoris **afin de** accéder rapidement à leurs offres et vérifier les paniers disponibles.

**Critères d'acceptation :**
- Accessible depuis le menu principal (onglet "Favoris" ou icône cœur)
- Liste de tous les partenaires marqués en favori, avec pour chacun : photo, nom du commerce, type de commerce, distance, indicateur de disponibilité ("X panier(s) disponible(s)" ou "Aucun panier disponible")
- Les partenaires ayant des paniers disponibles sont affichés en premier
- Un tap sur un partenaire ouvre sa fiche (US-C021)
- Possibilité de retirer un favori par swipe gauche ou bouton
- Si aucun favori, l'écran d'état vide est affiché (US-C023) : "Vous n'avez pas encore de favoris. Explorez les partenaires et ajoutez vos préférés !"

---

---

### US-C053 — Alerte nouveau panier d'un favori
**En tant que** consommateur, **je veux** être alerté en temps réel quand un partenaire favori publie un nouveau panier **afin de** ne pas rater ses offres.

**Critères d'acceptation :**
- Une notification push est envoyée dès qu'un partenaire favori publie un nouveau panier
- La notification contient : nom du partenaire, titre du panier, prix de vente, créneau de retrait
- La notification est cliquable et ouvre directement le détail du panier
- Si plusieurs partenaires favoris publient des paniers en même temps, chaque panier génère une notification individuelle (pas de regroupement)
- L'alerte respecte les préférences de notification du consommateur (désactivable dans les paramètres)
- L'alerte n'est pas envoyée si le consommateur a désactivé les notifications de favoris

---

## 1.10 Profil & Préférences

---

---

## Mockups

### consumer-favorites

```
┌─────────────────────────────────┐
│  Mes Favoris              🔔   │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🖼 │ Le Chamarel        ❤ │  │
│  │    │ Restaurant           │  │
│  │    │ 📍 0.8 km             │  │
│  │    │ 3 paniers disponibles│  │
│  │    │ ⭐ 4.5 (127 avis)    │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🖼 │ Royal Bakery       ❤ │  │
│  │    │ Boulangerie          │  │
│  │    │ 📍 1.2 km             │  │
│  │    │ 5 paniers disponibles│  │
│  │    │ ⭐ 4.7 (89 avis)     │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🖼 │ Grand Baie Hôtel  ❤ │  │
│  │    │ Hôtel                │  │
│  │    │ 📍 12.5 km            │  │
│  │    │ Aucun panier dispo   │  │
│  │    │ ⭐ 4.2 (43 avis)     │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🖼 │ Chez Nando         ❤ │  │
│  │    │ Restaurant           │  │
│  │    │ 📍 2.1 km             │  │
│  │    │ Aucun panier dispo   │  │
│  │    │ ⭐ 4.0 (62 avis)     │  │
│  └───────────────────────────┘  │
│                                 │
│ ┌──────┬──────┬──────┬──────┐   │
│ │Carte │Liste │Favoris│Profil│  │
│ │      │      │  ●   │      │   │
│ └──────┴──────┴──────┴──────┘   │
└─────────────────────────────────┘
```

---

## Assets requis

| Asset | Chemin |
|-------|--------|
| etat vide favoris | `../../assets/illustrations/empty-states/empty-state-favoris.png` |

