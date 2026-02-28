# Paiement

> US couvertes : US-C031, US-C032, US-C033, US-C034, US-C035, US-C036, US-C037, US-C038

---

### US-C031 — Payer par carte bancaire
**En tant que** consommateur, **je veux** payer par carte bancaire **afin de** régler mon panier avec ma carte Visa ou Mastercard.

**Critères d'acceptation :**
- Saisie sécurisée des informations de carte via un formulaire conforme PCI DSS (numéro de carte, date d'expiration, CVV, nom du titulaire)
- Les cartes Visa et Mastercard sont acceptées
- Le consommateur peut choisir d'enregistrer la carte pour les prochains achats (case à cocher "Sauvegarder cette carte")
- Si une carte est déjà enregistrée, elle est pré-sélectionnée
- Les informations de carte sont stockées de manière sécurisée (tokenisation) — le numéro complet n'est jamais stocké
- L'affichage de la carte enregistrée montre uniquement les 4 derniers chiffres : "**** **** **** 1234"
- La pré-autorisation est effectuée immédiatement après confirmation de la réservation
- Le consommateur est informé du succès ou de l'échec de la pré-autorisation

---

---

### US-C032 — Payer par MCB Juice
**En tant que** consommateur, **je veux** payer par MCB Juice **afin d'** utiliser mon portefeuille mobile MCB.

**Critères d'acceptation :**
- L'option "MCB Juice" est proposée parmi les moyens de paiement
- Le consommateur est redirigé vers le flux de paiement MCB Juice (application ou page web MCB)
- Après validation du paiement dans MCB Juice, le consommateur est redirigé automatiquement vers l'app BienBon
- La pré-autorisation est effectuée via l'API MCB Juice
- En cas de timeout ou d'échec de la redirection, le consommateur peut relancer le processus
- Le consommateur reçoit une confirmation dans l'app BienBon et dans MCB Juice

---

---

### US-C033 — Payer par Blink (Emtel)
**En tant que** consommateur, **je veux** payer par Blink **afin d'** utiliser mon compte mobile Emtel pour régler mon panier.

**Critères d'acceptation :**
- L'option "Blink by Emtel" est proposée parmi les moyens de paiement
- Le consommateur est redirigé vers le flux de paiement Blink
- Après validation du paiement dans Blink, le consommateur est redirigé automatiquement vers l'app BienBon
- La pré-autorisation est effectuée via l'API Blink
- En cas de timeout ou d'échec de la redirection, le consommateur peut relancer le processus
- Le consommateur reçoit une confirmation dans l'app BienBon et dans Blink

---

---

### US-C034 — Payer par my.t money
**En tant que** consommateur, **je veux** payer par my.t money **afin d'** utiliser mon portefeuille mobile Mauritius Telecom.

**Critères d'acceptation :**
- L'option "my.t money" est proposée parmi les moyens de paiement
- Le consommateur est redirigé vers le flux de paiement my.t money
- Après validation du paiement dans my.t money, le consommateur est redirigé automatiquement vers l'app BienBon
- La pré-autorisation est effectuée via l'API my.t money
- En cas de timeout ou d'échec de la redirection, le consommateur peut relancer le processus
- Le consommateur reçoit une confirmation dans l'app BienBon et dans my.t money

---

---

### US-C035 — Gérer mes moyens de paiement enregistrés
**En tant que** consommateur, **je veux** gérer mes moyens de paiement enregistrés **afin de** ajouter, supprimer ou choisir mon moyen de paiement par défaut.

**Critères d'acceptation :**
- Accessible depuis Profil > Moyens de paiement
- Liste des moyens de paiement enregistrés avec : type (Carte, MCB Juice, Blink, my.t money), identifiant partiel (4 derniers chiffres de la carte ou identifiant du compte mobile), statut (actif, expiré)
- Possibilité d'ajouter un nouveau moyen de paiement
- Possibilité de supprimer un moyen de paiement enregistré (confirmation demandée)
- Possibilité de définir un moyen de paiement par défaut (celui pré-sélectionné lors des réservations)
- Un moyen de paiement ne peut pas être supprimé s'il est associé à une réservation active (pré-autorisation en cours)
- Si une carte est expirée, un badge "Expirée" est affiché et elle ne peut plus être utilisée pour de nouvelles réservations

---

---

### US-C036 — Gestion des échecs de paiement
**En tant que** consommateur, **je veux** être informé clairement en cas d'échec de paiement et pouvoir corriger la situation **afin de** finaliser ma réservation sans frustration (LACUNE #5).

**Critères d'acceptation :**
- **Carte expirée** : message "Votre carte **** 1234 a expiré. Veuillez mettre à jour votre carte ou choisir un autre moyen de paiement." + bouton "Changer de moyen de paiement" + bouton "Mettre à jour la carte"
- **Fonds insuffisants** : message "Le paiement a été refusé. Vérifiez votre solde ou essayez un autre moyen de paiement." + bouton "Changer de moyen de paiement"
- **Carte refusée (générique)** : message "Le paiement a été refusé par votre banque. Veuillez réessayer ou utiliser un autre moyen de paiement." + bouton "Réessayer" + bouton "Changer de moyen de paiement"
- **Timeout / problème réseau** : message "Le paiement n'a pas pu aboutir (problème de connexion). Veuillez réessayer." + bouton "Réessayer"
- **Échec de retour mobile wallet** (MCB Juice, Blink, my.t money) : message "Le paiement n'a pas pu être confirmé. Si vous avez validé le paiement dans l'application [nom du wallet], veuillez patienter quelques instants. Sinon, réessayez." + bouton "Réessayer" + bouton "Changer de moyen de paiement"
- Après 3 échecs consécutifs sur le même moyen de paiement, un message suggère de contacter le support : "Plusieurs tentatives ont échoué. Contactez votre banque ou notre support pour obtenir de l'aide."
- Le panier reste réservé pendant 5 minutes après un échec de paiement pour laisser le temps au consommateur de corriger (le stock n'est pas ré-incrémenté immédiatement)
- Après expiration du délai de 5 minutes sans paiement réussi, le panier est libéré et le stock ré-incrémenté
- Aucun débit ni pré-autorisation n'est effectué en cas d'échec

---

---

### US-C037 — Télécharger un reçu de paiement
**En tant que** consommateur, **je veux** télécharger un reçu de paiement pour mes réservations **afin de** conserver une preuve de mon achat (LACUNE #27).

**Critères d'acceptation :**
- Un bouton "Télécharger le reçu" est disponible pour chaque réservation au statut "Retiré" depuis l'historique des réservations
- Le reçu est généré au format PDF
- Le reçu contient : numéro de référence de la réservation, date et heure de la réservation, nom du partenaire, adresse du partenaire, titre du panier, quantité, prix unitaire, prix total, moyen de paiement utilisé (type + identifiant partiel), date et heure du retrait, mention "BienBon - bienbon.mu"
- Le reçu ne contient PAS d'informations sensibles (numéro complet de carte)
- Le téléchargement est possible à tout moment depuis l'historique (pas de limite de temps)
- Le reçu est également envoyable par email au clic sur un bouton "Envoyer par email"

---

---

### US-C038 — Voir le statut de remboursement en temps réel
**En tant que** consommateur, **je veux** suivre le statut de mes remboursements en temps réel **afin de** savoir quand l'argent sera recrédité (LACUNE #20).

**Critères d'acceptation :**
- Lorsqu'un remboursement est initié (annulation par le partenaire, résolution de réclamation), un statut de remboursement est visible sur la réservation concernée dans l'historique
- Les statuts de remboursement possibles sont : "Remboursement initié", "Remboursement en cours de traitement", "Remboursement effectué"
- La date estimée de réception est affichée : "Le remboursement sera effectif sous 3 à 10 jours ouvrables selon votre banque/opérateur"
- Le montant remboursé est clairement indiqué
- Le moyen de paiement sur lequel le remboursement est effectué est indiqué (même moyen de paiement que celui utilisé lors de la réservation)
- Le consommateur reçoit une notification push et un email à chaque changement de statut du remboursement
- Un lien "Contacter le support" est disponible si le remboursement n'est pas reçu après le délai annoncé

---

## 1.6 Retrait

---

---

## Mockups

### consumer-payment

```
┌─────────────────────────────────┐
│  < Retour                       │
│                                 │
│    Moyen de paiement            │
│                                 │
│  Total à payer : Rs 50          │
│                                 │
│  ┌───────────────────────────┐  │
│  │ ● 💳 Visa **** 4532       │  │
│  │   (par défaut)            │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ ○ 💳 Mastercard **** 8901 │  │
│  │   Expire 12/26            │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ ○ MCB Juice              │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ ○ Blink by Emtel         │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ ○ my.t money              │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ + Ajouter un moyen de     │  │
│  │   paiement                │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │       CONTINUER           │  │
│  └───────────────────────────┘  │
│                                 │
│  💡 Sélectionnez votre moyen de │
│  paiement. Le montant sera      │
│  bloqué mais pas débité.  [OK]  │
└─────────────────────────────────┘
```

