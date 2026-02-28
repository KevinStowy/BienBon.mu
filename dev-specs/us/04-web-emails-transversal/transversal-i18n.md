# Internationalisation (i18n)

> US couvertes : US-T001, US-T002, US-T003, US-T004

---

### US-T001 — Protection contre les comptes suspendus et bannis
**En tant que** système, **je veux** empêcher tout utilisateur suspendu ou banni d'accéder aux fonctionnalités de la plateforme **afin d'** appliquer les décisions d'administration et protéger l'intégrité du service.

**Critères d'acceptation :**
- Un utilisateur suspendu qui tente de se connecter voit un écran dédié l'informant de sa suspension
- Le message de suspension affiche : le motif (tel que saisi par l'admin), la date de suspension, les coordonnées de contact pour contester
- Un utilisateur banni qui tente de se connecter voit un écran dédié l'informant de son bannissement définitif
- Le message de bannissement affiche : le motif, la date de bannissement, les coordonnées de contact pour contester
- Si la session est déjà active au moment de la suspension/bannissement, l'utilisateur est déconnecté automatiquement dans un délai raisonnable (5 minutes maximum ou au prochain appel API)
- Aucune action n'est possible (réservation, publication de panier, modification de profil, etc.) tant que le compte est suspendu ou banni
- Les tentatives de connexion d'un compte suspendu/banni sont journalisées dans l'audit log
- La vérification du statut du compte est effectuée à chaque requête authentifiée (pas uniquement à la connexion)

---

### US-T002 — Masquage des partenaires suspendus et bannis
**En tant que** système, **je veux** masquer les partenaires suspendus ou bannis de toute visibilité publique **afin de** ne pas afficher de commerces inactifs ou exclus aux consommateurs.

**Critères d'acceptation :**
- Les partenaires suspendus ou bannis n'apparaissent plus sur la carte interactive
- Ils n'apparaissent plus dans les résultats de recherche
- Ils n'apparaissent plus dans les résultats de filtres
- Leurs paniers ne sont pas visibles, même s'ils étaient publiés avant la suspension
- Si un consommateur avait le partenaire en favori, il ne le voit plus dans sa liste de favoris (le favori est conservé en base pour restauration en cas de réactivation)
- Les liens directs vers la fiche d'un partenaire suspendu/banni affichent un message "Ce commerce n'est pas disponible actuellement"
- Les avis existants sur le partenaire restent en base mais ne sont plus visibles publiquement
- En cas de réactivation (pour les suspendus), la visibilité est restaurée automatiquement

---

### US-T003 — Gestion des paniers épuisés
**En tant que** système, **je veux** gérer correctement l'affichage et le comportement des paniers épuisés **afin de** ne pas frustrer les consommateurs en leur présentant des offres non disponibles.

**Critères d'acceptation :**
- Un panier dont le stock tombe à 0 (toutes les unités réservées) passe automatiquement en statut "épuisé"
- Un panier épuisé n'est plus réservable (le bouton "Réserver" est désactivé ou masqué)
- Comportement d'affichage (configurable) :
  - Option 1 : Le panier épuisé disparaît complètement des résultats de recherche et de la carte
  - Option 2 : Le panier épuisé reste visible mais affiche clairement "Épuisé" (badge visuel, griser) et n'est pas cliquable pour la réservation
- Si une annulation libère une unité, le panier repasse en statut "disponible" automatiquement et redevient réservable
- Le stock est mis à jour en temps réel côté consommateur (pas de cache périmé)
- Si un consommateur consulte la fiche d'un panier épuisé (via un lien direct ou un favori), il voit le message "Ce panier est actuellement épuisé" avec un CTA "Voir d'autres paniers"

---

### US-T004 — Gestion des créneaux expirés
**En tant que** système, **je veux** gérer les paniers dont le créneau de retrait est passé **afin de** ne pas afficher d'offres périmées et d'archiver correctement les données.

**Critères d'acceptation :**
- Un panier dont le créneau de retrait (heure de fin) est dépassé est automatiquement retiré de la visibilité publique (carte, recherche, filtres)
- Les réservations non validées à la fin du créneau passent automatiquement en statut "no-show" (cf. US-C033 et US-P024)
- Le panier est archivé dans l'historique du partenaire (US-P014)
- Le panier est archivé dans l'historique des réservations du consommateur si concerné (US-C024)
- La vérification de l'expiration est effectuée automatiquement par le système (tâche planifiée ou vérification à chaque requête)
- Le fuseau horaire de référence pour toutes les comparaisons d'heure est MUT (UTC+4)
- Le panier expiré n'est plus modifiable par le partenaire

---

## 6.2 Accessibilité et UX

---

## Mockups

### transversal-i18n

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│              ┌──────────────┐                         │
│              │  🍀 BienBon  │                         │
│              └──────────────┘                         │
│                                                       │
│                                                       │
│           ┌───────────────────────────────────┐       │
│           │                                   │       │
│           │        COMPTE SUSPENDU            │       │
│           │                                   │       │
│           │  Votre compte a été suspendu      │       │
│           │  temporairement.                  │       │
│           │                                   │       │
│           │  Motif :                          │       │
│           │  ┌─────────────────────────────┐  │       │
│           │  │ Plusieurs no-shows          │  │       │
│           │  │ consécutifs. Vous n'avez    │  │       │
│           │  │ pas retiré vos paniers      │  │       │
│           │  │ réservés à 3 reprises.      │  │       │
│           │  └─────────────────────────────┘  │       │
│           │                                   │       │
│           │  Date de suspension :             │       │
│           │  10 février 2026 à 14h30 (MUT)    │       │
│           │                                   │       │
│           │  Si vous pensez qu'il s'agit      │       │
│           │  d'une erreur, contactez-nous :   │       │
│           │  contact@bienbon.mu               │       │
│           │  +230 5XXX XXXX                   │       │
│           │                                   │       │
│           └───────────────────────────────────┘       │
│                                                       │
└───────────────────────────────────────────────────────┘
```

