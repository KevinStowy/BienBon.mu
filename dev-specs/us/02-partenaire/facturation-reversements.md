# Facturation & Reversements

> US couvertes : US-P043, US-P044, US-P045

---

### US-P043 -- Consulter le relevé de reversement mensuel
**En tant que** partenaire, **je veux** consulter mon relevé de reversement mensuel **afin de** connaître le montant net que BienBon me reverse après déduction de sa commission.

**Critères d'acceptation :**
- BienBon collecte les paiements des consommateurs. À la fin de chaque mois, BienBon reverse au partenaire le total des ventes MOINS la commission BienBon. Le partenaire consulte un "Relevé de reversement mensuel" (ce n'est pas une facture que le partenaire doit payer).
- Le relevé est généré automatiquement à la fin de chaque mois (le 1er du mois suivant)
- Le relevé est accessible depuis la section "Reversements" du dashboard partenaire
- **Contenu du relevé de reversement :**
  - En-tête : informations BienBon (nom, adresse, BRN), informations du partenaire (nom du commerce, adresse, BRN), numéro de relevé unique, date du relevé, période couverte (mois/année)
  - **Tableau des transactions** : liste de toutes les transactions du mois avec pour chaque ligne :
    - Date de la transaction
    - Titre du panier
    - Quantité vendue
    - Prix de vente unitaire
    - Montant total de la vente (brut)
    - Taux ou montant de commission BienBon déduit
    - Montant de la commission BienBon
    - Montant net reversé au partenaire
    - Mention si le fee minimum (50 Rs par défaut) a été appliqué
  - **Totaux** :
    - Total des ventes brutes du mois
    - Total des commissions BienBon déduites (% + montant)
    - Montant net reversé au partenaire
    - Date de virement prévue ou effectuée
  - **Informations complémentaires** :
    - Taux ou montant de commission applicable au partenaire
    - Fee minimum par transaction applicable
    - Coordonnées bancaires du virement
- Le fee minimum par transaction (50 Rs par défaut, surchargeable par partenaire) est correctement appliqué : si la commission calculée est inférieure au fee minimum, c'est le fee minimum qui s'applique
- Si aucune transaction n'a eu lieu durant le mois, aucun relevé n'est généré
- Le partenaire reçoit une notification (push + email) quand le relevé est disponible : "Votre relevé de reversement du mois de [mois] est disponible. Montant net reversé : [X] Rs."

---

---

### US-P044 -- Voir le détail des transactions du reversement
**En tant que** partenaire, **je veux** voir le détail de chaque transaction (panier vendu, prix de vente, commission BienBon prélevée, montant net) **afin de** comprendre mon relevé de reversement et vérifier les montants.

**Critères d'acceptation :**
- Accessible depuis la page des reversements ou depuis le détail du relevé de reversement
- C'est un détail du reversement, pas une facture
- Pour chaque transaction, les informations suivantes sont affichées :
  - Date de la transaction
  - Titre du panier vendu
  - Montant de la vente (prix payé par le consommateur)
  - Mode de calcul de la commission BienBon : taux (%) OU montant fixe
  - Taux ou montant de commission BienBon appliqué
  - Montant de la commission BienBon prélevée
  - Indication si le fee minimum a été appliqué (oui/non)
    - Si oui : affichage du montant du fee minimum appliqué à la place de la commission calculée
    - Ex: "Commission calculée : 30 Rs -- Fee minimum appliqué : 50 Rs"
  - Montant net reversé au partenaire (montant vente - commission effective)
- Un lien "Comment sont calculées les commissions ?" renvoie vers l'aide contextuelle (US-P012)
- Les transactions des paniers annulés ne figurent pas dans le reversement (pas de commission sur les paniers remboursés)

---

---

### US-P045 -- Télécharger le relevé de reversement au format PDF
**En tant que** partenaire, **je veux** télécharger mon relevé de reversement au format PDF **afin de** le conserver pour ma comptabilité.

**Critères d'acceptation :**
- Bouton "Télécharger PDF" disponible sur chaque relevé de reversement
- Le PDF généré contient toutes les informations du relevé de reversement (identique à la version en ligne -- voir US-P043) :
  - Période couverte (mois/année)
  - Liste de toutes les transactions (panier, date, montant brut, commission déduite, montant net)
  - Total des ventes brutes
  - Total des commissions BienBon déduites
  - Montant net reversé au partenaire
  - Coordonnées bancaires du virement
- Le PDF est conforme aux obligations légales mauriciennes :
  - Mentions obligatoires (noms, adresses, BRN des deux parties)
  - Numéro de relevé unique et séquentiel
  - Date du relevé
  - Détail des transactions
- Le nom du fichier téléchargé suit le format : "BienBon_Reversement_[AAAA-MM]_[NomCommerce].pdf"
- L'historique des relevés de reversement passés est accessible (tous les relevés depuis le début du partenariat)
- Le partenaire peut télécharger les relevés des mois précédents à tout moment
- Les relevés sont archivés et immuables (une fois générés, ils ne peuvent pas être modifiés)

---

# RÉCAPITULATIF PARTIE 2 -- PARTENAIRE (v2)

| Section | US | Nombre |
|---|---|---|
| 2.1 Inscription & Validation | US-P001 à US-P003 | 3 |
| 2.2 Onboarding Partenaire | US-P004 à US-P006 | 3 |
| 2.3 Gestion du Commerce | US-P007 à US-P012 | 6 |
| 2.4 Gestion des Paniers -- Mode Manuel | US-P013 à US-P020 (hors US-P019 supprimée) | 7 |
| 2.5 Gestion des Paniers -- Mode Récurrent | US-P021 à US-P024 | 4 |
| 2.6 Réservations & Retraits | US-P025 à US-P031 (hors US-P028 supprimée) | 6 |
| 2.7 Tableau de Bord | US-P032 à US-P034 | 3 |
| 2.8 Notifications Partenaire | US-P035 à US-P042 | 8 |
| 2.9 Reversements | US-P043 à US-P045 | 3 |
| **TOTAL PARTIE 2** | **US-P001 à US-P045** | **43** |

---

## TRAÇABILITÉ DES LACUNES CORRIGÉES

| Lacune | Description | US concernée(s) |
|---|---|---|
| LACUNE #4 | Complétion profil après inscription admin (identifiants temporaires) | US-P006 |
| LACUNE #7 | Acceptation des CGV à l'inscription | US-P001, US-P006 |
| LACUNE #8 | Centre d'aide contextuel dans le dashboard | US-P012 |
| LACUNE #9 | Retrait partiel (validation partielle d'une réservation multi-paniers) | US-P028 (supprimée) |
| LACUNE #13 | Critères d'acceptation complets pour chaque notification | US-P035 à US-P042 |
| LACUNE #17 | Analytics avancés (tendances, performances par jour/type, taux de no-show) | US-P033 |
| LACUNE #21 | Panier flash "dernière minute" (publication rapide, créneau imminent) | US-P020 |
| LACUNE #35 | Quantité maximum par consommateur sur un panier | US-P019 (supprimée) |
| LACUNE #43 | Acceptation des conditions commerciales partenaire à l'inscription | US-P001, US-P006 |

---

## Mockups

### partner-billing

```
┌──────────────────────────────────────────────────────┐
│  BienBon - Dashboard Partenaire                      │
│  Nav: Paniers | Réservations | Stats | Mon commerce  │
│──────────────────────────────────────────────────────│
│                                                      │
│  Reversements                                        │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Relevé de reversement : Janvier 2026            │ │
│  │ N° : REV-2026-01-0042     Date : 01/02/2026     │ │
│  │                                                 │ │
│  │ ── BienBon ──                                   │ │
│  │ BienBon Ltd                                     │ │
│  │ Port-Louis, Île Maurice                         │ │
│  │ BRN : C07098765                                 │ │
│  │                                                 │ │
│  │ ── Partenaire ──                                │ │
│  │ Le Chamarel - Restaurant                        │ │
│  │ 12 Rue Royale, Port-Louis                       │ │
│  │ BRN : C07012345                                 │ │
│  │                                                 │ │
│  │ Période : Janvier 2026                          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ── Tableau des transactions ──                      │
│  ┌──────┬──────────┬───┬──────┬──────┬─────┬──────┐  │
│  │Date  │Panier    │Qté│PU Rs │Total │Comm.│Net   │  │
│  │      │          │   │      │brut  │BienB│revers│  │
│  ├──────┼──────────┼───┼──────┼──────┼─────┼──────┤  │
│  │05/01 │Repas midi│ 3 │  50  │ 150  │ 50* │ 100  │  │
│  │05/01 │Viennois. │ 2 │  35  │  70  │ 50* │  20  │  │
│  │06/01 │Repas midi│ 4 │  50  │ 200  │ 50  │ 150  │  │
│  │07/01 │Pâtisserie│ 1 │  30  │  30  │ 50* │   0  │  │
│  │...   │...       │...│...   │...   │...  │...   │  │
│  │31/01 │Repas midi│ 5 │  50  │ 250  │ 62  │ 188  │  │
│  └──────┴──────────┴───┴──────┴──────┴─────┴──────┘  │
│  * Fee minimum Rs 50 appliqué                        │
│                                                      │
│  ── Totaux Janvier 2026 ──                           │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Total des ventes brutes      : Rs 4,580         │ │
│  │ Commission BienBon déduite   : Rs 2,750         │ │
│  │ (25% par transaction, fee min Rs 50)            │ │
│  │ ──────────────────────────────────────────────  │ │
│  │ Montant net reversé          : Rs 1,830         │ │
│  │ Date de virement             : 05/02/2026       │ │
│  │ Coordonnées bancaires        : MCB ****1234     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  (i) BienBon collecte les paiements des              │
│  consommateurs et vous reverse le montant net        │
│  après déduction de la commission.                   │
│                                                      │
│  [ <- Relevés précédents ]   [ Télécharger PDF ]     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

