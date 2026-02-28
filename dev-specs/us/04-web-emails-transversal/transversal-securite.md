# Securite

> US couvertes : US-T009, US-T010, US-T011, US-T012, US-T013

---

### US-T009 — Fuseau horaire (LACUNE #37)
**En tant que** utilisateur, **je veux** que tous les horaires et horodatages affichés dans l'application soient en heure locale de l'île Maurice (MUT, UTC+4) **afin de** ne pas être induit en erreur par des heures incorrectes.

**Critères d'acceptation :**
- Tous les créneaux de retrait sont affichés en heure locale MUT (UTC+4) dans la webapp, le site vitrine et les emails
- Tous les horodatages affichés dans le backoffice admin (journal d'activité, réservations, réclamations, etc.) sont en MUT (UTC+4)
- Les dates et heures dans les factures PDF sont en MUT (UTC+4)
- Les notifications push et les emails de rappel sont envoyés en se basant sur l'heure locale MUT (UTC+4) (ex: le rappel 1h avant le créneau est calculé en heure MUT)
- Le stockage en base de données utilise un format UTC (ISO 8601) avec conversion à l'affichage en MUT
- L'île Maurice n'observe pas de changement d'heure été/hiver : le décalage est fixe à UTC+4 toute l'année
- Si un utilisateur consulte la plateforme depuis un autre fuseau horaire, les heures restent affichées en MUT (UTC+4) pour éviter toute confusion (les créneaux de retrait sont des heures locales mauriciennes)
- Le fuseau horaire de référence est clairement indiqué là où c'est pertinent (ex: "Créneau de retrait : 12h00 - 13h00 (heure de Maurice)")

---

## 6.3 Gestion des erreurs (LACUNE #14)

---

### US-T010 — Gestion des erreurs réseau
**En tant que** utilisateur, **je veux** être informé clairement quand la connexion réseau est perdue ou instable **afin de** comprendre pourquoi l'application ne répond pas et savoir quand elle sera de nouveau fonctionnelle.

**Critères d'acceptation :**
- Lorsque la connexion réseau est perdue, un bandeau d'information s'affiche en haut de l'écran : "Pas de connexion Internet. Vérifiez votre réseau." (ou équivalent)
- Le bandeau est visuellement distinct (couleur orange/rouge) et reste visible tant que la connexion n'est pas rétablie
- L'application tente automatiquement de rétablir la connexion à intervalles réguliers (retry automatique toutes les 5 secondes, avec backoff exponentiel jusqu'à 30 secondes)
- Lorsque la connexion est rétablie, le bandeau disparaît automatiquement et un message de confirmation s'affiche brièvement ("Connexion rétablie")
- Les actions en cours au moment de la perte de connexion sont gérées proprement :
  - Si une réservation était en cours : un message informe que la réservation n'a pas pu être finalisée et invite à réessayer
  - Si un chargement de page était en cours : un écran d'erreur avec bouton "Réessayer" est affiché
  - Les données saisies dans un formulaire ne sont pas perdues (préservation de l'état local)
- En mode hors ligne (après installation de la PWA), un écran dédié informe l'utilisateur que certaines fonctionnalités nécessitent une connexion Internet
- Les messages d'erreur réseau sont affichés dans la langue de l'utilisateur

---

### US-T011 — Gestion des erreurs de paiement
**En tant que** consommateur, **je veux** recevoir des messages d'erreur clairs et explicites lorsqu'un paiement échoue **afin de** comprendre le problème et pouvoir le résoudre ou choisir un autre moyen de paiement.

**Critères d'acceptation :**
- Chaque type d'erreur de paiement affiche un message spécifique et compréhensible (pas de codes techniques) :
  - Carte refusée : "Votre carte a été refusée. Vérifiez vos informations ou contactez votre banque."
  - Fonds insuffisants : "Fonds insuffisants. Veuillez utiliser un autre moyen de paiement."
  - Carte expirée : "Votre carte a expiré. Veuillez mettre à jour vos informations de paiement."
  - Erreur de saisie (numéro, date, CVV) : "Les informations de carte saisies sont incorrectes. Veuillez vérifier et réessayer."
  - Erreur d'authentification 3D Secure : "L'authentification auprès de votre banque a échoué. Veuillez réessayer."
  - Timeout du prestataire de paiement : "Le service de paiement est temporairement indisponible. Veuillez réessayer dans quelques minutes."
  - Erreur MCB Juice / Blink / my.t money : "La transaction via [nom du service] a échoué. Veuillez réessayer ou choisir un autre moyen de paiement."
  - Erreur inconnue : "Une erreur est survenue lors du paiement. Veuillez réessayer. Si le problème persiste, contactez-nous."
- Après une erreur de paiement, le consommateur reste sur la page de paiement avec ses informations pré-remplies (sauf les informations sensibles comme le CVV)
- Le panier reste réservé pendant la tentative de paiement (pas de libération prématurée du stock)
- Un bouton "Réessayer" est proposé
- Un bouton "Changer de moyen de paiement" permet de revenir au choix du moyen de paiement
- Les erreurs de paiement sont journalisées dans l'audit log (sans les données de carte sensibles)
- Les messages d'erreur sont affichés dans la langue de l'utilisateur

---

### US-T012 — Gestion de la concurrence (panier plus disponible pendant la réservation)
**En tant que** consommateur, **je veux** être informé immédiatement si un panier n'est plus disponible pendant mon processus de réservation **afin de** ne pas perdre de temps et pouvoir chercher une alternative.

**Critères d'acceptation :**
- Au moment de la validation de la réservation (clic sur "Confirmer" ou "Payer"), une vérification en temps réel du stock est effectuée
- Si le panier n'est plus disponible (stock tombé à 0 entre l'affichage et la confirmation) :
  - Un message clair est affiché : "Désolé, ce panier vient d'être réservé par un autre utilisateur et n'est plus disponible."
  - Aucun paiement n'est effectué ni pré-autorisé
  - Le consommateur est redirigé vers la fiche du partenaire ou vers la liste des paniers disponibles
  - Un CTA "Voir d'autres paniers" est proposé
- Si la quantité demandée est supérieure au stock restant mais que du stock reste (ex: le consommateur veut 3 mais il n'en reste que 1) :
  - Un message informe : "Il ne reste que [X] panier(s) disponible(s). Souhaitez-vous ajuster votre quantité ?"
  - Le consommateur peut ajuster la quantité et poursuivre
- Le stock est vérifié au minimum à deux moments : à l'affichage de la fiche du panier (informatif) et à la validation de la réservation (bloquant)
- La mise à jour du stock en quasi temps réel côté client est implémentée (WebSocket, polling, ou SSE) pour réduire les situations de concurrence
- Le processus de réservation est atomique : le stock est décrémenté de manière transactionnelle pour éviter les sur-réservations (race condition)
- Les logs de conflits de concurrence sont enregistrés à des fins d'analyse

---

## 6.4 Conformité et Données (LACUNE #26)

---

### US-T013 — Consentement cookies (webapp)
**En tant que** utilisateur de la webapp, **je veux** pouvoir gérer mon consentement aux cookies et traceurs **afin que** ma vie privée soit respectée conformément au Data Protection Act mauricien.

**Critères d'acceptation :**
- Le fonctionnement est identique à celui décrit pour le site vitrine (US-W012), adapté au contexte de la webapp
- Une bannière de consentement s'affiche lors de la première utilisation de la webapp
- Les options proposées sont identiques : "Accepter tout", "Refuser tout", "Personnaliser"
- Le choix est mémorisé pour 12 mois
- Les cookies essentiels au fonctionnement de la webapp (session, authentification, préférences) ne sont pas affectés par le choix
- L'utilisateur peut modifier ses préférences via les paramètres de l'application (section "Confidentialité" ou "Vie privée")
- Le consentement est journalisé
- Le consentement est synchronisé entre le site vitrine et la webapp si le visiteur/utilisateur est identifié (même domaine ou partage de consentement)

---

## Mockups

### transversal-security

```
┌───────────────────────────────────────────────────────┐
│  AFFICHAGE FUSEAU HORAIRE - Toutes les interfaces     │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ── WEBAPP CONSOMMATEUR ────────────────────────────  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Panier Surprise Pâtisserie                      │  │
│  │ Boulangerie du Port                             │  │
│  │                                                 │  │
│  │ Créneau de retrait :                            │  │
│  │ 17h00 - 18h00 (heure de Maurice)               │  │
│  │                                                 │  │
│  │ Mardi 10 février 2026                           │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ── BACKOFFICE ADMIN ───────────────────────────────  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Journal d'activité                              │  │
│  │                                                 │  │
│  │ 10/02/2026 14:30 MUT  Réservation #142 créée    │  │
│  │ 10/02/2026 14:28 MUT  Panier #89 publié         │  │
│  │ 10/02/2026 14:15 MUT  Partenaire #12 validé     │  │
│  │ 10/02/2026 13:45 MUT  Réclamation #45 résolue   │  │
│  │                                                 │  │
│  │ Tous les horodatages en MUT (UTC+4)             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ── FACTURE PDF ────────────────────────────────────  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Facture #F-2026-01-047                          │  │
│  │ Date d'émission: 01/02/2026 (MUT, UTC+4)       │  │
│  │ Période: 01/01/2026 - 31/01/2026               │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ── STOCKAGE EN BASE ───────────────────────────────  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Base de données : UTC (ISO 8601)                │  │
│  │ 2026-02-10T10:30:00Z  (stocké)                  │  │
│  │      -> 14:30 MUT      (affiché)                │  │
│  │                                                 │  │
│  │ Note: Maurice n'observe PAS de changement       │  │
│  │ d'heure. Décalage fixe UTC+4 toute l'année.    │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

