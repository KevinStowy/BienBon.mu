# Facturation admin

> US couvertes : US-A027, US-A028, US-A029, US-A030

---

### US-A027 -- Configurer les paramètres globaux de commission
**En tant qu'** admin BienBon, **je veux** configurer les paramètres globaux de commission de la plateforme **afin de** définir le modèle économique par défaut applicable à tous les partenaires.

**Critères d'acceptation :**
- Paramètres configurables :
  - **Taux de commission global (%)** : pourcentage par défaut prélevé sur chaque transaction (ex. : 25%)
  - **Fee minimum par transaction (Rs)** : montant minimum de commission par transaction (défaut : 50 Rs). Si le calcul du taux donne un montant inférieur au fee minimum, le fee minimum s'applique
  - **Ratio de réduction minimum (%)** : pourcentage minimum de réduction que le prix de vente doit représenter par rapport à la valeur initiale (défaut : 50%). Un partenaire ne peut pas publier un panier dont le prix de vente est supérieur à (valeur initiale x (1 - ratio minimum))
- Chaque paramètre affiche sa valeur actuelle et la date de dernière modification
- Toute modification requiert une confirmation
- Les nouvelles valeurs s'appliquent aux futures transactions (pas de rétroactivité)
- Les partenaires ayant une configuration spécifique ne sont pas affectés par les changements globaux
- Toute modification est tracée dans le journal d'activité avec les valeurs avant/après et l'admin responsable
- Un récapitulatif en clair est affiché : "Avec ces paramètres, sur un panier vendu 100 Rs, BienBon perçoit X Rs de commission"

---

---

### US-A028 -- Générer les relevés de reversement mensuels
**En tant qu'** admin BienBon, **je veux** générer les relevés de reversement mensuels pour chaque partenaire **afin de** détailler les montants à reverser après déduction de la commission BienBon.

**Critères d'acceptation :**
- Génération automatique le 1er de chaque mois pour le mois précédent
- Possibilité de générer manuellement depuis la section Facturation (bouton "Générer les relevés du mois")
- Le mois est sélectionnable (par défaut : le mois précédent)
- La génération s'effectue en lot pour tous les partenaires ayant eu au moins une transaction sur le mois
- Chaque relevé de reversement contient :
  - Informations du partenaire (nom, adresse, BRN)
  - Informations de BienBon (raison sociale, adresse, numéro d'enregistrement)
  - Période concernée
  - Liste détaillée de toutes les transactions du mois : date, référence du panier, quantité, montant de la vente, taux ou montant de commission appliqué, montant de la commission BienBon
  - Indication "fee minimum appliqué" pour les transactions où le fee minimum a remplacé le calcul au taux
  - Total des ventes brutes du partenaire sur le mois
  - Commission BienBon prélevée (pourcentage + montant)
  - Montant net à reverser au partenaire
  - Date de virement prévu
- Le relevé est envoyé par email au partenaire avec PDF en pièce jointe
- Statut du virement : "En attente", "Viré", "Erreur"
- L'admin peut marquer un virement comme effectué
- Un récapitulatif post-génération est affiché : nombre de relevés générés, montant total des commissions, montant total à reverser
- L'action de génération est tracée dans le journal d'activité
- Prévention de double génération : si les relevés du mois ont déjà été générés, un avertissement est affiché

---

---

### US-A029 -- Voir l'historique des reversements par partenaire
**En tant qu'** admin BienBon, **je veux** voir l'historique des reversements mensuels pour un partenaire donné **afin de** suivre les montants reversés et le statut des virements.

**Critères d'acceptation :**
- Accessible depuis la fiche du partenaire, section "Reversements"
- Liste des relevés de reversement passés avec : période, montant brut des ventes, commission BienBon, montant net reversé, date de virement, statut du virement ("En attente", "Viré", "Erreur")
- Accès au détail de chaque relevé (mêmes informations que le relevé généré)
- Téléchargement de chaque relevé au format PDF
- Possibilité de renvoyer un relevé par email au partenaire
- Total cumulé des montants reversés au partenaire

---

---

### US-A030 -- Voir le chiffre d'affaires total de la plateforme
**En tant qu'** admin BienBon, **je veux** voir le chiffre d'affaires total et le revenu BienBon (commissions) **afin de** suivre la performance financière globale de la plateforme.

**Critères d'acceptation :**
- Vue financière globale affichant :
  - CA total : somme de toutes les transactions (montants payés par les consommateurs)
  - Revenu BienBon : somme de toutes les commissions perçues
  - Marge moyenne : pourcentage moyen de commission effectivement perçu
  - Nombre total de transactions
  - Montant moyen par transaction
  - Montant total des remboursements effectués
- Filtrable par période (mêmes filtres que le dashboard)
- Répartition par partenaire : tableau classant les partenaires par CA généré, nombre de transactions, commissions versées
- Graphique d'évolution du CA et du revenu BienBon dans le temps
- Export des données financières en CSV

---

## 3.6 Audit Log -- "The All Seeing Eye"

---

## Mockups

### admin-billing

```
┌────────────────────────────────────────────────────────────────────┐
│  BienBon Admin                                 👤 Admin · FR ▼   │
├─────────┬──────────────────────────────────────────────────────────┤
│         │  Facturation > Paramètres globaux                      │
│ 📊 Dash │                                                        │
│ 👥 Part.│  Onglets: [Paramètres] [Relevés reversement]            │
│ 🛒 Conso│           [CA plateforme]                               │
│ ⚖ Modér│                                                        │
│ 💰 Fact.│  ┌─ Paramètres de commission ────────────────────┐     │
│ 📋 Audit│  │                                               │     │
│ 🛡 Fraud│  │  Taux de commission global :                  │     │
│ ⚙ Param│  │  [ 25     ] %                                 │     │
│         │  │  Modifié le 15/01/2026 par Admin Kevin         │     │
│         │  │                                               │     │
│         │  │  Fee minimum par transaction :                 │     │
│         │  │  [ 50     ] Rs                                │     │
│         │  │  Modifié le 15/01/2026 par Admin Kevin         │     │
│         │  │                                               │     │
│         │  │  Ratio réduction minimum :                    │     │
│         │  │  [ 50     ] %                                 │     │
│         │  │  Modifié le 15/01/2026 par Admin Kevin         │     │
│         │  │                                               │     │
│         │  └───────────────────────────────────────────────┘     │
│         │                                                        │
│         │  ┌─ Simulation ──────────────────────────────────┐     │
│         │  │ Avec ces paramètres, sur un panier vendu      │     │
│         │  │ 100 Rs, BienBon perçoit 50 Rs de commission   │     │
│         │  │ (fee minimum appliqué car 100x25% = 25 < 50). │     │
│         │  │                                               │     │
│         │  │ Sur un panier vendu 250 Rs, BienBon perçoit   │     │
│         │  │ 62.50 Rs (250x25% = 62.50 > fee min 50).     │     │
│         │  │                                               │     │
│         │  │ Un partenaire ne peut pas publier un panier   │     │
│         │  │ avec moins de 50% de réduction.               │     │
│         │  │ Ex : val. initiale 200 Rs → prix max 100 Rs.  │     │
│         │  └───────────────────────────────────────────────┘     │
│         │                                                        │
│         │  Partenaires avec config spécifique : 3 / 45           │
│         │  (Le Chamarel: 20%, Royal Bakery: 22%, Chez Ravi: fixe)│
│         │                                                        │
│         │                    [ 💾 Enregistrer les modifications ] │
│         │                                                        │
└─────────┴──────────────────────────────────────────────────────────┘
```

