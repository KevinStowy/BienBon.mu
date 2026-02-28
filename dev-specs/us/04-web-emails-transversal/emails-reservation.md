# Emails -- Reservation et Retrait

## User Stories couvertes

- US-E004 -- Email de rejet partenaire par admin
- US-E005 -- Email de confirmation de reservation (avec QR code/PIN)
- US-E006 -- Email de rappel avant creneau de retrait
- US-E007 -- Email d'annulation par le partenaire

---

## US-E004 -- Email de rejet partenaire par admin

**Titre :** Email de rejet partenaire par admin

**En tant que** partenaire, **je veux** recevoir un email m'informant que mon inscription a ete rejetee avec le motif **afin de** comprendre la raison et pouvoir eventuellement resoumettre ma demande.

**Criteres d'acceptation :**
- **Expediteur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "BienBon - Votre demande d'inscription necessite des ajustements"
- **Timing d'envoi :** Immediatement apres le rejet par l'admin
- **Contenu resume :**
  - Salutation personnalisee
  - Information que la demande pour le commerce [Nom du commerce] n'a pas pu etre validee en l'etat
  - Motif detaille du rejet (texte saisi par l'admin)
  - Indication claire que le partenaire peut resoumettre une demande corrigee
  - CTA : "Resoumettre ma demande" (lien vers le formulaire d'inscription pre-rempli si techniquement possible)
  - Coordonnees de contact pour toute question
- **Type :** Transactionnel (non desabonnable)
- Le ton de l'email est bienveillant et constructif (pas de jugement)

---

## US-E005 -- Email de confirmation de reservation (avec QR code/PIN)

**Titre :** Email de confirmation de reservation

**En tant que** consommateur, **je veux** recevoir un email de confirmation apres chaque reservation **afin d'** avoir un recapitulatif complet et les informations necessaires pour le retrait.

**Criteres d'acceptation :**
- **Expediteur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "Reservation confirmee ! Votre panier chez [Nom du partenaire]"
- **Timing d'envoi :** Immediatement apres la validation de la reservation (paiement/pre-autorisation accepte)
- **Contenu resume :**
  - Salutation personnalisee
  - Recapitulatif de la reservation :
    - Nom du partenaire
    - Type/description du panier
    - Quantite reservee
    - Prix paye (ou montant pre-autorise)
    - Date et creneau de retrait (heure de debut - heure de fin, en MUT UTC+4)
    - Adresse complete du commerce avec lien vers Google Maps/Waze
  - QR code de retrait integre directement dans l'email (image)
  - Code PIN de retrait affiche en clair sous le QR code
  - Rappel : "Presentez ce QR code ou communiquez votre code PIN au commercant lors du retrait"
  - Information sur l'annulation : "Vous pouvez annuler gratuitement avant le debut du creneau de retrait depuis l'application"
  - CTA : "Voir ma reservation dans l'app" (lien vers la webapp)
- **Type :** Transactionnel (non desabonnable)
- Le QR code est genere au format image (PNG) et integre en inline dans l'email

---

## US-E006 -- Email de rappel avant creneau de retrait

**Titre :** Email de rappel avant creneau de retrait

**En tant que** consommateur, **je veux** recevoir un email de rappel avant le debut de mon creneau de retrait **afin de** ne pas oublier d'aller chercher mon panier.

**Criteres d'acceptation :**
- **Expediteur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "Rappel : votre panier vous attend chez [Nom du partenaire] dans 1h"
- **Timing d'envoi :** 1 heure avant le debut du creneau de retrait. Si la reservation est effectuee moins d'1 heure avant le creneau, l'email de rappel n'est pas envoye (l'email de confirmation suffit)
- **Contenu resume :**
  - Salutation personnalisee
  - Rappel du creneau de retrait (heure de debut - heure de fin, en MUT UTC+4)
  - Nom et adresse du partenaire avec lien vers Google Maps/Waze
  - QR code et code PIN de retrait (reprise de l'email de confirmation)
  - Rappel : "N'oubliez pas ! Si vous ne pouvez plus venir, annulez depuis l'app avant le debut du creneau."
  - CTA : "Voir l'itineraire" (lien vers Google Maps/Waze)
- **Type :** Transactionnel (non desabonnable)

---

## US-E007 -- Email d'annulation par le partenaire

**Titre :** Email d'annulation par le partenaire

**En tant que** consommateur, **je veux** recevoir un email m'informant que le partenaire a annule mon panier reserve **afin de** savoir que je serai rembourse et que je n'ai plus besoin de me deplacer.

**Criteres d'acceptation :**
- **Expediteur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "Annulation de votre panier chez [Nom du partenaire]"
- **Timing d'envoi :** Immediatement apres l'annulation par le partenaire
- **Contenu resume :**
  - Salutation personnalisee
  - Information que le partenaire [Nom du partenaire] a du annuler le panier reserve
  - Raison : "En raison d'un imprevu, le commercant a du annuler votre panier. Nous nous en excusons."
  - Information sur le remboursement automatique :
    - Montant rembourse
    - Moyen de paiement sur lequel le remboursement sera effectue
    - Delai estime de remboursement (ex: "sous 5 a 10 jours ouvres selon votre banque")
  - CTA : "Decouvrir d'autres paniers" (lien vers la webapp pour reserver un autre panier)
  - Coordonnees de contact en cas de question
- **Type :** Transactionnel (non desabonnable)
- Le ton est empathique et apologetique

---

## Mockups

### Rejet Partenaire (US-E004)

```
┌──────────────────────────────────────────────────┐
│  Objet: BienBon - Votre demande d'inscription    │
│         necessite des ajustements                │
│  De: BienBon <noreply@bienbon.mu>                │
│  A: contact@restaurant-abc.mu                    │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌──────────────┐                    │
│              │  BienBon     │                    │
│              └──────────────┘                    │
│                                                  │
│  Bonjour Jean,                                   │
│                                                  │
│  Nous avons examine votre demande                │
│  d'inscription pour le commerce                  │
│  "Restaurant ABC".                               │
│                                                  │
│  Malheureusement, nous n'avons pas pu            │
│  valider votre dossier en l'etat.                │
│                                                  │
│  Motif :                                         │
│  ┌──────────────────────────────────────────┐    │
│  │ Les photos fournies ne sont pas           │    │
│  │ suffisamment claires. Merci de            │    │
│  │ fournir des photos de meilleure           │    │
│  │ qualite montrant votre commerce et        │    │
│  │ vos produits.                             │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Bonne nouvelle : vous pouvez resoumettre        │
│  une demande corrigee a tout moment !            │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Resoumettre ma demande  >>>             │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Une question ? partenaires@bienbon.mu           │
│  L'equipe BienBon                                │
│                                                  │
├──────────────────────────────────────────────────┤
│  BienBon | bienbon.mu                            │
│  CGU | Confidentialite                           │
│  Email transactionnel - Non desabonnable         │
└──────────────────────────────────────────────────┘
```

### Confirmation Reservation + QR (US-E005)

```
┌──────────────────────────────────────────────────┐
│  Objet: Reservation confirmee ! Votre panier     │
│         chez Boulangerie du Port                 │
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
│  Votre reservation est confirmee !               │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ RECAPITULATIF                            │    │
│  ├──────────────────────────────────────────┤    │
│  │ Partenaire : Boulangerie du Port         │    │
│  │ Panier     : Panier Surprise Patisserie  │    │
│  │ Quantite   : 1                           │    │
│  │ Prix paye  : 150 Rs                      │    │
│  │ Date       : Mardi 10 fevrier 2026       │    │
│  │ Creneau    : 17h00 - 18h00 (heure MUT)   │    │
│  │ Adresse    : 12 Royal Road, Port-Louis   │    │
│  │              [Voir sur Google Maps]       │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  VOTRE CODE DE RETRAIT :                         │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │         ┌──────────────────┐             │    │
│  │         │   [QR CODE]     │             │    │
│  │         └──────────────────┘             │    │
│  │                                          │    │
│  │         Code PIN : 4 8 7 2              │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Presentez ce QR code ou communiquez votre       │
│  code PIN au commercant lors du retrait.         │
│                                                  │
│  Annulation : Vous pouvez annuler                │
│  gratuitement avant le debut du creneau          │
│  de retrait depuis l'application.                │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Voir ma reservation dans l'app  >>>     │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  L'equipe BienBon                                │
│                                                  │
├──────────────────────────────────────────────────┤
│  BienBon | bienbon.mu                            │
│  CGU | Confidentialite                           │
│  Email transactionnel - Non desabonnable         │
└──────────────────────────────────────────────────┘
```

### Rappel Retrait (US-E006)

```
┌──────────────────────────────────────────────────┐
│  Objet: Rappel : votre panier vous attend chez   │
│         Boulangerie du Port dans 1h              │
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
│  N'oubliez pas ! Votre panier vous attend        │
│  dans 1 heure.                                   │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ Creneau : 17h00 - 18h00 (heure MUT)      │    │
│  │ Lieu    : Boulangerie du Port             │    │
│  │ Adresse : 12 Royal Road, Port-Louis       │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────┐                            │
│  │  [QR CODE]       │  Code PIN : 4 8 7 2       │
│  └──────────────────┘                            │
│                                                  │
│  Si vous ne pouvez plus venir, annulez           │
│  depuis l'app avant le debut du creneau.         │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Voir l'itineraire  >>>                  │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  L'equipe BienBon                                │
│                                                  │
├──────────────────────────────────────────────────┤
│  BienBon | bienbon.mu                            │
│  Email transactionnel - Non desabonnable         │
└──────────────────────────────────────────────────┘
```

### Annulation par Partenaire (US-E007)

```
┌──────────────────────────────────────────────────┐
│  Objet: Annulation de votre panier chez          │
│         Boulangerie du Port                      │
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
│  Nous sommes desoles de vous informer que        │
│  le partenaire Boulangerie du Port a du          │
│  annuler votre panier reserve.                   │
│                                                  │
│  En raison d'un imprevu, le commercant           │
│  a du annuler votre panier. Nous nous en         │
│  excusons sincerement.                           │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ REMBOURSEMENT AUTOMATIQUE               │    │
│  ├──────────────────────────────────────────┤    │
│  │ Montant   : 150 Rs                      │    │
│  │ Moyen     : Carte Visa ****1234         │    │
│  │ Delai     : 5 a 10 jours ouvres         │    │
│  │             selon votre banque           │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Decouvrir d'autres paniers  >>>         │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Une question ? contact@bienbon.mu               │
│  L'equipe BienBon                                │
│                                                  │
├──────────────────────────────────────────────────┤
│  BienBon | bienbon.mu                            │
│  Email transactionnel - Non desabonnable         │
└──────────────────────────────────────────────────┘
```

---

## Assets requis

| Asset | Chemin | Utilisation |
|-------|--------|-------------|
| Logo principal | `../../assets/logos/logo-principal.png` | En-tete de tous les emails |
| Logo avec texte | `../../assets/logos/logo-avec-texte.png` | Footer des emails |
