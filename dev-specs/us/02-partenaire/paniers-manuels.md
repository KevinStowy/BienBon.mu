# Paniers manuels

> US couvertes : US-P013, US-P014, US-P015, US-P016, US-P017, US-P018, US-P020

---

### US-P013 -- Créer un panier manuellement
**En tant que** partenaire, **je veux** créer un panier surprise pour un jour donné **afin de** le proposer aux consommateurs et écouler mes invendus.

**Critères d'acceptation :**
- Le formulaire de création est accessible depuis le dashboard via un bouton proéminent "Créer un panier"
- **Champs du formulaire :**
  - **Titre du panier** (obligatoire) : texte libre, maximum 60 caractères (ex: "Panier Viennoiseries", "Panier Repas du midi")
  - **Description** (optionnel) : texte libre, maximum 500 caractères, pour décrire le type de produits que le panier pourra contenir
  - **Contenu détaillé** (optionnel) : texte libre pour lister les produits si connus à l'avance
  - **Photo du panier** (optionnel) : si aucune photo n'est uploadée, la photo principale du commerce est utilisée en fallback
  - **Valeur initiale estimée** (obligatoire) : montant en Rs représentant la valeur normale des produits contenus dans le panier
  - **Prix de vente** (obligatoire) : montant en Rs que le consommateur paiera
  - **Quantité disponible** (obligatoire) : nombre de paniers proposés (minimum 1)
  - **Créneau de retrait** (obligatoire) :
    - Date de retrait
    - Heure de début du créneau
    - Heure de fin du créneau
    - La durée du créneau doit être d'au moins 30 minutes
    - Le créneau doit être dans le futur (au moins 1h après la création)
  - **Tags** (optionnel mais recommandé) : voir US-P014
- **Règle de prix obligatoire** : le prix de vente doit représenter au minimum 50% de réduction par rapport à la valeur initiale (prix de vente <= valeur initiale / 2). Si la règle n'est pas respectée, le formulaire affiche une erreur explicative et empêche la soumission.
- Validation en temps réel des champs avec messages d'erreur explicites
- Preview du panier tel qu'il apparaîtra aux consommateurs avant publication
- Le panier est publié immédiatement après création et visible par les consommateurs
- Les consommateurs ayant le commerce en favori reçoivent une notification de nouveau panier disponible

---

---

### US-P014 -- Ajouter des tags à un panier
**En tant que** partenaire, **je veux** taguer mon panier avec son type et ses préférences alimentaires **afin que** les consommateurs puissent le trouver facilement via les filtres de recherche.

**Critères d'acceptation :**
- **Tags de type** (sélection unique obligatoire) :
  - Sucré
  - Salé
  - Mixte (sucré et salé)
- **Tags de préférences alimentaires** (sélection multiple optionnelle) :
  - Végétarien
  - Vegan
  - Halal
  - Sans gluten
  - (autres tags gérés par l'admin depuis le backoffice)
- Les tags sont sélectionnés via des boutons/chips visuels cliquables
- Les tags sont affichés sur la fiche du panier côté consommateur
- Les tags sont utilisés pour le filtrage dans la recherche consommateur
- Les tags sont modifiables après création du panier (même si des réservations existent)

---

---

### US-P015 -- Modifier un panier existant
**En tant que** partenaire, **je veux** modifier un panier que j'ai créé **afin de** corriger ou ajuster mon offre.

**Critères d'acceptation :**
- **Si aucune réservation n'a été faite sur ce panier** :
  - Tous les champs sont modifiables (titre, description, contenu, photo, valeur initiale, prix, quantité, créneau, tags)
  - La règle de prix minimum 50% de réduction s'applique toujours
- **Si des réservations existent** :
  - Seuls les champs suivants sont modifiables :
    - Description et contenu détaillé (pour préciser le contenu)
    - Quantité disponible (uniquement à la hausse -- on ne peut pas descendre sous le nombre de paniers déjà réservés)
    - Tags
  - Le prix, la valeur initiale, le créneau de retrait et le titre ne sont PLUS modifiables
  - Un message explique pourquoi certains champs sont verrouillés : "Ce champ n'est plus modifiable car des réservations existent sur ce panier"
- Un historique des modifications est conservé (pour traçabilité)

---

---

### US-P016 -- Supprimer un panier
**En tant que** partenaire, **je veux** supprimer un panier non encore réservé **afin de** retirer une offre que je ne souhaite plus proposer.

**Critères d'acceptation :**
- Suppression possible uniquement si aucune réservation n'existe sur ce panier
- Une demande de confirmation est affichée : "Êtes-vous sûr de vouloir supprimer ce panier ? Cette action est irréversible."
- Après confirmation, le panier est retiré immédiatement de la visibilité publique
- Le panier est archivé (pas supprimé définitivement) pour traçabilité dans l'historique
- Si des réservations existent, le bouton "Supprimer" est désactivé avec le message : "Impossible de supprimer ce panier car il a des réservations. Vous pouvez l'annuler à la place."
- Un lien vers l'annulation (US-P026) est proposé dans ce cas

---

---

### US-P017 -- Voir la liste de ses paniers
**En tant que** partenaire, **je veux** voir la liste de tous mes paniers (du jour, à venir, passés) **afin d'** avoir une vue d'ensemble de mes offres et de leur statut.

**Critères d'acceptation :**
- Vue organisée par onglets ou filtres :
  - **Aujourd'hui** : paniers du jour en cours
  - **À venir** : paniers programmés pour les jours suivants
  - **Passés** : paniers dont le créneau est terminé (archivés)
  - **Tous** : vue globale
- Pour chaque panier, les informations affichées sont :
  - Titre du panier
  - Date et créneau de retrait
  - Quantité totale proposée
  - Quantité réservée
  - Quantité restante (non réservée)
  - Quantité retirée (validée)
  - Quantité no-show
  - Statut : actif (visible et réservable), épuisé (stock à 0), en cours de retrait (créneau en cours), terminé, annulé
  - Tags
  - Prix de vente
- Tri par défaut : par date de créneau (les plus proches en premier)
- Recherche par titre de panier
- Les paniers issus de modèles récurrents sont identifiés visuellement (icône ou badge "récurrent")

---

---

### US-P018 -- Voir le détail d'un panier spécifique
**En tant que** partenaire, **je veux** voir le détail complet d'un de mes paniers **afin de** suivre son état en temps réel.

**Critères d'acceptation :**
- Affichage de toutes les informations du panier : titre, description, contenu, photo, valeur initiale, prix de vente, tags, quantité totale, quantité réservée, quantité restante, créneau de retrait
- Liste des réservations associées avec : ID de réservation, consommateur (nom, prénom), quantité réservée, statut (réservé, retiré, no-show, annulé)
- Boutons d'action disponibles selon le statut du panier :
  - Modifier (si applicable -- voir US-P015)
  - Supprimer (si aucune réservation -- voir US-P016)
  - Annuler (si des réservations existent -- voir US-P026)
  - Valider un retrait (si créneau en cours -- voir US-P026, US-P027)

---

---

---

### US-P020 -- Créer un panier flash "dernière minute" (LACUNE #21)
**En tant que** partenaire, **je veux** créer rapidement un panier "dernière minute" avec un créneau de retrait imminent **afin d'** écouler mes invendus en urgence avant la fermeture ou la fin de service.

**Critères d'acceptation :**
- Un bouton dédié "Panier Flash" ou "Dernière Minute" est accessible depuis le dashboard, distinct du bouton de création standard
- Le formulaire est simplifié pour une publication rapide :
  - **Titre** : pré-rempli avec "Panier Dernière Minute - [Nom du commerce]" (modifiable)
  - **Prix de vente** (obligatoire) : la règle de 50% de réduction s'applique toujours
  - **Valeur initiale** (obligatoire) : estimation rapide
  - **Quantité** (obligatoire)
  - **Créneau de retrait** : commence dans les 30 minutes à 2 heures qui suivent (sélection rapide parmi des créneaux pré-calculés : "dans 30 min", "dans 1h", "dans 1h30", "dans 2h")
  - La durée du créneau de retrait est fixée à 30 minutes par défaut (modifiable)
  - **Tags** : sélection rapide
  - **Description et photo** : optionnels (fallback sur photo du commerce)
- Le panier est publié instantanément
- Le panier est visuellement identifié comme "Flash" ou "Dernière Minute" avec un badge distinctif côté consommateur
- Le panier flash est mis en avant dans les résultats de recherche des consommateurs à proximité (priorité d'affichage)
- Une notification push est envoyée aux consommateurs proches (dans un rayon configurable) et à ceux ayant le commerce en favori : "Panier dernière minute chez [nom du commerce] ! Dépêchons-nous, il ne reste que [X] panier(s) !"
- Le panier flash expire automatiquement à la fin du créneau de retrait (comme tout panier)
- Les statistiques distinguent les paniers flash des paniers classiques dans le tableau de bord

---

## 2.5 Gestion des Paniers -- Mode Récurrent (Automatique)

---

---

## Mockups

### partner-basket-manual

```
┌──────────────────────────────────────────────────────┐
│  BienBon - Dashboard Partenaire                      │
│  Nav: Paniers | Réservations | Stats | Mon commerce  │
│──────────────────────────────────────────────────────│
│                                                      │
│  Créer un panier                                     │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Titre du panier* (max 60 car.)                  │ │
│  │ Panier Repas du midi                            │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Description (optionnel, max 500 car.)           │ │
│  │ Assortiment de plats du jour et                 │ │
│  │ accompagnements. Cuisine créole maison.         │ │
│  │                                        92/500   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Contenu détaillé (optionnel)                    │ │
│  │ Riz frit, carry poulet, rougaille, salade...    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Photo du panier (optionnel)                     │ │
│  │ ┌───────────┐                                   │ │
│  │ │  + Upload  │ Si aucune photo, la photo        │ │
│  │ │   Photo   │ principale du commerce sera       │ │
│  │ └───────────┘ utilisée.                         │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌──────────────────────┐ ┌──────────────────────┐   │
│  │ Valeur initiale (Rs)*│ │ Prix de vente (Rs)*  │   │
│  │ Rs 150               │ │ Rs 50                │   │
│  └──────────────────────┘ └──────────────────────┘   │
│  Réduction : 67% (minimum 50% requis)                │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Quantité disponible*                           │ │
│  │ 8                                               │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ── Créneau de retrait ──                            │
│  ┌──────────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Date*        │ │ Début*   │ │ Fin*     │         │
│  │ 07/02/2026   │ │ 17:30    │ │ 19:00    │         │
│  └──────────────┘ └──────────┘ └──────────┘         │
│  Durée : 1h30 (minimum 30 min)                       │
│                                                      │
│  ── Tags (US-P014) ──                                │
│  Type* : [Sucré] [Salé] [Mixte]                      │
│                                                      │
│  Préférences :                                       │
│  [Végétarien] [Vegan] [Halal] [Sans gluten]          │
│                                                      │
│  [ Annuler ]   [ Preview ]   [ Publier le panier ]   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

