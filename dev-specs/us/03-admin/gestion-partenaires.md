# Gestion des partenaires

> US couvertes : US-A004, US-A005, US-A006, US-A007, US-A008, US-A009, US-A010, US-A011, US-A012, US-A013, US-A014, US-A015, US-A016, US-A017

---

### US-A004 -- Voir les demandes d'inscription partenaire en attente
**En tant qu'** admin BienBon, **je veux** voir la liste des demandes d'inscription partenaire en attente de validation **afin de** les traiter dans les meilleurs délais.

**Critères d'acceptation :**
- Liste des demandes en attente affichant : nom du commerce, type de commerce, nom du responsable, date et heure de soumission, canal d'inscription (site web, kit terrain, inscription manuelle admin)
- Tri par défaut : date de soumission croissante (les plus anciennes en premier)
- Possibilité de trier par date, type de commerce ou canal
- Badge/compteur visible en permanence dans le menu de navigation indiquant le nombre de demandes en attente
- Notification visuelle (point rouge) quand de nouvelles demandes arrivent
- Accès direct à la fiche complète de la demande depuis la liste

---

---

### US-A005 -- Valider une demande d'inscription partenaire
**En tant qu'** admin BienBon, **je veux** valider une demande d'inscription partenaire **afin de** l'autoriser à publier des paniers sur la plateforme.

**Critères d'acceptation :**
- L'admin peut consulter toutes les informations soumises par le partenaire avant validation : informations du responsable, informations du commerce, numéro BRN, photos, description
- L'admin peut vérifier la cohérence des informations (nom, adresse, BRN)
- Bouton "Valider" avec confirmation ("Êtes-vous sûr de vouloir valider ce partenaire ?")
- À la validation :
  - Le compte partenaire passe en statut "actif"
  - Le partenaire reçoit une notification (email + push) l'informant de la validation
  - Le partenaire peut désormais accéder à son dashboard et publier des paniers
  - L'action est enregistrée dans le journal d'activité (qui a validé, quand)
- L'admin peut ajouter un commentaire interne (non visible par le partenaire) lors de la validation

---

---

### US-A006 -- Rejeter une demande d'inscription partenaire
**En tant qu'** admin BienBon, **je veux** rejeter une demande d'inscription partenaire en indiquant un motif **afin que** le partenaire comprenne pourquoi et puisse éventuellement corriger sa demande.

**Critères d'acceptation :**
- Bouton "Rejeter" accessible depuis la fiche de la demande
- Champ de saisie du motif de rejet obligatoire (texte libre, minimum 10 caractères)
- Motifs pré-définis disponibles en sélection rapide (ex. : "BRN invalide", "Photos insuffisantes", "Adresse incomplète", "Type de commerce non éligible") avec possibilité de personnaliser
- À la rejection :
  - Le partenaire reçoit une notification (email) avec le motif détaillé
  - Le partenaire peut resoumettre une demande corrigée
  - L'action est enregistrée dans le journal d'activité
- L'admin peut ajouter un commentaire interne

---

---

### US-A007 -- Voir les modifications de fiches commerce en attente
**En tant qu'** admin BienBon, **je veux** voir la liste des modifications de fiches commerce en attente de validation **afin de** contrôler les changements avant leur publication.

**Critères d'acceptation :**
- Liste des modifications en attente affichant : nom du commerce, champs modifiés (résumé), date de soumission
- Badge/compteur dans le menu de navigation
- Pour chaque modification, vue comparative côté à côté : valeurs actuelles vs valeurs proposées
- Les champs modifiés sont surlignés visuellement pour identification rapide
- Les photos modifiées sont affichées en comparaison (avant / après)
- Tri par date de soumission (les plus anciennes en premier)

---

---

### US-A008 -- Valider ou rejeter une modification de fiche commerce
**En tant qu'** admin BienBon, **je veux** valider ou rejeter une modification de fiche commerce soumise par un partenaire **afin de** contrôler la qualité et la véracité des informations publiées.

**Critères d'acceptation :**
- Vue comparative avant/après clairement lisible
- Bouton "Valider" :
  - Les nouvelles informations remplacent les anciennes et sont publiées immédiatement
  - Le partenaire est notifié de la validation (push + email)
  - L'action est tracée dans le journal (avec le détail avant/après)
- Bouton "Rejeter" :
  - Motif de rejet obligatoire
  - Les informations actuelles restent inchangées
  - Le partenaire est notifié du rejet avec le motif (push + email)
  - L'action est tracée dans le journal
- Possibilité de valider partiellement (accepter certains champs, rejeter d'autres) avec motif pour les champs rejetés

---

---

### US-A009 -- Inscrire un partenaire manuellement
**En tant qu'** admin BienBon, **je veux** inscrire un partenaire directement depuis le backoffice **afin de** faciliter l'onboarding de partenaires démarchés en personne ou par téléphone.

**Critères d'acceptation :**
- Formulaire complet disponible dans le backoffice avec toutes les informations requises :
  - Informations du responsable : nom, prénom, email, téléphone
  - Informations du commerce : nom, type, adresse complète, numéro BRN, description
  - Photos du commerce (upload)
- Le compte est créé directement en statut "actif" (pas de validation nécessaire)
- Un mot de passe temporaire est généré automatiquement
- Un email est envoyé au partenaire contenant :
  - Ses identifiants de connexion (email + mot de passe temporaire)
  - Un lien pour changer son mot de passe à la première connexion
  - Un guide de démarrage rapide
- Le changement de mot de passe est obligatoire à la première connexion
- L'admin qui a créé le compte est tracé dans le journal d'activité
- Le partenaire est marqué comme "inscrit par admin" dans sa fiche

---

---

### US-A010 -- Kit onboarding terrain (inscription sur tablette)
**En tant qu'** admin BienBon, **je veux** disposer d'un formulaire simplifié utilisable sur tablette par un commercial terrain **afin d'** inscrire un partenaire en personne en moins de 5 minutes.

**Critères d'acceptation :**
- Formulaire optimisé pour tablette (grands boutons, navigation tactile, mode plein écran)
- Champs du formulaire simplifié :
  - Nom du commerce (obligatoire)
  - Type de commerce (sélection dans une liste, obligatoire)
  - Adresse (avec auto-complétion ou saisie manuelle, obligatoire)
  - Nom et prénom du responsable (obligatoire)
  - Email du responsable (obligatoire)
  - Téléphone du responsable (obligatoire)
  - Numéro BRN (obligatoire)
  - Photo du commerce (prise directe via la caméra de la tablette, minimum 1 photo obligatoire)
  - Signature électronique d'acceptation des CGV (champ de signature tactile, obligatoire)
- Le formulaire peut fonctionner en mode dégradé (connexion intermittente) : les données sont sauvegardées localement et synchronisées dès que la connexion est rétablie
- Le temps de remplissage cible est inférieur à 5 minutes
- À la soumission :
  - Le compte partenaire est créé en statut "actif" (même comportement que l'inscription manuelle)
  - Un email avec identifiants temporaires est envoyé au partenaire
  - Le commercial est identifié comme créateur du compte dans le journal
- Un récapitulatif est affiché après soumission, avec possibilité d'imprimer ou envoyer par email au partenaire
- Le formulaire enregistre automatiquement la géolocalisation de l'inscription (coordonnées GPS)

---

---

### US-A011 -- Voir la fiche complète d'un partenaire
**En tant qu'** admin BienBon, **je veux** voir toutes les informations d'un partenaire sur une fiche unique et détaillée **afin d'** avoir une vue à 360 degrés de son activité et de son historique.

**Critères d'acceptation :**
- La fiche affiche les sections suivantes :
  - **Informations générales** : nom du commerce, type, adresse, BRN, description, photos, horaires d'ouverture, date d'inscription, canal d'inscription, statut du compte (actif, suspendu, banni)
  - **Informations du responsable** : nom, prénom, email, téléphone
  - **Statistiques** : nombre total de paniers publiés, nombre de paniers vendus, CA généré, nombre de paniers sauvés, note moyenne, nombre d'avis reçus, nombre de réclamations reçues, taux de no-show de ses clients, nombre d'annulations par le partenaire
  - **Configuration commission** : taux ou montant fixe appliqué, fee minimum, indication si configuration spécifique ou héritage global
  - **Historique des paniers** : liste paginée de tous les paniers publiés (passés et à venir) avec statut
  - **Historique des modifications** : toutes les modifications de fiche soumises avec leur statut (validée, rejetée, en attente)
  - **Historique des reversements** : liste des relevés de reversement mensuels
  - **Journal d'activité** : timeline des actions du partenaire sur la plateforme
- Chaque section est accessible via un onglet ou un ancrage de navigation rapide
- Lien direct vers le parcours complet du partenaire dans l'Audit Log

---

---

### US-A012 -- Modifier la fiche d'un partenaire
**En tant qu'** admin BienBon, **je veux** modifier directement les informations d'un partenaire depuis le backoffice **afin de** corriger des erreurs ou mettre à jour des données sans attendre une soumission du partenaire.

**Critères d'acceptation :**
- Tous les champs de la fiche du partenaire sont modifiables par l'admin : nom, description, adresse, type, horaires, photos, informations du responsable
- La modification est appliquée immédiatement (pas de workflow de validation)
- Un motif de modification peut être saisi (optionnel mais recommandé)
- L'action est systématiquement tracée dans le journal d'activité avec le détail des valeurs avant et après modification
- L'admin effectuant la modification est identifié dans le journal
- Le partenaire n'est pas notifié des modifications admin (sauf si l'admin choisit de l'en informer via un toggle)

---

---

### US-A013 -- Suspendre un partenaire
**En tant qu'** admin BienBon, **je veux** suspendre temporairement un partenaire **afin de** le désactiver suite à un problème (réclamations répétées, fraude suspectée, non-respect des CGV).

**Critères d'acceptation :**
- Motif de suspension obligatoire (texte libre)
- Confirmation requise avant suspension ("Êtes-vous sûr ? Cette action entraînera l'annulation de X réservations en cours.")
- Effets de la suspension :
  - Tous les paniers actifs du partenaire sont retirés de la visibilité publique immédiatement
  - Toutes les réservations en cours sont annulées automatiquement
  - Tous les consommateurs concernés sont remboursés et notifiés
  - Le partenaire ne peut plus se connecter à son dashboard
  - Le partenaire ne peut plus publier de nouveaux paniers
  - Les modèles récurrents sont désactivés automatiquement
- Le partenaire reçoit une notification (email) avec le motif de suspension
- L'action est tracée dans le journal d'activité
- Le statut du partenaire passe à "suspendu"

---

---

### US-A014 -- Réactiver un partenaire suspendu
**En tant qu'** admin BienBon, **je veux** réactiver un partenaire précédemment suspendu **afin de** lui redonner accès à la plateforme après résolution du problème.

**Critères d'acceptation :**
- Bouton "Réactiver" visible uniquement sur les fiches de partenaires en statut "suspendu"
- Un commentaire de réactivation peut être saisi (optionnel)
- Effets de la réactivation :
  - Le partenaire retrouve l'accès à son dashboard
  - Il peut à nouveau publier des paniers
  - Les modèles récurrents ne sont PAS réactivés automatiquement (le partenaire doit les réactiver manuellement)
  - Le partenaire est notifié de la réactivation (email + push)
- L'action est tracée dans le journal d'activité
- Le statut du partenaire repasse à "actif"

---

---

### US-A015 -- Bannir un partenaire
**En tant qu'** admin BienBon, **je veux** bannir définitivement un partenaire **afin de** l'exclure de la plateforme de manière permanente en cas de faute grave.

**Critères d'acceptation :**
- Motif de bannissement obligatoire (texte libre)
- Double confirmation requise ("Cette action est DÉFINITIVE et ne peut pas être annulée. Confirmer ?")
- Effets du bannissement :
  - Mêmes effets immédiats que la suspension (paniers retirés, réservations annulées, remboursements)
  - Le compte est désactivé de manière permanente
  - Le partenaire ne peut pas se réinscrire avec le même email, le même téléphone ou le même numéro BRN
- Le partenaire reçoit une notification (email) avec le motif de bannissement
- L'action est tracée dans le journal d'activité
- Le statut du partenaire passe à "banni"
- Seul un super-admin peut lever un bannissement (cas exceptionnel)

---

---

### US-A016 -- Configurer la commission d'un partenaire spécifique
**En tant qu'** admin BienBon, **je veux** configurer le taux de commission ou le montant fixe de commission pour un partenaire spécifique **afin d'** adapter les conditions commerciales en fonction des accords négociés.

**Critères d'acceptation :**
- Accessible depuis la fiche du partenaire, section "Commission"
- Options de configuration :
  - **Taux de commission (%)** : pourcentage prélevé sur chaque transaction (ex. : 25%)
  - **Montant fixe par transaction** : montant fixe en roupies prélevé sur chaque transaction (ex. : 75 Rs)
  - **Fee minimum par transaction** : montant minimum de commission par transaction, surchargeable par rapport au paramètre global (défaut global : 50 Rs)
- Si aucune configuration spécifique n'est définie, le partenaire hérite des paramètres globaux de la plateforme
- Un indicateur visuel montre clairement si le partenaire utilise la configuration globale ou une configuration spécifique
- Bouton "Réinitialiser aux paramètres globaux" pour supprimer la surcharge
- Toute modification de commission est tracée dans le journal d'activité avec les valeurs avant/après
- La nouvelle configuration s'applique aux transactions futures (pas de rétroactivité)
- Un récapitulatif du calcul de commission est affiché (simulation sur une transaction type)

---

---

### US-A017 -- Historique des prix pratiqués par un partenaire
**En tant qu'** admin BienBon, **je veux** consulter l'historique des prix pratiqués par un partenaire (valeur initiale déclarée et prix de vente) **afin de** détecter les partenaires qui gonflent artificiellement la valeur initiale pour simuler une fausse bonne affaire.

**Critères d'acceptation :**
- Accessible depuis la fiche du partenaire, section dédiée "Historique des prix"
- Pour chaque panier publié (passé et présent), affichage de :
  - Date de publication
  - Titre du panier
  - Valeur initiale déclarée
  - Prix de vente
  - Taux de réduction effectif (calculé automatiquement)
- Graphique d'évolution montrant la tendance des valeurs initiales déclarées dans le temps
- Mise en évidence visuelle (alerte couleur) des paniers dont la valeur initiale est significativement supérieure à la moyenne du partenaire ou à la moyenne du type de commerce
- Comparaison possible avec la moyenne des partenaires du même type de commerce
- Indicateur de "score de cohérence des prix" : calcul automatique basé sur la régularité des prix déclarés
- Possibilité de filtrer par période
- Si une anomalie est détectée, l'admin peut ajouter un signalement interne sur la fiche du partenaire

---

## 3.3 Gestion des Consommateurs

---

## Mockups

### admin-partner-list

```
┌────────────────────────────────────────────────────────────────────┐
│  BienBon Admin                                 👤 Admin · FR ▼   │
├─────────┬──────────────────────────────────────────────────────────┤
│         │  Partenaires > Demandes en attente        🔴 3 en att. │
│ 📊 Dash │                                                        │
│ 👥 Part.│  Trier par : [ Date soumission ▼ ]  [ Type ▼ ]        │
│  🔴 3   │                                                        │
│ 🛒 Conso│  ┌────┬──────────────┬───────────┬──────────┬────────┐ │
│ ⚖ Modér│  │ #  │ Commerce     │ Type      │ Date     │ Canal  │ │
│ 💰 Fact.│  ├────┼──────────────┼───────────┼──────────┼────────┤ │
│ 📋 Audit│  │ 1  │ Chez Ravi    │ Traiteur  │ 04/02 9h │ Web    │ │
│ 🛡 Fraud│  │    │ Resp: Ravi   │           │ (3j ago) │        │ │
│ ⚙ Param│  │    │ Patel        │           │          │        │ │
│         │  ├────┼──────────────┼───────────┼──────────┼────────┤ │
│         │  │ 2  │ Fleur de Sel │ Restaurant│ 05/02 14h│ Kit    │ │
│         │  │    │ Resp: Marie  │           │ (2j ago) │ terrain│ │
│         │  │    │ Dupont       │           │          │        │ │
│         │  ├────┼──────────────┼───────────┼──────────┼────────┤ │
│         │  │ 3  │ Sweet Corner │ Pâtisserie│ 06/02 11h│ Web    │ │
│         │  │    │ Resp: Anisha │           │ (1j ago) │        │ │
│         │  │    │ Doorgakant   │           │          │        │ │
│         │  └────┴──────────────┴───────────┴──────────┴────────┘ │
│         │                                                        │
│         │  Affichage 1-3 sur 3          [ < ] Page 1/1 [ > ]    │
│         │                                                        │
│         │  Onglets : [En attente (3)] [Modifs en attente (2)]   │
│         │            [Tous les partenaires (45)]                 │
│         │                                                        │
└─────────┴──────────────────────────────────────────────────────────┘
```

### admin-partner-detail

```
┌────────────────────────────────────────────────────────────────────┐
│  BienBon Admin                                 👤 Admin · FR ▼   │
├─────────┬──────────────────────────────────────────────────────────┤
│         │  Partenaires > Le Chamarel             Statut: ● Actif │
│ 📊 Dash │                                                        │
│ 👥 Part.│  [Infos] [Stats] [Commission] [Paniers] [Modifs]      │
│ 🛒 Conso│  [Facturation] [Prix] [Journal]                        │
│ ⚖ Modér│                                                        │
│ 💰 Fact.│  ┌─ Informations générales ──────────────────────┐     │
│ 📋 Audit│  │ Nom       : Le Chamarel                       │     │
│ 🛡 Fraud│  │ Type      : Restaurant                        │     │
│ ⚙ Param│  │ Adresse   : 14 Rue du Vieux Moulin,           │     │
│         │  │             Chamarel, Port-Louis               │     │
│         │  │ BRN       : C07012345                          │     │
│         │  │ Horaires  : Lun-Sam 11h-15h, 18h-22h          │     │
│         │  │ Inscrit   : 15/01/2026                         │     │
│         │  │ Canal     : Web (auto-inscription)             │     │
│         │  │ Photos    : [📷 1] [📷 2] [📷 3] [📷 4]        │     │
│         │  │ Description :                                  │     │
│         │  │ Restaurant créole authentique au cœur de       │     │
│         │  │ Chamarel. Spécialités : curry cerf, rougaille  │     │
│         │  │ saucisses, mine frite.                         │     │
│         │  └────────────────────────────────────────────────┘     │
│         │                                                        │
│         │  ┌─ Responsable ─────────────────────────────────┐     │
│         │  │ Nom    : Jean-Marc Li Wan Po                  │     │
│         │  │ Email  : jm@lechamarel.mu                     │     │
│         │  │ Tél    : +230 5789 0123                        │     │
│         │  └───────────────────────────────────────────────┘     │
│         │                                                        │
│         │  [ ✏ Modifier ]  [ ⏸ Suspendre ]  [ 🚫 Bannir ]       │
│         │  [ 📋 Voir dans Audit Log ]                            │
│         │                                                        │
└─────────┴──────────────────────────────────────────────────────────┘
```

