# Anti-fraude

> US couvertes : US-A038, US-A039, US-A040, US-A041

---

### US-A038 -- Signaux anti-fraude consommateur
**En tant qu'** admin BienBon, **je veux** recevoir des alertes automatiques quand un consommateur présente un comportement suspect **afin de** pouvoir investiguer et agir avant que la fraude ne cause des dommages.

**Critères d'acceptation :**
- Les signaux suivants déclenchent une alerte :
  - **Comptes multiples** : détection d'un consommateur ayant créé plusieurs comptes (même email avec variations, même numéro de téléphone, même appareil/IP)
  - **Réclamations systématiques** : consommateur dont le ratio réclamations/retraits dépasse un seuil configurable (ex. : plus de 30% de réclamations)
  - **No-shows récurrents** : consommateur dont le ratio no-shows/réservations dépasse un seuil configurable (ex. : plus de 40% de no-shows sur les 10 dernières réservations)
  - **Abus de remboursements** : consommateur ayant obtenu un nombre anormalement élevé de remboursements sur une période
  - **Pattern de réservation/annulation** : consommateur réservant et annulant de manière répétitive (potentiel blocage de stock malveillant)
- Les seuils de détection sont configurables dans les paramètres de la plateforme
- Les alertes apparaissent dans une section dédiée "Alertes anti-fraude" du backoffice
- Chaque alerte affiche : type de signal, consommateur concerné, données chiffrées (ratios, compteurs), date de détection
- L'admin peut depuis l'alerte :
  - Consulter la fiche complète du consommateur
  - Marquer l'alerte comme "investiguée" avec un commentaire
  - Marquer l'alerte comme "faux positif"
  - Suspendre ou bannir le consommateur directement
- Notification push/email aux admins pour les alertes critiques (configurable)

---

---

### US-A039 -- Signaux anti-fraude partenaire
**En tant qu'** admin BienBon, **je veux** recevoir des alertes automatiques quand un partenaire présente un comportement suspect **afin de** protéger les consommateurs et l'intégrité de la plateforme.

**Critères d'acceptation :**
- Les signaux suivants déclenchent une alerte :
  - **Gonflement systématique de la valeur initiale** : partenaire dont la valeur initiale déclarée est significativement et régulièrement supérieure à la moyenne de son type de commerce, ou dont la valeur initiale augmente de manière anormale dans le temps (fausse bonne affaire)
  - **Annulations fréquentes avec réservations** : partenaire annulant fréquemment des paniers ayant des réservations (ratio annulations/publications au-dessus d'un seuil configurable, ex. : plus de 15%)
  - **Taux de réclamations élevé** : partenaire recevant un ratio anormalement élevé de réclamations par rapport au nombre de retraits (ex. : plus de 20%)
  - **Horaires de retrait incohérents** : partenaire publiant des créneaux de retrait en dehors de ses horaires d'ouverture déclarés
  - **Variations de prix extrêmes** : partenaire modifiant fréquemment et fortement ses prix (instabilité suspecte)
- Les seuils de détection sont configurables dans les paramètres de la plateforme
- Les alertes apparaissent dans la section "Alertes anti-fraude" (même interface que les alertes consommateur, avec un filtre par type d'acteur)
- Chaque alerte affiche : type de signal, partenaire concerné, données chiffrées, graphique d'évolution si pertinent, date de détection
- L'admin peut depuis l'alerte :
  - Consulter la fiche complète du partenaire
  - Consulter l'historique des prix du partenaire (US-A017)
  - Marquer l'alerte comme "investiguée" avec un commentaire
  - Marquer l'alerte comme "faux positif"
  - Contacter le partenaire (lien vers email pré-rempli)
  - Suspendre ou bannir le partenaire directement
- Notification push/email aux admins pour les alertes critiques

---

---

### US-A040 -- Détection de doublons de comptes et fusion
**En tant qu'** admin BienBon, **je veux** détecter les comptes doublons (même email, même téléphone, même appareil) et pouvoir les fusionner **afin de** maintenir l'intégrité de la base utilisateurs et empêcher les abus.

**Critères d'acceptation :**
- Détection automatique des doublons potentiels basée sur :
  - Même adresse email (exacte ou avec variations mineures : points, alias Gmail "+")
  - Même numéro de téléphone
  - Même identifiant d'appareil (device fingerprint) avec des comptes différents
  - Même adresse IP utilisée pour créer plusieurs comptes dans un court laps de temps
- Liste des doublons détectés accessible dans une section dédiée "Doublons" du backoffice
- Pour chaque doublon potentiel, affichage :
  - Les comptes concernés (2 ou plus) avec leurs informations
  - Le critère de détection (email, téléphone, appareil, IP)
  - Le score de confiance (probabilité que ce soient réellement des doublons)
  - Les dates de création des comptes
- Possibilité de fusionner deux comptes :
  - L'admin choisit le compte "principal" (celui qui sera conservé)
  - Les données du compte secondaire sont transférées vers le compte principal : historique des réservations, avis, réclamations, favoris
  - Le compte secondaire est désactivé après fusion
  - Un message informatif est envoyé à l'utilisateur l'informant de la fusion
  - L'action de fusion est tracée dans le journal d'activité avec le détail des comptes fusionnés
- Possibilité de marquer un doublon comme "faux positif" (ex. : deux personnes différentes au même domicile)
- La fusion est irréversible : une confirmation stricte est requise

---

---

### US-A041 -- Alertes de seuil (notifications admin urgentes)
**En tant qu'** admin BienBon, **je veux** recevoir des notifications urgentes quand des seuils anormaux sont atteints sur la plateforme **afin de** réagir immédiatement à des situations critiques.

**Critères d'acceptation :**
- Les seuils suivants sont configurables et déclenchent des alertes :
  - **Annulations partenaire en masse** : plus de X annulations de paniers avec réservations par un même partenaire sur une période de Y heures (défaut : 5 annulations en 1h)
  - **Pic de réclamations** : plus de X réclamations ouvertes en Y heures (défaut : 20 réclamations en 2h)
  - **Pic d'échecs de paiement** : plus de X échecs de paiement en Y minutes (défaut : 10 échecs en 30 minutes)
  - **Pic de no-shows** : taux de no-show supérieur à X% sur les Y dernières heures (défaut : 50% sur 3h)
  - **Chute brutale des réservations** : nombre de réservations en chute de X% par rapport à la même tranche horaire la semaine précédente (défaut : -70%)
  - **Pic d'inscriptions suspectes** : plus de X inscriptions en Y minutes depuis la même IP ou le même appareil (défaut : 5 inscriptions en 10 minutes)
  - **Indisponibilité partenaire majeur** : un partenaire représentant plus de X% du CA mensuel n'a publié aucun panier depuis Y jours (défaut : 10% CA, 3 jours)
- Configuration des seuils accessible dans les paramètres de la plateforme :
  - Chaque seuil est activable/désactivable individuellement
  - Les valeurs de X et Y sont modifiables
  - Le canal de notification est configurable (email, push backoffice, ou les deux)
- Les alertes de seuil apparaissent de manière très visible dans le backoffice :
  - Bannière rouge en haut de page
  - Son de notification (optionnel, activable/désactivable par l'admin)
  - Notification push et/ou email aux admins désignés
- Chaque alerte affiche : type de seuil dépassé, valeur actuelle vs seuil, période concernée, lien vers les données détaillées
- L'admin peut acquitter une alerte (marquer comme "prise en charge") avec un commentaire
- Historique des alertes déclenchées consultable (avec résolutions)

---

## 3.8 Paramétrage de la Plateforme

---

## Mockups

### admin-antifraud

```
┌────────────────────────────────────────────────────────────────────┐
│  BienBon Admin                                 👤 Admin · FR ▼   │
├─────────┬──────────────────────────────────────────────────────────┤
│         │  🛡 Anti-fraude > Alertes              🔴 5 actives    │
│ 📊 Dash │                                                        │
│ 👥 Part.│  Filtres: [Type acteur ▼] [Type signal ▼] [Statut ▼]  │
│ 🛒 Conso│  Acteur: (●) Consom.  ( ) Partenaire  ( ) Tous        │
│ ⚖ Modér│                                                        │
│ 💰 Fact.│  ┌────┬───────────────────┬──────────────┬───────────┐ │
│ 📋 Audit│  │ #  │ Signal            │ Consommateur │ Statut    │ │
│ 🛡 Fraud│  ├────┼───────────────────┼──────────────┼───────────┤ │
│  🔴 5   │  │ 1  │ 🔴 No-shows       │ Fatima J.    │ Nouvelle  │ │
│ ⚙ Param│  │    │ récurrents        │ 48% (seuil   │ 07/02     │ │
│         │  │    │                   │ 40%)         │           │ │
│         │  ├────┼───────────────────┼──────────────┼───────────┤ │
│         │  │ 2  │ 🟡 Réclamations   │ Raj D.       │ Nouvelle  │ │
│         │  │    │ systématiques     │ 13% (seuil   │ 07/02     │ │
│         │  │    │                   │ 30%) proche  │           │ │
│         │  ├────┼───────────────────┼──────────────┼───────────┤ │
│         │  │ 3  │ 🔴 Comptes mult.  │ kevin.c@...  │ Nouvelle  │ │
│         │  │    │ Même appareil     │ k.chang@...  │ 06/02     │ │
│         │  │    │ 2 comptes détectés│ kevin.ch@... │           │ │
│         │  ├────┼───────────────────┼──────────────┼───────────┤ │
│         │  │ 4  │ 🟡 Abus rembours. │ Dev P.       │ Investig. │ │
│         │  │    │ 4 rembours. en    │ 4 rembours.  │ Admin K.  │ │
│         │  │    │ 30 jours          │ /12 retraits │           │ │
│         │  ├────┼───────────────────┼──────────────┼───────────┤ │
│         │  │ 5  │ 🟡 Réserv./annul. │ Nadia B.     │ Faux pos. │ │
│         │  │    │ Pattern suspect   │ 6 annul./8   │           │ │
│         │  │    │                   │ réserv.      │           │ │
│         │  └────┴───────────────────┴──────────────┴───────────┘ │
│         │                                                        │
│         │  Onglets: [Alertes acteurs (5)] [Doublons (3)]         │
│         │           [Alertes seuil (1)]                          │
│         │                                                        │
└─────────┴──────────────────────────────────────────────────────────┘
```

