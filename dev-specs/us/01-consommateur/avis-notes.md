# Avis & Notes

> US couvertes : US-C045, US-C046

---

### US-C045 — Noter un partenaire après retrait
**En tant que** consommateur, **je veux** attribuer une note en étoiles à un partenaire après avoir retiré mon panier **afin d'** exprimer mon niveau de satisfaction et aider les autres consommateurs.

**Critères d'acceptation :**
- La notation est disponible uniquement après validation du retrait par le partenaire (scan QR ou saisie PIN)
- Un prompt de notation est affiché automatiquement après le retrait (ou à la prochaine ouverture de l'app si le consommateur quitte l'app au moment du retrait)
- Notation en étoiles de 1 à 5 (1 = très mauvais, 5 = excellent)
- Le consommateur tape sur le nombre d'étoiles souhaité
- Un seul avis est autorisé par réservation
- Le consommateur peut modifier sa note dans les 24 heures suivant le retrait ; au-delà, la note est figée
- La note est publique et visible sur la fiche du partenaire (agrégée en moyenne)
- Aucun commentaire texte n'est autorisé dans la notation (les commentaires et photos sont réservés au formulaire de réclamation)
- Le consommateur peut choisir de ne pas noter ("Pas maintenant" ou "Ignorer")
- Si le consommateur ne note pas immédiatement, le prompt est reproposé à la prochaine ouverture de l'app (maximum 2 rappels)
- Après 2 refus, le prompt n'est plus affiché mais la notation reste accessible depuis l'historique des réservations

---

---

### US-C046 — Voir les avis sur un partenaire
**En tant que** consommateur, **je veux** voir les notes des autres consommateurs sur un partenaire **afin de** me faire une idée de la qualité des paniers proposés.

**Critères d'acceptation :**
- La note moyenne est affichée sur la fiche du partenaire sous forme d'étoiles (avec une décimale, ex. 4.3)
- Le nombre total d'avis est affiché à côté de la note moyenne
- La distribution des notes est visible (barre de progression pour chaque niveau d'étoiles : nombre de 5 étoiles, 4 étoiles, etc.)
- La note moyenne est également visible dans les résultats de recherche (carte de panier et marqueur sur la carte)
- Si le partenaire n'a aucun avis, le message "Pas encore d'avis" est affiché à la place de la note
- La note moyenne est calculée sur les 12 derniers mois (les notes plus anciennes ne sont plus prises en compte mais restent consultables)

---

## 1.8 Réclamations

---

---

## Mockups

### consumer-reviews

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │   Comment était votre     │  │
│  │   panier chez             │  │
│  │   Le Chamarel ?           │  │
│  │                           │  │
│  │                           │  │
│  │    ☆  ☆  ☆  ☆  ☆         │  │
│  │                           │  │
│  │   Tapez sur les étoiles   │  │
│  │   pour noter              │  │
│  │                           │  │
│  │                           │  │
│  │  ┌─────────────────────┐  │  │
│  │  │   PAS MAINTENANT    │  │  │
│  │  └─────────────────────┘  │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

---

## Assets requis

| Asset | Chemin |
|-------|--------|
| etat vide avis | `../../assets/illustrations/empty-states/empty-state-avis.png` |

