# Moderation

> US couvertes : US-A023, US-A024, US-A025, US-A026

---

### US-A023 -- Voir les réclamations ouvertes
**En tant qu'** admin BienBon, **je veux** voir la liste de toutes les réclamations ouvertes et non résolues **afin de** les traiter par ordre de priorité.

**Critères d'acceptation :**
- Liste des réclamations affichant : date d'ouverture, nom du consommateur, nom du partenaire, panier concerné, statut (ouverte, en cours de traitement), ancienneté (depuis combien de temps la réclamation est ouverte)
- Tri par défaut : date d'ouverture croissante (les plus anciennes en premier)
- Badge/compteur visible en permanence dans le menu de navigation
- Filtre par statut (ouverte, en cours), par partenaire, par date
- Mise en évidence visuelle des réclamations ouvertes depuis plus de 24h (urgentes) et depuis plus de 48h (critiques)
- Indicateur du nombre de réclamations précédentes du consommateur et du partenaire (aide à la décision)

---

---

### US-A024 -- Consulter le détail complet d'une réclamation
**En tant qu'** admin BienBon, **je veux** voir le détail complet d'une réclamation **afin de** disposer de toutes les informations nécessaires pour prendre une décision éclairée.

**Critères d'acceptation :**
- Informations affichées :
  - **Réclamation** : date d'ouverture, commentaire du consommateur, photos jointes par le consommateur
  - **Réservation concernée** : date de réservation, panier (titre, description, valeur initiale, prix de vente), date et heure du retrait validé, montant payé
  - **Consommateur** : nom, email, nombre total de réclamations passées, ratio de réclamations par rapport au nombre de retraits, historique des réclamations précédentes (résumé)
  - **Partenaire** : nom du commerce, nombre total de réclamations reçues, ratio de réclamations par rapport au nombre de retraits, note moyenne, historique des réclamations reçues (résumé)
- Possibilité de changer le statut en "en cours de traitement" (pour signaler aux autres admins qu'un admin s'en occupe)
- L'admin traitant la réclamation est identifié
- Accès direct à la fiche complète du consommateur et du partenaire depuis la réclamation

---

---

### US-A025 -- Résoudre une réclamation
**En tant qu'** admin BienBon, **je veux** résoudre une réclamation en prenant une décision **afin de** clore le litige de manière équitable.

**Critères d'acceptation :**
- Options de résolution :
  - **Remboursement total** : le montant intégral de la transaction est recrédité au consommateur
  - **Remboursement partiel** : l'admin saisit le montant à rembourser (entre 1 Rs et le montant total de la transaction)
  - **Rejet de la réclamation** : aucun remboursement
- Commentaire/motif de résolution obligatoire (visible par le consommateur et le partenaire)
- Confirmation requise avant résolution ("Vous allez [rembourser X Rs / rejeter la réclamation]. Confirmer ?")
- À la résolution :
  - Si remboursement : le montant est recrédité automatiquement sur le moyen de paiement utilisé par le consommateur
  - Le consommateur est notifié de la décision (push + email) avec le motif et le montant remboursé le cas échéant
  - Le partenaire est notifié de la réclamation et de sa résolution (push + email)
  - La réclamation passe en statut "résolue"
  - L'action est tracée dans le journal d'activité (admin résolveur, décision, montant)
- La commission BienBon sur la transaction est recalculée en cas de remboursement (partiel ou total)

---

---

### US-A026 -- Modérer les avis
**En tant qu'** admin BienBon, **je veux** pouvoir visualiser les notes données par les consommateurs et supprimer celles qui sont abusives **afin de** maintenir la fiabilité du système de notation sur la plateforme.

**Critères d'acceptation :**
- Voir la liste des notes données par les consommateurs (note sur 5, date, consommateur, partenaire)
- Filtres : par partenaire, par note (1 à 5 étoiles), par date
- Détecter les notes suspectes (ex : même consommateur qui met toujours 1 étoile, ou variations anormales de la note moyenne d'un partenaire)
- Supprimer une note en cas d'abus avéré :
  - Justification obligatoire (texte libre)
  - Confirmation requise
  - La note est retirée de la fiche du partenaire
  - La note moyenne du partenaire est recalculée
  - Le consommateur est notifié de la suppression (avec le motif)
  - L'action est tracée dans le journal d'activité (admin, note concernée, motif)
- Pas de modération de texte puisqu'il n'y en a pas (les avis sont uniquement des notes sur 5, sans commentaire textuel)

---

## 3.5 Facturation & Commission

---

## Mockups

### admin-moderation

```
┌────────────────────────────────────────────────────────────────────┐
│  BienBon Admin                                 👤 Admin · FR ▼   │
├─────────┬──────────────────────────────────────────────────────────┤
│         │  Modération > Réclamations               🔴 7 ouvertes │
│ 📊 Dash │                                                        │
│ 👥 Part.│  Filtres: [Statut ▼] [Partenaire ▼] [Date ▼]          │
│ 🛒 Conso│  Tri: [ Date ouverture (+ ancien) ▼ ]                  │
│ ⚖ Modér│                                                        │
│  🔴 7   │  ┌────┬───────┬─────────────┬──────────────┬─────────┐ │
│ 💰 Fact.│  │ #  │ Date  │ Consom.     │ Partenaire   │ Statut  │ │
│ 📋 Audit│  ├────┼───────┼─────────────┼──────────────┼─────────┤ │
│ 🛡 Fraud│  │ 1  │ 04/02 │ Priya D.   │ Chez Ravi    │ 🔴 Ouv. │ │
│ ⚙ Param│  │    │ 3j    │ 1ère récl.  │ 2 récl. tot. │ > 48h ! │ │
│         │  ├────┼───────┼─────────────┼──────────────┼─────────┤ │
│         │  │ 2  │ 05/02 │ Raj D.     │ Le Chamarel  │ 🟡 Ouv. │ │
│         │  │    │ 2j    │ 3 récl.    │ 8 récl. tot. │ > 24h   │ │
│         │  ├────┼───────┼─────────────┼──────────────┼─────────┤ │
│         │  │ 3  │ 05/02 │ Sophie M.  │ Royal Bakery │ 🟡 Ouv. │ │
│         │  │    │ 2j    │ 1ère récl.  │ 4 récl. tot. │ > 24h   │ │
│         │  ├────┼───────┼─────────────┼──────────────┼─────────┤ │
│         │  │ 4  │ 06/02 │ Anisha D.  │ Fleur de Sel │ 🔵 EnCrs│ │
│         │  │    │ 1j    │ 2 récl.    │ 1 récl. tot. │ Admin K.│ │
│         │  ├────┼───────┼─────────────┼──────────────┼─────────┤ │
│         │  │ 5  │ 07/02 │ Marc L.    │ Le Chamarel  │ Ouverte │ │
│         │  │    │ <1j   │ 1ère récl.  │ 8 récl. tot. │         │ │
│         │  ├────┼───────┼─────────────┼──────────────┼─────────┤ │
│         │  │ 6  │ 07/02 │ Nadia B.   │ Sweet Corner │ Ouverte │ │
│         │  │    │ <1j   │ 1ère récl.  │ 1 récl. tot. │         │ │
│         │  ├────┼───────┼─────────────┼──────────────┼─────────┤ │
│         │  │ 7  │ 07/02 │ Dev P.     │ Chez Ravi    │ Ouverte │ │
│         │  │    │ <1j   │ 4 récl.    │ 2 récl. tot. │         │ │
│         │  └────┴───────┴─────────────┴──────────────┴─────────┘ │
│         │                                                        │
│         │  🔴 > 48h (critique)  🟡 > 24h (urgent)               │
│         │  🔵 En cours de traitement                              │
│         │                                                        │
│         │  Onglets: [Réclamations (7)] [Modération avis]         │
│         │                                                        │
└─────────┴──────────────────────────────────────────────────────────┘
```

