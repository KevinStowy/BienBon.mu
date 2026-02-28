# Reclamations

> US couvertes : US-C047, US-C048, US-C049

---

### US-C047 — Ouvrir une réclamation
**En tant que** consommateur, **je veux** ouvrir une réclamation après un retrait insatisfaisant **afin de** signaler un problème avec mon panier et obtenir une résolution.

**Critères d'acceptation :**
- La réclamation est accessible uniquement après validation du retrait par le partenaire
- La réclamation est accessible depuis l'historique des réservations > détail de la réservation > bouton "Signaler un problème"
- Le formulaire de réclamation contient :
  - Un motif à sélectionner dans une liste prédéfinie :
    - "Contenu du panier non conforme (quantité insuffisante, qualité médiocre, articles manquants)"
    - "Problème d'hygiène ou de fraîcheur"
    - "Commerce fermé au moment du retrait"
    - "Créneau de retrait non respecté par le partenaire"
    - "Erreur de paiement / double prélèvement"
    - "Problème technique BienBon (bug app, erreur affichage)"
    - "Comportement inapproprié du partenaire"
    - "Autre (champ libre)"
  - Un champ de commentaire texte obligatoire (minimum 20 caractères) pour décrire le problème
  - La possibilité d'ajouter jusqu'à 5 photos pour illustrer le problème
- La réclamation doit être ouverte dans les 24 heures suivant le retrait ; au-delà, le bouton est désactivé avec le message "Le délai pour ouvrir une réclamation est dépassé (24h après le retrait)"
- Après soumission, un écran de confirmation est affiché : "Votre réclamation a bien été enregistrée. Notre équipe va l'examiner et vous tiendra informé."
- Un email de confirmation d'ouverture de réclamation est envoyé avec un numéro de référence
- La réclamation est transmise à l'admin BienBon pour traitement

---

---

### US-C048 — Suivre le statut de ma réclamation
**En tant que** consommateur, **je veux** suivre l'état d'avancement de ma réclamation **afin de** savoir où en est son traitement.

**Critères d'acceptation :**
- Le suivi est accessible depuis l'historique des réservations > détail de la réservation > section "Réclamation"
- Les statuts possibles sont affichés avec un indicateur visuel (icône + couleur) :
  - "Ouverte" (bleu) : réclamation soumise, en attente de traitement
  - "En cours de traitement" (orange) : un admin examine la réclamation
  - "Résolue" (vert) : décision prise par l'admin
- La date de soumission et la date de chaque changement de statut sont affichées
- Un lien "Contacter le support" est disponible si le traitement prend plus de 48 heures
- Le consommateur reçoit une notification push à chaque changement de statut

---

---

### US-C049 — Recevoir la résolution de ma réclamation
**En tant que** consommateur, **je veux** être informé de la résolution de ma réclamation avec le détail de la décision **afin de** savoir ce qui a été décidé.

**Critères d'acceptation :**
- Le consommateur reçoit une notification push et un email l'informant que sa réclamation a été résolue
- Le détail de la décision est visible dans l'app depuis le détail de la réclamation :
  - Décision : "Remboursement total accordé", "Remboursement partiel accordé ([X] Rs)", ou "Réclamation rejetée"
  - Commentaire de l'admin expliquant la décision
- Si un remboursement est accordé :
  - Le montant est recrédité sur le moyen de paiement utilisé lors de la réservation
  - Le statut du remboursement est suivi en temps réel (US-C038)
- Si la réclamation est rejetée :
  - Le motif du rejet est clairement expliqué
  - Un lien "Contacter le support" est disponible si le consommateur souhaite contester
- La réclamation passe en statut "Résolue" dans l'historique

---

## 1.9 Favoris & Alertes

---

---

## Mockups

### consumer-claims

```
┌─────────────────────────────────┐
│  < Retour                       │
│                                 │
│    Signaler un problème         │
│                                 │
│  Réservation : Le Chamarel      │
│  Panier Surprise - 05/02/2026   │
│                                 │
│  Motif :                        │
│  ┌───────────────────────────┐  │
│  │ Sélectionnez un motif   ▾ │  │
│  └───────────────────────────┘  │
│                                 │
│  Description (min. 20 car.) :   │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │                           │  │
│  │                           │  │
│  │                           │  │
│  └───────────────────────────┘  │
│  0/20 caractères minimum        │
│                                 │
│  Photos (optionnel, max 5) :    │
│  ┌─────┐ ┌─────┐               │
│  │  +  │ │     │               │
│  │Photo│ │     │               │
│  └─────┘ └─────┘               │
│                                 │
│  ┌───────────────────────────┐  │
│  │      ENVOYER              │  │
│  └───────────────────────────┘  │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

