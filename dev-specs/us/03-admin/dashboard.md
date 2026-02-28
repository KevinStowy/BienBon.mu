# Dashboard Admin

> US couvertes : US-A001, US-A002, US-A003

---

### US-A001 -- Dashboard principal avec KPIs clés
**En tant qu'** admin BienBon, **je veux** voir un tableau de bord synthétique avec les KPIs clés de la plateforme **afin d'** avoir une vue d'ensemble instantanée de la santé de BienBon.

**Critères d'acceptation :**
- Le dashboard affiche les KPIs suivants :
  - Nombre total de consommateurs inscrits (+ variation sur la période)
  - Nombre total de partenaires actifs (+ variation sur la période)
  - Nombre de paniers sauvés du gaspillage (+ variation sur la période)
  - Chiffre d'affaires total de la plateforme (somme des transactions)
  - Revenu BienBon (total des commissions perçues)
  - Nombre de réservations du jour (en cours + complétées)
  - Nombre de réclamations ouvertes (non résolues)
- Chaque KPI affiche la valeur actuelle et la tendance (flèche haut/bas + pourcentage d'évolution par rapport à la période précédente équivalente)
- Des graphiques d'évolution sont affichés pour les métriques principales (CA, paniers sauvés, inscriptions)
- Le dashboard se charge en moins de 3 secondes
- Les données sont rafraîchies automatiquement toutes les 5 minutes ou manuellement via un bouton "Actualiser"

---

---

### US-A002 -- Filtrer les données du dashboard par période
**En tant qu'** admin BienBon, **je veux** filtrer les données du dashboard par période temporelle **afin d'** analyser les tendances et comparer les performances dans le temps.

**Critères d'acceptation :**
- Filtres de période disponibles : aujourd'hui, hier, cette semaine, la semaine dernière, ce mois, le mois dernier, ce trimestre, cette année, période personnalisée (date de début + date de fin)
- Tous les KPIs et graphiques se mettent à jour selon la période sélectionnée
- La variation affichée compare la période sélectionnée à la période précédente équivalente (ex. : ce mois vs le mois dernier)
- La période sélectionnée est persistée dans la session de l'admin (conservée à la navigation)
- Le filtre "Aujourd'hui" est sélectionné par défaut à l'ouverture du dashboard

---

---

### US-A003 -- Focus journalier (résumé quotidien)
**En tant qu'** administrateur, **je veux** voir un résumé quotidien de l'activité de la plateforme **afin de** suivre la performance au jour le jour.

**Critères d'acceptation :**
- Résumé des KPIs du jour : nombre de paniers publiés, nombre de réservations, nombre de retraits effectués, CA du jour
- Comparaison avec la veille et avec le même jour la semaine précédente
- Liste des événements notables du jour (nouveau partenaire inscrit, réclamation ouverte, alerte anti-fraude, etc.)
- Affiché en section dédiée sur le dashboard ou accessible via un onglet "Aujourd'hui"
- Optionnel : envoi d'un email récapitulatif quotidien à l'admin à 22h

---

## 3.2 Gestion des Partenaires

---

## Mockups

### admin-dashboard

```
┌────────────────────────────────────────────────────────────────────┐
│  BienBon Admin                                 👤 Admin · FR ▼   │
├─────────┬──────────────────────────────────────────────────────────┤
│         │  Dashboard                         📅 Aujourd'hui ▼    │
│ 📊 Dash │                                    🔄 Actualiser       │
│ 👥 Part.│  ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│   3 att.│  │   1,247    │ │     45     │ │   3,891    │          │
│ 🛒 Conso│  │ Consos     │ │ Partenaires│ │ Paniers    │          │
│ ⚖ Modér│  │ ↑ +12%     │ │ ↑ +3       │ │ ↑ +234     │          │
│   2 ouv.│  └────────────┘ └────────────┘ └────────────┘          │
│ 💰 Fact.│  ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│ 📋 Audit│  │  Rs 89,450 │ │  Rs 22,362 │ │    127     │          │
│ 🛡 Fraud│  │ CA Total   │ │ Revenu BB  │ │ Réserv.    │          │
│ ⚙ Param│  │ ↑ +18%     │ │ ↑ +18%     │ │  87+40     │          │
│         │  └────────────┘ └────────────┘ └────────────┘          │
│         │  ┌────────────┐                                        │
│         │  │     7      │  Réclamations ouvertes                 │
│         │  │ Réclam.  ! │  ⚠ 2 > 24h · 1 > 48h                  │
│         │  │ ↑ +2       │                                        │
│         │  └────────────┘                                        │
│         │                                                        │
│         │  CA - 30 derniers jours (Rs)                           │
│         │  12K┤                                                  │
│         │  10K┤          ▄▄                                      │
│         │   8K┤     ▄▄▄▄████▄▄                        ▄▄        │
│         │   6K┤  ▄▄██████████████▄▄              ▄▄▄▄████       │
│         │   4K┤▄████████████████████▄▄      ▄▄▄▄██████████      │
│         │   2K┤██████████████████████████▄▄████████████████      │
│         │   0 ┴──────────────────────────────────────────────    │
│         │     1  3  5  7  9  11 13 15 17 19 21 23 25 27 29      │
│         │                                                        │
│         │  Paniers sauvés - 30 derniers jours                    │
│         │  200┤                                                  │
│         │  150┤     ▄▄    ▄▄    ▄▄                   ▄▄         │
│         │  100┤  ▄▄████▄▄████▄▄████▄▄▄▄          ▄▄████         │
│         │   50┤▄████████████████████████▄▄▄▄▄▄▄▄██████████      │
│         │    0┴──────────────────────────────────────────────    │
│         │     1  3  5  7  9  11 13 15 17 19 21 23 25 27 29      │
│         │                                                        │
└─────────┴──────────────────────────────────────────────────────────┘
```

