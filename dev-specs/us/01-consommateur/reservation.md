# Reservation

> US couvertes : US-C024, US-C025, US-C027, US-C028, US-C029, US-C030

---

### US-C024 — Réserver un panier avec écran récapitulatif
**En tant que** consommateur, **je veux** réserver un panier en passant par un écran récapitulatif avant le paiement **afin de** vérifier toutes les informations avant de m'engager (LACUNE #36).

**Critères d'acceptation :**
- Le consommateur clique sur "Réserver" depuis le détail d'un panier
- Un écran de sélection de quantité est affiché (si le partenaire autorise plusieurs paniers par consommateur)
- La quantité est limitée par le stock restant
- **Écran récapitulatif obligatoire avant paiement** affichant clairement :
  - Nom du partenaire
  - Titre du panier
  - Quantité sélectionnée
  - Prix unitaire et prix total
  - Créneau de retrait (date + heure début - heure fin)
  - Adresse de retrait
  - Moyen de paiement sélectionné (avec possibilité de le changer)
  - Mention "Montant bloqué par pré-autorisation. Débit effectif au début du créneau de retrait."
  - Mention "Annulation gratuite possible avant le début du créneau de retrait"
- Le consommateur doit cliquer sur un bouton "Confirmer la réservation" pour finaliser
- Après confirmation, le montant est bloqué par pré-autorisation sur le moyen de paiement sélectionné (MAIS PAS débité)
- Le débit effectif intervient automatiquement au moment du début du créneau de retrait
- Le stock du panier est décrémenté en temps réel immédiatement après confirmation
- Un écran de confirmation de réservation est affiché avec : un récapitulatif, le QR code de retrait, le code PIN de retrait, un bouton "Voir mes réservations"
- Une notification push et un email de confirmation sont envoyés (voir US-C063)
- Le consommateur est redirigé vers l'écran de détail de sa réservation

---

---

### US-C025 — Gestion de la concurrence sur les réservations
**En tant que** consommateur, **je veux** être informé clairement si le panier que je tente de réserver n'est plus disponible **afin de** ne pas être frustré par un échec inattendu (LACUNE #33).

**Critères d'acceptation :**
- Si le dernier panier disponible est réservé par un autre consommateur pendant que le consommateur est sur l'écran récapitulatif ou en cours de paiement, un message clair est affiché : "Désolé, ce panier vient d'être réservé par quelqu'un d'autre. Il n'y en a plus de disponible."
- Le stock est vérifié en temps réel au moment du clic sur "Confirmer la réservation" (pas uniquement au chargement de la page)
- Si le stock a diminué mais il reste des paniers, le consommateur est informé : "Il ne reste plus que X panier(s) disponible(s)" et la quantité sélectionnée est ajustée automatiquement si nécessaire
- Le consommateur peut revenir à la liste des paniers pour en choisir un autre
- Aucun montant n'est bloqué si la réservation échoue
- Une suggestion de paniers similaires à proximité est proposée : "D'autres paniers disponibles près de vous"

---

---

---

### US-C027 — Annuler une réservation
**En tant que** consommateur, **je veux** annuler ma réservation **afin de** libérer le panier si je ne peux finalement pas venir le chercher.

**Critères d'acceptation :**
- Le bouton "Annuler la réservation" est accessible depuis le détail de la réservation en cours
- L'annulation est possible tant que le créneau de retrait n'a pas commencé
- Une confirmation est demandée : "Êtes-vous sûr de vouloir annuler cette réservation ? Le panier sera remis en vente."
- Après confirmation, la pré-autorisation est levée (aucun débit n'est effectué)
- Le stock du panier est ré-incrémenté en temps réel
- La réservation passe en statut "Annulée par le consommateur"
- Un écran de confirmation d'annulation est affiché
- Une notification push et un email de confirmation d'annulation sont envoyés
- L'annulation est IMPOSSIBLE une fois le créneau de retrait démarré ; le bouton "Annuler" est masqué ou désactivé avec le message "Le créneau de retrait a commencé. L'annulation n'est plus possible."
- L'annulation est tracée dans le journal d'activité

---

---

### US-C028 — Voir mes réservations en cours
**En tant que** consommateur, **je veux** voir la liste de mes réservations en cours **afin de** savoir quels paniers je dois aller chercher et quand.

**Critères d'acceptation :**
- Accessible depuis le menu principal (onglet "Mes Réservations" ou "Commandes")
- Liste des réservations actives triée par créneau de retrait (le plus proche en premier)
- Chaque réservation affiche : nom du partenaire, photo du commerce, titre du panier, quantité, prix, créneau de retrait (date + heure début - heure fin), adresse, distance, statut (Réservé, Créneau en cours, À retirer)
- Le statut évolue automatiquement : "Réservé" avant le début du créneau, "Créneau en cours" pendant le créneau
- Accès rapide au QR code / code PIN de retrait en un tap
- Accès rapide au bouton "Itinéraire" pour lancer la navigation GPS
- Bouton "Annuler" visible tant que le créneau n'a pas commencé
- Si aucune réservation en cours, l'écran d'état vide est affiché (US-C023)

---

---

### US-C029 — Voir l'historique de mes réservations
**En tant que** consommateur, **je veux** voir l'historique complet de mes réservations passées **afin de** retrouver mes achats et noter les partenaires.

**Critères d'acceptation :**
- Accessible depuis le menu "Mes Réservations" > onglet "Historique"
- Liste des réservations passées triée par date (les plus récentes en premier)
- Chaque réservation affiche : date, nom du partenaire, titre du panier, quantité, prix payé, statut (Retiré, No-show, Annulé par moi, Annulé par le partenaire)
- Le statut est affiché avec un code couleur (vert = retiré, rouge = no-show, gris = annulé)
- Pour les réservations au statut "Retiré" et non encore notées : un bouton "Noter" est affiché pour laisser une note en étoiles
- Pour les réservations au statut "Retiré" : un bouton "Réclamer" permet d'ouvrir une réclamation
- Pour les réservations au statut "Retiré" : un bouton "Télécharger le reçu" est disponible (US-C037)
- Possibilité de filtrer l'historique par période (semaine, mois, tout)
- Si aucun historique, l'écran d'état vide est affiché (US-C023)

---

---

### US-C030 — Parcours premier achat simplifié
**En tant que** consommateur effectuant sa première réservation, **je veux** être guidé par des indications contextuelles **afin de** comprendre le processus de réservation et me sentir en confiance (LACUNE #28).

**Critères d'acceptation :**
- Lors de la première réservation uniquement, des tooltips/bulles contextuels apparaissent pour guider le consommateur à chaque étape :
  - Étape 1 (sélection quantité) : "Choisissez combien de paniers vous souhaitez réserver"
  - Étape 2 (moyen de paiement) : "Sélectionnez votre moyen de paiement. Le montant sera bloqué mais pas débité tout de suite."
  - Étape 3 (écran récapitulatif) : "Vérifiez les informations avant de confirmer. Vous pouvez annuler gratuitement avant le créneau."
  - Étape 4 (confirmation) : "Bravo ! Votre premier panier est réservé ! Présentez ce QR code au partenaire pour le retirer."
- Chaque tooltip peut être fermé individuellement en tapant dessus ou en tapant "Compris"
- Les tooltips ne sont affichés que lors de la toute première réservation
- Un lien "Comment ça marche ?" est toujours accessible depuis l'écran de réservation pour les réservations suivantes

---

## 1.5 Paiement

---

---

## Mockups

### consumer-reservation

```
┌─────────────────────────────────┐
│  < Retour                       │
│                                 │
│    Réserver un panier           │
│                                 │
│  Le Chamarel                    │
│  Panier Surprise                │
│                                 │
│  Combien de paniers souhaitez-  │
│  vous réserver ?                │
│                                 │
│       ┌───┐         ┌───┐       │
│       │ - │   1     │ + │       │
│       └───┘         └───┘       │
│                                 │
│  Stock restant : 2              │
│                                 │
│  Prix unitaire : Rs 50          │
│  Total : Rs 50                  │
│                                 │
│  ┌───────────────────────────┐  │
│  │       CONTINUER           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │ 💡 Choisissez combien de  │  │
│  │ paniers vous souhaitez    │  │
│  │ réserver           [OK]   │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│  (tooltip premier achat)        │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

