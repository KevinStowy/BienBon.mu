# Inscription & Connexion

> **Ecrans couverts :** Inscription (email, telephone, OAuth), verification email/SMS
> **User Stories :** US-C001, US-C002, US-C003, US-C004, US-C005

---

## US-C001 -- Inscription par email

**En tant que** consommateur, **je veux** m'inscrire avec mon adresse email et un mot de passe **afin de** creer mon compte BienBon.

**Criteres d'acceptation :**
- Le formulaire demande : prenom, nom, adresse email, mot de passe, confirmation du mot de passe
- Le mot de passe respecte les regles de securite minimales : 8 caracteres minimum, au moins 1 majuscule, 1 minuscule, 1 chiffre
- Un indicateur de force du mot de passe est affiche en temps reel
- Une case a cocher obligatoire "J'accepte les Conditions Generales d'Utilisation et la Politique de Confidentialite" est presente avec des liens cliquables vers les documents correspondants (LACUNE #43)
- L'inscription est bloquee si les CGU ne sont pas acceptees
- La date et l'heure d'acceptation des CGU sont enregistrees en base de donnees
- Un email de confirmation contenant un lien de verification est envoye a l'adresse renseignee
- Le lien de verification expire apres 24 heures
- Le compte est cree en statut "en attente de verification" tant que l'email n'est pas confirme
- Le compte passe en statut "actif" apres clic sur le lien de verification
- Si l'email est deja utilise par un compte existant, un message d'erreur clair est affiche : "Un compte existe deja avec cet email. Connectez-vous ou reinitialisez votre mot de passe."
- Un email de bienvenue est envoye apres activation du compte
- Le consommateur est redirige vers l'onboarding apres verification

---

## US-C002 -- Inscription par numero de telephone

**En tant que** consommateur, **je veux** m'inscrire avec mon numero de telephone **afin de** creer mon compte rapidement sans avoir besoin d'un email.

**Criteres d'acceptation :**
- Le formulaire d'inscription est unique et partage entre les modes Email et Telephone ; un toggle (switch) Email / Telephone est place en haut du formulaire, juste sous le titre "Creer un compte", permettant de basculer entre les deux modes d'inscription
- Par defaut, le mode Email est selectionne ; le consommateur peut basculer sur le mode Telephone en un tap sur le toggle
- En mode Telephone, le formulaire demande : prenom, nom, numero de telephone (avec indicatif pays +230 pre-rempli pour Maurice)
- Les champs communs (prenom, nom, CGU) restent identiques quel que soit le mode selectionne
- Le format du numero de telephone mauricien est valide (8 chiffres apres l'indicatif)
- Une case a cocher obligatoire "J'accepte les Conditions Generales d'Utilisation et la Politique de Confidentialite" est presente avec des liens cliquables (LACUNE #43)
- L'inscription est bloquee si les CGU ne sont pas acceptees
- La date et l'heure d'acceptation des CGU sont enregistrees en base de donnees
- Un code de verification a 6 chiffres est envoye par SMS au numero renseigne
- Le code SMS expire apres 10 minutes
- Le consommateur peut demander un renvoi du code apres 60 secondes
- Maximum 3 tentatives de saisie du code avant blocage temporaire (15 minutes)
- Si le numero est deja utilise, un message d'erreur clair est affiche
- Le compte est active apres saisie correcte du code
- Le consommateur est redirige vers l'onboarding apres verification

---

## US-C003 -- Inscription via Google

**En tant que** consommateur, **je veux** m'inscrire via mon compte Google **afin de** ne pas avoir a creer un mot de passe et simplifier mon inscription.

**Criteres d'acceptation :**
- Un bouton "Continuer avec Google" est visible sur l'ecran d'inscription
- Le flux OAuth 2.0 Google est declenche au clic
- Les informations de base (prenom, nom, email, photo de profil) sont recuperees automatiquement depuis le compte Google
- Si l'email Google est deja associe a un compte BienBon existant, le consommateur est connecte directement (rattachement automatique)
- Lors de la premiere connexion, un ecran intermediaire affiche les CGU et la Politique de Confidentialite a accepter obligatoirement avant finalisation (LACUNE #43)
- La date et l'heure d'acceptation des CGU sont enregistrees
- Le compte est cree en statut "actif" immediatement (l'email est deja verifie par Google)
- Le consommateur est redirige vers l'onboarding apres creation du compte

---

## US-C004 -- Inscription via Facebook

**En tant que** consommateur, **je veux** m'inscrire via mon compte Facebook **afin de** simplifier mon inscription.

**Criteres d'acceptation :**
- Un bouton "Continuer avec Facebook" est visible sur l'ecran d'inscription
- Le flux OAuth Facebook est declenche au clic
- Les informations de base (prenom, nom, email) sont recuperees automatiquement
- Si Facebook ne fournit pas l'email (cas ou le consommateur a restreint ses permissions), un champ email est demande manuellement
- Si l'email Facebook est deja associe a un compte BienBon, le consommateur est connecte directement
- Lors de la premiere connexion, un ecran intermediaire affiche les CGU et la Politique de Confidentialite a accepter obligatoirement (LACUNE #43)
- La date et l'heure d'acceptation des CGU sont enregistrees
- Le compte est cree en statut "actif" immediatement
- Le consommateur est redirige vers l'onboarding apres creation du compte

---

## US-C005 -- Inscription via Apple

**En tant que** consommateur, **je veux** m'inscrire via mon compte Apple **afin de** simplifier mon inscription sur iOS.

**Criteres d'acceptation :**
- Un bouton "Continuer avec Apple" est visible sur l'ecran d'inscription (affiche uniquement sur les appareils Apple ou sur le web)
- Le flux Sign in with Apple est declenche au clic
- Le consommateur peut choisir de partager son vrai email ou d'utiliser l'email-relais Apple (Hide My Email)
- Les informations (prenom, nom) sont recuperees si le consommateur les partage
- Si le consommateur utilise l'email-relais Apple, le systeme stocke cet email-relais pour les communications
- Si l'email Apple est deja associe a un compte BienBon, le consommateur est connecte directement
- Lors de la premiere connexion, un ecran intermediaire affiche les CGU et la Politique de Confidentialite a accepter obligatoirement (LACUNE #43)
- La date et l'heure d'acceptation des CGU sont enregistrees
- Le compte est cree en statut "actif" immediatement
- Le consommateur est redirige vers l'onboarding apres creation du compte

---

## Mockup -- Inscription Consommateur (consumer-signup)

### Inscription Email -- Defaut
```
┌─────────────────────────────────┐
│           🌿 BienBon            │
│      Sauvez des repas,          │
│      faites des economies       │
│                                 │
│    Creer un compte              │
│                                 │
│  ┌─────────────┬────────────┐   │
│  │ [● Email]   │ Telephone  │   │
│  └─────────────┴────────────┘   │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Prenom                    │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Nom                       │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Adresse email             │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Mot de passe         [👁] │  │
│  └───────────────────────────┘  │
│  Force: ░░░░░░░░░░░░░░░░░░░░   │
│  ┌───────────────────────────┐  │
│  │ Confirmer mot de passe    │  │
│  └───────────────────────────┘  │
│                                 │
│  ☐ J'accepte les CGU et la     │
│    Politique de Confidentialite │
│                                 │
│  ┌───────────────────────────┐  │
│  │       S'INSCRIRE          │  │
│  └───────────────────────────┘  │
│                                 │
│  ─────────── ou ──────────────  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ G  Continuer avec Google  │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ f  Continuer avec Facebook│  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │    Continuer avec Apple   │  │
│  └───────────────────────────┘  │
│                                 │
│  Deja un compte ? Se connecter  │
└─────────────────────────────────┘
```

### Inscription Telephone -- Defaut
```
┌─────────────────────────────────┐
│           🌿 BienBon            │
│      Sauvez des repas,          │
│      faites des economies       │
│                                 │
│    Creer un compte              │
│                                 │
│  ┌─────────────┬────────────┐   │
│  │  Email      │[● Tel.]   │   │
│  └─────────────┴────────────┘   │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Prenom                    │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Nom                       │  │
│  └───────────────────────────┘  │
│  ┌──────┬────────────────────┐  │
│  │ +230 │ Numero de telephone│  │
│  └──────┴────────────────────┘  │
│                                 │
│  ☐ J'accepte les CGU et la     │
│    Politique de Confidentialite │
│                                 │
│  ┌───────────────────────────┐  │
│  │       S'INSCRIRE          │  │
│  └───────────────────────────┘  │
│                                 │
│  ─────────── ou ──────────────  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ G  Continuer avec Google  │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ f  Continuer avec Facebook│  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │    Continuer avec Apple   │  │
│  └───────────────────────────┘  │
│                                 │
│  Deja un compte ? Se connecter  │
└─────────────────────────────────┘
```

### Verification SMS -- OTP
```
┌─────────────────────────────────┐
│  < Retour                       │
│                                 │
│           🌿 BienBon            │
│                                 │
│    Verification par SMS         │
│                                 │
│  Un code a 6 chiffres a ete    │
│  envoye au +230 5 712 3456     │
│                                 │
│  Entrez le code :               │
│                                 │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│  │   │ │   │ │   │ │   │ │   │ │   │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
│                                 │
│  Le code expire dans 09:42      │
│                                 │
│  ┌───────────────────────────┐  │
│  │       VERIFIER            │  │
│  └───────────────────────────┘  │
│                                 │
│  Vous n'avez pas recu le code ? │
│  Renvoyer le code (dans 45s)    │
│                                 │
│  Tentatives restantes : 3/3     │
└─────────────────────────────────┘
```

### Verification Email Envoyee
```
┌─────────────────────────────────┐
│                                 │
│           🌿 BienBon            │
│                                 │
│         ┌─────────┐             │
│         │  ✉      │             │
│         └─────────┘             │
│                                 │
│    Verifiez votre email         │
│                                 │
│  Un lien de verification a ete │
│  envoye a :                     │
│                                 │
│  kevin@example.mu               │
│                                 │
│  Cliquez sur le lien dans       │
│  l'email pour activer votre     │
│  compte. Le lien expire dans    │
│  24 heures.                     │
│                                 │
│  ┌───────────────────────────┐  │
│  │   OUVRIR MA MESSAGERIE    │  │
│  └───────────────────────────┘  │
│                                 │
│  Vous n'avez pas recu l'email ? │
│  Renvoyer l'email               │
└─────────────────────────────────┘
```

### OAuth CGU -- Acceptation
```
┌─────────────────────────────────┐
│  < Retour                       │
│                                 │
│           🌿 BienBon            │
│                                 │
│    Bienvenue Kevin !            │
│                                 │
│  Votre compte Google a ete      │
│  connecte avec succes.          │
│                                 │
│  Avant de continuer, veuillez   │
│  lire et accepter nos           │
│  conditions :                   │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Conditions Generales     │  │
│  │  d'Utilisation            │  │
│  │  1. Objet...              │  │
│  │  2. Inscription...        │  │
│  │  Lire la suite >          │  │
│  └───────────────────────────┘  │
│                                 │
│  ☐ J'accepte les CGU et la     │
│    Politique de Confidentialite │
│                                 │
│  ┌───────────────────────────┐  │
│  │       CONTINUER           │  │
│  └───────────────────────────┘  │
│                                 │
│  Bouton desactive tant que les  │
│  CGU ne sont pas acceptees      │
└─────────────────────────────────┘
```

---

## Assets requis

_Aucun asset specifique requis pour cet ecran. Le logo BienBon est utilise :_
- `../../assets/logos/logo-principal.png`
- `../../assets/logos/logo-avec-texte.png`
