# ADR-035 : Strategie de cache Redis

## Statut : Proposition

**Date** : 2026-02-27
**Auteur** : Equipe architecture BienBon.mu
**Relecteurs** : A definir
**Prerequis** : ADR-001 (stack backend NestJS + Prisma), ADR-008 (double-booking et stock sync), ADR-009 (temps reel SSE + pg_notify), ADR-014 (notifications multicanal / BullMQ), ADR-020 (hebergement infrastructure / Railway Redis)

---

## 1. Contexte

BienBon.mu utilise deja Redis dans son architecture pour une fonction critique : **BullMQ** (queues de jobs asynchrones -- notifications push, emails, capture de paiement, cf. ADR-014). Redis tourne sur Railway, colocalise avec le backend NestJS dans la region Singapour (cf. ADR-020), avec une latence inter-service < 1 ms.

Cependant, Redis est bien plus qu'un broker de messages. C'est un store de donnees en memoire qui excelle comme **cache server-side**, et BienBon a plusieurs cas d'usage ou le caching ameliorerait significativement les performances et reduirait la charge sur la base PostgreSQL (Supabase).

### 1.1 Pourquoi un cache server-side est necessaire

L'architecture actuelle sans cache :

```
App Flutter -> API NestJS -> Supabase PostgreSQL (Singapour)
```

Chaque requete API interroge directement PostgreSQL. Pour un marche de 1 000+ utilisateurs actifs :

- **L'ecran d'accueil** consommateur affiche les paniers disponibles par proximite. Si 500 utilisateurs ouvrent l'app en meme temps (rush du midi), ca fait 500 requetes PostGIS identiques en quelques secondes.
- **La page boutique** est consultee par de nombreux utilisateurs. Les infos boutique (nom, adresse, horaires, note) changent rarement mais sont requetees a chaque visite.
- **La recherche** par categorie/filtre genere des requetes complexes (jointures, tri, pagination) qui sollicitent la base.
- **Le stock** des paniers est la donnee la plus critique et la plus volatile. Il change a chaque reservation, et doit etre fiable en temps reel (cf. ADR-008).

Sans cache, la base PostgreSQL porte toute la charge de lecture. Avec le plan Supabase Pro (25 USD/mois), les ressources sont limitees. Un cache Redis bien configure peut **reduire de 60-80% les lectures sur PostgreSQL**.

### 1.2 Redis est deja la

Le fait que Redis soit deja deploye pour BullMQ (ADR-014, ADR-020) est un avantage decisif. Il n'y a **aucun cout d'infrastructure supplementaire** pour ajouter du caching : on utilise la meme instance Redis Railway. La seule question est : **comment organiser le cache et quels patterns utiliser ?**

---

## 2. Cas d'usage du cache Redis

### 2.1 Classification des donnees par temperature

| Categorie | Exemples | Frequence de lecture | Frequence de mutation | TTL recommande | Temperature |
|-----------|----------|---------------------|----------------------|----------------|-------------|
| **Stock paniers** | `basket:{id}:stock`, paniers disponibles par zone | Tres elevee (chaque ouverture d'app) | Elevee (chaque reservation) | **30 secondes** | Hot |
| **Infos boutique** | Nom, adresse, horaires, note, photo | Elevee | Faible (changement manuel par partenaire) | **5 minutes** | Warm |
| **Resultats de recherche** | Paniers par categorie, par distance, par filtre | Elevee | Moyenne (stock change, nouveaux paniers) | **1 minute** | Warm |
| **Holds de stock** | Reservation temporaire pendant le checkout (cf. ADR-008) | Moyenne | Elevee (cree/expire a chaque checkout) | **5 minutes** | Hot |
| **Idempotency keys** | Cles de deduplication pour les webhooks de paiement | Faible | Faible (1 ecriture par transaction) | **24 heures** | Cold |
| **Rate limiting** | Compteurs de requetes par IP/user | Tres elevee | Tres elevee (chaque requete) | **Sliding window 1-15 min** | Hot |

### 2.2 Detail par cas d'usage

#### 2.2.1 Cache des paniers disponibles (hot data, TTL 30s)

**Probleme** : l'ecran d'accueil de l'app consommateur affiche les paniers disponibles par proximite. C'est la requete la plus frequente de toute l'application. Sans cache, chaque ouverture d'app = 1 requete PostGIS complexe.

**Solution** :

```typescript
// Cle de cache : geohash du centre de la zone + rayon + filtres
// Le geohash est tronque a 5 caracteres (~5km de precision) pour grouper les requetes proches
const cacheKey = `baskets:available:${geohash5}:${radiusKm}:${categoryFilter}`;

// TTL 30 secondes : le stock change souvent (reservations),
// mais une imprecision de 30s est acceptable pour l'affichage de la liste.
// Le stock exact est verifie au moment de la reservation (ADR-008).
await redis.setex(cacheKey, 30, JSON.stringify(baskets));
```

**Pourquoi 30 secondes ?** Le stock des paniers change a chaque reservation, mais l'ecran d'accueil n'a pas besoin d'etre a la seconde pres. Un panier qui affiche "3 disponibles" alors qu'il n'en reste que 2 est acceptable : la verification exacte se fait au moment du checkout (cf. ADR-008, hold de stock via `SELECT ... FOR UPDATE`). Un TTL trop long (5 min) risquerait d'afficher des paniers epuises. Un TTL trop court (5s) ne cacherait presque rien.

#### 2.2.2 Cache des infos boutique (warm data, TTL 5 min)

**Probleme** : la page boutique affiche le nom, l'adresse, les horaires, la note moyenne, la photo, et la description. Ces donnees changent rarement (le partenaire met a jour son profil quelques fois par mois) mais sont lues des centaines de fois par jour.

**Solution** :

```typescript
const cacheKey = `store:${storeId}:info`;

// TTL 5 minutes : les infos boutique changent rarement.
// Invalidation proactive si le partenaire modifie son profil (cf. section 4).
await redis.setex(cacheKey, 300, JSON.stringify(storeInfo));
```

#### 2.2.3 Cache des resultats de recherche/filtrage (TTL 1 min)

**Probleme** : la recherche par mot-cle, categorie, distance, ou filtre (vegan, halal, etc.) genere des requetes complexes avec jointures, tri et pagination. Les memes recherches sont faites par de nombreux utilisateurs.

**Solution** :

```typescript
// Cle : hash des parametres de recherche normalises
const searchParams = { query, category, lat, lng, radius, filters, page };
const cacheKey = `search:${hashParams(searchParams)}`;

// TTL 1 minute : compromis entre fraicheur et performance.
// Les resultats de recherche dependent du stock (qui change souvent).
await redis.setex(cacheKey, 60, JSON.stringify(searchResults));
```

#### 2.2.4 Session store pour les webhooks idempotency keys (TTL 24h)

**Probleme** : les passerelles de paiement (Peach Payments, cf. ADR-005) envoient des webhooks pour notifier le statut des transactions. Un webhook peut etre recu plusieurs fois (retry). L'idempotence garantit qu'une transaction n'est traitee qu'une seule fois.

**Solution** :

```typescript
// Cle : idempotency key fournie par la passerelle
const idempotencyKey = `webhook:idempotency:${webhookId}`;

// Si la cle existe deja, le webhook a deja ete traite -> ignorer
const alreadyProcessed = await redis.get(idempotencyKey);
if (alreadyProcessed) {
  return { status: 200, message: 'Already processed' };
}

// Marquer comme traite, TTL 24h
await redis.setex(idempotencyKey, 86400, 'processed');

// Traiter le webhook...
```

#### 2.2.5 Rate limiting counters (sliding window)

**Probleme** : proteger l'API contre les abus (spam de reservations, scraping, brute force login). NestJS `@nestjs/throttler` supporte Redis comme backend (cf. ADR-022).

**Solution** :

```typescript
// Utiliser le module @nestjs/throttler avec le storage Redis
// Configuration dans app.module.ts :
ThrottlerModule.forRoot({
  throttlers: [
    { name: 'short', ttl: 1000, limit: 5 },     // 5 req/sec par IP
    { name: 'medium', ttl: 60000, limit: 60 },   // 60 req/min par IP
    { name: 'long', ttl: 3600000, limit: 500 },  // 500 req/h par IP
  ],
  storage: new ThrottlerStorageRedisService(redisClient),
}),
```

Le sliding window Redis est plus precis et plus scalable que le compteur en memoire par defaut de `@nestjs/throttler` (qui ne fonctionne que sur un seul process et perd les compteurs au redemarrage).

#### 2.2.6 Holds de stock temporaires (5 min TTL, cf. ADR-008)

**Probleme** : quand un consommateur commence le checkout, le stock doit etre "tenu" (hold) pendant qu'il complete le paiement. Si le paiement echoue ou expire, le hold doit etre automatiquement libere (cf. ADR-008).

**Solution** :

```typescript
// Hold de stock : cle Redis avec TTL 5 min
const holdKey = `stock:hold:${basketId}:${userId}`;

// Verifier et creer le hold atomiquement
const holdCreated = await redis.set(holdKey, JSON.stringify({
  basketId,
  userId,
  quantity: 1,
  createdAt: Date.now(),
}), 'EX', 300, 'NX');  // NX = ne creer que si la cle n'existe pas

if (!holdCreated) {
  // L'utilisateur a deja un hold en cours sur ce panier
  throw new ConflictException('Hold already exists');
}

// Si Redis expire la cle (5 min), le hold est automatiquement libere.
// Un job BullMQ surveille les expirations via keyspace notifications
// pour remettre le stock a jour en base.
```

**Note** : le hold Redis est une **couche de protection supplementaire** au mecanisme SQL de l'ADR-008 (`SELECT ... FOR UPDATE`). Le hold Redis permet de rejeter rapidement les tentatives concurrentes sans toucher la base, tandis que le lock SQL garantit l'integrite finale.

---

## 3. Patterns de caching

### 3.1 Cache-Aside (Lazy Loading)

**Pattern principal pour la majorite des cas d'usage.**

```
1. L'app demande des donnees a l'API
2. L'API verifie Redis
   -> Cache hit : retourne les donnees depuis Redis (rapide)
   -> Cache miss : interroge PostgreSQL, stocke le resultat dans Redis, retourne
```

```typescript
// Implementation generique NestJS avec decorateur
@Injectable()
export class BasketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getAvailableBaskets(lat: number, lng: number, radiusKm: number) {
    const geohash = computeGeohash(lat, lng, 5);
    const cacheKey = `baskets:available:${geohash}:${radiusKm}`;

    // 1. Verifier le cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. Cache miss -> requete PostgreSQL
    const baskets = await this.prisma.$queryRaw`
      SELECT b.*, ST_Distance(s.location, ST_Point(${lng}, ${lat})::geography) as distance
      FROM baskets b
      JOIN stores s ON b.store_id = s.id
      WHERE b.status = 'available'
        AND b.remaining_quantity > 0
        AND ST_DWithin(s.location, ST_Point(${lng}, ${lat})::geography, ${radiusKm * 1000})
      ORDER BY distance
      LIMIT 50
    `;

    // 3. Stocker dans le cache (TTL 30s)
    await this.redis.setex(cacheKey, 30, JSON.stringify(baskets));

    return baskets;
  }
}
```

**Utilise pour** : paniers disponibles, infos boutique, resultats de recherche, donnees de profil utilisateur.

**Avantages** : simple, les donnees en cache sont toujours celles qui sont effectivement demandees (pas de pre-chargement inutile), le cache se remplit naturellement.

**Inconvenient** : le premier utilisateur apres expiration du TTL a une latence plus elevee (cache miss + write-back).

### 3.2 Write-Through pour le stock

**Pattern complementaire pour les donnees critiques de stock.**

Quand le stock d'un panier change (reservation confirmee, annulation, ajout de paniers par le partenaire), la mise a jour est ecrite **simultanement** dans PostgreSQL et dans Redis.

```typescript
async confirmReservation(basketId: string, userId: string) {
  // 1. Transaction PostgreSQL (source de verite)
  const reservation = await this.prisma.$transaction(async (tx) => {
    const basket = await tx.basket.findUnique({
      where: { id: basketId },
      select: { remainingQuantity: true },
    });

    if (basket.remainingQuantity <= 0) {
      throw new ConflictException('Basket sold out');
    }

    // Decrementer le stock
    await tx.basket.update({
      where: { id: basketId },
      data: { remainingQuantity: { decrement: 1 } },
    });

    // Creer la reservation
    return tx.reservation.create({
      data: { basketId, userId, status: 'confirmed' },
    });
  });

  // 2. Mise a jour immediate du cache Redis (write-through)
  const updatedBasket = await this.prisma.basket.findUnique({
    where: { id: basketId },
  });
  await this.redis.setex(
    `basket:${basketId}:stock`,
    30,
    JSON.stringify({ remainingQuantity: updatedBasket.remainingQuantity }),
  );

  // 3. Invalider les caches de liste qui pourraient contenir ce panier
  // (approche par pattern matching -- voir section 4)
  await this.invalidateBasketListCaches(basketId);

  return reservation;
}
```

**Utilise pour** : stock des paniers uniquement. C'est la donnee la plus sensible a la coherence.

**Avantage** : le cache est toujours a jour pour la donnee de stock individuelle.

**Inconvenient** : complexite supplementaire, double ecriture (PostgreSQL + Redis). Si Redis est temporairement indisponible, la logique doit fonctionner sans cache (fallback gracieux).

---

## 4. Strategie d'invalidation

### 4.1 Principe : TTL-based + event-driven

L'invalidation du cache repose sur deux mecanismes complementaires :

| Mecanisme | Utilisation | Garantie |
|-----------|------------|----------|
| **TTL (Time-To-Live)** | Toutes les cles ont un TTL. Meme sans invalidation explicite, les donnees expirent naturellement. | Coherence eventuelle (delai = TTL) |
| **Invalidation event-driven** | Quand une donnee change en base, un evenement invalide les cles de cache concernees. | Coherence rapide (< 1s) |

### 4.2 Invalidation via pg_notify

PostgreSQL `LISTEN/NOTIFY` (deja utilise pour le temps reel SSE, cf. ADR-009) peut aussi servir a declencher l'invalidation du cache.

```sql
-- Trigger PostgreSQL : quand le stock d'un panier change
CREATE OR REPLACE FUNCTION notify_basket_stock_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('cache_invalidation', json_build_object(
    'entity', 'basket',
    'id', NEW.id,
    'event', 'stock_changed',
    'remaining_quantity', NEW.remaining_quantity
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER basket_stock_change_trigger
AFTER UPDATE OF remaining_quantity ON baskets
FOR EACH ROW
EXECUTE FUNCTION notify_basket_stock_change();
```

```typescript
// Cote NestJS : ecouter les notifications et invalider le cache
@Injectable()
export class CacheInvalidationService implements OnModuleInit {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Ecouter le canal pg_notify
    const client = await this.prisma.$queryRaw`LISTEN cache_invalidation`;

    // Sur chaque notification
    this.prisma.$on('notification', async (notification) => {
      const payload = JSON.parse(notification.payload);

      switch (payload.entity) {
        case 'basket':
          await this.invalidateBasketCaches(payload.id);
          break;
        case 'store':
          await this.invalidateStoreCaches(payload.id);
          break;
      }
    });
  }

  private async invalidateBasketCaches(basketId: string) {
    // 1. Invalider le cache du stock individuel
    await this.redis.del(`basket:${basketId}:stock`);

    // 2. Invalider les caches de liste (par pattern)
    // Note : SCAN est prefere a KEYS pour eviter de bloquer Redis
    const keys = await this.scanKeys('baskets:available:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private async invalidateStoreCaches(storeId: string) {
    await this.redis.del(`store:${storeId}:info`);
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, foundKeys] = await this.redis.scan(
        cursor, 'MATCH', pattern, 'COUNT', 100
      );
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');
    return keys;
  }
}
```

### 4.3 Strategie par entite

| Entite | TTL | Invalidation event-driven | Notes |
|--------|-----|--------------------------|-------|
| Stock panier (individuel) | 30s | Oui (pg_notify sur UPDATE remaining_quantity) | Write-through + invalidation |
| Liste paniers disponibles | 30s | Oui (pg_notify sur INSERT/UPDATE/DELETE baskets) | Invalidation par SCAN pattern |
| Infos boutique | 5 min | Oui (pg_notify sur UPDATE stores) | Invalidation selective par store ID |
| Resultats de recherche | 1 min | Non (TTL seul suffit) | Les recherches sont trop variees pour une invalidation ciblee |
| Holds de stock | 5 min | Expiration automatique Redis | Pas besoin d'invalidation, TTL = duree du hold |
| Idempotency keys | 24h | Non | Pas besoin d'invalidation |
| Rate limiting | Sliding window | Non | Gere par @nestjs/throttler |

---

## 5. Sizing : estimation memoire

### 5.1 Hypotheses

| Phase | Utilisateurs actifs | Paniers/jour | Boutiques | Recherches/jour |
|-------|--------------------|--------------|-----------|--------------------|
| **Lancement** | ~100 | ~50 | ~20 | ~500 |
| **Croissance** | ~1 000 | ~500 | ~100 | ~5 000 |
| **Maturite** | ~10 000 | ~5 000 | ~500 | ~50 000 |

### 5.2 Estimation memoire par type de donnee

| Type de donnee | Taille/cle estimee | Nb cles max (10K users) | Memoire estimee |
|----------------|-------------------|------------------------|-----------------|
| Stock panier (individuel) | ~200 bytes | ~5 000 (paniers actifs) | ~1 MB |
| Liste paniers disponibles | ~5 KB (50 paniers JSON) | ~200 (geohash x radius combos) | ~1 MB |
| Infos boutique | ~1 KB | ~500 (boutiques) | ~0.5 MB |
| Resultats de recherche | ~3 KB | ~1 000 (queries uniques) | ~3 MB |
| Holds de stock | ~200 bytes | ~500 (checkouts simultanes max) | ~0.1 MB |
| Idempotency keys | ~100 bytes | ~5 000 (transactions/jour) | ~0.5 MB |
| Rate limiting | ~50 bytes | ~10 000 (IPs/users) | ~0.5 MB |
| **BullMQ** (deja present) | Variable | Variable | ~5-20 MB |
| **Total estime** | | | **~12-27 MB** |

### 5.3 Conclusion sizing

Meme au scenario 10K utilisateurs, le cache Redis consomme **moins de 30 MB de memoire**. C'est negligeable par rapport a la capacite d'une instance Redis Railway (qui offre au minimum 256 MB).

BullMQ utilise deja Redis pour les queues de jobs. L'ajout du cache ne changera pas materially la consommation. Le risque de saturation memoire est quasi-nul au lancement et tres faible meme en croissance.

---

## 6. Haute disponibilite

### 6.1 Phase de lancement : single instance Redis Railway

**Decision : une seule instance Redis Railway suffit au lancement.**

Justification :
- Le cache Redis est **reconstructible**. Si Redis tombe, l'API NestJS fonctionne normalement (latence plus elevee car toutes les requetes vont en PostgreSQL, mais aucune perte de donnees).
- Les holds de stock ont un fallback en base (ADR-008, `SELECT ... FOR UPDATE`). Redis accelere le processus mais n'est pas requis.
- Les jobs BullMQ en cours de traitement seront perdus si Redis tombe, mais ils sont idempotents et re-enqueuables (cf. ADR-014).
- Les idempotency keys seront perdues, mais le pire cas est un webhook traite deux fois -- l'idempotence de la logique metier (verifier l'etat de la commande en base avant de traiter) couvre ce risque.
- Le SLA Railway Redis est suffisant pour le lancement (~99.5%).

### 6.2 Plan de migration si besoin

| Declencheur | Action |
|-------------|--------|
| Redis Railway tombe plus de 2x en 30 jours | Evaluer Upstash (Redis manage, multi-region, free tier genereux) |
| Besoin de Redis multi-region (ex: expansion regionale) | Migrer vers Upstash Global (replication cross-region) |
| BienBon atteint 50K+ utilisateurs actifs | Evaluer Redis Cluster ou un Redis manage haute dispo (AWS ElastiCache, Upstash Pro) |

### 6.3 Graceful degradation

Le code NestJS doit fonctionner **sans Redis** (mode degrade). Chaque acces Redis est entoure d'un try-catch :

```typescript
async getFromCacheOrDb<T>(
  cacheKey: string,
  ttlSeconds: number,
  dbFetch: () => Promise<T>,
): Promise<T> {
  // 1. Tenter le cache
  try {
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (error) {
    // Redis down -> log warning, continue sans cache
    this.logger.warn(`Redis unavailable for key ${cacheKey}: ${error.message}`);
  }

  // 2. Fetch depuis la DB
  const data = await dbFetch();

  // 3. Tenter de mettre en cache (best-effort)
  try {
    await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(data));
  } catch (error) {
    this.logger.warn(`Redis cache write failed for key ${cacheKey}: ${error.message}`);
  }

  return data;
}
```

---

## 7. Monitoring

### 7.1 Metriques Redis a surveiller

| Metrique | Commande Redis | Seuil d'alerte | Outil |
|----------|---------------|----------------|-------|
| **Memoire utilisee** | `INFO memory` -> `used_memory_human` | > 80% de la memoire disponible | Grafana Cloud |
| **Hit rate** | `INFO stats` -> `keyspace_hits / (keyspace_hits + keyspace_misses)` | < 60% (le cache n'est pas efficace) | Grafana Cloud |
| **Latence** | `INFO commandstats` ou `SLOWLOG GET` | Commandes > 10 ms | Grafana Cloud |
| **Connexions actives** | `INFO clients` -> `connected_clients` | > 50 (fuite de connexions?) | Grafana Cloud |
| **Evictions** | `INFO stats` -> `evicted_keys` | > 0 (memoire insuffisante, Redis evicte des cles) | Grafana Cloud |
| **Keys expirees** | `INFO stats` -> `expired_keys` | Informatif (normal, c'est le TTL qui fonctionne) | Grafana Cloud |

### 7.2 Slow log

```typescript
// Configurer le slow log Redis pour detecter les commandes lentes
// Dans la configuration Redis (ou via CLI) :
// CONFIG SET slowlog-log-slower-than 10000  (10ms en microsecondes)
// CONFIG SET slowlog-max-len 128

// Interroger periodiquement le slow log
const slowLogs = await redis.slowlog('GET', 10);
if (slowLogs.length > 0) {
  logger.warn('Slow Redis commands detected', { slowLogs });
}
```

### 7.3 Dashboard Grafana

Un dashboard Grafana (cf. ADR-020, Grafana Cloud free tier) doit afficher :

1. **Cache hit rate** (graphe temps reel) : ratio hits/misses par type de donnee
2. **Memoire Redis** (gauge) : consommation actuelle vs limite
3. **Latence Redis** (percentiles p50/p95/p99)
4. **Nombre de cles** par prefixe (baskets:*, store:*, search:*, etc.)
5. **Evictions** (compteur) : alerte si > 0

### 7.4 Integration Sentry

Les erreurs Redis (connexion refusee, timeout, erreurs de commande) doivent etre remontees dans Sentry (cf. ADR-020) avec le contexte :

```typescript
try {
  await this.redis.get(cacheKey);
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'redis-cache', operation: 'get' },
    extra: { cacheKey },
  });
  // Graceful degradation : continue sans cache
}
```

---

## 8. Organisation des cles Redis

### 8.1 Convention de nommage

Toutes les cles de cache suivent une convention stricte pour eviter les collisions avec BullMQ :

```
Prefixe     : cache:{entity}:{identifiant}:{sous-donnee}
BullMQ      : bull:{queue_name}:{job_id}    (gere automatiquement par BullMQ)
Rate limit  : throttle:{type}:{identifier}
Hold        : stock:hold:{basketId}:{userId}
Idempotency : webhook:idempotency:{webhookId}
```

**Exemples :**

```
cache:basket:bsk_abc123:stock          -> {"remainingQuantity": 3}
cache:store:str_def456:info            -> {"name": "Boulangerie XYZ", ...}
cache:baskets:available:sc25d:5        -> [{"id": "bsk_abc123", ...}, ...]
cache:search:a1b2c3d4                  -> [{"id": "bsk_abc123", ...}, ...]
stock:hold:bsk_abc123:usr_ghi789       -> {"quantity": 1, "createdAt": ...}
webhook:idempotency:wh_jkl012         -> "processed"
throttle:short:192.168.1.1             -> 3
bull:notifications:job_mno345          -> (gere par BullMQ)
```

### 8.2 Separation logique avec les databases Redis

Redis supporte 16 databases logiques (0-15). On pourrait separer BullMQ (db 0) et le cache (db 1). Cependant, Railway Redis ne permet pas toujours de configurer la database. De plus, la separation par prefixe de cle est suffisante et plus simple a debugger.

**Decision : utiliser la database Redis par defaut (db 0) pour tout, avec des prefixes de cles distincts.**

---

## 9. Couts

### 9.1 Cout du cache Redis

| Phase | Cout Redis supplementaire | Notes |
|-------|--------------------------|-------|
| **Lancement** | **0 USD** | La meme instance Redis Railway (~3-5 USD/mois, cf. ADR-020) est utilisee pour BullMQ et le cache. L'ajout du cache ne change pas le cout (< 30 MB de memoire supplementaire). |
| **Croissance** | **0 USD** | Toujours la meme instance. La consommation Redis Railway reste dans les ~3-5 USD/mois. |
| **Maturite** | **0-5 USD/mois** | Si le cache depasse 100 MB, la facturation Railway a l'usage augmente legerement. |

### 9.2 Economies realisees

Le cache Redis **reduit la charge PostgreSQL**, ce qui retarde le besoin de migrer vers un plan Supabase plus cher :

| Sans cache | Avec cache | Economie |
|-----------|-----------|----------|
| Plan Supabase Pro suffisant jusqu'a ~500 users | Plan Supabase Pro suffisant jusqu'a ~2000 users | Retarde le passage au plan Team (~599 USD/mois) de 6-12 mois |
| PostgreSQL sous charge (requetes PostGIS repetitives) | 60-80% des lectures servies par Redis | Meilleure latence percue par l'utilisateur |

---

## 10. Consequences

### Positives

1. **Performance amelioree** : les requetes les plus frequentes (paniers disponibles, infos boutique) sont servies en < 1 ms depuis Redis au lieu de 10-50 ms depuis PostgreSQL.
2. **Reduction de la charge DB** : 60-80% des lectures sont absorbees par Redis, prolongeant la duree de vie du plan Supabase Pro.
3. **Zero cout supplementaire** : la meme instance Redis Railway est utilisee pour BullMQ et le cache.
4. **Graceful degradation** : si Redis tombe, l'application continue de fonctionner (latence plus elevee, pas de perte de donnees).
5. **Coherence acceptable** : le TTL court (30s pour le stock) + l'invalidation event-driven (pg_notify) garantissent que les donnees cachees sont proches de la realite. La verification exacte du stock se fait au checkout (ADR-008).

### Negatives

1. **Complexite ajoutee** : le code doit gerer la logique cache-aside, l'invalidation, et le fallback. Mitigation : encapsuler dans un service generique `CacheService` avec des methodes reutilisables.
2. **Risque de donnees stale** : pendant le TTL, les donnees cachees peuvent diverger de la base. Mitigation : TTL courts + invalidation event-driven pour les donnees critiques.
3. **Debug plus complexe** : un bug peut venir du cache (donnees stale) ou de la base. Mitigation : logs structures indiquant la source (cache hit / cache miss), outil de debug pour flusher le cache manuellement.

---

## 11. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Donnees stale affichees a l'utilisateur | Moyenne | Faible | TTL courts (30s stock, 1 min search). Invalidation pg_notify. Verification au checkout. |
| Redis tombe | Faible | Moyen | Graceful degradation : l'API fonctionne sans cache. Jobs BullMQ idempotents. |
| Memoire Redis saturee | Tres faible | Moyen | < 30 MB utilises sur 256 MB+ disponibles. Politique d'eviction `allkeys-lru` en dernier recours. |
| Cache stampede (avalanche de cache miss) | Faible | Moyen | TTL avec jitter (+/- 10% aleatoire) pour desynchroniser les expirations. Mutex sur le cache fill si necessaire. |
| Collision de cles entre cache et BullMQ | Tres faible | Faible | Prefixes distincts (`cache:*`, `bull:*`, `stock:hold:*`). |
| Incoherence entre pg_notify et Redis | Faible | Moyen | pg_notify est fiable dans une transaction PostgreSQL. Si le listener NestJS rate une notification (restart), le TTL court garantit la convergence. |

---

## 12. Plan de validation

1. **Benchmark sans cache vs avec cache** (0.5 jour) : mesurer la latence et le throughput de l'endpoint paniers disponibles avec et sans cache Redis. Cible : improvement > 3x.
2. **Test d'invalidation** (0.5 jour) : reserver un panier, verifier que le cache est invalide dans les 2 secondes (pg_notify + Redis del).
3. **Test de graceful degradation** (0.5 jour) : couper Redis, verifier que l'API continue de repondre (latence plus elevee mais pas d'erreur).
4. **Test de memoire** (0.5 jour) : simuler 1 000 utilisateurs avec k6, verifier que la consommation Redis reste < 50 MB.

---

## 13. References

### Redis
- [Redis Caching Best Practices](https://redis.io/docs/latest/develop/use/client-side-caching/) -- Redis Documentation
- [Redis Cache-Aside Pattern](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/cache-aside-lazy-loading.html) -- AWS Whitepapers
- [Redis Key Naming Conventions](https://redis.io/docs/latest/develop/use/keyspace/) -- Redis Documentation

### NestJS
- [NestJS Caching](https://docs.nestjs.com/techniques/caching) -- NestJS Documentation
- [NestJS Throttler with Redis](https://github.com/nestjs/throttler) -- NestJS GitHub
- [NestJS BullMQ Integration](https://docs.nestjs.com/techniques/queues) -- NestJS Documentation

### PostgreSQL
- [PostgreSQL LISTEN/NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html) -- PostgreSQL Documentation

### Patterns
- [Cache Stampede Prevention](https://en.wikipedia.org/wiki/Cache_stampede) -- Wikipedia
- [Write-Through vs Cache-Aside](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html) -- AWS Whitepapers
