# ADR-037 : Feature flags -- releases progressives et experimentation

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-001 (stack backend NestJS), ADR-002 (architecture applicative), ADR-020 (hebergement infrastructure), ADR-025 (pipeline CI/CD), ADR-029 (Flutter state management / Riverpod), ADR-034 (distribution app stores)

---

## 1. Contexte

BienBon.mu est une startup qui va iterer rapidement apres le lancement. L'application evolue sur trois fronts simultanement :

- **Apps Flutter** (consumer + partner) : nouvelles features, ameliorations UX, A/B tests
- **Backend NestJS** : nouveaux endpoints, changements de logique metier, integrations tierces
- **Admin React** : nouveaux ecrans, outils de moderation, dashboards

Sans feature flags, chaque release est du "tout ou rien" : le code deploye est active pour tous les utilisateurs immediatement. C'est risque pour une startup qui :

1. **Deploie frequemment** : plusieurs releases par semaine (cf. ADR-025, CI/CD)
2. **N'a pas de staging realiste** : les bugs apparaissent souvent uniquement en production avec de vrais utilisateurs et de vraies donnees
3. **Veut tester des hypotheses** : activation progressive pour valider une feature avant de l'ouvrir a tous
4. **Doit pouvoir couper une feature en urgence** : si un nouveau mode de paiement provoque des erreurs, il faut pouvoir le desactiver sans deployer un rollback

### 1.1 Qu'est-ce qu'un feature flag

Un feature flag (ou feature toggle) est une condition dans le code qui active ou desactive une fonctionnalite a l'execution, sans deploiement :

```typescript
// Pseudo-code
if (featureFlags.isEnabled('mobile_money_enabled', { userId })) {
  showMobileMoneyPaymentOption();
} else {
  hideMobileMoneyPaymentOption();
}
```

Le flag est evalue en temps reel. Il peut etre active pour tous, desactive pour tous, ou cible sur un sous-ensemble d'utilisateurs (pourcentage, role, ville, device, etc.).

### 1.2 Lien avec l'analytics

Les feature flags sont etroitement lies a l'analytics : on deploie une feature a 10% des utilisateurs, on mesure l'impact (taux de conversion, crashs, feedback), et on decide d'etendre ou de retirer. **PostHog**, s'il est retenu pour l'analytics, offre des feature flags integres -- ce qui evite de gerer deux outils distincts.

---

## 2. Choix de la solution

### 2.1 Options evaluees

#### Option A : PostHog Feature Flags (solution integree analytics + flags)

**Description** : PostHog est une plateforme all-in-one (analytics, session recording, feature flags, A/B testing, surveys). Les feature flags sont nativement integres a l'analytics : quand un flag est evalue, PostHog track automatiquement l'evenement `$feature_flag_called` avec le resultat.

**Avantages** :
- **Un seul outil** pour analytics + feature flags + A/B testing. Zero integration supplementaire.
- **Targeting puissant** : par propriete utilisateur (role, ville, device, plan), par pourcentage, par cohorte, par regex sur des proprietes.
- **SDKs** : Flutter (package `posthog_flutter`), Node.js (`posthog-node`), JavaScript/React (`posthog-js`). Couvre les 3 plateformes BienBon.
- **Feature flag + analytics** : mesurer automatiquement l'impact d'un flag sur les metriques (conversion, retention, etc.) sans code supplementaire.
- **Local evaluation** : le SDK Flutter peut evaluer les flags localement (cache), sans appel reseau a chaque evaluation. Essentiel pour la performance mobile.
- **UI pour non-devs** : interface web pour creer, modifier, activer/desactiver les flags sans toucher au code ou au CI.
- **Gratuit** : jusqu'a 1M events/mois (flags + analytics combines). Largement suffisant pour le lancement.
- **Self-hostable** : si necessaire pour des raisons de conformite (DPA 2017, cf. ADR-021), PostHog peut etre self-hoste (Docker).

**Inconvenients** :
- **Dependance a un tiers** : si PostHog Cloud tombe, les flags ne sont plus evaluables... sauf si le cache local est utilise (mitigation).
- **Vendor lock-in** : changer de solution de feature flags implique de migrer le code de tous les SDKs.
- **Latence initiale** : le premier chargement des flags depuis le cloud ajoute une requete HTTP au demarrage de l'app.

#### Option B : Unleash (self-hosted, open-source)

**Description** : Plateforme de feature flags open-source, self-hostable. Interface web, API, SDKs pour de nombreux langages.

**Avantages** :
- **Open-source** : code source disponible, pas de dependance cloud.
- **Self-hosted** : donnees 100% sous controle (conformite DPA 2017).
- **SDKs** : Flutter (communautaire), Node.js, JavaScript. Couverture correcte.
- **Targeting** : strategies variees (gradual rollout, user IDs, IPs, custom constraints).
- **Mature** : ~10 ans d'existence, utilise par de grandes entreprises (GitLab, etc.).

**Inconvenients** :
- **Infrastructure supplementaire** : un serveur Unleash a deployer et maintenir (Docker sur Railway ou VPS). Cout + complexite ops.
- **Pas d'analytics integre** : les flags sont deconnectes de l'analytics. Il faut instrumenter manuellement le lien entre un flag et une metrique.
- **SDK Flutter communautaire** : pas de SDK Flutter officiel, qualite et maintenance incertaines.
- **Cout** : le plan gratuit self-hosted est limite (5 environments, pas d'audit log). Le plan Pro est a 80 USD/mois.
- **Surdimensionne** : Unleash est concu pour des entreprises avec des dizaines d'equipes. BienBon a 2-5 devs.

#### Option C : Solution maison (table en base + endpoint API)

**Description** : une table `feature_flags` dans PostgreSQL (Supabase) avec les colonnes `name`, `enabled`, `targeting_rules`, et un endpoint API `/flags` que les clients appellent au demarrage.

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INT DEFAULT 0,  -- 0-100
  targeting_rules JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Avantages** :
- **Zero dependance externe** : tout est dans la stack existante (PostgreSQL + NestJS).
- **Zero cout supplementaire** : pas de nouveau service a deployer.
- **Controle total** : on definit exactement les regles de targeting qu'on veut.
- **Simplicite** : pour des flags simples (boolean kill switch), ca prend 1 heure a implementer.

**Inconvenients** :
- **Pas de targeting avance** : implementer le percentage rollout, le targeting par propriete utilisateur, les cohortes, etc., c'est des jours de travail.
- **Pas de local evaluation** : chaque evaluation de flag = un appel API ou une requete DB. Performance degradee.
- **Pas d'UI** : les flags sont geres en base ou via un endpoint API. Pas d'interface graphique pour les non-devs.
- **Pas d'analytics integre** : aucun lien entre les flags et les metriques.
- **Reinventer la roue** : les edge cases (cache, coherence, rollback, audit log) sont tous a implementer.
- **Dette technique** : le code maison de feature flags devient un sous-produit a maintenir en plus du produit principal.

### 2.2 Decision

**Retenue : Option A -- PostHog Feature Flags**

### 2.3 Justification

1. **Integration analytics + flags** : le principal avantage de PostHog est l'unification. Quand on active un flag a 10%, on peut immediatement mesurer son impact sur les metriques (conversion, retention, crashs) dans le meme outil, sans integration supplementaire. Pour une startup qui itere vite, c'est un accelerateur de decision.

2. **SDKs pour les 3 plateformes** : `posthog_flutter` (consumer + partner), `posthog-node` (backend NestJS), `posthog-js` (admin React). Un seul fournisseur, une seule API, un seul dashboard.

3. **Gratuit jusqu'a 1M events/mois** : le free tier PostHog inclut les feature flags. Pour le lancement de BienBon (< 1 000 utilisateurs), c'est largement suffisant. Meme en croissance (10K users), les events resteront sous le seuil gratuit.

4. **Local evaluation (cache)** : le SDK Flutter telecharge les flags au demarrage et les evalue localement. Pas d'appel reseau a chaque `isEnabled()`. Compatible avec l'approche offline-first (ADR-012).

5. **Pas d'infra supplementaire** : contrairement a Unleash, PostHog Cloud ne necessite aucun serveur a deployer. Zero DevOps supplementaire (coherent avec ADR-020).

6. **Solution maison ecartee** : le temps de dev pour implementer une solution de feature flags robuste (targeting, percentage rollout, cache, UI, analytics) est de plusieurs semaines. PostHog l'offre gratuitement et en mieux.

### 2.4 Plan de fallback

- Si PostHog change ses tarifs ou degradé son service : migration vers **Unleash self-hosted** (Docker sur Railway) ou **GrowthBook** (open-source, orienté A/B testing).
- Si le volume d'events depasse 1M/mois (tres improbable au lancement) : passer au plan Growth PostHog (tarification a l'usage).
- En mode degrade (PostHog Cloud down) : les SDKs utilisent le cache local des flags. Les flags ne changent plus tant que PostHog est down, mais les valeurs cachees restent actives.

---

## 3. Types de flags

### 3.1 Classification

| Type | Description | Exemple BienBon | Duree de vie |
|------|------------|-----------------|-------------|
| **Boolean (kill switch)** | Actif ou inactif pour tous. Permet de couper une feature en urgence. | `mobile_money_enabled` : couper le paiement mobile money si le provider a un incident | Permanent (supprime quand la feature est stable) |
| **Percentage rollout** | Active pour un pourcentage d'utilisateurs (random, sticky par user ID). | `new_onboarding_flow` : activer le nouveau parcours d'inscription pour 10% des nouveaux utilisateurs | Temporaire (quelques semaines a quelques mois) |
| **User targeting** | Active pour des utilisateurs specifiques, par propriete (role, ville, device, etc.). | `partner_self_registration` : activer l'auto-inscription partenaire uniquement pour les commercants de Port-Louis | Temporaire |
| **Multi-variant** | Plusieurs variantes (A/B/C testing). | `checkout_layout` : variante A (layout actuel) vs variante B (nouveau layout) | Temporaire (le temps de l'experimentation) |

### 3.2 Proprietes de targeting disponibles

PostHog permet de cibler les flags sur n'importe quelle propriete utilisateur envoyee via les SDKs. Pour BienBon :

| Propriete | Type | Source | Exemple de targeting |
|-----------|------|--------|---------------------|
| `role` | string | Supabase Auth / JWT | `role == 'partner'` |
| `city` | string | Profil utilisateur | `city == 'Port-Louis'` |
| `device_os` | string | SDK auto-detect | `device_os == 'ios'` |
| `app_version` | string | SDK auto-detect | `app_version >= '1.3.0'` |
| `registration_date` | datetime | Profil utilisateur | `registration_date > '2026-06-01'` (nouveaux users uniquement) |
| `is_beta_tester` | boolean | Profil utilisateur | `is_beta_tester == true` |
| `store_category` | string | Profil partenaire | `store_category == 'bakery'` |
| `email` | string | Profil utilisateur | `email contains '@bienbon.mu'` (equipe interne) |

---

## 4. Integration Flutter (apps consumer et partner)

### 4.1 Setup du SDK PostHog Flutter

```yaml
# pubspec.yaml (package partage bienbon_core)
dependencies:
  posthog_flutter: ^4.0.0
```

```dart
// packages/bienbon_core/lib/src/analytics/posthog_client.dart
import 'package:posthog_flutter/posthog_flutter.dart';

class PostHogClient {
  static late Posthog _instance;

  static Future<void> initialize({
    required String apiKey,
    String host = 'https://app.posthog.com',
  }) async {
    _instance = await Posthog.init(
      apiKey: apiKey,
      host: host,
      // Pre-charger les feature flags au demarrage
      preloadFeatureFlags: true,
    );
  }

  static Posthog get instance => _instance;
}
```

### 4.2 Evaluation des flags dans Flutter

```dart
// packages/bienbon_core/lib/src/feature_flags/feature_flags_service.dart

class FeatureFlagsService {
  final Posthog _posthog;

  FeatureFlagsService(this._posthog);

  /// Evaluer un flag boolean
  bool isEnabled(String flagKey) {
    return _posthog.isFeatureEnabled(flagKey) ?? false;
  }

  /// Evaluer un flag multi-variant
  String? getVariant(String flagKey) {
    return _posthog.getFeatureFlag(flagKey) as String?;
  }

  /// Recharger les flags depuis le serveur
  Future<void> reload() async {
    await _posthog.reloadFeatureFlags();
  }
}
```

### 4.3 Integration avec Riverpod (ADR-029)

Les feature flags sont exposes via un provider Riverpod pour etre reactifs dans l'UI :

```dart
// packages/bienbon_core/lib/src/feature_flags/feature_flags_provider.dart

/// Provider du service de feature flags
final featureFlagsServiceProvider = Provider<FeatureFlagsService>((ref) {
  return FeatureFlagsService(PostHogClient.instance);
});

/// Provider pour un flag specifique (reactif)
final isFeatureEnabledProvider = Provider.family<bool, String>((ref, flagKey) {
  final service = ref.watch(featureFlagsServiceProvider);
  return service.isEnabled(flagKey);
});

// Utilisation dans un widget :
class PaymentMethodsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isMobileMoneyEnabled = ref.watch(
      isFeatureEnabledProvider('mobile_money_enabled'),
    );

    return Column(
      children: [
        CardPaymentTile(),
        if (isMobileMoneyEnabled) MobileMoneyPaymentTile(),
      ],
    );
  }
}
```

### 4.4 Cache local des flags (offline support)

Le SDK PostHog Flutter cache les flags en memoire apres le premier chargement. Pour un support offline plus robuste (coherent avec ADR-012, Drift), les flags sont aussi persistes dans la base Drift locale :

```dart
// packages/bienbon_core/lib/src/feature_flags/feature_flags_cache.dart

class FeatureFlagsCacheDrift {
  final AppDatabase _db;

  FeatureFlagsCacheDrift(this._db);

  /// Sauvegarder les flags dans Drift
  Future<void> saveFlags(Map<String, dynamic> flags) async {
    await _db.featureFlagsDao.upsertFlags(flags);
  }

  /// Charger les flags depuis Drift (si PostHog est inaccessible)
  Future<Map<String, dynamic>> loadCachedFlags() async {
    return await _db.featureFlagsDao.getAllFlags();
  }
}
```

**Comportement au demarrage de l'app :**

```
1. Charger les flags depuis Drift (cache local)  -> Evaluation immediate possible
2. En parallele, charger les flags depuis PostHog Cloud
   -> Succes : mettre a jour Drift + memoire
   -> Echec (offline) : utiliser les flags Drift (potentiellement stale, mais fonctionnel)
3. Recharger les flags periodiquement (toutes les 5 min si l'app est au foreground)
```

---

## 5. Integration NestJS (backend)

### 5.1 Setup du SDK PostHog Node.js

```typescript
// packages/posthog/posthog.module.ts
import { Module, Global } from '@nestjs/common';
import { PostHog } from 'posthog-node';

@Global()
@Module({
  providers: [
    {
      provide: 'POSTHOG',
      useFactory: () => {
        return new PostHog(process.env.POSTHOG_API_KEY, {
          host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
          // Evaluation locale : telecharge les flags et les evalue sans appel reseau
          personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
        });
      },
    },
  ],
  exports: ['POSTHOG'],
})
export class PostHogModule {}
```

### 5.2 Evaluation des flags cote serveur

```typescript
// packages/feature-flags/feature-flags.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { PostHog } from 'posthog-node';

@Injectable()
export class FeatureFlagsService {
  constructor(@Inject('POSTHOG') private readonly posthog: PostHog) {}

  /**
   * Evaluer un flag pour un utilisateur specifique.
   * L'evaluation se fait localement si le personal API key est configure,
   * sinon via un appel API PostHog.
   */
  async isEnabled(flagKey: string, userId: string, properties?: Record<string, any>): Promise<boolean> {
    const result = await this.posthog.isFeatureEnabled(flagKey, userId, {
      personProperties: properties,
    });
    return result ?? false;
  }

  /**
   * Evaluer un flag multi-variant.
   */
  async getVariant(flagKey: string, userId: string, properties?: Record<string, any>): Promise<string | boolean> {
    return await this.posthog.getFeatureFlag(flagKey, userId, {
      personProperties: properties,
    }) ?? false;
  }
}
```

### 5.3 Utilisation dans les controllers/services

```typescript
// Exemple : activer le paiement mobile money uniquement si le flag est actif
@Injectable()
export class PaymentService {
  constructor(
    private readonly featureFlags: FeatureFlagsService,
    private readonly mobileMoneyGateway: MobileMoneyGateway,
    private readonly cardGateway: CardPaymentGateway,
  ) {}

  async getAvailablePaymentMethods(userId: string): Promise<PaymentMethod[]> {
    const methods: PaymentMethod[] = [
      { type: 'card', label: 'Carte bancaire' },
    ];

    const mobileMoneyEnabled = await this.featureFlags.isEnabled(
      'mobile_money_enabled',
      userId,
    );

    if (mobileMoneyEnabled) {
      methods.push({ type: 'mobile_money', label: 'MCB Juice / my.t money' });
    }

    return methods;
  }
}
```

### 5.4 Guard NestJS pour proteger des endpoints entiers

```typescript
// packages/feature-flags/feature-flag.guard.ts
import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from './feature-flags.service';

export const FEATURE_FLAG_KEY = 'featureFlag';
export const RequireFeatureFlag = (flagKey: string) =>
  SetMetadata(FEATURE_FLAG_KEY, flagKey);

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flagKey = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!flagKey) return true;  // Pas de flag requis

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    return this.featureFlags.isEnabled(flagKey, userId);
  }
}

// Utilisation :
@Controller('partners')
export class PartnerController {
  @Post('register')
  @RequireFeatureFlag('partner_self_registration')
  async selfRegister(@Body() dto: CreatePartnerDto) {
    // Cet endpoint n'est accessible que si le flag est actif
  }
}
```

---

## 6. Integration React admin

### 6.1 Setup du SDK PostHog React

```typescript
// admin/src/providers/posthog.tsx
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

posthog.init(import.meta.env.VITE_POSTHOG_API_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
  loaded: (ph) => {
    // Pre-charger les flags
    ph.reloadFeatureFlags();
  },
});

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
```

### 6.2 Utilisation dans les composants React

```tsx
// admin/src/components/PartnerApprovalDashboard.tsx
import { useFeatureFlagEnabled } from 'posthog-js/react';

export function PartnerApprovalDashboard() {
  const showNewDashboard = useFeatureFlagEnabled('admin_new_approval_dashboard');

  if (showNewDashboard) {
    return <NewApprovalDashboard />;
  }

  return <LegacyApprovalDashboard />;
}
```

Le hook `useFeatureFlagEnabled` est reactif : si le flag change (via PostHog UI), le composant se re-render automatiquement sans rafraichir la page.

---

## 7. Lifecycle d'un feature flag

### 7.1 Etapes du lifecycle

```
Creation -> Test (equipe interne) -> Rollout progressif -> Rollout complet -> Cleanup
```

| Etape | Description | Qui | Ou |
|-------|------------|-----|-----|
| **1. Creation** | Creer le flag dans PostHog UI. Definir le nom, la description, et les regles de targeting. Le flag est desactive par defaut. | Dev | PostHog dashboard |
| **2. Code** | Ajouter les `isEnabled('flag_key')` dans le code (Flutter, NestJS, React). Le code est deploye mais la feature est invisible (flag desactive). | Dev | Code + CI/CD |
| **3. Test interne** | Activer le flag pour l'equipe interne (`email contains '@bienbon.mu'` ou `is_beta_tester == true`). Valider la feature en production avec des donnees reelles. | Dev/QA | PostHog dashboard |
| **4. Rollout 10%** | Activer le flag pour 10% des utilisateurs (percentage rollout, sticky par user ID). Surveiller les metriques (crashs, conversions, feedback). | Product owner | PostHog dashboard |
| **5. Rollout 50%** | Si les metriques sont bonnes, etendre a 50%. | Product owner | PostHog dashboard |
| **6. Rollout 100%** | Activer pour tous. La feature est officiellement lancee. | Product owner | PostHog dashboard |
| **7. Cleanup** | Supprimer le flag dans PostHog. Supprimer les `isEnabled()` dans le code. Le code de la feature reste, le code conditionnel disparait. | Dev | Code + PostHog dashboard |

### 7.2 Importance du cleanup (etape 7)

Les feature flags non nettoyes deviennent de la **dette technique**. Chaque flag laisse dans le code un `if/else` qui complexifie la lecture et les tests. Regles de cleanup :

- **Un flag qui est a 100% depuis plus de 2 semaines doit etre nettoye** (supprimer le flag PostHog + supprimer le code conditionnel).
- **Un flag kill switch permanent** (ex: `mobile_money_enabled`) est une exception : il reste dans le code en tant que mecanisme de securite. Mais il doit etre documente comme "permanent" dans PostHog.
- **Le cleanup est une tache tech** : creer un ticket systematiquement lors du passage a 100%.

### 7.3 Nommage des flags

Convention : `snake_case`, prefixe optionnel par domaine.

```
mobile_money_enabled             # Kill switch paiement
new_onboarding_flow              # Nouveau parcours d'inscription
partner_self_registration        # Auto-inscription partenaire
push_notifications_enabled       # Kill switch push notifications
admin_new_approval_dashboard     # Nouveau dashboard admin
checkout_redesign                # Refonte ecran checkout
search_v2                        # Nouveau moteur de recherche
gamification_badges              # Systeme de badges/gamification
```

---

## 8. Flags critiques au lancement

Les flags suivants doivent etre crees avant le lancement de BienBon :

| Flag | Type | Description | Raison |
|------|------|------------|--------|
| `mobile_money_enabled` | Boolean (kill switch) | Active/desactive le paiement par mobile money (MCB Juice, my.t money, Blink). | Le paiement mobile money depend d'un provider tiers (MIPS/MCB Pay+). Si le provider a un incident, on coupe le flag sans deploiement. Seul le paiement par carte reste disponible. |
| `new_onboarding_flow` | Percentage rollout | Nouveau parcours d'inscription avec tutoriel interactif. | Permet de tester le nouveau parcours sur 10% des nouveaux utilisateurs et mesurer l'impact sur le taux de completion de l'inscription. |
| `partner_self_registration` | User targeting (par ville) | Permet aux commercants de s'inscrire eux-memes (sans invitation admin). | Au lancement, les partenaires sont recrutes manuellement. L'auto-inscription est ouverte progressivement, ville par ville, pour controler la qualite. |
| `push_notifications_enabled` | Boolean (kill switch) | Active/desactive les notifications push (FCM). | Si les notifications sont percues comme du spam ou si FCM a un probleme, on les coupe immediatement. |
| `payment_pre_auth_enabled` | Boolean (kill switch) | Active/desactive la pre-autorisation de paiement (cf. ADR-005). | La pre-auth est un flux complexe. Si des problemes apparaissent (captures echouees, double capture), on peut passer temporairement en paiement direct. |
| `offline_qr_enabled` | Boolean (kill switch) | Active/desactive le mode QR code offline (cf. ADR-012). | Le QR offline est critique mais complexe. Si un bug de synchro est detecte, on force le mode online uniquement le temps de corriger. |

---

## 9. Testing avec les feature flags

### 9.1 Probleme

Chaque feature flag cree potentiellement deux chemins d'execution dans le code. Si on a 6 flags, on a theoriquement 2^6 = 64 combinaisons possibles. Tester toutes les combinaisons est impossible.

### 9.2 Strategie de testing

#### 9.2.1 Tests unitaires : override explicite

```dart
// Flutter : override du flag dans les tests
test('should show mobile money option when flag is enabled', () {
  // Arrange : forcer le flag a true
  final mockFeatureFlags = MockFeatureFlagsService();
  when(mockFeatureFlags.isEnabled('mobile_money_enabled')).thenReturn(true);

  // Act
  final methods = getAvailablePaymentMethods(mockFeatureFlags);

  // Assert
  expect(methods, contains(isA<MobileMoneyMethod>()));
});

test('should hide mobile money option when flag is disabled', () {
  // Arrange : forcer le flag a false
  final mockFeatureFlags = MockFeatureFlagsService();
  when(mockFeatureFlags.isEnabled('mobile_money_enabled')).thenReturn(false);

  // Act
  final methods = getAvailablePaymentMethods(mockFeatureFlags);

  // Assert
  expect(methods, isNot(contains(isA<MobileMoneyMethod>())));
});
```

```typescript
// NestJS : override du flag dans les tests
describe('PaymentService', () => {
  let service: PaymentService;
  let featureFlags: jest.Mocked<FeatureFlagsService>;

  beforeEach(() => {
    featureFlags = {
      isEnabled: jest.fn(),
      getVariant: jest.fn(),
    } as any;

    service = new PaymentService(featureFlags, mockMobileGateway, mockCardGateway);
  });

  it('should include mobile money when flag is enabled', async () => {
    featureFlags.isEnabled.mockResolvedValue(true);
    const methods = await service.getAvailablePaymentMethods('user-123');
    expect(methods).toContainEqual(expect.objectContaining({ type: 'mobile_money' }));
  });

  it('should exclude mobile money when flag is disabled', async () => {
    featureFlags.isEnabled.mockResolvedValue(false);
    const methods = await service.getAvailablePaymentMethods('user-123');
    expect(methods).not.toContainEqual(expect.objectContaining({ type: 'mobile_money' }));
  });
});
```

#### 9.2.2 Tests d'integration : default values

Les tests d'integration (CI/CD, cf. ADR-025) tournent avec **tous les flags a leur valeur par defaut** (generalement `false`). Cela teste le chemin "stable" de l'application.

Des tests d'integration supplementaires peuvent etre ajoutes pour les chemins critiques avec des flags specifiques actives.

#### 9.2.3 Tests E2E : PostHog environment staging

PostHog permet de creer des **projets separes** (staging vs production). Les flags dans le projet staging sont independants de la production. Les tests E2E utilisent le projet staging avec des flags configures specifiquement pour le scenario de test.

### 9.3 Regles de testing

1. **Chaque flag doit etre teste dans les deux etats** (enabled + disabled) pour le code qu'il controle.
2. **Les tests ne doivent pas dependre de PostHog Cloud** : utiliser des mocks/stubs pour les SDKs.
3. **Le CI/CD tourne avec les flags a `false` par defaut** : cela garantit que l'application fonctionne sans aucun flag actif (cas de degradation).
4. **Les flags kill switch sont testes specifiquement** : verifier que couper `mobile_money_enabled` desactive bien le paiement mobile money sans erreur.

---

## 10. Couts

| Element | Cout | Notes |
|---------|------|-------|
| **PostHog Cloud (free tier)** | 0 USD/mois | Jusqu'a 1M events/mois (analytics + feature flags combines). Largement suffisant pour < 10K utilisateurs. |
| **PostHog Cloud (Growth)** | A partir de 0 USD + usage | Si > 1M events : tarification a l'usage. Les feature flags seuls consomment peu d'events (1 event par evaluation, cache local reduit les evaluations). |
| **Developpement integration** | ~2-3 jours de dev | Setup SDKs (Flutter, NestJS, React) + premiers flags + tests. One-time. |
| **Maintenance** | ~0.5 jour/mois | Creer de nouveaux flags, nettoyer les anciens, surveiller le dashboard. |

### 10.1 Comparaison des couts

| Solution | Cout lancement (mois) | Cout 1K users (mois) | Cout 10K users (mois) | DevOps |
|----------|----------------------|---------------------|----------------------|--------|
| **PostHog Feature Flags** | **0 USD** | **0 USD** | **0 USD** | Zero |
| Unleash self-hosted | ~5-10 USD (Railway) | ~5-10 USD | ~10-20 USD | Moyen (Docker, upgrades) |
| Unleash Pro (cloud) | 80 USD | 80 USD | 80 USD | Zero |
| Solution maison | 0 USD | 0 USD | 0 USD | Eleve (dev + maintenance) |
| LaunchDarkly | 10 USD (Starter) | 10 USD | 20 USD+ | Zero |

---

## 11. Consequences

### Positives

1. **Releases sans risque** : chaque nouvelle feature est deployee derriere un flag. Si un probleme apparait, le flag est coupe en 10 secondes depuis le dashboard PostHog -- pas de rollback, pas de re-deploiement.
2. **Experimentation data-driven** : le rollout progressif (10% -> 50% -> 100%) + l'analytics PostHog integre permettent de mesurer l'impact reel de chaque feature avant de l'ouvrir a tous.
3. **Kill switches** : les features dependant de tiers (paiement mobile money, push FCM) peuvent etre coupees instantanement en cas d'incident du provider.
4. **Zero cout** : PostHog free tier couvre largement les besoins de BienBon au lancement et en croissance.
5. **Offline-compatible** : le cache local des flags (SDK + Drift) garantit que les flags fonctionnent meme sans connexion (coherent avec ADR-012).

### Negatives

1. **Complexite du code** : chaque flag ajoute une branche conditionnelle dans le code. Sans discipline de cleanup, la dette technique s'accumule. Mitigation : convention stricte de cleanup (2 semaines apres rollout 100%).
2. **Dependance PostHog** : si PostHog Cloud est down, les nouveaux flags ne sont pas charges. Mitigation : cache local (SDK + Drift), graceful degradation avec les valeurs par defaut.
3. **Combinatoire de testing** : chaque flag multiplie les chemins d'execution. Mitigation : tester les deux etats de chaque flag, mais pas toutes les combinaisons. Le CI/CD teste avec les flags a `false`.

---

## 12. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Flag oublie a 10% pendant des mois (feature incomplete pour 90% des users) | Moyenne | Moyen | Dashboard PostHog : alerte si un flag est en rollout partiel > 30 jours. Convention de cleanup. |
| PostHog Cloud down | Faible | Faible | Cache local SDK + Drift. Les flags existants continuent de fonctionner. Seuls les changements de flags sont bloques. |
| Flag mal configure (active pour le mauvais segment) | Faible | Moyen | Tester les flags en staging avant production. Audit log PostHog pour tracer les changements. |
| Accumulation de flags morts (dette technique) | Moyenne | Moyen | Convention : cleanup obligatoire 2 semaines apres rollout 100%. Revue mensuelle des flags actifs. |
| PostHog change ses tarifs | Faible | Faible | Le free tier est genereux (1M events). Si augmentation : migration vers Unleash self-hosted ou GrowthBook. |
| Incoherence de flag entre Flutter et NestJS | Faible | Moyen | Le meme flag est evalue par le meme SDK PostHog (meme source de verite). Les proprietes utilisateur sont synchronisees. |

---

## 13. Plan de validation

1. **Creer le projet PostHog** (0.5 jour) : creer un projet PostHog Cloud, obtenir les API keys, configurer les environments (staging + production).
2. **Integrer le SDK Flutter** (0.5 jour) : ajouter `posthog_flutter` dans le package partage, configurer l'initialisation, creer le `FeatureFlagsService` et le provider Riverpod.
3. **Integrer le SDK NestJS** (0.5 jour) : ajouter `posthog-node`, creer le `FeatureFlagsModule`, le `FeatureFlagsService`, et le `FeatureFlagGuard`.
4. **Integrer le SDK React admin** (0.5 jour) : ajouter `posthog-js`, configurer le `PostHogProvider`, tester le hook `useFeatureFlagEnabled`.
5. **Creer le premier flag** (0.5 jour) : creer `mobile_money_enabled` dans PostHog, l'integrer dans le code Flutter + NestJS, tester l'activation/desactivation en temps reel.
6. **Tester le cache offline** (0.5 jour) : verifier que les flags sont persistes dans Drift, couper le reseau, verifier que les flags caches sont utilises.

---

## 14. References

### PostHog
- [PostHog Feature Flags](https://posthog.com/docs/feature-flags) -- PostHog Documentation
- [PostHog Flutter SDK](https://posthog.com/docs/libraries/flutter) -- PostHog Documentation
- [PostHog Node.js SDK](https://posthog.com/docs/libraries/node) -- PostHog Documentation
- [PostHog React SDK](https://posthog.com/docs/libraries/react) -- PostHog Documentation
- [PostHog Pricing](https://posthog.com/pricing) -- PostHog
- [PostHog Local Evaluation](https://posthog.com/docs/feature-flags/local-evaluation) -- PostHog Documentation

### Alternatives
- [Unleash Feature Flags](https://www.getunleash.io/) -- Unleash
- [GrowthBook](https://www.growthbook.io/) -- GrowthBook
- [LaunchDarkly](https://launchdarkly.com/) -- LaunchDarkly

### Patterns
- [Feature Toggles (Martin Fowler)](https://martinfowler.com/articles/feature-toggles.html) -- Martin Fowler
- [Feature Flag Best Practices](https://posthog.com/blog/feature-flag-best-practices) -- PostHog Blog
