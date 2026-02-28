# Inscription & Validation Partenaire

**User Stories couvertes :** US-P001, US-P002, US-P003

---

## US-P001 -- Inscription partenaire depuis le site web

**En tant que** partenaire, **je veux** m'inscrire depuis le site bienbon.mu avec toutes les informations requises **afin de** soumettre ma candidature pour proposer mes paniers sur la plateforme.

**Critères d'acceptation :**
- Le formulaire d'inscription est accessible depuis la page "Devenir partenaire" du site vitrine bienbon.mu
- Le formulaire est structuré en étapes progressives (stepper) pour ne pas submerger le partenaire
- **Informations du responsable** (toutes obligatoires) :
  - Nom
  - Prénom
  - Adresse email professionnelle
  - Numéro de téléphone (format mauricien : +230 XXXX XXXX)
  - Mot de passe (minimum 8 caractères, au moins 1 majuscule, 1 chiffre, 1 caractère spécial)
  - Confirmation du mot de passe
- **Informations du commerce** (toutes obligatoires) :
  - Nom du commerce
  - Type de commerce (sélection parmi une liste : restaurant, hôtel, supermarché, boulangerie, pâtisserie, traiteur, fleuriste, épicerie, autre)
  - Adresse complète (numéro, rue, ville, code postal, île Maurice)
  - Coordonnées GPS (géolocalisation automatique à partir de l'adresse, ou positionnement manuel sur la carte)
  - Numéro BRN (Business Registration Number) -- format valide
  - Numéro de Food Dealer's Licence (permis sanitaire)* -- délivré par le Ministry of Health and Wellness de l'Île Maurice -- **obligatoire uniquement pour les commerces alimentaires** (restaurant, hôtel, supermarché, boulangerie, pâtisserie, traiteur, épicerie). Non requis pour les commerces non alimentaires (ex: fleuriste).
  - Description du commerce (minimum 50 caractères)
  - Numéro de téléphone du commerce (peut être différent du responsable)
- **Photos** (obligatoire) :
  - Au moins une photo du commerce (façade ou intérieur)
  - Format accepté : JPG, PNG, WEBP
  - Taille maximale : 20 Mo par photo
  - Recadrage et recompression automatiques côté serveur (qualité optimisée pour le web)
- **Acceptation des conditions** (LACUNE #7 et #43 -- obligatoire) :
  - Case à cocher "J'ai lu et j'accepte les Conditions Générales de Vente (CGV)" avec lien vers le document complet
  - Case à cocher "J'ai lu et j'accepte les Conditions Commerciales Partenaire" avec lien vers le document complet (incluant le modèle de commission, le fee minimum, les obligations du partenaire)
  - Case à cocher "J'accepte la Politique de Confidentialité et le traitement de mes données" avec lien
  - Les trois cases doivent être cochées pour soumettre le formulaire
  - La date et l'heure d'acceptation sont enregistrées dans le système
  - La version des documents acceptés est tracée (pour gestion des mises à jour futures)
- Le numéro de Food Dealer's Licence est obligatoire uniquement si le type de commerce est alimentaire (restaurant, hôtel, supermarché, boulangerie, pâtisserie, traiteur, épicerie). Le champ est masqué ou désactivé pour les types non alimentaires (ex: fleuriste). Son format est validé en temps réel. L'admin BienBon vérifie la validité du numéro lors de la validation de l'inscription.
- Le formulaire valide les champs en temps réel (email valide, BRN au bon format, Food Dealer's Licence au bon format si applicable, mot de passe conforme, etc.)
- Un captcha ou équivalent est présent pour éviter les inscriptions automatisées
- À la soumission, la demande est enregistrée avec le statut "en attente de validation"
- Le partenaire reçoit un email de confirmation de réception de sa demande (avec numéro de référence)
- Le partenaire reçoit une notification push (s'il a autorisé les notifications du navigateur) confirmant la réception
- La demande apparaît dans le backoffice admin pour traitement

---

## US-P002 -- Être notifié de la validation de son inscription

**En tant que** partenaire, **je veux** être informé quand mon inscription est validée par l'équipe BienBon **afin de** commencer à utiliser la plateforme et proposer mes paniers.

**Critères d'acceptation :**
- Le partenaire reçoit une notification par email contenant :
  - Un message de bienvenue personnalisé (prénom du responsable, nom du commerce)
  - La confirmation que son compte est actif
  - Un lien direct vers le dashboard partenaire
  - Un rappel des prochaines étapes (compléter l'onboarding, créer son premier panier)
  - Les coordonnées du support BienBon en cas de question
- Le partenaire reçoit une notification push avec le message : "Félicitations ! Votre commerce [nom] est validé sur BienBon. Commencez à proposer vos paniers !"
- L'accès au dashboard partenaire est débloqué
- Le partenaire est redirigé vers l'onboarding à sa première connexion au dashboard
- Le statut du compte passe de "en attente" à "actif" dans le système

---

## US-P003 -- Être notifié du rejet de son inscription

**En tant que** partenaire, **je veux** être informé si mon inscription est rejetée avec le motif détaillé **afin de** comprendre les raisons et éventuellement corriger ma demande.

**Critères d'acceptation :**
- Le partenaire reçoit une notification par email contenant :
  - Le motif de rejet détaillé (rédigé par l'admin)
  - Les éléments spécifiques à corriger (ex: "photo du commerce floue", "BRN invalide", "description trop courte")
  - Un lien pour resoumettre une demande corrigée
  - Les coordonnées du support BienBon pour toute question
- Le partenaire reçoit une notification push avec le message : "Votre demande d'inscription pour [nom du commerce] nécessite des modifications. Consultez votre email pour plus de détails."
- Le partenaire peut resoumettre une nouvelle demande en repartant du formulaire pré-rempli avec les informations précédemment saisies
- Les informations sensibles (mot de passe) ne sont pas pré-remplies
- L'historique des soumissions est conservé dans le backoffice admin

---

## Mockups

### État par défaut -- Étape 1 Responsable

```
┌──────────────────────────────────────────────────────┐
│  BienBon - Devenir Partenaire                        │
│                                                      │
│  Inscription Partenaire                              │
│  Étape 1/4 : Informations du responsable             │
│  ●━━━━━━━━○─────────○─────────○─────────             │
│                                                      │
│  ┌────────────────────────┐ ┌────────────────────┐   │
│  │ Prénom*                │ │ Nom*               │   │
│  │ Ex: Jean               │ │ Ex: Dupont         │   │
│  └────────────────────────┘ └────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Email professionnel*                            │ │
│  │ Ex: contact@lechamarel.mu                       │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Téléphone* (+230)                               │ │
│  │ +230 5XXX XXXX                                  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Mot de passe*                                   │ │
│  │ ●●●●●●●●                            [eye]      │ │
│  └─────────────────────────────────────────────────┘ │
│  Min. 8 car., 1 majuscule, 1 chiffre, 1 spécial     │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Confirmer le mot de passe*                      │ │
│  │ ●●●●●●●●                            [eye]      │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│                              [ Suivant -> ]          │
└──────────────────────────────────────────────────────┘
```

---

## Assets requis

- `../../assets/logos/logo-principal.png` -- Logo BienBon pour l'en-tête du formulaire
- `../../assets/logos/logo-avec-texte.png` -- Logo avec texte pour l'email de confirmation
- `../../assets/illustrations/site-vitrine/vitrine-page-partenaire.png` -- Illustration page "Devenir partenaire"
