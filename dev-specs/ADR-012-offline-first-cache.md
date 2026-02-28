# ADR-012 : Strategie offline-first et cache

| Champ         | Valeur                                                              |
|---------------|---------------------------------------------------------------------|
| **Statut**    | Propose                                                             |
| **Date**      | 2026-02-27                                                          |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                                 |
| **Decideurs** | Equipe technique BienBon                                            |
| **Scope**     | Stockage local, cache API, synchronisation offline, QR code offline |
| **Prerequis** | ADR-001 (NestJS + Prisma + Supabase), ADR-004 (API REST + OpenAPI codegen), ADR-008 (stock temps reel SSE + pg_notify), ADR-010 (Supabase Auth / JWT), ADR-021 (DPA 2017 / donnees personnelles), ADR-022 (securite applicative OWASP) |
| **US clefs**  | US-C039, US-C040, US-C043 (QR/PIN offline), US-P026, US-P027 (scan/validation retrait) |

---

## 1. Contexte

### 1.1 Le probleme

BienBon.mu est une marketplace mobile de paniers anti-gaspi a l'ile Maurice. L'experience critique du produit est le **retrait en magasin** : le consommateur presente un QR code ou un PIN, le partenaire le scanne/saisit, et le retrait est valide. Ce flux doit fonctionner meme quand le reseau est absent ou instable.

### 1.2 Conditions reseau a l'ile Maurice

| Zone                       | Couverture typique | Cas d'usage BienBon                                          |
|----------------------------|--------------------|---------------------------------------------------------------|
| Urbain (Port-Louis, Quatre Bornes, Curepipe) | 4G correcte (5-30 Mbps) | Consommateur browse + reserve. Partenaire gere ses paniers.   |
| Periurbain / centres commerciaux             | 4G inegale, parfois 3G  | Consommateur en deplacement consulte ses reservations.         |
| Rural / interieur de l'ile                   | 3G, parfois Edge/GPRS   | Consommateur en route vers un partenaire rural.                |
| Interieur de magasin                         | WiFi local souvent dispo | Partenaire scanne les QR codes. WiFi parfois instable.        |
| Transport (bus, metro express)               | 3G/4G intermittente      | Consommateur consulte son QR avant d'arriver au magasin.      |

**Conclusion reseau** : On ne peut PAS supposer une connexion permanente et fiable. L'app doit fonctionner en mode degrade pour les flux critiques (retrait), et offrir une experience fluide sur 3G pour les flux courants (browse, recherche).

### 1.3 Exigences extraites des specs

| Ref     | Exigence                                                                                                       | Criticite |
|---------|----------------------------------------------------------------------------------------------------------------|-----------|
| US-C043 | QR code + PIN + infos reservation accessibles hors connexion. Re-check toutes les 30 min. Warning si offline > 30 min. | **CRITIQUE** |
| US-C039 | QR code contient un identifiant unique crypte (pas de donnees personnelles en clair)                           | Haute     |
| US-C040 | PIN numerique 4-6 chiffres, unique par reservation, affiché sous le QR                                         | Haute     |
| US-P026 | Partenaire scanne le QR, affiche les infos de reservation, confirme le retrait                                 | Haute     |
| US-P027 | Partenaire saisit le PIN comme alternative au QR, meme resultat                                                | Haute     |
| ADR-008 | Stock temps reel via SSE + pg_notify                                                                           | Moyenne   |
| ADR-010 | JWT access token 1h + refresh token 30j                                                                        | Haute     |

### 1.4 Contraintes techniques

- **Telephones d'entree de gamme** : marche mauricien, beaucoup de devices avec 2-4 Go RAM et 32-64 Go stockage. Le cache local ne doit pas depasser ~50-100 Mo.
- **Startup early-stage** : 2-5 developpeurs. La complexite de la solution offline doit rester maitrisable.
- **Flutter** : les deux apps (consumer + partner) sont en Flutter/Dart. Le choix des packages doit s'aligner avec l'ecosysteme Flutter 3.x.
- **Pas de PowerSync** : Supabase ne fournit pas de solution offline native. PowerSync est un service tiers payant qui ajoute une dependance et un cout. A notre echelle, une solution custom plus legere est preferee.

---

## 2. Classification des donnees

Avant de choisir les outils, il faut classifier les donnees par **volatilite** et **criticite offline** :

### Tier 1 — Critique offline (doit fonctionner sans reseau)

| Donnee                         | Taille estimee | Frequence de changement | Duree de vie cache | Sensibilite |
|--------------------------------|----------------|-------------------------|--------------------| ----------- |
| QR code (payload encode)       | < 1 Ko/reservation | Jamais (immutable)      | Jusqu'au retrait   | **Elevee** (permet de valider un retrait) |
| PIN de retrait                 | < 100 octets   | Jamais (immutable)      | Jusqu'au retrait   | **Elevee** (secret partage, hashe cote serveur) |
| Infos reservation en cours     | ~2 Ko          | Rarement (annulation)   | Jusqu'au retrait   | Moyenne |
| JWT access token               | ~1 Ko          | Toutes les heures       | 1h (+ refresh)     | **Elevee** (credential) |
| JWT refresh token              | ~1 Ko          | Tous les 30 jours       | 30j                | **Elevee** (credential long terme) |

### Tier 2 — Cache pour performance (reseau prefere, fallback cache)

| Donnee                         | Taille estimee | Frequence de changement | Duree de vie cache | Sensibilite |
|--------------------------------|----------------|-------------------------|--------------------| ----------- |
| Liste des partenaires/commerces | ~50 Ko (100 commerces) | Rarement (hebdo)       | 24h, stale-while-revalidate | Faible |
| Categories de paniers          | < 5 Ko         | Rarement (mensuel)      | 7j                 | Faible |
| Profil utilisateur             | ~2 Ko          | Rarement                | 1h                 | **Elevee** (contient les preferences alimentaires — cf. ci-dessous) |
| Historique reservations        | ~10 Ko (50 dernieres) | Apres chaque retrait   | 1h                 | Faible |
| Infos detaillees d'un commerce | ~5 Ko          | Rarement                | 12h                | Faible |

> **Donnees sensibles dans le Tier 2** : le profil utilisateur peut contenir des **preferences alimentaires** (halal, vegetarien, vegan, etc.). Ces preferences sont des **donnees sensibles au sens du DPA 2017** de Maurice : "halal" est un indicateur indirect de croyance religieuse (islam), et par precaution, toutes les preferences alimentaires sont traitees comme sensibles (cf. ADR-021, Q3). Elles doivent etre **chiffrees au repos** dans le cache Drift (voir section 3.5).

### Tier 3 — Temps reel (jamais cache, toujours reseau)

| Donnee                         | Pourquoi pas de cache                                          |
|--------------------------------|----------------------------------------------------------------|
| Stock paniers disponibles      | Change en temps reel (SSE). Un cache est dangereux (overbooking). |
| Reservation en cours de creation | Action transactionnelle, doit passer par le serveur.           |
| Paiement                       | Action transactionnelle critique.                              |
| Validation de retrait (action) | L'action doit atteindre le serveur. Exception : queue offline partenaire (voir section 6). |

---

## 3. Decision : base de donnees locale

### 3.1 Options evaluees

#### Option A : Drift (SQLite, typesafe, reactif)

Drift (anciennement Moor) est un ORM reactif au-dessus de SQLite pour Dart/Flutter. Il genere du code Dart type-safe a partir de definitions de tables, supporte les migrations, les requetes complexes, les streams reactifs, et les transactions.

- **Maintenance** : Activement maintenu par Simon Binder. Version 2.31+ compatible Flutter 3.x. Releases regulieres en 2025-2026. Repository GitHub actif (~2.5K stars).
- **Avantages** : Type-safety a la compilation, API reactive (streams), migrations robustes integrees, requetes SQL complexes possibles, support multi-plateforme (Android, iOS, Web, desktop).
- **Inconvenients** : Code generation necessaire (build_runner), courbe d'apprentissage initiale, overhead par rapport a un key-value store pour des donnees simples.

#### Option B : Hive CE (NoSQL key-value, pur Dart)

Hive est un key-value store ecrit en pur Dart. La version originale n'est plus maintenue ; **Hive CE** (Community Edition) a pris le relais.

- **Maintenance** : Hive original abandonne. Hive CE activement maintenu par la communaute. Publié sous `hive_ce` sur pub.dev.
- **Avantages** : Extremement rapide pour le key-value, zero dependance native, API simple, chiffrement integre.
- **Inconvenients** : Pas de requetes complexes, pas de relations, pas de migrations structurees, l'ecosysteme est fragmente (Hive vs Hive CE vs Hive v2).

#### Option C : Isar (NoSQL, performant, indexe)

Isar est une base NoSQL rapide concue pour Flutter, avec support d'index et de requetes complexes.

- **Maintenance** : Situation fragmentee. Le repo original (isar/isar) a une v4 en dev. Un fork communautaire existe (`isar_community`). Un autre fork enrichi (`isar_plus`). Cette fragmentation cree un risque.
- **Avantages** : Tres performant (benchmarks : 15K objets en ~10ms), requetes indexees, API Dart-native, inspecteur integre.
- **Inconvenients** : Fragmentation de l'ecosysteme, avenir incertain, dependances binaires natives (pas pur Dart), moins de ressources en cas de probleme.

#### Option D : SharedPreferences (key-value simple, natif)

Wrapper autour de NSUserDefaults (iOS) et SharedPreferences (Android). Parfait pour les preferences et les petites valeurs.

- **Maintenance** : Package officiel Flutter (`shared_preferences`), maintenu par l'equipe Flutter.
- **Avantages** : Zero setup, API triviale, toujours a jour.
- **Inconvenients** : Pas concu pour des donnees structurees, pas de requetes, pas de streams, lecture synchrone seulement, limites de taille (quelques Mo max).

### 3.2 Decision : approche hybride a 3 niveaux

```
┌──────────────────────────────────────────────────────────────────┐
│                    Stockage local Flutter                        │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │  SharedPreferences    │  │  Drift (SQLite)                  │ │
│  │  (non sensible)       │  │                                  │ │
│  │                       │  │  - Reservations en cours         │ │
│  │  - Flags feature      │  │  - QR code + PIN (chiffre)       │ │
│  │  - Derniere sync      │  │  - Profil + preferences          │ │
│  │  - Onboarding done    │  │    alimentaires (chiffre)        │ │
│  │  - Theme/langue       │  │  - Cache API (partenaires,       │ │
│  │                       │  │    categories)                   │ │
│  └──────────────────────┘  │  - Queue d'actions offline       │ │
│                             │  - Historique reservations        │ │
│  ┌──────────────────────┐  │  - Favoris                        │ │
│  │  flutter_secure_      │  └──────────────────────────────────┘ │
│  │  storage (cles)       │                                       │
│  │                       │  ⬑ Colonnes sensibles chiffrees       │
│  │  - Cle AES-256 pour   │    AES-256-GCM (cle ci-contre)       │
│  │    Drift encryption   │                                       │
│  │  (Keychain / Keystore)│                                       │
│  └──────────────────────┘                                        │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  flutter_cache_manager (fichiers)                            ││
│  │                                                              ││
│  │  - Images partenaires et paniers                             ││
│  │  - Photos de profil                                          ││
│  │  - Assets statiques (logos, illustrations)                   ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### 3.3 Justification

| Critere                        | Drift       | Hive CE     | Isar        | Decision    |
|--------------------------------|-------------|-------------|-------------|-------------|
| Type-safety                    | Excellent   | Faible      | Bon         | **Drift**   |
| Requetes complexes             | SQL complet | Non         | Index/filtre| **Drift**   |
| Migrations                     | Integrees   | Manuelles   | Manuelles   | **Drift**   |
| Performance brute              | Bonne       | Excellente  | Excellente  | Suffisant   |
| API reactive (streams)         | Natif       | Non         | Natif       | **Drift**   |
| Maintenance / perennite        | Solide      | Communaute  | Fragmente   | **Drift**   |
| Chiffrement                    | Via SQLCipher| Integre    | Integre     | Drift + SQLCipher |
| Complexite setup               | Moyenne     | Simple      | Moyenne     | Acceptable  |
| Pur Dart (pas de binaire natif)| Non (SQLite)| Oui         | Non         | Non-bloquant|

**Drift est choisi comme base locale principale** parce que :
1. Les reservations avec QR/PIN sont des donnees relationnelles (reservation → commerce → creneau)
2. La queue d'actions offline necessite des requetes ordonnees (ORDER BY created_at)
3. Les migrations structurees sont essentielles pour les mises a jour de l'app via les stores
4. L'API reactive (streams) permet de mettre a jour l'UI automatiquement quand les donnees locales changent
5. SQLite est la technologie de stockage local la plus eprouvee au monde

**Hive CE est ecarte** : la simplicite du key-value ne justifie pas le risque d'un ecosysteme fragmente. SharedPreferences couvre les besoins key-value simples, Drift couvre les besoins structures.

**Isar est ecarte** : la fragmentation en 3 forks (isar, isar_community, isar_plus) cree un risque de perennite inacceptable pour un projet en phase de demarrage. Si le mainteneur principal delaisse le projet, la migration serait couteuse.

### 3.4 Schema Drift (consumer app)

```dart
// tables.dart — definitions Drift

class Reservations extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get serverId => text().unique()();              // ex: "RES-2026-00142"
  TextColumn get partnerName => text()();
  TextColumn get partnerAddress => text()();
  TextColumn get basketTitle => text()();
  IntColumn get quantity => integer()();
  DateTimeColumn get pickupStart => dateTime()();
  DateTimeColumn get pickupEnd => dateTime()();
  TextColumn get status => text()();                         // reserved, picked_up, cancelled, no_show
  TextColumn get qrPayload => text().map(const EncryptedConverter())(); // chiffre AES-256-GCM
  TextColumn get pin => text().map(const EncryptedConverter())();       // chiffre AES-256-GCM (hashe argon2id cote serveur)
  DateTimeColumn get cachedAt => dateTime()();
  DateTimeColumn get lastSyncAt => dateTime().nullable()();
  RealColumn get partnerLat => real().nullable()();
  RealColumn get partnerLng => real().nullable()();
}

class CachedUserProfile extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get serverId => text().unique()();
  TextColumn get displayName => text()();
  TextColumn get email => text()();
  TextColumn get phoneNumber => text().nullable()();
  TextColumn get avatarUrl => text().nullable()();
  // DONNEE SENSIBLE : preferences alimentaires (halal, vegetarien, vegan...)
  // Indicateur indirect de religion/sante — DPA 2017 donnees sensibles (ADR-021 Q3)
  // Chiffre AES-256-GCM au repos via EncryptedConverter
  TextColumn get dietaryPreferences => text().map(const EncryptedConverter()).nullable()(); // JSON array chiffre
  DateTimeColumn get cachedAt => dateTime()();
}

class CachedPartners extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get serverId => text().unique()();
  TextColumn get name => text()();
  TextColumn get address => text()();
  TextColumn get imageUrl => text().nullable()();
  RealColumn get lat => real()();
  RealColumn get lng => real()();
  RealColumn get rating => real().nullable()();
  TextColumn get categoriesJson => text()();                 // JSON array de category IDs
  DateTimeColumn get cachedAt => dateTime()();
}

class CachedCategories extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get serverId => text().unique()();
  TextColumn get name => text()();
  TextColumn get iconName => text()();
  IntColumn get sortOrder => integer()();
  DateTimeColumn get cachedAt => dateTime()();
}

class OfflineActionQueue extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get actionType => text()();                     // ex: "validate_pickup", "cancel_reservation"
  TextColumn get payloadJson => text()();                    // JSON serialise de l'action
  DateTimeColumn get createdAt => dateTime()();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  DateTimeColumn get lastRetryAt => dateTime().nullable()();
  TextColumn get status => text().withDefault(const Constant('pending'))(); // pending, syncing, synced, failed
  TextColumn get errorMessage => text().nullable()();
}
```

### 3.5 Chiffrement des donnees sensibles au repos

Plusieurs colonnes du cache Drift contiennent des **donnees sensibles** qui doivent etre chiffrees au repos (at rest) :

| Table | Colonne | Nature de la sensibilite | Ref |
|-------|---------|--------------------------|-----|
| `Reservations` | `qrPayload` | Permet de valider un retrait (secret transactionnel) | US-C039 |
| `Reservations` | `pin` | Secret partage consommateur/partenaire (hashe cote serveur, chiffre cote client) | US-C040 |
| `CachedUserProfile` | `dietaryPreferences` | **Donnee sensible DPA 2017** : indicateur indirect de religion (halal), sante (sans gluten), convictions (vegan). Cf. ADR-021 Q3. | ADR-021 |

> **Regle** : toute colonne marquee `EncryptedConverter` dans le schema Drift (section 3.4) est chiffree AES-256-GCM au repos. Si de nouvelles donnees sensibles sont ajoutees au cache local, elles DOIVENT utiliser ce converter.

**Approche** : chiffrement au niveau du champ (field-level encryption) via un `TypeConverter` Drift custom, avec la **cle de chiffrement stockee dans `flutter_secure_storage`** (Keychain iOS / Keystore Android — chiffrement hardware, cf. ADR-022 Annexe D.1) :

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:encrypt/encrypt.dart' as encrypt;

class EncryptedConverter extends TypeConverter<String, String> {
  const EncryptedConverter();

  // Cle AES-256 chargee depuis flutter_secure_storage au demarrage de l'app
  // Jamais persistee en clair sur le filesystem
  static late final encrypt.Key _key;

  /// Initialise la cle de chiffrement.
  /// Appelee une seule fois au demarrage, apres l'authentification.
  /// La cle est derivee via PBKDF2 et stockee dans flutter_secure_storage.
  static Future<void> init(String userId) async {
    const storage = FlutterSecureStorage();
    final storageKey = 'bienbon_drift_enc_key_$userId';

    // Recuperer la cle existante ou en generer une nouvelle
    String? storedKey = await storage.read(key: storageKey);
    if (storedKey == null) {
      // Premiere utilisation : generer une cle AES-256 aleatoire
      final newKey = encrypt.Key.fromSecureRandom(32);
      await storage.write(key: storageKey, value: newKey.base64);
      storedKey = newKey.base64;
    }

    _key = encrypt.Key.fromBase64(storedKey);
  }

  /// Supprime la cle de chiffrement (a appeler lors du logout / suppression de compte)
  static Future<void> destroy(String userId) async {
    const storage = FlutterSecureStorage();
    await storage.delete(key: 'bienbon_drift_enc_key_$userId');
  }

  @override
  String fromSql(String fromDb) {
    // Format stocke : base64(iv):base64(ciphertext):base64(tag)
    final parts = fromDb.split(':');
    final iv = encrypt.IV.fromBase64(parts[0]);
    final encrypted = encrypt.Encrypted.fromBase64(parts[1]);
    final encrypter = encrypt.Encrypter(encrypt.AES(_key, mode: encrypt.AESMode.gcm));
    return encrypter.decrypt(encrypted, iv: iv);
  }

  @override
  String toSql(String value) {
    final iv = encrypt.IV.fromSecureRandom(12); // 96 bits pour GCM
    final encrypter = encrypt.Encrypter(encrypt.AES(_key, mode: encrypt.AESMode.gcm));
    final encrypted = encrypter.encrypt(value, iv: iv);
    return '${iv.base64}:${encrypted.base64}';
  }
}
```

**Changements cles par rapport a une approche naive** :

1. **AES-256-GCM** (et non AES-CBC) : GCM fournit l'authentification integree (AEAD), empechant les attaques par padding oracle et garantissant l'integrite du chiffre. C'est la recommandation OWASP pour le chiffrement symetrique (cf. ADR-022, A02 -- Cryptographic Failures).
2. **`flutter_secure_storage`** pour la cle de chiffrement : la cle est stockee dans le Keychain iOS / Keystore Android (chiffrement hardware), et non derivee du device ID (qui est prédictible et desormais restreint sur iOS/Android). Cf. ADR-022 Annexe D.1.
3. **IV aleatoire de 96 bits** (standard GCM) pour chaque operation de chiffrement, stocke avec le chiffre.
4. **Cle par utilisateur** : chaque utilisateur a sa propre cle. La suppression de compte detruit la cle, rendant les donnees cachees irrecuperables (cf. ADR-021, droit a l'effacement).

**Pourquoi field-level plutot que full-database encryption (SQLCipher)** :
- SQLCipher ajoute une dependance binaire lourde (~3-5 Mo) et complexifie le build
- Seuls QR, PIN et preferences alimentaires sont reellement sensibles ; les noms de partenaires ou les categories ne necessitent pas de chiffrement
- Le field-level est plus simple a auditer et a tester
- Si un audit de securite exige plus tard un chiffrement complet, on peut migrer vers SQLCipher sans changer le schema

---

## 4. Decision : strategie de cache API

### 4.1 Approche par type de donnee

L'API REST (ADR-004) utilise des view endpoints optimises pour chaque ecran mobile. Le cache cote client doit s'adapter a la volatilite de chaque endpoint.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Strategies de cache API                       │
│                                                                  │
│  Cache-First (reseau en fallback)                               │
│  ├── GET /api/v1/categories          TTL: 7j                   │
│  ├── GET /api/v1/stores              TTL: 24h                  │
│  ├── GET /api/v1/stores/:id          TTL: 12h                  │
│  └── GET /api/v1/consumer/profile    TTL: 1h                   │
│                                                                  │
│  Stale-While-Revalidate (cache + refresh en arriere-plan)       │
│  ├── GET /api/v1/baskets?nearby=...  TTL: 5 min, stale: 30 min │
│  ├── GET /api/v1/reservations        TTL: 2 min, stale: 15 min │
│  └── GET /api/v1/favorites           TTL: 1h, stale: 24h       │
│                                                                  │
│  Network-Only (jamais de cache)                                 │
│  ├── POST /api/v1/reservations       (creation)                 │
│  ├── POST /api/v1/payments           (paiement)                 │
│  ├── POST /api/v1/pickups/validate   (validation retrait)       │
│  └── SSE /api/v1/baskets/stock/live  (stock temps reel)         │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Implementation : intercepteur Dio custom + Drift

Plutot que d'utiliser `dio_cache_interceptor` (qui repose sur des stores tiers et ajoute une abstraction supplementaire), on implementera un **intercepteur Dio custom** qui utilise Drift comme store de cache. Cela evite de multiplier les dependances et centralise tout le stockage local dans Drift.

```dart
class ApiCacheInterceptor extends Interceptor {
  final AppDatabase db;
  final ConnectivityService connectivity;

  ApiCacheInterceptor(this.db, this.connectivity);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // Seulement les GET
    if (options.method != 'GET') return handler.next(options);

    final cachePolicy = options.extra['cachePolicy'] as CachePolicy?;
    if (cachePolicy == null || cachePolicy == CachePolicy.networkOnly) {
      return handler.next(options);
    }

    final cached = await db.getCachedResponse(options.uri.toString());

    if (cached != null) {
      final age = DateTime.now().difference(cached.cachedAt);
      final isStale = age > cachePolicy.maxAge;
      final isTooStale = age > cachePolicy.staleWhileRevalidate;

      if (!isStale) {
        // Cache frais → retourner directement
        return handler.resolve(Response(
          data: jsonDecode(cached.body),
          statusCode: 200,
          requestOptions: options,
          headers: Headers.fromMap({'x-cache': ['HIT']}),
        ));
      }

      if (!isTooStale && cachePolicy.staleWhileRevalidate != Duration.zero) {
        // Stale mais acceptable → retourner le cache + revalider en arriere-plan
        handler.resolve(Response(
          data: jsonDecode(cached.body),
          statusCode: 200,
          requestOptions: options,
          headers: Headers.fromMap({'x-cache': ['STALE']}),
        ));
        // Revalidation asynchrone (fire-and-forget)
        _revalidate(options);
        return;
      }
    }

    // Pas de cache ou trop stale → aller au reseau
    if (!await connectivity.isOnline) {
      if (cached != null) {
        // Offline + cache existe = retourner le cache meme tres stale
        return handler.resolve(Response(
          data: jsonDecode(cached.body),
          statusCode: 200,
          requestOptions: options,
          headers: Headers.fromMap({'x-cache': ['OFFLINE-STALE']}),
        ));
      }
      return handler.reject(DioException(
        requestOptions: options,
        type: DioExceptionType.connectionError,
        error: 'No network and no cached data',
      ));
    }

    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) async {
    if (response.requestOptions.method == 'GET') {
      final cachePolicy = response.requestOptions.extra['cachePolicy'] as CachePolicy?;
      if (cachePolicy != null && cachePolicy != CachePolicy.networkOnly) {
        await db.upsertCachedResponse(
          url: response.requestOptions.uri.toString(),
          body: jsonEncode(response.data),
          cachedAt: DateTime.now(),
        );
      }
    }
    handler.next(response);
  }
}

enum CachePolicyType { cacheFirst, staleWhileRevalidate, networkOnly }

class CachePolicy {
  final CachePolicyType type;
  final Duration maxAge;
  final Duration staleWhileRevalidate;

  const CachePolicy.cacheFirst(this.maxAge)
      : type = CachePolicyType.cacheFirst,
        staleWhileRevalidate = Duration.zero;

  const CachePolicy.staleWhileRevalidate({
    required this.maxAge,
    required this.staleWhileRevalidate,
  }) : type = CachePolicyType.staleWhileRevalidate;

  static const networkOnly = CachePolicy._networkOnly();
  const CachePolicy._networkOnly()
      : type = CachePolicyType.networkOnly,
        maxAge = Duration.zero,
        staleWhileRevalidate = Duration.zero;
}
```

Usage dans le repository :

```dart
class StoreRepository {
  final Dio dio;

  Future<List<Store>> getNearbyStores(double lat, double lng) async {
    final response = await dio.get(
      '/api/v1/stores',
      queryParameters: {'lat': lat, 'lng': lng, 'radius': '5km'},
      options: Options(extra: {
        'cachePolicy': const CachePolicy.cacheFirst(Duration(hours: 24)),
      }),
    );
    return (response.data as List).map((j) => Store.fromJson(j)).toList();
  }
}

class BasketRepository {
  final Dio dio;

  Future<List<Basket>> getNearbyBaskets(double lat, double lng) async {
    final response = await dio.get(
      '/api/v1/baskets',
      queryParameters: {'lat': lat, 'lng': lng, 'radius': '5km'},
      options: Options(extra: {
        'cachePolicy': const CachePolicy.staleWhileRevalidate(
          maxAge: Duration(minutes: 5),
          staleWhileRevalidate: Duration(minutes: 30),
        ),
      }),
    );
    return (response.data as List).map((j) => Basket.fromJson(j)).toList();
  }
}
```

### 4.3 Invalidation du cache

| Evenement                          | Action                                             |
|------------------------------------|----------------------------------------------------|
| Reservation creee                  | Invalider cache `/reservations`                    |
| Reservation annulee               | Invalider cache `/reservations`                    |
| Retrait valide                     | Invalider cache `/reservations` + `/reservations/:id` |
| Changement de profil               | Invalider cache `/consumer/profile`                |
| Push notification "panier annule"  | Invalider cache `/reservations` + mettre a jour la reservation locale |
| App passe au premier plan (resume) | Re-verifier les caches stale                       |
| Pull-to-refresh manuel             | Forcer Network-Only pour l'ecran courant           |

---

## 5. Decision : QR code et PIN offline (US-C043)

C'est l'exigence la plus critique de toute la strategie offline. **Le pickup ne peut pas echouer a cause du reseau.**

### 5.1 Generation du QR code et du PIN

**Decision : generation cote serveur, cache cote client.**

Le QR code et le PIN sont generes par le backend au moment de la confirmation de reservation, pour les raisons suivantes :

1. **Unicite garantie** : le serveur a une vue globale de toutes les reservations. Un PIN de 4-6 chiffres genere cote client pourrait avoir des collisions.
2. **Securite** : le QR payload contient un identifiant unique crypte (US-C039). Le chiffrement et la signature se font avec la cle privee du serveur. Le client n'a pas et ne doit pas avoir cette cle.
3. **Verification partenaire** : quand le partenaire scanne le QR (US-P026), il envoie le payload au serveur qui le verifie contre sa base. Si le QR etait genere cote client avec des donnees locales, le serveur ne pourrait pas le valider de maniere fiable.

**Format du QR payload** :

```
bienbon://pickup/<reservation_id_chiffre>
```

Le payload est un identifiant opaque (UUID chiffre avec une cle serveur, non decodable par le client). Le QR code est genere **cote client** a partir de ce payload avec le package `qr_flutter`, qui fonctionne entierement offline.

**Le PIN** est un code numerique de 6 chiffres genere par le serveur, unique par reservation. Le PIN suit un cycle de vie securise :

1. **Generation** : le serveur genere un PIN aleatoire de 6 chiffres (cryptographiquement securise, `crypto.randomInt`).
2. **Stockage serveur** : le PIN est immediatement **hashe avec argon2id** (ou bcrypt en fallback) avant stockage en base. Le PIN en clair n'est **jamais persiste cote serveur**.
3. **Transmission** : le PIN en clair est envoye **une seule fois** au client dans la reponse de confirmation de reservation (via TLS 1.3).
4. **Stockage client** : le PIN est **chiffre AES-256-GCM** dans le cache Drift local (cf. section 3.5). Il n'existe en clair que le temps de l'affichage a l'ecran.
5. **Validation au pickup** : voir section 5.5 pour le flow complet.

> **Conformite OWASP A02** (ADR-022) : le PIN est un secret partage. Le stockage en clair cote serveur exposerait tous les PINs en cas de breach de la base. Le hashage avec argon2id (resistant aux attaques GPU/ASIC) protege les PINs meme en cas de compromission de la BDD. Cf. ADR-022 section 2.3.

### 5.2 Flux de cache du QR/PIN

```
                   CONFIRMATION DE RESERVATION
                            │
                            ▼
  ┌─────────────────────────────────────────┐
  │  POST /api/v1/reservations              │
  │  Response:                              │
  │  {                                      │
  │    "id": "RES-2026-00142",              │
  │    "qr_payload": "bienbon://pickup/...",│
  │    "pin": "482731",  ← en clair,       │
  │         unique envoi (le serveur ne     │
  │         stocke que le hash argon2id)    │
  │    "partner_name": "Le Chamarel",       │
  │    "partner_address": "12 Rue Royale",  │
  │    "basket_title": "Panier Surprise",   │
  │    "quantity": 1,                       │
  │    "pickup_start": "2026-02-27T12:00",  │
  │    "pickup_end": "2026-02-27T14:00",    │
  │    "partner_lat": -20.1619,             │
  │    "partner_lng": 57.4989               │
  │  }                                      │
  └────────────────────┬────────────────────┘
                       │
                       ▼
  ┌─────────────────────────────────────────┐
  │  Cache immediat dans Drift              │
  │  (dans la meme transaction que la       │
  │   mise a jour de l'UI)                  │
  │                                         │
  │  INSERT INTO reservations (             │
  │    server_id, partner_name, ...,        │
  │    qr_payload [CHIFFRE AES-256],        │
  │    pin [CHIFFRE AES-256],               │
  │    cached_at, last_sync_at              │
  │  )                                      │
  └────────────────────┬────────────────────┘
                       │
                       ▼
  ┌─────────────────────────────────────────┐
  │  L'ecran QR/PIN lit depuis Drift        │
  │  (PAS depuis le cache API)              │
  │                                         │
  │  → QR genere localement via qr_flutter  │
  │    a partir du qr_payload dechiffre     │
  │  → PIN affiche en grand format          │
  │  → Luminosite ecran augmentee           │
  │  → Fonctionne a 100% sans reseau       │
  └─────────────────────────────────────────┘
```

### 5.3 Comportement offline detaille (US-C043)

```
┌─────────────────────────────────────────────────────────────────┐
│                 ECRAN RESERVATION (mode offline)                 │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ⚠ Mode hors ligne                                       │  │
│  │  Les informations affichees proviennent du cache local    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Le Chamarel                                                    │
│  Panier Surprise x1                                             │
│  📅 Auj. 12h00 - 14h00                                          │
│                                                                  │
│  ┌─────────────────────┐                                        │
│  │  [QR CODE GENERE    │   ← qr_flutter, 100% local            │
│  │   LOCALEMENT]       │                                        │
│  └─────────────────────┘                                        │
│                                                                  │
│  Code PIN : 4 8 2 7 3 1                                         │
│                                                                  │
│  [Annuler] ← DESACTIVE, tooltip "Connexion requise"            │
│  [Itineraire] ← Fonctionne (ouvre app GPS externe)             │
│                                                                  │
│  Si offline > 30 min :                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ⚠ Impossible d'actualiser le statut depuis 35 min.      │  │
│  │  Le partenaire Le Chamarel pourrait avoir annule le       │  │
│  │  panier. Retablissez la connexion pour verifier.          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Logique de re-check** :

```dart
class ReservationOfflineMonitor {
  Timer? _recheckTimer;
  DateTime? _lastSuccessfulSync;
  final ConnectivityService connectivity;
  final ReservationRepository repo;

  void startMonitoring(String reservationId) {
    _recheckTimer = Timer.periodic(const Duration(minutes: 30), (_) async {
      if (await connectivity.isOnline) {
        try {
          await repo.syncReservation(reservationId);
          _lastSuccessfulSync = DateTime.now();
        } catch (_) {
          // Echec silencieux, on garde le cache
        }
      }
    });
  }

  bool get shouldShowStaleWarning {
    if (_lastSuccessfulSync == null) return false;
    return DateTime.now().difference(_lastSuccessfulSync!) > const Duration(minutes: 30);
  }
}
```

### 5.4 Securite du QR offline

**Risque** : un utilisateur malveillant extrait le QR payload de la base locale et le partage a un tiers.

**Mitigations** :
1. Le QR payload est un identifiant opaque signe par le serveur. Meme si quelqu'un l'extrait, il ne contient aucune donnee personnelle (US-C039).
2. Le QR payload et le PIN sont chiffres AES-256-GCM dans Drift, avec la cle stockee dans `flutter_secure_storage` (voir section 3.5).
3. La validation cote serveur verifie que la reservation appartient bien au compte authentifie (le partenaire appelle `POST /pickups/validate` avec son token). Si le QR est presente par un tiers, le serveur peut comparer le device ID ou l'IP comme signal de fraude (ADR-019).
4. Le PIN a 6 chiffres est a usage unique : une fois valide, il ne fonctionne plus. Le serveur ne stocke que le **hash argon2id** du PIN (voir section 5.5) — en cas de breach BDD, les PINs ne sont pas exposes en clair.
5. Le QR code ne contient PAS le PIN — ce sont deux canaux independants.
6. Les preferences alimentaires cachees localement (section 3.4, table `CachedUserProfile`) sont egalement chiffrees AES-256-GCM pour proteger les donnees sensibles DPA 2017 (ADR-021 Q3).

### 5.5 Flow de validation du PIN au pickup

Le PIN est un secret partage entre le consommateur et le serveur. Voici le flow complet de bout en bout :

```
  CONSOMMATEUR                     SERVEUR                      PARTENAIRE
  ============                     =======                      ==========

  1. Reserve un panier
     POST /reservations
                              ──────►
                                 2. Genere PIN = "482731"
                                    Hash = argon2id("482731")
                                    Stocke HASH en BDD
                                    (PIN en clair jamais persiste)
                              ◄──────
  3. Recoit PIN en clair
     dans la reponse (TLS 1.3)
     Chiffre AES-256-GCM
     dans Drift local
     (cle dans flutter_secure_storage)

  4. Affiche le PIN a l'ecran
     (et/ou QR code)
                                                          ┌──────────────────┐
  5. Presente le PIN                                      │ OPTION A : QR    │
     au partenaire ─────────────────────────────────────► │ Le partenaire    │
     (verbalement ou QR)                                  │ scanne le QR     │
                                                          └────────┬─────────┘
                                                                   │
                                                          ┌────────▼─────────┐
                                                          │ OPTION B : PIN   │
                                                          │ Le partenaire    │
                                                          │ saisit le PIN    │
                                                          └────────┬─────────┘
                                                                   │
                                                                   ▼
                                                          6. POST /pickups/validate
                                                             { reservation_id, pin: "482731" }
                                                                   │
                                                          ──────────►
                                                             7. Serveur :
                                                                argon2id.verify(
                                                                  hash_stocke,
                                                                  pin_recu
                                                                )
                                                                Si OK → 200, retrait confirme
                                                                Si KO → 401, PIN invalide
                                                          ◄──────────
                                                          8. Partenaire voit
                                                             "Retrait confirme ✓"
```

**Points cles du flow** :

- Le **PIN en clair** n'existe que (a) temporairement en memoire serveur lors de la generation, (b) dans le cache client chiffre AES-256-GCM, et (c) a l'ecran du consommateur lors du retrait.
- Le **serveur ne stocke jamais le PIN en clair**, uniquement le hash argon2id. En cas de breach de la BDD, les PINs sont proteges.
- Le **QR code ne contient pas le PIN** mais un identifiant opaque de reservation. Le partenaire peut aussi saisir le PIN manuellement (US-P027).
- En **mode offline partenaire** (section 6), le PIN saisi est mis en queue dans `OfflineActionQueue` et valide contre le hash serveur des que le reseau revient. La validation locale optimiste verifie uniquement le format et l'existence de la reservation en cache, pas le hash du PIN (le partenaire n'a pas le hash).

---

## 6. Decision : synchronisation offline partenaire (validation pickup)

### 6.1 Le probleme

Le partenaire scanne un QR code (US-P026) ou saisit un PIN (US-P027) pour valider un retrait. Normalement, l'action est envoyee au serveur qui met a jour le statut de la reservation. Mais si le WiFi du magasin tombe au moment du scan, le partenaire ne doit pas etre bloque.

### 6.2 Decision : queue d'actions offline avec sync automatique

```
   PARTENAIRE SCANNE LE QR
            │
            ▼
   ┌──────────────────────┐     OUI     ┌──────────────────────┐
   │  Reseau disponible?  │────────────▶│  POST /pickups/validate │
   └──────────────────────┘             │  → 200 OK               │
            │                            │  → Retrait confirme     │
            │ NON                        └──────────────────────┘
            ▼
   ┌──────────────────────────────────────────┐
   │  Validation locale optimiste             │
   │                                          │
   │  1. Verifier le QR/PIN localement :      │
   │     - Format valide ?                    │
   │     - Reservation connue localement ?    │
   │     - Statut = "reserved" ?              │
   │     - Creneau en cours ?                 │
   │                                          │
   │  2. Si OK :                              │
   │     - Afficher "Retrait valide ✓"        │
   │       avec mention "(en attente de sync)"│
   │     - Enregistrer dans                   │
   │       OfflineActionQueue                 │
   │                                          │
   │  3. Si NON :                             │
   │     - Afficher erreur appropriee         │
   │     - Pas d'enregistrement dans la queue │
   └──────────────────────────────────────────┘
            │
            ▼ (quand le reseau revient)
   ┌──────────────────────────────────────────┐
   │  SyncWorker (arriere-plan)               │
   │                                          │
   │  Pour chaque action en queue :           │
   │  1. POST /pickups/validate               │
   │  2. Si 200 → marquer "synced"            │
   │  3. Si 409 (conflit) → marquer "conflict"│
   │     (ex: reservation annulee entre-temps) │
   │  4. Si erreur reseau → retry avec        │
   │     backoff exponentiel                  │
   │                                          │
   │  Backoff : 2s → 4s → 8s → 16s → 30s max │
   │  Max retries : 10                        │
   │  Apres 10 echecs : notification au       │
   │  partenaire + alert admin                │
   └──────────────────────────────────────────┘
```

### 6.3 Validation locale : donnees necessaires

Pour que le partenaire puisse valider un QR en mode offline, il doit avoir les reservations du jour en cache local. Cela necessite de **pre-charger les reservations du jour au demarrage de l'ecran partner**.

```dart
class PartnerReservationSync {
  /// Pre-charge les reservations du jour pour permettre la validation offline
  Future<void> prefetchTodayReservations() async {
    final reservations = await dio.get(
      '/api/v1/partner/reservations',
      queryParameters: {'date': 'today', 'status': 'reserved'},
      options: Options(extra: {
        'cachePolicy': const CachePolicy.staleWhileRevalidate(
          maxAge: Duration(minutes: 2),
          staleWhileRevalidate: Duration(minutes: 30),
        ),
      }),
    );
    // Stocker dans Drift avec le qr_payload attendu pour chaque reservation
    await db.upsertPartnerReservations(reservations.data);
  }
}
```

**Le serveur doit inclure le `qr_payload` attendu dans la reponse des reservations partenaire**, afin que le client puisse faire la correspondance QR scanne ↔ reservation en mode offline.

### 6.4 Resolution de conflits

Les conflits sont rares mais possibles :

| Scenario                                         | Resolution                                                         |
|--------------------------------------------------|--------------------------------------------------------------------|
| Retrait valide offline, mais reservation annulee par le consommateur entre-temps | Serveur retourne 409. Partenaire notifie. Admin alerte. Remboursement automatique si le paiement a ete capture. |
| Retrait valide offline, et le consommateur fait un no-show "officiel" (timeout systeme) | Le sync du partenaire arrive apres le marquage no-show. Le serveur accepte la validation (le retrait a bien eu lieu). Le no-show est annule. |
| Deux validations du meme QR (double scan)        | Idempotence : le serveur retourne 200 les deux fois, avec le meme timestamp de retrait. |
| Retrait valide offline, mais le creneau est depasse | Le serveur accepte avec un flag "retrait tardif". L'admin est notifie. Le partenaire voit un warning. |

**Principe cle : en cas de doute, le retrait physique prime.** Si le partenaire a donne le panier au consommateur, la transaction est consideree comme effectuee. Le systeme s'ajuste.

---

## 7. Decision : cache d'images et assets

### 7.1 Packages

| Package                   | Role                                          | Version  |
|---------------------------|-----------------------------------------------|----------|
| `cached_network_image`    | Widget Flutter pour afficher des images avec cache disque | ^3.x     |
| `flutter_cache_manager`   | Gestionnaire de cache fichiers sous-jacent (dependance de cached_network_image) | ^3.x     |

Ces deux packages sont maintenus par Baseflow, activement mis a jour, et utilises par la majorite des apps Flutter en production.

### 7.2 Configuration du cache images

```dart
class BienBonCacheManager extends CacheManager {
  static const key = 'bienbon_images';

  static final BienBonCacheManager instance = BienBonCacheManager._();

  BienBonCacheManager._() : super(Config(
    key,
    stalePeriod: const Duration(days: 14),     // Images cachees 14 jours
    maxNrOfCacheObjects: 500,                   // Max 500 images
    // Environ 50 Mo max (500 images * ~100 Ko en moyenne)
    repo: JsonCacheInfoRepository(databaseName: key),
    fileService: HttpFileService(),
  ));
}
```

### 7.3 Limites de taille

| Type de cache                | Limite        | Justification                                                |
|------------------------------|---------------|--------------------------------------------------------------|
| Images (flutter_cache_manager) | ~50 Mo max (500 images) | Telephones d'entree de gamme a Maurice                       |
| Base Drift (SQLite)          | ~5-10 Mo      | Donnees textuelles, pas volumineux                           |
| SharedPreferences            | < 1 Mo        | Preferences simples uniquement                               |
| **Total cache local**        | **~60 Mo max** | Raisonnable pour un device avec 32 Go de stockage            |

### 7.4 Nettoyage automatique

```dart
class CacheCleanupService {
  /// Nettoie les caches obsoletes
  Future<void> cleanup() async {
    // 1. Supprimer les reservations terminees > 7 jours
    await db.deleteOldReservations(
      olderThan: DateTime.now().subtract(const Duration(days: 7)),
    );

    // 2. Supprimer les reponses API cachees expirees
    await db.deleteExpiredCachedResponses();

    // 3. Purger le cache images (geré par flutter_cache_manager)
    // Le stalePeriod de 14j fait le menage automatiquement

    // 4. Supprimer les actions offline synchronisees > 24h
    await db.deleteOldSyncedActions(
      olderThan: DateTime.now().subtract(const Duration(hours: 24)),
    );
  }
}
```

---

## 8. Decision : detection de l'etat de connexion

### 8.1 Package principal : connectivity_plus

`connectivity_plus` est le package officiel de la communaute Flutter Plus Plugins. Il detecte le type de connexion (WiFi, mobile, aucune) mais **ne garantit PAS l'acces internet reel** (un WiFi captive portal est detecte comme "connecte").

### 8.2 Verification internet reelle : internet_connection_checker_plus

En complement, `internet_connection_checker_plus` effectue un ping reel vers des serveurs (Google DNS, Cloudflare) pour verifier l'acces internet effectif.

### 8.3 Implementation du ConnectivityService

```dart
class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  final InternetConnectionCheckerPlus _checker = InternetConnectionCheckerPlus();

  // Stream reactif pour l'UI
  late final Stream<ConnectivityState> stateStream;

  ConnectivityState _currentState = ConnectivityState.online;
  DateTime? _offlineSince;

  ConnectivityService() {
    stateStream = _connectivity.onConnectivityChanged
      .asyncMap((result) async {
        if (result.contains(ConnectivityResult.none)) {
          return ConnectivityState.offline;
        }
        // Verifier l'acces internet reel
        final hasInternet = await _checker.hasConnection;
        return hasInternet ? ConnectivityState.online : ConnectivityState.offline;
      })
      .distinct()
      .map((state) {
        if (state == ConnectivityState.offline && _currentState == ConnectivityState.online) {
          _offlineSince = DateTime.now();
        } else if (state == ConnectivityState.online) {
          _offlineSince = null;
        }
        _currentState = state;
        return state;
      });
  }

  bool get isOnline => _currentState == ConnectivityState.online;
  Duration? get offlineDuration =>
    _offlineSince != null ? DateTime.now().difference(_offlineSince!) : null;
}

enum ConnectivityState { online, offline }
```

### 8.4 Comportement UX par ecran

| Ecran                       | Mode online                      | Mode offline                                                        |
|-----------------------------|----------------------------------|---------------------------------------------------------------------|
| Explorer (accueil)          | Normal, stock temps reel (SSE)   | Cache stale des paniers. Banner "Hors ligne". Pull-to-refresh desactive. |
| Fiche panier                | Normal                           | Cache stale si disponible. Bouton "Reserver" desactive.             |
| Mes reservations            | Normal                           | Cache Drift. Liste des reservations en cours accessible.            |
| Ecran QR/PIN                | Normal                           | **100% fonctionnel** depuis Drift. Banner info "Hors ligne".       |
| Paiement                    | Normal                           | **Bloque**. Message "Connexion requise pour le paiement".          |
| Profil                      | Normal                           | Cache Drift. Modification desactivee.                               |
| Partner : Scanner QR        | Normal (validation serveur)      | Validation locale optimiste + queue (section 6).                    |
| Partner : Dashboard         | Temps reel (SSE)                 | Cache stale. Banner "Hors ligne, donnees non actualisees".          |
| Admin : Backoffice          | Normal                           | **Non supporte**. L'admin web necessite une connexion.              |

### 8.5 Banner offline

```dart
class OfflineBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return StreamBuilder<ConnectivityState>(
      stream: context.read<ConnectivityService>().stateStream,
      builder: (context, snapshot) {
        if (snapshot.data == ConnectivityState.offline) {
          return MaterialBanner(
            backgroundColor: const Color(0xFFFFF3E0), // Orange clair
            leading: const Icon(Icons.wifi_off, color: Color(0xFFE65100)),
            content: const Text(
              'Mode hors ligne — certaines fonctionnalites sont limitees',
              style: TextStyle(color: Color(0xFFE65100)),
            ),
            actions: [
              TextButton(
                onPressed: () => _retry(context),
                child: const Text('Reessayer'),
              ),
            ],
          );
        }
        return const SizedBox.shrink();
      },
    );
  }
}
```

---

## 9. Decision : Service Worker pour Flutter Web

### 9.1 Analyse

Flutter Web genere automatiquement un `flutter_service_worker.js` qui pre-cache les assets de l'app (JS/Wasm, fonts, images). Pour les besoins de BienBon :

- **L'admin backoffice (React)** : pas de besoin offline. L'admin travaille toujours en connexion stable.
- **Le consumer web (si Flutter Web)** : un mode offline minimal serait appreciable mais n'est pas critique — le use case principal du consommateur est sur mobile natif.
- **Le partner web (si Flutter Web)** : meme raisonnement.

### 9.2 Decision : SW par defaut de Flutter, pas de SW custom

**Justification** :
1. Le SW par defaut de Flutter gere deja le pre-cache des assets et le chargement offline de l'app shell.
2. Les use cases offline critiques (QR code, validation retrait) sont sur mobile natif, pas sur le web.
3. Un SW custom (ex: avec Workbox) ajoute une complexite significative pour un gain marginal sur le web.
4. Les limitations iOS WebKit (pas de support WasmGC, restrictions Service Worker) reduisent encore l'interet.
5. L'equipe de 2-5 developpeurs a mieux a investir son temps sur le mobile natif.

**Si le besoin evolue** : on pourra migrer vers un SW custom avec Workbox plus tard, sans impact sur l'architecture mobile.

---

## 10. Packages Flutter retenus

### 10.1 Recapitulatif des dependances

| Package                            | Version   | Role                                       | Maintenance  |
|------------------------------------|-----------|--------------------------------------------|--------------|
| `drift`                           | ^2.31     | ORM SQLite reactif, base locale principale | Active (Simon Binder) |
| `drift_flutter`                   | ^0.2      | Integration Flutter de Drift               | Active       |
| `drift_dev`                       | ^2.31     | Code generation Drift (dev dep)            | Active       |
| `build_runner`                    | ^2.4      | Code generation (dev dep)                  | Active (Dart team) |
| `shared_preferences`              | ^2.3      | Preferences simples (key-value)            | Active (Flutter team) |
| `dio`                             | ^5.7      | Client HTTP                                | Active       |
| `cached_network_image`            | ^3.4      | Cache d'images                             | Active (Baseflow) |
| `flutter_cache_manager`           | ^3.4      | Gestionnaire de cache fichiers             | Active (Baseflow) |
| `connectivity_plus`               | ^6.1      | Detection type de connexion                | Active (Flutter Community) |
| `internet_connection_checker_plus` | ^2.5     | Verification internet reelle               | Active       |
| `qr_flutter`                      | ^4.1      | Generation de QR code (100% offline)       | Active       |
| `encrypt`                         | ^5.0      | Chiffrement AES-256-GCM pour donnees sensibles (QR, PIN, preferences alimentaires) | Active       |
| `flutter_secure_storage`          | ^9.2      | Stockage securise de la cle de chiffrement (Keychain/Keystore) | Active       |
| `workmanager`                     | ^0.6      | Taches background (sync offline)           | Active       |

### 10.2 Packages explicitement NON retenus

| Package                  | Raison du rejet                                                     |
|--------------------------|---------------------------------------------------------------------|
| `hive` / `hive_ce`      | Ecosysteme fragmente (Hive original abandonne). SharedPreferences + Drift couvrent tous les besoins. |
| `isar` / `isar_community` / `isar_plus` | 3 forks concurrents = risque de perennite. Drift est plus stable. |
| `objectbox`              | Dependance binaire lourde, licence commerciale pour certaines features. |
| `dio_cache_interceptor`  | Ajoute un store de cache supplementaire. Notre intercepteur custom + Drift est plus simple et plus controle. |
| `powersync`              | Service tiers payant, ajoute une dependance infrastructure. Surdimensionne pour nos besoins offline limites. |
| `brick`                  | Framework lourd qui impose sa propre architecture. Trop opinionne pour notre usage cible. |
| `sqflite`                | Drift est un ORM au-dessus de SQLite qui offre type-safety et streams reactifs. Utiliser sqflite directement serait une regression. |

---

## 11. Risques et mitigations

| Risque                                                | Probabilite | Impact  | Mitigation                                                          |
|-------------------------------------------------------|-------------|---------|---------------------------------------------------------------------|
| Drift deprecie ou mal maintenu                        | Faible      | Eleve   | Drift est au-dessus de SQLite. Migration vers sqflite ou Floor possible sans perte de donnees. |
| QR payload intercepte et reutilise                    | Moyenne     | Eleve   | Chiffrement AES-256-GCM local (cle dans flutter_secure_storage) + signature serveur + idempotence de la validation + device fingerprint. |
| PIN expose en cas de breach BDD serveur               | Faible      | Eleve   | PIN hashe argon2id cote serveur. Jamais stocke en clair. Cf. section 5.1 et 5.5. |
| Preferences alimentaires exposees (cache local)       | Faible      | Eleve   | Donnees sensibles DPA 2017 (ADR-021). Chiffrees AES-256-GCM dans Drift. Cle detruite a la suppression du compte. |
| Validation offline partenaire sur une reservation annulee | Moyenne  | Moyen   | Sync optimiste + resolution serveur (409 Conflict). Le retrait physique prime. Cas rare (annulation pendant que le consommateur est deja dans le magasin). |
| Cache local qui grossit indefiniment                   | Faible      | Moyen   | Nettoyage automatique (section 7.4). Limites strictes sur le cache images (500 fichiers / 50 Mo). |
| `connectivity_plus` detecte "online" mais pas d'internet (captive portal) | Moyenne | Faible | Double verification avec `internet_connection_checker_plus`. Timeout courts sur les requetes (10s). |
| Conflit de sync complexe (ex: double validation)      | Faible      | Faible  | Idempotence cote serveur. Le meme QR scanne deux fois retourne 200 les deux fois. |
| Telephones tres anciens avec peu de stockage           | Moyenne     | Moyen   | Budget cache total < 60 Mo. Nettoyage agressif des images non utilisees. |

---

## 12. Plan d'implementation

### Phase 1 — Fondations (Sprint 1-2)

- [ ] Setup Drift dans les deux apps Flutter (consumer + partner)
- [ ] Definir les tables (reservations, cached_partners, cached_categories, offline_action_queue)
- [ ] Implementer le `ConnectivityService` (connectivity_plus + internet_connection_checker_plus)
- [ ] Implementer l'`OfflineBanner` widget
- [ ] Configurer `cached_network_image` avec le `BienBonCacheManager`

### Phase 2 — QR/PIN offline + chiffrement donnees sensibles (Sprint 3)

- [ ] Integrer `flutter_secure_storage` pour le stockage de la cle AES-256
- [ ] Implementer le `EncryptedConverter` Drift avec AES-256-GCM (section 3.5)
- [ ] Implementer le cache de reservation avec chiffrement QR + PIN
- [ ] Implementer la table `CachedUserProfile` avec preferences alimentaires chiffrees (ADR-021 Q3)
- [ ] Implementer le hashage PIN argon2id cote serveur (NestJS) et le flow de validation (section 5.5)
- [ ] Integrer `qr_flutter` pour la generation locale du QR code
- [ ] Implementer l'ecran QR/PIN avec lecture depuis Drift
- [ ] Implementer le `ReservationOfflineMonitor` (re-check 30 min, warning stale)
- [ ] Tests offline end-to-end (couper le reseau, verifier que le QR s'affiche)
- [ ] Tests de securite : verifier que les colonnes sensibles sont chiffrees dans le fichier SQLite brut

### Phase 3 — Cache API (Sprint 4)

- [ ] Implementer l'intercepteur Dio cache custom avec Drift comme store
- [ ] Definir les `CachePolicy` pour chaque endpoint
- [ ] Implementer l'invalidation de cache (par evenement + pull-to-refresh)
- [ ] Tests de performance : mesurer le temps d'affichage sur 3G simule

### Phase 4 — Validation offline partenaire (Sprint 5)

- [ ] Implementer la `OfflineActionQueue` dans l'app partner
- [ ] Implementer le `SyncWorker` avec backoff exponentiel
- [ ] Pre-charger les reservations du jour au demarrage partner
- [ ] Implementer la validation locale optimiste du QR/PIN
- [ ] Gestion des conflits (409, reservation annulee, retrait tardif)
- [ ] Tests offline end-to-end cote partenaire

### Phase 5 — Polish (Sprint 6)

- [ ] Nettoyage automatique du cache (`CacheCleanupService`)
- [ ] Monitoring : metriques de taille du cache, taux de hit/miss, actions offline en attente
- [ ] Tests sur devices reels a Maurice (conditions reseau reelles)
- [ ] Documentation pour l'equipe

---

## 13. Decision finale — Resume

| Question                                  | Decision                                                                      |
|-------------------------------------------|-------------------------------------------------------------------------------|
| Base de donnees locale                    | **Drift** (SQLite, type-safe, reactif) + SharedPreferences pour les prefs     |
| Cache API                                 | Intercepteur Dio custom avec Drift comme store. 3 strategies : cache-first, stale-while-revalidate, network-only. |
| QR code offline                           | QR payload genere serveur, cache dans Drift (chiffre AES-256), QR rendu localement via `qr_flutter`. **Fonctionne a 100% sans reseau.** |
| PIN offline                               | PIN genere serveur, **hashe argon2id cote serveur**, cache dans Drift chiffre AES-256-GCM cote client. Affiche localement. Validation par comparaison du hash serveur (section 5.5). |
| Validation partenaire offline             | Queue d'actions locale + sync automatique avec backoff exponentiel. Validation optimiste localement. |
| Cache images                              | `cached_network_image` + `flutter_cache_manager`. Max 500 fichiers / ~50 Mo.  |
| Detection connexion                       | `connectivity_plus` + `internet_connection_checker_plus` (double verification). |
| Service Worker web                        | SW par defaut de Flutter. Pas de SW custom. Le web n'est pas le use case offline critique. |
| Chiffrement                               | Field-level AES-256-GCM pour QR/PIN et preferences alimentaires. Cle dans `flutter_secure_storage` (Keychain/Keystore). Pas de full-database encryption. PIN hashe argon2id cote serveur. |
| Taille max du cache total                 | ~60 Mo (raisonnable pour les telephones d'entree de gamme mauriciens).        |

---

## 14. References

### References croisees ADR internes

| ADR | Sujet | Sections de ADR-012 concernees |
|-----|-------|-------------------------------|
| **ADR-021** (Conformite DPA 2017) | Les preferences alimentaires sont des donnees sensibles au sens du DPA 2017 (Q3). Le PIN est une donnee personnelle liee a une transaction. Droit a l'effacement : destruction de la cle de chiffrement locale a la suppression du compte. | Sections 2 (classification Tier 2), 3.4 (schema `CachedUserProfile`), 3.5 (chiffrement), 5.4 (securite QR) |
| **ADR-022** (Securite OWASP) | A02 (Cryptographic Failures) : chiffrement AES-256-GCM, hashage PIN argon2id, stockage cle dans `flutter_secure_storage`. Annexe D.1 : stockage securise cote mobile. | Sections 3.5 (chiffrement), 5.1 (PIN hash serveur), 5.5 (flow validation), 10.1 (packages) |

### References externes

- [Flutter official offline-first documentation](https://docs.flutter.dev/app-architecture/design-patterns/offline-first)
- [Drift — Reactive SQLite for Dart & Flutter](https://github.com/simolus3/drift)
- [Drift setup guide](https://drift.simonbinder.eu/setup/)
- [Hive CE (Community Edition)](https://pub.dev/packages/hive_ce)
- [Isar — status and community forks](https://github.com/isar/isar)
- [Isar Community fork](https://github.com/isar-community/isar)
- [connectivity_plus](https://pub.dev/packages/connectivity_plus)
- [internet_connection_checker_plus](https://pub.dev/packages/internet_connection_checker_plus)
- [cached_network_image](https://pub.dev/packages/cached_network_image)
- [qr_flutter](https://pub.dev/packages/qr_flutter)
- [dio_cache_interceptor](https://pub.dev/packages/dio_cache_interceptor)
- [Flutter databases overview 2025](https://greenrobot.org/database/flutter-databases-overview/)
- [Drift vs Isar vs Realm 2025 comparison](https://nurobyte.medium.com/flutter-db-showdown-drift-vs-isar-vs-realm-2025-discover-the-fastest-most-efficient-ee0bdb2d3647)
- [Hive vs Drift vs Floor vs Isar 2025](https://quashbugs.com/blog/hive-vs-drift-vs-floor-vs-isar-2025)
- [Offline-first Flutter implementation blueprint](https://geekyants.com/blog/offline-first-flutter-implementation-blueprint-for-real-world-apps)
- [Building offline-first mobile apps with Supabase and Brick](https://supabase.com/blog/offline-first-flutter-apps)
- [PowerSync + Supabase](https://www.powersync.com/blog/bringing-offline-first-to-supabase)
- [Flutter Web PWA 2025](https://dasroot.net/posts/2025/12/flutter-web-progressive-web-apps-in-2025/)
- [Dio caching with Hive](https://kamaravichow.medium.com/caching-with-dio-hive-in-flutter-e630ac5fc777)
- [Offline sync with workmanager](https://medium.com/@dhruvmanavadaria/building-offline-auto-sync-in-flutter-with-background-services-using-workmanager-13f5bc94023d)
