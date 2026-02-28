# Reservations & Retraits

> US couvertes : US-P025, US-P026, US-P027, US-P029, US-P030, US-P031

---

### US-P025 -- Voir les réservations en cours en temps réel
**En tant que** partenaire, **je veux** voir la liste des réservations faites sur mes paniers du jour **afin de** préparer les commandes et anticiper les retraits.

**Critères d'acceptation :**
- La page des réservations est accessible depuis le dashboard et affiche les réservations du jour en cours
- Pour chaque réservation :
  - ID de réservation (ex: #RES-2026-00142)
  - Consommateur : nom, prénom et user ID (ex: Dupont Marie · USR-00087)
  - Panier réservé (titre)
  - Quantité réservée
  - Créneau de retrait
  - Statut : réservé (en attente de retrait), retiré (retrait validé), no-show, annulé par le consommateur, annulé par le partenaire
  - Heure de la réservation
- Si un consommateur a supprimé son compte, son nom/prénom est remplacé par "Utilisateur supprimé" (le user ID et l'ID de réservation restent visibles pour traçabilité)
- La liste se met à jour en temps réel (nouvelles réservations apparaissent sans rafraîchir la page)
- Un compteur affiche le nombre total de paniers à préparer pour chaque créneau
- Filtrage possible par panier et par statut
- Un tri par créneau de retrait (le plus proche en premier) est appliqué par défaut
- Indication visuelle quand le créneau de retrait est en cours (surbrillance, badge "En cours")

---

---

### US-P026 -- Valider un retrait par scan QR code
**En tant que** partenaire, **je veux** scanner le QR code présenté par le consommateur **afin de** valider son retrait rapidement et sans erreur.

**Critères d'acceptation :**
- Bouton "Scanner un retrait" accessible depuis le dashboard et depuis la page des réservations
- Le clic ouvre le scanner caméra du terminal (smartphone, tablette, ou webcam)
- Le scan identifie la réservation et affiche un écran de confirmation avec :
  - ID de réservation (ex: #RES-2026-00142)
  - Consommateur : nom, prénom (ex: Dupont Marie)
  - Titre du panier
  - Quantité réservée
  - Créneau de retrait
- Bouton "Confirmer le retrait" pour finaliser
- Après confirmation :
  - La réservation passe en statut "retiré"
  - L'heure exacte du retrait est enregistrée
  - Le partenaire voit un message de succès : "Retrait validé avec succès !"
- **Cas d'erreur** :
  - QR code invalide ou non reconnu : message "QR code non reconnu. Vérifiez qu'il s'agit bien d'un QR BienBon."
  - Réservation déjà retirée : message "Ce retrait a déjà été validé."
  - Réservation annulée : message "Cette réservation a été annulée."
  - Créneau non encore commencé : message "Le créneau de retrait n'a pas encore commencé. Retrait prévu à partir de [heure]."

---

---

### US-P027 -- Valider un retrait par code PIN
**En tant que** partenaire, **je veux** saisir le code PIN communiqué par le consommateur **afin de** valider le retrait comme alternative au scan QR code.

**Critères d'acceptation :**
- Champ de saisie du code PIN accessible depuis le dashboard et depuis la page des réservations
- Le code PIN est un code numérique court (4 à 6 chiffres) unique par réservation
- La saisie du code PIN identifie la réservation et affiche le même écran de confirmation que le scan QR :
  - ID de réservation (ex: #RES-2026-00142)
  - Consommateur : nom, prénom (ex: Dupont Marie)
  - Titre du panier
  - Quantité réservée
  - Créneau de retrait
- Bouton "Confirmer le retrait" pour finaliser
- Le résultat est identique au scan QR (même statut, même enregistrement)
- **Cas d'erreur** : mêmes cas que le scan QR (code non reconnu, déjà retiré, annulé, créneau non commencé)
- Utilisation recommandée quand le scan QR ne fonctionne pas (caméra défectueuse, écran consommateur abîmé, etc.)

---

---

---

### US-P029 -- Annuler un panier ayant des réservations
**En tant que** partenaire, **je veux** annuler un panier même s'il a des réservations **afin de** gérer un imprévu (rupture de stock, panne, fermeture urgente).

**Critères d'acceptation :**
- Bouton "Annuler ce panier" disponible sur le détail du panier
- Avant l'annulation, un écran de confirmation affiche :
  - Un avertissement clair : "Attention : ce panier a [X] réservation(s) active(s). L'annulation entraînera le remboursement automatique de tous les consommateurs concernés."
  - La liste des consommateurs impactés avec leur quantité réservée
  - Un champ "Motif de l'annulation" (obligatoire, texte libre) pour que le partenaire explique la raison
- Après confirmation :
  - Tous les consommateurs ayant réservé sont remboursés automatiquement (crédit sur le moyen de paiement utilisé)
  - Tous les consommateurs concernés reçoivent une notification push : "Le panier [titre] chez [nom du commerce] a été annulé par le partenaire. Votre remboursement de [montant] Rs est en cours."
  - Tous les consommateurs concernés reçoivent un email avec le détail du remboursement
  - Le panier est marqué comme "annulé par le partenaire"
  - L'annulation et le motif sont tracés dans le journal d'activité (visible par l'admin)
- Les annulations fréquentes sont un indicateur suivi par l'admin (taux d'annulation)

---

---

### US-P030 -- Voir l'historique des retraits
**En tant que** partenaire, **je veux** voir l'historique complet de tous les retraits (validés, no-shows, annulés) **afin de** suivre mon activité passée et identifier les tendances.

**Critères d'acceptation :**
- Liste des retraits passés avec :
  - Date du retrait
  - Titre du panier
  - ID de réservation (ex: #RES-2026-00142)
  - Consommateur : nom, prénom (ou "Utilisateur supprimé" si compte supprimé)
  - Quantité réservée / quantité effectivement retirée
  - Statut : retiré (complet), retiré (partiel), no-show, annulé par le consommateur, annulé par le partenaire
  - Montant de la transaction
  - Méthode de validation (QR code ou PIN)
- Filtrable par :
  - Période (date de début, date de fin)
  - Statut (retiré, no-show, annulé)
  - Panier
- Tri par date (les plus récents en premier) par défaut
- Total sur la période sélectionnée (nombre de retraits, montant total, taux de no-show)
- Export possible en CSV pour la comptabilité du partenaire

---

---

### US-P031 -- No-show automatique
**En tant que** partenaire, **je suis informé** que les réservations non validées à la fin du créneau de retrait passent automatiquement en statut "no-show".

**Critères d'acceptation :**
- Le système marque automatiquement comme "no-show" toute réservation dont le retrait n'a pas été validé (ni par QR code ni par PIN) à l'expiration du créneau de retrait
- Le traitement no-show s'exécute automatiquement à la fin du créneau (heure de fin du créneau + 0 minutes -- pas de délai de grâce)
- Le montant de la transaction est maintenu (le consommateur est débité, le paiement avait été capturé au début du créneau)
- Le partenaire peut consulter la liste des no-shows dans son historique (voir US-P030)
- Le partenaire reçoit une notification push de synthèse après la fin du créneau si des no-shows ont eu lieu : "[X] consommateur(s) ne se sont pas présentés pour le panier [titre]."
- Le partenaire n'a aucune action à effectuer pour le no-show (processus entièrement automatique)

---

## 2.7 Tableau de Bord

---

---

## Mockups

### partner-reservations

```
┌──────────────────────────────────────────────────────┐
│  BienBon - Dashboard Partenaire                      │
│  Nav: Paniers | Réservations | Stats | Mon commerce  │
│──────────────────────────────────────────────────────│
│                                                      │
│  Réservations du jour          07 Février 2026       │
│                                                      │
│  [ Scanner QR ] [ Saisir PIN ]                       │
│                                                      │
│  Créneau 17h30-19h00 : 8 paniers à préparer          │
│  ┌────────── [En cours] ─────────────────────┐       │
│                                                      │
│  Filtres : [Tous paniers v] [Tous statuts v]         │
│                                                      │
│  ┌──────┬───────────┬──────────┬───┬────────┬────────┐ │
│  ┌──────┬────────────────┬──────────┬───┬───────┬───────┐│
│  │#RES  │Consommateur    │Panier    │Qté│Crén.  │Statut ││
│  ├──────┼────────────────┼──────────┼───┼───────┼───────┤│
│  │..0142│Dupont Marie    │Repas midi│ 2 │17h30- │Réservé││
│  │      │USR-00087       │          │   │19h00  │       ││
│  ├──────┼────────────────┼──────────┼───┼───────┼───────┤│
│  │..0143│Doorgakant Raj  │Repas midi│ 1 │17h30- │Retiré ││
│  │      │USR-00142       │          │   │19h00  │ 17h45 ││
│  ├──────┼────────────────┼──────────┼───┼───────┼───────┤│
│  │..0144│Martin Sophie   │Viennois. │ 1 │17h30- │Réservé││
│  │      │USR-00045       │          │   │19h00  │       ││
│  ├──────┼────────────────┼──────────┼───┼───────┼───────┤│
│  │..0145│Doorgakant Anil │Repas midi│ 1 │17h30- │Réservé││
│  │      │USR-00098       │          │   │19h00  │       ││
│  ├──────┼────────────────┼──────────┼───┼───────┼───────┤│
│  │..0146│Doorgakant Dev  │Viennois. │ 2 │17h30- │Annulé ││
│  │      │USR-00112       │          │   │19h00  │par con││
│  ├──────┼────────────────┼──────────┼───┼───────┼───────┤│
│  │..0147│Doorgakant Priya│Repas midi│ 1 │17h30- │Réservé││
│  │      │USR-00087       │          │   │19h00  │       ││
│  └──────┴────────────────┴──────────┴───┴───────┴───────┘│
│                                                      │
│  Réservés: 5 | Retirés: 1 | Annulés: 1 | No-show: 0 │
│  Tri : [Créneau v]                                   │
│                                                      │
│  (Mise à jour en temps réel)                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

