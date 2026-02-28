# Site Vitrine -- Pages FAQ, Legales, 404, Navigation, Compteur, Coming Soon, Cookies, SEO

## User Stories couvertes

- US-W004 -- Page FAQ
- US-W005 -- Page CGU et CGV
- US-W006 -- Page Mentions Legales
- US-W007 -- Page Politique de Confidentialite
- US-W008 -- Page 404 personnalisee
- US-W009 -- Navigation vers la webapp
- US-W010 -- Compteur d'impact en temps reel sur la page d'accueil (LACUNE #41)
- US-W011 -- Mode Coming Soon pour le site vitrine (LACUNE #38)

---

## US-W004 -- Page FAQ

**Titre :** Page FAQ

**En tant que** visiteur, **je veux** consulter une FAQ organisee par categories **afin de** trouver rapidement des reponses a mes questions sans contacter le support.

**Criteres d'acceptation :**
- Les questions sont organisees par categories : General, Consommateur, Partenaire, Paiement, Retrait, Compte, Securite et Donnees
- Chaque question est affichee en format accordeon (clic pour deplier/replier la reponse)
- Une barre de recherche permet de filtrer les questions par mots-cles
- La recherche fonctionne sur le titre et le contenu des reponses
- Les resultats de recherche mettent en surbrillance le terme recherche
- La FAQ est disponible dans les trois langues (les questions et reponses sont traduites)
- Un lien "Vous n'avez pas trouve votre reponse ? Contactez-nous" est affiche en bas de page avec un lien vers un formulaire de contact ou une adresse email
- La page est responsive

---

## US-W005 -- Page CGU et CGV

**Titre :** Page CGU et CGV (Conditions Generales d'Utilisation et Conditions Generales de Vente)

**En tant que** visiteur, **je veux** consulter les Conditions Generales d'Utilisation et les Conditions Generales de Vente **afin de** connaitre les regles qui regissent l'utilisation et les transactions du service BienBon.

**Criteres d'acceptation :**
- La page affiche les CGU completes dans un format lisible avec table des matieres cliquable
- Les CGU couvrent au minimum : objet du service, conditions d'inscription, fonctionnement des reservations, politique d'annulation, responsabilites des parties, propriete intellectuelle, limitation de responsabilite, loi applicable (droit mauricien)
- Le contenu des CGU est gere depuis le backoffice admin (editeur WYSIWYG ou markdown)
- Chaque version est numerotee (ex: v1.0, v1.1) et datee
- L'historique des versions est conserve et consultable par l'admin
- Lors d'une mise a jour, les utilisateurs sont notifies et doivent re-accepter
- La page inclut aussi les Conditions Generales de Vente (CGV), gerees de la meme facon (contenu modifiable, versionne, date)
- La date de derniere mise a jour est affichee en haut du document
- Un lien d'acces est present dans le footer de toutes les pages du site
- La page est disponible dans les trois langues
- Un lien permet de telecharger les CGU et les CGV au format PDF
- La page est responsive

---

## US-W006 -- Page Mentions Legales

**Titre :** Page Mentions Legales

**En tant que** visiteur, **je veux** consulter les mentions legales **afin de** connaitre les informations legales de l'entite BienBon conformement a la reglementation mauricienne.

**Criteres d'acceptation :**
- La page affiche les informations obligatoires : denomination sociale, forme juridique, siege social, numero d'enregistrement au Registrar of Companies, capital social, nom du directeur/responsable, coordonnees de contact (email, telephone), hebergeur du site (nom, adresse, contact)
- Les informations sont conformes aux exigences de la legislation mauricienne (Companies Act 2001, ICT Act)
- Le contenu des Mentions Legales est gere depuis le backoffice admin
- Chaque modification est versionnee (numero de version + date)
- L'historique des versions est conserve
- Un lien d'acces est present dans le footer de toutes les pages
- La page est disponible dans les trois langues
- La page est responsive

---

## US-W007 -- Page Politique de Confidentialite

**Titre :** Page Politique de Confidentialite

**En tant que** visiteur, **je veux** consulter la politique de confidentialite **afin de** savoir comment BienBon collecte, utilise et protege mes donnees personnelles.

**Criteres d'acceptation :**
- La page detaille : les types de donnees collectees, les finalites du traitement, la base legale du traitement, les destinataires des donnees, la duree de conservation, les droits des utilisateurs (acces, rectification, suppression, portabilite, opposition), les modalites d'exercice des droits, les mesures de securite mises en place, l'utilisation de cookies et traceurs, les transferts de donnees hors de Maurice (le cas echeant)
- La politique est conforme au Data Protection Act 2017 de l'ile Maurice
- La reference au Data Protection Office de Maurice est incluse avec les coordonnees de contact
- Le contenu de la Politique de Confidentialite est gere depuis le backoffice admin
- Chaque modification est versionnee (numero de version + date)
- L'historique des versions est conserve
- Lors d'une mise a jour impactant les droits des utilisateurs, notification et re-acceptation requises
- La date de derniere mise a jour est affichee en haut du document
- Un lien d'acces est present dans le footer de toutes les pages
- La page est disponible dans les trois langues
- Un lien permet de telecharger la politique au format PDF
- La page est responsive

---

## US-W008 -- Page 404 personnalisee

**Titre :** Page 404 personnalisee

**En tant que** visiteur, **je veux** voir une page 404 personnalisee et coherente avec l'identite BienBon quand j'accede a une URL inexistante **afin de** ne pas etre perdu et pouvoir revenir a une page utile.

**Criteres d'acceptation :**
- Le design est coherent avec la charte graphique BienBon (couleurs, typographie, logo)
- Un message clair et sympathique indique que la page n'existe pas (ex: "Oups ! Ce panier semble avoir disparu...")
- Un visuel illustratif est affiche (illustration sur le theme anti-gaspi)
- Un lien "Retour a l'accueil" est present
- Un lien "Decouvrir les paniers" redirige vers la webapp
- Une barre de recherche est proposee (optionnel)
- La page est disponible dans les trois langues
- La page renvoie le code HTTP 404
- La page est responsive

---

## US-W009 -- Navigation vers la webapp

**Titre :** Navigation vers la webapp

**En tant que** visiteur, **je veux** acceder facilement a la webapp BienBon depuis n'importe quelle page du site vitrine **afin de** commencer a utiliser le service sans chercher le lien.

**Criteres d'acceptation :**
- Un bouton/lien proeminent "Ouvrir l'app" ou "Decouvrir les paniers" est present dans le header de navigation de toutes les pages
- Le lien redirige vers la webapp (sous-domaine ou domaine dedie)
- Sur mobile, le lien propose l'installation de la PWA si elle n'est pas deja installee
- La distinction entre le site vitrine (informatif) et la webapp (fonctionnel) est claire pour l'utilisateur
- Le bouton est visuellement mis en avant (couleur contrastee, position proeminente)
- Le lien est present dans le header et dans le footer

---

## US-W010 -- Compteur d'impact en temps reel sur la page d'accueil (LACUNE #41)

**Titre :** Compteur d'impact en temps reel sur la page d'accueil

**En tant que** visiteur, **je veux** voir un compteur d'impact en temps reel sur la page d'accueil affichant le nombre de repas sauves et les kg de CO2 evites **afin de** mesurer l'impact positif de BienBon et etre motive a participer.

**Criteres d'acceptation :**
- Le compteur affiche au minimum deux metriques : "X repas sauves" et "Y kg de CO2 evites"
- Les donnees sont mises a jour en temps reel ou quasi temps reel (rafraichissement toutes les 60 secondes maximum)
- Le calcul du CO2 evite est base sur une estimation moyenne par panier sauve (ex: 2,5 kg de CO2 par panier, valeur configurable par l'admin)
- Le compteur utilise une animation d'incrementation (effet de comptage progressif) lors du chargement de la page
- La section compteur d'impact sur la homepage est desactivable depuis le backoffice admin (toggle ON/OFF)
- Quand desactivee, la section n'apparait pas du tout sur la page d'accueil
- Par defaut : desactivee (a activer manuellement quand les chiffres sont significatifs)
- La page dediee /impact est aussi masquee quand la fonctionnalite est desactivee
- Le compteur est visuellement attractif et integre dans le design de la page d'accueil
- Les metriques sont coherentes avec les donnees affichees dans le dashboard admin (US-A001)
- Le compteur est responsive et lisible sur tous les supports
- Le compteur est disponible dans les trois langues

---

## US-W011 -- Mode Coming Soon pour le site vitrine (LACUNE #38)

**Titre :** Mode Coming Soon pour le site vitrine

**En tant qu'** administrateur, **je veux** pouvoir activer un mode "Coming Soon" sur le site vitrine **afin de** preparer le lancement.

**Criteres d'acceptation :**
- Toggle ON/OFF dans le backoffice admin
- Quand active : le site affiche une page "Coming Soon" avec le logo, un message d'accroche, un formulaire d'inscription a la newsletter (email), et les liens vers les reseaux sociaux
- Quand active : la connexion/inscription n'est pas possible, les boutons sont remplaces par "Bientot disponible"
- Le contenu de la page Coming Soon est personnalisable depuis le backoffice (texte, image)
- Quand desactive : le site fonctionne normalement
- Par defaut : active (a desactiver au lancement)
- Le consentement au traitement des donnees est recueilli (checkbox obligatoire conforme au Data Protection Act)
- La page est responsive et disponible dans les trois langues

---

## Mockups

### Page CGU et CGV (US-W005)

```
┌─────────────────────────────────────────────────────────────────┐
│  BienBon        Accueil  Comment ca marche  FAQ  Blog           │
│                                    [FR|EN|KR]  [Ouvrir l'app]  │
├─────────────────────────────────────────────────────────────────┤
│  Accueil > CGU et CGV                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Conditions Generales d'Utilisation et de Vente                │
│                                                                 │
│   Version : v1.2  |  Derniere mise a jour : 10 fevrier 2026     │
│                                                                 │
│   -- TABLE DES MATIERES ─────────────────────────────────      │
│   1. Objet du service                                           │
│   2. Conditions d'inscription                                   │
│   3. Fonctionnement des reservations                            │
│   4. Politique d'annulation                                     │
│   5. Conditions Generales de Vente (CGV)                        │
│   6. Responsabilites des parties                                │
│   7. Propriete intellectuelle                                   │
│   8. Limitation de responsabilite                               │
│   9. Loi applicable (droit mauricien)                           │
│                                                                 │
│   -- CONTENU (gere depuis le BO admin) ──────────────────      │
│   [Contenu modifiable via editeur WYSIWYG / markdown]           │
│                                                                 │
│   ┌──────────────────────────────────────┐                      │
│   │ Telecharger les CGU et CGV (PDF) >>> │                      │
│   └──────────────────────────────────────┘                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  (c) 2026 BienBon Ltd. | CGU et CGV | Mentions | Confidentialite│
└─────────────────────────────────────────────────────────────────┘
```

### Page 404 personnalisee -- Desktop (US-W008)

```
┌─────────────────────────────────────────────────────────────────┐
│  BienBon        Accueil  Comment ca marche  FAQ  Blog           │
│                                    [FR|EN|KR]  [Ouvrir l'app]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                  ┌──────────────────────┐                        │
│                  │   [Illustration      │                        │
│                  │    anti-gaspi        │                        │
│                  │    panier vide]      │                        │
│                  └──────────────────────┘                        │
│                                                                 │
│                         404                                     │
│                                                                 │
│            Oups ! Ce panier semble avoir                        │
│                    disparu...                                    │
│                                                                 │
│     La page que vous cherchez n'existe pas ou a ete             │
│     deplacee. Pas de gaspillage de temps, retrouvez             │
│     votre chemin !                                              │
│                                                                 │
│     ┌─────────────────────────────────────────────┐             │
│     │  Rechercher sur BienBon...                  │             │
│     └─────────────────────────────────────────────┘             │
│                                                                 │
│     ┌────────────────────────┐  ┌────────────────────────┐      │
│     │ Retour a l'accueil    │  │ Decouvrir les paniers  │      │
│     └────────────────────────┘  └────────────────────────┘      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  (c) 2026 BienBon Ltd. | CGU | Mentions | Confidentialite      │
└─────────────────────────────────────────────────────────────────┘
```

### Navigation Webapp + SEO (US-W009)

```
┌─────────────────────────────────────────────────────────────────┐
│  STRUCTURE SEO DE CHAQUE PAGE (meta-view)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  <head>                                                         │
│    <title>BienBon - Anti-gaspi a Maurice | Page</title>         │
│    <meta name="description" content="Sauvez des repas...">     │
│    <meta name="robots" content="index, follow">                 │
│    <link rel="canonical" href="https://bienbon.mu/page">       │
│                                                                 │
│    <!-- Open Graph -->                                          │
│    <meta property="og:title" content="...">                     │
│    <meta property="og:description" content="...">               │
│    <meta property="og:image" content="...">                     │
│    <meta property="og:url" content="...">                       │
│    <meta property="og:type" content="website">                  │
│                                                                 │
│    <!-- Twitter Card -->                                        │
│    <meta name="twitter:card" content="summary_large_image">     │
│    <meta name="twitter:title" content="...">                    │
│                                                                 │
│    <!-- Hreflang -->                                            │
│    <link rel="alternate" hreflang="fr" href="/.../fr/...">      │
│    <link rel="alternate" hreflang="en" href="/.../en/...">      │
│    <link rel="alternate" hreflang="mfe" href="/.../kr/...">     │
│                                                                 │
│    <!-- Schema JSON-LD (Organisation) -->                       │
│    <script type="application/ld+json">                          │
│    { "@type": "Organization", "name": "BienBon", ... }          │
│    </script>                                                    │
│  </head>                                                        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  STRUCTURE DES URLs                                             │
│                                                                 │
│   /                            Page d'accueil (FR)              │
│   /comment-ca-marche           Comment ca marche                │
│   /devenir-partenaire          Devenir partenaire               │
│   /faq                         FAQ                              │
│   /cgu                         CGU                              │
│   /mentions-legales            Mentions legales                 │
│   /politique-de-confidentialite  Politique confidentialite       │
│                                                                 │
│   /en/                         English homepage                 │
│   /en/how-it-works             How it works                     │
│   /en/become-partner           Become a partner                 │
│                                                                 │
│   /kr/                         Kreol homepage                   │
│   /kr/kouma-sa-marse           Kouma sa marse                   │
│                                                                 │
│   /sitemap.xml                 Sitemap (auto-generated)         │
│   /robots.txt                  Robots file                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Compteur Impact -- Toggle ON (US-W010)

```
┌─────────────────────────────────────────────────────────────────┐
│               COMPTEUR D'IMPACT EN TEMPS REEL                   │
│          (Section homepage - Fonctionnalite activee)            │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │   ┌──────────────────┐    ┌──────────────────┐         │   │
│   │   │  [animation]     │    │  [animation]     │         │   │
│   │   │   12 487         │    │   31 218 kg      │         │   │
│   │   │   repas sauves   │    │   CO2 evites     │         │   │
│   │   └──────────────────┘    └──────────────────┘         │   │
│   │                                                         │   │
│   │   Rafraichissement : toutes les 60s max                 │   │
│   │   Calcul CO2 : 2.5 kg/panier (configurable admin)      │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   -- GESTION BO ADMIN ───────────────────────────────────      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Section compteur d'impact :  [===ON===] / [ OFF ]      │   │
│   │  - Toggle ON/OFF depuis le backoffice admin             │   │
│   │  - Quand OFF : section masquee sur la homepage          │   │
│   │  - Quand OFF : page /impact aussi masquee               │   │
│   │  - Par defaut : DESACTIVEE                              │   │
│   │  - Metriques coherentes avec le dashboard admin         │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Mode Coming Soon -- Active (US-W011)

```
┌─────────────────────────────────────────────────────────────────┐
│                     ┌──────────┐                                │
│                     │  BienBon │                                │
│                     └──────────┘                                │
│                                                                 │
│                    Coming Soon !                                │
│                                                                 │
│        [Message d'accroche personnalisable depuis le BO]        │
│        Sauvez des repas, faites des economies !                 │
│        La premiere plateforme anti-gaspi de l'ile Maurice       │
│        arrive bientot.                                          │
│                                                                 │
│        [Image/visuel personnalisable depuis le BO]              │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Soyez informe du lancement :                           │   │
│   │  ┌───────────────────────────────┐  ┌───────────────┐   │   │
│   │  │ Votre adresse email *         │  │ S'inscrire    │   │   │
│   │  └───────────────────────────────┘  └───────────────┘   │   │
│   │                                                         │   │
│   │  [x] J'accepte la Politique de Confidentialite          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   Connexion / Inscription :                                     │
│   ┌─────────────────────────────────────────┐                   │
│   │  Bientot disponible  (bouton desactive) │                   │
│   └─────────────────────────────────────────┘                   │
│                                                                 │
│   Suivez-nous :                                                 │
│   [Facebook]  [Instagram]  [LinkedIn]  [TikTok]                 │
│                                                                 │
│   -- GESTION BO ADMIN ───────────────────────────────────      │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Mode Coming Soon :  [===ON===] / [ OFF ]               │   │
│   │  - Par defaut : ACTIVE (a desactiver au lancement)      │   │
│   │  - Contenu personnalisable (texte, image) depuis le BO  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  (c) 2026 BienBon Ltd. | Confidentialite                       │
└─────────────────────────────────────────────────────────────────┘
```

### Banniere Cookies (US-W012)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  (contenu de n'importe quelle page du site)                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Ce site utilise des cookies                              │  │
│  │                                                           │  │
│  │  Nous utilisons des cookies pour ameliorer votre          │  │
│  │  experience, analyser le trafic et personnaliser le       │  │
│  │  contenu. En savoir plus dans notre                       │  │
│  │  Politique de Confidentialite.                            │  │
│  │                                                           │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │  │
│  │  │ Accepter     │ │ Refuser      │ │ Personnaliser    │  │  │
│  │  │ tout         │ │ tout         │ │                  │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

-- PANNEAU "PERSONNALISER" (ouvert) ──────────────────────────────

┌───────────────────────────────────────────────────────────────┐
│  Gerer vos preferences de cookies                      [x]   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Cookies essentiels              [Toujours actifs]       │  │
│  │ Session, securite, preferences de langue.               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Cookies analytiques                     [ ON/OFF ]      │  │
│  │ Nous aident a comprendre comment vous                   │  │
│  │ utilisez le site (Google Analytics, etc.)               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Cookies marketing                       [ ON/OFF ]      │  │
│  │ Utilises pour vous proposer du contenu                  │  │
│  │ et des publicites pertinentes.                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────┐                    │
│  │ Sauvegarder mes preferences           │                    │
│  └───────────────────────────────────────┘                    │
│                                                               │
│  Politique de Confidentialite                                 │
└───────────────────────────────────────────────────────────────┘
```

---

## Assets requis

| Asset | Chemin | Utilisation |
|-------|--------|-------------|
| Illustration 404 | `../../assets/illustrations/empty-states/empty-state-404.png` | Visuel de la page 404 |
| Illustration Coming Soon | `../../assets/illustrations/coming-soon/coming-soon.png` | Visuel de la page Coming Soon |
| Impact planete | `../../assets/illustrations/impact/impact-planete.png` | Section compteur d'impact |
| Logo principal | `../../assets/logos/logo-principal.png` | Header de toutes les pages |
| Logo avec texte | `../../assets/logos/logo-avec-texte.png` | Footer, page Coming Soon |
| Favicon / App icon | `../../assets/logos/favicon-app-icon.png` | Favicon du site, og:image |
