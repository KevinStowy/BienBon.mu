# ADR-034 : Distribution sur les App Stores (iOS et Android)

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-001 (stack backend), ADR-002 (architecture applicative), ADR-020 (hebergement infrastructure), ADR-025 (pipeline CI/CD securise), ADR-029 (Flutter state management)

---

## 1. Contexte

BienBon.mu est une marketplace mobile de paniers anti-gaspi a l'ile Maurice. L'experience utilisateur repose sur deux applications Flutter natives :

- **BienBon** (consumer) : l'app grand public pour decouvrir, reserver et retirer des paniers
- **BienBon Partner** (partenaire) : l'app pour les commercants qui gerent leurs paniers, valident les retraits et suivent leurs revenus

Ces deux applications doivent etre publiees sur l'**Apple App Store** (iOS) et le **Google Play Store** (Android) pour atteindre les utilisateurs mauriciens. Le marche mobile a Maurice est domine par Android (~70%) avec une part iOS significative (~25-30%), notamment chez les consommateurs a pouvoir d'achat plus eleve -- exactement la cible anti-gaspi premium.

### 1.1 Pourquoi cette decision est necessaire maintenant

La distribution sur les stores necessite des preparations en amont :
- Les comptes developpeur Apple et Google doivent etre crees et verifies (Apple peut prendre 24-48h, Google est quasi-instantane)
- Les identifiants d'application (bundle ID, package name) sont **definitifs** une fois publies -- un mauvais choix est irreversible
- La configuration du signing (certificats Apple, keystore Android) conditionne toute la chaine CI/CD (ADR-025)
- Les guidelines de review Apple et Google doivent etre comprises avant de coder certaines features (paiement, contenu, etc.)

### 1.2 Stack mobile (rappel)

| Composant | Technologie | Notes |
|-----------|-------------|-------|
| Framework | Flutter 3.x (Dart) | Monorepo Melos, 2 apps + packages partages (ADR-029) |
| State management | Riverpod | ADR-029 |
| Cache local | Drift (SQLite) | ADR-012 |
| Auth | Supabase Auth (JWT) | ADR-010 |
| Push | Firebase Cloud Messaging (FCM) | ADR-014 |
| API | REST + OpenAPI codegen | ADR-004 |

---

## 2. Strategie de publication : deux apps separees

### 2.1 Decision

**Publier deux applications distinctes sur chaque store :**

| Application | Nom sur les stores | Cible | Icone |
|-------------|-------------------|-------|-------|
| **BienBon** | BienBon - Anti-gaspi Maurice | Consommateurs | Logo BienBon (dodo vert) |
| **BienBon Partner** | BienBon Partner | Commercants partenaires | Logo BienBon variante (dodo orange/pro) |

### 2.2 Justification

- **UX clarte** : un consommateur ne doit jamais voir les ecrans de gestion partenaire (et inversement). Deux apps = zero confusion.
- **Poids de l'app** : chaque app embarque uniquement son code. Un bundle Flutter unique avec les deux roles serait plus lourd (~30-40 MB au lieu de ~15-20 MB chacune).
- **Store listing distinct** : descriptions, screenshots, et keywords optimises pour chaque audience.
- **Review independante** : une mise a jour de l'app partenaire n'impacte pas la disponibilite de l'app consommateur sur les stores.
- **Precedent du marche** : Too Good To Go utilise deux apps separees (consumer + business). Uber aussi (Uber + Uber Driver). C'est le pattern standard des marketplaces.

### 2.3 Alternative ecartee : une seule app avec switch de role

Une app unique avec un ecran de selection "Je suis consommateur / Je suis partenaire" aurait reduit la maintenance (un seul bundle, un seul store listing). Ecartee car :
- Complexifie la navigation et l'onboarding
- L'app est plus lourde pour chaque utilisateur (code mort pour le role non utilise)
- Les reviews stores sont plus risquees (Apple peut questionner la double fonctionnalite)
- Le store listing ne peut pas cibler deux audiences distinctes avec des keywords et screenshots differents

---

## 3. Identifiants d'application

### 3.1 Convention de nommage

Les identifiants utilisent le **reverse domain name** base sur le domaine `bienbon.mu` :

| Application | Bundle ID (iOS) | Package Name (Android) | Notes |
|-------------|----------------|----------------------|-------|
| **BienBon Consumer** | `mu.bienbon.consumer` | `mu.bienbon.consumer` | Identique iOS/Android pour la coherence |
| **BienBon Partner** | `mu.bienbon.partner` | `mu.bienbon.partner` | Identique iOS/Android pour la coherence |

### 3.2 Justification du nommage

- **`mu.bienbon.*`** : le TLD `.mu` (Maurice) est utilise comme prefixe reverse-domain, ce qui est la convention standard
- **`.consumer` / `.partner`** : noms explicites, courts, sans ambiguite
- **Identiques sur iOS et Android** : simplifie la configuration CI/CD, les outils analytics (PostHog, Sentry), et les references dans la documentation

### 3.3 Points d'attention

- Les bundle ID / package names sont **immutables** apres la premiere publication. Il est impossible de les changer sans republier une nouvelle app (et perdre les avis, le classement, et les installations existantes).
- Le domaine `bienbon.mu` doit etre controle par l'equipe pour les verifications App Links (Android) et Universal Links (iOS).

---

## 4. Signing et gestion des secrets

### 4.1 iOS : Apple Certificates et Provisioning Profiles

| Element | Description | Duree de vie | Stockage |
|---------|-------------|-------------|----------|
| **Apple Developer Certificate (Distribution)** | Certificat de signature pour la distribution App Store | 1 an (renouvelable) | Exporte en `.p12`, stocke dans GitHub Actions Secrets |
| **Provisioning Profile (App Store)** | Lie le certificat au bundle ID et a l'equipe | 1 an | Stocke dans GitHub Actions Secrets (base64) |
| **App Store Connect API Key** | Cle pour l'upload automatise via Fastlane | Ne expire pas (sauf revocation) | Stocke dans GitHub Actions Secrets |

**Workflow de signing iOS :**

```
GitHub Actions
  -> Decode certificat .p12 (depuis secret base64)
  -> Importer dans le Keychain temporaire du runner
  -> Decode provisioning profile (depuis secret base64)
  -> Copier dans ~/Library/MobileDevice/Provisioning Profiles/
  -> flutter build ipa --release
  -> Signer avec le certificat
  -> Upload vers App Store Connect (via Fastlane)
```

### 4.2 Android : Keystore

| Element | Description | Duree de vie | Stockage |
|---------|-------------|-------------|----------|
| **Upload Keystore (.jks)** | Cle de signature pour l'upload sur Google Play | 25+ ans (recommande) | Stocke dans GitHub Actions Secrets (base64) |
| **Keystore password** | Mot de passe du keystore | N/A | GitHub Actions Secrets |
| **Key alias + password** | Identifiant et mot de passe de la cle dans le keystore | N/A | GitHub Actions Secrets |
| **Google Play Service Account JSON** | Compte de service pour l'upload automatise | Ne expire pas | GitHub Actions Secrets |

**Note importante** : Google Play App Signing est active par defaut depuis 2021. Google gere la cle de signature finale (app signing key), et l'equipe ne gere que la cle d'upload (upload key). Si la cle d'upload est compromise, Google peut la revoquer et en generer une nouvelle. La cle d'upload n'a donc pas besoin d'etre sauvegardee dans un coffre-fort physique -- mais il est quand meme recommande de garder une copie securisee hors GitHub (par exemple dans un gestionnaire de mots de passe comme 1Password ou Bitwarden).

### 4.3 Stockage des secrets

**Decision : GitHub Actions Secrets** (coherent avec ADR-025)

| Secret | Nom dans GitHub Actions | Application |
|--------|------------------------|-------------|
| Certificat Apple (.p12, base64) | `APPLE_CERTIFICATE_P12_BASE64` | Consumer + Partner |
| Mot de passe certificat Apple | `APPLE_CERTIFICATE_PASSWORD` | Consumer + Partner |
| Provisioning profile consumer (base64) | `APPLE_PROVISIONING_CONSUMER_BASE64` | Consumer |
| Provisioning profile partner (base64) | `APPLE_PROVISIONING_PARTNER_BASE64` | Partner |
| App Store Connect API Key ID | `APPLE_API_KEY_ID` | Consumer + Partner |
| App Store Connect API Issuer ID | `APPLE_API_ISSUER_ID` | Consumer + Partner |
| App Store Connect API Key (.p8, base64) | `APPLE_API_KEY_P8_BASE64` | Consumer + Partner |
| Android keystore consumer (base64) | `ANDROID_KEYSTORE_CONSUMER_BASE64` | Consumer |
| Android keystore partner (base64) | `ANDROID_KEYSTORE_PARTNER_BASE64` | Partner |
| Android keystore password consumer | `ANDROID_KEYSTORE_PASSWORD_CONSUMER` | Consumer |
| Android key alias consumer | `ANDROID_KEY_ALIAS_CONSUMER` | Consumer |
| Android key password consumer | `ANDROID_KEY_PASSWORD_CONSUMER` | Consumer |
| Android keystore password partner | `ANDROID_KEYSTORE_PASSWORD_PARTNER` | Partner |
| Android key alias partner | `ANDROID_KEY_ALIAS_PARTNER` | Partner |
| Android key password partner | `ANDROID_KEY_PASSWORD_PARTNER` | Partner |
| Google Play Service Account JSON | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Consumer + Partner |

**Pourquoi pas un vault dedie (HashiCorp Vault, AWS Secrets Manager) ?**
- Surdimensionne pour 2-5 developpeurs et 4 apps (2 apps x 2 plateformes)
- GitHub Actions Secrets sont chiffres au repos, injectees uniquement au runtime, et non loggees
- Coherent avec le choix fait dans ADR-020 et ADR-025
- A reevaluer si l'equipe depasse 10 personnes ou si un audit de conformite l'exige

---

## 5. Versioning

### 5.1 Schema de version

**Decision : Semantic Versioning (semver) + build number auto-incremente par CI**

```
version: MAJOR.MINOR.PATCH+BUILD_NUMBER
```

| Composant | Signification | Exemple | Qui l'incremente |
|-----------|--------------|---------|------------------|
| **MAJOR** | Breaking change, refonte majeure (nouvelle UX, migration account) | `2.0.0` | Developpeur (manuellement dans `pubspec.yaml`) |
| **MINOR** | Nouvelle feature | `1.3.0` | Developpeur (manuellement) |
| **PATCH** | Bugfix, corrections mineures | `1.3.2` | Developpeur (manuellement) |
| **BUILD_NUMBER** | Numero de build auto-incremente | `+142` | CI/CD (GitHub Actions, automatique) |

### 5.2 Build number auto-incremente

Le build number est critique pour les stores :
- **Apple** : `CFBundleVersion` doit etre strictement croissant pour chaque upload
- **Google Play** : `versionCode` doit etre strictement croissant

**Strategie : utiliser le numero de run GitHub Actions comme build number.**

```yaml
# Dans le workflow GitHub Actions
- name: Build Flutter app
  run: |
    flutter build ipa --build-number=${{ github.run_number }}
    flutter build appbundle --build-number=${{ github.run_number }}
```

**Avantages :**
- Toujours croissant (GitHub Actions garantit l'unicite et la monotonie)
- Pas de fichier de state a gerer (pas de compteur dans le repo ou dans un fichier)
- Tracable : le build number correspond directement au run GitHub Actions

**Alternative ecartee** : compteur dans un fichier ou dans un tag Git. Plus complexe a gerer, risque de conflit, pas de garantie de monotonie en cas de branches paralleles.

### 5.3 Versioning des deux apps

Les deux apps (consumer et partner) ont des versions independantes :

```yaml
# apps/consumer/pubspec.yaml
version: 1.2.0+142

# apps/partner/pubspec.yaml
version: 1.0.3+142
```

Le build number peut etre le meme (meme run CI), mais la version semantique est independante.

---

## 6. Metadata des stores

### 6.1 Langues supportees

| Langue | App Store (iOS) | Google Play (Android) | Notes |
|--------|----------------|----------------------|-------|
| **Francais (France)** | `fr-FR` | `fr-FR` | Langue principale. La majorite des utilisateurs mauriciens comprennent le francais. |
| **Anglais (US)** | `en-US` | `en-US` | Langue secondaire. Requis par defaut sur les deux stores. |
| **Creole mauricien** | Non supporte par Apple/Google | Non supporte | Ni Apple ni Google ne proposent le creole mauricien comme locale de store listing. L'app elle-meme supporte le creole (ADR-015), mais les fiches stores sont en FR et EN uniquement. |

### 6.2 Store listing -- BienBon Consumer

| Champ | Francais | Anglais |
|-------|----------|---------|
| **Nom** | BienBon - Anti-gaspi Maurice | BienBon - Save Food Mauritius |
| **Sous-titre** (iOS) / **Description courte** (Android) | Paniers surprise a prix reduit pres de chez vous | Surprise baskets at reduced prices near you |
| **Description** (extrait) | Sauvez de la nourriture et faites des economies ! BienBon vous permet de recuperer des paniers surprise d'invendus chez vos commercants preferes a l'ile Maurice, a prix reduit. Boulangeries, restaurants, supermarches -- decouvrez les paniers disponibles autour de vous, reservez en quelques clics, et retirez en magasin. | Save food and save money! BienBon lets you grab surprise baskets of unsold products from your favorite shops in Mauritius at reduced prices. Bakeries, restaurants, supermarkets -- discover available baskets near you, book in a few taps, and pick up in store. |
| **Mots-cles** (iOS) | anti-gaspi,panier,invendus,maurice,nourriture,surprise,reduction,ecologie | food-waste,basket,mauritius,save,food,surprise,discount,eco |
| **Categorie** | Alimentation & Boissons (Food & Drink) | Alimentation & Boissons (Food & Drink) |

### 6.3 Store listing -- BienBon Partner

| Champ | Francais | Anglais |
|-------|----------|---------|
| **Nom** | BienBon Partner | BienBon Partner |
| **Sous-titre** / **Description courte** | Vendez vos invendus, zero gaspillage | Sell your unsold products, zero waste |
| **Description** (extrait) | Vous etes commercant a l'ile Maurice ? Rejoignez BienBon Partner pour vendre vos invendus sous forme de paniers surprise. Reduisez votre gaspillage, gagnez des revenus supplementaires, et attirez de nouveaux clients. Gerez vos paniers, validez les retraits, et suivez vos revenus depuis l'application. | Are you a merchant in Mauritius? Join BienBon Partner to sell your unsold products as surprise baskets. Reduce your waste, earn extra revenue, and attract new customers. Manage your baskets, validate pickups, and track your revenue from the app. |
| **Categorie** | Professionnel (Business) | Professionnel (Business) |

### 6.4 Screenshots

Les screenshots doivent etre fournis pour chaque device cible :

**iOS (requis par Apple) :**

| Device | Resolution | Requis |
|--------|-----------|--------|
| iPhone 6.9" (iPhone 16 Pro Max) | 1320 x 2868 | Oui (obligatoire pour les apps iPhone) |
| iPhone 6.3" (iPhone 16 Pro) | 1206 x 2622 | Recommande |
| iPad Pro 13" | 2064 x 2752 | Requis si l'app supporte iPad |

**Android (requis par Google) :**

| Type | Specifications | Requis |
|------|---------------|--------|
| Phone screenshots | Min 320px, max 3840px (cote le plus long). Ratio 16:9 ou 9:16. | Oui (min 2, max 8) |
| Tablet screenshots | Idem | Requis si l'app supporte tablettes |
| Feature graphic | 1024 x 500 px | Oui |

**Strategie de generation :** utiliser Fastlane `frameit` ou un outil comme AppMockUp pour generer des screenshots avec des cadres de devices et des textes marketing. Les screenshots sont committes dans le repo (dans un dossier `fastlane/screenshots/`) et versionnes avec le code.

---

## 7. Review guidelines : risques de rejet

### 7.1 Apple App Store Review Guidelines

| Risque | Analyse | Verdict |
|--------|---------|---------|
| **Paiement in-app (IAP)** | BienBon vend des **biens physiques** (paniers de nourriture). Apple autorise les paiements server-side pour les biens physiques (guideline 3.1.3). Pas besoin d'utiliser Apple IAP. | **Pas de risque** |
| **Contenu food** | L'app ne vend pas d'alcool, de tabac, ou de produits reglementes. Les paniers contiennent des produits alimentaires classiques. | **Pas de risque** |
| **Localisation** | L'app est fonctionnelle uniquement a Maurice. Apple accepte les apps geographiquement limitees, a condition que la fiche store le mentionne clairement. | **Risque faible** -- mentionner "Available in Mauritius" dans la description |
| **Login requis** | L'app necessite un compte pour reserver. Apple exige qu'on puisse tester l'app sans compte (guideline 2.1). | **Risque moyen** -- fournir un compte de test dans les notes de review |
| **Permissions** | L'app demande la localisation (pour la recherche par proximite) et les notifications push. Chaque permission doit avoir une justification claire dans le `Info.plist` (NSLocationWhenInUseUsageDescription, etc.). | **Risque faible** -- justifications standards |
| **Sign in with Apple** | Si l'app propose des methodes de login tierces (Google, Facebook), Apple exige aussi "Sign in with Apple" (guideline 4.8). Supabase Auth supporte Apple Sign-In nativement. | **Risque moyen** -- implementer Sign in with Apple |
| **Minimum functionality** | L'app partenaire pourrait etre consideree comme "trop simple" si elle n'a que quelques ecrans au lancement. | **Risque faible** -- le scope fonctionnel est riche (gestion paniers, retraits, analytics) |

### 7.2 Google Play Store Policies

| Risque | Analyse | Verdict |
|--------|---------|---------|
| **Paiement** | Google Play autorise les paiements server-side pour les biens physiques (pas de Google Play Billing requis). | **Pas de risque** |
| **Target API level** | Google exige un `targetSdkVersion` recent (Android 14 / API 34+ en 2026). Flutter met a jour regulierement. | **Risque faible** -- maintenir Flutter a jour |
| **Data safety** | Google exige une declaration de collecte de donnees (Data Safety section). | **Risque faible** -- remplir le formulaire Data Safety avec precision |
| **Permissions** | Google exige des justifications pour les permissions (localisation, camera pour le scan QR partenaire, notifications). | **Risque faible** |

### 7.3 Compte de test pour les reviews

Pour chaque soumission, fournir aux equipes de review Apple et Google :

```
Email: review@bienbon.mu
Password: (genere, unique par soumission)
Notes: "This app is a food waste reduction marketplace for Mauritius.
        The test account has pre-loaded baskets and a test partner
        near Port-Louis, Mauritius. GPS coordinates for testing:
        -20.1609, 57.5012 (Port-Louis)."
```

---

## 8. Beta testing

### 8.1 iOS : TestFlight

| Aspect | Configuration |
|--------|--------------|
| **Testeurs internes** | Jusqu'a 100 personnes (equipe BienBon). Upload automatique par CI. Pas de review Apple. Disponible immediatement. |
| **Testeurs externes** | Jusqu'a 10 000 personnes. Necessite une review Apple (generalement < 24h). Lien d'invitation public possible. |
| **Strategie** | Phase 1 (dev) : testeurs internes uniquement (equipe + proches). Phase 2 (pre-launch) : testeurs externes via lien d'invitation pour un groupe beta de ~50-100 utilisateurs mauriciens. |
| **Expiration** | Les builds TestFlight expirent apres 90 jours. Prevoir un upload regulier. |
| **Feedback** | TestFlight integre un mecanisme de feedback (screenshots + commentaires). Utile pour les retours utilisateurs. |

### 8.2 Android : Google Play Internal Testing

| Track | Audience | Review Google | Delai |
|-------|----------|--------------|-------|
| **Internal testing** | Jusqu'a 100 testeurs (par email). | Non | Immediat apres upload |
| **Closed testing (alpha)** | Groupe invite par email ou lien. | Oui (pre-launch report) | < 24h generalement |
| **Open testing (beta)** | Public (visible sur le Play Store avec mention "beta"). | Oui | < 24h |

**Strategie :**

| Phase | iOS | Android |
|-------|-----|---------|
| **Developpement** | TestFlight interne (equipe) | Internal testing (equipe) |
| **Pre-launch beta** | TestFlight externe (~50-100 testeurs) | Closed testing (~50-100 testeurs) |
| **Soft launch** | App Store (Maurice uniquement) | Production (Maurice uniquement, deploiement progressif) |
| **Launch** | App Store (tous pays, mais audience Maurice) | Production (tous pays) |

### 8.3 Deploiement progressif (staged rollout)

Google Play propose un **staged rollout** : deployer une nouvelle version a un pourcentage des utilisateurs existants (1%, 5%, 10%, 25%, 50%, 100%). Si des crashs sont detectes (via Firebase Crashlytics ou Sentry), le rollout peut etre suspendu.

Apple ne propose pas de staged rollout natif pour les nouvelles apps, mais permet un **phased release** pour les mises a jour (7 jours, deploiement progressif automatique).

**Decision :** utiliser le staged rollout Google Play et le phased release Apple pour toutes les mises a jour post-launch.

---

## 9. Fastlane : automatisation des releases

### 9.1 Pourquoi Fastlane

Fastlane est l'outil standard de l'industrie pour automatiser le build, le signing, l'upload et la gestion des metadata des apps mobiles. Il est supporte nativement par Flutter et s'integre dans GitHub Actions.

### 9.2 Structure Fastlane dans le monorepo

```
apps/
  consumer/
    android/
      fastlane/
        Fastfile        # Lanes Android (build, deploy)
        Appfile         # Package name, service account
    ios/
      fastlane/
        Fastfile        # Lanes iOS (build, deploy)
        Appfile         # Bundle ID, Apple ID
    fastlane/
      Fastfile          # Lanes cross-platform (metadata, screenshots)
      metadata/
        fr-FR/          # Store listing francais
        en-US/          # Store listing anglais
      screenshots/
        fr-FR/          # Screenshots francais
        en-US/          # Screenshots anglais
  partner/
    (meme structure)
```

### 9.3 Lanes principales

```ruby
# apps/consumer/ios/fastlane/Fastfile

default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    setup_ci  # Configure le Keychain temporaire sur CI

    # Importer le certificat et le provisioning profile
    install_provisioning_profile(path: ENV["PROVISIONING_PROFILE_PATH"])

    # Build Flutter
    sh("cd ../.. && flutter build ipa --release --build-number=#{ENV['BUILD_NUMBER']}")

    # Upload vers TestFlight
    upload_to_testflight(
      api_key_path: ENV["APP_STORE_CONNECT_API_KEY_PATH"],
      ipa: "../build/ios/ipa/BienBon.ipa",
      skip_waiting_for_build_processing: true
    )
  end

  desc "Deploy to App Store"
  lane :release do
    setup_ci

    install_provisioning_profile(path: ENV["PROVISIONING_PROFILE_PATH"])

    sh("cd ../.. && flutter build ipa --release --build-number=#{ENV['BUILD_NUMBER']}")

    upload_to_app_store(
      api_key_path: ENV["APP_STORE_CONNECT_API_KEY_PATH"],
      ipa: "../build/ios/ipa/BienBon.ipa",
      submit_for_review: true,
      automatic_release: false,  # Release manuelle apres approbation
      phased_release: true       # Deploiement progressif
    )
  end
end
```

```ruby
# apps/consumer/android/fastlane/Fastfile

default_platform(:android)

platform :android do
  desc "Build and upload to Google Play Internal Testing"
  lane :beta do
    sh("cd ../.. && flutter build appbundle --release --build-number=#{ENV['BUILD_NUMBER']}")

    upload_to_play_store(
      track: "internal",
      aab: "../build/app/outputs/bundle/release/app-release.aab",
      json_key: ENV["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH"],
      skip_upload_metadata: true,
      skip_upload_changelogs: false,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end

  desc "Deploy to Google Play Production"
  lane :release do
    sh("cd ../.. && flutter build appbundle --release --build-number=#{ENV['BUILD_NUMBER']}")

    upload_to_play_store(
      track: "production",
      aab: "../build/app/outputs/bundle/release/app-release.aab",
      json_key: ENV["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH"],
      rollout: "0.1"  # 10% staged rollout
    )
  end
end
```

### 9.4 Gestion des metadata via Fastlane

Fastlane `deliver` (iOS) et `supply` (Android) permettent de versionner les metadata (descriptions, changelogs, screenshots) dans le repository Git. Les metadata sont synchronisees automatiquement lors de chaque release.

```bash
# Telecharger les metadata actuelles depuis les stores
fastlane deliver download_metadata   # iOS
fastlane supply init                 # Android

# Uploader les metadata vers les stores
fastlane deliver                     # iOS
fastlane supply                      # Android
```

---

## 10. Integration CI/CD

### 10.1 Reference ADR-025

Le pipeline CI/CD est defini dans ADR-025. La distribution mobile s'integre comme un **stage supplementaire** dans le pipeline existant.

### 10.2 Workflows GitHub Actions pour le mobile

```yaml
# .github/workflows/mobile-release.yml
name: Mobile Release

on:
  push:
    tags:
      - 'consumer-v*'   # Ex: consumer-v1.2.0
      - 'partner-v*'    # Ex: partner-v1.0.3

jobs:
  determine-app:
    runs-on: ubuntu-latest
    outputs:
      app: ${{ steps.parse.outputs.app }}
      version: ${{ steps.parse.outputs.version }}
    steps:
      - id: parse
        run: |
          TAG="${{ github.ref_name }}"
          APP=$(echo $TAG | cut -d'-' -f1)
          VERSION=$(echo $TAG | cut -d'v' -f2)
          echo "app=$APP" >> $GITHUB_OUTPUT
          echo "version=$VERSION" >> $GITHUB_OUTPUT

  build-android:
    needs: determine-app
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: 'stable'
      - name: Decode keystore
        run: echo "${{ secrets.ANDROID_KEYSTORE_CONSUMER_BASE64 }}" | base64 -d > keystore.jks
      - name: Build AAB
        working-directory: apps/${{ needs.determine-app.outputs.app }}
        run: flutter build appbundle --release --build-number=${{ github.run_number }}
      - name: Upload to Google Play
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON }}
          packageName: mu.bienbon.${{ needs.determine-app.outputs.app }}
          releaseFiles: apps/${{ needs.determine-app.outputs.app }}/build/app/outputs/bundle/release/app-release.aab
          track: internal

  build-ios:
    needs: determine-app
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'
          channel: 'stable'
      - name: Setup signing
        run: |
          # Decode et installer le certificat + provisioning profile
          echo "${{ secrets.APPLE_CERTIFICATE_P12_BASE64 }}" | base64 -d > certificate.p12
          security create-keychain -p "" build.keychain
          security import certificate.p12 -k build.keychain -P "${{ secrets.APPLE_CERTIFICATE_PASSWORD }}" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple: -s -k "" build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "" build.keychain
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          echo "${{ secrets.APPLE_PROVISIONING_CONSUMER_BASE64 }}" | base64 -d > ~/Library/MobileDevice/Provisioning\ Profiles/consumer.mobileprovision
      - name: Build IPA
        working-directory: apps/${{ needs.determine-app.outputs.app }}
        run: flutter build ipa --release --build-number=${{ github.run_number }}
      - name: Upload to TestFlight
        run: |
          # Utiliser Fastlane ou altool/notarytool
          cd apps/${{ needs.determine-app.outputs.app }}/ios
          bundle exec fastlane beta
```

### 10.3 Declenchement des releases

| Trigger | Action | Destination |
|---------|--------|-------------|
| Tag `consumer-v1.2.0` | Build + upload | TestFlight (iOS) + Internal Testing (Android) |
| Tag `partner-v1.0.3` | Build + upload | TestFlight (iOS) + Internal Testing (Android) |
| Promotion manuelle (GitHub Actions dispatch) | Promouvoir le build beta en production | App Store + Google Play Production |

**Pourquoi pas un deploy automatique en production ?**
- Les releases mobile sont irreversibles (on ne peut pas "rollback" une app deja installee sur les devices)
- La promotion de beta vers production doit etre un acte delibere apres validation des testeurs
- Le staged rollout Google Play et le phased release Apple permettent un "rollback" partiel en stoppant le deploiement

---

## 11. Couts

### 11.1 Couts fixes

| Element | Cout | Frequence | Notes |
|---------|------|-----------|-------|
| **Apple Developer Program** | 99 USD | Annuel | Requis pour publier sur l'App Store. Inclut TestFlight, App Store Connect, 100 devices de test. Un seul compte pour les 2 apps. |
| **Google Play Developer Account** | 25 USD | One-time | Paiement unique a la creation du compte. Inclut tous les outils de publication. Un seul compte pour les 2 apps. |

### 11.2 Couts CI/CD lies au mobile

| Element | Cout estime | Notes |
|---------|-------------|-------|
| **GitHub Actions (macOS runner)** | ~40-80 USD/mois | Les runners macOS coutent 10x plus cher que Linux (0.08 USD/min). Un build iOS Flutter prend ~10-15 min. Avec ~20 builds/mois (2 apps x ~10 releases/mois), ca represente ~200-300 min macOS/mois. Les 2000 min gratuites (Linux) ne couvrent que 200 min macOS. |
| **GitHub Actions (Linux runner)** | Inclus dans le free tier | Les builds Android tournent sur Linux. ~5-8 min par build. |

### 11.3 Optimisation des couts CI/CD macOS

- **Self-hosted Mac mini** : un Mac mini M2 (~600 USD one-time) peut servir de runner GitHub Actions auto-heberge, eliminant les couts de runner macOS. Rentable des le 8e mois (~80 USD/mois economises).
- **Codemagic** : plateforme CI/CD specialisee mobile. Free tier de 500 min macOS/mois. Alternative viable si GitHub Actions macOS est trop cher.
- **Build iOS moins frequents** : ne builder iOS que sur les tags (releases), pas sur chaque PR. Les PRs se contentent de `flutter analyze` et `flutter test` sur un runner Linux.

### 11.4 Resume des couts annuels

| Element | Cout annuel |
|---------|-------------|
| Apple Developer Program | 99 USD |
| Google Play (one-time) | 25 USD (premiere annee uniquement) |
| GitHub Actions macOS (estime) | 480-960 USD |
| **Total premiere annee** | **~604-1084 USD** |
| **Total annees suivantes** | **~579-1059 USD** |

---

## 12. Consequences

### Positives

1. **Distribution professionnelle** : les deux apps sont publiees sur les stores officiels, accessibles a tous les utilisateurs mauriciens via les canaux standards.
2. **CI/CD automatise** : Fastlane + GitHub Actions automatisent l'integralite du processus de release, du code au store. Zero intervention manuelle sauf la decision de promouvoir en production.
3. **Beta testing structure** : TestFlight et Google Play Internal Testing permettent de valider chaque release avec des utilisateurs reels avant le deploiement public.
4. **Versioning coherent** : semver + build number auto-incremente garantissent la tracabilite de chaque build.
5. **Metadata versionnees** : les descriptions, screenshots et changelogs sont dans le repo Git, revisables en PR.

### Negatives

1. **Cout macOS CI** : les builds iOS sur GitHub Actions macOS sont chers (~40-80 USD/mois). Mitigation : self-hosted Mac mini ou Codemagic.
2. **Complexite signing iOS** : la gestion des certificats et provisioning profiles Apple est notoirement complexe. Mitigation : Fastlane `match` peut simplifier la gestion via un repo Git prive de certificats.
3. **Deux apps a maintenir** : chaque release doit etre faite pour les 2 apps x 2 plateformes = 4 uploads. Mitigation : les Fastlane lanes et les workflows GitHub Actions automatisent ce processus.
4. **Delais de review Apple** : les soumissions App Store prennent generalement 24-48h (parfois plus). Mitigation : soumettre regulierement (meme en TestFlight) pour maintenir l'equipe de review familiere avec l'app.

---

## 13. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Rejet Apple pour paiement | Tres faible | Eleve | Les biens physiques sont exempts d'IAP (guideline 3.1.3). Documenter clairement dans les notes de review. |
| Rejet Apple pour manque de "Sign in with Apple" | Moyenne | Moyen | Implementer Sign in with Apple des le lancement via Supabase Auth. |
| Perte de la cle de signing Android | Faible | Eleve | Google Play App Signing protege la cle principale. La cle d'upload est dans GitHub Secrets + backup dans un gestionnaire de mots de passe. |
| Expiration du certificat Apple | Moyenne | Moyen | Mettre une alerte calendrier 30 jours avant expiration. Automatiser le renouvellement avec Fastlane `match`. |
| Couts macOS CI depassent le budget | Moyenne | Faible | Migrer vers un self-hosted Mac mini ou Codemagic. |
| Compte Apple bloque (violation guidelines) | Tres faible | Critique | Suivre scrupuleusement les guidelines. Garder un contact support Apple actif. |
| Build number en conflit (branches paralleles) | Faible | Faible | `github.run_number` est unique par workflow. Si necessaire, prefixer avec l'app : `consumer-142`. |

---

## 14. Plan de validation

Avant la premiere soumission :

1. **Creer les comptes** (1 jour) : Apple Developer Program (99 USD) + Google Play Developer (25 USD). Verifier l'identite si necessaire (Apple demande parfois un DUNS number pour les organisations).
2. **Generer les certificats et keystores** (0.5 jour) : creer le certificat de distribution Apple, les provisioning profiles, et les keystores Android. Stocker dans GitHub Secrets.
3. **Configurer Fastlane** (1 jour) : installer Fastlane dans le monorepo, configurer les lanes beta et release pour les 2 apps x 2 plateformes.
4. **Premier build CI** (0.5 jour) : lancer un build complet via GitHub Actions, verifier que le signing fonctionne, que l'upload vers TestFlight et Google Play Internal Testing reussit.
5. **Remplir les metadata** (0.5 jour) : descriptions, screenshots, feature graphic, categorie, politique de confidentialite, compte de test.
6. **Soumettre une premiere version beta** (1 jour) : uploader sur TestFlight et Google Play Closed Testing. Inviter les premiers testeurs internes.

---

## 15. References

### Apple
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) -- Apple Developer
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi) -- Apple Developer
- [TestFlight Overview](https://developer.apple.com/testflight/) -- Apple Developer
- [Apple Developer Program Enrollment](https://developer.apple.com/programs/enroll/) -- Apple Developer

### Google
- [Google Play Developer Policy Center](https://play.google.com/about/developer-content-policy/) -- Google Play
- [Google Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756) -- Google Play Help
- [Google Play Staged Rollouts](https://support.google.com/googleplay/android-developer/answer/6346149) -- Google Play Help

### Fastlane
- [Fastlane Documentation](https://docs.fastlane.tools/) -- Fastlane
- [Fastlane for Flutter](https://docs.flutter.dev/deployment/cd#fastlane) -- Flutter Docs
- [Fastlane Match](https://docs.fastlane.tools/actions/match/) -- Fastlane

### Flutter Deployment
- [Flutter iOS Deployment](https://docs.flutter.dev/deployment/ios) -- Flutter Docs
- [Flutter Android Deployment](https://docs.flutter.dev/deployment/android) -- Flutter Docs
- [Flutter CI/CD](https://docs.flutter.dev/deployment/cd) -- Flutter Docs

### CI/CD
- [GitHub Actions macOS Runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners) -- GitHub Docs
- [Codemagic Flutter CI/CD](https://codemagic.io/flutter/) -- Codemagic
