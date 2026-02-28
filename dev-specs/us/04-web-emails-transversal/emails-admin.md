# Emails admin

> US couvertes : US-E013, US-E014

---

### US-E013 — Email de rejet modification commerce
**En tant que** partenaire, **je veux** recevoir un email m'informant que ma demande de modification de fiche commerce a été rejetée avec le motif **afin de** comprendre pourquoi et pouvoir resoumettre une modification conforme.

**Critères d'acceptation :**
- **Expéditeur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "Modification non validée - [Nom du commerce]"
- **Timing d'envoi :** Immédiatement après le rejet de la modification par l'admin
- **Contenu résumé :**
  - Salutation personnalisée
  - Information que la modification demandée pour le commerce [Nom du commerce] n'a pas été validée
  - Motif détaillé du rejet (texte saisi par l'admin)
  - Rappel des informations actuellement publiées
  - Mention : "Vous pouvez soumettre une nouvelle demande de modification depuis votre espace partenaire."
  - CTA : "Modifier ma fiche" (lien vers l'espace partenaire)
  - Coordonnées de contact
- **Type :** Transactionnel (non désabonnable)

---

### US-E014 — Email de suspension de compte
**En tant qu'** utilisateur (consommateur ou partenaire), **je veux** recevoir un email m'informant que mon compte a été suspendu **afin de** comprendre la situation et connaître les recours possibles.

**Critères d'acceptation :**
- **Expéditeur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "Votre compte BienBon a été suspendu"
- **Timing d'envoi :** Immédiatement après la suspension du compte par l'admin
- **Contenu résumé :**
  - Salutation personnalisée
  - Information que le compte a été suspendu temporairement
  - Motif de la suspension (texte saisi par l'admin)
  - Conséquences de la suspension :
    - Pour un consommateur : "Vous ne pouvez plus accéder à l'application ni effectuer de réservations."
    - Pour un partenaire : "Vos paniers ne sont plus visibles. Vous ne pouvez plus accéder à votre espace partenaire."
  - Si des réservations étaient en cours : "Vos réservations en cours ont été annulées et les remboursements seront effectués automatiquement."
  - Recours : "Si vous pensez qu'il s'agit d'une erreur ou souhaitez contester cette décision, contactez-nous à [adresse de contact]."
  - Coordonnées de contact
- **Type :** Transactionnel (non désabonnable)

---

## Mockups

### email-admin

```
┌──────────────────────────────────────────────────┐
│  Objet: Modification non validée -               │
│         Boulangerie du Port                      │
│  De: BienBon <noreply@bienbon.mu>                │
│  À: chef.ravi@boulangerie.mu                     │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌──────────────┐                    │
│              │  🍀 BienBon  │                    │
│              └──────────────┘                    │
│                                                  │
│  Bonjour Ravi,                                   │
│                                                  │
│  La modification demandée pour votre             │
│  commerce "Boulangerie du Port" n'a pas          │
│  pu être validée.                                │
│                                                  │
│  Motif :                                         │
│  ┌──────────────────────────────────────────┐    │
│  │ La nouvelle description contient des      │    │
│  │ informations promotionnelles non          │    │
│  │ conformes à notre charte. Merci de        │    │
│  │ décrire uniquement votre commerce         │    │
│  │ et vos produits.                          │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Informations actuellement publiées :            │
│  "Boulangerie artisanale depuis 1995,            │
│  spécialités mauriciennes et françaises."        │
│                                                  │
│  Vous pouvez soumettre une nouvelle              │
│  modification depuis votre espace partenaire.    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Modifier ma fiche  >>>                  │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Une question ? partenaires@bienbon.mu           │
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

