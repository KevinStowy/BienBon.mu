# Site Vitrine -- Page Devenir Partenaire

## User Stories couvertes

- US-W003 -- Page "Devenir partenaire"

---

## US-W003 -- Page "Devenir partenaire"

**Titre :** Page "Devenir partenaire"

**En tant que** potentiel partenaire, **je veux** voir une page dediee expliquant les avantages de rejoindre BienBon et pouvoir m'inscrire directement **afin de** prendre ma decision et demarrer le processus.

**Criteres d'acceptation :**
- La page met en avant les benefices cles : revenus additionnels sur les invendus, reduction du gaspillage alimentaire, visibilite aupres de nouveaux clients, simplicite d'utilisation, accompagnement par l'equipe BienBon
- Une section explique le fonctionnement pour le partenaire (creation de paniers, gestion des retraits, facturation)
- Une section "Temoignages" affiche des retours de partenaires existants (si disponibles ; sinon, la section est masquee en pre-lancement)
- Le modele economique est explique de maniere transparente (commission sur les ventes, pas de frais d'inscription)
- Le formulaire d'inscription partenaire est integre directement dans la page (cf. US-P001 du document v1)
- Le formulaire demande : nom et prenom du responsable, email, telephone, nom du commerce, type de commerce, adresse complete, numero BRN, description du commerce, upload d'au moins une photo
- Apres soumission, un message de confirmation indique que la demande est en cours de traitement
- La page est responsive et disponible dans les trois langues

---

## Mockups

### Mentions Legales -- BO admin + versioning (US-W006)

> Note : le fichier mockup `web-partner-page.js` contient les ecrans Mentions Legales et Politique de Confidentialite, qui sont des pages compagnes de la page Devenir Partenaire dans la navigation du site vitrine.

```
┌─────────────────────────────────────────────────────────────────┐
│  BienBon        Accueil  Comment ca marche  FAQ  Blog           │
│                                    [FR|EN|KR]  [Ouvrir l'app]  │
├─────────────────────────────────────────────────────────────────┤
│  Accueil > Mentions Legales                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              Mentions Legales                                   │
│                                                                 │
│   Version : v1.3  |  Derniere mise a jour : 05 fevrier 2026    │
│                                                                 │
│   -- INFORMATIONS OBLIGATOIRES ──────────────────────────      │
│                                                                 │
│   Denomination sociale : BienBon Ltd.                           │
│   Forme juridique : Private Company Limited by Shares           │
│   Siege social : [adresse], Ile Maurice                         │
│   N. enregistrement (Registrar of Companies) : CXXXXXX          │
│   Capital social : [montant] MUR                                │
│   Directeur/Responsable : [Nom]                                 │
│   Contact : contact@bienbon.mu | +230 XXX XXXX                  │
│                                                                 │
│   Hebergeur : [Nom], [Adresse], [Contact]                       │
│                                                                 │
│   Conforme : Companies Act 2001, ICT Act                        │
│                                                                 │
│   -- GESTION BO ADMIN ───────────────────────────────────      │
│   - Contenu modifiable depuis le backoffice admin               │
│   - Chaque modification versionnee (numero de version + date)   │
│   - Historique des versions conserve et consultable             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  (c) 2026 BienBon Ltd. | CGU et CGV | Mentions | Confidentialite│
└─────────────────────────────────────────────────────────────────┘
```

### Politique de Confidentialite -- BO admin + versioning (US-W007)

```
┌─────────────────────────────────────────────────────────────────┐
│  BienBon        Accueil  Comment ca marche  FAQ  Blog           │
│                                    [FR|EN|KR]  [Ouvrir l'app]  │
├─────────────────────────────────────────────────────────────────┤
│  Accueil > Politique de Confidentialite                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         Politique de Confidentialite                            │
│                                                                 │
│   Version : v2.0  |  Derniere mise a jour : 01 fevrier 2026    │
│                                                                 │
│   -- TABLE DES MATIERES ─────────────────────────────────      │
│   1. Types de donnees collectees                                │
│   2. Finalites du traitement                                    │
│   3. Base legale du traitement                                  │
│   4. Destinataires des donnees                                  │
│   5. Duree de conservation                                      │
│   6. Droits des utilisateurs                                    │
│   7. Mesures de securite                                        │
│   8. Cookies et traceurs                                        │
│   9. Transferts hors de Maurice                                 │
│                                                                 │
│   Conforme au Data Protection Act 2017 - Ile Maurice            │
│   Reference : Data Protection Office - [coordonnees]            │
│                                                                 │
│   -- CONTENU (gere depuis le BO admin) ──────────────────      │
│   [Contenu modifiable via backoffice admin]                     │
│                                                                 │
│   ┌────────────────────────────────────────────┐                │
│   │ Telecharger la Politique (PDF) >>>         │                │
│   └────────────────────────────────────────────┘                │
│                                                                 │
│   -- GESTION BO ADMIN ───────────────────────────────────      │
│   - Contenu modifiable depuis le backoffice admin               │
│   - Chaque modification versionnee (numero de version + date)   │
│   - Historique des versions conserve et consultable             │
│   - Lors d'une mise a jour impactant les droits des             │
│     utilisateurs : notification + re-acceptation requises       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  (c) 2026 BienBon Ltd. | CGU et CGV | Mentions | Confidentialite│
└─────────────────────────────────────────────────────────────────┘
```

---

## Assets requis

| Asset | Chemin | Utilisation |
|-------|--------|-------------|
| Illustration page partenaire | `../../assets/illustrations/site-vitrine/vitrine-page-partenaire.png` | Visuel principal de la page "Devenir partenaire" |
| Logo principal | `../../assets/logos/logo-principal.png` | Header du site vitrine |
| Logo avec texte | `../../assets/logos/logo-avec-texte.png` | Footer du site vitrine |
