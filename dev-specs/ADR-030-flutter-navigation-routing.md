# ADR-030 : Flutter Navigation & Routing -- architecture, deep linking, guards et navigation offline

| Champ         | Valeur                                                                  |
|---------------|-------------------------------------------------------------------------|
| **Statut**    | Propose                                                                 |
| **Date**      | 2026-02-27                                                              |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                                     |
| **Decideurs** | Equipe technique BienBon                                                |
| **Scope**     | Router Flutter, architecture de navigation, guards/redirects, deep linking, navigation offline, transitions, monorepo Melos, testing |
| **Prereqs**   | ADR-010 (Supabase Auth / JWT), ADR-011 (RBAC hybride), ADR-012 (offline-first / Drift), ADR-014 (notifications FCM / deep links), ADR-024 (DDD bounded contexts), ADR-029 (Riverpod state management) |
| **US clefs**  | US-C001 a US-C007 (auth consumer), US-C008 a US-C015 (exploration), US-C020 a US-C030 (reservation/pickup), US-P001 a US-P005 (auth partner), US-P010 a US-P020 (gestion paniers), US-P021 a US-P025 (validation pickup) |

---

## 1. Contexte

### 1.1 Le probleme

BienBon.mu est une marketplace mobile de paniers anti-gaspi a l'ile Maurice. Deux apps Flutter (consumer + partner) vivent dans un monorepo Melos (ADR-029 section 7). Chaque app a un graphe de navigation complexe avec des exigences specifiques :

1. **Navigation par onglets (BottomNav) + piles imbriquees** : chaque onglet maintient sa propre pile de navigation. Un utilisateur sur l'onglet "Explorer" qui navigue vers un detail de panier, puis switch sur "Favoris", puis revient sur "Explorer", doit retrouver le detail de panier exactement ou il l'avait laisse.

2. **Guards d'authentification** : les routes protegees doivent rediriger vers le login si l'utilisateur n'est pas authentifie (ADR-010). L'onboarding (premiere ouverture) doit etre montre une seule fois. Le partenaire qui n'a pas fini la configuration de sa boutique doit etre redirige vers le setup.

3. **Deep linking** : les notifications push (FCM, ADR-014) contiennent un `data` payload avec un deep link (`{ reservationId: "xxx" }`). L'app doit naviguer vers le bon ecran meme si elle est fermee. Les Universal Links iOS et App Links Android doivent fonctionner pour le partage web-to-app.

4. **Navigation offline** : quand l'utilisateur navigue vers un ecran qui necessite des donnees serveur mais est hors ligne, l'app doit afficher les donnees Drift cached (Tier 1/2, ADR-012) ou un message d'erreur avec retry.

5. **Monorepo** : les guards, les routes partagees (auth, onboarding), et la logique de deep linking doivent etre factorisees dans le package `core` pour eviter la duplication entre les deux apps.

6. **Integration Riverpod** : le router doit reagir en temps reel aux changements de state Riverpod (auth state, onboarding state, connectivity state). Un logout force (token expire + refresh echoue, ADR-029 section 6) doit immediatement rediriger vers le login, quel que soit l'ecran courant.

### 1.2 Pourquoi cette decision est critique

Le choix du router impacte :
- **Chaque ecran** des deux apps (comment on navigue vers, comment on en revient)
- **La securite** : un guard mal implemente = acces non autorise a des routes protegees
- **L'UX du deep linking** : une notification push qui ne navigue pas au bon endroit = frustration et desengagement
- **La testabilite** : un router non mockable = impossible de tester les flows de navigation en isolation
- **La maintenance** : un routage imperatif non type-safe = bugs de navigation silencieux qui apparaissent en production

### 1.3 Contraintes

- **Riverpod** : choisi en ADR-029. Le router doit s'integrer nativement avec les providers Riverpod (pas de Provider/ChangeNotifier).
- **2 apps, 1 monorepo** : le code de navigation commun (guards, deep linking) doit vivre dans un package partage.
- **Equipe IA-first** : la solution doit etre bien documentee avec des patterns clairs et reproductibles.
- **Flutter 3.x** : derniere version stable.
- **Performance** : devices d'entree de gamme (2-4 Go RAM). Le router ne doit pas allouer inutilement.

---

## 2. Choix du router

### 2.1 Options evaluees

#### Option A : GoRouter (v14+)

**Description** : Package de routing declaratif maintenu par l'equipe Flutter (Google). Successeur de fait de Navigator 2.0 en simplifiant drastiquement l'API. Pattern de routing base sur des chemins URL (`/baskets/:id`) avec support natif du deep linking, des redirects, et des ShellRoutes pour la navigation par onglets.

**Avantages** :
- **Maintenu par Google/Flutter team** : package officiel de l'ecosysteme Flutter. Mises a jour regulieres, aligne avec les evolutions de Flutter.
- **Deep linking natif** : les routes sont des chemins URL. `GoRouter` parse automatiquement les URLs entrantes (Universal Links, App Links, `bienbon://`) et navigue vers le bon ecran. Zero configuration supplementaire pour le routing -- seul le setup platform (iOS `Associated Domains`, Android `intent-filter`) est necessaire.
- **ShellRoute pour les BottomNav** : `StatefulShellRoute` maintient l'etat de chaque branche de navigation (onglet) independamment. Chaque onglet a sa propre pile. Le switch entre onglets preserve la pile.
- **Redirects declaratifs** : `redirect` est une fonction pure appelee a chaque changement de route. Parfait pour les guards (auth, onboarding, role). Plusieurs niveaux de redirect (global + par sous-route).
- **Type-safe routes (optionnel)** : le package `go_router_builder` permet de generer des routes type-safe avec code generation. Les parametres de route sont types (pas de `String` pour tout).
- **Integration Riverpod** : le `GoRouter` peut etre declare comme provider Riverpod. Il se reconstruit quand le state change (`ref.watch(authNotifierProvider)`). Pattern documente et largement adopte par la communaute.
- **Documentation exhaustive** : guide officiel Flutter, exemples, tutoriels, articles. L'IA a beaucoup de donnees d'entrainement.
- **Communaute massive** : > 4 000 GitHub stars, > 10 millions de downloads pub.dev. Le plus utilise des packages de routing Flutter.

**Inconvenients** :
- **Code generation optionnelle** : sans `go_router_builder`, les routes sont des strings (`'/baskets/$id'`). Une typo dans un chemin ne produit pas d'erreur de compilation.
- **Complexite des ShellRoutes imbriquees** : la configuration des `StatefulShellRoute` avec plusieurs `StatefulShellBranch` est verbeuse. Le code de configuration du router peut devenir long.
- **Redirects limites** : `redirect` ne supporte pas nativement les redirects async (comme verifier un flag en base de donnees). Il faut pre-charger l'etat dans un provider et le lire de maniere synchrone dans le redirect.
- **Historique de breaking changes** : GoRouter a eu des breaking changes significatifs entre les versions majeures (v5 -> v6, v10 -> v13). Les migrations peuvent etre penibles.

#### Option B : AutoRoute (v9+)

**Description** : Package de routing base sur la code generation. Les routes sont declarees via des annotations Dart (`@RoutePage()`, `@AutoRouterConfig()`) et le code de routing est genere par `build_runner`. Fortement type-safe.

**Avantages** :
- **Type-safety maximale** : chaque route est une classe Dart generee. Les parametres sont types. `router.push(BasketDetailRoute(id: basketId))` -- pas de string, pas de typo possible. Erreur de compilation si un parametre manque.
- **Code generation automatique** : `@RoutePage()` sur un widget genere la route correspondante. Moins de configuration manuelle.
- **Navigation par onglets** : `AutoTabsRouter` gere les BottomNav avec preservation de l'etat par onglet. API plus clean que `StatefulShellRoute` de GoRouter.
- **Guards type-safe** : `AutoRouteGuard` est une classe avec une methode `onNavigation` qui recoit le `NavigationResolver`. Plus structure que la fonction `redirect` de GoRouter.
- **Nested navigation** : supporte la navigation imbriquee (routes enfants) de maniere intuitive avec `AutoRouter()` comme child.
- **Transitions custom** : les animations de transition sont declarees au niveau de la route (`@CustomRoute(transitionsBuilder: ...)`). Plus propre que les `CustomTransitionPage` de GoRouter.

**Inconvenients** :
- **Dependance forte a la code generation** : chaque ajout/modification de route necessite `dart run build_runner build`. Le cycle de dev est rallonge. En monorepo Melos avec plusieurs packages, la code generation doit tourner dans chaque package separement.
- **Double code generation avec Riverpod** : ADR-029 a choisi `riverpod_generator` (code gen). AutoRoute ajoute une deuxieme couche de code generation. Deux `build_runner` dans le meme package = conflits potentiels, temps de build plus long.
- **Integration Riverpod moins naturelle** : AutoRoute ne s'integre pas nativement avec Riverpod. Les guards doivent acceder au `ProviderContainer` manuellement (pas de `ref.watch`). Pas de rebuild automatique du router quand le state Riverpod change. Il faut un `ChangeNotifier` bridge ou un `StreamProvider` intermediaire.
- **Deep linking partiel** : AutoRoute supporte le deep linking, mais la configuration est plus complexe que GoRouter. Les chemins sont generes a partir des noms de classes, pas definis explicitement. La correspondance URL <-> route est moins intuitive.
- **Communaute plus petite** : ~1 500 GitHub stars vs 4 000+ pour GoRouter. Moins de tutoriels, moins de retours d'experience.
- **Mainteneur unique** : AutoRoute est maintenu principalement par Milad Akarie (un seul developpeur). Risque de bus factor.

#### Option C : Navigator 2.0 raw (Router + RouteInformationParser + RouterDelegate)

**Description** : API native de Flutter pour la navigation declarative. Introduite dans Flutter 2.0. Tres flexible mais notoirement complexe a implementer. Aucun package supplementaire.

**Avantages** :
- **Zero dependance** : pas de package tiers. Pas de code generation. Pas de risque de breaking changes externes.
- **Controle total** : on implemente exactement le comportement voulu. Aucune limitation d'un framework.
- **Integration Flutter native** : s'integre naturellement avec `MaterialApp.router`, `WidgetsApp.router`.

**Inconvenients** :
- **Complexite prohibitive** : Navigator 2.0 est l'une des APIs les plus complexes de Flutter. Il faut implementer `RouteInformationParser`, `RouterDelegate`, `Page`, gerer le back button Android, les piles imbriquees (BottomNav), le deep linking manuellement.
- **Boilerplate massif** : pour un setup BottomNav + deep linking + guards + transitions, on parle de 500-1000 lignes de code d'infrastructure avant d'avoir une seule route fonctionnelle.
- **Maintenance lourde** : chaque nouvelle route necessite du code dans le parser, le delegate, et la configuration. Pas de convention, pas de structure imposee.
- **IA inefficace** : l'IA n'a pas assez d'exemples de Navigator 2.0 raw bien implemente. Elle produira du code inconsistant et buggue.
- **Anti-pattern pour une equipe** : la communaute Flutter recommande unanimement d'utiliser un package de routing au-dessus de Navigator 2.0. GoRouter a ete cree specifiquement pour resoudre ce probleme.

---

### 2.2 Matrice de decision

#### Criteres et poids

| Critere | Poids | Justification |
|---------|-------|---------------|
| Integration Riverpod | 25% | ADR-029 impose Riverpod. Le router DOIT reagir aux changements de state (auth, onboarding). |
| Deep linking (FCM + Universal/App Links) | 20% | ADR-014 impose des deep links depuis les notifications push. US critiques. |
| Guards / redirects | 15% | Auth guard, onboarding guard, role guard, store setup guard. Securite critique. |
| Type-safety | 10% | Prevenir les bugs de navigation silencieux. L'IA produit du code plus fiable avec des types. |
| Navigation par onglets (BottomNav) | 10% | Pattern principal des deux apps. Preservation de l'etat par onglet. |
| Maintenance communaute / perennite | 10% | Stabilite a long terme. Pas de bus factor. |
| Courbe d'apprentissage IA | 5% | L'IA doit produire du code idiomatique. |
| Code generation overhead | 5% | Deja `riverpod_generator` + `freezed` + Drift. Minimiser les layers de codegen. |

#### Notation (sur 5)

| Critere (poids) | GoRouter (A) | AutoRoute (B) | Navigator 2.0 raw (C) |
|-----------------|:------------:|:-------------:|:----------------------:|
| Integration Riverpod (25%) | **5** | 2.5 | 3 |
| Deep linking (20%) | **5** | 3.5 | 4 |
| Guards / redirects (15%) | 4.5 | **5** | 4 |
| Type-safety (10%) | 3.5 | **5** | 2 |
| Navigation BottomNav (10%) | 4 | **4.5** | 3 |
| Maintenance / perennite (10%) | **5** | 3 | **5** |
| Courbe apprentissage IA (5%) | **5** | 3.5 | 1.5 |
| Code generation overhead (5%) | 4 | 2 | **5** |

#### Scores ponderes

| Option | Score pondere | Calcul |
|--------|:------------:|--------|
| **GoRouter (A)** | **4.58** | (5x0.25)+(5x0.20)+(4.5x0.15)+(3.5x0.10)+(4x0.10)+(5x0.10)+(5x0.05)+(4x0.05) |
| AutoRoute (B) | 3.53 | (2.5x0.25)+(3.5x0.20)+(5x0.15)+(5x0.10)+(4.5x0.10)+(3x0.10)+(3.5x0.05)+(2x0.05) |
| Navigator 2.0 raw (C) | 3.43 | (3x0.25)+(4x0.20)+(4x0.15)+(2x0.10)+(3x0.10)+(5x0.10)+(1.5x0.05)+(5x0.05) |

### 2.3 Justification detaillee des notes

#### Pourquoi GoRouter obtient 5/5 en integration Riverpod

GoRouter se declare comme un provider Riverpod et se reconstruit automatiquement quand le state change :

```dart
@riverpod
GoRouter router(Ref ref) {
  final authState = ref.watch(authNotifierProvider);
  final onboardingDone = ref.watch(onboardingCompleteProvider);

  return GoRouter(
    refreshListenable: /* pas necessaire avec Riverpod -- le provider se reconstruit */,
    redirect: (context, state) {
      // Guard synchrone base sur le state Riverpod
      if (authState is Unauthenticated && !state.matchedLocation.startsWith('/auth')) {
        return '/auth/login';
      }
      if (authState is Authenticated && !onboardingDone) {
        return '/onboarding';
      }
      return null;
    },
    routes: [/* ... */],
  );
}
```

Quand `authNotifierProvider` emet `Unauthenticated` (token expire, logout), le provider `routerProvider` est reconstruit, le `redirect` est re-evalue, et l'utilisateur est redirige vers le login. **Zero code imperatif, zero listener manuel.**

Avec AutoRoute, il faut un bridge `ChangeNotifier` ou un `StreamSubscription` pour ecouter les changements Riverpod et declencher une re-evaluation des guards. C'est du code glue supplementaire.

#### Pourquoi AutoRoute obtient 5/5 en type-safety

```dart
// AutoRoute : compile-time safe
router.push(BasketDetailRoute(id: 'bsk_abc')); // Erreur de compilation si `id` manque
router.push(CheckoutRoute(basketId: 'bsk_abc', quantity: 2)); // Types verifies

// GoRouter (sans go_router_builder) : runtime safe
context.go('/baskets/bsk_abc'); // Typo dans le chemin = 404 silencieux
context.go('/baskets'); // Parametre manquant = crash ou 404

// GoRouter (avec go_router_builder) : compile-time safe aussi
BasketDetailRoute(id: 'bsk_abc').go(context); // Type-safe, mais ajoute une couche de codegen
```

**Note** : `go_router_builder` comble en grande partie le gap de type-safety. Le score de GoRouter serait 4.5/5 avec `go_router_builder`, mais nous ne le recommandons pas (voir section 2.4) pour eviter une troisieme couche de code generation.

#### Pourquoi GoRouter obtient 5/5 en deep linking

GoRouter utilise des chemins URL comme identifiants de route (`/baskets/:id`, `/orders/:orderId`). Quand une URL arrive (depuis un deep link FCM, un Universal Link, ou un App Link), GoRouter la parse nativement et navigue vers le bon ecran. Aucune configuration supplementaire cote Flutter -- seul le setup platform est necessaire.

Avec AutoRoute, les chemins sont generes a partir des noms de classes (`/basket-detail-page`). La correspondance avec un deep link custom (`bienbon://baskets/bsk_abc`) necessite un mapping explicite supplementaire.

---

### 2.4 Decision : GoRouter (v14+, sans go_router_builder)

**GoRouter est choisi comme solution de routing pour les deux apps Flutter BienBon.**

**Justification resumee :**

1. **Integration Riverpod native** : le router est un provider Riverpod. Les guards sont des fonctions pures qui lisent le state Riverpod. Le router se reconstruit automatiquement quand le state change (auth, onboarding, connectivity). C'est l'argument decisif.

2. **Deep linking zero-effort** : les routes sont des chemins URL. Les notifications push FCM, les Universal Links, et les App Links arrivent sous forme d'URL que GoRouter parse nativement. Pas de mapping supplementaire.

3. **StatefulShellRoute** : gere la navigation par onglets (BottomNav) avec preservation de l'etat par branche. Pattern exact des deux apps BienBon.

4. **Package officiel Flutter** : maintenu par l'equipe Flutter (Google). Pas de bus factor. Perennite assuree.

5. **Documentation et communaute** : le plus documente des packages de routing Flutter. L'IA produira du code idiomatique.

6. **Pas de code generation supplementaire** : ADR-029 a deja `riverpod_generator` + `freezed` + Drift codegen. Ajouter `go_router_builder` ou AutoRoute ajouterait une couche de codegen supplementaire. Le cycle de build est deja charge. On accepte le trade-off type-safety (conventions de nommage strictes + lint rules pour compenser).

**Pourquoi pas AutoRoute ?**
AutoRoute est le concurrent le plus serieux (type-safety superieure, guards structures). Il est elimine pour une raison decisive : **l'integration Riverpod est non-native**. AutoRoute repose sur un systeme de guards interne qui ne s'integre pas avec `ref.watch()`. Il faudrait un bridge `ChangeNotifier` pour que les guards reagissent aux changements de state Riverpod. Cela cree une couche de code glue, une source de bugs, et une complexite que GoRouter evite completement.

**Pourquoi pas Navigator 2.0 raw ?**
Non considere serieusement. La complexite prohibitive est un consensus de la communaute Flutter. GoRouter a ete cree par l'equipe Flutter specifiquement pour eviter Navigator 2.0 raw.

**Garde-fous pour compenser l'absence de type-safety complete :**
- **Convention de nommage stricte** : chaque chemin de route est defini comme une constante dans un fichier `routes.dart` du package `core`. Pas de strings magiques dans le code.
- **Lint custom** : un lint rule verifie que les appels `context.go()` et `context.push()` utilisent les constantes de routes, pas des strings litterales.
- **Tests de navigation** : chaque route est testee dans un widget test qui verifie que la navigation aboutit au bon ecran.

---

## 3. Architecture de navigation

### 3.1 App Consumer -- graphe de navigation

```
                        +-- Splash Screen --+
                        |                   |
                   [premiere fois?]    [session existante?]
                        |                   |
                   Onboarding         Home (BottomNav)
                   (3 ecrans)              |
                        |                  |
                   Auth Flow               |
                   /auth/login             |
                   /auth/register          |
                   /auth/forgot-password   |
                   /auth/verify-email      |
                   /auth/verify-phone      |
                        |                  |
                        +---> Home (BottomNav) <---+
                              |                    |
         +--------+-----------+----------+---------+
         |        |           |          |         |
      Explorer   Carte    Favoris   Commandes   Profil
      (tab 0)   (tab 1)  (tab 2)   (tab 3)    (tab 4)
         |        |           |          |         |
         |        |           |          |    /profile
         |        |           |          |    /profile/edit
         |        |           |          |    /profile/notifications
         |        |           |          |    /profile/preferences
         |        |           |          |    /profile/referral
         |        |           |          |    /profile/impact
         |        |           |          |    /profile/settings
         |        |           |          |    /profile/delete-account
         |        |           |          |
         |        |           |     /orders
         |        |           |     /orders/:id (detail)
         |        |           |     /orders/:id/pickup (QR + PIN)
         |        |           |     /orders/:id/review
         |        |           |     /orders/:id/claim
         |        |           |
         |        |      /favorites
         |        |
         |   /map (carte interactive)
         |   /map/store/:storeId (fiche depuis carte)
         |
    /explore
    /explore/basket/:id (detail panier)
    /explore/basket/:id/checkout (paiement)
    /explore/basket/:id/checkout/confirm (confirmation)
    /explore/store/:storeId (fiche commerce)

    --- Routes globales (hors BottomNav) ---
    /notifications (centre de notifications)
    /notifications/:id (detail notification -> deep link vers l'ecran cible)
```

### 3.2 App Partner -- graphe de navigation

```
                        +-- Splash Screen --+
                        |                   |
                   [premiere fois?]    [session existante?]
                        |                   |
                   Auth Flow          [boutique configuree?]
                   /auth/login              |
                   /auth/register      +----+----+
                   (stepper 4 etapes)  |         |
                        |           Store    Home (BottomNav)
                        |           Setup        |
                        +--------->  |           |
                                     |           |
                        +------------+           |
                        |                        |
                        +---> Home (BottomNav) <-+
                              |
         +--------+-----------+----------+---------+
         |        |           |          |         |
     Dashboard  Paniers   Commandes   Scanner   Parametres
     (tab 0)   (tab 1)   (tab 2)    (tab 3)    (tab 4)
         |        |           |          |         |
         |        |           |          |    /settings
         |        |           |          |    /settings/store
         |        |           |          |    /settings/store/edit
         |        |           |          |    /settings/schedule
         |        |           |          |    /settings/payout
         |        |           |          |    /settings/payout/history
         |        |           |          |    /settings/account
         |        |           |          |
         |        |           |     /scanner (camera QR)
         |        |           |     /scanner/result/:code
         |        |           |     /scanner/manual-pin
         |        |           |
         |        |      /orders
         |        |      /orders/:id (detail commande)
         |        |      /orders/:id/validate (confirmation retrait)
         |        |      /orders/history
         |        |
         |   /baskets
         |   /baskets/create
         |   /baskets/:id/edit
         |   /baskets/:id/preview
         |   /baskets/:id/duplicate
         |
    /dashboard
    /dashboard/analytics
    /dashboard/revenue

    --- Routes globales (hors BottomNav) ---
    /notifications
```

### 3.3 Configuration GoRouter -- App Consumer

```dart
// packages/consumer_features/lib/src/navigation/consumer_router.dart

import 'package:core/providers/auth_providers.dart';
import 'package:core/navigation/route_paths.dart';
import 'package:core/navigation/guards.dart';

@riverpod
GoRouter consumerRouter(Ref ref) {
  final authState = ref.watch(authNotifierProvider);
  final onboardingDone = ref.watch(onboardingCompleteProvider);

  return GoRouter(
    initialLocation: ConsumerRoutes.explore,
    debugLogDiagnostics: kDebugMode,
    redirect: (context, state) => combinedRedirect(
      authState: authState,
      onboardingDone: onboardingDone,
      currentLocation: state.matchedLocation,
      publicRoutes: ConsumerRoutes.publicRoutes,
    ),
    routes: [
      // --- Auth flow (hors BottomNav) ---
      GoRoute(
        path: ConsumerRoutes.login,
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: ConsumerRoutes.register,
        builder: (_, __) => const RegisterScreen(),
      ),
      GoRoute(
        path: ConsumerRoutes.forgotPassword,
        builder: (_, __) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: ConsumerRoutes.onboarding,
        builder: (_, __) => const OnboardingScreen(),
      ),

      // --- Home avec BottomNav ---
      StatefulShellRoute.indexedStack(
        builder: (_, __, navigationShell) => ConsumerShell(
          navigationShell: navigationShell,
        ),
        branches: [
          // Tab 0 : Explorer
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: ConsumerRoutes.explore,
                builder: (_, __) => const ExploreScreen(),
                routes: [
                  GoRoute(
                    path: 'basket/:id',
                    builder: (_, state) => BasketDetailScreen(
                      basketId: state.pathParameters['id']!,
                    ),
                    routes: [
                      GoRoute(
                        path: 'checkout',
                        builder: (_, state) => CheckoutScreen(
                          basketId: state.pathParameters['id']!,
                        ),
                        routes: [
                          GoRoute(
                            path: 'confirm',
                            builder: (_, state) => ConfirmationScreen(
                              basketId: state.pathParameters['id']!,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  GoRoute(
                    path: 'store/:storeId',
                    builder: (_, state) => StoreDetailScreen(
                      storeId: state.pathParameters['storeId']!,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Tab 1 : Carte
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: ConsumerRoutes.map,
                builder: (_, __) => const MapScreen(),
                routes: [
                  GoRoute(
                    path: 'store/:storeId',
                    builder: (_, state) => StoreDetailScreen(
                      storeId: state.pathParameters['storeId']!,
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Tab 2 : Favoris
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: ConsumerRoutes.favorites,
                builder: (_, __) => const FavoritesScreen(),
              ),
            ],
          ),

          // Tab 3 : Commandes
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: ConsumerRoutes.orders,
                builder: (_, __) => const OrdersScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (_, state) => OrderDetailScreen(
                      orderId: state.pathParameters['id']!,
                    ),
                    routes: [
                      GoRoute(
                        path: 'pickup',
                        builder: (_, state) => PickupScreen(
                          orderId: state.pathParameters['id']!,
                        ),
                      ),
                      GoRoute(
                        path: 'review',
                        builder: (_, state) => ReviewScreen(
                          orderId: state.pathParameters['id']!,
                        ),
                      ),
                      GoRoute(
                        path: 'claim',
                        builder: (_, state) => ClaimScreen(
                          orderId: state.pathParameters['id']!,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),

          // Tab 4 : Profil
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: ConsumerRoutes.profile,
                builder: (_, __) => const ProfileScreen(),
                routes: [
                  GoRoute(
                    path: 'edit',
                    builder: (_, __) => const EditProfileScreen(),
                  ),
                  GoRoute(
                    path: 'notifications',
                    builder: (_, __) => const NotificationPreferencesScreen(),
                  ),
                  GoRoute(
                    path: 'referral',
                    builder: (_, __) => const ReferralScreen(),
                  ),
                  GoRoute(
                    path: 'impact',
                    builder: (_, __) => const ImpactScreen(),
                  ),
                  GoRoute(
                    path: 'settings',
                    builder: (_, __) => const SettingsScreen(),
                  ),
                  GoRoute(
                    path: 'delete-account',
                    builder: (_, __) => const DeleteAccountScreen(),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),

      // --- Routes globales (hors BottomNav) ---
      GoRoute(
        path: ConsumerRoutes.notifications,
        builder: (_, __) => const NotificationCenterScreen(),
      ),
    ],
  );
}
```

### 3.4 Constantes de routes

```dart
// packages/core/lib/src/navigation/route_paths.dart

/// Routes partagees (auth, onboarding)
abstract final class SharedRoutes {
  static const login = '/auth/login';
  static const register = '/auth/register';
  static const forgotPassword = '/auth/forgot-password';
  static const verifyEmail = '/auth/verify-email';
  static const verifyPhone = '/auth/verify-phone';
  static const onboarding = '/onboarding';

  /// Routes accessibles sans authentification
  static const publicRoutes = [login, register, forgotPassword, verifyEmail, verifyPhone, onboarding];
}

/// Routes specifiques a l'app consumer
abstract final class ConsumerRoutes extends SharedRoutes {
  static const explore = '/explore';
  static const basketDetail = '/explore/basket/:id';
  static const checkout = '/explore/basket/:id/checkout';
  static const checkoutConfirm = '/explore/basket/:id/checkout/confirm';
  static const storeDetail = '/explore/store/:storeId';
  static const map = '/map';
  static const favorites = '/favorites';
  static const orders = '/orders';
  static const orderDetail = '/orders/:id';
  static const pickup = '/orders/:id/pickup';
  static const review = '/orders/:id/review';
  static const claim = '/orders/:id/claim';
  static const profile = '/profile';
  static const editProfile = '/profile/edit';
  static const referral = '/profile/referral';
  static const impact = '/profile/impact';
  static const notifications = '/notifications';

  /// Routes accessibles sans authentification (mode invite, ADR-010)
  static const publicRoutes = [
    ...SharedRoutes.publicRoutes,
    explore,        // Browse sans inscription
    map,            // Carte sans inscription
  ];

  /// Helper pour construire un chemin avec parametres
  static String basketDetailPath(String id) => '/explore/basket/$id';
  static String orderDetailPath(String id) => '/orders/$id';
  static String pickupPath(String id) => '/orders/$id/pickup';
  static String storeDetailPath(String storeId) => '/explore/store/$storeId';
}

/// Routes specifiques a l'app partner
abstract final class PartnerRoutes extends SharedRoutes {
  static const dashboard = '/dashboard';
  static const analytics = '/dashboard/analytics';
  static const revenue = '/dashboard/revenue';
  static const baskets = '/baskets';
  static const createBasket = '/baskets/create';
  static const editBasket = '/baskets/:id/edit';
  static const orders = '/orders';
  static const orderDetail = '/orders/:id';
  static const validatePickup = '/orders/:id/validate';
  static const orderHistory = '/orders/history';
  static const scanner = '/scanner';
  static const scanResult = '/scanner/result/:code';
  static const manualPin = '/scanner/manual-pin';
  static const settings = '/settings';
  static const storeSettings = '/settings/store';
  static const editStore = '/settings/store/edit';
  static const payoutHistory = '/settings/payout/history';
  static const storeSetup = '/store-setup';

  /// Aucune route publique pour l'app partner (tout est protege)
  static const publicRoutes = SharedRoutes.publicRoutes;

  static String basketEditPath(String id) => '/baskets/$id/edit';
  static String orderDetailPath(String id) => '/orders/$id';
  static String scanResultPath(String code) => '/scanner/result/$code';
}
```

### 3.5 Shell avec BottomNavigationBar

```dart
// packages/consumer_features/lib/src/navigation/consumer_shell.dart

class ConsumerShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ConsumerShell({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) {
          // GoRouter gere le switch d'onglet et preserve la pile
          navigationShell.goBranch(
            index,
            // Si on tape sur l'onglet courant, remonter au root de la branche
            initialLocation: index == navigationShell.currentIndex,
          );
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(LucideIcons.compass),
            selectedIcon: Icon(LucideIcons.compass, color: Color(0xFF2E7D32)),
            label: 'Explorer',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.map),
            selectedIcon: Icon(LucideIcons.map, color: Color(0xFF2E7D32)),
            label: 'Carte',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.heart),
            selectedIcon: Icon(LucideIcons.heart, color: Color(0xFF2E7D32)),
            label: 'Favoris',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.shoppingBag),
            selectedIcon: Icon(LucideIcons.shoppingBag, color: Color(0xFF2E7D32)),
            label: 'Commandes',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.user),
            selectedIcon: Icon(LucideIcons.user, color: Color(0xFF2E7D32)),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}
```

---

## 4. Guards et redirects

### 4.1 Architecture des guards

Les guards sont des fonctions pures dans le package `core`. Ils lisent le state Riverpod de maniere synchrone (le state est pre-charge dans les providers) et retournent `null` (pas de redirect) ou un chemin de destination.

```
                         Route demandee
                              |
                    [1. Auth Guard]
                    Est-il authentifie ?
                         |          |
                        Non        Oui
                         |          |
                   -> /auth/login  [2. Onboarding Guard]
                                    A-t-il fait l'onboarding ?
                                         |          |
                                        Non        Oui
                                         |          |
                                   -> /onboarding  [3. Role Guard]
                                                    A-t-il le bon role ?
                                                         |          |
                                                        Non        Oui
                                                         |          |
                                                   -> /auth/login  [4. Store Setup Guard]
                                                   (ou erreur)      (partner uniquement)
                                                                    A-t-il configure
                                                                    sa boutique ?
                                                                         |          |
                                                                        Non        Oui
                                                                         |          |
                                                                   -> /store-setup  Route OK
```

### 4.2 Implementation des guards

```dart
// packages/core/lib/src/navigation/guards.dart

/// Guard combine utilise dans le `redirect` du GoRouter.
/// Chaque guard est evalue dans l'ordre. Le premier qui retourne
/// une destination non-null "gagne".
String? combinedRedirect({
  required AuthState authState,
  required bool onboardingDone,
  required String currentLocation,
  required List<String> publicRoutes,
  String? requiredRole,         // 'consumer' ou 'partner'
  bool? storeSetupComplete,     // uniquement pour l'app partner
}) {
  // 1. Auth Guard
  final authRedirect = _authGuard(
    authState: authState,
    currentLocation: currentLocation,
    publicRoutes: publicRoutes,
  );
  if (authRedirect != null) return authRedirect;

  // 2. Onboarding Guard
  final onboardingRedirect = _onboardingGuard(
    onboardingDone: onboardingDone,
    currentLocation: currentLocation,
  );
  if (onboardingRedirect != null) return onboardingRedirect;

  // 3. Role Guard (si un role est requis)
  if (requiredRole != null && authState is Authenticated) {
    final roleRedirect = _roleGuard(
      roles: authState.roles,
      requiredRole: requiredRole,
      currentLocation: currentLocation,
    );
    if (roleRedirect != null) return roleRedirect;
  }

  // 4. Store Setup Guard (partner uniquement)
  if (storeSetupComplete == false && authState is Authenticated) {
    final setupRedirect = _storeSetupGuard(
      currentLocation: currentLocation,
    );
    if (setupRedirect != null) return setupRedirect;
  }

  return null; // Pas de redirect -- navigation autorisee
}

/// Guard 1 : Authentification
/// Redirige vers /auth/login si l'utilisateur n'est pas authentifie
/// et tente d'acceder a une route protegee.
/// Redirige vers la home si l'utilisateur est authentifie et tente
/// d'acceder a une route d'auth (evite de voir le login apres connexion).
String? _authGuard({
  required AuthState authState,
  required String currentLocation,
  required List<String> publicRoutes,
}) {
  final isAuthenticated = authState is Authenticated;
  final isOnPublicRoute = publicRoutes.any(
    (route) => currentLocation.startsWith(route),
  );
  final isOnAuthRoute = currentLocation.startsWith('/auth');

  // Non authentifie sur route protegee -> login
  if (!isAuthenticated && !isOnPublicRoute) {
    return SharedRoutes.login;
  }

  // Authentifie sur route d'auth -> home
  if (isAuthenticated && isOnAuthRoute) {
    return '/'; // Sera resolu vers la home par defaut (explore ou dashboard)
  }

  return null;
}

/// Guard 2 : Onboarding (premiere ouverture)
/// Redirige vers /onboarding si l'utilisateur n'a pas termine l'onboarding
/// ET n'est pas deja sur l'ecran d'onboarding.
String? _onboardingGuard({
  required bool onboardingDone,
  required String currentLocation,
}) {
  if (!onboardingDone && !currentLocation.startsWith('/onboarding')) {
    return SharedRoutes.onboarding;
  }
  if (onboardingDone && currentLocation.startsWith('/onboarding')) {
    return '/';
  }
  return null;
}

/// Guard 3 : Role (RBAC, cf. ADR-011)
/// Verifie que l'utilisateur a le role requis pour l'app.
/// Ex: l'app consumer exige le role 'consumer', l'app partner exige 'partner'.
String? _roleGuard({
  required List<String> roles,
  required String requiredRole,
  required String currentLocation,
}) {
  if (!roles.contains(requiredRole)) {
    // L'utilisateur n'a pas le bon role.
    // Un consumer qui tente d'acceder a l'app partner (ou vice versa)
    // est redirige vers le login avec un message d'erreur.
    return '${SharedRoutes.login}?error=wrong_role';
  }
  return null;
}

/// Guard 4 : Configuration boutique (partner uniquement)
/// Redirige vers /store-setup si le partenaire n'a pas configure sa boutique
/// (apres l'inscription et la validation admin).
String? _storeSetupGuard({
  required String currentLocation,
}) {
  if (!currentLocation.startsWith('/store-setup') &&
      !currentLocation.startsWith('/auth') &&
      !currentLocation.startsWith('/settings')) {
    return PartnerRoutes.storeSetup;
  }
  return null;
}
```

### 4.3 Providers pour les guards

```dart
// packages/core/lib/src/navigation/guard_providers.dart

/// Onboarding complete ? Persiste dans SharedPreferences.
@Riverpod(keepAlive: true)
class OnboardingComplete extends _$OnboardingComplete {
  @override
  bool build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    return prefs.getBool('onboarding_complete') ?? false;
  }

  Future<void> complete() async {
    final prefs = ref.read(sharedPreferencesProvider);
    await prefs.setBool('onboarding_complete', true);
    state = true;
  }
}

/// Store setup complete ? Verifie si le partenaire a au moins un commerce actif.
/// Utilise uniquement dans l'app partner.
@riverpod
Future<bool> storeSetupComplete(Ref ref) async {
  final authState = ref.watch(authNotifierProvider);
  if (authState is! Authenticated) return false;
  if (!authState.roles.contains('partner')) return false;

  // Verifier dans le cache Drift (offline-first)
  final db = ref.watch(appDatabaseProvider);
  final stores = await db.getPartnerStores(authState.userId);
  return stores.isNotEmpty && stores.any((s) => s.status == 'active');
}
```

### 4.4 Integration du router dans l'app Partner

```dart
// apps/partner/lib/src/navigation/partner_router.dart

@riverpod
GoRouter partnerRouter(Ref ref) {
  final authState = ref.watch(authNotifierProvider);
  final onboardingDone = ref.watch(onboardingCompleteProvider);
  final storeSetup = ref.watch(storeSetupCompleteProvider).valueOrNull ?? false;

  return GoRouter(
    initialLocation: PartnerRoutes.dashboard,
    debugLogDiagnostics: kDebugMode,
    redirect: (context, state) => combinedRedirect(
      authState: authState,
      onboardingDone: onboardingDone,
      currentLocation: state.matchedLocation,
      publicRoutes: PartnerRoutes.publicRoutes,
      requiredRole: 'partner',             // Role guard actif
      storeSetupComplete: storeSetup,       // Store setup guard actif
    ),
    routes: [
      // Auth flow
      GoRoute(path: PartnerRoutes.login, builder: (_, __) => const LoginScreen()),
      GoRoute(path: PartnerRoutes.register, builder: (_, __) => const PartnerRegisterScreen()),

      // Store setup (premiere configuration)
      GoRoute(path: PartnerRoutes.storeSetup, builder: (_, __) => const StoreSetupScreen()),

      // Home avec BottomNav
      StatefulShellRoute.indexedStack(
        builder: (_, __, navigationShell) => PartnerShell(
          navigationShell: navigationShell,
        ),
        branches: [
          // Tab 0 : Dashboard
          StatefulShellBranch(routes: [
            GoRoute(
              path: PartnerRoutes.dashboard,
              builder: (_, __) => const DashboardScreen(),
              routes: [
                GoRoute(path: 'analytics', builder: (_, __) => const AnalyticsScreen()),
                GoRoute(path: 'revenue', builder: (_, __) => const RevenueScreen()),
              ],
            ),
          ]),

          // Tab 1 : Paniers
          StatefulShellBranch(routes: [
            GoRoute(
              path: PartnerRoutes.baskets,
              builder: (_, __) => const BasketsScreen(),
              routes: [
                GoRoute(path: 'create', builder: (_, __) => const CreateBasketScreen()),
                GoRoute(
                  path: ':id/edit',
                  builder: (_, state) => EditBasketScreen(
                    basketId: state.pathParameters['id']!,
                  ),
                ),
                GoRoute(
                  path: ':id/preview',
                  builder: (_, state) => BasketPreviewScreen(
                    basketId: state.pathParameters['id']!,
                  ),
                ),
              ],
            ),
          ]),

          // Tab 2 : Commandes en cours
          StatefulShellBranch(routes: [
            GoRoute(
              path: PartnerRoutes.orders,
              builder: (_, __) => const PartnerOrdersScreen(),
              routes: [
                GoRoute(
                  path: ':id',
                  builder: (_, state) => PartnerOrderDetailScreen(
                    orderId: state.pathParameters['id']!,
                  ),
                  routes: [
                    GoRoute(
                      path: 'validate',
                      builder: (_, state) => ValidatePickupScreen(
                        orderId: state.pathParameters['id']!,
                      ),
                    ),
                  ],
                ),
                GoRoute(path: 'history', builder: (_, __) => const OrderHistoryScreen()),
              ],
            ),
          ]),

          // Tab 3 : Scanner QR
          StatefulShellBranch(routes: [
            GoRoute(
              path: PartnerRoutes.scanner,
              builder: (_, __) => const QrScannerScreen(),
              routes: [
                GoRoute(
                  path: 'result/:code',
                  builder: (_, state) => ScanResultScreen(
                    code: state.pathParameters['code']!,
                  ),
                ),
                GoRoute(path: 'manual-pin', builder: (_, __) => const ManualPinScreen()),
              ],
            ),
          ]),

          // Tab 4 : Parametres
          StatefulShellBranch(routes: [
            GoRoute(
              path: PartnerRoutes.settings,
              builder: (_, __) => const SettingsScreen(),
              routes: [
                GoRoute(
                  path: 'store',
                  builder: (_, __) => const StoreSettingsScreen(),
                  routes: [
                    GoRoute(path: 'edit', builder: (_, __) => const EditStoreScreen()),
                  ],
                ),
                GoRoute(path: 'schedule', builder: (_, __) => const ScheduleScreen()),
                GoRoute(
                  path: 'payout',
                  builder: (_, __) => const PayoutScreen(),
                  routes: [
                    GoRoute(path: 'history', builder: (_, __) => const PayoutHistoryScreen()),
                  ],
                ),
                GoRoute(path: 'account', builder: (_, __) => const AccountSettingsScreen()),
              ],
            ),
          ]),
        ],
      ),

      // Route globale
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationCenterScreen()),
    ],
  );
}
```

---

## 5. Deep linking

### 5.1 Schema URI

| Type | Schema | Exemple | Contexte |
|------|--------|---------|----------|
| **URI interne** | `bienbon://` | `bienbon://orders/rsv_abc` | Navigation interne, tests |
| **Universal Links (iOS)** | `https://app.bienbon.mu/` | `https://app.bienbon.mu/explore/basket/bsk_abc` | Partage web-to-app, marketing |
| **App Links (Android)** | `https://app.bienbon.mu/` | `https://app.bienbon.mu/explore/basket/bsk_abc` | Partage web-to-app, marketing |
| **FCM data payload** | N/A (JSON) | `{ "route": "/orders/rsv_abc" }` | Notifications push |

### 5.2 Table de correspondance deep link -> route

#### App Consumer

| Declencheur (ADR-014) | `data` payload FCM | Route GoRouter | Ecran |
|------------------------|-------------------|----------------|-------|
| Favori publie un nouveau panier | `{ "route": "/explore/basket/bsk_abc" }` | `/explore/basket/:id` | Detail panier |
| Confirmation de reservation | `{ "route": "/orders/rsv_abc" }` | `/orders/:id` | Detail commande |
| Rappel 1h avant retrait | `{ "route": "/orders/rsv_abc/pickup" }` | `/orders/:id/pickup` | Ecran pickup (QR + PIN) |
| Annulation par le partenaire | `{ "route": "/orders/rsv_abc" }` | `/orders/:id` | Detail commande (avec banner annulation) |
| Remboursement effectue | `{ "route": "/orders/rsv_abc" }` | `/orders/:id` | Detail commande (avec badge remboursement) |
| Alerte no-show | `{ "route": "/orders/rsv_abc" }` | `/orders/:id` | Detail commande |
| Reclamation resolue | `{ "route": "/orders/rsv_abc/claim" }` | `/orders/:id/claim` | Detail reclamation |
| Parrainage valide | `{ "route": "/profile/referral" }` | `/profile/referral` | Ecran parrainage |
| Marketing | `{ "route": "/explore" }` | `/explore` | Explorer (ou route custom) |

#### App Partner

| Declencheur | `data` payload FCM | Route GoRouter | Ecran |
|-------------|-------------------|----------------|-------|
| Nouvelle reservation recue | `{ "route": "/orders/rsv_abc" }` | `/orders/:id` | Detail commande partner |
| No-show detecte | `{ "route": "/orders/rsv_abc" }` | `/orders/:id` | Detail commande |
| Payout traite | `{ "route": "/settings/payout/history" }` | `/settings/payout/history` | Historique payouts |
| Modification approuvee/rejetee | `{ "route": "/settings/store" }` | `/settings/store` | Parametres boutique |

### 5.3 Implementation du deep link handler

```dart
// packages/core/lib/src/navigation/deep_link_handler.dart

/// Gere les deep links entrants depuis FCM, Universal Links, et App Links.
/// Ce service est initialise au demarrage de l'app et ecoute les liens entrants.
class DeepLinkHandler {
  final GoRouter router;

  DeepLinkHandler(this.router);

  /// Traite un deep link depuis une notification FCM.
  /// Appele quand l'utilisateur tape sur une notification (foreground ou background).
  void handleFcmDeepLink(RemoteMessage message) {
    final data = message.data;
    final route = data['route'] as String?;

    if (route == null || route.isEmpty) return;

    // Valider que la route est une route connue (securite)
    if (!_isValidRoute(route)) {
      _log.warning('Deep link invalide ignore: $route');
      return;
    }

    // Naviguer vers la route
    router.go(route);
  }

  /// Traite un deep link depuis un Universal Link / App Link.
  /// L'URL entrante est de la forme https://app.bienbon.mu/explore/basket/bsk_abc
  /// GoRouter parse l'URL et navigue automatiquement -- ce handler est surtout
  /// pour le logging et la validation.
  void handleUniversalLink(Uri uri) {
    final path = uri.path;

    if (!_isValidRoute(path)) {
      _log.warning('Universal link invalide ignore: $uri');
      router.go('/'); // Fallback vers la home
      return;
    }

    router.go(path);
  }

  /// Whitelist des patterns de routes valides pour empecher l'injection
  /// de routes arbitraires via des deep links malicieux.
  bool _isValidRoute(String route) {
    final validPatterns = [
      RegExp(r'^/explore(/basket/[a-zA-Z0-9_-]+)?$'),
      RegExp(r'^/explore/basket/[a-zA-Z0-9_-]+/checkout(/confirm)?$'),
      RegExp(r'^/explore/store/[a-zA-Z0-9_-]+$'),
      RegExp(r'^/orders(/[a-zA-Z0-9_-]+)?$'),
      RegExp(r'^/orders/[a-zA-Z0-9_-]+/(pickup|review|claim)$'),
      RegExp(r'^/favorites$'),
      RegExp(r'^/map$'),
      RegExp(r'^/profile(/edit|/referral|/impact|/notifications|/settings)?$'),
      RegExp(r'^/notifications$'),
      // Partner
      RegExp(r'^/dashboard(/analytics|/revenue)?$'),
      RegExp(r'^/baskets(/create)?$'),
      RegExp(r'^/baskets/[a-zA-Z0-9_-]+/(edit|preview)$'),
      RegExp(r'^/scanner(/result/[a-zA-Z0-9_-]+|/manual-pin)?$'),
      RegExp(r'^/settings(/store(/edit)?|/schedule|/payout(/history)?|/account)?$'),
    ];
    return validPatterns.any((pattern) => pattern.hasMatch(route));
  }
}
```

### 5.4 Integration FCM -> Deep Link

```dart
// packages/core/lib/src/navigation/fcm_navigation_setup.dart

/// Initialise la navigation depuis les notifications FCM.
/// A appeler dans le `main.dart` de chaque app, apres l'initialisation du router.
void setupFcmNavigation(GoRouter router) {
  final deepLinkHandler = DeepLinkHandler(router);

  // Cas 1 : App ouverte en foreground, utilisateur tape sur la notification
  FirebaseMessaging.onMessageOpenedApp.listen((message) {
    deepLinkHandler.handleFcmDeepLink(message);
  });

  // Cas 2 : App fermee (terminated), utilisateur tape sur la notification
  // L'app est lancee avec le message comme parametre initial
  FirebaseMessaging.instance.getInitialMessage().then((message) {
    if (message != null) {
      // Delai pour laisser le router s'initialiser
      Future.delayed(const Duration(milliseconds: 500), () {
        deepLinkHandler.handleFcmDeepLink(message);
      });
    }
  });

  // Cas 3 : Notification recue en foreground (pas de tap)
  // On ne navigue PAS automatiquement -- on affiche une snackbar ou un banner in-app
  FirebaseMessaging.onMessage.listen((message) {
    // Gere par le NotificationOverlayController (ADR-029)
    // Pas de navigation automatique
  });
}
```

### 5.5 Configuration platform pour les deep links

#### iOS -- `Associated Domains` et `Info.plist`

```xml
<!-- ios/Runner/Info.plist -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>bienbon</string>
    </array>
  </dict>
</array>

<!-- ios/Runner/Runner.entitlements -->
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:app.bienbon.mu</string>
</array>
```

Le fichier `apple-app-site-association` doit etre heberge sur `https://app.bienbon.mu/.well-known/apple-app-site-association` :

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.mu.bienbon.consumer",
        "paths": ["/explore/*", "/orders/*", "/favorites", "/map", "/profile/*"]
      },
      {
        "appID": "TEAM_ID.mu.bienbon.partner",
        "paths": ["/dashboard/*", "/baskets/*", "/orders/*", "/scanner/*", "/settings/*"]
      }
    ]
  }
}
```

#### Android -- `intent-filter` dans `AndroidManifest.xml`

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<activity android:name=".MainActivity">
  <!-- URI scheme custom -->
  <intent-filter>
    <action android:name="android.intent.action.VIEW"/>
    <category android:name="android.intent.category.DEFAULT"/>
    <category android:name="android.intent.category.BROWSABLE"/>
    <data android:scheme="bienbon"/>
  </intent-filter>

  <!-- App Links (https) -->
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW"/>
    <category android:name="android.intent.category.DEFAULT"/>
    <category android:name="android.intent.category.BROWSABLE"/>
    <data android:scheme="https" android:host="app.bienbon.mu"/>
  </intent-filter>
</activity>
```

Le fichier `assetlinks.json` doit etre heberge sur `https://app.bienbon.mu/.well-known/assetlinks.json` :

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "mu.bienbon.consumer",
      "sha256_cert_fingerprints": ["XX:XX:..."]
    }
  },
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "mu.bienbon.partner",
      "sha256_cert_fingerprints": ["YY:YY:..."]
    }
  }
]
```

### 5.6 Schema URI callback OAuth (Supabase Auth)

Le callback OAuth (Google, Facebook, Apple) apres authentification necessite un schema URI pour rediriger vers l'app Flutter. Supabase Auth utilise un deep link pour ramener l'utilisateur dans l'app apres le flow OAuth :

```
bienbon://auth/callback
```

Ce schema est configure dans :
1. Supabase Dashboard > Authentication > URL Configuration > Redirect URLs
2. Google Cloud Console > OAuth 2.0 > Authorized redirect URIs
3. Meta for Developers > Facebook Login > Valid OAuth Redirect URIs
4. Apple Developer Portal > Service ID > Return URLs

---

## 6. Navigation offline

### 6.1 Le probleme

Quand l'utilisateur est hors ligne et navigue vers un ecran, trois cas se presentent :

| Tier de donnees (ADR-012) | Disponibilite offline | Comportement navigation |
|---------------------------|----------------------|------------------------|
| **Tier 1** (critique) : QR code, PIN, reservations en cours | Toujours disponible (Drift) | Navigation normale. Donnees locales affichees. |
| **Tier 2** (cache) : partenaires, categories, profil | Disponible si deja cache | Navigation OK si cache existe. Message "Derniere mise a jour il y a X min" si donnees stale. |
| **Tier 3** (temps reel) : stock, paiement | Jamais cache | Navigation OK mais action bloquee. Message "Connexion requise pour reserver". |

### 6.2 Strategie par ecran

```dart
// Pattern : l'ecran decide de son comportement offline,
// pas le router. Le router ne bloque JAMAIS la navigation.

// Le router laisse naviguer vers n'importe quel ecran.
// C'est l'ecran (via son controller Riverpod) qui gere l'absence de donnees.
```

#### Ecrans avec donnees Tier 1 -- Navigation transparente

```dart
// orders/:id/pickup -- Ecran de retrait QR/PIN
// Les donnees sont TOUJOURS dans Drift (Tier 1 critique)

@riverpod
Stream<Reservation> pickupReservation(Ref ref, String orderId) {
  final db = ref.watch(appDatabaseProvider);
  // Stream Drift -- disponible offline
  return db.watchReservationById(orderId);
}

// L'ecran affiche le QR code et le PIN depuis Drift.
// Le partenaire peut valider le retrait offline (queue d'actions, ADR-012).
```

#### Ecrans avec donnees Tier 2 -- Cache avec indicator stale

```dart
// /explore -- Liste des paniers a proximite
// Les donnees sont cachees dans Drift (Tier 2)

@riverpod
class ExploreController extends _$ExploreController {
  @override
  Future<ExploreState> build() async {
    final connectivity = ref.watch(connectivityStateProvider).valueOrNull;
    final repo = ref.watch(exploreRepositoryProvider);

    if (connectivity == ConnectivityStatus.online) {
      // Online : fetch API, persister dans Drift, retourner
      final baskets = await repo.fetchAndCacheNearbyBaskets();
      return ExploreState(baskets: baskets, isStale: false);
    } else {
      // Offline : lire le cache Drift
      final cached = await repo.getCachedNearbyBaskets();
      if (cached.isNotEmpty) {
        return ExploreState(baskets: cached, isStale: true);
      } else {
        // Pas de cache -- afficher un etat vide avec message
        return ExploreState(baskets: [], isStale: true, isEmpty: true);
      }
    }
  }
}

/// State qui indique si les donnees sont stale (offline) ou fraiches
class ExploreState {
  final List<Basket> baskets;
  final bool isStale;
  final bool isEmpty;

  ExploreState({
    required this.baskets,
    this.isStale = false,
    this.isEmpty = false,
  });
}
```

```dart
// Widget qui affiche l'indicator offline
class ExploreScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(exploreControllerProvider);

    return state.when(
      loading: () => const LoadingIndicator(),
      error: (e, _) => ErrorWidget(error: e, onRetry: () => ref.invalidate(exploreControllerProvider)),
      data: (exploreState) => Column(
        children: [
          // Banner offline si donnees stale
          if (exploreState.isStale)
            const OfflineBanner(message: 'Donnees hors ligne. Tirez pour rafraichir.'),

          // Message si aucun cache disponible
          if (exploreState.isEmpty)
            const EmptyOfflineState(
              icon: LucideIcons.wifiOff,
              title: 'Pas de connexion',
              message: 'Connectez-vous a Internet pour decouvrir les paniers a proximite.',
            ),

          // Liste des paniers (cache ou frais)
          if (!exploreState.isEmpty)
            BasketList(baskets: exploreState.baskets),
        ],
      ),
    );
  }
}
```

#### Ecrans avec donnees Tier 3 -- Action bloquee

```dart
// /explore/basket/:id/checkout -- Ecran de paiement
// Le paiement necessite une connexion (Tier 3 : jamais cache)

class CheckoutScreen extends ConsumerWidget {
  final String basketId;

  const CheckoutScreen({super.key, required this.basketId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectivity = ref.watch(connectivityStateProvider).valueOrNull;

    if (connectivity == ConnectivityStatus.offline) {
      return const OfflineBlockedScreen(
        icon: LucideIcons.wifiOff,
        title: 'Connexion requise',
        message: 'Le paiement necessite une connexion Internet. '
                 'Verifiez votre connexion et reessayez.',
        showRetryButton: true,
      );
    }

    // Online : afficher le formulaire de paiement
    return CheckoutForm(basketId: basketId);
  }
}
```

### 6.3 Composants UI offline partages

```dart
// packages/core/lib/src/navigation/offline_widgets.dart

/// Banner affiche en haut de l'ecran quand les donnees sont stale
class OfflineBanner extends StatelessWidget {
  final String message;

  const OfflineBanner({super.key, this.message = 'Vous etes hors ligne'});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: const Color(0xFFFFF3E0), // Orange clair
      child: Row(
        children: [
          const Icon(LucideIcons.wifiOff, size: 16, color: Color(0xFFE65100)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFFE65100),
                fontFamily: 'Nunito',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Ecran bloquant quand une action necessite une connexion
class OfflineBlockedScreen extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final bool showRetryButton;

  const OfflineBlockedScreen({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.showRetryButton = false,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const BackButton()),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 64, color: const Color(0xFFBDBDBD)),
              const SizedBox(height: 16),
              Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF757575))),
              if (showRetryButton) ...[
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () {
                    // Tenter de naviguer a nouveau (le ConnectivityProvider re-evaluera)
                    Navigator.of(context).pop();
                    // Re-push la route pour re-evaluer la connectivite
                  },
                  icon: const Icon(LucideIcons.refreshCw),
                  label: const Text('Reessayer'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
```

### 6.4 Regle importante : le router ne bloque JAMAIS

Le router GoRouter ne doit **jamais** bloquer la navigation vers un ecran pour des raisons de connectivite. Les guards ne verifient que l'authentification, l'onboarding, et le role. La gestion offline est la responsabilite de l'ecran (via son controller Riverpod).

**Pourquoi :** Un guard qui bloque sur la connectivite creerait une UX confuse. L'utilisateur tape sur une commande dans sa liste (donnees Tier 1, disponible offline) mais le guard l'empeche de naviguer parce qu'il n'a pas de reseau ? C'est un faux positif. Chaque ecran sait mieux que le router quelles donnees il peut afficher offline.

---

## 7. Monorepo Melos -- partage du code de navigation

### 7.1 Architecture des packages de navigation

```
bienbon/
  packages/
    core/                                    # Package partage
      lib/
        src/
          navigation/
            route_paths.dart                 # SharedRoutes, ConsumerRoutes, PartnerRoutes
            guards.dart                      # combinedRedirect, _authGuard, _onboardingGuard, etc.
            guard_providers.dart             # onboardingCompleteProvider, storeSetupCompleteProvider
            deep_link_handler.dart           # DeepLinkHandler (validation, routing)
            fcm_navigation_setup.dart        # setupFcmNavigation()
            offline_widgets.dart             # OfflineBanner, OfflineBlockedScreen
            transitions.dart                 # Animations de transition partagees

    consumer_features/                       # Features consumer
      lib/
        src/
          navigation/
            consumer_router.dart             # consumerRouterProvider (GoRouter config)
            consumer_shell.dart              # ConsumerShell (BottomNav)

    partner_features/                        # Features partner
      lib/
        src/
          navigation/
            partner_router.dart              # partnerRouterProvider (GoRouter config)
            partner_shell.dart               # PartnerShell (BottomNav)

  apps/
    consumer/                                # App consumer (assemblage)
      lib/
        main.dart                            # ProviderScope + MaterialApp.router + setupFcmNavigation
      pubspec.yaml                           # Depend de core + consumer_features

    partner/                                 # App partner (assemblage)
      lib/
        main.dart
      pubspec.yaml                           # Depend de core + partner_features
```

### 7.2 Ce qui est partage vs ce qui est specifique

| Element | Package `core` (partage) | Package `consumer_features` / `partner_features` |
|---------|-------------------------|--------------------------------------------------|
| **Constantes de routes** | `SharedRoutes`, `ConsumerRoutes`, `PartnerRoutes` | -- |
| **Logique de guards** | `combinedRedirect()`, guards individuels | -- |
| **Providers de guards** | `onboardingCompleteProvider`, `storeSetupCompleteProvider` | -- |
| **Deep link handler** | `DeepLinkHandler`, `setupFcmNavigation()` | -- |
| **Widgets offline** | `OfflineBanner`, `OfflineBlockedScreen`, `EmptyOfflineState` | -- |
| **Transitions partagees** | `SlideTransitionPage`, `FadeTransitionPage` | -- |
| **Configuration GoRouter** | -- | `consumerRouterProvider`, `partnerRouterProvider` |
| **Shell BottomNav** | -- | `ConsumerShell`, `PartnerShell` |
| **Ecrans** | `LoginScreen`, `OnboardingScreen` (ecrans d'auth partages) | Tous les ecrans metier |

### 7.3 Integration dans le `main.dart`

```dart
// apps/consumer/lib/main.dart

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialiser Firebase pour FCM
  await Firebase.initializeApp();

  // Initialiser Supabase
  await Supabase.initialize(url: Environment.supabaseUrl, anonKey: Environment.supabaseAnonKey);

  runApp(
    const ProviderScope(child: ConsumerApp()),
  );
}

class ConsumerApp extends ConsumerWidget {
  const ConsumerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(consumerRouterProvider);

    // Setup FCM deep linking
    // (utilise addPostFrameCallback pour eviter de naviguer avant le premier build)
    ref.listen(consumerRouterProvider, (_, router) {
      setupFcmNavigation(router);
    });

    return MaterialApp.router(
      title: 'BienBon',
      theme: bienBonTheme,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
```

---

## 8. Animations et transitions

### 8.1 Patterns de transition standard

| Transition | Usage | Duree |
|------------|-------|-------|
| **Slide droite -> gauche** | Navigation push (detail panier, detail commande) | 300ms |
| **Slide bas -> haut** | Ecrans modaux (checkout, scanner QR, creation panier) | 300ms |
| **Fade** | Switch d'onglet dans le BottomNav | 200ms |
| **Hero** | Image du panier (carte -> detail) | 300ms |
| **No animation** | Redirects de guards (login -> home apres auth) | 0ms |

### 8.2 Implementation avec GoRouter

```dart
// packages/core/lib/src/navigation/transitions.dart

/// Transition slide standard (push navigation)
class SlideTransitionPage<T> extends CustomTransitionPage<T> {
  SlideTransitionPage({
    required super.child,
    super.key,
  }) : super(
          transitionDuration: const Duration(milliseconds: 300),
          reverseTransitionDuration: const Duration(milliseconds: 250),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(1.0, 0.0),
                end: Offset.zero,
              ).animate(CurvedAnimation(
                parent: animation,
                curve: Curves.easeOutCubic,
                reverseCurve: Curves.easeInCubic,
              )),
              child: child,
            );
          },
        );
}

/// Transition modale (slide from bottom)
class ModalTransitionPage<T> extends CustomTransitionPage<T> {
  ModalTransitionPage({
    required super.child,
    super.key,
  }) : super(
          transitionDuration: const Duration(milliseconds: 300),
          reverseTransitionDuration: const Duration(milliseconds: 250),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0.0, 1.0),
                end: Offset.zero,
              ).animate(CurvedAnimation(
                parent: animation,
                curve: Curves.easeOutCubic,
              )),
              child: child,
            );
          },
        );
}

/// Transition fade (switch d'onglet, redirects)
class FadeTransitionPage<T> extends CustomTransitionPage<T> {
  FadeTransitionPage({
    required super.child,
    super.key,
  }) : super(
          transitionDuration: const Duration(milliseconds: 200),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        );
}

/// Pas de transition (redirects de guards)
class NoTransitionPage<T> extends CustomTransitionPage<T> {
  NoTransitionPage({
    required super.child,
    super.key,
  }) : super(
          transitionDuration: Duration.zero,
          transitionsBuilder: (_, __, ___, child) => child,
        );
}
```

### 8.3 Application dans la configuration GoRouter

```dart
// Utilisation dans les routes
GoRoute(
  path: 'basket/:id',
  pageBuilder: (context, state) => SlideTransitionPage(
    key: state.pageKey,
    child: BasketDetailScreen(basketId: state.pathParameters['id']!),
  ),
),

GoRoute(
  path: 'checkout',
  pageBuilder: (context, state) => ModalTransitionPage(
    key: state.pageKey,
    child: CheckoutScreen(basketId: state.pathParameters['id']!),
  ),
),
```

### 8.4 Hero animations pour les images de paniers

Les images de paniers utilisent le `Hero` widget natif de Flutter pour une transition fluide entre la carte (liste explorer) et le detail du panier :

```dart
// Dans la carte du panier (liste)
class BasketCard extends StatelessWidget {
  final Basket basket;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push(ConsumerRoutes.basketDetailPath(basket.id)),
      child: Hero(
        tag: 'basket-image-${basket.id}',
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: CachedNetworkImage(
            imageUrl: basket.imageUrl,
            width: double.infinity,
            height: 120,
            fit: BoxFit.cover,
          ),
        ),
      ),
    );
  }
}

// Dans le detail du panier
class BasketDetailScreen extends StatelessWidget {
  final String basketId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 250,
            flexibleSpace: FlexibleSpaceBar(
              background: Hero(
                tag: 'basket-image-$basketId',
                child: CachedNetworkImage(
                  imageUrl: /* image URL */,
                  fit: BoxFit.cover,
                ),
              ),
            ),
          ),
          // ... contenu du detail
        ],
      ),
    );
  }
}
```

**Contrainte GoRouter + Hero** : les Hero animations fonctionnent avec GoRouter a condition que les deux pages (source et destination) soient dans la meme `Navigator`. C'est le cas avec les routes imbriquees dans un `StatefulShellBranch` (meme onglet). Les Hero animations ne fonctionnent **pas** entre deux onglets differents du BottomNav.

---

## 9. Testing de la navigation

### 9.1 Strategie de test par couche

| Couche | Type de test | Outil | Ce qu'on teste |
|--------|-------------|-------|----------------|
| **Guards (logique pure)** | Unit test | `test` | Chaque guard retourne le bon redirect pour chaque combinaison de state |
| **Router configuration** | Widget test | `flutter_test` + `ProviderScope` | Chaque route navigue vers le bon ecran |
| **Deep link handler** | Unit test | `test` | Validation des URLs, routing correct |
| **Navigation flow** | Widget test | `flutter_test` + mock GoRouter | Flow login -> home, onglets, push/pop |
| **Deep links e2e** | Integration test | `integration_test` + `patrol` | Universal Link -> bon ecran, FCM -> bon ecran |
| **Navigation offline** | Widget test | `flutter_test` + mock connectivity | Comportement avec/sans reseau |

### 9.2 Tests unitaires des guards

```dart
// test/core/navigation/guards_test.dart

void main() {
  group('Auth Guard', () {
    test('redirects to login when unauthenticated on protected route', () {
      final redirect = combinedRedirect(
        authState: Unauthenticated(),
        onboardingDone: true,
        currentLocation: '/orders',
        publicRoutes: ConsumerRoutes.publicRoutes,
      );

      expect(redirect, SharedRoutes.login);
    });

    test('allows navigation to public route when unauthenticated', () {
      final redirect = combinedRedirect(
        authState: Unauthenticated(),
        onboardingDone: true,
        currentLocation: '/explore',
        publicRoutes: ConsumerRoutes.publicRoutes,
      );

      expect(redirect, isNull); // Pas de redirect -- mode invite
    });

    test('redirects to home when authenticated on auth route', () {
      final redirect = combinedRedirect(
        authState: Authenticated(
          userId: 'user_1',
          accessToken: 'jwt',
          refreshToken: 'refresh',
          roles: ['consumer'],
          tokenExpiresAt: DateTime.now().add(const Duration(hours: 1)),
        ),
        onboardingDone: true,
        currentLocation: '/auth/login',
        publicRoutes: ConsumerRoutes.publicRoutes,
      );

      expect(redirect, '/');
    });
  });

  group('Onboarding Guard', () {
    test('redirects to onboarding when not completed', () {
      final redirect = combinedRedirect(
        authState: Authenticated(/* ... */),
        onboardingDone: false,
        currentLocation: '/explore',
        publicRoutes: ConsumerRoutes.publicRoutes,
      );

      expect(redirect, SharedRoutes.onboarding);
    });

    test('allows navigation when onboarding is completed', () {
      final redirect = combinedRedirect(
        authState: Authenticated(/* ... */),
        onboardingDone: true,
        currentLocation: '/explore',
        publicRoutes: ConsumerRoutes.publicRoutes,
      );

      expect(redirect, isNull);
    });
  });

  group('Role Guard', () {
    test('redirects to login with error when wrong role', () {
      final redirect = combinedRedirect(
        authState: Authenticated(
          userId: 'user_1',
          accessToken: 'jwt',
          refreshToken: 'refresh',
          roles: ['consumer'],
          tokenExpiresAt: DateTime.now().add(const Duration(hours: 1)),
        ),
        onboardingDone: true,
        currentLocation: '/dashboard',
        publicRoutes: PartnerRoutes.publicRoutes,
        requiredRole: 'partner', // L'app partner exige le role 'partner'
      );

      expect(redirect, '${SharedRoutes.login}?error=wrong_role');
    });
  });

  group('Store Setup Guard', () {
    test('redirects to store setup when not configured', () {
      final redirect = combinedRedirect(
        authState: Authenticated(
          userId: 'user_1',
          accessToken: 'jwt',
          refreshToken: 'refresh',
          roles: ['partner'],
          tokenExpiresAt: DateTime.now().add(const Duration(hours: 1)),
        ),
        onboardingDone: true,
        currentLocation: '/dashboard',
        publicRoutes: PartnerRoutes.publicRoutes,
        requiredRole: 'partner',
        storeSetupComplete: false,
      );

      expect(redirect, PartnerRoutes.storeSetup);
    });
  });
}
```

### 9.3 Widget tests avec mock GoRouter

```dart
// test/features/explore/explore_navigation_test.dart

void main() {
  testWidgets('navigates to basket detail on card tap', (tester) async {
    final fakeRepo = FakeExploreRepository();
    fakeRepo.setBaskets([
      Basket(id: 'bsk_1', title: 'Panier Boulangerie', price: 150, stock: 3),
    ]);

    final router = GoRouter(
      initialLocation: '/explore',
      routes: [
        GoRoute(
          path: '/explore',
          builder: (_, __) => const ExploreScreen(),
          routes: [
            GoRoute(
              path: 'basket/:id',
              builder: (_, state) => BasketDetailScreen(
                basketId: state.pathParameters['id']!,
              ),
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          exploreRepositoryProvider.overrideWithValue(fakeRepo),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );

    await tester.pumpAndSettle();

    // Tap sur la carte du panier
    await tester.tap(find.text('Panier Boulangerie'));
    await tester.pumpAndSettle();

    // Verifier qu'on est sur le detail
    expect(find.byType(BasketDetailScreen), findsOneWidget);
  });

  testWidgets('shows offline banner when connectivity is offline', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          connectivityStateProvider.overrideWith(
            (_) => Stream.value(ConnectivityStatus.offline),
          ),
          exploreRepositoryProvider.overrideWithValue(FakeExploreRepository()),
        ],
        child: MaterialApp.router(routerConfig: testRouter),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.byType(OfflineBanner), findsOneWidget);
  });
}
```

### 9.4 Tests d'integration pour les deep links

```dart
// integration_test/deep_link_test.dart

void main() {
  patrolTest('FCM deep link navigates to order detail', ($) async {
    // Simuler le lancement de l'app avec un message FCM initial
    final message = RemoteMessage(
      data: {'route': '/orders/rsv_test_123'},
    );

    // Initialiser l'app
    app.main();
    await $.pumpAndSettle();

    // Simuler la reception du deep link
    final router = $.tpiBinding.rootElement!
        .findAncestorWidgetOfExactType<MaterialApp>()!
        .routerConfig as GoRouter;

    DeepLinkHandler(router).handleFcmDeepLink(message);
    await $.pumpAndSettle();

    // Verifier qu'on est sur le bon ecran
    expect($.native.getNativeViews(), contains('OrderDetailScreen'));
  });

  patrolTest('Universal Link navigates to basket detail', ($) async {
    app.main();
    await $.pumpAndSettle();

    // Simuler un Universal Link entrant
    final uri = Uri.parse('https://app.bienbon.mu/explore/basket/bsk_test_456');

    final router = /* obtenir le router */;
    DeepLinkHandler(router).handleUniversalLink(uri);
    await $.pumpAndSettle();

    expect($.native.getNativeViews(), contains('BasketDetailScreen'));
  });
}
```

### 9.5 Test du deep link handler -- validation de securite

```dart
// test/core/navigation/deep_link_handler_test.dart

void main() {
  late GoRouter mockRouter;
  late DeepLinkHandler handler;
  late List<String> navigatedRoutes;

  setUp(() {
    navigatedRoutes = [];
    mockRouter = GoRouter(
      initialLocation: '/',
      routes: [
        GoRoute(path: '/', builder: (_, __) => const Placeholder()),
      ],
    );
    // Override go() pour capturer les navigations
    handler = DeepLinkHandler(mockRouter);
  });

  group('Route validation', () {
    test('accepts valid consumer routes', () {
      expect(handler._isValidRoute('/explore'), isTrue);
      expect(handler._isValidRoute('/explore/basket/bsk_abc'), isTrue);
      expect(handler._isValidRoute('/orders/rsv_abc'), isTrue);
      expect(handler._isValidRoute('/orders/rsv_abc/pickup'), isTrue);
      expect(handler._isValidRoute('/profile/referral'), isTrue);
    });

    test('rejects malicious routes', () {
      expect(handler._isValidRoute('/admin/delete-all'), isFalse);
      expect(handler._isValidRoute('/../../../etc/passwd'), isFalse);
      expect(handler._isValidRoute('/explore?redirect=https://evil.com'), isFalse);
      expect(handler._isValidRoute('javascript:alert(1)'), isFalse);
      expect(handler._isValidRoute(''), isFalse);
    });

    test('accepts valid partner routes', () {
      expect(handler._isValidRoute('/dashboard'), isTrue);
      expect(handler._isValidRoute('/baskets/create'), isTrue);
      expect(handler._isValidRoute('/scanner/result/QR_CODE_123'), isTrue);
      expect(handler._isValidRoute('/settings/payout/history'), isTrue);
    });
  });
}
```

### 9.6 Metriques de couverture

| Zone | Couverture cible | Justification |
|------|:----------------:|---------------|
| Guards (logique pure) | 95%+ | Securite. Un guard non teste = faille d'autorisation. |
| Deep link handler | 90%+ | Securite + UX. Un deep link malicieux ne doit jamais passer. |
| Router configuration | 80%+ | Chaque route doit etre testee (smoke test : navigation OK). |
| Transitions | 50%+ | Smoke tests visuels. La logique est dans Flutter, pas dans notre code. |
| Navigation offline | 85%+ | UX critique. Chaque ecran doit etre teste en mode offline. |
| Integration deep links | Paths critiques | FCM -> order detail, Universal Link -> basket detail. |

---

## 10. Plan d'implementation

### Phase 1 -- Infrastructure de navigation (Sprint 1)

| Tache | Package | Priorite |
|-------|---------|----------|
| Installer `go_router` dans le monorepo (core + apps) | core | P0 |
| Creer `route_paths.dart` (constantes de routes) | core | P0 |
| Creer `guards.dart` (auth + onboarding guards) | core | P0 |
| Creer `guard_providers.dart` (onboardingCompleteProvider) | core | P0 |
| Creer `transitions.dart` (SlideTransitionPage, etc.) | core | P0 |
| Creer `consumer_router.dart` (config GoRouter consumer) | consumer_features | P0 |
| Creer `consumer_shell.dart` (BottomNav consumer) | consumer_features | P0 |
| Creer `partner_router.dart` (config GoRouter partner) | partner_features | P0 |
| Creer `partner_shell.dart` (BottomNav partner) | partner_features | P0 |
| Integrer dans `main.dart` des deux apps | apps | P0 |
| Tests unitaires des guards | core | P0 |

### Phase 2 -- Deep linking (Sprint 2)

| Tache | Package | Priorite |
|-------|---------|----------|
| Creer `deep_link_handler.dart` (validation + routing) | core | P0 |
| Creer `fcm_navigation_setup.dart` (FCM -> deep link) | core | P0 |
| Configurer iOS `Associated Domains` + `apple-app-site-association` | apps/consumer, apps/partner | P0 |
| Configurer Android `intent-filter` + `assetlinks.json` | apps/consumer, apps/partner | P0 |
| Configurer schema URI `bienbon://` | apps | P1 |
| Configurer callback OAuth `bienbon://auth/callback` | apps | P0 |
| Tests unitaires deep link handler | core | P0 |
| Tests d'integration deep links (Patrol) | apps | P1 |

### Phase 3 -- Guards avances et offline (Sprint 3)

| Tache | Package | Priorite |
|-------|---------|----------|
| Role guard (consumer vs partner) | core | P0 |
| Store setup guard (partner) | core | P0 |
| `storeSetupCompleteProvider` (verification Drift) | core | P0 |
| `OfflineBanner`, `OfflineBlockedScreen` | core | P1 |
| Pattern offline par ecran (Tier 1, 2, 3) | consumer_features, partner_features | P1 |
| Hero animations (BasketCard -> BasketDetail) | consumer_features | P2 |
| Tests navigation offline | core, consumer_features | P1 |

---

## 11. Risques et mitigations

| Risque | Impact | Probabilite | Mitigation |
|--------|--------|-------------|------------|
| Breaking changes GoRouter (historique de breaking changes v5-v14) | Eleve | Moyen | Fixer la version dans `pubspec.yaml` (ex: `go_router: ^14.0.0`). Suivre les changelogs. Tester les upgrades dans une branche dediee. |
| StatefulShellRoute complexe (bugs d'etat par onglet) | Moyen | Moyen | Tests de navigation exhaustifs par onglet. Monitorer les issues GoRouter liees a StatefulShellRoute. |
| Deep links malicieux (injection de routes) | Eleve | Faible | Whitelist regex dans `DeepLinkHandler._isValidRoute()`. Pas de `context.go(untrustedInput)` sans validation. |
| GoRouter reconstruit trop souvent (flickering) | Moyen | Moyen | Utiliser `ref.select()` dans le provider du router pour ne reconstruire que quand le state pertinent change. Memoiser le GoRouter si possible. |
| Hero animations ne fonctionnent pas entre onglets | Faible | Certain | Documenter la limitation. Les hero transitions ne sont prevues qu'intra-onglet (explore -> basket detail). |
| Conflit deep link consumer vs partner (meme URL pour les deux apps) | Moyen | Moyen | Separer les `applinks` dans `apple-app-site-association` et `assetlinks.json` par app (paths differents par app). Le schema `bienbon://` utilise un prefixe : `bienbon://consumer/...` vs `bienbon://partner/...`. |
| Performance sur devices d'entree de gamme (reconstruction du GoRouter) | Moyen | Faible | Le GoRouter est reconstruit quand le state auth change (rare : login, logout, token refresh). Pas de rebuild sur chaque navigation. |
| FCM deep link arrive avant que le router soit initialise | Moyen | Moyen | `getInitialMessage()` avec un `Future.delayed(500ms)` comme safety net. Tester sur cold start. |

---

## 12. Decision resumee

| Question | Decision | Justification |
|----------|----------|---------------|
| Router | **GoRouter v14+** | Integration Riverpod native, deep linking zero-effort, package officiel Flutter. Score 4.58/5. |
| Type-safety | **Conventions + lint** (pas de `go_router_builder`) | Eviter une 3e couche de codegen. Constantes dans `route_paths.dart` + tests de navigation compensent. |
| Architecture BottomNav | **StatefulShellRoute.indexedStack** | Preservation de l'etat par onglet. Pattern GoRouter recommande. |
| Guards | **Fonctions pures dans `combinedRedirect()`** | Testables unitairement. Evaluees dans l'ordre : auth -> onboarding -> role -> store setup. |
| Deep linking | **FCM `data.route` + Universal/App Links** | Le payload FCM contient un chemin GoRouter. GoRouter le parse nativement. Validation par whitelist regex. |
| Navigation offline | **Responsabilite de l'ecran, pas du router** | Le router ne bloque jamais. L'ecran affiche cache Drift (Tier 1/2) ou ecran bloque (Tier 3). |
| Partage monorepo | **Guards + routes + deep link handler dans `core`** | Config GoRouter et Shell dans les packages features. |
| Transitions | **Slide (push), Modal (checkout), Fade (tabs), Hero (images)** | `CustomTransitionPage` dans `transitions.dart`. |
| Testing | **Unit tests guards (95%+), widget tests router (80%+), integration deep links** | Guards = securite. Deep links = UX critique. |

---

## 13. References

### Packages

- [go_router (pub.dev)](https://pub.dev/packages/go_router)
- [go_router_builder (pub.dev)](https://pub.dev/packages/go_router_builder) -- non recommande pour BienBon, mais reference
- [auto_route (pub.dev)](https://pub.dev/packages/auto_route)
- [firebase_messaging (pub.dev)](https://pub.dev/packages/firebase_messaging)

### Documentation Flutter

- [Flutter Navigation and Routing](https://docs.flutter.dev/ui/navigation)
- [GoRouter official docs](https://pub.dev/documentation/go_router/latest/)
- [Deep linking in Flutter](https://docs.flutter.dev/ui/navigation/deep-linking)
- [StatefulShellRoute guide](https://pub.dev/documentation/go_router/latest/topics/StatefulShellRoute-topic.html)

### ADR BienBon referencees

- ADR-010 : Strategie d'authentification (Supabase Auth, JWT, multi-role)
- ADR-011 : Modele d'autorisation RBAC (roles consumer/partner/admin, permissions contextuelles)
- ADR-012 : Offline-first et cache (Drift/SQLite, tiers de donnees, queue d'actions)
- ADR-014 : Architecture de notifications multi-canal (FCM, deep links, payloads)
- ADR-024 : Domain-Driven Design (bounded contexts, architecture hexagonale)
- ADR-029 : Flutter State Management (Riverpod, providers, monorepo Melos)

### Universal Links / App Links

- [Apple Associated Domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
- [Android App Links](https://developer.android.com/training/app-links)
- [Apple App Site Association validator](https://branch.io/resources/aasa-validator/)
- [Android assetlinks.json generator](https://developers.google.com/digital-asset-links/tools/generator)
