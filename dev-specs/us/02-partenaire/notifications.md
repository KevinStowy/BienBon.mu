# Notifications partenaire

> US couvertes : US-P035, US-P036, US-P037, US-P038, US-P039, US-P040, US-P041, US-P042

---

### US-P035 -- Notification récapitulative 1h avant le créneau de retrait
**En tant que** partenaire, **je veux** recevoir un récapitulatif 1 heure avant le début de mon créneau de retrait **afin de** préparer les paniers à temps.

**Critères d'acceptation :**
- **Déclencheur** : 1 heure avant l'heure de début du créneau de retrait d'un panier
- **Canaux** : notification push ET email
- **Contenu de la notification push** :
  - Titre : "Créneau dans 1h -- [titre du panier]"
  - Corps : "Vous avez [X] panier(s) réservés pour le créneau [heure début] - [heure fin]. Préparez-vous !"
  - Action au tap : ouvre la page des réservations du panier concerné
- **Contenu de l'email** :
  - Objet : "Rappel : [X] panier(s) à préparer pour [heure début]"
  - Corps :
    - Nom du panier
    - Nombre de paniers réservés
    - Créneau de retrait
    - Liste des IDs de réservation
    - Lien vers le dashboard pour voir les détails
- **Règles** :
  - La notification n'est envoyée que si au moins 1 réservation existe sur le panier
  - Si le partenaire a plusieurs paniers avec des créneaux proches, un seul email récapitulatif est envoyé (mais une notification push par panier)
  - Si aucune réservation n'a été faite, aucune notification n'est envoyée

---

---

### US-P036 -- Notification temps réel de nouvelle réservation
**En tant que** partenaire, **je veux** être notifié en temps réel lorsqu'un consommateur réserve un de mes paniers **afin de** suivre les commandes au fil de l'eau.

**Critères d'acceptation :**
- **Déclencheur** : un consommateur finalise une réservation sur un panier du partenaire
- **Canal** : notification push uniquement (pas d'email pour éviter le spam en cas de nombreuses réservations)
- **Contenu de la notification push** :
  - Titre : "Nouvelle réservation !"
  - Corps : "Nouvelle réservation #[ID réservation] : [quantité] panier(s) [titre du panier] pour [heure début] - [heure fin]"
  - Sous-titre (si supporté) : "[Y] panier(s) restant(s) sur [Z]"
  - Action au tap : ouvre la page des réservations du panier concerné
- **Règles** :
  - Notification envoyée immédiatement (temps réel)
  - En cas de réservations multiples rapprochées, les notifications sont regroupées par fenêtre de 1 minute (au lieu de 30 secondes). Ex: "3 nouvelles réservations en 1 minute" au lieu d'une notification par réservation.
  - La notification n'est pas envoyée si le partenaire est actuellement connecté et sur la page des réservations (il voit déjà la mise à jour en temps réel)

---

---

### US-P037 -- Notification de nouvel avis
**En tant que** partenaire, **je veux** être notifié lorsqu'un consommateur laisse une note sur mon commerce **afin de** suivre la satisfaction de mes clients.

**Critères d'acceptation :**
- **Déclencheur** : un consommateur laisse une note (étoiles) après un retrait
- **Canal** : notification push uniquement
- **Contenu de la notification push** :
  - Titre : "Nouvel avis reçu"
  - Corps : "Un consommateur vous a attribué [X] étoile(s). Votre note moyenne est maintenant de [Y]/5."
  - Action au tap : ouvre la page des avis du dashboard
- **Règles** :
  - Notification envoyée immédiatement après le dépôt de l'avis
  - Maximum 1 notification de nouvel avis par jour. Si plusieurs avis sont reçus dans la même journée, ils sont regroupés dans une seule notification récapitulative (ex: "Vous avez reçu 3 nouveaux avis aujourd'hui. Note moyenne : 4.2/5").
  - La note individuelle n'est pas contestable par le partenaire (mais il peut contacter le support BienBon)

---

---

### US-P038 -- Notification de validation ou rejet admin
**En tant que** partenaire, **je veux** être notifié lorsque l'admin BienBon valide ou rejette une de mes demandes (inscription, modification de fiche) **afin de** savoir immédiatement si mes changements sont en ligne.

**Critères d'acceptation :**
- **Déclencheur** : un admin BienBon valide OU rejette une demande du partenaire (inscription, modification de fiche commerce)
- **Canaux** : notification push ET email
- **En cas de validation :**
  - **Notification push** :
    - Titre : "Modification validée"
    - Corps : "Votre modification de [élément modifié] a été validée et est en ligne."
    - Action au tap : ouvre la fiche du commerce sur le dashboard
  - **Email** :
    - Objet : "Votre modification a été validée - BienBon"
    - Corps : détail de la modification validée, confirmation que les changements sont visibles par les consommateurs
- **En cas de rejet :**
  - **Notification push** :
    - Titre : "Modification rejetée"
    - Corps : "Votre modification de [élément modifié] a été rejetée. Consultez les détails."
    - Action au tap : ouvre la page des modifications en attente
  - **Email** :
    - Objet : "Votre modification nécessite des corrections - BienBon"
    - Corps : détail de la modification rejetée, motif du rejet (rédigé par l'admin), invitation à resoumettre une version corrigée, lien vers le dashboard

---

---

### US-P039 -- Notification de nouvelle réclamation
**En tant que** partenaire, **je veux** être notifié lorsqu'un consommateur ouvre une réclamation concernant un de mes paniers **afin de** en prendre connaissance rapidement.

**Critères d'acceptation :**
- **Déclencheur** : un consommateur ouvre une réclamation liée à un retrait effectué chez le partenaire
- **Canaux** : notification push ET email
- **Contenu de la notification push** :
  - Titre : "Nouvelle réclamation"
  - Corps : "Un consommateur a ouvert une réclamation concernant le panier [titre du panier] du [date]. L'équipe BienBon traite le dossier."
  - Action au tap : ouvre la page de l'historique des retraits sur le dashboard
- **Contenu de l'email** :
  - Objet : "Réclamation reçue pour [titre du panier] - BienBon"
  - Corps :
    - Date et heure de la réclamation
    - Panier concerné (titre, date)
    - Message du consommateur (texte de la réclamation)
    - Photos jointes par le consommateur (s'il y en a)
    - Mention : "L'équipe BienBon traite cette réclamation. Vous serez informé de la résolution."
    - Coordonnées du support BienBon si le partenaire souhaite apporter des précisions
- **Règles** :
  - Le partenaire ne résout pas la réclamation lui-même (c'est l'admin BienBon qui tranche)
  - Le partenaire est informé de la résolution de la réclamation par une notification séparée (push + email)

---

---

### US-P040 -- Notification de résolution de réclamation
**En tant que** partenaire, **je veux** être notifié de la résolution d'une réclamation le concernant **afin de** connaître la décision prise par BienBon.

**Critères d'acceptation :**
- **Déclencheur** : l'admin BienBon résout une réclamation concernant un panier du partenaire
- **Canaux** : notification push ET email
- **Contenu de la notification push** :
  - Titre : "Réclamation résolue"
  - Corps : "La réclamation concernant [titre du panier] du [date] a été résolue. Décision : [remboursement total / remboursement partiel / réclamation rejetée]."
  - Action au tap : ouvre la page de l'historique sur le dashboard
- **Contenu de l'email** :
  - Objet : "Résolution de la réclamation pour [titre du panier] - BienBon"
  - Corps :
    - Rappel de la réclamation originale
    - Décision prise (remboursement total, partiel, ou rejet)
    - Motif de la décision (rédigé par l'admin)
    - Montant remboursé au consommateur (le cas échéant)
    - Impact éventuel sur la commission du partenaire (si le remboursement est à la charge du partenaire)
    - Coordonnées du support BienBon pour toute question

---

---

### US-P041 -- Notification de synthèse no-show
**En tant que** partenaire, **je veux** être notifié après la fin d'un créneau si des consommateurs ne se sont pas présentés **afin de** savoir combien de paniers n'ont pas été retirés.

**Critères d'acceptation :**
- **Déclencheur** : fin du créneau de retrait d'un panier, si au moins 1 réservation est en no-show
- **Canal** : notification push uniquement
- **Contenu de la notification push** :
  - Titre : "No-shows détectés"
  - Corps : "[X] consommateur(s) ne se sont pas présentés pour le panier [titre du panier]. Le montant est maintenu."
  - Action au tap : ouvre la page de l'historique des retraits, filtrée sur les no-shows du jour
- **Règles** :
  - Notification envoyée uniquement si au moins 1 no-show est détecté
  - Si le partenaire a plusieurs paniers avec des no-shows le même jour, une notification par panier est envoyée
  - Le partenaire n'a aucune action à effectuer (information uniquement)

---

---

### US-P042 -- Gérer les préférences de notification
**En tant que** partenaire, **je veux** choisir quelles notifications je reçois et par quel canal **afin de** ne recevoir que les notifications utiles pour moi.

**Critères d'acceptation :**
- Page de paramétrage des notifications accessible depuis le dashboard
- Pour chaque type de notification, le partenaire peut choisir :
  - Push : activé / désactivé
  - Email : activé / désactivé
- **Notifications NON désactivables** (toujours envoyées) :
  - Validation/rejet d'inscription
  - Validation/rejet de modification de fiche
  - Nouvelle réclamation
  - Résolution de réclamation
  - Relevé de reversement mensuel
- **Notifications désactivables :**
  - Nouvelle réservation (push)
  - Récapitulatif 1h avant créneau (push et/ou email)
  - Nouvel avis (push)
  - No-show (push)
- Par défaut, toutes les notifications sont activées

---

## 2.9 Reversements

---

---

## Mockups

### partner-notifications

```
┌──────────────────────────────────────────────────────┐
│  ── Notification Push ──                             │
│  ┌─────────────────────────────────────────────────┐ │
│  │  [BienBon]                           16h30      │ │
│  │  Créneau dans 1h -- Panier Repas du midi        │ │
│  │                                                 │ │
│  │  Vous avez 5 panier(s) réservés pour le         │ │
│  │  créneau 17h30 - 19h00. Préparez-vous !         │ │
│  │                                                 │ │
│  │  > Voir les réservations                        │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ── Email récapitulatif ──                           │
│  ┌─────────────────────────────────────────────────┐ │
│  │  De : noreply@bienbon.mu                        │ │
│  │  Objet : Rappel : 5 panier(s) à préparer        │ │
│  │          pour 17h30                             │ │
│  │─────────────────────────────────────────────────│ │
│  │                                                 │ │
│  │  Bonjour Jean,                                  │ │
│  │                                                 │ │
│  │  Rappel pour votre créneau de 17h30 :           │ │
│  │                                                 │ │
│  │  Panier : Panier Repas du midi                  │ │
│  │  Paniers réservés : 5                           │ │
│  │  Créneau : 17h30 - 19h00                        │ │
│  │                                                 │ │
│  │  Réservations :                                  │ │
│  │  - Dupont Marie (2 paniers)                     │ │
│  │  - Doorgakant Raj (1 panier)                    │ │
│  │  - Martin Sophie (1 panier)                     │ │
│  │  - Doorgakant Anil (1 panier)                   │ │
│  │                                                 │ │
│  │  [ Voir sur le dashboard -> ]                   │ │
│  │                                                 │ │
│  │  Bonne préparation !                            │ │
│  │  L'équipe BienBon                               │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

