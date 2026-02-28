# Statistiques & Dashboard

> US couvertes : US-P032, US-P033, US-P034

---

### US-P032 -- Voir les statistiques de base
**En tant que** partenaire, **je veux** voir un tableau de bord avec mes statistiques clés **afin de** suivre la performance de mon activité sur BienBon.

**Critères d'acceptation :**
- Le tableau de bord est la page d'accueil du dashboard partenaire
- **KPIs affichés :**
  - Nombre total de paniers vendus (retirés)
  - Nombre total de paniers sauvés du gaspillage (retirés)
  - Chiffre d'affaires total généré (somme des prix de vente des paniers retirés)
  - Note moyenne des consommateurs (étoiles, sur 5)
  - Nombre total d'avis reçus
  - Taux de no-show (pourcentage)
- **Période sélectionnable :**
  - Cette semaine
  - Ce mois
  - Ce trimestre
  - Depuis le début (total)
  - Période personnalisée (date de début, date de fin)
- Les KPIs se mettent à jour en fonction de la période sélectionnée
- Affichage visuel clair avec des cartes/widgets et des indicateurs de tendance (flèche haut/bas par rapport à la période précédente)

---

---

### US-P033 -- Consulter les analytics avancés (LACUNE #17)
**En tant que** partenaire, **je veux** accéder à des analytics avancés sur mes ventes **afin de** optimiser mes offres et comprendre ce qui fonctionne le mieux.

**Critères d'acceptation :**
- Section "Analytics" accessible depuis le dashboard partenaire
- **Analyse par jour de la semaine :**
  - Graphique en barres montrant le nombre de paniers vendus par jour de la semaine
  - Identification du/des jour(s) où les ventes sont les meilleures
  - Graphique montrant le taux de remplissage par jour (paniers vendus / paniers proposés)
- **Analyse par type de panier :**
  - Performance par tag (sucré, salé, mixte) : nombre de ventes, CA, taux de remplissage
  - Classement des types de paniers par performance
  - Identification du type de panier le plus populaire
- **Analyse par créneau horaire :**
  - Graphique montrant les créneaux horaires les plus demandés
  - Recommandations : "Les paniers publiés pour un retrait entre [Xh] et [Yh] se vendent [Z]% mieux"
- **Taux de no-show :**
  - Évolution du taux de no-show dans le temps (graphique linéaire)
  - Comparaison avec la moyenne de la plateforme (si disponible)
  - Alerte si le taux de no-show dépasse un seuil (ex: > 20%)
- **Tendances :**
  - Évolution du nombre de paniers vendus sur les 3 derniers mois (graphique linéaire)
  - Évolution du chiffre d'affaires sur les 3 derniers mois
  - Évolution de la note moyenne
- **Indicateurs de performance :**
  - Taux de remplissage global (paniers vendus / paniers proposés)
  - Délai moyen entre publication et première réservation
  - Nombre moyen de réservations par panier
- Période sélectionnable pour toutes les analyses (semaine, mois, trimestre, année, personnalisé)
- Les données sont présentées sous forme de graphiques visuels (barres, lignes, camemberts)

---

---

### US-P034 -- Voir l'historique détaillé des ventes
**En tant que** partenaire, **je veux** voir le détail de toutes mes ventes **afin d'** avoir une traçabilité complète de mon activité.

**Critères d'acceptation :**
- Liste détaillée de toutes les transactions avec :
  - Date de la transaction
  - Titre du panier
  - Quantité vendue
  - Prix unitaire
  - Montant total de la vente
  - Commission BienBon prélevée (montant)
  - Montant net (montant - commission)
  - Statut : retiré, no-show, annulé, remboursé
- Filtrable par :
  - Période (date de début, date de fin)
  - Statut
  - Panier
- Tri par date (les plus récentes en premier) par défaut
- **Totaux sur la période sélectionnée :**
  - Nombre total de transactions
  - Montant total des ventes
  - Total des commissions
  - Montant net total
- Export en CSV pour la comptabilité

---

## 2.8 Notifications Partenaire

> **Note importante (LACUNE #13)** : chaque notification ci-dessous dispose de critères d'acceptation complets, incluant le déclencheur, le canal, le contenu du message, et le comportement attendu.

---

---

## Mockups

### partner-dashboard

```
┌──────────────────────────────────────────────────────┐
│  BienBon - Dashboard Partenaire                      │
│  Nav: Paniers | Réservations | Stats | Mon commerce  │
│──────────────────────────────────────────────────────│
│                                                      │
│  Bonjour Jean !                  Le Chamarel         │
│                                                      │
│  Période : [Ce mois v]  Fév 2026                     │
│  [Semaine] [Mois] [Trimestre] [Total] [Personnalisé] │
│                                                      │
│  ┌────────────────┐ ┌────────────────┐ ┌───────────┐ │
│  │ Paniers vendus │ │ Paniers sauvés │ │ CA généré  │ │
│  │                │ │                │ │            │ │
│  │     127        │ │     127        │ │  Rs 5,080  │ │
│  │   (+12% /M-1)  │ │   (+12% /M-1)  │ │ (+8% /M-1)│ │
│  └────────────────┘ └────────────────┘ └───────────┘ │
│                                                      │
│  ┌────────────────┐ ┌────────────────┐ ┌───────────┐ │
│  │ Note moyenne   │ │ Avis reçus     │ │ No-show   │ │
│  │                │ │                │ │            │ │
│  │   4.3 / 5      │ │     45         │ │   8%       │ │
│  │  (+0.2 /M-1)   │ │  (+10 /M-1)    │ │ (-2% /M-1)│ │
│  └────────────────┘ └────────────────┘ └───────────┘ │
│                                                      │
│  ── Actions rapides ──                               │
│  [ + Créer un panier ] [ Panier Flash ]              │
│  [ Scanner un retrait ] [ Voir réservations ]        │
│                                                      │
│  ── Aujourd'hui ──                                   │
│  Paniers actifs : 2 | Réservations : 8               │
│  Prochain créneau : 17h30-19h00 (dans 2h)           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

