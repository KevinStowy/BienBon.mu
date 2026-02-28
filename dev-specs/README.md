# BienBon — Specifications fonctionnelles & design

> Documentation complete pour le developpement de l'application BienBon,
> plateforme anti-gaspillage alimentaire a Maurice.

---

## Presentation

**BienBon** permet aux consommateurs d'acheter des paniers surprises a prix reduit aupres de commercants partenaires, evitant ainsi le gaspillage alimentaire. L'app fonctionne a l'ile Maurice.

**Mascotte** : le dodo (oiseau emblematique de Maurice), vert avec un bec orange, portant un panier.

---

## Structure du dossier

```
dev-specs/
├── README.md                          ← Ce fichier
├── charte-graphique.md                ← Design system complet
│
├── us/                                ← User Stories par module
│   ├── 01-consommateur/               ← 70 US (app mobile consommateur)
│   │   ├── inscription-connexion.md
│   │   ├── login-password.md
│   │   ├── onboarding.md
│   │   ├── carte-recherche.md
│   │   ├── fiche-partenaire.md
│   │   ├── reservation.md
│   │   ├── paiement.md
│   │   ├── retrait-qr.md
│   │   ├── avis-notes.md
│   │   ├── reclamations.md
│   │   ├── favoris.md
│   │   ├── profil-compte.md
│   │   ├── partage-impact-gamification.md
│   │   ├── support.md
│   │   └── notifications.md
│   │
│   ├── 02-partenaire/                 ← 45 US (app partenaire)
│   │   ├── inscription-validation.md
│   │   ├── onboarding.md
│   │   ├── gestion-commerce.md
│   │   ├── paniers-manuels.md
│   │   ├── paniers-recurrents.md
│   │   ├── reservations-retraits.md
│   │   ├── statistiques.md
│   │   ├── notifications.md
│   │   └── facturation-reversements.md
│   │
│   ├── 03-admin/                      ← 43 US (backoffice admin)
│   │   ├── dashboard.md
│   │   ├── gestion-partenaires.md
│   │   ├── gestion-consommateurs.md
│   │   ├── moderation.md
│   │   ├── facturation.md
│   │   ├── audit-log.md
│   │   ├── anti-fraude.md
│   │   └── parametres.md
│   │
│   └── 04-web-emails-transversal/     ← 51 US (site web, emails, technique)
│       ├── site-vitrine-accueil.md
│       ├── site-vitrine-partenaire.md
│       ├── site-vitrine-pages.md
│       ├── emails-auth.md
│       ├── emails-reservation.md
│       ├── emails-partenaire.md
│       ├── emails-marketing.md
│       ├── emails-admin.md
│       ├── transversal-i18n.md
│       ├── transversal-performance.md
│       ├── transversal-securite.md
│       ├── transversal-accessibilite.md
│       └── transversal-donnees.md
│
└── assets/                            ← Illustrations generees (PNG transparent)
    ├── logos/
    │   ├── logo-principal.png
    │   ├── logo-avec-texte.png
    │   └── favicon-app-icon.png
    │
    ├── illustrations/
    │   ├── onboarding/
    │   │   ├── onboarding-1-anti-gaspi.png
    │   │   ├── onboarding-2-panier-surprise.png
    │   │   └── onboarding-3-notifications.png
    │   ├── empty-states/
    │   │   ├── empty-state-favoris.png
    │   │   ├── empty-state-notifications.png
    │   │   ├── empty-state-reservations.png
    │   │   ├── empty-state-avis.png
    │   │   ├── empty-state-carte-vide.png
    │   │   ├── empty-state-aucun-panier.png
    │   │   └── empty-state-404.png
    │   ├── impact/
    │   │   ├── impact-planete.png
    │   │   └── impact-partage-card.png
    │   ├── coming-soon/
    │   │   └── coming-soon.png
    │   └── site-vitrine/
    │       ├── hero-accueil.png
    │       ├── vitrine-etape-1-cherche.png
    │       ├── vitrine-etape-2-reserve.png
    │       ├── vitrine-etape-3-retire.png
    │       └── vitrine-page-partenaire.png
    │
    ├── badges/
    │   ├── badge-premier-pas.png
    │   ├── badge-eco-citoyen.png
    │   ├── badge-super-sauveur.png
    │   ├── badge-heros-anti-gaspi.png
    │   ├── badge-legende.png
    │   ├── badge-parrain.png
    │   ├── badge-ambassadeur.png
    │   └── badge-verrouille.png
    │
    └── map-markers/
        ├── map-marker-disponible.png
        ├── map-marker-epuise.png
        └── map-marker-position.png
```

---

## Modules de l'application

| Module | Cible | US | Plateforme |
|---|---|---|---|
| Consommateur | Grand public | 70 US | PWA mobile |
| Partenaire | Commercants | 45 US | PWA mobile/tablette |
| Admin | Equipe BienBon | 43 US | Web desktop |
| Site vitrine | Visiteurs | 11 US | Web responsive |
| Emails | Tous | 14 US | HTML email |
| Transversal | Technique | 19 US | Toutes plateformes |

**Total : 206 User Stories validees**

---

## Modele economique

- Le **consommateur** paie un panier surprise a prix reduit (ex: 150 Rs au lieu de 400 Rs)
- **BienBon** encaisse le paiement
- **BienBon** reverse au partenaire le montant moins la commission (ex: 15%)
- Le partenaire recoit un **reversement** (pas une facture — c'est BienBon qui paie le partenaire)

---

## Parcours principaux

### Consommateur
1. Inscription / connexion (Google, Facebook, Apple, email)
2. Onboarding 3 ecrans (concept, fonctionnement, permissions)
3. Carte interactive → recherche paniers disponibles
4. Fiche partenaire → detail du panier
5. Reservation → paiement (CB, MCB Juice, Blink, my.t money)
6. Retrait sur place → scan QR code
7. Notation + avis

### Partenaire
1. Inscription → soumission dossier (BRN, Food Dealer's Licence si alimentaire)
2. Validation par admin → onboarding
3. Configuration commerce (horaires, photos, coordonnees)
4. Creation paniers (manuels ou recurrents)
5. Gestion reservations → scan QR retrait
6. Dashboard stats + historique
7. Suivi reversements

### Admin
1. Dashboard KPI temps reel
2. Validation/rejet dossiers partenaires
3. Gestion consommateurs (suspension, bannissement)
4. Moderation avis + reclamations
5. Facturation + reversements
6. Journal d'audit + anti-fraude

---

## Stack technique suggeree

| Composant | Technologie |
|---|---|
| Frontend mobile | React Native / Expo (ou Flutter) |
| Frontend web | Next.js / React |
| Backend API | Node.js + Express (ou NestJS) |
| Base de donnees | PostgreSQL |
| Auth | Firebase Auth ou Auth0 |
| Paiement | Stripe (CB) + integrations locales (MCB Juice, Blink, my.t) |
| Carte | Mapbox ou Google Maps |
| QR Code | qrcode.js (generation) + scanner camera |
| Push notifications | Firebase Cloud Messaging |
| Emails | SendGrid ou Resend |
| Stockage images | AWS S3 ou Cloudinary |
| Hebergement | AWS / Vercel / Railway |

---

## Langues supportees

| Langue | Code | Priorite |
|---|---|---|
| Francais | fr | Principale |
| Anglais | en | Secondaire |
| Creole mauricien | mu | Tertiaire |

---

## Pour demarrer

1. Lire `charte-graphique.md` pour le design system
2. Parcourir les US par module dans `us/`
3. Chaque fichier US contient les specs, les mockups ASCII et les assets references
4. Les images sont dans `assets/` (PNG transparent, prets a integrer)
5. Les icones standard viennent de [Lucide](https://lucide.dev)
6. Les logos tiers (Visa, Google, etc.) sont des assets officiels a telecharger
