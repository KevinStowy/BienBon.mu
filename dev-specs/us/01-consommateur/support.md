# Support & Aide

> US couvertes : US-C061

---

### US-C061 — Contacter le support depuis l'app
**En tant que** consommateur, **je veux** contacter le support BienBon directement depuis l'application **afin de** poser une question ou signaler un problème qui ne relève pas d'une réclamation sur un panier spécifique (LACUNE #18).

**Critères d'acceptation :**
- Accessible depuis Profil > Aide & Support > Contacter le support
- Le formulaire de contact contient :
  - Un objet/sujet à sélectionner dans une liste : "Question générale", "Problème technique", "Problème de paiement", "Problème de compte", "Suggestion", "Autre"
  - Un champ de description texte (obligatoire, minimum 20 caractères)
  - Possibilité d'ajouter des captures d'écran (jusqu'à 3 photos)
- Le formulaire est pré-rempli avec l'email (si renseigné) et le nom du consommateur
- Après soumission, un message de confirmation est affiché : "Votre demande a bien été envoyée. Notre équipe vous répondra sous 48h."
- Un numéro de ticket est affiché pour référence
- Si l'utilisateur n'a pas d'email renseigné, le suivi du ticket se fait exclusivement via les notifications in-app et le centre de notifications. L'utilisateur reçoit les réponses du support dans l'app (section "Mes tickets"). Un numéro de ticket est affiché pour référence. Si l'utilisateur a un email, les réponses sont aussi envoyées par email.
- Le support est également accessible via un email de contact (support@bienbon.mu) et/ou un lien vers la FAQ
- Un lien vers la FAQ est proposé avant l'envoi du formulaire : "Avez-vous consulté notre FAQ ? Vous y trouverez peut-être la réponse à votre question."

---

## 1.13 Centre de notifications in-app

---

---

## Mockups

### consumer-support

```
┌─────────────────────────────────┐
│  < Retour     Aide & Support    │
│                                 │
│  ┌───────────────────────────┐  │
│  │ ❓ FAQ                   > │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 📧 Contacter le support  > │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🔄 Revoir l'introduction > │  │
│  └───────────────────────────┘  │
│                                 │
│  Vous pouvez aussi nous         │
│  contacter par email :          │
│  support@bienbon.mu             │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```

