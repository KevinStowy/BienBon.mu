# Emails -- Authentification et Inscription

## User Stories couvertes

- US-E001 -- Email de bienvenue consommateur
- US-E002 -- Email de confirmation d'inscription partenaire (demande en cours)
- US-E003 -- Email de validation partenaire par admin

---

## US-E001 -- Email de bienvenue consommateur

**Titre :** Email de bienvenue consommateur

**En tant que** nouveau consommateur, **je veux** recevoir un email de bienvenue apres mon inscription **afin de** confirmer que mon compte est actif et decouvrir comment utiliser BienBon.

**Criteres d'acceptation :**
- **Expediteur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "Bienvenue sur BienBon, [Prenom] ! Pret a sauver des repas ?"
- **Timing d'envoi :** Immediatement apres la creation du compte (inscription par email, telephone, Google, Facebook ou Apple)
- **Contenu resume :**
  - Salutation personnalisee avec le prenom du consommateur
  - Message de bienvenue chaleureux
  - Rappel du concept BienBon en 2-3 phrases
  - Explication rapide des 3 etapes : Chercher, Reserver, Retirer
  - CTA principal : "Decouvrir les paniers pres de chez moi" (lien vers la webapp)
  - Mention de l'equipe BienBon
- **Type :** Transactionnel (non desabonnable)
- L'email est envoye une seule fois par consommateur
- L'email est envoye dans la langue choisie par le consommateur lors de l'inscription (defaut : FR)

---

## US-E002 -- Email de confirmation d'inscription partenaire (demande en cours)

**Titre :** Email de confirmation d'inscription partenaire

**En tant que** partenaire, **je veux** recevoir un email confirmant la reception de ma demande d'inscription **afin de** savoir que mon dossier est bien pris en compte et en attente de validation.

**Criteres d'acceptation :**
- **Expediteur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "BienBon - Votre demande d'inscription a bien ete recue"
- **Timing d'envoi :** Immediatement apres la soumission du formulaire d'inscription partenaire
- **Contenu resume :**
  - Salutation personnalisee avec le prenom du responsable
  - Confirmation de la reception de la demande pour le commerce [Nom du commerce]
  - Rappel que la demande sera examinee par l'equipe BienBon
  - Indication du delai moyen de traitement (ex: "sous 48 heures ouvrees")
  - Recapitulatif des informations soumises (nom du commerce, type, adresse)
  - Indication que le partenaire sera notifie par email de la decision (validation ou rejet)
  - Coordonnees de contact en cas de question
- **Type :** Transactionnel (non desabonnable)

---

## US-E003 -- Email de validation partenaire par admin

**Titre :** Email de validation partenaire par admin

**En tant que** partenaire, **je veux** recevoir un email m'informant que mon inscription a ete validee **afin de** savoir que je peux commencer a utiliser la plateforme.

**Criteres d'acceptation :**
- **Expediteur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "Felicitations ! Votre commerce [Nom du commerce] est desormais sur BienBon"
- **Timing d'envoi :** Immediatement apres la validation par l'admin
- **Contenu resume :**
  - Salutation personnalisee
  - Annonce enthousiaste de la validation
  - Instructions pour se connecter a son espace partenaire (lien direct)
  - Guide rapide des prochaines etapes : (1) Se connecter, (2) Completer le profil du commerce, (3) Creer son premier panier surprise
  - CTA principal : "Acceder a mon espace partenaire" (lien vers la webapp partenaire)
  - Proposition d'accompagnement par l'equipe BienBon si besoin
  - Coordonnees de contact du support partenaire
- **Type :** Transactionnel (non desabonnable)

---

## Mockups

### Bienvenue Consommateur (US-E001)

```
┌──────────────────────────────────────────────────┐
│  Objet: Bienvenue sur BienBon, Marie !           │
│         Prete a sauver des repas ?               │
│  De: BienBon <noreply@bienbon.mu>                │
│  A: marie.dupont@email.com                       │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌──────────────┐                    │
│              │  BienBon     │                    │
│              └──────────────┘                    │
│                                                  │
│  Bonjour Marie,                                  │
│                                                  │
│  Bienvenue sur BienBon ! Nous sommes ravis       │
│  de vous compter parmi notre communaute          │
│  anti-gaspi a l'ile Maurice.                     │
│                                                  │
│  Avec BienBon, sauvez des repas delicieux        │
│  a prix reduit tout en luttant contre le         │
│  gaspillage alimentaire.                         │
│                                                  │
│  C'est simple en 3 etapes :                      │
│                                                  │
│  1. Cherchez les paniers pres de chez vous       │
│  2. Reservez et payez en ligne                   │
│  3. Retirez votre panier au creneau indique      │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Decouvrir les paniers pres de chez moi  │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  A bientot sur BienBon !                         │
│  L'equipe BienBon                                │
│                                                  │
├──────────────────────────────────────────────────┤
│  BienBon                                         │
│  bienbon.mu                                      │
│  Port-Louis, Ile Maurice                         │
│  CGU | Politique de Confidentialite              │
│  Cet email est transactionnel et ne peut         │
│  pas etre desabonne.                             │
└──────────────────────────────────────────────────┘
```

### Confirmation Inscription Partenaire (US-E002)

```
┌──────────────────────────────────────────────────┐
│  Objet: BienBon - Votre demande d'inscription    │
│         a bien ete recue                         │
│  De: BienBon <noreply@bienbon.mu>                │
│  A: chef.ravi@boulangerie.mu                     │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌──────────────┐                    │
│              │  BienBon     │                    │
│              └──────────────┘                    │
│                                                  │
│  Bonjour Ravi,                                   │
│                                                  │
│  Nous avons bien recu votre demande              │
│  d'inscription pour le commerce                  │
│  "Boulangerie du Port".                          │
│                                                  │
│  Notre equipe va examiner votre dossier          │
│  dans les plus brefs delais. Vous recevrez       │
│  une reponse sous 48 heures ouvrees.             │
│                                                  │
│  Recapitulatif de votre demande :                │
│  ┌──────────────────────────────────────────┐    │
│  │ Commerce : Boulangerie du Port           │    │
│  │ Type     : Boulangerie                   │    │
│  │ Adresse  : 12 Royal Road, Port-Louis     │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Vous serez notifie(e) par email de notre        │
│  decision (validation ou demande                 │
│  d'ajustement).                                  │
│                                                  │
│  Une question ? Contactez-nous :                 │
│  partenaires@bienbon.mu                          │
│                                                  │
│  L'equipe BienBon                                │
│                                                  │
├──────────────────────────────────────────────────┤
│  BienBon | bienbon.mu                            │
│  CGU | Confidentialite                           │
│  Email transactionnel - Non desabonnable         │
└──────────────────────────────────────────────────┘
```

### Validation Partenaire par Admin (US-E003)

```
┌──────────────────────────────────────────────────┐
│  Objet: Felicitations ! Votre commerce           │
│         Boulangerie du Port est desormais        │
│         sur BienBon                              │
│  De: BienBon <noreply@bienbon.mu>                │
│  A: chef.ravi@boulangerie.mu                     │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌──────────────┐                    │
│              │  BienBon     │                    │
│              └──────────────┘                    │
│                                                  │
│  Bonjour Ravi,                                   │
│                                                  │
│  Excellente nouvelle ! Votre inscription         │
│  a ete validee. Votre commerce                   │
│  "Boulangerie du Port" fait desormais            │
│  partie de la communaute BienBon !               │
│                                                  │
│  Prochaines etapes :                             │
│                                                  │
│  1. Connectez-vous a votre espace partenaire     │
│  2. Completez le profil de votre commerce        │
│  3. Creez votre premier panier surprise !        │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Acceder a mon espace partenaire  >>>    │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Besoin d'aide pour demarrer ? Notre equipe      │
│  est la pour vous accompagner :                  │
│  partenaires@bienbon.mu | +230 5XXX XXXX         │
│                                                  │
│  Bienvenue a bord !                              │
│  L'equipe BienBon                                │
│                                                  │
├──────────────────────────────────────────────────┤
│  BienBon | bienbon.mu                            │
│  CGU | Confidentialite                           │
│  Email transactionnel - Non desabonnable         │
└──────────────────────────────────────────────────┘
```

---

## Assets requis

| Asset | Chemin | Utilisation |
|-------|--------|-------------|
| Logo principal | `../../assets/logos/logo-principal.png` | En-tete de tous les emails |
| Logo avec texte | `../../assets/logos/logo-avec-texte.png` | Footer des emails |
