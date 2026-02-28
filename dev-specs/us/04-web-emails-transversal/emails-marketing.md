# Emails marketing

> US couvertes : US-E011, US-E012

---

### US-E011 — Email de réinitialisation de mot de passe
**En tant qu'** utilisateur (consommateur ou partenaire), **je veux** recevoir un email avec un lien sécurisé de réinitialisation de mot de passe **afin de** récupérer l'accès à mon compte.

**Critères d'acceptation :**
- **Expéditeur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "Réinitialisation de votre mot de passe BienBon"
- **Timing d'envoi :** Immédiatement après la demande de réinitialisation depuis l'écran de connexion
- **Contenu résumé :**
  - Salutation personnalisée (si le prénom est connu)
  - Information : "Vous avez demandé la réinitialisation de votre mot de passe."
  - CTA principal : "Réinitialiser mon mot de passe" (lien sécurisé à usage unique)
  - Mention : "Ce lien est valable pendant 1 heure. Passé ce délai, vous devrez effectuer une nouvelle demande."
  - Mention de sécurité : "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe actuel ne sera pas modifié."
  - Coordonnées de contact en cas de problème
- **Type :** Transactionnel (non désabonnable)
- Le lien contient un token unique, aléatoire, à usage unique
- Le lien expire après 1 heure
- Le lien est invalide après utilisation (une seule réinitialisation possible par lien)
- L'email est envoyé même si l'adresse email n'existe pas dans la base (pour éviter l'énumération de comptes), mais dans ce cas aucun email n'est réellement envoyé (échec silencieux)

---

### US-E012 — Email de validation modification commerce
**En tant que** partenaire, **je veux** recevoir un email m'informant que ma demande de modification de fiche commerce a été validée **afin de** savoir que les nouvelles informations sont publiées.

**Critères d'acceptation :**
- **Expéditeur :** BienBon `<noreply@bienbon.mu>`
- **Objet type :** "Modification validée - [Nom du commerce]"
- **Timing d'envoi :** Immédiatement après la validation de la modification par l'admin
- **Contenu résumé :**
  - Salutation personnalisée
  - Confirmation que la modification demandée pour le commerce [Nom du commerce] a été validée
  - Résumé des champs modifiés (ex: "Adresse mise à jour", "Description mise à jour", "Photos mises à jour")
  - Mention : "Les nouvelles informations sont désormais visibles par les consommateurs."
  - CTA : "Voir ma fiche commerce" (lien vers la fiche publique)
- **Type :** Transactionnel (non désabonnable)

---

## Mockups

### email-marketing

```
┌──────────────────────────────────────────────────┐
│  Objet: Marie vous invite à découvrir BienBon !  │
│  De: BienBon <noreply@bienbon.mu>                │
│  À: ami@email.com                                │
├──────────────────────────────────────────────────┤
│                                                  │
│              ┌──────────────┐                    │
│              │  🍀 BienBon  │                    │
│              └──────────────┘                    │
│                                                  │
│  Marie pense que BienBon pourrait                │
│  vous plaire !                                   │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │                                          │    │
│  │  BienBon, c'est la première plateforme   │    │
│  │  anti-gaspillage alimentaire à l'île     │    │
│  │  Maurice.                                │    │
│  │                                          │    │
│  │  Sauvez des repas délicieux à prix       │    │
│  │  réduit près de chez vous, tout en       │    │
│  │  luttant contre le gaspillage.           │    │
│  │                                          │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Inscrivez-vous et bénéficiez de                 │
│  50 Rs de réduction sur votre première           │
│  commande !                                      │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  Rejoindre BienBon  >>>                  │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  (le lien contient votre code de parrainage      │
│   unique)                                        │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ Cette invitation vous a été envoyée par   │    │
│  │ Marie via BienBon. Si vous ne souhaitez   │    │
│  │ pas recevoir ce type de message, aucune   │    │
│  │ autre invitation ne vous sera envoyée.    │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
├──────────────────────────────────────────────────┤
│  🍀 BienBon | bienbon.mu                         │
│  CGU | Confidentialité                           │
└──────────────────────────────────────────────────┘
```

---

## Assets requis

| Asset | Chemin |
|-------|--------|
| logo-principal.png | `../../assets/logos/logo-principal.png` |
| logo-avec-texte.png | `../../assets/logos/logo-avec-texte.png` |

