# Gestion du Commerce

**User Stories couvertes :** US-P007, US-P008, US-P009, US-P010, US-P011, US-P012

---

## US-P007 -- Gérer et modifier les informations de ses commerces

**En tant que** partenaire, **je veux** gérer un ou plusieurs commerces depuis mon compte et modifier leurs informations **afin de** garder mes fiches à jour pour les consommateurs.

**Critères d'acceptation :**
- Un partenaire peut avoir plusieurs commerces rattachés à son compte. Il peut ajouter un nouveau commerce via "Ajouter un commerce". Chaque commerce a sa propre fiche, ses propres paniers et ses propres statistiques. Le partenaire peut basculer entre ses commerces via un sélecteur en haut du dashboard.
- Les champs modifiables pour chaque commerce sont :
  - Nom du commerce
  - Description du commerce
  - Type de commerce
  - Adresse complète
  - Coordonnées GPS (repositionnement sur la carte)
  - Numéro de téléphone du commerce
  - Numéro de Food Dealer's Licence
  - Horaires d'ouverture (voir US-P011)
  - Photos du commerce (voir US-P010)
- Toute modification est soumise à validation par un admin BienBon avant publication
- Lors de la soumission d'une modification :
  - Les informations actuelles (en production) restent affichées publiquement tant que la modification n'est pas validée
  - Un bandeau d'information est affiché sur le dashboard : "Modification en attente de validation"
  - Le partenaire peut consulter les modifications soumises et leur statut
- Le partenaire ne peut pas soumettre une nouvelle modification sur un champ déjà en attente de validation (pour éviter les conflits)
- Si le partenaire tente de modifier un champ déjà en attente, un message l'informe : "Une modification est déjà en cours de validation pour ce champ"
- L'historique des modifications (soumises, validées, rejetées) est consultable par le partenaire

---

## US-P008 -- Être notifié de la validation ou du rejet d'une modification

**En tant que** partenaire, **je veux** savoir si ma modification de fiche commerce a été validée ou rejetée **afin de** savoir si mes nouvelles informations sont en ligne.

**Critères d'acceptation :**
- **En cas de validation :**
  - Notification push : "Votre modification de [champ modifié] pour [nom du commerce] a été validée et est maintenant en ligne."
  - Notification email contenant :
    - Le détail de la modification validée (champ, ancienne valeur, nouvelle valeur)
    - La confirmation que la modification est effective immédiatement
  - Les nouvelles informations sont publiées et visibles par les consommateurs
  - Le bandeau "Modification en attente" disparaît du dashboard
- **En cas de rejet :**
  - Notification push : "Votre modification de [champ modifié] pour [nom du commerce] a été rejetée. Consultez les détails."
  - Notification email contenant :
    - Le motif de rejet détaillé (rédigé par l'admin)
    - Le détail de la modification rejetée
    - Une invitation à soumettre une nouvelle modification corrigée
  - Les anciennes informations restent en place
  - Le partenaire peut resoumettre une modification corrigée

---

## US-P009 -- Gérer les photos du commerce

**En tant que** partenaire, **je veux** ajouter, modifier ou supprimer les photos de mon commerce **afin de** rendre ma fiche attractive et représentative.

**Critères d'acceptation :**
- Upload de plusieurs photos (minimum 1, maximum 10)
- Formats acceptés : JPG, PNG, WEBP
- Taille maximale par photo : 20 Mo
- Les photos sont automatiquement recompressées côté serveur (qualité optimisée pour le web). L'utilisateur peut uploader des photos jusqu'à 20 Mo, elles seront redimensionnées et compressées automatiquement.
- Recadrage interactif (crop) proposé à l'upload
- Possibilité de définir une photo principale (celle affichée en premier sur la fiche et utilisée comme fallback pour les paniers sans photo)
- Possibilité de réordonner les photos par glisser-déposer
- Possibilité de supprimer une photo (sauf si c'est la seule -- minimum 1 photo obligatoire)
- Preview des photos avant soumission
- Toute modification des photos (ajout, suppression, changement d'ordre, changement de photo principale) est soumise à validation admin
- Les photos actuelles restent en place tant que la modification n'est pas validée

---

## US-P010 -- Définir les horaires d'ouverture

**En tant que** partenaire, **je veux** définir les horaires d'ouverture de mon commerce **afin que** les consommateurs sachent quand venir retirer leurs paniers.

**Critères d'acceptation :**
- Horaires définis pour chaque jour de la semaine (lundi à dimanche)
- Pour chaque jour : heure d'ouverture et heure de fermeture
- Possibilité de définir plusieurs plages horaires pour un même jour (ex: 08h-12h puis 14h-18h)
- Possibilité de marquer un jour comme "fermé"
- Possibilité de copier les horaires d'un jour vers d'autres jours (pour éviter la saisie répétitive)
- Les horaires sont affichés sur la fiche du commerce côté consommateur
- Les horaires sont informatifs ; le créneau de retrait du panier est défini séparément et peut être en dehors des horaires d'ouverture standards
- Modification des horaires soumise à validation admin (même flux que US-P007)

---

## US-P011 -- Modifier les informations du responsable

**En tant que** partenaire, **je veux** modifier mes informations personnelles de responsable **afin de** garder mes coordonnées à jour.

**Critères d'acceptation :**
- Champs modifiables : nom, prénom, email, numéro de téléphone
- La modification de l'email nécessite une revalidation par envoi d'un code de confirmation au nouvel email
- La modification du mot de passe nécessite la saisie de l'ancien mot de passe
- Les modifications des informations du responsable ne sont PAS soumises à validation admin (effet immédiat)
- Un email de confirmation est envoyé après modification de l'email ou du mot de passe

---

## US-P012 -- Accéder au centre d'aide contextuel (LACUNE #8)

**En tant que** partenaire, **je veux** accéder à un centre d'aide contextuel depuis n'importe quelle page du dashboard **afin de** trouver rapidement des réponses à mes questions sans quitter mon travail en cours.

**Critères d'acceptation :**
- Un bouton d'aide flottant (icône "?") est présent sur toutes les pages du dashboard partenaire
- Le clic sur le bouton ouvre un panneau latéral (sidebar) sans quitter la page en cours
- Le centre d'aide propose :
  - **Aide contextuelle** : le contenu affiché est adapté à la page courante (ex: sur la page de création de panier, l'aide explique comment créer un panier ; sur la page des réservations, l'aide explique comment valider un retrait)
  - **FAQ partenaire** : questions fréquentes organisées par catégorie :
    - Création et gestion des paniers
    - Réservations et retraits
    - Reversements et commissions
    - Mon compte et mon commerce
  - **Recherche** : barre de recherche dans l'aide
  - **Tutoriels vidéo** : courtes vidéos explicatives (optionnel, si disponibles)
  - **Contact support** : lien vers le formulaire de contact ou l'email du support BienBon
- Le centre d'aide est disponible en FR, EN, et Créole mauricien
- Le partenaire peut fermer le panneau d'aide et reprendre son travail exactement là où il en était
- Le contenu de l'aide est géré par l'admin BienBon depuis le backoffice (contenu éditable)

---

## Mockups

### État par défaut -- Fiche commerce

```
┌──────────────────────────────────────────────────────┐
│  BienBon - Dashboard Partenaire                      │
│  Nav: Paniers | Réservations | Stats | Mon commerce  │
│──────────────────────────────────────────────────────│
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Commerce actif : [Le Chamarel          v]       │ │
│  │                  [+ Ajouter un commerce]        │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  Mon Commerce                                        │
│  [Infos commerce] [Photos] [Horaires] [Responsable]  │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ (i) Modification en attente de validation       │ │
│  │     Champ "Description" soumis le 05/02/2026    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Nom du commerce                                 │ │
│  │ Le Chamarel                          [Modifier] │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Type de commerce                                │ │
│  │ Restaurant                           [Modifier] │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Adresse                                         │ │
│  │ 12 Rue Royale, Port-Louis            [Modifier] │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Coordonnées GPS                                 │ │
│  │ -20.1609, 57.5012                    [Modifier] │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Téléphone                                       │ │
│  │ +230 5912 3456                       [Modifier] │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ BRN                                             │ │
│  │ C07012345                            [Non mod.] │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Description              [En attente - Pending] │ │
│  │ Restaurant traditionnel mauricien au coeur de   │ │
│  │ Port-Louis. Cuisine créole et fruits de mer     │ │
│  │ frais du jour.                                  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  [ Voir historique des modifications ]               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Assets requis

- `../../assets/logos/logo-principal.png` -- Logo BienBon pour le dashboard
