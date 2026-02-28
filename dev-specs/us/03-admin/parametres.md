# Parametres

> US couvertes : US-A042, US-A043

---

### US-A042 -- Gérer les catégories de paniers
**En tant qu'** admin BienBon, **je veux** gérer les catégories/types de paniers disponibles sur la plateforme **afin de** structurer l'offre et faciliter la navigation des consommateurs.

**Critères d'acceptation :**
- Liste des catégories existantes avec : nom, nombre de paniers utilisant cette catégorie, statut (active/inactive)
- Possibilité d'ajouter une nouvelle catégorie (nom obligatoire, icône optionnelle)
- Possibilité de modifier le nom ou l'icône d'une catégorie existante
- Chaque catégorie possède un nom dans chaque langue supportée (français, anglais, créole mauricien). Lors de la création ou modification d'une catégorie, l'admin saisit les traductions pour chaque langue. Si une traduction manque, la catégorie s'affiche dans la langue par défaut (français).
- Possibilité de désactiver une catégorie (elle n'est plus proposée aux partenaires lors de la création de paniers, mais les paniers existants utilisant cette catégorie restent affichés)
- Possibilité de réactiver une catégorie désactivée
- Suppression possible uniquement si aucun panier n'utilise cette catégorie (sinon, désactivation obligatoire)
- Les catégories sont utilisées par les partenaires lors de la création de paniers (sélection obligatoire)
- Les catégories sont utilisées comme filtres par les consommateurs
- Toute modification est tracée dans le journal d'activité

---

---

### US-A043 -- Gérer les tags de préférences alimentaires
**En tant qu'** admin BienBon, **je veux** gérer les tags de préférences alimentaires disponibles **afin d'** adapter les filtres de recherche aux besoins alimentaires des consommateurs mauriciens.

**Critères d'acceptation :**
- Liste des tags existants avec : nom, nombre de paniers utilisant ce tag, nombre de consommateurs ayant ce tag en préférence, statut (actif/inactif)
- Possibilité d'ajouter un nouveau tag (nom obligatoire, icône optionnelle, description optionnelle)
- Possibilité de modifier le nom, l'icône ou la description d'un tag existant
- Les tags système (Halal, Végétarien, etc.) sont traduits automatiquement dans toutes les langues supportées. Les tags personnalisés créés par l'admin doivent être saisis dans chaque langue supportée (français, anglais, créole mauricien). Si une traduction manque, le tag s'affiche dans la langue par défaut (français).
- Possibilité de désactiver un tag (il n'est plus proposé aux partenaires ni aux consommateurs, mais les paniers existants conservent le tag)
- Possibilité de réactiver un tag désactivé
- Suppression possible uniquement si aucun panier et aucun consommateur n'utilise ce tag
- Les tags sont utilisables par les partenaires pour taguer leurs paniers (sélection multiple optionnelle)
- Les tags sont utilisables par les consommateurs pour filtrer les paniers et définir leurs préférences
- Toute modification est tracée dans le journal d'activité

---

---

## Mockups

### admin-settings

```
┌────────────────────────────────────────────────────────────────────┐
│  BienBon Admin                                 👤 Admin · FR ▼   │
├─────────┬──────────────────────────────────────────────────────────┤
│         │  ⚙ Paramètres > Catégories de paniers                  │
│ 📊 Dash │                                                        │
│ 👥 Part.│  Onglets: [Catégories] [Tags alim.] [Admins]           │
│ 🛒 Conso│           [Jours fériés] [Seuils anti-fraude]          │
│ ⚖ Modér│                                                        │
│ 💰 Fact.│  [ + Ajouter une catégorie ]                           │
│ 📋 Audit│                                                        │
│ 🛡 Fraud│  ┌────┬──────────────────┬─────────┬────────┬────────┐ │
│ ⚙ Param│  │ #  │ Catégorie (FR)   │ Paniers │ Statut │Actions │ │
│         │  ├────┼──────────────────┼─────────┼────────┼────────┤ │
│         │  │ 1  │ 🍽 Repas complet  │    312  │ Active │ ✏ ⏸   │ │
│         │  │    │ EN: Full meal    │         │        │        │ │
│         │  │    │ KR: Repa konple  │         │        │        │ │
│         │  ├────┼──────────────────┼─────────┼────────┼────────┤ │
│         │  │ 2  │ 🥐 Viennoiseries │    198  │ Active │ ✏ ⏸   │ │
│         │  │    │ EN: Pastries     │         │        │        │ │
│         │  │    │ KR: Vienwazon    │         │        │        │ │
│         │  ├────┼──────────────────┼─────────┼────────┼────────┤ │
│         │  │ 3  │ 🧁 Pâtisseries   │    145  │ Active │ ✏ ⏸   │ │
│         │  ├────┼──────────────────┼─────────┼────────┼────────┤ │
│         │  │ 4  │ 🥗 Salades/Frais │     87  │ Active │ ✏ ⏸   │ │
│         │  ├────┼──────────────────┼─────────┼────────┼────────┤ │
│         │  │ 5  │ 🍱 Panier mixte  │    234  │ Active │ ✏ ⏸   │ │
│         │  ├────┼──────────────────┼─────────┼────────┼────────┤ │
│         │  │ 6  │ 🥤 Boissons      │     45  │ Active │ ✏ ⏸   │ │
│         │  ├────┼──────────────────┼─────────┼────────┼────────┤ │
│         │  │ 7  │ 🍕 Snacks        │      0  │ Inact. │ ✏ ▶ 🗑│ │
│         │  └────┴──────────────────┴─────────┴────────┴────────┘ │
│         │                                                        │
│         │  ✏ Modifier  ⏸ Désactiver  ▶ Réactiver  🗑 Supprimer  │
│         │  (suppr. possible uniquement si 0 paniers)             │
│         │                                                        │
│         │  ┌─ Ajouter une catégorie ───────────────────────┐     │
│         │  │ Icône (optionnel) : [ 🍎 ]                    │     │
│         │  │                                               │     │
│         │  │ Traductions :                                 │     │
│         │  │ 🇫🇷 Français (requis) :                        │     │
│         │  │    [ Fruits & Légumes                     ]   │     │
│         │  │ 🇬🇧 Anglais :                                  │     │
│         │  │    [ Fruits & Vegetables                  ]   │     │
│         │  │ 🇲🇺 Créole mauricien :                         │     │
│         │  │    [ Frir ek Legim                        ]   │     │
│         │  │                                               │     │
│         │  │ Si une traduction manque, la catégorie        │     │
│         │  │ s'affiche en français (langue par défaut).    │     │
│         │  │                                               │     │
│         │  │          [ Annuler ]   [ + Ajouter ]          │     │
│         │  └───────────────────────────────────────────────┘     │
│         │                                                        │
└─────────┴──────────────────────────────────────────────────────────┘
```

