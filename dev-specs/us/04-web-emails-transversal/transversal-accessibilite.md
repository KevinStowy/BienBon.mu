# Accessibilite

> US couvertes : US-T014, US-T015, US-T016

---

### US-T014 — Export des données personnelles (droit d'accès)
**En tant que** utilisateur (consommateur ou partenaire), **je veux** pouvoir exporter toutes les données personnelles que BienBon détient sur moi **afin d'** exercer mon droit d'accès conformément au Data Protection Act mauricien.

**Critères d'acceptation :**
- L'option "Exporter mes données" est accessible depuis les paramètres du profil (section "Confidentialité" ou "Mes données")
- Un clic sur "Exporter mes données" déclenche la génération d'un fichier contenant toutes les données personnelles de l'utilisateur
- Le fichier est généré au format JSON ou CSV lisible
- Les données exportées incluent au minimum :
  - Informations de profil (nom, prénom, email, téléphone, date d'inscription)
  - Préférences (langue, préférences alimentaires, notifications)
  - Historique des réservations (date, partenaire, panier, montant, statut)
  - Historique des avis laissés
  - Historique des réclamations
  - Liste des favoris
  - Pour les partenaires : informations du commerce, historique des paniers publiés, historique des factures
- Les données sensibles (mots de passe, tokens de session) ne sont PAS incluses dans l'export
- La génération peut prendre quelques minutes pour les comptes avec un historique important ; dans ce cas, un message informe l'utilisateur et un email avec un lien de téléchargement est envoyé une fois le fichier prêt
- Le lien de téléchargement est sécurisé (token unique, expire après 24 heures, accessible uniquement par l'utilisateur concerné)
- Un maximum d'une demande d'export par jour est autorisé (anti-abus)
- La demande d'export est journalisée dans l'audit log

---

### US-T015 — Politique de rétention des données
**En tant que** système, **je veux** appliquer une politique de rétention des données conforme au Data Protection Act mauricien **afin de** ne conserver les données personnelles que le temps nécessaire à leur finalité.

**Critères d'acceptation :**
- Les durées de rétention suivantes sont appliquées (valeurs par défaut configurables par l'admin) :
  - Comptes actifs : données conservées tant que le compte est actif
  - Comptes supprimés par l'utilisateur : les données personnelles sont anonymisées ou supprimées dans un délai de 30 jours après la demande de suppression. Les données transactionnelles nécessaires à la comptabilité sont conservées sous forme anonymisée pendant 7 ans (obligation légale)
  - Comptes bannis : les données d'identification minimales (email, téléphone, BRN) sont conservées pendant 3 ans pour empêcher la réinscription. Les autres données sont anonymisées dans un délai de 30 jours
  - Comptes inactifs : un compte sans activité (aucune connexion, aucune réservation) depuis 24 mois est considéré comme inactif. Un email de prévenance est envoyé 30 jours avant la suppression automatique. Sans réaction, les données sont anonymisées
  - Logs et journal d'activité : conservés pendant 12 mois, puis anonymisés
  - Emails collectés en pré-lancement : conservés pendant 12 mois après le lancement, puis supprimés
  - Consentements cookies : les preuves de consentement sont conservées pendant 3 ans
- Un processus automatisé (tâche planifiée) exécute l'anonymisation et la suppression selon les règles définies
- L'anonymisation consiste à remplacer les données personnelles par des valeurs génériques (ex: prénom -> "Utilisateur supprimé", email -> hash anonyme) tout en conservant les données statistiques (nombre de réservations, montants)
- L'admin peut consulter et modifier les durées de rétention depuis le backoffice (avec journalisation de chaque modification)
- Les utilisateurs sont informés des durées de rétention dans la Politique de Confidentialité (US-W007)

---

## 6.5 Fenêtre de réservation (LACUNE #34)

---

### US-T016 — Fenêtre maximale de réservation anticipée
**En tant que** système, **je veux** définir une fenêtre maximale de réservation anticipée **afin de** limiter le temps entre la réservation et le retrait pour des raisons opérationnelles et financières (durée de la pré-autorisation bancaire).

**Critères d'acceptation :**
- Une fenêtre maximale de réservation anticipée est définie : un consommateur ne peut réserver un panier que si le créneau de retrait débute dans un délai maximum configurable (valeur par défaut : 48 heures)
- Exemple : si la fenêtre est de 48 heures et qu'un panier a un créneau de retrait demain à 12h, il est réservable. Si le créneau est dans 3 jours, il n'est pas encore réservable mais est visible avec l'indication "Réservable à partir de [date/heure]"
- La fenêtre maximale est configurable par l'admin depuis le backoffice (paramètres globaux de la plateforme, cf. US-A024)
- La valeur de la fenêtre est alignée sur la durée maximale de pré-autorisation bancaire supportée par le prestataire de paiement (généralement 7 jours, mais à confirmer avec le prestataire)
- Les paniers dont le créneau de retrait est au-delà de la fenêtre sont visibles mais non réservables : un message explique "Ce panier sera réservable à partir de [date/heure]"
- Le panier devient automatiquement réservable dès que la date/heure d'ouverture de la fenêtre est atteinte
- Les paniers récurrents (US-P015) publient automatiquement le panier en respectant la fenêtre de réservation (publication automatique = début du créneau - fenêtre maximale)
- Un consommateur peut activer une alerte pour être notifié quand un panier visible mais non encore réservable devient réservable (optionnel, si cette fonctionnalité est implémentée)

---

# RÉCAPITULATIF DES USER STORIES — PARTIES 4, 5 ET 6

| Section | Identifiants | Nombre d'US |
|---|---|---|
| **PARTIE 4 — Site Web Vitrine** | | |
| 4.1 Pages Publiques | US-W001 à US-W012 | 12 |
| 4.2 SEO et Référencement | US-W013 à US-W014 | 2 |
| **Sous-total Partie 4** | | **14** |
| **PARTIE 5 — Emails Transactionnels** | | |
| Emails E001 à E019 | US-E001 à US-E019 | 19 |
| **Sous-total Partie 5** | | **19** |
| **PARTIE 6 — Transversal** | | |
| 6.1 Sécurité et Compte | US-T001 à US-T004 | 4 |
| 6.2 Accessibilité et UX | US-T005 à US-T009 | 5 |
| 6.3 Gestion des erreurs | US-T010 à US-T012 | 3 |
| 6.4 Conformité et Données | US-T013 à US-T015 | 3 |
| 6.5 Fenêtre de réservation | US-T016 | 1 |
| **Sous-total Partie 6** | | **16** |
| **TOTAL PARTIES 4+5+6** | | **49** |

---

# REGISTRE DES LACUNES ADRESSÉES

| Lacune # | Description | US correspondante(s) |
|---|---|---|
| #3 | Récapitulatif hebdomadaire impact consommateur | US-E018 |
| #10 | Accessibilité | US-T007 |
| #11 | Multi-langue | US-T008 |
| #14 | Gestion des erreurs | US-T010, US-T011, US-T012 |
| #15 | SEO et référencement | US-W013, US-W014 |
| #16 | Parrainage | US-E017 |
| #26 | Consentement cookies | US-W012, US-T013 |
| #34 | Fenêtre de réservation | US-T016 |
| #37 | Fuseau horaire | US-T009 |
| #38 | Mode Coming Soon pour le site vitrine | US-W011 |
| #41 | Compteur d'impact en temps réel | US-W010 |

---

## Mockups

### transversal-accessibility

```
┌───────────────────────────────────────────────────────┐
│  LISTE DES PANIERS - Vue Consommateur                 │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ [photo]  Panier Surprise Pâtisserie             │  │
│  │          Boulangerie du Port                    │  │
│  │          150 Rs (valeur 350 Rs)                 │  │
│  │          Retrait: 17h-18h                       │  │
│  │          ┌────────────────────┐                  │  │
│  │          │  Réserver  >>>     │                  │  │
│  │          └────────────────────┘                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ [photo]  Panier Surprise Traiteur    ┌────────┐ │  │
│  │          Restaurant Le Chamarel      │ÉPUISÉ  │ │  │
│  │          200 Rs (valeur 500 Rs)      └────────┘ │  │
│  │          Retrait: 18h-19h                       │  │
│  │          ┌────────────────────┐                  │  │
│  │          │  ░░░░░░░░░░░░░░░░ │ (désactivé)      │  │
│  │          └────────────────────┘                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ [photo]  Panier Surprise Boulanger              │  │
│  │          Boulangerie Flacq                      │  │
│  │          100 Rs (valeur 250 Rs)                 │  │
│  │          Retrait: 16h-17h                       │  │
│  │          ┌────────────────────┐                  │  │
│  │          │  Réserver  >>>     │                  │  │
│  │          └────────────────────┘                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
├───────────────────────────────────────────────────────┤
│  FICHE PANIER ÉPUISÉ (lien direct/favori)            │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │                                                 │  │
│  │  [photo du panier]                              │  │
│  │                                                 │  │
│  │  Panier Surprise Traiteur        ┌────────┐    │  │
│  │  Restaurant Le Chamarel           │ÉPUISÉ  │    │  │
│  │                                   └────────┘    │  │
│  │                                                 │  │
│  │  200 Rs (valeur 500 Rs)                         │  │
│  │  Retrait: 18h-19h (heure de Maurice)            │  │
│  │                                                 │  │
│  │  Ce panier est actuellement épuisé.             │  │
│  │                                                 │  │
│  │  ┌───────────────────────────────────────────┐  │  │
│  │  │  Voir d'autres paniers  >>>               │  │  │
│  │  └───────────────────────────────────────────┘  │  │
│  │                                                 │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

