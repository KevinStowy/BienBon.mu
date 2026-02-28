# Connexion, Mot de passe & Gestion de compte

> **Ecrans couverts :** Connexion, mot de passe oublie, deconnexion, suppression de compte, export de donnees
> **User Stories :** US-C006, US-C007, US-C008, US-C009, US-C010

---

## US-C006 -- Connexion au compte

**En tant que** consommateur, **je veux** me connecter a mon compte **afin d'** acceder a mes reservations, mes favoris et mon profil.

**Criteres d'acceptation :**
- Connexion possible par email + mot de passe
- Connexion possible par numero de telephone + code SMS (OTP)
- Connexion possible via Google, Facebook, Apple (selon la methode d'inscription)
- La methode de connexion correspond a celle utilisee lors de l'inscription ; si le consommateur tente une methode differente, un message l'oriente vers la bonne methode
- Apres 5 tentatives de connexion echouees, le compte est temporairement bloque pendant 15 minutes avec message explicatif
- La session est persistante : le consommateur reste connecte entre les ouvertures de l'application (token stocke localement)
- La session expire apres 30 jours d'inactivite
- Si le compte est suspendu ou banni, un message explicatif est affiche avec le motif (pas de connexion possible)
- Apres connexion reussie, le consommateur est redirige vers l'ecran d'accueil (carte ou liste des paniers)

---

## US-C007 -- Mot de passe oublie

**En tant que** consommateur, **je veux** reinitialiser mon mot de passe **afin de** recuperer l'acces a mon compte si j'ai oublie mes identifiants.

**Criteres d'acceptation :**
- Un lien "Mot de passe oublie ?" est accessible depuis l'ecran de connexion
- Le consommateur saisit son adresse email
- Si l'email correspond a un compte existant, un email contenant un lien de reinitialisation est envoye
- Si l'email ne correspond a aucun compte, un message generique est affiche pour ne pas reveler l'existence ou non du compte (securite)
- Le lien de reinitialisation expire apres 1 heure
- Le lien est a usage unique : une fois utilise, il n'est plus valide
- Le consommateur definit un nouveau mot de passe respectant les regles de securite
- Le nouveau mot de passe ne peut pas etre identique a l'ancien
- Apres reinitialisation reussie, toutes les sessions actives sur d'autres appareils sont invalidees
- Un email de confirmation de changement de mot de passe est envoye
- Le consommateur est redirige vers l'ecran de connexion
- Cette fonctionnalite n'est disponible que pour les comptes inscrits par email (pas pour Google/Facebook/Apple)

---

## US-C008 -- Deconnexion

**En tant que** consommateur, **je veux** me deconnecter de mon compte **afin de** securiser mon compte, notamment sur un appareil partage.

**Criteres d'acceptation :**
- Le bouton de deconnexion est accessible depuis le menu Profil/Parametres
- Une confirmation est demandee : "Etes-vous sur de vouloir vous deconnecter ?"
- La session locale est fermee (token supprime)
- Le consommateur est redirige vers l'ecran de connexion
- Apres deconnexion, les notifications push continuent d'etre recues sur l'appareil (car elles sont liees au token FCM/APNs, pas a la session). L'utilisateur peut les desactiver dans les reglages de son telephone ou en se reconnectant puis en les desactivant dans Parametres > Notifications. A la reconnexion, les preferences de notification sont restaurees.
- Les donnees mises en cache localement (QR codes, informations de reservation) sont conservees pour permettre l'acces hors connexion

---

## US-C009 -- Suppression de compte

**En tant que** consommateur, **je veux** supprimer definitivement mon compte **afin d'** exercer mon droit a l'effacement de mes donnees personnelles.

**Criteres d'acceptation :**
- L'option est accessible depuis Profil > Parametres > Supprimer mon compte
- Une demande de confirmation est affichee avec un avertissement clair : "Cette action est irreversible. Toutes vos donnees seront supprimees."
- La suppression est impossible si le consommateur a une reservation active (statut "reserve" ou "creneau en cours") ; un message l'invite a annuler ou attendre la fin du creneau
- Si le consommateur a des pre-autorisations en cours, un message informatif est affiche
- Le consommateur doit confirmer en saisissant "SUPPRIMER" ou son mot de passe
- Les donnees personnelles (prenom, nom, email, telephone, photo, preferences) sont supprimees ou anonymisees dans un delai de 30 jours conformement au Data Protection Act mauricien
- Les donnees transactionnelles (historique de commandes, factures) sont anonymisees mais conservees a des fins comptables legales
- Les avis laisses sont anonymises (auteur remplace par "Utilisateur supprime")
- Un email de confirmation de suppression est envoye avant la suppression effective
- Le consommateur est deconnecte immediatement
- Les comptes lies (Google, Facebook, Apple) sont dissocies

---

## US-C010 -- Exporter mes donnees personnelles

**En tant que** consommateur, **je veux** exporter l'ensemble de mes donnees personnelles **afin d'** exercer mon droit d'acces conformement a la legislation sur la protection des donnees (LACUNE #26).

**Criteres d'acceptation :**
- L'option est accessible depuis Profil > Parametres > Mes donnees > Exporter mes donnees
- Le consommateur peut demander un export de toutes ses donnees personnelles
- L'export inclut : informations de profil (prenom, nom, email, telephone), preferences alimentaires, historique de reservations, avis laisses, reclamations, favoris, parametres de notification
- L'export est genere au format JSON ou PDF (au choix du consommateur)
- La generation de l'export peut prendre du temps ; le consommateur recoit une notification push et un email avec un lien de telechargement lorsque l'export est pret
- Le lien de telechargement expire apres 48 heures
- Maximum 1 demande d'export par semaine pour eviter les abus
- L'action est tracee dans le journal d'activite (audit log)

---

## Mockup -- Connexion Consommateur (consumer-login)

### Connexion -- Defaut
```
┌─────────────────────────────────┐
│           🌿 BienBon            │
│                                 │
│    Se connecter                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Email ou telephone        │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ Mot de passe         [👁] │  │
│  └───────────────────────────┘  │
│                                 │
│  Mot de passe oublie ?          │
│                                 │
│  ┌───────────────────────────┐  │
│  │       SE CONNECTER        │  │
│  └───────────────────────────┘  │
│                                 │
│  ─────────── ou ──────────────  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Connexion par SMS (OTP)  │  │
│  └───────────────────────────┘  │
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
│  Pas encore de compte ?         │
│  S'inscrire                     │
└─────────────────────────────────┘
```

### Mot de passe oublie
```
┌─────────────────────────────────┐
│  < Retour                       │
│                                 │
│           🌿 BienBon            │
│                                 │
│    Mot de passe oublie          │
│                                 │
│  Entrez votre adresse email     │
│  pour recevoir un lien de       │
│  reinitialisation.              │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Adresse email             │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │    ENVOYER LE LIEN        │  │
│  └───────────────────────────┘  │
│                                 │
│  Note : Cette fonctionnalite   │
│  est disponible uniquement pour │
│  les comptes crees par email.   │
└─────────────────────────────────┘
```

### Deconnexion -- Confirmation
```
┌─────────────────────────────────┐
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │   Deconnexion             │  │
│  │                           │  │
│  │   Etes-vous sur de        │  │
│  │   vouloir vous            │  │
│  │   deconnecter ?           │  │
│  │                           │  │
│  │   Vos donnees en cache    │  │
│  │   (QR codes) seront       │  │
│  │   conservees.             │  │
│  │                           │  │
│  │  ┌─────────────────────┐  │  │
│  │  │   SE DECONNECTER    │  │  │
│  │  └─────────────────────┘  │  │
│  │                           │  │
│  │  ┌─────────────────────┐  │  │
│  │  │     ANNULER         │  │  │
│  │  └─────────────────────┘  │  │
│  │                           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Suppression de compte
```
┌─────────────────────────────────┐
│  < Retour     Parametres        │
│                                 │
│    Supprimer mon compte         │
│                                 │
│  ┌─────────────────────────────┐│
│  │ ⚠ ATTENTION                 ││
│  │                             ││
│  │ Cette action est            ││
│  │ irreversible. Toutes vos   ││
│  │ donnees seront supprimees  ││
│  │ sous 30 jours.             ││
│  │                             ││
│  │ - Informations personnelles ││
│  │ - Favoris et preferences   ││
│  │ - Historique de commandes  ││
│  │   (anonymise)               ││
│  │ - Avis (anonymises)         ││
│  │ - Comptes lies dissocies   ││
│  └─────────────────────────────┘│
│                                 │
│  Pour confirmer, saisissez      │
│  SUPPRIMER :                    │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │  SUPPRIMER MON COMPTE     │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │     ANNULER               │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Export donnees personnelles
```
┌─────────────────────────────────┐
│  < Retour      Mes donnees      │
│                                 │
│    Exporter mes donnees         │
│                                 │
│  Conformement a la legislation  │
│  sur la protection des donnees, │
│  vous pouvez exporter toutes    │
│  vos donnees personnelles.      │
│                                 │
│  Donnees incluses :             │
│  ✓ Profil (prenom, nom, email) │
│  ✓ Preferences alimentaires    │
│  ✓ Historique de reservations  │
│  ✓ Avis laisses               │
│  ✓ Reclamations               │
│  ✓ Favoris                    │
│  ✓ Parametres de notification  │
│                                 │
│  Format :                       │
│  ┌──────────┐ ┌──────────┐     │
│  │(●) JSON  │ │( ) PDF   │     │
│  └──────────┘ └──────────┘     │
│                                 │
│  ┌───────────────────────────┐  │
│  │   DEMANDER L'EXPORT      │  │
│  └───────────────────────────┘  │
│                                 │
│  Vous recevrez un email avec    │
│  un lien de telechargement      │
│  (valide 48h).                  │
│                                 │
│  Limite : 1 export par semaine  │
└─────────────────────────────────┘
```

---

## Assets requis

- `../../assets/logos/logo-principal.png`
- `../../assets/logos/logo-avec-texte.png`
