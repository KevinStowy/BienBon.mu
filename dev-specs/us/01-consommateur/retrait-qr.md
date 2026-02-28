# Retrait & QR Code

> US couvertes : US-C039, US-C040, US-C041, US-C042, US-C043, US-C044

---

### US-C039 — Afficher le QR code de retrait
**En tant que** consommateur, **je veux** afficher un QR code unique pour ma réservation **afin que** le partenaire puisse le scanner pour valider mon retrait.

**Critères d'acceptation :**
- Le QR code est unique par réservation
- Le QR code est accessible depuis le détail de la réservation en cours (un tap depuis la liste des réservations)
- Le QR code est affiché en grand format, centré sur l'écran
- La luminosité de l'écran est augmentée automatiquement à l'affichage du QR code pour faciliter le scan
- Le QR code est également affiché dans l'email de confirmation de réservation
- Le QR code contient un identifiant unique crypté (pas de données personnelles en clair)
- En dessous du QR code, le code PIN est également affiché en alternative (US-C040)
- Le QR code est accessible même si le consommateur est hors connexion (US-C043)

---

---

### US-C040 — Afficher le code PIN de retrait
**En tant que** consommateur, **je veux** afficher un code PIN pour ma réservation **afin de** le communiquer verbalement au partenaire comme alternative au QR code.

**Critères d'acceptation :**
- Le code PIN est un code numérique court de 4 à 6 chiffres, facile à lire et à communiquer
- Le code PIN est unique par réservation et correspond au même QR code
- Le code PIN est accessible depuis le détail de la réservation en cours
- Le code PIN est affiché en grande taille et de manière lisible
- Le code PIN est également affiché sous le QR code sur le même écran
- Le code PIN est également présent dans l'email de confirmation de réservation
- Le code PIN est accessible même si le consommateur est hors connexion (US-C043)

---

---

### US-C041 — Recevoir un rappel avant le créneau de retrait
**En tant que** consommateur, **je veux** recevoir un rappel avant mon créneau de retrait **afin de** ne pas oublier d'aller chercher mon panier.

**Critères d'acceptation :**
- Une notification push est envoyée 1 heure avant le début du créneau de retrait
- Si le créneau commence dans moins d'1 heure au moment de la réservation, le rappel est envoyé 30 minutes avant ou au moment de la réservation (pas de rappel si le créneau est imminent, dans les 15 prochaines minutes)
- Un email de rappel est également envoyé au même moment
- La notification contient : nom du partenaire, titre du panier, heure de début et fin du créneau, adresse du partenaire
- La notification est cliquable et ouvre directement le détail de la réservation avec le QR code
- Le rappel n'est pas envoyé si la réservation a été annulée entre-temps
- Le rappel respecte les préférences de notification du consommateur (si désactivé, pas de rappel push mais l'email est toujours envoyé car transactionnel)

---

---

### US-C042 — No-show automatique
**En tant que** consommateur, **je suis informé** que si je ne vais pas chercher mon panier pendant le créneau de retrait, le paiement est maintenu et le panier est perdu.

**Critères d'acceptation :**
- Si le partenaire n'a pas validé le retrait (ni par QR code ni par code PIN) avant la fin du créneau de retrait, le système marque automatiquement la réservation en statut "No-show"
- Le passage en no-show intervient automatiquement à la fin du créneau (heure de fin + un délai de grâce de 5 minutes)
- Le montant préalablement débité (au début du créneau) reste acquis — aucun remboursement automatique
- Le consommateur reçoit une notification push et un email l'informant du no-show avec le message : "Vous ne vous êtes pas présenté pour retirer votre panier chez [partenaire]. Le montant de [X] Rs a été débité. Si vous pensez qu'il s'agit d'une erreur, contactez notre support."
- Un lien "Contacter le support" est inclus dans la notification/email
- La réservation passe en statut "No-show" dans l'historique avec une icône/couleur distinctive (rouge)
- Le consommateur ne peut PAS noter le partenaire pour une réservation en no-show
- Le consommateur ne peut PAS ouvrir de réclamation pour une réservation en no-show (mais peut contacter le support)

---

---

### US-C043 — Mode hors connexion pour le retrait
**En tant que** consommateur, **je veux** pouvoir accéder à mon QR code et aux informations de ma réservation même sans connexion internet **afin de** pouvoir retirer mon panier dans un endroit avec un réseau faible (LACUNE #30).

**Critères d'acceptation :**
- Dès que la réservation est confirmée, le QR code, le code PIN et les informations de réservation (nom du partenaire, adresse, créneau) sont mis en cache localement sur l'appareil
- Lorsque le consommateur est hors connexion, l'écran de la réservation en cours est accessible avec les informations mises en cache
- Le QR code est affiché normalement même sans connexion
- Le code PIN est affiché normalement même sans connexion
- Un indicateur visuel informe le consommateur qu'il est hors connexion : "Mode hors ligne — Les informations affichées proviennent du cache local"
- En mode hors connexion, un re-check automatique est tenté toutes les 30 minutes. Si la connexion est impossible depuis plus de 30 minutes, afficher un avertissement : "Impossible d'actualiser le statut. Le partenaire [nom] pourrait avoir annulé le panier. Rétablissez la connexion pour vérifier." Le QR code reste affiché mais avec le warning visible.
- Les actions nécessitant une connexion (annuler, noter) sont désactivées avec un message "Connexion requise pour cette action"
- Dès que la connexion est rétablie, les informations sont resynchronisées automatiquement

---

---

### US-C044 — Lancer la navigation GPS vers le partenaire
**En tant que** consommateur, **je veux** lancer la navigation GPS vers le partenaire **afin de** trouver facilement le chemin pour aller retirer mon panier (LACUNE #32).

**Critères d'acceptation :**
- Un bouton "Itinéraire" ou "Y aller" est disponible depuis : le détail de la réservation en cours, la fiche du partenaire, le détail du panier
- Le clic sur le bouton ouvre l'application de navigation par défaut de l'appareil (Google Maps, Apple Plans, Waze) avec l'adresse du partenaire comme destination
- Si plusieurs applications de navigation sont installées, le système propose le choix (sur Android) ou utilise l'app par défaut (sur iOS)
- Les coordonnées GPS du partenaire sont utilisées pour la destination (pas uniquement l'adresse textuelle) afin d'assurer la précision
- Le bouton est fonctionnel même si le consommateur n'a pas de réservation en cours (depuis la fiche partenaire)

---

## 1.7 Avis & Notes

---

---

## Mockups

### consumer-pickup

```
┌─────────────────────────────────┐
│  < Retour                       │
│                                 │
│    Votre QR code de retrait     │
│                                 │
│  Le Chamarel                    │
│  Panier Surprise x1             │
│  📅 Auj. 12h00 - 14h00          │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │    ┌─────────────────┐    │  │
│  │    │  ▓▓░▓░▓▓░▓▓     │    │  │
│  │    │  ░▓▓░▓░░▓░▓     │    │  │
│  │    │  ▓░░▓▓▓░▓░░     │    │  │
│  │    │  ░▓░░▓░▓▓▓░     │    │  │
│  │    │  ▓▓▓░░▓░░▓▓     │    │  │
│  │    │  ░▓▓░▓░▓░▓░     │    │  │
│  │    │  ▓░░▓▓░░▓▓▓     │    │  │
│  │    └─────────────────┘    │  │
│  │                           │  │
│  │  Présentez ce QR code au  │  │
│  │  partenaire               │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  ── ou communiquez ce code ──   │
│                                 │
│  ┌───────────────────────────┐  │
│  │    Code PIN : 4 8 2 7     │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  📍 ITINÉRAIRE            │  │
│  └───────────────────────────┘  │
│  📍 12 Rue Royale, Port-Louis   │
│     0.8 km                      │
└─────────────────────────────────┘
```

---

## Assets requis

| Asset | Chemin |
|-------|--------|
| etat vide reservations | `../../assets/illustrations/empty-states/empty-state-reservations.png` |

