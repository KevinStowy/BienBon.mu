# Journal d'audit

> US couvertes : US-A031, US-A032, US-A033, US-A034, US-A035, US-A036, US-A037

---

### US-A031 -- Journal d'activité global en temps réel
**En tant qu'** admin BienBon, **je veux** consulter un journal d'activité complet et en temps réel de tout ce qui se passe sur la plateforme **afin de** tout surveiller, tout comprendre et tout investiguer.

**Critères d'acceptation :**
- Le journal enregistre de manière exhaustive les événements suivants :

  **Authentification :**
  - Inscription d'un nouveau compte (consommateur ou partenaire)
  - Connexion réussie
  - Déconnexion
  - Tentative de connexion échouée (mauvais mot de passe, compte suspendu/banni)
  - Changement de mot de passe
  - Réinitialisation de mot de passe demandée

  **Consommateur :**
  - Réservation d'un panier
  - Annulation d'une réservation
  - Retrait validé (panier récupéré)
  - No-show (retrait non effectué)
  - Note/avis laissé sur un partenaire
  - Réclamation ouverte
  - Ajout d'un partenaire en favori
  - Retrait d'un partenaire des favoris
  - Modification du profil (informations personnelles)
  - Changement de préférences alimentaires
  - Changement de préférences de notification
  - Parrainage envoyé
  - Parrainage accepté (le filleul s'est inscrit)
  - Demande de suppression de compte
  - Suppression de compte effectuée

  **Partenaire :**
  - Création d'un panier (manuel)
  - Modification d'un panier
  - Suppression d'un panier (sans réservation)
  - Création d'un modèle de panier récurrent
  - Activation d'un modèle récurrent
  - Désactivation d'un modèle récurrent
  - Modification d'un modèle récurrent
  - Annulation ponctuelle d'une publication récurrente
  - Annulation d'un panier ayant des réservations (avec liste des consommateurs impactés)
  - Validation d'un retrait (scan QR ou saisie PIN)
  - Soumission d'une modification de fiche commerce
  - Upload de photo

  **Paiement :**
  - Pré-autorisation effectuée (début de réservation)
  - Débit effectué (début du créneau de retrait)
  - Remboursement effectué (annulation, réclamation, annulation par partenaire)
  - Échec de paiement (pré-autorisation refusée, débit refusé)
  - Levée de pré-autorisation (annulation avant créneau)

  **Admin :**
  - Validation d'une inscription partenaire
  - Rejet d'une inscription partenaire
  - Validation d'une modification de fiche commerce
  - Rejet d'une modification de fiche commerce
  - Suspension d'un compte (consommateur ou partenaire)
  - Réactivation d'un compte (consommateur ou partenaire)
  - Bannissement d'un compte (consommateur ou partenaire)
  - Modification de la commission d'un partenaire
  - Modification directe de la fiche d'un partenaire
  - Résolution d'une réclamation (avec type de décision)
  - Suppression d'un avis
  - Modification des paramètres globaux de la plateforme (commission, fee minimum, ratio réduction)
  - Génération des relevés de reversement mensuels
  - Création d'un compte admin
  - Désactivation d'un compte admin
  - Ajout/modification/suppression d'une catégorie de panier
  - Ajout/modification/suppression d'un tag de préférence alimentaire
  - Ajout/modification/suppression d'un jour férié
  - Inscription manuelle d'un partenaire
  - Inscription d'un partenaire via le kit terrain
  - Fusion de comptes doublons

- Chaque entrée du journal contient l'ID interne de l'utilisateur (ex: USR-00142) en plus du nom/prénom. Cet ID persiste même après suppression ou anonymisation du compte, permettant de retracer l'historique d'un utilisateur supprimé. Format : [Date] [ID utilisateur] [Nom (ou 'Utilisateur supprimé')] [Action] [Détails]
- Chaque entrée du journal contient : date et heure précise (à la seconde), ID interne de l'utilisateur (ex: USR-00142), identifiant de l'utilisateur concerné (avec nom/email ou 'Utilisateur supprimé' si le compte a été anonymisé), type d'événement (catégorisé), résumé de l'action en langage clair, identifiant de l'admin ayant effectué l'action (si action admin)
- Le flux est en temps réel : les nouvelles entrées apparaissent automatiquement sans rechargement de page (websocket ou polling)
- Le journal est paginé (50 entrées par page par défaut) avec scroll infini ou pagination
- Performance : le journal doit rester fluide même avec des millions d'entrées (indexation, archivage)

---

---

### US-A032 -- Filtrer le journal par utilisateur
**En tant qu'** admin BienBon, **je veux** filtrer le journal d'activité par utilisateur spécifique **afin de** suivre le parcours et le comportement d'un utilisateur précis.

**Critères d'acceptation :**
- Champ de recherche par nom, prénom, email ou identifiant unique
- Auto-complétion lors de la saisie
- Affichage chronologique de toutes les actions de l'utilisateur sélectionné
- Fonctionne pour les consommateurs, les partenaires et les admins
- Combinable avec les filtres par type d'action et par période
- Nombre total d'événements affiché pour l'utilisateur sélectionné

---

---

### US-A033 -- Filtrer le journal par type d'action
**En tant qu'** admin BienBon, **je veux** filtrer le journal par type d'action ou catégorie d'événement **afin d'** analyser des comportements spécifiques à grande échelle.

**Critères d'acceptation :**
- Filtres par catégorie d'événement :
  - Authentification (inscriptions, connexions, déconnexions, échecs)
  - Réservations (réservations, annulations)
  - Retraits (retraits validés, no-shows)
  - Paniers (création, modification, suppression, annulation)
  - Paiements (pré-autorisations, débits, remboursements, échecs)
  - Réclamations (ouverture, résolution)
  - Modération (suppression d'avis)
  - Administration (validations, rejets, suspensions, bannissements, modifications admin)
  - Facturation (génération de relevés de reversement, modifications commission)
- Sélection multiple de catégories possible
- Combinable avec les filtres par utilisateur et par période
- Compteur du nombre de résultats pour les filtres actifs

---

---

### US-A034 -- Filtrer le journal par période
**En tant qu'** admin BienBon, **je veux** filtrer le journal par période temporelle **afin d'** investiguer un moment précis ou analyser une tendance.

**Critères d'acceptation :**
- Sélection de date et heure de début et de fin (précision à la minute)
- Périodes pré-définies disponibles : dernière heure, dernières 24h, dernière semaine, dernier mois
- Combinable avec les filtres par utilisateur et par type d'action
- Affichage du nombre total d'événements sur la période sélectionnée

---

---

### US-A035 -- Voir le détail complet d'une action
**En tant qu'** admin BienBon, **je veux** voir tous les détails d'une action spécifique enregistrée dans le journal **afin de** comprendre exactement ce qui s'est passé, qui l'a fait, et quel en a été l'impact.

**Critères d'acceptation :**
- En cliquant sur une entrée du journal, une vue détaillée s'affiche :
  - **Qui** : utilisateur ayant effectué l'action (nom, email, rôle, identifiant unique)
  - **Quoi** : nature de l'action en langage clair
  - **Quand** : date et heure exactes (à la seconde, avec fuseau horaire)
  - **Où** : page ou fonctionnalité depuis laquelle l'action a été effectuée (si pertinent)
  - **Données avant/après** : pour les modifications, affichage comparatif côté à côté des valeurs avant et après modification (champs modifiés surlignés)
  - **Contexte** : informations liées (réservation concernée, panier concerné, partenaire concerné, réclamation concernée, etc.) avec liens cliquables vers les fiches correspondantes
  - **Adresse IP** : adresse IP de l'utilisateur au moment de l'action (pour les actions sensibles)
  - **User-Agent** : navigateur / appareil utilisé (pour les actions sensibles)
- Navigation possible vers l'action précédente / suivante du même utilisateur (flèches de navigation)

---

---

### US-A036 -- Voir le parcours complet d'un utilisateur (timeline)
**En tant qu'** admin BienBon, **je veux** voir la timeline complète d'un utilisateur depuis son inscription **afin de** comprendre son comportement de bout en bout et identifier des patterns.

**Critères d'acceptation :**
- Vue chronologique sous forme de timeline visuelle de TOUTES les actions d'un utilisateur depuis sa date d'inscription
- Chaque événement est représenté sur la timeline avec une icône et un code couleur par type d'action
- Les événements sont regroupés par jour pour faciliter la lecture
- Possibilité de zoomer sur une période spécifique de la timeline
- Possibilité de filtrer la timeline par type d'action
- Accès direct au détail de chaque action depuis la timeline (clic)
- Résumé statistique en haut de la timeline : nombre total d'actions, nombre de réservations, nombre de no-shows, nombre de réclamations, durée d'activité sur la plateforme
- Accessible depuis la fiche du consommateur, la fiche du partenaire, ou le journal d'activité global

---

---

### US-A037 -- Exporter les données du journal (CSV)
**En tant qu'** admin BienBon, **je veux** exporter les données du journal d'activité au format CSV **afin de** les analyser hors du backoffice avec mes propres outils (Excel, Google Sheets, outils BI).

**Critères d'acceptation :**
- Bouton "Exporter en CSV" disponible dans le journal d'activité
- Les filtres actifs (utilisateur, type d'action, période) s'appliquent à l'export : seules les données filtrées sont exportées
- Le fichier CSV contient les colonnes : date/heure, type d'événement, catégorie, utilisateur (nom, email, rôle), résumé de l'action, détails (données supplémentaires sérialisées)
- Limite de taille d'export : maximum 100 000 lignes par export (si le résultat dépasse, un message invite à restreindre les filtres)
- L'export est généré de manière asynchrone si le volume est important (notification quand le fichier est prêt à télécharger)
- L'action d'export est elle-même tracée dans le journal d'activité

---

## 3.7 Anti-fraude & Surveillance

---

## Mockups

### admin-audit-log

```
┌──────────────────────────────────────────────────────────────────────────┐
│  BienBon Admin                                     👤 Admin · FR ▼     │
├─────────┬────────────────────────────────────────────────────────────────┤
│         │  📋 Audit Log · The All Seeing Eye         EN DIRECT 🔴      │
│ 📊 Dash │                                                              │
│ 👥 Part.│  🔍 [ Rechercher utilisateur (nom, email, ID)...  ]          │
│ 🛒 Conso│  Filtres: [Catégorie ▼] [Période ▼]      [📥 Export CSV]    │
│ ⚖ Modér│  Résultats : 156,892 événements                              │
│ 💰 Fact.│                                                              │
│ 📋 Audit│  ┌──────────────┬───────┬──────────┬────────────────────────┐│
│ 🛡 Fraud│  │ Date/Heure   │ Type  │ ID       │ Action                 ││
│ ⚙ Param│  ├──────────────┼───────┼──────────┼────────────────────────┤│
│         │  │ 07/02 14:32  │ 🛒    │USR-00087 │ Priya D. a réservé    ││
│         │  │              │       │          │ panier Le Chamarel     ││
│         │  ├──────────────┼───────┼──────────┼────────────────────────┤│
│         │  │ 07/02 14:31  │ 💳    │USR-00087 │ Pré-autorisation      ││
│         │  │              │       │          │ 120 Rs pour Priya D.   ││
│         │  ├──────────────┼───────┼──────────┼────────────────────────┤│
│         │  │ 07/02 14:28  │ 🔑    │PTR-00012 │ Connexion réussie :   ││
│         │  │              │       │          │ jm@lechamarel.mu       ││
│         │  ├──────────────┼───────┼──────────┼────────────────────────┤│
│         │  │ 07/02 14:25  │ 📦    │PTR-00012 │ Le Chamarel a publié  ││
│         │  │              │       │          │ "Panier Déjeuner"      ││
│         │  ├──────────────┼───────┼──────────┼────────────────────────┤│
│         │  │ 07/02 14:20  │ ✅    │ADM-00001 │ Admin Kevin a validé  ││
│         │  │              │       │          │ inscr. Chez Ravi       ││
│         │  ├──────────────┼───────┼──────────┼────────────────────────┤│
│         │  │ 07/02 14:18  │ 🔑    │USR-00034 │ Tentative échouée :   ││
│         │  │              │       │          │ kc@gmail.com (3e)      ││
│         │  ├──────────────┼───────┼──────────┼────────────────────────┤│
│         │  │ 07/02 14:15  │ ⭐    │USR-00045 │ Sophie M. : note 5★   ││
│         │  │              │       │          │ sur Royal Bakery       ││
│         │  ├──────────────┼───────┼──────────┼────────────────────────┤│
│         │  │ 07/02 14:12  │ 💳    │USR-00142 │ Rembours. 60 Rs       ││
│         │  │              │       │          │ Raj D. (réclam. #2)    ││
│         │  ├──────────────┼───────┼──────────┼────────────────────────┤│
│         │  │ 07/02 14:10  │ 🕐    │USR-00098 │ No-show : Dev P.      ││
│         │  │              │       │          │ panier Chez Ravi       ││
│         │  └──────────────┴───────┴──────────┴────────────────────────┘│
│         │  ID persiste après suppression/anonymisation du compte.      │
│         │                                                              │
│         │  Affichage 1-9 sur 156,892    [ < ] Page 1/3138 [ > ]       │
│         │                                                              │
└─────────┴────────────────────────────────────────────────────────────────┘
```

