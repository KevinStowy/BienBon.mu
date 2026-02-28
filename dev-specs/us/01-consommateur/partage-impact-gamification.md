# Partage, Impact & Gamification

> US couvertes : US-C058, US-C059, US-C060

---

### US-C058 — Partager un panier ou un partenaire
**En tant que** consommateur, **je veux** partager un panier ou un partenaire avec mes proches **afin de** leur faire découvrir BienBon et les bons plans (LACUNE #2).

**Critères d'acceptation :**
- Un bouton de partage (icône partage) est présent sur : le détail d'un panier, la fiche d'un partenaire
- Le clic sur le bouton ouvre le menu de partage natif de l'appareil (share sheet)
- Les options de partage incluent au minimum : WhatsApp, SMS, Copier le lien, et toutes les applications de partage installées sur l'appareil
- Le contenu partagé est un lien profond (deep link) qui ouvre directement la page du panier ou du partenaire dans l'app BienBon (ou la webapp si l'app n'est pas installée)
- Le message pré-rempli contient : "Regarde ce panier surprise chez [partenaire] sur BienBon ! [prix] Rs au lieu de [valeur initiale] Rs. [lien]" (pour un panier) ou "Découvre [partenaire] sur BienBon ! [lien]" (pour un partenaire)
- Le message pré-rempli est modifiable par le consommateur avant envoi
- Le partage est possible en mode invité (sans inscription)
- Le lien partagé fonctionne même si le destinataire n'a pas l'app installée (redirection vers la webapp)

---

---

### US-C059 — Voir mon impact anti-gaspi
**En tant que** consommateur, **je veux** voir mon impact personnel sur la lutte contre le gaspillage alimentaire **afin de** me sentir valorisé et motivé à continuer (LACUNE #3).

**Critères d'acceptation :**
- Accessible depuis Profil > Mon impact ou depuis un onglet/section dédié dans le menu
- Statistiques affichées :
  - Nombre total de paniers sauvés (réservés et retirés)
  - Économies réalisées en Rs (différence entre valeur initiale et prix payé)
- Aucune mention de CO2 évité ni d'équivalent carbone n'est affichée
- Visualisation graphique de l'évolution dans le temps (graphique simple)
- **Gamification — Badges et niveaux (basés sur le nombre de paniers sauvés, pas sur le CO2) :**
  - Badge "Premier pas" : 1er panier sauvé
  - Badge "Éco-citoyen" : 5 paniers sauvés
  - Badge "Super Sauveur" : 25 paniers sauvés
  - Badge "Héros anti-gaspi" : 50 paniers sauvés
  - Badge "Légende BienBon" : 100 paniers sauvés
  - Badge "Parrain/Marraine" : 1er filleul inscrit
  - Badge "Ambassadeur" : 5 filleuls inscrits
- Les badges non encore obtenus sont affichés en grisé avec la condition pour les débloquer
- Une notification push est envoyée lorsqu'un nouveau badge est débloqué : "Félicitations ! Vous avez débloqué le badge [nom du badge] !"
- Le consommateur peut partager son impact sur les réseaux sociaux (bouton "Partager mon impact")

---

---

### US-C060 — Programme de parrainage
**En tant que** consommateur, **je veux** inviter mes amis à rejoindre BienBon et être récompensé lorsqu'ils s'inscrivent et font leur premier achat **afin de** profiter d'avantages et contribuer à la croissance de la communauté (LACUNE #16).

**Critères d'acceptation :**
- Accessible depuis Profil > Parrainage ou depuis un bouton "Inviter un ami" dans le menu
- Chaque consommateur dispose d'un code de parrainage unique (ex. "KEVIN2026" ou code aléatoire)
- Le consommateur peut partager son code/lien de parrainage via WhatsApp, SMS, copier le lien, ou toute application de partage installée
- Le lien de parrainage redirige vers la page d'inscription avec le code pré-rempli
- **Conditions pour que le parrainage soit valide :**
  - Le filleul s'inscrit avec le code de parrainage
  - Le filleul effectue sa première réservation ET retire effectivement le panier (pas de no-show, pas d'annulation)
- **Récompenses :**
  - Le parrain reçoit une notification et un crédit/avantage défini par l'admin BienBon (ex. un bon de réduction ou un crédit sur sa prochaine réservation)
  - Le filleul reçoit également un avantage de bienvenue (ex. réduction sur sa première commande)
  - Les récompenses sont configurables par l'admin BienBon depuis le backoffice
- Le consommateur peut voir le statut de ses parrainages : nombre de filleuls invités, nombre de filleuls inscrits, nombre de filleuls ayant fait leur premier achat, récompenses reçues
- Un parrainage n'est pas valide si le filleul avait déjà un compte (même désactivé/supprimé) avec le même email ou téléphone
- Un consommateur ne peut pas se parrainer lui-même

---

## 1.12 Support & Contact

---

---

## Mockups

### consumer-sharing

```
┌─────────────────────────────────┐
│  < Retour                  🔗  │
│                                 │
│  Le Chamarel                    │
│  Panier Surprise                │
│  Rs 150 → Rs 50                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │  Partager                 │  │
│  │                           │  │
│  │  Regarde ce panier        │  │
│  │  surprise chez Le         │  │
│  │  Chamarel sur BienBon !   │  │
│  │  Rs 50 au lieu de Rs 150. │  │
│  │  https://bienbon.mu/p/123 │  │
│  │                           │  │
│  │  ┌──────┐ ┌──────┐       │  │
│  │  │  WA  │ │  SMS │       │  │
│  │  └──────┘ └──────┘       │  │
│  │  ┌──────┐ ┌──────┐       │  │
│  │  │Copier│ │ Plus │       │  │
│  │  │ lien │ │  ... │       │  │
│  │  └──────┘ └──────┘       │  │
│  │                           │  │
│  │  ┌─────────────────────┐  │  │
│  │  │     ANNULER         │  │  │
│  │  └─────────────────────┘  │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

---

## Assets requis

| Asset | Chemin |
|-------|--------|
| impact-planete.png | `../../assets/illustrations/impact/impact-planete.png` |
| impact-partage-card.png | `../../assets/illustrations/impact/impact-partage-card.png` |
| badge-premier-pas.png | `../../assets/badges/badge-premier-pas.png` |
| badge-eco-citoyen.png | `../../assets/badges/badge-eco-citoyen.png` |
| badge-super-sauveur.png | `../../assets/badges/badge-super-sauveur.png` |
| badge-heros-anti-gaspi.png | `../../assets/badges/badge-heros-anti-gaspi.png` |
| badge-legende.png | `../../assets/badges/badge-legende.png` |
| badge-parrain.png | `../../assets/badges/badge-parrain.png` |
| badge-ambassadeur.png | `../../assets/badges/badge-ambassadeur.png` |
| badge-verrouille.png | `../../assets/badges/badge-verrouille.png` |

