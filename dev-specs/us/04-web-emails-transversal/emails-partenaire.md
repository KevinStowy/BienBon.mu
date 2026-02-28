# Emails partenaire

> US couvertes : US-E008, US-E009, US-E010

---

### US-E008 — Email de confirmation de remboursement
**En tant que** consommateur, **je veux** recevoir un email confirmant que mon remboursement a été effectué **afin de** savoir que le montant sera recrédité sur mon moyen de paiement.

**Critères d'acceptation :**
- **Expéditeur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "Remboursement confirmé - [Montant] Rs"
- **Timing d'envoi :** Immédiatement après le déclenchement effectif du remboursement par le système de paiement
- **Contenu résumé :**
  - Salutation personnalisée
  - Confirmation du remboursement
  - Détails :
    - Montant remboursé (en roupies mauriciennes)
    - Motif du remboursement (annulation par le partenaire / annulation par le consommateur / décision suite à une réclamation)
    - Moyen de paiement concerné (4 derniers chiffres de la carte ou nom du wallet mobile)
    - Date du remboursement
    - Référence de la réservation d'origine
  - Délai de traitement : "Le remboursement apparaîtra sur votre relevé sous 5 à 10 jours ouvrés selon votre établissement bancaire."
  - Coordonnées de contact en cas de problème
- **Type :** Transactionnel (non désabonnable)

---

### US-E009 — Email de résolution de réclamation
**En tant que** consommateur, **je veux** recevoir un email m'informant de la résolution de ma réclamation **afin de** connaître la décision prise et les éventuelles actions qui en découlent.

**Critères d'acceptation :**
- **Expéditeur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "Votre réclamation a été traitée - [Référence réclamation]"
- **Timing d'envoi :** Immédiatement après la résolution de la réclamation par l'admin
- **Contenu résumé :**
  - Salutation personnalisée
  - Référence de la réclamation et rappel du contexte (panier concerné, partenaire, date)
  - Décision prise par l'équipe BienBon :
    - Si remboursement total : "Nous avons décidé de vous rembourser intégralement. Le montant de [X] Rs sera recrédité sur votre [moyen de paiement]."
    - Si remboursement partiel : "Nous avons décidé de vous accorder un remboursement partiel de [X] Rs sur [montant total]."
    - Si rejet : "Après examen, nous n'avons pas pu donner suite à votre réclamation."
  - Motif/commentaire de l'admin expliquant la décision
  - Coordonnées de contact si le consommateur souhaite poursuivre la discussion
- **Type :** Transactionnel (non désabonnable)
- Le ton est professionnel et respectueux quelle que soit la décision

---

### US-E010 — Email de facture mensuelle partenaire (PDF joint)
**En tant que** partenaire, **je veux** recevoir un email mensuel avec ma facture récapitulative en pièce jointe **afin de** avoir le détail des commissions et de l'intégrer à ma comptabilité.

**Critères d'acceptation :**
- **Expéditeur :** BienBon Facturation `<facturation@bienbon.mu>` (ou `noreply@bienbon.mu`)
- **Objet type :** "BienBon - Votre facture de [Mois Année] - [Nom du commerce]"
- **Timing d'envoi :** Le 1er jour ouvrable du mois suivant la période facturée (ex: facture de janvier envoyée le 1er février)
- **Contenu résumé :**
  - Salutation personnalisée
  - Résumé du mois :
    - Nombre total de paniers vendus
    - Chiffre d'affaires brut généré
    - Montant total des commissions BienBon
    - Montant net réversable
  - Mention : "Veuillez trouver ci-joint votre facture détaillée au format PDF."
  - Rappel des modalités de paiement de la commission (virement, prélèvement, etc.)
  - CTA : "Consulter le détail dans mon espace" (lien vers le tableau de bord partenaire)
  - Coordonnées du service facturation pour toute question
- **Pièce jointe :** Facture au format PDF
  - La facture PDF contient : en-tête BienBon, informations légales de BienBon et du partenaire, numéro de facture unique, période facturée, détail de chaque transaction (date, description du panier, montant de la vente, taux de commission appliqué, montant de la commission), total des commissions, mention du fee minimum par transaction si applicable, conditions de paiement, mentions légales mauriciennes obligatoires
- **Type :** Transactionnel (non désabonnable)
- L'email n'est pas envoyé si aucune transaction n'a eu lieu durant le mois (ou un email d'information "aucune activité ce mois-ci" est envoyé, à définir)

---

## Mockups

### email-partner

```
┌──────────────────────────────────────────────────┐
│  Objet: Remboursement confirmé - 150 Rs          │
│  De: BienBon <noreply@bienbon.mu>                │
│  À: marie.dupont@email.com                       │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌──────────────┐                    │
│              │  🍀 BienBon  │                    │
│              └──────────────┘                    │
│                                                  │
│  Bonjour Marie,                                  │
│                                                  │
│  Votre remboursement a bien été effectué.        │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ DÉTAILS DU REMBOURSEMENT               │    │
│  ├──────────────────────────────────────────┤    │
│  │ Montant      : 150 Rs                   │    │
│  │ Motif        : Annulation par le         │    │
│  │                partenaire                │    │
│  │ Moyen        : Carte Visa ****1234      │    │
│  │ Date         : 10 février 2026          │    │
│  │ Réf. réserv. : RES-2026-00142          │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Le remboursement apparaîtra sur votre           │
│  relevé sous 5 à 10 jours ouvrés selon           │
│  votre établissement bancaire.                   │
│                                                  │
│  Un problème ? contact@bienbon.mu                │
│  L'équipe BienBon                                │
│                                                  │
├──────────────────────────────────────────────────┤
│  🍀 BienBon | bienbon.mu                         │
│  Email transactionnel - Non désabonnable         │
└──────────────────────────────────────────────────┘
```

---

## Assets requis

| Asset | Chemin |
|-------|--------|
| logo-principal.png | `../../assets/logos/logo-principal.png` |
| logo-avec-texte.png | `../../assets/logos/logo-avec-texte.png` |

