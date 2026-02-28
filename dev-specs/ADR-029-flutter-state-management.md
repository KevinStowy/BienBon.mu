# ADR-029 : Flutter State Management -- architecture, temps reel, offline et testing

| Champ         | Valeur                                                                  |
|---------------|-------------------------------------------------------------------------|
| **Statut**    | Propose                                                                 |
| **Date**      | 2026-02-27                                                              |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                                     |
| **Decideurs** | Equipe technique BienBon                                                |
| **Scope**     | State management Flutter, integration SSE, state offline/sync, auth state, monorepo Melos, testing, performance |
| **Prereqs**   | ADR-001 (NestJS + Prisma + Supabase), ADR-009 (SSE temps reel), ADR-010 (Supabase Auth / JWT), ADR-012 (offline-first / Drift), ADR-024 (DDD bounded contexts), ADR-027 (SOLID) |
| **US clefs**  | US-C001 a US-C043 (consumer), US-P001 a US-P030 (partner) |

---

## 1. Contexte

### 1.1 Le probleme

BienBon.mu est une marketplace mobile de paniers anti-gaspi a l'ile Maurice. Deux apps Flutter (consumer + partner) vivent dans un monorepo Melos, partagent des packages communs, et doivent gerer des flux de state complexes :

1. **Temps reel** : le stock des paniers change en temps reel via SSE (ADR-009). Un event `stock_update` doit mettre a jour le state local immediatement, sans que l'utilisateur ne fasse quoi que ce soit.
2. **Offline-first** : les donnees critiques (QR code, PIN, reservations) sont persistees dans Drift/SQLite (ADR-012). Le state management doit refléter les donnees locales quand le reseau est absent, et reconcilier quand il revient.
3. **Authentification** : Supabase Auth avec JWT (ADR-010). Les tokens expirent, se rafraichissent, et l'app doit reagir au logout automatique (token expire + refresh echoue).
4. **DDD/Hexagonal** : l'ADR-024 definit 11 bounded contexts cote backend. Le frontend doit refleter cette architecture avec des frontieres claires entre les couches data, domain et presentation.
5. **SOLID** : l'ADR-027 impose que le code IA respecte les principes SOLID. Le state management doit etre testable (DIP), decouple (SRP), et extensible (OCP).
6. **2 apps, 1 monorepo** : consumer et partner partagent des packages (auth, API client, modeles, offline). Le state management doit permettre ce partage sans couplage.

### 1.2 Pourquoi cette decision est critique

Le choix du state management impacte **chaque ecran, chaque feature, chaque test** des deux apps. Un mauvais choix a ce stade :
- Rend les tests unitaires douloureux (ou impossibles)
- Cree du couplage entre les features (un changement dans le paiement casse l'affichage du panier)
- Complique l'integration SSE (comment un event serveur met-il a jour un widget 5 niveaux plus bas ?)
- Force des rebuilds inutiles (l'ecran entier se reconstruit quand seul le stock change)

### 1.3 Contraintes

- **Equipe IA-first** : 100% du code est genere par des agents IA (Claude Code). La solution doit etre bien documentee, avec des patterns clairs et repetitifs que l'IA peut suivre.
- **Petite equipe** : 2-5 developpeurs. La courbe d'apprentissage doit etre raisonnable.
- **Telephones d'entree de gamme** : marche mauricien, devices 2-4 Go RAM. La performance du state management est un facteur.
- **Flutter 3.x** : les deux apps ciblent la derniere version stable de Flutter.

---

## 2. Choix du state management

### 2.1 Options evaluees

#### Option A : Riverpod (v2.6+)

**Description** : Framework de state management declaratif et compile-safe. Successeur spirituel de Provider, concu par Remi Rousselet. Utilise des "providers" qui sont des unites de state globalement declarees, avec auto-dispose, invalidation, et code generation optionnelle.

**Avantages** :
- **Compile-safe** : les erreurs de dependance entre providers sont detectees a la compilation (pas de `ProviderNotFoundException` au runtime comme Provider)
- **Auto-dispose** : les providers non utilises sont automatiquement liberes. Pas de memory leak si un ecran est quitte.
- **Code generation** (riverpod_generator) : reduit le boilerplate a des annotations (`@riverpod`)
- **Testabilite excellente** : les providers sont des fonctions pures avec des dependances injectables. `ProviderContainer` permet de tester sans widget.
- **AsyncNotifier** : gere nativement les etats async (loading, data, error) via `AsyncValue<T>`
- **Selective rebuild** : `ref.watch()` et `ref.select()` permettent de n'ecouter qu'une partie du state
- **Bien adapte a l'architecture DDD** : les providers se mappent naturellement aux use cases et repositories
- **Communaute massive** : package le plus populaire sur pub.dev pour le state management (~8K GitHub stars)
- **Documentation exhaustive** : exemples, guides, patterns documentes. Ideal pour le guidage IA.

**Inconvenients** :
- **Courbe d'apprentissage** : les concepts (Provider, Notifier, AsyncNotifier, Family, AutoDispose) sont nombreux. L'IA doit comprendre quand utiliser quel type.
- **Code generation** : `riverpod_generator` + `build_runner` ajoute une etape de build. La generation peut etre lente sur un gros projet.
- **State global par defaut** : les providers sont declares au top-level. Sans discipline, on peut finir avec 200 providers dans un fichier.
- **Pas de structure imposee** : contrairement a Bloc, Riverpod ne force pas un pattern (event -> state). L'equipe doit s'imposer des conventions.

#### Option B : Bloc/Cubit (v9+)

**Description** : Pattern event-driven strict. Chaque "Bloc" recoit des Events et emet des States. Cubit est la version simplifiee (methodes au lieu d'events). Concu par Felix Angelov (VGV).

**Avantages** :
- **Architecture stricte** : Event -> Bloc -> State. Le flux de donnees est unidirectionnel et predictible.
- **Tracabilite** : chaque changement de state est declenche par un Event nomme. Le debug est trivial (`BlocObserver` log tous les events et transitions).
- **Testabilite** : `blocTest()` permet de tester Event -> [States attendus] de maniere declarative.
- **Ecosysteme mature** : `flutter_bloc`, `bloc_concurrency`, `hydrated_bloc` (persistance), `replay_bloc` (undo/redo).
- **Conventions fortes** : la communaute Bloc a des conventions claires (1 Bloc par feature, 1 State sealed class, Events en classes).
- **Familier pour les equipes Angular/Redux** : le pattern est proche de Redux (actions -> reducer -> state).

**Inconvenients** :
- **Boilerplate eleve** : chaque feature necessite 3 fichiers minimum (events, states, bloc). Pour un simple toggle, c'est lourd.
- **Verbeux pour les cas simples** : un compteur necessite une classe Event, une classe State, et un Bloc. Cubit reduit la ceremonie mais perd la tracabilite des events.
- **Integration async/stream** : bien que Bloc supporte les streams, l'integration SSE est plus manuelle qu'avec Riverpod (qui gere nativement les streams).
- **Pas de selective rebuild natif** : `BlocSelector` existe mais est moins ergonomique que `ref.select()` de Riverpod.
- **Provider dependency** : `flutter_bloc` repose sur `provider` (le package de Remi Rousselet) pour l'injection dans l'arbre de widgets.
- **Moins adapte au DDD** : les Blocs sont des composants UI-centric (1 par ecran), pas des use cases domain-centric. Le mapping DDD -> Bloc est moins naturel.

#### Option C : Signals (package `signals`)

**Description** : Primitives reactives inspirees de Solid.js et Preact. Une "Signal" est une valeur reactive qui notifie automatiquement ses dependants quand elle change. Les "Computed" derivent d'autres signals. Les "Effects" executent des side-effects.

**Avantages** :
- **Minimal boilerplate** : `final count = signal(0);` -- c'est tout. Pas de classe, pas de fichier separe.
- **Fine-grained reactivity** : seuls les widgets qui lisent un signal specifique sont reconstruits. Pas de rebuild de l'arbre entier.
- **Performance theorique superieure** : la reactivite est au niveau du signal, pas du widget. Moins de rebuilds, moins de comparaisons.
- **API simple** : 3 concepts (signal, computed, effect). Courbe d'apprentissage quasi nulle.
- **Pas de code generation** : tout est runtime, pas de build_runner.

**Inconvenients** :
- **Ecosysteme immature** : le package `signals` pour Flutter est recent. Peu de packages tiers (pas d'equivalent a `hydrated_bloc`, pas de devtools, pas de testing utilities).
- **Pas de conventions d'architecture** : comment organiser 200 signals dans un monorepo ? Aucune guidance.
- **Integration Flutter non-standard** : necessite des `SignalWidget` ou des `Watch()` builders qui ne sont pas des patterns Flutter idiomatiques.
- **Testabilite non prouvee** : pas d'utilitaires de test dedies. Les patterns de test doivent etre inventes.
- **Communaute petite** : peu de ressources, peu de retours d'experience en production, peu de reponses sur StackOverflow.
- **Risque IA** : l'IA n'a pas assez de donnees d'entrainement sur les patterns Signals Flutter. Elle produira du code inconsistant.

---

### 2.2 Matrice de decision

#### Criteres et poids

| Critere | Poids | Justification |
|---------|-------|---------------|
| Testabilite | 25% | 100% du code genere par IA. Les tests sont le filet de securite principal. |
| Compatibilite offline (Drift) | 20% | ADR-012 impose Drift/SQLite. Le state management doit s'integrer naturellement avec les streams reactifs Drift. |
| Courbe d'apprentissage agents IA | 15% | L'IA doit produire du code idiomatique du premier coup. Plus la doc est riche, mieux c'est. |
| Performance (rebuilds, memoire) | 10% | Devices d'entree de gamme (2-4 Go RAM). |
| Integration SSE temps reel | 10% | ADR-009. Les events SSE doivent mettre a jour le state local en < 100ms. |
| Debug tooling | 10% | Rapidite de diagnostic des bugs de state. |
| Maturite / perennite | 5% | Le package doit etre activement maintenu pour 3+ ans. |
| Compatibilite monorepo Melos | 5% | Partage de state entre packages. |

#### Notation (sur 5)

| Critere (poids) | Riverpod (A) | Bloc (B) | Signals (C) |
|-----------------|:------------:|:--------:|:-----------:|
| Testabilite (25%) | 5 | 5 | 2 |
| Compatibilite Drift (20%) | 5 | 3.5 | 3 |
| Courbe apprentissage IA (15%) | 4 | 4.5 | 2 |
| Performance (10%) | 4 | 3.5 | 5 |
| Integration SSE (10%) | 5 | 3 | 3.5 |
| Debug tooling (10%) | 4 | 5 | 2 |
| Maturite (5%) | 4.5 | 5 | 2 |
| Monorepo Melos (5%) | 4.5 | 4 | 3.5 |

#### Scores ponderes

| Option | Score pondere |
|--------|:------------:|
| **Riverpod (A)** | **4.53** |
| **Bloc (B)** | **4.10** |
| Signals (C) | 2.68 |

### 2.3 Justification detaillee des notes

#### Pourquoi Riverpod obtient 5/5 en compatibilite Drift

Drift expose des streams reactifs (`Stream<List<Reservation>>`) via ses `watch()` queries. Riverpod a un support natif des streams via `StreamProvider` et `AsyncNotifier`. L'integration est directe :

```dart
@riverpod
Stream<List<Reservation>> activeReservations(Ref ref) {
  final db = ref.watch(appDatabaseProvider);
  return db.watchActiveReservations(); // Stream Drift
}
```

Le provider se met a jour automatiquement quand la base locale change (insertion, mise a jour, suppression). Pas de glue code, pas de StreamBuilder.

Avec Bloc, il faut manuellement s'abonner au stream Drift dans `onEvent()` ou `mapEventToState()`, gerer le `StreamSubscription`, le cancel a la fermeture du Bloc, et emettre de nouveaux states. C'est faisable mais plus verbeux.

#### Pourquoi Riverpod obtient 5/5 en integration SSE

Un stream SSE peut etre directement consomme par un `StreamProvider` :

```dart
@riverpod
Stream<StockUpdate> stockUpdates(Ref ref, String basketId) {
  final sseClient = ref.watch(sseClientProvider);
  return sseClient.events
      .where((e) => e.type == 'stock_update')
      .map((e) => StockUpdate.fromJson(jsonDecode(e.data)))
      .where((update) => update.basketId == basketId);
}
```

Le provider filtre, decode, et expose les events SSE. Les widgets qui `ref.watch(stockUpdatesProvider(basketId))` sont reconstruits uniquement quand le stock de CE panier change.

Avec Bloc, il faut creer un Bloc dedie au SSE, injecter le stream, ecouter les events, et dispatcher des events internes. C'est 3x plus de code pour le meme resultat.

#### Pourquoi Bloc obtient 5/5 en debug tooling

`BlocObserver` est un outil puissant qui intercepte TOUS les events, transitions et erreurs de TOUS les Blocs de l'app. Un seul point d'observation pour tout le state. Riverpod a `ProviderObserver` qui est similaire mais moins riche (pas de concept d'event nomme, donc les logs sont moins expressifs).

---

### 2.4 Decision : Riverpod (v2.6+ avec riverpod_generator)

**Riverpod est choisi comme solution unique de state management pour les deux apps Flutter BienBon.**

**Justification resumee :**

1. **Integration Drift native** : les streams reactifs de Drift sont consommes directement par `StreamProvider`, sans adaptation. C'est l'argument decisif pour une app offline-first.
2. **Integration SSE naturelle** : les events SSE sont des streams Dart. Riverpod les consomme tel quel.
3. **Testabilite** : `ProviderContainer` permet de tester n'importe quel provider en isolation, avec overrides pour les dependances. Pas besoin de `pumpWidget()` pour tester la logique metier.
4. **Selective rebuilds** : `ref.select()` permet de n'observer qu'un champ du state. Critical pour la performance sur devices d'entree de gamme.
5. **Architecture DDD** : les providers se mappent naturellement sur les couches hexagonales (repository providers, use case providers, state notifiers).
6. **Auto-dispose** : les providers non observes sont liberes automatiquement. Pas de memory leak si le consommateur quitte un ecran.

**Avec les garde-fous suivants :**

- **Code generation obligatoire** : toujours utiliser `@riverpod` avec `riverpod_generator`. Interdit de declarer des providers manuellement (sauf exceptions documentees). Cela impose un style uniforme que l'IA peut suivre.
- **Convention de nommage stricte** : un fichier de providers par feature/bounded context (pas un fichier monolithique).
- **ProviderObserver** configure en dev pour logger les changements de state (mitiger le gap avec BlocObserver).
- **Lint rules** : `riverpod_lint` active pour detecter les usages incorrects (provider non utilise, circular dependency).

---

## 3. Architecture des states

### 3.1 Mapping DDD bounded contexts -> couches Flutter

L'ADR-024 definit 11 bounded contexts cote backend. Cote Flutter, on ne replique pas les 11 BC a l'identique. Les apps consumer et partner ne consomment qu'un sous-ensemble des BC, et le frontend n'a pas de logique domaine riche (les invariants sont valides par le backend). On adopte une **architecture en 3 couches** dans chaque feature :

```
packages/
  core/                          # Package Melos partage
    lib/
      src/
        data/                    # Couche DATA (sources de donnees)
          api/                   # Clients API (Dio, genere par OpenAPI)
          local/                 # Drift database, DAOs
          sse/                   # Client SSE
          auth/                  # Supabase Auth client
        domain/                  # Couche DOMAIN (modeles, interfaces)
          models/                # Entites / Value Objects (freezed)
          repositories/          # Interfaces (ports)
        providers/               # Providers partages (auth, connectivity, db)

  consumer_app/                  # App consommateur
    lib/
      src/
        features/
          explore/               # Feature "explorer les paniers"
            data/
              explore_repository_impl.dart
            domain/
              explore_repository.dart    # Interface
            presentation/
              explore_screen.dart
              explore_controller.dart    # StateNotifier / AsyncNotifier
              widgets/
          reservation/           # Feature "mes reservations"
            data/
            domain/
            presentation/
          pickup/                # Feature "retrait QR/PIN"
            ...
          profile/               # Feature "mon profil"
            ...

  partner_app/                   # App partenaire
    lib/
      src/
        features/
          dashboard/             # Feature "tableau de bord"
            ...
          baskets/               # Feature "gerer mes paniers"
            ...
          pickups/               # Feature "valider un retrait"
            ...
```

### 3.2 Mapping BC backend -> features Flutter

| BC Backend (ADR-024) | Features Consumer App | Features Partner App | Package partage (core) |
|----------------------|----------------------|---------------------|----------------------|
| Identity & Access | (transparent, auth) | (transparent, auth) | `core/auth` |
| Consumer | profile, favorites, gamification | -- | -- |
| Partner | -- | dashboard, store_settings | -- |
| Catalog | explore, basket_detail | baskets (CRUD) | `core/models/basket` |
| Ordering | reservation, pickup | pickups (validation) | `core/models/reservation` |
| Payment | payment | payout_history | `core/models/payment` |
| Fulfillment | pickup | pickups | `core/models/pickup` |
| Review & Claims | review, claim | -- | -- |
| Notification | notifications | notifications | `core/models/notification` |
| Fraud | -- | -- | -- |
| Admin | -- | -- | -- |

### 3.3 Structure des providers par couche

Chaque feature suit le meme pattern de providers en 3 couches :

```dart
// === COUCHE DATA : Repository Implementation ===
// explore/data/explore_repository_impl.dart

@riverpod
ExploreRepository exploreRepository(Ref ref) {
  return ExploreRepositoryImpl(
    api: ref.watch(apiClientProvider),
    db: ref.watch(appDatabaseProvider),
    connectivity: ref.watch(connectivityProvider),
  );
}

// === COUCHE DOMAIN : Interface ===
// explore/domain/explore_repository.dart

abstract interface class ExploreRepository {
  Future<List<Basket>> getNearbyBaskets(double lat, double lng, {int radius = 5});
  Stream<List<Basket>> watchNearbyBaskets(double lat, double lng);
  Future<BasketDetail> getBasketDetail(String basketId);
}

// === COUCHE PRESENTATION : Controller (AsyncNotifier) ===
// explore/presentation/explore_controller.dart

@riverpod
class ExploreController extends _$ExploreController {
  @override
  Future<List<Basket>> build() async {
    final location = await ref.watch(userLocationProvider.future);
    final repo = ref.watch(exploreRepositoryProvider);
    return repo.getNearbyBaskets(location.lat, location.lng);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final location = await ref.read(userLocationProvider.future);
      final repo = ref.read(exploreRepositoryProvider);
      return repo.getNearbyBaskets(location.lat, location.lng);
    });
  }
}
```

### 3.4 Principe d'inversion de dependance (DIP) dans les providers

Conformement a ADR-027 (SOLID, DIP), les providers de presentation ne dependent JAMAIS d'implementations concretes. Ils dependent d'interfaces (ports) :

```
ExploreController
    |
    | ref.watch(exploreRepositoryProvider) -> ExploreRepository (interface)
    |
    +-- en prod : ExploreRepositoryImpl (Dio + Drift + SSE)
    +-- en test : FakeExploreRepository (donnees en memoire)
```

Cela se configure via les `overrides` de Riverpod :

```dart
// Test
final container = ProviderContainer(
  overrides: [
    exploreRepositoryProvider.overrideWithValue(FakeExploreRepository()),
  ],
);
```

---

## 4. Gestion du state temps reel (SSE)

### 4.1 Le probleme

L'ADR-009 definit un endpoint SSE unique multiplexe par audience (`/api/sse/consumer`, `/api/sse/partner`). Les events SSE incluent `stock_update`, `reservation_status`, `notification`, `unread_count`. Le state management doit :

1. Maintenir une connexion SSE unique pendant que l'app est en foreground
2. Dispatcher les events SSE vers les providers concernes
3. Mettre a jour le state local (Drift) ET le state en memoire de maniere coherente
4. Gerer la reconnexion transparente (ADR-009 section 5)

### 4.2 Architecture SSE -> State

```
                    SSE Stream (1 connexion)
                           |
                    SseClientProvider (StreamProvider)
                           |
              +------------+------------+
              |            |            |
        stock_update  reservation_  notification
              |        status         |
              |            |          |
      StockUpdateProvider  |   NotificationProvider
              |            |          |
         met a jour   ReservationStatusProvider
         le cache         |
         Drift       met a jour
              |       le cache Drift
              |            |
      BasketDetailProvider |
      (re-emet via        ReservationsProvider
       stream Drift)      (re-emet via stream Drift)
```

### 4.3 Implementation : SseClient comme provider singleton

```dart
// core/data/sse/sse_client.dart

@Riverpod(keepAlive: true)  // Jamais dispose tant que l'app est en foreground
class SseConnection extends _$SseConnection {
  StreamSubscription<SseEvent>? _subscription;

  @override
  Stream<SseEvent> build() {
    final authState = ref.watch(authStateProvider);

    // Pas de connexion SSE si non authentifie
    if (authState is! Authenticated) return const Stream.empty();

    final jwt = authState.accessToken;
    final sseClient = ref.watch(sseClientProvider);
    final stream = sseClient.connect(jwt: jwt);

    // Cleanup a la disposition
    ref.onDispose(() => _subscription?.cancel());

    return stream;
  }
}

// Provider filtre par type d'event
@riverpod
Stream<StockUpdate> stockUpdateStream(Ref ref) {
  return ref.watch(sseConnectionProvider).whenData((events) {
    return events
        .where((e) => e.type == 'stock_update')
        .map((e) => StockUpdate.fromJson(jsonDecode(e.data)));
  }).asStream().expand((asyncValue) => asyncValue.valueOrNull ?? []);
}
```

### 4.4 Pattern : SSE -> Drift -> UI (double write)

Quand un event SSE arrive, on met a jour **Drift d'abord**, puis le UI se met a jour via le stream Drift. Cela garantit la coherence entre le state en memoire et le state persiste :

```dart
// core/data/sse/handlers/stock_update_handler.dart

@riverpod
class StockUpdateHandler extends _$StockUpdateHandler {
  @override
  void build() {
    // Ecoute le stream SSE filtre
    ref.listen(stockUpdateStreamProvider, (previous, next) {
      next.whenData((update) async {
        // 1. Met a jour Drift (source de verite locale)
        final db = ref.read(appDatabaseProvider);
        await db.updateBasketStock(
          serverId: update.basketId,
          stock: update.stock,
          total: update.total,
        );
        // 2. L'UI se met a jour automatiquement via le stream Drift
        //    (les providers qui watchent Drift re-emettent)
      });
    });
  }
}

// Le provider du panier detail ecoute Drift, pas le SSE directement
@riverpod
Stream<BasketDetail> basketDetail(Ref ref, String basketId) {
  final db = ref.watch(appDatabaseProvider);
  return db.watchBasketById(basketId).map((row) => BasketDetail.fromDrift(row));
}
```

**Avantage** : le UI a une seule source de verite (Drift). Que la donnee vienne du SSE, d'un appel API, ou du cache local, le chemin vers l'UI est le meme. Pas de desynchronisation possible entre "ce que Drift sait" et "ce que le widget affiche".

### 4.5 Gestion du cycle de vie SSE

| Etat app Flutter | Connexion SSE | Action state management |
|------------------|---------------|------------------------|
| **Foreground** (widget visible) | Ouverte | `SseConnection` est `keepAlive: true`, stream actif |
| **Background** (app en memoire) | Fermee | `AppLifecycleListener` pause le provider, `sseClient.disconnect()` |
| **Resume** (retour foreground) | Rouverte | Provider re-build, reconnexion SSE avec `Last-Event-ID`, refresh des donnees stale |
| **Killed** | N/A | Au prochain lancement, appels API + lecture cache Drift |

```dart
// main.dart -- gestion du lifecycle
@riverpod
class AppLifecycle extends _$AppLifecycle {
  @override
  AppLifecycleState build() {
    final observer = AppLifecycleListener(
      onStateChange: (state) => this.state = state,
    );
    ref.onDispose(() => observer.dispose());
    return AppLifecycleState.resumed;
  }
}

// Le SseConnection reagit au lifecycle
@Riverpod(keepAlive: true)
class SseConnection extends _$SseConnection {
  @override
  Stream<SseEvent> build() {
    final lifecycle = ref.watch(appLifecycleProvider);
    if (lifecycle != AppLifecycleState.resumed) {
      return const Stream.empty(); // Pas de SSE en background
    }

    final authState = ref.watch(authStateProvider);
    if (authState is! Authenticated) return const Stream.empty();

    return _connectSse(authState.accessToken);
  }

  Stream<SseEvent> _connectSse(String jwt) async* {
    final client = ref.read(sseClientProvider);
    yield* client.connect(jwt: jwt); // reconnexion auto avec backoff (ADR-009)
  }
}
```

---

## 5. State offline et synchronisation

### 5.1 Le probleme

L'ADR-012 definit 3 tiers de donnees :
- **Tier 1** (critique offline) : QR/PIN, reservations en cours
- **Tier 2** (cache performance) : partenaires, categories, profil
- **Tier 3** (temps reel, jamais cache) : stock, paiement

Le state management doit :
1. Afficher les donnees Tier 1 et Tier 2 depuis Drift quand le reseau est absent
2. Indiquer clairement a l'UI que les donnees sont "stale" (perimees)
3. Synchroniser les actions offline (queue d'actions, ADR-012 section 6) quand le reseau revient
4. Gerer les conflits de reconciliation

### 5.2 Pattern : ConnectivityAwareRepository

Chaque repository qui gere des donnees Tier 1 ou Tier 2 suit le pattern "cache-first" avec le state management :

```dart
// core/data/repositories/reservation_repository_impl.dart

class ReservationRepositoryImpl implements ReservationRepository {
  final ApiClient api;
  final AppDatabase db;
  final ConnectivityService connectivity;

  @override
  Stream<List<Reservation>> watchActiveReservations() {
    // Toujours retourner le stream Drift (source de verite locale)
    return db.watchActiveReservations().map(
      (rows) => rows.map(Reservation.fromDrift).toList(),
    );
  }

  @override
  Future<void> syncReservations() async {
    if (!await connectivity.isOnline) return;

    try {
      final remote = await api.getActiveReservations();
      await db.upsertReservations(remote.map((r) => r.toDrift()).toList());
    } on DioException catch (e) {
      // Silently fail -- les donnees locales sont toujours disponibles
      _log.warning('Sync reservations failed: $e');
    }
  }
}
```

```dart
// reservation/presentation/reservations_controller.dart

@riverpod
class ReservationsController extends _$ReservationsController {
  @override
  Stream<List<Reservation>> build() {
    final repo = ref.watch(reservationRepositoryProvider);

    // Trigger une sync en arriere-plan (non bloquante)
    Future.microtask(() => repo.syncReservations());

    // L'UI recoit les donnees du cache Drift immediatement
    return repo.watchActiveReservations();
  }

  Future<void> forceRefresh() async {
    final repo = ref.read(reservationRepositoryProvider);
    await repo.syncReservations();
    // Pas besoin de "setState" -- le stream Drift emettra automatiquement
  }
}
```

### 5.3 State de la connectivite

```dart
@Riverpod(keepAlive: true)
class ConnectivityState extends _$ConnectivityState {
  @override
  Stream<ConnectivityStatus> build() {
    return ConnectivityService.instance.statusStream;
  }
}

enum ConnectivityStatus { online, offline, degraded }

// Widget qui reagit a la connectivite
class NetworkBanner extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(connectivityStateProvider);
    return status.when(
      data: (s) => s == ConnectivityStatus.offline
          ? const OfflineBanner() // "Vous etes hors ligne"
          : const SizedBox.shrink(),
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}
```

### 5.4 Queue d'actions offline et reconciliation

L'ADR-012 definit une `OfflineActionQueue` dans Drift pour les actions effectuees offline (validation de retrait, annulation). Le state management gere la sync de cette queue :

```dart
@Riverpod(keepAlive: true)
class OfflineQueueSync extends _$OfflineQueueSync {
  @override
  Future<void> build() async {
    // Ecoute les changements de connectivite
    final status = ref.watch(connectivityStateProvider).valueOrNull;
    if (status != ConnectivityStatus.online) return;

    // Quand online, process la queue
    await _processQueue();
  }

  Future<void> _processQueue() async {
    final db = ref.read(appDatabaseProvider);
    final api = ref.read(apiClientProvider);
    final pendingActions = await db.getPendingOfflineActions();

    for (final action in pendingActions) {
      try {
        await db.updateOfflineActionStatus(action.id, 'syncing');
        await _executeAction(api, action);
        await db.updateOfflineActionStatus(action.id, 'synced');
      } catch (e) {
        final retryCount = action.retryCount + 1;
        if (retryCount >= 3) {
          await db.updateOfflineActionStatus(action.id, 'failed',
            errorMessage: e.toString(),
          );
        } else {
          await db.updateOfflineActionRetry(action.id, retryCount);
        }
      }
    }
  }

  Future<void> _executeAction(ApiClient api, OfflineAction action) async {
    switch (action.actionType) {
      case 'validate_pickup':
        final payload = ValidatePickupPayload.fromJson(jsonDecode(action.payloadJson));
        await api.validatePickup(payload.reservationId, payload.method, payload.code);
      case 'cancel_reservation':
        final payload = CancelPayload.fromJson(jsonDecode(action.payloadJson));
        await api.cancelReservation(payload.reservationId, payload.reason);
    }
  }
}
```

### 5.5 Strategie de resolution de conflits

| Scenario | Strategie | Justification |
|----------|-----------|---------------|
| **Stock mis a jour pendant offline** | Server wins | Le stock est la verite absolue (overbooking sinon). ADR-008. |
| **Reservation annulee pendant offline** | Server wins | Si le serveur a deja marque la reservation comme PICKED_UP ou CANCELLED, l'action offline est rejetee (conflit 409). |
| **Validation de retrait offline** | Queue + retry | L'action est enqueue localement. A la sync, le serveur valide le QR/PIN. Si le retrait a deja ete valide (par un autre device), conflit 409 -> marquer comme "deja valide" dans l'UI. |
| **Profil modifie offline + online** | Last-write-wins | Pas de conflit critique. Le dernier a ecrire gagne. Timestamp de modification. |
| **Favori ajoute/retire offline** | Merge (union) | Les favoris sont idempotents. On fusionne les deux ensembles. |

```dart
// Gestion du conflit 409 dans le sync
Future<void> _executeAction(ApiClient api, OfflineAction action) async {
  try {
    // ... executer l'action
  } on DioException catch (e) {
    if (e.response?.statusCode == 409) {
      // Conflit : le serveur a une version plus recente
      // Forcer un refresh de la donnee locale
      await _refreshConflictedEntity(action);
      // Marquer l'action comme "conflict_resolved" (pas retry)
      rethrow; // Le caller marquera comme failed avec message explicite
    }
    rethrow;
  }
}
```

---

## 6. State d'authentification

### 6.1 Le probleme

L'ADR-010 definit l'authentification via Supabase Auth :
- **Access token JWT** : duree de vie 1h
- **Refresh token** : duree de vie 30j, stocke dans `flutter_secure_storage`
- **Refresh automatique** : Supabase SDK rafraichit le token 60s avant expiration
- **Logout automatique** : si le refresh echoue (token revoque, compte suspendu), l'app doit vider le state et rediriger vers le login

### 6.2 Architecture du state d'authentification

```dart
// core/providers/auth_providers.dart

/// Etat d'authentification -- source de verite
sealed class AuthState {}
class Unauthenticated extends AuthState {}
class Authenticating extends AuthState {}
class Authenticated extends AuthState {
  final String userId;
  final String accessToken;
  final String refreshToken;
  final List<String> roles; // ['consumer'] ou ['partner']
  final DateTime tokenExpiresAt;
  Authenticated({
    required this.userId,
    required this.accessToken,
    required this.refreshToken,
    required this.roles,
    required this.tokenExpiresAt,
  });
}
class AuthError extends AuthState {
  final String message;
  AuthError(this.message);
}

@Riverpod(keepAlive: true)
class AuthNotifier extends _$AuthNotifier {
  @override
  AuthState build() {
    // Ecoute les changements Supabase Auth
    final supabase = ref.watch(supabaseClientProvider);
    supabase.auth.onAuthStateChange.listen((data) {
      final session = data.session;
      if (session != null) {
        state = Authenticated(
          userId: session.user.id,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken ?? '',
          roles: _extractRoles(session.user),
          tokenExpiresAt: DateTime.fromMillisecondsSinceEpoch(
            session.expiresAt! * 1000,
          ),
        );
      } else {
        _clearLocalState();
        state = Unauthenticated();
      }
    });

    // Etat initial : verifier si une session existe
    final currentSession = supabase.auth.currentSession;
    if (currentSession != null && !currentSession.isExpired) {
      return Authenticated(
        userId: currentSession.user.id,
        accessToken: currentSession.accessToken,
        refreshToken: currentSession.refreshToken ?? '',
        roles: _extractRoles(currentSession.user),
        tokenExpiresAt: DateTime.fromMillisecondsSinceEpoch(
          currentSession.expiresAt! * 1000,
        ),
      );
    }
    return Unauthenticated();
  }

  Future<void> signIn(String email, String password) async {
    state = Authenticating();
    try {
      final supabase = ref.read(supabaseClientProvider);
      await supabase.auth.signInWithPassword(email: email, password: password);
      // Le listener onAuthStateChange mettra a jour le state
    } catch (e) {
      state = AuthError(e.toString());
    }
  }

  Future<void> signOut() async {
    final supabase = ref.read(supabaseClientProvider);
    await supabase.auth.signOut();
    await _clearLocalState();
    state = Unauthenticated();
  }

  void _clearLocalState() async {
    // Vider le cache Drift (sauf les preferences)
    final db = ref.read(appDatabaseProvider);
    await db.clearUserData();
    // Deconnecter le SSE
    ref.invalidate(sseConnectionProvider);
  }

  List<String> _extractRoles(User user) {
    final metadata = user.appMetadata;
    return List<String>.from(metadata['roles'] ?? ['consumer']);
  }
}
```

### 6.3 Injection du token dans les requetes API

```dart
// core/data/api/auth_interceptor.dart

@riverpod
Dio authenticatedDio(Ref ref) {
  final dio = Dio(BaseOptions(baseUrl: Environment.apiBaseUrl));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) {
      final authState = ref.read(authNotifierProvider);
      if (authState is Authenticated) {
        options.headers['Authorization'] = 'Bearer ${authState.accessToken}';
      }
      handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        // Token expire -- tenter un refresh
        try {
          final supabase = ref.read(supabaseClientProvider);
          await supabase.auth.refreshSession();
          // Retry la requete avec le nouveau token
          final authState = ref.read(authNotifierProvider);
          if (authState is Authenticated) {
            error.requestOptions.headers['Authorization'] =
                'Bearer ${authState.accessToken}';
            final response = await dio.fetch(error.requestOptions);
            return handler.resolve(response);
          }
        } catch (_) {
          // Refresh echoue -> logout automatique
          ref.read(authNotifierProvider.notifier).signOut();
        }
      }
      handler.next(error);
    },
  ));

  return dio;
}
```

### 6.4 Gardien de route base sur le state auth

```dart
// Navigation : redirection automatique basee sur le state auth
@riverpod
GoRouter router(Ref ref) {
  final authState = ref.watch(authNotifierProvider);

  return GoRouter(
    redirect: (context, goRouterState) {
      final isAuthenticated = authState is Authenticated;
      final isOnLoginRoute = goRouterState.matchedLocation == '/login';

      if (!isAuthenticated && !isOnLoginRoute) return '/login';
      if (isAuthenticated && isOnLoginRoute) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
      // ...
    ],
  );
}
```

---

## 7. State partage entre les 2 apps (monorepo Melos)

### 7.1 Architecture des packages

```
bienbon/
  packages/
    core/                          # Partage : modeles, interfaces, providers de base
      lib/
        src/
          data/
            api/
              api_client.dart      # Client API genere (OpenAPI)
              auth_interceptor.dart
            local/
              app_database.dart    # Drift database (tables partagees)
              app_database.g.dart
            sse/
              sse_client.dart
              sse_event.dart
          domain/
            models/                # Modeles freezed partages
              basket.dart
              reservation.dart
              store.dart
              notification.dart
              user_profile.dart
            repositories/          # Interfaces (ports)
              auth_repository.dart
              basket_repository.dart
              reservation_repository.dart
          providers/               # Providers partages
            auth_providers.dart
            connectivity_providers.dart
            database_providers.dart
            sse_providers.dart

    consumer_features/             # Features specifiques consumer
      lib/
        src/
          explore/
          reservation/
          pickup/
          profile/
          favorites/
          gamification/

    partner_features/              # Features specifiques partner
      lib/
        src/
          dashboard/
          basket_management/
          pickup_validation/
          store_settings/
          payout_history/

  apps/
    consumer/                      # App consumer (assemblage)
      lib/main.dart
      pubspec.yaml                 # Depend de core + consumer_features

    partner/                       # App partner (assemblage)
      lib/main.dart
      pubspec.yaml                 # Depend de core + partner_features
```

### 7.2 Ce qui est partage vs ce qui ne l'est pas

| Couche | Partage (core) | Specifique app |
|--------|---------------|----------------|
| **Modeles** (freezed) | Basket, Reservation, Store, Notification, UserProfile | ConsumerProfile, PartnerDashboard |
| **Interfaces repositories** | BasketRepository, ReservationRepository, AuthRepository | ExploreRepository, BasketManagementRepository |
| **Providers de base** | authNotifier, sseConnection, appDatabase, connectivity | exploreController, dashboardController |
| **Drift tables** | Reservations, CachedPartners, CachedCategories, OfflineActionQueue | (pas de tables specifiques par app) |
| **SSE handlers** | SseClient, event parsing | StockUpdateHandler (consumer), NewReservationHandler (partner) |
| **Widgets** | -- (pas de widgets partages dans core) | Tous les widgets dans les features |

### 7.3 Regle : les providers de core sont `keepAlive`

Les providers du package `core` (auth, database, SSE, connectivity) sont declares avec `keepAlive: true` car ils representent des services globaux qui doivent survivre a la navigation entre ecrans.

Les providers des features sont auto-dispose (comportement par defaut de `@riverpod`) : quand un ecran est quitte et que personne n'observe plus le provider, il est libere.

```dart
// core -- keepAlive (service global)
@Riverpod(keepAlive: true)
class AuthNotifier extends _$AuthNotifier { /* ... */ }

// feature -- auto-dispose (lie a l'ecran)
@riverpod
class ExploreController extends _$ExploreController { /* ... */ }
```

---

## 8. Testing du state

### 8.1 Strategie de test par couche

| Couche | Type de test | Outil | Ce qu'on teste |
|--------|-------------|-------|----------------|
| **Domain models** | Unit test | `test` | Serialisation, validation, equality |
| **Repositories** | Unit test | `test` + `mockito` | Cache-first logic, sync, error handling |
| **Providers / Controllers** | Unit test (sans widget) | `riverpod_test` + `ProviderContainer` | State transitions, async behavior, SSE integration |
| **Widgets** | Widget test | `flutter_test` + `ProviderScope` | Rendering conditionnel, interaction utilisateur |
| **Flows complets** | Integration test | `integration_test` + `patrol` | Login -> explore -> reserve -> pickup |

### 8.2 Pattern de test des providers Riverpod

```dart
// test/features/explore/explore_controller_test.dart

import 'package:riverpod/riverpod.dart';
import 'package:test/test.dart';

void main() {
  late ProviderContainer container;
  late FakeExploreRepository fakeRepo;
  late FakeLocationService fakeLocation;

  setUp(() {
    fakeRepo = FakeExploreRepository();
    fakeLocation = FakeLocationService(lat: -20.16, lng: 57.50); // Port-Louis

    container = ProviderContainer(
      overrides: [
        exploreRepositoryProvider.overrideWithValue(fakeRepo),
        userLocationProvider.overrideWith((_) => fakeLocation.getLocation()),
      ],
    );
  });

  tearDown(() => container.dispose());

  test('loads nearby baskets on build', () async {
    fakeRepo.setBaskets([
      Basket(id: '1', title: 'Panier Boulangerie', price: 150, stock: 3),
      Basket(id: '2', title: 'Panier Restaurant', price: 200, stock: 1),
    ]);

    // Trigger le build du provider
    final future = container.read(exploreControllerProvider.future);
    final baskets = await future;

    expect(baskets, hasLength(2));
    expect(baskets.first.title, 'Panier Boulangerie');
  });

  test('shows empty state when no baskets nearby', () async {
    fakeRepo.setBaskets([]);

    final baskets = await container.read(exploreControllerProvider.future);

    expect(baskets, isEmpty);
  });

  test('handles network error gracefully with cached data', () async {
    fakeRepo.setBaskets([
      Basket(id: '1', title: 'Cached Basket', price: 100, stock: 5),
    ]);
    fakeRepo.setNetworkError(true); // Simule une erreur reseau

    // Le repo retourne les donnees cachees malgre l'erreur reseau
    final baskets = await container.read(exploreControllerProvider.future);

    expect(baskets, hasLength(1));
    expect(baskets.first.title, 'Cached Basket');
  });
}
```

### 8.3 Test du state SSE

```dart
// test/core/sse/stock_update_handler_test.dart

void main() {
  test('updates Drift when stock_update SSE event arrives', () async {
    final fakeDb = FakeAppDatabase();
    final sseController = StreamController<SseEvent>();

    final container = ProviderContainer(
      overrides: [
        appDatabaseProvider.overrideWithValue(fakeDb),
        sseConnectionProvider.overrideWith((_) => sseController.stream),
      ],
    );

    // Trigger le handler
    container.read(stockUpdateHandlerProvider);

    // Simuler un event SSE
    sseController.add(SseEvent(
      type: 'stock_update',
      data: '{"basketId":"bsk_abc","stock":2,"total":5}',
    ));

    // Attendre le traitement
    await Future.delayed(const Duration(milliseconds: 50));

    // Verifier que Drift a ete mis a jour
    expect(fakeDb.lastUpdatedBasketId, 'bsk_abc');
    expect(fakeDb.lastUpdatedStock, 2);

    await sseController.close();
    container.dispose();
  });
}
```

### 8.4 Test du state d'authentification

```dart
void main() {
  test('redirects to login when token refresh fails', () async {
    final fakeSupabase = FakeSupabaseClient();
    fakeSupabase.setSession(expiredSession); // Session expiree

    final container = ProviderContainer(
      overrides: [
        supabaseClientProvider.overrideWithValue(fakeSupabase),
      ],
    );

    // Trigger auth check
    final authState = container.read(authNotifierProvider);

    // Le refresh devrait echouer et forcer un logout
    expect(authState, isA<Unauthenticated>());
  });

  test('clears Drift data on sign out', () async {
    final fakeDb = FakeAppDatabase();
    final fakeSupabase = FakeSupabaseClient();
    fakeSupabase.setSession(validSession);

    final container = ProviderContainer(
      overrides: [
        supabaseClientProvider.overrideWithValue(fakeSupabase),
        appDatabaseProvider.overrideWithValue(fakeDb),
      ],
    );

    // Sign in
    expect(container.read(authNotifierProvider), isA<Authenticated>());

    // Sign out
    await container.read(authNotifierProvider.notifier).signOut();

    expect(container.read(authNotifierProvider), isA<Unauthenticated>());
    expect(fakeDb.wasCleared, isTrue);
  });
}
```

### 8.5 Metriques de couverture

| Zone | Couverture cible | Justification |
|------|:----------------:|---------------|
| Providers / Controllers | 90%+ | Logique metier cote client, testable sans widget |
| Repositories | 85%+ | Cache-first, sync, error handling |
| SSE handlers | 90%+ | Critique : un bug = desynchronisation temps reel |
| Domain models | 95%+ | Serialisation/deserialisation, trivial a tester |
| Auth flow | 90%+ | Securite, regression sur token refresh |
| Widgets | 70%+ | Smoke tests, interactions critiques |
| Integration (e2e) | Paths critiques | Login, reservation, pickup |

---

## 9. Performance

### 9.1 Strategies pour eviter les rebuilds inutiles

#### 9.1.1 `ref.select()` pour le fine-grained listening

```dart
// MAUVAIS : rebuild quand N'IMPORTE QUEL champ du basket change
final basket = ref.watch(basketDetailProvider(basketId));

// BON : rebuild UNIQUEMENT quand le stock change
final stock = ref.watch(
  basketDetailProvider(basketId).select((b) => b.valueOrNull?.stock),
);
```

#### 9.1.2 Providers famille pour isoler les instances

```dart
// Chaque panier a son propre provider. Le stock du panier A ne rebuild pas
// le widget du panier B.
@riverpod
Stream<int> basketStock(Ref ref, String basketId) {
  final db = ref.watch(appDatabaseProvider);
  return db.watchBasketStock(basketId); // SELECT stock FROM baskets WHERE id = ?
}
```

#### 9.1.3 Separation state global vs state d'ecran

```dart
// State global (keepAlive) : survit a la navigation
@Riverpod(keepAlive: true)
class CartState extends _$CartState { /* ... */ }

// State d'ecran (auto-dispose) : libere quand on quitte l'ecran
@riverpod
class BasketDetailController extends _$BasketDetailController { /* ... */ }
```

### 9.2 Pagination

Pour les listes longues (historique des reservations, liste des partenaires), on utilise des providers pagines :

```dart
@riverpod
class PaginatedReservations extends _$PaginatedReservations {
  static const _pageSize = 20;
  int _currentPage = 0;
  bool _hasMore = true;

  @override
  Future<List<Reservation>> build() async {
    _currentPage = 0;
    _hasMore = true;
    return _fetchPage(0);
  }

  Future<List<Reservation>> _fetchPage(int page) async {
    final repo = ref.read(reservationRepositoryProvider);
    final newItems = await repo.getReservationHistory(
      offset: page * _pageSize,
      limit: _pageSize,
    );
    _hasMore = newItems.length == _pageSize;
    return newItems;
  }

  Future<void> loadMore() async {
    if (!_hasMore) return;
    _currentPage++;
    final currentData = state.valueOrNull ?? [];
    final newPage = await _fetchPage(_currentPage);
    state = AsyncData([...currentData, ...newPage]);
  }
}
```

### 9.3 Debounce des events SSE haute frequence

Si le stock change rapidement (plusieurs reservations en rafale), on debounce les rebuilds :

```dart
@riverpod
Stream<StockUpdate> debouncedStockUpdate(Ref ref, String basketId) {
  return ref
      .watch(stockUpdateStreamProvider)
      .where((e) => e.basketId == basketId)
      .debounceTime(const Duration(milliseconds: 200)); // max 5 rebuilds/sec
}
```

### 9.4 Metriques de performance

| Metrique | Cible | Outil de mesure |
|----------|-------|----------------|
| Rebuilds par frame | < 3 widgets rebuilds par event SSE | `debugPrintRebuildDirtyWidgets` en dev |
| Temps de build du widget le plus lourd | < 16ms (60fps) | Flutter DevTools > Performance overlay |
| Memoire state management | < 10 Mo pour 100 providers actifs | Flutter DevTools > Memory |
| Temps de reaction SSE -> UI update | < 200ms | Timestamp dans ProviderObserver |
| Cold start (init des providers keepAlive) | < 500ms | Stopwatch dans main() |

---

## 10. Recapitulatif des decisions

| # | Decision | Detail | Section |
|---|----------|--------|---------|
| D1 | **Riverpod** comme state management | Score 4.53 vs Bloc 4.10. Integration Drift/SSE native, testabilite, DIP. | 2 |
| D2 | **Code generation obligatoire** | `@riverpod` + `riverpod_generator` pour uniformiser le code IA. | 2.4 |
| D3 | **Architecture 3 couches** par feature | data (repository impl) -> domain (interface) -> presentation (controller/notifier). | 3 |
| D4 | **SSE -> Drift -> UI** (double write) | Les events SSE mettent a jour Drift. L'UI observe les streams Drift, pas les events SSE directement. | 4.4 |
| D5 | **ConnectivityAwareRepository** | Les repositories retournent les donnees Drift en priorite, sync en arriere-plan. | 5.2 |
| D6 | **Server-wins** pour les conflits stock/reservation | Le serveur est la source de verite pour les donnees transactionnelles. | 5.5 |
| D7 | **AuthNotifier keepAlive** | State d'authentification global, ecoute les changements Supabase Auth, logout automatique. | 6.2 |
| D8 | **3 packages Melos** | `core` (partage), `consumer_features`, `partner_features`. | 7.1 |
| D9 | **Tests sans widget** pour les providers | `ProviderContainer` + overrides. 90% de couverture sur les providers. | 8 |
| D10 | **`ref.select()` obligatoire** pour les listes et les donnees temps reel | Eviter les rebuilds inutiles sur devices d'entree de gamme. | 9.1 |

---

## 11. Consequences

### Positives

1. **Source de verite unique** : Drift est la source de verite locale. Toutes les donnees transitent par Drift avant d'atteindre l'UI. Pas de desynchronisation entre le cache et l'affichage.
2. **Testabilite sans widget** : 90%+ de la logique de state est testable avec `ProviderContainer` et des fakes. Pas besoin de `pumpWidget()` pour tester un flow de reservation.
3. **Integration SSE transparente** : les events SSE sont consommes comme des streams Dart natifs. Pas de glue code, pas de pattern observer custom.
4. **Offline-first naturel** : le pattern "stream Drift -> UI" fonctionne que le reseau soit present ou non. L'UI ne sait pas si les donnees viennent du cache ou du serveur.
5. **Performance** : `ref.select()` et les providers famille isolent les rebuilds. Un changement de stock sur 1 panier parmi 20 ne rebuild que 1 widget.
6. **Monorepo propre** : le package `core` partage les modeles, interfaces et providers de base. Les features sont isolees dans des packages par app.

### Negatives

1. **Courbe d'apprentissage Riverpod** : les agents IA doivent maitriser les concepts (Provider, Notifier, AsyncNotifier, Family, keepAlive, autoDispose, select). Le risque est un usage incorrect des providers par l'IA (ex: `keepAlive` partout, ou oublier `autoDispose`).
2. **Code generation** : `riverpod_generator` + `build_runner` + `freezed` = 3 layers de generation de code. Le temps de build augmente. Mitigation : `build_runner` en mode watch, generation par package dans Melos.
3. **Pas de convention Bloc-like pour la tracabilite** : Riverpod n'a pas de concept d'events nommes comme Bloc. Le debugging se fait via `ProviderObserver`, qui est moins expressif que `BlocObserver`. Mitigation : nommer les methodes des Notifiers de maniere descriptive, logger dans `ProviderObserver`.
4. **Double write SSE -> Drift -> UI** : chaque event SSE entraine une ecriture SQLite + une re-emission du stream. C'est un overhead par rapport a un state purement en memoire. Mitigation : le volume d'events SSE est faible (quelques dizaines par minute au maximum).

---

## 12. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| L'IA produit des providers mal structures (god providers, pas de DIP) | Elevee | Moyen | Regles `riverpod_lint`, templates de code dans CLAUDE.md, code review IA (ADR-026). |
| Performance degradee par trop de providers actifs | Faible | Moyen | `autoDispose` par defaut, monitoring du nombre de providers actifs en dev, profiling periodique. |
| Riverpod 3.0 introduce des breaking changes majeurs | Faible | Moyen | Rester sur la derniere version 2.x stable. Evaluer la migration quand Riverpod 3.0 est stable + bien documente. |
| `build_runner` trop lent sur le monorepo | Moyenne | Faible | Utiliser `build_runner` en mode watch, generation par package, cache Melos. Evaluer `dart_mappable` comme alternative a `freezed` si le temps de build depasse 30s. |
| Conflit de reconciliation offline non gere | Faible | Eleve | Implementer des tests d'integration specifiques pour les scenarios offline (ADR-023). Logger les conflits 409 pour monitoring. |
| Memory leak par providers keepAlive non liberes | Moyenne | Moyen | Limiter les providers `keepAlive` aux services globaux (auth, SSE, connectivity, database). Tous les providers de feature sont auto-dispose. |

---

## 13. Regles pour CLAUDE.md (guidage IA)

Les regles suivantes doivent etre ajoutees au `CLAUDE.md` du monorepo Flutter pour guider les agents IA :

```markdown
## State Management (Riverpod)

### Regles obligatoires
- Toujours utiliser `@riverpod` (code generation). Jamais de `StateProvider`, `StateNotifierProvider` ou `ChangeNotifierProvider` manuels.
- Un fichier de providers par feature (pas un fichier `providers.dart` monolithique).
- Les controllers (Notifiers) dependent d'interfaces (ports), jamais d'implementations concretes (DIP).
- `keepAlive: true` UNIQUEMENT pour : auth, SSE, connectivity, database. Tout le reste est auto-dispose.
- Utiliser `ref.select()` quand on observe un sous-ensemble du state (listes, objets complexes).
- Les events SSE mettent a jour Drift. L'UI observe les streams Drift. Jamais de SSE -> UI direct.
- Les repositories retournent des `Stream<T>` depuis Drift pour les donnees cachees, et des `Future<T>` pour les actions.

### Patterns de test
- Tester les providers avec `ProviderContainer` + overrides. Pas de `pumpWidget()` pour la logique metier.
- Chaque provider a au minimum : 1 test happy path, 1 test error, 1 test offline.
- Les fakes implementent l'interface du repository (pas de mocks generes sauf pour les cas complexes).
```

---

## 14. Relations avec les autres ADR

| ADR | Relation |
|-----|----------|
| **ADR-001** | Le backend NestJS + Prisma + Supabase definit l'API que les repositories Flutter consomment. |
| **ADR-009** | Le SSE est le transport temps reel. Cette ADR definit comment les events SSE sont integres dans le state management Riverpod (section 4). |
| **ADR-010** | Supabase Auth gere les tokens. Cette ADR definit le `AuthNotifier` qui reagit aux changements de session Supabase (section 6). |
| **ADR-012** | Drift est la base locale. Cette ADR definit le pattern "SSE -> Drift -> UI" et le `ConnectivityAwareRepository` (sections 4-5). |
| **ADR-024** | Les bounded contexts DDD sont mappes vers les features Flutter et les packages Melos (section 3). |
| **ADR-027** | Les principes SOLID (SRP, DIP) guident la structure des providers et des repositories (sections 3.4, 8). |
| **ADR-017** | Les state machines metier (reservation, panier, partenaire) sont reflétées dans les `AsyncNotifier` qui gerent les transitions d'etat cote client. |
| **ADR-023** | La strategie de tests definit les niveaux de couverture. Cette ADR applique ces niveaux au state management (section 8.5). |
