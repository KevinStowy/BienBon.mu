# Site Vitrine -- Accueil et Comment ca marche

## User Stories couvertes

- US-W001 -- Page d'accueil
- US-W002 -- Page "Comment ca marche"

---

## US-W001 -- Page d'accueil

**Titre :** Page d'accueil

**En tant que** visiteur, **je veux** voir une page d'accueil attrayante presentant le concept BienBon **afin de** comprendre rapidement le service et etre incite a utiliser la webapp ou a devenir partenaire.

**Criteres d'acceptation :**
- La page presente clairement le concept anti-gaspi et le principe du panier surprise a prix reduit
- Un titre accrocheur et un sous-titre expliquent la proposition de valeur en une phrase
- Une section "Chiffres cles" affiche des statistiques (nombre de paniers sauves, nombre de partenaires, nombre de consommateurs inscrits) ; si les donnees ne sont pas encore disponibles (pre-lancement), la section est masquee ou affiche des objectifs
- Un compteur d'impact en temps reel est affiche de maniere proeminente (cf. US-W010)
- Un CTA (Call-to-Action) principal redirige vers la webapp pour les consommateurs (bouton "Decouvrir les paniers" ou equivalent)
- Un CTA secondaire redirige vers la page "Devenir partenaire" pour les commercants
- Les visuels sont de haute qualite, representatifs du contexte mauricien (commerces locaux, produits locaux)
- La page est responsive (mobile, tablette, desktop)
- Le temps de chargement de la page est inferieur a 3 secondes sur une connexion 3G
- La page est disponible en FR, EN et Creole mauricien selon la langue selectionnee par le visiteur
- Un footer commun est present avec les liens vers : CGU, Mentions Legales, Politique de Confidentialite, FAQ, Contact

---

## US-W002 -- Page "Comment ca marche"

**Titre :** Page "Comment ca marche"

**En tant que** visiteur, **je veux** comprendre etape par etape le fonctionnement de BienBon **afin de** savoir comment utiliser le service en tant que consommateur ou partenaire.

**Criteres d'acceptation :**
- La page est divisee en deux parcours distincts : Consommateur et Partenaire
- Parcours Consommateur presente les etapes : (1) Chercher les paniers autour de moi, (2) Reserver et payer en ligne, (3) Retirer mon panier au creneau indique, (4) Deguster et lutter contre le gaspillage
- Parcours Partenaire presente les etapes : (1) S'inscrire gratuitement, (2) Publier ses paniers surprise, (3) Les consommateurs reservent, (4) Valider le retrait et generer des revenus supplementaires
- Chaque etape est accompagnee d'une illustration ou d'une icone
- Un CTA "Commencer maintenant" redirige vers la webapp (consommateur) ou vers le formulaire d'inscription (partenaire)
- La page est responsive et disponible dans les trois langues
- Un lien vers la FAQ est propose en bas de page pour les questions supplementaires

---

## Mockups

### Accueil Desktop (US-W001)

```
┌─────────────────────────────────────────────────────────────────┐
│  BienBon        Accueil  Comment ca marche  FAQ  Blog           │
│                                    [FR|EN|KR]  [Ouvrir l'app]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│           Sauvez des repas, faites des economies !              │
│                                                                 │
│     Des paniers surprise a prix reduit pres de chez vous        │
│     a l'ile Maurice. Luttons ensemble contre le gaspillage.     │
│                                                                 │
│     ┌──────────────────────┐  ┌───────────────────────┐         │
│     │  Decouvrir les       │  │  Devenir partenaire   │         │
│     │  paniers  >>>        │  │  >>>                  │         │
│     └──────────────────────┘  └───────────────────────┘         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                 COMPTEUR D'IMPACT EN TEMPS REEL                 │
│                                                                 │
│   ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│   │    1 247         │  │    3 118 kg      │  │   89           │ │
│   │  repas sauves    │  │  CO2 evites      │  │  partenaires   │ │
│   └─────────────────┘  └─────────────────┘  └────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    COMMENT CA MARCHE ?                           │
│                                                                 │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│   │  [ 1 ]   │   │  [ 2 ]   │   │  [ 3 ]   │   │  [ 4 ]   │   │
│   │ Cherchez │   │ Reservez │   │ Retirez  │   │Degustez  │   │
│   │ les      │   │ et payez │   │ votre    │   │ et       │   │
│   │ paniers  │   │ en ligne │   │ panier   │   │ sauvez ! │   │
│   └──────────┘   └──────────┘   └──────────┘   └──────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                  NOS PARTENAIRES A MAURICE                      │
│                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│   │ [  photo  ]  │  │ [  photo  ]  │  │ [  photo  ]  │         │
│   │ Boulangerie  │  │ Restaurant   │  │ Hotel        │         │
│   │ du Port      │  │ Le Chamarel  │  │ Le Morne     │         │
│   │ Port-Louis   │  │ Chamarel     │  │ Le Morne     │         │
│   └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│         ┌─────────────────────────────────┐                     │
│         │  Decouvrir tous les partenaires │                     │
│         └─────────────────────────────────┘                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    TEMOIGNAGES                                  │
│                                                                 │
│   "Super concept ! J'ai sauve un                                │
│    panier de viennoiseries pour           Marie T.              │
│    seulement 100 Rs !"                    Curepipe              │
│                                                                 │
│   "Moins de gaspillage et plus de                               │
│    clients. BienBon est genial !"         Chef Ravi             │
│                                           Boulangerie du Port   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  BienBon                                                        │
│  Ensemble contre le gaspillage alimentaire a Maurice            │
│                                                                 │
│  A propos    Aide       Legal           Suivez-nous             │
│  Concept     FAQ        CGU             Facebook                │
│  Partenaires Contact    Mentions        Instagram               │
│  Blog                   Legales         Twitter                 │
│                         Confidentialite                         │
│                         Gerer les                               │
│                         cookies                                 │
│                                                                 │
│  (c) 2026 BienBon Ltd. Tous droits reserves.                    │
│  Port-Louis, Ile Maurice                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Comment ca marche -- Desktop (US-W002)

```
┌─────────────────────────────────────────────────────────────────┐
│  BienBon        Accueil  Comment ca marche  FAQ  Blog           │
│                                    [FR|EN|KR]  [Ouvrir l'app]  │
├─────────────────────────────────────────────────────────────────┤
│  Accueil > Comment ca marche                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              Comment ca marche ?                                │
│                                                                 │
│   ┌──────────────────────────┐ ┌──────────────────────────┐    │
│   │  [CONSOMMATEUR]          │ │   PARTENAIRE             │    │
│   └──────────────────────────┘ └──────────────────────────┘    │
│                                                                 │
│   -- PARCOURS CONSOMMATEUR ───────────────────────────────     │
│                                                                 │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│   │ [icone]  │   │ [icone]  │   │ [icone]  │   │ [icone]  │   │
│   │ ETAPE 1  │   │ ETAPE 2  │   │ ETAPE 3  │   │ ETAPE 4  │   │
│   │ Cherchez │   │ Reservez │   │ Retirez  │   │Degustez  │   │
│   │ les      │   │ et payez │   │ votre    │   │ et       │   │
│   │ paniers  │   │ en       │   │ panier   │   │ luttez   │   │
│   │ autour   │   │ ligne    │   │ au       │   │ contre   │   │
│   │ de moi   │   │          │   │ creneau  │   │ le       │   │
│   │          │   │          │   │ indique  │   │ gaspi !  │   │
│   └──────────┘   └──────────┘   └──────────┘   └──────────┘   │
│                                                                 │
│            ┌───────────────────────────────┐                    │
│            │ Commencer maintenant  >>>     │                    │
│            └───────────────────────────────┘                    │
│                                                                 │
│   -- PARCOURS PARTENAIRE ──────────────────────────────────    │
│                                                                 │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│   │ [icone]  │   │ [icone]  │   │ [icone]  │   │ [icone]  │   │
│   │ ETAPE 1  │   │ ETAPE 2  │   │ ETAPE 3  │   │ ETAPE 4  │   │
│   │Inscrivez │   │ Publiez  │   │ Les      │   │ Validez  │   │
│   │ -vous    │   │ vos      │   │ clients  │   │ les      │   │
│   │ gratuit- │   │ paniers  │   │ reservent│   │ retraits │   │
│   │ ement    │   │ surprise │   │          │   │ et       │   │
│   │          │   │          │   │          │   │ gagnez ! │   │
│   └──────────┘   └──────────┘   └──────────┘   └──────────┘   │
│                                                                 │
│            ┌───────────────────────────────┐                    │
│            │ Devenir partenaire  >>>       │                    │
│            └───────────────────────────────┘                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│   Des questions ? Consultez notre FAQ                           │
│   ┌──────────────────┐                                          │
│   │ Voir la FAQ  >>> │                                          │
│   └──────────────────┘                                          │
├─────────────────────────────────────────────────────────────────┤
│  (c) 2026 BienBon Ltd. | CGU | Mentions | Confidentialite      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Assets requis

| Asset | Chemin | Utilisation |
|-------|--------|-------------|
| Hero accueil | `../../assets/illustrations/site-vitrine/hero-accueil.png` | Image principale de la page d'accueil |
| Etape 1 -- Chercher | `../../assets/illustrations/site-vitrine/vitrine-etape-1-cherche.png` | Illustration etape "Comment ca marche" |
| Etape 2 -- Reserver | `../../assets/illustrations/site-vitrine/vitrine-etape-2-reserve.png` | Illustration etape "Comment ca marche" |
| Etape 3 -- Retirer | `../../assets/illustrations/site-vitrine/vitrine-etape-3-retire.png` | Illustration etape "Comment ca marche" |
| Logo principal | `../../assets/logos/logo-principal.png` | Header du site vitrine |
| Logo avec texte | `../../assets/logos/logo-avec-texte.png` | Footer du site vitrine |
| Favicon / App icon | `../../assets/logos/favicon-app-icon.png` | Favicon du site |
| Impact planete | `../../assets/illustrations/impact/impact-planete.png` | Section compteur d'impact |
