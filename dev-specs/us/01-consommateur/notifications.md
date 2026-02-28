# Notifications

> US couvertes : US-C062, US-C063, US-C064, US-C065, US-C066, US-C067, US-C068, US-C069, US-C070

---

### US-C062 — Centre de notifications in-app
**En tant que** consommateur, **je veux** consulter toutes mes notifications dans un centre de notifications intégré à l'app **afin de** retrouver les informations importantes même si j'ai manqué une notification push (LACUNE #31).

**Critères d'acceptation :**
- Accessible depuis une icône cloche dans la barre de navigation principale
- Un badge compteur rouge est affiché sur l'icône cloche indiquant le nombre de notifications non lues
- Le centre de notifications affiche la liste de toutes les notifications reçues, triées par date (les plus récentes en premier)
- Chaque notification affiche : icône/type, titre, résumé du contenu, date/heure, indicateur lu/non lu (point ou fond coloré)
- Les notifications non lues sont visuellement distinctes des notifications lues (fond de couleur différente ou point indicateur)
- Un tap sur une notification la marque comme lue et ouvre le contenu associé (ex. détail de la réservation, fiche partenaire, page d'impact)
- Un bouton "Tout marquer comme lu" est disponible en haut de la liste
- Les notifications sont conservées pendant 30 jours ; au-delà, elles sont supprimées automatiquement
- Les types de notifications affichés dans le centre sont : alerte de favori, confirmation de réservation, rappel de retrait, annulation partenaire, remboursement, no-show, résolution de réclamation, badge débloqué, parrainage validé
- Si aucune notification, l'écran d'état vide est affiché (US-C023)
- Le badge compteur se remet à zéro quand toutes les notifications sont lues
- Le centre de notifications supporte le scroll infini ou la pagination

---

## 1.14 Notifications Consommateur

---

> **Note :** Chaque notification ci-dessous inclut des critères d'acceptation complets conformément à la LACUNE #13 : contenu du message, timing, canaux, conditions de déclenchement.

---

---

### US-C063 — Notification : favori publie un nouveau panier
**En tant que** consommateur, **je veux** être notifié quand un partenaire favori publie un nouveau panier **afin de** être parmi les premiers à le réserver.

**Critères d'acceptation :**
- **Déclencheur :** Un partenaire que le consommateur a ajouté à ses favoris publie un nouveau panier (création manuelle ou publication automatique par modèle récurrent)
- **Canaux :** Notification push + centre de notifications in-app ; email si le consommateur a activé les emails pour ce type
- **Timing :** Immédiat (dans les 30 secondes suivant la publication du panier)
- **Contenu du message push :** "[Nom du partenaire] propose un nouveau panier ! [Titre du panier] à [prix] Rs. À retirer [créneau]. Réservez vite !"
- **Contenu du centre de notifications :** Même texte + photo du panier ou du commerce
- **Action au tap :** Ouvre le détail du panier
- **Conditions de non-envoi :** Le consommateur a désactivé les alertes de favoris dans ses préférences de notification
- **Langue :** La notification est rédigée dans la langue sélectionnée par le consommateur

---

---

### US-C064 — Notification : confirmation de réservation
**En tant que** consommateur, **je veux** recevoir une confirmation de réservation **afin d'** avoir la certitude que mon panier est bien réservé.

**Critères d'acceptation :**
- **Déclencheur :** La réservation est confirmée et la pré-autorisation est effectuée avec succès
- **Canaux :** Notification push + email + centre de notifications in-app
- **Timing :** Immédiat (dans les 10 secondes suivant la confirmation de la réservation)
- **Contenu du message push :** "Réservation confirmée ! Votre panier chez [partenaire] vous attend le [date] entre [heure début] et [heure fin]. Présentez votre QR code au retrait."
- **Contenu de l'email :** Récapitulatif complet : nom du partenaire, adresse, titre du panier, quantité, prix, créneau de retrait, QR code, code PIN, lien vers la réservation dans l'app, mention "Annulation gratuite avant le début du créneau"
- **Action au tap (push) :** Ouvre le détail de la réservation avec le QR code
- **Conditions de non-envoi :** Aucune — cette notification est transactionnelle et obligatoire
- **Langue :** Langue sélectionnée par le consommateur

---

---

### US-C065 — Notification : rappel avant créneau de retrait
**En tant que** consommateur, **je veux** recevoir un rappel avant le créneau de retrait **afin de** ne pas oublier d'aller chercher mon panier.

**Critères d'acceptation :**
- **Déclencheur :** Approche du créneau de retrait pour une réservation active (non annulée)
- **Canaux :** Notification push + email + centre de notifications in-app
- **Timing :** 1 heure avant le début du créneau de retrait ; si la réservation est faite moins d'1 heure avant le créneau, le rappel est envoyé 30 minutes avant (pas de rappel si moins de 15 minutes)
- **Contenu du message push :** "Rappel : votre panier chez [partenaire] est à retirer dans 1h ([heure début]-[heure fin]). N'oubliez pas votre QR code !"
- **Contenu de l'email :** Récapitulatif : nom du partenaire, adresse (avec lien maps), créneau, QR code, code PIN
- **Action au tap (push) :** Ouvre le détail de la réservation avec le QR code
- **Conditions de non-envoi :** La réservation a été annulée entre-temps ; le consommateur a désactivé les rappels push (l'email reste envoyé car transactionnel)
- **Langue :** Langue sélectionnée par le consommateur

---

---

### US-C066 — Notification : annulation par le partenaire
**En tant que** consommateur, **je veux** être informé immédiatement si le partenaire annule le panier que j'avais réservé **afin de** savoir que je ne dois plus me déplacer et que je serai remboursé.

**Critères d'acceptation :**
- **Déclencheur :** Le partenaire annule un panier qui avait des réservations
- **Canaux :** Notification push + email + centre de notifications in-app
- **Timing :** Immédiat (dans les 10 secondes suivant l'annulation par le partenaire)
- **Contenu du message push :** "Annulation : votre panier chez [partenaire] a été annulé par le commerce. Vous serez remboursé automatiquement."
- **Contenu de l'email :** Détail de la réservation annulée, montant du remboursement, délai estimé du remboursement, message d'excuses, suggestion de paniers similaires à proximité
- **Action au tap (push) :** Ouvre le détail de la réservation avec le statut "Annulé par le partenaire" et le statut du remboursement
- **Conditions de non-envoi :** Aucune — notification transactionnelle obligatoire
- **Langue :** Langue sélectionnée par le consommateur

---

---

### US-C067 — Notification : remboursement effectué
**En tant que** consommateur, **je veux** être informé quand mon remboursement est effectué **afin de** savoir que l'argent est en cours de retour sur mon compte.

**Critères d'acceptation :**
- **Déclencheur :** Le remboursement a été traité par le système de paiement (pré-autorisation levée ou remboursement déclenché)
- **Canaux :** Notification push + email + centre de notifications in-app
- **Timing :** Immédiat après le traitement du remboursement par le prestataire de paiement
- **Contenu du message push :** "Remboursement confirmé : [montant] Rs ont été recrédités sur votre [moyen de paiement]. Délai : 3 à 10 jours ouvrables."
- **Contenu de l'email :** Montant remboursé, moyen de paiement concerné (avec identifiant partiel), motif du remboursement (annulation partenaire / résolution réclamation), délai estimé, numéro de référence
- **Action au tap (push) :** Ouvre le détail de la réservation avec le statut du remboursement
- **Conditions de non-envoi :** Aucune — notification transactionnelle obligatoire
- **Langue :** Langue sélectionnée par le consommateur

---

---

### US-C068 — Notification : no-show
**En tant que** consommateur, **je veux** être informé que ma réservation a été marquée comme no-show **afin de** comprendre que je n'ai pas retiré mon panier et que le paiement est maintenu.

**Critères d'acceptation :**
- **Déclencheur :** Le système marque automatiquement la réservation en "No-show" à la fin du créneau de retrait (+ délai de grâce de 5 minutes)
- **Canaux :** Notification push + email + centre de notifications in-app
- **Timing :** Immédiat après le passage en statut no-show
- **Contenu du message push :** "Panier non retiré : vous ne vous êtes pas présenté chez [partenaire]. Le montant de [montant] Rs a été débité. Si c'est une erreur, contactez-nous."
- **Contenu de l'email :** Détail de la réservation, montant débité, explication de la politique de no-show, lien "Contacter le support" si le consommateur estime qu'il s'agit d'une erreur
- **Action au tap (push) :** Ouvre le détail de la réservation avec le statut "No-show"
- **Conditions de non-envoi :** Aucune — notification transactionnelle obligatoire
- **Langue :** Langue sélectionnée par le consommateur

---

---

### US-C069 — Notification : résolution de réclamation
**En tant que** consommateur, **je veux** être informé quand ma réclamation a été traitée **afin de** connaître la décision prise.

**Critères d'acceptation :**
- **Déclencheur :** L'admin BienBon résout une réclamation (remboursement total, partiel, ou rejet)
- **Canaux :** Notification push + email + centre de notifications in-app
- **Timing :** Immédiat après la résolution par l'admin
- **Contenu du message push :** "Votre réclamation a été traitée. [Remboursement de X Rs accordé / Réclamation rejetée]. Consultez le détail dans l'app."
- **Contenu de l'email :** Numéro de référence de la réclamation, décision prise (remboursement total/partiel/rejet), montant remboursé le cas échéant, commentaire de l'admin, moyen de paiement concerné, délai de remboursement le cas échéant
- **Action au tap (push) :** Ouvre le détail de la réclamation avec la résolution
- **Conditions de non-envoi :** Aucune — notification transactionnelle obligatoire
- **Langue :** Langue sélectionnée par le consommateur

---

---

### US-C070 — Notification : parrainage validé
**En tant que** consommateur (parrain), **je veux** être notifié quand un de mes filleuls effectue son premier achat **afin de** savoir que ma récompense est déverrouillée.

**Critères d'acceptation :**
- **Déclencheur :** Un filleul inscrit via le code de parrainage du consommateur effectue son premier retrait valide (pas d'annulation, pas de no-show)
- **Canaux :** Notification push + centre de notifications in-app ; email si le consommateur a activé les emails pour ce type
- **Timing :** Immédiat après la validation du retrait du filleul
- **Contenu du message push :** "Bravo ! Votre filleul [prénom] vient de sauver son premier panier. Vous avez gagné [récompense] ! Merci de faire grandir la communauté BienBon."
- **Action au tap (push) :** Ouvre la page de parrainage avec le statut mis à jour
- **Conditions de non-envoi :** Le consommateur a désactivé les notifications de parrainage dans ses préférences
- **Langue :** Langue sélectionnée par le consommateur

---

# RÉCAPITULATIF — PARTIE 1 CONSOMMATEUR

| Section | US | Nombre |
|---|---|---|
| 1.1 Inscription & Authentification | US-C001 à US-C010 | 10 |
| 1.2 Onboarding | US-C011 à US-C012 | 2 |
| 1.3 Recherche & Navigation | US-C013 à US-C023 | 11 |
| 1.4 Réservation | US-C024, US-C025, US-C027 à US-C030 | 6 |
| 1.5 Paiement | US-C031 à US-C038 | 8 |
| 1.6 Retrait | US-C039 à US-C044 | 6 |
| 1.7 Avis & Notes | US-C045 à US-C046 | 2 |
| 1.8 Réclamations | US-C047 à US-C049 | 3 |
| 1.9 Favoris & Alertes | US-C050 à US-C053 | 4 |
| 1.10 Profil & Préférences | US-C054 à US-C057 | 4 |
| 1.11 Partage & Impact | US-C058 à US-C060 | 3 |
| 1.12 Support & Contact | US-C061 | 1 |
| 1.13 Centre de notifications in-app | US-C062 | 1 |
| 1.14 Notifications Consommateur | US-C063 à US-C070 | 8 |
| **TOTAL PARTIE 1 — CONSOMMATEUR** | | **69** |

---

## Lacunes v1 intégrées dans cette version

| Lacune | Référence | US correspondante(s) |
|---|---|---|
| #1 — Navigation mode invité | LACUNE #1 | US-C013 |
| #2 — Partage panier/partenaire | LACUNE #2 | US-C058 |
| #3 — Impact anti-gaspi et gamification | LACUNE #3 | US-C059 |
| #5 — Échecs de paiement | LACUNE #5 | US-C036 |
| #11 — Choix de la langue | LACUNE #11 | US-C057 |
| #13 — Critères d'acceptation complets pour les notifications | LACUNE #13 | US-C063 à US-C070 |
| #16 — Programme de parrainage | LACUNE #16 | US-C060 |
| #18 — Contacter le support | LACUNE #18 | US-C061 |
| #20 — Statut de remboursement en temps réel | LACUNE #20 | US-C038 |
| #26 — Export des données personnelles | LACUNE #26 | US-C010 |
| #27 — Télécharger un reçu de paiement | LACUNE #27 | US-C037 |
| #28 — Parcours premier achat simplifié | LACUNE #28 | US-C030 |
| #29 — Écrans d'états vides | LACUNE #29 | US-C023 |
| #30 — Mode hors connexion | LACUNE #30 | US-C043 |
| #31 — Centre de notifications in-app | LACUNE #31 | US-C062 |
| #32 — Navigation GPS | LACUNE #32 | US-C044 |
| #33 — Concurrence sur les réservations | LACUNE #33 | US-C025 |
| #35 — Quantité max par consommateur | LACUNE #35 | ~~US-C026~~ (supprimée) |
| #36 — Écran récapitulatif avant paiement | LACUNE #36 | US-C024 |
| #43 — Acceptation CGU à l'inscription | LACUNE #43 | US-C001 à US-C005 |

---

## Mockups

### consumer-notifications-center

```
┌─────────────────────────────────┐
│  Notifications          [Tout  │
│                     marquer lu] │
│                                 │
│  ── Aujourd'hui ──             │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🔵 🍽 Nouveau panier       │  │
│  │ Le Chamarel propose un    │  │
│  │ nouveau panier ! Panier   │  │
│  │ Surprise à Rs 50.         │  │
│  │ Il y a 15 min             │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🔵 ✅ Réservation confirmée│  │
│  │ Votre panier chez Royal   │  │
│  │ Bakery vous attend auj.   │  │
│  │ entre 16h et 18h.         │  │
│  │ Il y a 2h                 │  │
│  └───────────────────────────┘  │
│                                 │
│  ── Hier ──                    │
│                                 │
│  ┌───────────────────────────┐  │
│  │ ⚪ ⏰ Rappel retrait       │  │
│  │ Votre panier chez Chez    │  │
│  │ Nando est à retirer dans  │  │
│  │ 1h (18h-20h).             │  │
│  │ Hier à 17h00              │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ ⚪ 🏆 Badge débloqué      │  │
│  │ Félicitations ! Vous avez │  │
│  │ débloqué le badge         │  │
│  │ "Super Sauveur" !         │  │
│  │ Hier à 14h30              │  │
│  └───────────────────────────┘  │
│                                 │
│ ┌──────┬──────┬──────┬──────┐   │
│ │Carte │Liste │Favoris│Profil│  │
│ └──────┴──────┴──────┴──────┘   │
└─────────────────────────────────┘
```

### consumer-notifications

```
┌─────────────────────────────────┐
│                                 │
│ ┌───────────────────────────────┐
│ │ 🌿 BienBon              maint│
│ │                               │
│ │ Le Chamarel propose un        │
│ │ nouveau panier !              │
│ │ Panier Surprise à Rs 50.     │
│ │ À retirer auj. 12h-14h.      │
│ │ Réservez vite !               │
│ │                               │
│ │        [Voir]  [Fermer]       │
│ └───────────────────────────────┘
│                                 │
│  Tap → ouvre le détail du panier│
│                                 │
│  Déclencheur : Partenaire favori│
│  publie un nouveau panier       │
│  Timing : < 30 secondes         │
│  Canaux : Push + in-app         │
│  (+email si activé)             │
│                                 │
│  Non envoyé si : alertes        │
│  favoris désactivées            │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

---

## Assets requis

| Asset | Chemin |
|-------|--------|
| etat vide notifications | `../../assets/illustrations/empty-states/empty-state-notifications.png` |

