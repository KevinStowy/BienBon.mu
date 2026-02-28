# Paniers recurrents

> US couvertes : US-P021, US-P022, US-P023, US-P024

---

### US-P021 -- Créer un modèle de panier récurrent
**En tant que** partenaire, **je veux** créer un modèle de panier qui se publie automatiquement selon un planning hebdomadaire **afin de** ne pas avoir à recréer mon offre chaque jour.

**Critères d'acceptation :**
- Le formulaire de création de modèle récurrent est accessible depuis la section "Paniers récurrents" du dashboard
- **Champs du modèle** (identiques à un panier manuel, plus le planning) :
  - Titre du panier (obligatoire)
  - Description (optionnel)
  - Contenu détaillé (optionnel)
  - Photo du panier (optionnel, fallback photo commerce)
  - Valeur initiale estimée (obligatoire)
  - Prix de vente (obligatoire, règle 50% de réduction)
  - Quantité disponible par jour (obligatoire)
  - Tags (optionnel)
  - **Créneau horaire de retrait** (obligatoire) : heure de début + heure de fin (appliqué chaque jour de publication)
- **Configuration du planning** :
  - Sélection des jours de la semaine où le panier se publie automatiquement (ex: lundi, mercredi, vendredi)
  - Au moins un jour doit être sélectionné
- Le modèle est créé avec le statut "actif" par défaut
- Le système publie automatiquement un panier chaque jour sélectionné, à une heure configurable (par défaut : début de journée, ex: 6h00)
- Le modèle est une option complémentaire, pas une obligation (le mode manuel reste disponible en parallèle)
- Preview du modèle et du planning avant validation

---

---

### US-P022 -- Activer ou désactiver un modèle récurrent
**En tant que** partenaire, **je veux** activer ou désactiver un modèle récurrent **afin de** contrôler quand mes paniers se publient automatiquement.

**Critères d'acceptation :**
- Toggle actif/inactif visible sur chaque modèle récurrent dans la liste
- **Désactivation** :
  - Le modèle ne publie plus de paniers automatiquement à partir du lendemain
  - Les paniers déjà publiés et réservés ne sont PAS affectés (ils restent actifs jusqu'à la fin de leur créneau)
  - Les paniers déjà publiés mais non réservés restent visibles jusqu'à la fin de leur créneau
  - Le modèle passe en statut "inactif" visuellement (grisé)
- **Réactivation** :
  - Le modèle reprend la publication automatique à partir du prochain jour prévu dans le planning
  - Le modèle repasse en statut "actif"
- Un historique des activations/désactivations est conservé

---

---

### US-P023 -- Désactiver ponctuellement une publication automatique
**En tant que** partenaire, **je veux** annuler la publication automatique d'un panier pour un jour spécifique sans désactiver tout le modèle **afin de** gérer les exceptions (fermeture exceptionnelle, rupture de stock, jour férié).

**Critères d'acceptation :**
- Le partenaire peut consulter un calendrier affichant les prochaines publications prévues (sur les 2 prochaines semaines)
- Pour chaque publication prévue, un bouton "Annuler cette publication" est disponible
- L'annulation est possible uniquement pour les publications futures (pas celles déjà publiées)
- L'annulation d'une publication spécifique ne désactive pas le modèle global
- Le modèle reprend son planning normal le jour suivant (la publication annulée est un cas isolé)
- L'annulation est visuelle sur le calendrier (jour barré ou grisé)
- Si un panier a déjà été publié pour ce jour et qu'il a des réservations, le partenaire est redirigé vers l'annulation avec réservations (US-P026)
- Le partenaire peut aussi réactiver une publication précédemment annulée (si la date n'est pas encore passée)
- Le calendrier affiche les jours fériés mauriciens (visuellement distincts, ex: fond coloré)
- Le calendrier affiche les jours/horaires de fermeture du commerce (basé sur les horaires d'ouverture renseignés dans la fiche commerce)
- Si un panier récurrent est programmé un jour férié ou un jour/horaire où le commerce est fermé, un avertissement visuel est affiché (icône ⚠ + message)
- L'avertissement n'empêche pas la publication, il informe seulement le partenaire

---

---

### US-P024 -- Modifier un modèle récurrent
**En tant que** partenaire, **je veux** modifier les paramètres d'un modèle récurrent **afin d'** ajuster mon offre dans le temps.

**Critères d'acceptation :**
- Tous les champs du modèle sont modifiables :
  - Titre, description, contenu, photo, valeur initiale, prix, quantité, tags, créneau horaire, jours de la semaine
- La règle de prix minimum 50% de réduction s'applique toujours
- Les modifications s'appliquent aux prochaines publications uniquement
- Les paniers déjà publiés à partir de ce modèle ne sont PAS modifiés (ils conservent les paramètres au moment de leur publication)
- Un message de confirmation récapitule les changements : "Ces modifications s'appliqueront à partir de la prochaine publication prévue le [date]"
- L'historique des modifications du modèle est conservé

---

## 2.6 Réservations & Retraits

---

---

## Mockups

### partner-basket-recurring

```
┌──────────────────────────────────────────────────────┐
│  BienBon - Dashboard Partenaire                      │
│  Nav: Paniers | Réservations | Stats | Mon commerce  │
│──────────────────────────────────────────────────────│
│                                                      │
│  Paniers récurrents > Créer un modèle                │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Titre du panier* (max 60 car.)                  │ │
│  │ Panier Surprise du Jour                         │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Description (optionnel)                         │ │
│  │ Assortiment de nos invendus du jour :           │ │
│  │ viennoiseries, pains, gâteaux...                │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Photo (optionnel)                               │ │
│  │ [+ Upload]  Fallback : photo du commerce        │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌──────────────────────┐ ┌──────────────────────┐   │
│  │ Valeur initiale (Rs)*│ │ Prix de vente (Rs)*  │   │
│  │ Rs 100               │ │ Rs 35                │   │
│  └──────────────────────┘ └──────────────────────┘   │
│  Réduction : 65%                                     │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Quantité par jour*                             │ │
│  │ 5                                               │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ── Créneau horaire de retrait ──                    │
│  ┌──────────┐ ┌──────────┐                           │
│  │ Début*   │ │ Fin*     │  Appliqué chaque jour     │
│  │ 17:30    │ │ 19:00    │                           │
│  └──────────┘ └──────────┘                           │
│                                                      │
│  ── Planning hebdomadaire ──                         │
│  Jours de publication automatique :                  │
│  [x] Lun  [x] Mar  [x] Mer  [x] Jeu  [x] Ven       │
│  [ ] Sam  [ ] Dim                                    │
│                                                      │
│  Tags : [Sucré] [Végétarien]                         │
│                                                      │
│  [ Annuler ]   [ Preview ]   [ Créer le modèle ]     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

