# Gestion des consommateurs

> US couvertes : US-A018, US-A019, US-A020, US-A021, US-A022

---

### US-A018 -- Voir la liste des consommateurs
**En tant qu'** admin BienBon, **je veux** voir la liste de tous les consommateurs inscrits sur la plateforme **afin de** gérer la base d'utilisateurs.

**Critères d'acceptation :**
- Liste paginée affichant : nom, prénom, email, téléphone, date d'inscription, nombre total de réservations, nombre de no-shows, statut du compte (actif, suspendu, banni)
- Recherche par nom, prénom, email ou téléphone
- Filtres disponibles : par statut (actif, suspendu, banni), par date d'inscription (période), par activité (actif récemment, inactif depuis X jours)
- Tri possible par : date d'inscription, nombre de réservations, nombre de no-shows, nom alphabétique
- Export de la liste en CSV avec les filtres appliqués

---

---

### US-A019 -- Voir la fiche complète d'un consommateur
**En tant qu'** admin BienBon, **je veux** voir toutes les informations d'un consommateur sur une fiche unique et détaillée **afin d'** analyser son comportement et son historique complet.

**Critères d'acceptation :**
- La fiche affiche les sections suivantes :
  - **Informations personnelles** : nom, prénom, email, téléphone, photo de profil, date d'inscription, méthode d'inscription (email, téléphone, Google, Facebook, Apple), préférences alimentaires, statut du compte
  - **Statistiques** : nombre total de réservations, nombre de retraits validés, nombre de no-shows, taux de no-show (%), nombre de réclamations ouvertes, nombre de réclamations résolues (favorablement/défavorablement), montant total dépensé, nombre de parrainages envoyés/acceptés, partenaires favoris
  - **Historique complet des réservations** : liste paginée avec date, partenaire, panier, montant, statut (réservé, retiré, no-show, annulé par consommateur, annulé par partenaire)
  - **Historique des réclamations** : liste avec date, partenaire, motif, résolution
  - **Journal d'activité** : timeline de toutes les actions du consommateur
- Lien direct vers le parcours complet du consommateur dans l'Audit Log
- Indicateurs d'alerte si le consommateur présente un comportement suspect (ratio de no-shows élevé, réclamations systématiques)

---

---

### US-A020 -- Suspendre un consommateur
**En tant qu'** admin BienBon, **je veux** suspendre temporairement un consommateur **afin de** le désactiver suite à un comportement problématique (no-shows répétés, abus de réclamations, fraude suspectée).

**Critères d'acceptation :**
- Motif de suspension obligatoire (texte libre)
- Confirmation requise avant suspension
- Effets de la suspension :
  - Le consommateur ne peut plus se connecter
  - Le consommateur ne peut plus effectuer de réservations
  - Les réservations en cours (non encore retirées) sont annulées automatiquement
  - Les pré-autorisations correspondantes sont levées (remboursement)
  - Le consommateur est notifié par email avec le motif de suspension
- L'action est tracée dans le journal d'activité
- Le statut du consommateur passe à "suspendu"

---

---

### US-A021 -- Réactiver un consommateur suspendu
**En tant qu'** admin BienBon, **je veux** réactiver un consommateur précédemment suspendu **afin de** lui redonner accès à la plateforme.

**Critères d'acceptation :**
- Bouton "Réactiver" visible uniquement sur les fiches de consommateurs en statut "suspendu"
- Un commentaire de réactivation peut être saisi (optionnel)
- Le consommateur retrouve l'accès complet à son compte et à toutes les fonctionnalités
- Le consommateur est notifié de la réactivation (email + push)
- L'action est tracée dans le journal d'activité
- Le statut du consommateur repasse à "actif"

---

---

### US-A022 -- Bannir un consommateur
**En tant qu'** admin BienBon, **je veux** bannir définitivement un consommateur **afin de** l'exclure de la plateforme de manière permanente.

**Critères d'acceptation :**
- Motif de bannissement obligatoire (texte libre)
- Double confirmation requise ("Cette action est DÉFINITIVE. Confirmer ?")
- Effets du bannissement :
  - Mêmes effets immédiats que la suspension (déconnexion, annulation réservations, remboursements)
  - Le compte est désactivé de manière permanente
  - Le consommateur ne peut pas se réinscrire avec le même email ou le même numéro de téléphone
- Le consommateur est notifié par email avec le motif de bannissement
- L'action est tracée dans le journal d'activité
- Le statut du consommateur passe à "banni"
- Seul un super-admin peut lever un bannissement (cas exceptionnel)

---

## 3.4 Modération & Litiges

---

## Mockups

### admin-consumer-list

```
┌────────────────────────────────────────────────────────────────────┐
│  BienBon Admin                                 👤 Admin · FR ▼   │
├─────────┬──────────────────────────────────────────────────────────┤
│         │  Consommateurs                                  1,247  │
│ 📊 Dash │                                                        │
│ 👥 Part.│  🔍 [ Rechercher nom, email, tél...          ]         │
│ 🛒 Conso│                                                        │
│ ⚖ Modér│  Filtres: [Statut ▼] [Date inscr. ▼] [Activité ▼]    │
│ 💰 Fact.│  Trier:  [Date inscription ▼]     [ 📥 Export CSV ]   │
│ 📋 Audit│                                                        │
│ 🛡 Fraud│  ┌────┬────────────────┬──────────────┬─────┬────┬───┐ │
│ ⚙ Param│  │ #  │ Nom            │ Email        │Rés. │N-S │St.│ │
│         │  ├────┼────────────────┼──────────────┼─────┼────┼───┤ │
│         │  │ 1  │ Priya Doorgak. │ priya@gm.com │  47 │  1 │ ● │ │
│         │  │    │ +230 5712 3456 │ 15/01/2026   │     │ 2% │   │ │
│         │  ├────┼────────────────┼──────────────┼─────┼────┼───┤ │
│         │  │ 2  │ Raj Doorgakant │ raj@out.com  │  23 │  8 │ ● │ │
│         │  │    │ +230 5987 6543 │ 16/01/2026   │     │35% │ ⚠ │ │
│         │  ├────┼────────────────┼──────────────┼─────┼────┼───┤ │
│         │  │ 3  │ Sophie Martin  │ sm@yah.com   │  12 │  0 │ ● │ │
│         │  │    │ +230 5456 7890 │ 18/01/2026   │     │ 0% │   │ │
│         │  ├────┼────────────────┼──────────────┼─────┼────┼───┤ │
│         │  │ 4  │ Kevin Chang    │ kc@gm.com    │   0 │  0 │ ⏸ │ │
│         │  │    │ +230 5321 0987 │ 20/01/2026   │     │ -- │   │ │
│         │  ├────┼────────────────┼──────────────┼─────┼────┼───┤ │
│         │  │ 5  │ Fatima Joomun  │ fj@hot.com   │  31 │ 15 │ 🚫│ │
│         │  │    │ +230 5678 1234 │ 16/01/2026   │     │48% │   │ │
│         │  └────┴────────────────┴──────────────┴─────┴────┴───┘ │
│         │  ● Actif  ⏸ Suspendu  🚫 Banni  ⚠ No-show élevé      │
│         │                                                        │
│         │  Affichage 1-5 sur 1,247     [ < ] Page 1/250 [ > ]   │
│         │                                                        │
└─────────┴──────────────────────────────────────────────────────────┘
```

