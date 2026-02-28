# Onboarding Partenaire

**User Stories couvertes :** US-P004, US-P005, US-P006

---

## US-P004 -- Onboarding concept BienBon

**En tant que** nouveau partenaire, **je veux** comprendre le concept BienBon et comment la plateforme fonctionne pour moi **afin d'** être rassuré et opérationnel rapidement.

**Critères d'acceptation :**
- L'onboarding se déclenche automatiquement à la première connexion au dashboard
- L'onboarding est composé d'écrans successifs (carousel ou stepper) :
  - **Écran 1 - Le concept** : explication du concept anti-gaspi et du panier surprise ("Vos invendus deviennent une opportunité")
  - **Écran 2 - Le parcours** : explication étape par étape du fonctionnement :
    1. Vous créez un panier surprise avec vos invendus du jour
    2. Les consommateurs le réservent et le paient en ligne
    3. Ils viennent le retirer au créneau que vous définissez
    4. Vous validez le retrait en scannant leur QR code ou en saisissant leur code PIN
  - **Écran 3 - Le modèle économique** : explication claire de la commission BienBon, du fee minimum, de la facturation mensuelle, pas de surprise
  - **Écran 4 - Vos bénéfices** :
    - Revenus additionnels sur des produits qui auraient été jetés
    - Réduction du gaspillage alimentaire (impact environnemental positif)
    - Nouveaux clients qui découvrent votre commerce
    - Visibilité accrue sur la plateforme BienBon
  - **Écran 5 - Rassurance** :
    - Vous gardez le contrôle total : vous choisissez quoi mettre, quand, combien
    - Accompagnement par l'équipe BienBon
    - Simplicité d'utilisation (pas besoin de compétences techniques)
    - Vous pouvez arrêter à tout moment
- Chaque écran dispose d'un bouton "Suivant" et d'un indicateur de progression
- Un bouton "Passer l'onboarding" est disponible sur chaque écran
- L'onboarding n'est affiché qu'une seule fois (marqueur en base)
- L'onboarding est disponible en FR, EN, et Créole mauricien
- À la fin de l'onboarding, le partenaire est invité à créer son premier panier (transition vers US-P005)

---

## US-P005 -- Être guidé pour créer son premier panier

**En tant que** nouveau partenaire, **je veux** être accompagné pas à pas pour créer mon premier panier **afin de** démarrer sur la plateforme sans difficulté.

**Critères d'acceptation :**
- Après l'onboarding (ou au premier accès au dashboard si l'onboarding a été sauté), un assistant de création guide le partenaire
- Le guidage met en surbrillance chaque champ du formulaire de création de panier, un par un
- Pour chaque champ, un tooltip explicatif est affiché avec :
  - La description du champ
  - Un exemple concret adapté au type de commerce du partenaire (ex: pour une boulangerie : "Panier Viennoiseries du matin", pour un restaurant : "Panier Plat du jour")
  - Les règles applicables (ex: "Le prix de vente doit être au moins 50% inférieur à la valeur initiale")
- Les exemples de contenu sont adaptés au type de commerce du partenaire (restaurant, boulangerie, hôtel, etc.)
- Une barre de progression indique l'avancement du guidage
- Le partenaire peut quitter le guidage à tout moment et y revenir plus tard
- Après la création du premier panier :
  - Un écran de félicitation est affiché : "Bravo ! Votre premier panier est en ligne !"
  - Un récapitulatif du panier créé est affiché
  - Un message explique ce qui va se passer ensuite ("Les consommateurs peuvent maintenant le réserver")
  - Un lien vers le centre d'aide est proposé pour aller plus loin

---

## US-P006 -- Compléter son profil après inscription par un admin (LACUNE #4)

**En tant que** partenaire inscrit par un admin BienBon, **je veux** compléter mon profil et changer mon mot de passe temporaire **afin de** sécuriser mon compte et fournir toutes les informations nécessaires.

**Critères d'acceptation :**
- Lorsqu'un admin crée le compte partenaire depuis le backoffice, un email est envoyé au partenaire contenant :
  - Un message de bienvenue personnalisé
  - L'explication que son compte a été créé par l'équipe BienBon
  - Ses identifiants temporaires (email + mot de passe temporaire généré automatiquement)
  - Un lien sécurisé (avec token à usage unique, expiration 72h) vers la page de complétion de profil
  - La mention explicite que le mot de passe doit être changé obligatoirement à la première connexion
- À la première connexion avec les identifiants temporaires, le partenaire est forcé de :
  - **Étape 1 - Changer son mot de passe** :
    - Saisie du mot de passe temporaire actuel
    - Saisie du nouveau mot de passe (mêmes règles de sécurité que l'inscription : minimum 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial)
    - Confirmation du nouveau mot de passe
    - Le mot de passe temporaire ne peut pas être réutilisé
  - **Étape 2 - Compléter les informations manquantes** :
    - Le formulaire affiche les champs déjà remplis par l'admin (en lecture seule ou modifiable selon la configuration admin)
    - Le partenaire complète les champs vides ou manquants (description du commerce, photos, horaires, etc.)
  - **Étape 3 - Accepter les conditions** (LACUNE #7 et #43) :
    - Case à cocher CGV
    - Case à cocher Conditions Commerciales Partenaire
    - Case à cocher Politique de Confidentialité
    - Les trois cases doivent être cochées pour finaliser
- Tant que le profil n'est pas complété et le mot de passe changé, le partenaire ne peut pas accéder au dashboard ni publier de paniers
- Un indicateur de complétion du profil est affiché (ex: "Profil complété à 60%")
- Les modifications apportées par le partenaire sur les informations du commerce sont soumises à validation admin (même flux que US-P010)
- Après complétion, le partenaire est redirigé vers l'onboarding (US-P004)
- Si le lien sécurisé a expiré (après 72h), le partenaire peut demander un nouvel envoi depuis la page de connexion

---

## Mockups

### État par défaut -- Onboarding Écran 1 Le concept

```
┌──────────────────────────────────────────────────────┐
│  BienBon - Dashboard Partenaire                      │
│──────────────────────────────────────────────────────│
│                                                      │
│  Bienvenue sur BienBon !                             │
│  Découvrez comment ça marche (1/5)                   │
│  ●───○───○───○───○                                   │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │                                                 │ │
│  │         [Illustration Anti-Gaspi]               │ │
│  │                                                 │ │
│  │    Vos invendus deviennent une opportunité       │ │
│  │                                                 │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  BienBon est la plateforme anti-gaspillage           │
│  alimentaire de l'île Maurice.                       │
│                                                      │
│  Proposez vos invendus du jour sous forme de         │
│  "paniers surprise" à prix réduit. Les               │
│  consommateurs les réservent et viennent les         │
│  retirer chez vous.                                  │
│                                                      │
│  Moins de gaspillage, plus de revenus.               │
│                                                      │
│  Passer l'onboarding                [ Suivant -> ]   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Assets requis

- `../../assets/logos/logo-principal.png` -- Logo BienBon pour le dashboard
- `../../assets/illustrations/onboarding/onboarding-1-anti-gaspi.png` -- Illustration écran 1 concept anti-gaspi
- `../../assets/illustrations/onboarding/onboarding-2-panier-surprise.png` -- Illustration écran 2 parcours panier
- `../../assets/illustrations/onboarding/onboarding-3-notifications.png` -- Illustration écran 3 notifications
