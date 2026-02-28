# Profil & Compte

> US couvertes : US-C054, US-C055, US-C056, US-C057

---

### US-C054 — Voir et modifier mon profil
**En tant que** consommateur, **je veux** consulter et modifier mes informations personnelles **afin de** garder mon profil à jour.

**Critères d'acceptation :**
- Accessible depuis le menu principal (onglet "Profil" ou icône utilisateur)
- Informations affichées et modifiables : prénom, nom, email (non modifiable si inscription via Google/Facebook/Apple), numéro de téléphone, photo de profil
- La modification de l'email nécessite une re-vérification par email (nouveau lien de confirmation)
- La modification du numéro de téléphone nécessite une re-vérification par SMS (nouveau code OTP)
- L'utilisateur doit toujours avoir au moins un moyen de contact vérifié (email vérifié OU téléphone vérifié). Il est impossible de supprimer le dernier moyen de contact vérifié. Pour supprimer un email vérifié, il faut d'abord avoir un téléphone vérifié (et vice versa). Message d'erreur si tentative de suppression du dernier moyen vérifié : "Vous devez conserver au moins un moyen de contact vérifié (email ou téléphone)."
- La photo de profil peut être chargée depuis la galerie ou prise avec la caméra
- La photo de profil est redimensionnée automatiquement (taille max recommandée)
- Un bouton "Sauvegarder" valide les modifications
- Un message de confirmation est affiché après la sauvegarde
- Le menu profil affiche également les liens vers : Moyens de paiement, Préférences alimentaires, Notifications, Langue, Mes données, Support, CGU, Politique de confidentialité, Déconnexion, Suppression de compte

---

---

### US-C055 — Définir mes préférences alimentaires
**En tant que** consommateur, **je veux** définir mes préférences alimentaires **afin que** les résultats de recherche soient pré-filtrés selon mes préférences.

**Critères d'acceptation :**
- Accessible depuis Profil > Préférences alimentaires
- Sélection multiple parmi les tags définis par l'admin BienBon : Végétarien, Végan, Halal (et autres si ajoutés)
- Les préférences sélectionnées sont utilisées comme filtres par défaut dans la recherche de paniers
- Les filtres par défaut sont désactivables/réactivables par le consommateur à tout moment depuis la barre de filtres (sans aller dans les préférences)
- Un message explicatif indique : "Vos préférences alimentaires sont utilisées pour pré-filtrer les paniers affichés. Vous pouvez les désactiver à tout moment."
- Les modifications sont sauvegardées instantanément

---

---

### US-C056 — Gérer mes préférences de notification
**En tant que** consommateur, **je veux** choisir quelles notifications je reçois et par quel canal **afin de** ne pas être submergé par des notifications non souhaitées.

**Critères d'acceptation :**
- Accessible depuis Profil > Notifications
- Pour chaque type de notification, un toggle activation/désactivation est disponible :
  - **Favoris** : alerte quand un partenaire favori publie un panier (push + email) — désactivable
  - **Rappels de retrait** : rappel avant le créneau de retrait (push) — désactivable pour le push, l'email reste actif (transactionnel)
  - **Impact et gamification** : notifications de badges et d'impact (push) — désactivable
  - **Parrainage** : notifications liées au programme de parrainage (push + email) — désactivable
  - **Promotions BienBon** : communications marketing de BienBon (push + email) — désactivable
- Les notifications transactionnelles suivantes ne sont PAS désactivables (obligatoires) :
  - Confirmation de réservation (push + email)
  - Annulation par le partenaire (push + email)
  - Confirmation de remboursement (push + email)
  - No-show (push + email)
  - Résolution de réclamation (push + email)
- Un choix de canal est disponible pour chaque type désactivable : push uniquement, email uniquement, push + email
- Les modifications sont sauvegardées instantanément

---

---

### US-C057 — Choisir la langue de l'interface
**En tant que** consommateur, **je veux** choisir la langue de l'interface **afin de** utiliser l'application dans ma langue préférée (LACUNE #11).

**Critères d'acceptation :**
- Accessible depuis Profil > Langue
- Langues disponibles : Français, English, Kreol Morisien
- La langue par défaut est détectée automatiquement en fonction de la langue du système de l'appareil ; si non supportée, le français est utilisé par défaut
- Le changement de langue est appliqué immédiatement à toute l'interface (menus, boutons, messages, écrans vides, notifications in-app)
- Les contenus générés par les utilisateurs (descriptions de paniers, avis) restent dans leur langue d'origine
- Les notifications push et emails sont envoyés dans la langue sélectionnée par le consommateur
- Le choix de langue est proposé lors de l'onboarding (premier écran ou écran dédié)
- Le choix de langue est également disponible en mode invité (avant inscription)

---

## 1.11 Partage & Impact

---

---

## Mockups

### consumer-profile

```
┌─────────────────────────────────┐
│  Mon Profil                     │
│                                 │
│  ┌─────┐                        │
│  │ 📷  │  Kevin Dorasamy        │
│  │     │  kevin@example.mu      │
│  └─────┘                        │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 👤 Informations perso.  > │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 💳 Moyens de paiement   > │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🥗 Préférences aliment. > │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🔔 Notifications        > │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🌐 Langue               > │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🌍 Mon impact           > │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🎁 Parrainage           > │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 📱 Mes données          > │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ ❓ Aide & Support       > │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 📄 CGU                  > │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 🔒 Politique confid.   > │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │    SE DÉCONNECTER         │  │
│  └───────────────────────────┘  │
│  Supprimer mon compte           │
│                                 │
│ ┌──────┬──────┬──────┬──────┐   │
│ │Carte │Liste │Favoris│Profil│  │
│ │      │      │      │  ●   │   │
│ └──────┴──────┴──────┴──────┘   │
└─────────────────────────────────┘
```

