# ADR-009 : Strategie temps reel consolidee

| Champ         | Valeur                                                      |
|---------------|-------------------------------------------------------------|
| **Statut**    | Propose                                                     |
| **Date**      | 2026-02-27                                                  |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                         |
| **Decideurs** | Equipe technique BienBon                                    |
| **Scope**     | Transport temps reel (SSE, FCM, polling), architecture SSE, authentification, reconnexion, scalabilite |
| **Refs**      | ADR-001, ADR-008, ADR-014, ADR-017, ADR-020                |

---

## 1. Contexte

Les ADR precedentes ont pris des decisions temps reel de maniere incrementale :

- **ADR-008** a choisi SSE + `pg_notify` pour la synchronisation du stock des paniers, avec migration vers Redis Pub/Sub en Phase 2.
- **ADR-014** a decide que les notifications in-app transitent par le meme canal SSE que le stock, avec FCM pour les push hors-app.
- **ADR-017** a etabli que les transitions de state machine emettent des events via `NestJS EventEmitter`, qui alimentent ensuite BullMQ (notifications, schedulers, anti-fraude).
- **ADR-001** avait initialement envisage Supabase Realtime comme transport, avant que ADR-008 ne pivote vers SSE via NestJS.

Il manque une **vision consolidee** qui reponde a ces questions :

1. Pour chaque besoin temps reel, quel transport utiliser et pourquoi ?
2. Faut-il un seul endpoint SSE multiplexe ou un endpoint par type de donnees ?
3. Comment authentifier les connexions SSE ?
4. Comment gerer la reconnexion cote Flutter ?
5. Combien de connexions SSE un serveur NestJS peut-il tenir ?
6. L'admin web a-t-il besoin de SSE ou un simple polling suffit-il ?
7. Pourquoi ne pas utiliser Supabase Realtime directement ?

Cette ADR consolide les reponses et pose une architecture unifiee.

---

## 2. Cartographie des besoins temps reel

### 2.1 Consumer app (Flutter)

| # | Besoin | Declencheur | Transport | Justification |
|---|--------|-------------|-----------|---------------|
| C1 | Stock des paniers (badge "Plus que 2!") | `stock_changed` (pg_notify / Redis Pub/Sub) | **SSE** | Latence < 1s, l'utilisateur est sur la fiche panier. ADR-008 Decision 3. |
| C2 | Favori publie un nouveau panier | Event metier `basket.published` | **FCM push** | L'utilisateur n'est probablement pas dans l'app. ADR-014 #1. |
| C3 | Statut de la reservation (confirmee, prete, annulee) | State machine transition (ADR-017) | **FCM push + SSE in-app** | Push pour atteindre l'utilisateur hors-app. SSE met a jour l'ecran si l'app est ouverte. |
| C4 | Compteur de notifications non-lues | `InAppProcessor` insere en base | **SSE** | Mise a jour du badge cloche en temps reel pendant la session. |
| C5 | Rappel 1h avant le retrait | BullMQ delayed job | **FCM push** | Utilisateur hors-app. Pas de composante SSE. |

### 2.2 Partner app (Flutter)

| # | Besoin | Declencheur | Transport | Justification |
|---|--------|-------------|-----------|---------------|
| P1 | Nouvelle reservation recue | State machine `PENDING -> CONFIRMED` | **FCM push + SSE** | Push pour l'alerte. SSE pour mise a jour live de la liste des reservations. |
| P2 | Stock restant en temps reel | `stock_changed` | **SSE** | Le partenaire voit son propre stock diminuer en live. Meme mecanisme que C1. |
| P3 | Validation pickup (confirmation instantanee) | State machine `CONFIRMED -> PICKED_UP` | **SSE** | L'ecran du partenaire se met a jour instantanement apres scan du QR code. |
| P4 | Annulation par un consommateur | State machine `CONFIRMED -> CANCELLED_CONSUMER` | **FCM push + SSE** | Push si l'app est fermee. SSE met a jour la liste live. |

### 2.3 Admin web (React)

| # | Besoin | Declencheur | Transport | Justification |
|---|--------|-------------|-----------|---------------|
| A1 | KPIs dashboard (< 5s de fraicheur) | Donnees aggregees | **Polling 5s** | Voir section 7. |
| A2 | Nouvelles inscriptions partenaires | Event metier | **Polling 30s** | Peu frequent, latence de 30s acceptable. |
| A3 | Alertes fraude | Event metier `fraud.detected` | **SSE + email** | La seule alerte admin qui justifie du temps reel. |

### 2.4 Synthese par transport

| Transport | Cas d'usage | Direction | Latence cible |
|-----------|-------------|-----------|---------------|
| **SSE** | Stock, reservations live, compteur non-lus, pickup, alertes fraude | Serveur -> Client | < 1 seconde |
| **FCM push** | Favoris, statut reservation, rappels, nouvelles reservations (hors-app) | Serveur -> Appareil | < 5 secondes |
| **Polling** | KPIs dashboard admin, inscriptions partenaires | Client -> Serveur | 5-30 secondes |

---

## 3. Architecture SSE : endpoint unique multiplexe

### 3.1 Decision : un seul endpoint SSE par audience, avec channels

**Choix : un endpoint SSE unique par audience, multiplexant plusieurs channels via un champ `event`.**

```
Consumer :  GET /api/sse/consumer
Partner :   GET /api/sse/partner
Admin :     GET /api/sse/admin
```

Chaque connexion SSE transporte plusieurs types d'events :

```
-- Connexion consumer --

event: stock_update
data: {"basketId": "bsk_abc", "stock": 2, "total": 5}

event: reservation_status
data: {"reservationId": "res_xyz", "status": "READY_FOR_PICKUP"}

event: notification
data: {"id": "ntf_123", "type": "RESERVATION_CONFIRMED", "title": "Panier reserve !"}

event: unread_count
data: {"count": 3}
```

### 3.2 Pourquoi un endpoint unique plutot qu'un endpoint par donnee

L'alternative serait un endpoint par type de donnee : `/api/baskets/:id/stock-stream`, `/api/notifications/stream`, etc. C'est ce que ADR-008 avait esquisse pour le stock seul.

| Critere | Endpoint unique multiplexe | Un endpoint par type |
|---------|---------------------------|---------------------|
| **Connexions par client** | 1 | 2-4 (stock + notifs + reservation + compteur) |
| **Charge serveur** | 1 connexion ouverte par utilisateur actif | 2-4x plus de connexions |
| **Simplicite client** | 1 `EventSource` a gerer | Multiples `EventSource`, chacun avec sa reconnexion |
| **Routing des events** | Filtrage cote serveur (n'envoyer que les events pertinents pour cet utilisateur) | Implicite (chaque endpoint ne sert qu'un type) |
| **HTTP/1.1** | 1 connexion sur la limite de 6 par domaine | 2-4 connexions, potentiel epuisement |
| **Scalabilite** | N connexions pour N utilisateurs actifs | 2-4N connexions |

**Verdict : endpoint unique.** A 1 000 utilisateurs actifs simultanes, c'est 1 000 connexions SSE (multiplexe) vs. 3 000-4 000 connexions (un par type). Le multiplexage reduit la charge serveur et simplifie le code Flutter.

### 3.3 Abonnement dynamique aux channels

Le serveur doit savoir quels events envoyer a quel utilisateur. Deux mecanismes :

1. **Abonnement implicite basé sur l'identite** : le JWT identifie l'utilisateur. Le serveur sait qu'il doit lui envoyer ses notifications in-app et ses changements de reservation.

2. **Abonnement explicite via query params** : pour le stock des paniers, le client indique quels paniers il observe.

```
GET /api/sse/consumer?baskets=bsk_abc,bsk_def
Authorization: Bearer <jwt>
```

Quand l'utilisateur navigue vers une autre fiche panier, le client Flutter ferme la connexion SSE et en ouvre une nouvelle avec les nouveaux `baskets` en query params. Ce n'est pas un probleme : l'ouverture SSE est quasi instantanee (un seul roundtrip HTTP).

**Alternative** : envoyer un message "subscribe" apres la connexion. Mais SSE est unidirectionnel (serveur -> client), donc le client ne peut pas envoyer de message sur la connexion SSE. Il faudrait un endpoint REST separe `POST /api/sse/subscribe` pour modifier les abonnements. C'est plus complexe. La reconnexion avec query params est plus simple et stateless.

---

## 4. Authentification SSE

### 4.1 Le probleme

L'API `EventSource` standard des navigateurs **ne supporte pas les headers custom**. On ne peut pas envoyer `Authorization: Bearer <jwt>` dans un header. Flutter n'utilise pas l'API `EventSource` du navigateur mais un client HTTP natif, donc cette limitation ne s'applique pas directement a Flutter. Cependant, l'admin React (navigateur) sera concerne.

### 4.2 Options evaluees

| Option | Description | Securite | Complexite |
|--------|-------------|----------|------------|
| **A. JWT en query param** | `GET /sse/consumer?token=<jwt>` | Le JWT apparait dans les logs serveur, l'historique du navigateur et potentiellement les proxies. | Tres simple |
| **B. Cookie HttpOnly** | Le JWT est stocke dans un cookie. `EventSource` envoie automatiquement les cookies. | Cookie HttpOnly + Secure + SameSite. Pas d'exposition dans l'URL. | Necessite de gerer les cookies dans la strategie auth (ADR-010 utilise des Bearer tokens). |
| **C. Ticket ephemere** | Le client fait `POST /sse/ticket` (avec Bearer JWT) -> recoit un ticket a usage unique (UUID, TTL 30s). Puis `GET /sse/consumer?ticket=<uuid>`. | Le ticket est a usage unique, expire en 30s, et n'est pas le JWT lui-meme. | Un endpoint supplementaire, une table/cache pour les tickets. |
| **D. Header Authorization (Flutter only)** | Flutter utilise un client HTTP qui supporte les headers. L'admin React utilise un polyfill `EventSource` custom. | Standard Bearer token. | Simple pour Flutter. Necessite un polyfill pour React (`eventsource` npm package ou `fetch` + `ReadableStream`). |

### 4.3 Decision : Option D (Header Authorization) avec polyfill React

**Justification :**

1. **Flutter** : le package `http` ou `dio` permet d'ouvrir une connexion SSE avec des headers custom. Pas de contrainte `EventSource` navigateur.

2. **Admin React** : utiliser `fetch()` avec `ReadableStream` pour lire le stream SSE, ou le package `@microsoft/fetch-event-source` qui supporte les headers custom. Ce package est maintenu et largement utilise.

3. **Pas de JWT dans l'URL** : evite l'exposition du token dans les logs, proxies et historique navigateur.

4. **Coherence avec ADR-010** : la strategie d'authentification est basee sur des Bearer tokens JWT. Pas besoin d'introduire un mecanisme de cookies ou de tickets.

```typescript
// NestJS SSE Controller
@Controller('api/sse')
export class SseController {
  @Get('consumer')
  @UseGuards(JwtAuthGuard)  // Meme guard que les endpoints REST
  async consumerStream(
    @Req() req: Request,
    @Query('baskets') baskets?: string,
  ): Promise<Observable<MessageEvent>> {
    const userId = req.user.id;
    const basketIds = baskets?.split(',') ?? [];
    return this.sseService.createConsumerStream(userId, basketIds);
  }
}
```

```dart
// Flutter SSE client
final request = http.Request('GET', Uri.parse('$apiUrl/sse/consumer?baskets=$basketIds'));
request.headers['Authorization'] = 'Bearer $jwt';
request.headers['Accept'] = 'text/event-stream';

final response = await httpClient.send(request);
response.stream
  .transform(utf8.decoder)
  .transform(const LineSplitter())
  .listen((line) => _parseSseEvent(line));
```

```typescript
// React admin SSE client (fetch-event-source)
import { fetchEventSource } from '@microsoft/fetch-event-source';

fetchEventSource('/api/sse/admin', {
  headers: { 'Authorization': `Bearer ${jwt}` },
  onmessage(event) {
    if (event.event === 'fraud_alert') {
      showFraudAlert(JSON.parse(event.data));
    }
  },
  onclose() { /* reconnexion automatique */ },
});
```

### 4.4 Gestion de l'expiration du JWT pendant une connexion SSE

**Probleme** : le token JWT Supabase expire apres 1 heure (configuration ADR-010 : `JWT_EXPIRY=3600`). Or, une connexion SSE peut rester ouverte pendant toute la session foreground de l'utilisateur (potentiellement plusieurs heures). Si le JWT expire pendant une connexion SSE active, le serveur ne doit pas continuer a envoyer des events a un client dont l'identite n'est plus verifiee.

**Solution : verification periodique du JWT + event SSE d'expiration**

1. **A la connexion** : le JWT est verifie via le `JwtAuthGuard` standard (section 4.3). La connexion SSE est etablie.

2. **Periodiquement (toutes les 15 minutes)** : le serveur verifie la validite du JWT associe a la connexion SSE. Si le token est expire, le serveur envoie un event SSE special `auth:token_expired` et ferme la connexion.

3. **Cote client** : lorsque le client recoit l'event `auth:token_expired`, il rafraichit le JWT via le refresh token Supabase (`supabase.auth.refreshSession()`), puis se reconnecte au endpoint SSE avec le nouveau JWT.

**Event SSE d'expiration :**

```
event: auth:token_expired
data: {"reason": "jwt_expired", "message": "Votre session a expire. Rafraichissement en cours..."}
```

**Implementation serveur :**

```typescript
// src/sse/sse-connection.registry.ts

@Injectable()
export class SseConnectionRegistry {
  private connections = new Map<string, SseConnection>();

  /**
   * Verifie periodiquement les JWT des connexions SSE actives.
   * Appelé par un cron job toutes les 15 minutes.
   */
  @Cron(CronExpression.EVERY_15_MINUTES)
  async checkJwtExpiration(): Promise<void> {
    for (const [connectionId, connection] of this.connections) {
      try {
        // Verifier si le JWT est encore valide
        const decoded = this.jwtService.verify(connection.jwt);
        // Si on arrive ici, le token est valide -- rien a faire
      } catch (error) {
        // Token expire ou invalide : notifier le client et fermer la connexion
        connection.subject.next({
          data: JSON.stringify({
            reason: 'jwt_expired',
            message: 'Votre session a expire. Rafraichissement en cours...',
          }),
          type: 'auth:token_expired',
        } as MessageEvent);

        // Fermer la connexion SSE apres un court delai (laisser le client recevoir l'event)
        setTimeout(() => {
          connection.subject.complete();
          this.connections.delete(connectionId);
        }, 1000);
      }
    }
  }
}
```

**Implementation Flutter :**

```dart
// Gestion de l'event auth:token_expired dans le client SSE
void _handleSseEvent(SseEvent event) {
  if (event.type == 'auth:token_expired') {
    // Rafraichir le JWT via Supabase Auth
    _refreshAndReconnect();
    return;
  }
  // ... traitement normal des events
}

Future<void> _refreshAndReconnect() async {
  try {
    // Rafraichir le JWT via le refresh token
    final response = await supabase.auth.refreshSession();
    final newJwt = response.session?.accessToken;
    if (newJwt != null) {
      // Reconnecter le SSE avec le nouveau JWT
      _sseClient.reconnect(newJwt);
    }
  } catch (e) {
    // Refresh token aussi expire -> rediriger vers login
    _navigateToLogin();
  }
}
```

> **Note** : ce mecanisme est complementaire au heartbeat (section 9.4). Le heartbeat maintient la connexion HTTP ouverte ; la verification JWT s'assure que le client est toujours authentifie.

---

## 5. Reconnexion SSE cote Flutter

### 5.1 Strategie

SSE est base sur HTTP. Les connexions se ferment pour de nombreuses raisons : changement de reseau (Wi-Fi -> 4G), mise en veille de l'appareil, timeout serveur, deploiement du backend (restart).

La reconnexion doit etre **automatique et transparente** pour l'utilisateur.

### 5.2 Implementation Flutter

Flutter n'a pas d'API `EventSource` native avec reconnexion automatique. On implemente une reconnexion manuelle avec backoff exponentiel.

```dart
class SseClient {
  static const _initialDelay = Duration(seconds: 1);
  static const _maxDelay = Duration(seconds: 30);

  String? _lastEventId;
  Duration _retryDelay = _initialDelay;

  Stream<SseEvent> connect(String url, String jwt) async* {
    while (true) {
      try {
        final request = http.Request('GET', Uri.parse(url));
        request.headers['Authorization'] = 'Bearer $jwt';
        request.headers['Accept'] = 'text/event-stream';
        if (_lastEventId != null) {
          request.headers['Last-Event-ID'] = _lastEventId!;
        }

        final response = await _client.send(request);
        _retryDelay = _initialDelay; // reset on success

        await for (final event in _parseStream(response.stream)) {
          if (event.id != null) _lastEventId = event.id;
          yield event;
        }
      } catch (e) {
        // Connexion perdue, attente avant retry
        await Future.delayed(_retryDelay);
        _retryDelay = Duration(
          milliseconds: min(
            _retryDelay.inMilliseconds * 2,
            _maxDelay.inMilliseconds,
          ),
        );
      }
    }
  }
}
```

### 5.3 Last-Event-ID et rattrapage

Le protocole SSE supporte nativement le header `Last-Event-ID`. A la reconnexion, le client envoie l'ID du dernier event recu. Le serveur peut alors renvoyer les events manques.

**Implementation serveur** :

- Chaque event SSE porte un `id` incremental (ou un timestamp).
- Le serveur maintient un **buffer circulaire** des N derniers events (ex: 100 events, ou les events des 5 dernieres minutes) en memoire (ou dans Redis en Phase 2).
- A la reconnexion, si le `Last-Event-ID` est dans le buffer, le serveur rejoue les events manques. Sinon, il envoie un snapshot de l'etat actuel (stock courant, compteur non-lus, statut reservation).

```typescript
// NestJS SSE Service
@Injectable()
export class SseService {
  // Buffer circulaire par channel : Map<channel, Event[]>
  private eventBuffer = new Map<string, SseEvent[]>();
  private readonly BUFFER_SIZE = 100;

  getEventsAfter(channel: string, lastEventId: string): SseEvent[] {
    const events = this.eventBuffer.get(channel) ?? [];
    const idx = events.findIndex(e => e.id === lastEventId);
    if (idx === -1) return []; // trop ancien, le caller enverra un snapshot
    return events.slice(idx + 1);
  }
}
```

### 5.4 Cycle de vie de la connexion SSE dans Flutter

| Etat app Flutter | Connexion SSE | Push FCM |
|------------------|---------------|----------|
| **Foreground** (ecran actif) | Ouverte, recoit les events live | Actif (mais SSE prioritaire pour l'affichage) |
| **Background** (app en memoire, ecran eteint) | **Fermee** (economie batterie) | Actif, seul canal de livraison |
| **Killed** (app non lancee) | N/A | Actif |

A la reprise du foreground, Flutter rouvre la connexion SSE avec `Last-Event-ID`. Les events manques pendant le background sont rattrapes soit par le buffer serveur, soit par un appel REST de rafraichissement (ex: `GET /notifications/unread-count`, `GET /baskets/:id`).

### 5.5 Rate limiting des reconnexions SSE

**Probleme** : un client buggue ou malveillant pourrait tenter de se reconnecter en boucle rapide (reconnexion immédiate apres chaque deconnexion), epuisant les ressources serveur (file descriptors, CPU, memoire).

**Mecanisme de protection : exponential backoff strict avec compteur d'echecs**

| Tentative | Delai avant reconnexion | Delai cumule |
|-----------|------------------------|-------------|
| 1 | 5 secondes | 5s |
| 2 | 10 secondes | 15s |
| 3 | 20 secondes | 35s |
| 4 | 40 secondes | 1min 15s |
| 5+ | **60 secondes** (plafond) | +60s par tentative |
| Apres 10 echecs consecutifs | **Abandon** | ~6 minutes |

**Regles :**

1. **Max 1 reconnexion toutes les 5 secondes** par client. Toute tentative de reconnexion plus rapide est rejetee cote serveur avec un HTTP 429 (Too Many Requests) et un header `Retry-After: 5`.

2. **Exponential backoff** : le delai entre les tentatives double a chaque echec, de 5s initial a 60s maximum.

3. **Compteur d'echecs** : apres **10 echecs consecutifs** sans connexion reussie, le client Flutter abandonne la reconnexion SSE et affiche une notification a l'utilisateur ("Connexion temps reel perdue. Les donnees seront rafraichies manuellement."). L'app continue de fonctionner en mode degrade (appels REST a la demande, pas de mise a jour live).

4. **Reset du compteur** : des qu'une connexion SSE est etablie avec succes (premier event ou heartbeat recu), le compteur d'echecs et le delai de backoff sont remis a zero.

**Implementation Flutter :**

```dart
class SseClient {
  static const _initialDelay = Duration(seconds: 5);
  static const _maxDelay = Duration(seconds: 60);
  static const _maxConsecutiveFailures = 10;

  String? _lastEventId;
  Duration _retryDelay = _initialDelay;
  int _consecutiveFailures = 0;

  Stream<SseEvent> connect(String url, String jwt) async* {
    while (_consecutiveFailures < _maxConsecutiveFailures) {
      try {
        final request = http.Request('GET', Uri.parse(url));
        request.headers['Authorization'] = 'Bearer $jwt';
        request.headers['Accept'] = 'text/event-stream';
        if (_lastEventId != null) {
          request.headers['Last-Event-ID'] = _lastEventId!;
        }

        final response = await _client.send(request);
        // Connexion reussie : reset du backoff
        _retryDelay = _initialDelay;
        _consecutiveFailures = 0;

        await for (final event in _parseStream(response.stream)) {
          if (event.id != null) _lastEventId = event.id;
          yield event;
        }
      } catch (e) {
        _consecutiveFailures++;
        if (_consecutiveFailures >= _maxConsecutiveFailures) {
          // Abandon : notifier l'utilisateur
          yield SseEvent.connectionAbandoned(
            'Connexion temps reel perdue apres $_maxConsecutiveFailures tentatives.'
          );
          return;
        }
        // Attente avec exponential backoff (min 5s entre les tentatives)
        await Future.delayed(_retryDelay);
        _retryDelay = Duration(
          milliseconds: min(
            _retryDelay.inMilliseconds * 2,
            _maxDelay.inMilliseconds,
          ),
        );
      }
    }
  }
}
```

**Implementation serveur (rate limiting des reconnexions) :**

```typescript
// src/sse/sse-reconnection.guard.ts

@Injectable()
export class SseReconnectionGuard implements CanActivate {
  // Map userId -> timestamp de la derniere connexion SSE
  private lastConnectionAttempt = new Map<string, number>();
  private static readonly MIN_RECONNECTION_INTERVAL_MS = 5_000; // 5 secondes

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;
    const now = Date.now();
    const lastAttempt = this.lastConnectionAttempt.get(userId) ?? 0;

    if (now - lastAttempt < SseReconnectionGuard.MIN_RECONNECTION_INTERVAL_MS) {
      const retryAfter = Math.ceil(
        (SseReconnectionGuard.MIN_RECONNECTION_INTERVAL_MS - (now - lastAttempt)) / 1000
      );
      const response = context.switchToHttp().getResponse();
      response.setHeader('Retry-After', retryAfter.toString());
      throw new HttpException(
        'Reconnexion trop rapide. Reessayez dans quelques secondes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.lastConnectionAttempt.set(userId, now);
    return true;
  }
}
```

---

## 6. Scalabilite

### 6.1 Capacite d'un serveur NestJS

Une connexion SSE est une connexion HTTP keep-alive. Le serveur maintient un file descriptor et un petit buffer memoire par connexion. Node.js est bien adapte a ce pattern (I/O non-bloquant).

| Metrique | Estimation |
|----------|-----------|
| Memoire par connexion SSE | ~2-5 KB (buffer + headers) |
| File descriptors par connexion | 1 |
| Limite file descriptors Linux (default) | 1024 (configurable a 65536+) |
| Connexions SSE pour 1 GB de RAM | ~50 000 - 200 000 (memoire seule) |
| Limite pratique (CPU, event loop, GC) | **5 000 - 10 000 connexions** par instance Node.js |

Pour BienBon au lancement : **quelques centaines** de connexions SSE simultanées. A 10 000 utilisateurs actifs (Phase 3) : **~1 000-2 000 connexions SSE simultanées** (tous les utilisateurs ne sont pas en foreground en meme temps). **Une seule instance NestJS suffit largement.**

### 6.2 Phases de scalabilite

| Phase | Connexions SSE estimees | Bus d'events | Architecture |
|-------|------------------------|--------------|-------------|
| **Phase 1** (MVP, < 100 users) | < 50 | `pg_notify` (intra-process) | 1 instance NestJS, SSE direct |
| **Phase 2** (< 10 000 users) | < 2 000 | **Redis Pub/Sub** | 1-2 instances NestJS, Redis distribue les events a toutes les instances |
| **Phase 3** (> 10 000 users) | > 5 000 | Redis Pub/Sub + dedicated SSE workers | Instances SSE separees des instances API (pour isoler le I/O long-polling du traitement REST) |

### 6.3 Pourquoi `pg_notify` en Phase 1 puis Redis Pub/Sub en Phase 2

**`pg_notify`** est le canal le plus simple : la DB emet directement un event quand le stock change (via trigger SQL). NestJS ecoute via `LISTEN` sur la connexion PostgreSQL.

**Limitation** : `pg_notify` est **intra-connexion PostgreSQL**. Si on a 2 instances NestJS, chaque instance a sa propre connexion `LISTEN`. Mais `pg_notify` **fonctionne** avec plusieurs listeners -- chaque connexion PostgreSQL qui fait `LISTEN 'stock_changed'` recoit la notification. Le vrai probleme est que `pg_notify` a une **limite de payload de 8 000 octets** et n'offre pas de garantie de livraison en cas de surcharge (les notifications sont droppees si le buffer est plein).

**Redis Pub/Sub** resout ces limites :
- Pas de limite de payload pratique
- Fonctionne comme un bus d'events inter-process natif
- Redis est deja dans la stack (BullMQ)
- Pattern Pub/Sub bien supporte par `ioredis`

**Critere de migration** : passer a Redis Pub/Sub quand on deploie une 2e instance NestJS, ou quand les metriques montrent des events `pg_notify` droppes.

### 6.4 Architecture SSE multi-instance (Phase 2+)

```
                      ┌──────────────────────────┐
                      │     Redis Pub/Sub         │
                      │                           │
                      │  Channel: stock:{id}      │
                      │  Channel: user:{id}       │
                      │  Channel: partner:{id}    │
                      └─────┬─────────────┬───────┘
                            │             │
                   subscribe│             │subscribe
                            │             │
                  ┌─────────▼──┐    ┌─────▼────────┐
                  │ NestJS #1  │    │ NestJS #2    │
                  │            │    │              │
                  │ SSE clients│    │ SSE clients  │
                  │ A, B, C    │    │ D, E, F      │
                  └────────────┘    └──────────────┘
```

Chaque instance NestJS s'abonne aux channels Redis pertinents pour ses clients SSE connectes. Quand un event arrive sur Redis, l'instance le forwarde a ses clients SSE locaux.

---

## 7. Admin dashboard : polling, pas SSE

### 7.1 Decision : polling simple pour l'admin

**Choix : polling HTTP a intervalle regulier pour le dashboard admin, sauf pour les alertes fraude (SSE).**

| Besoin admin | Transport | Intervalle | Justification |
|--------------|-----------|------------|---------------|
| KPIs dashboard | Polling | 5 secondes | Voir ci-dessous |
| Nouvelles inscriptions | Polling | 30 secondes | Evenement peu frequent (quelques par jour) |
| Alertes fraude | SSE (endpoint `/api/sse/admin`) | Temps reel | Seul cas ou la latence est critique cote admin |

### 7.2 Pourquoi pas SSE pour les KPIs

1. **Moins de 5 admins simultanes.** Le gain de bande passante du SSE par rapport au polling est negligeable pour 5 connexions.

2. **Les KPIs sont des aggregats.** `SELECT COUNT(*) FROM reservations WHERE created_at > now() - interval '24h'` n'est pas un event ponctuel, c'est une requete d'aggregation. L'envoyer en SSE impliquerait de re-calculer et pusher toutes les 5 secondes, soit exactement du polling mais cote serveur. Pas de gain reel.

3. **Simplicite.** Un `useQuery` React avec `refetchInterval: 5000` (React Query / TanStack Query) est trivial a implementer, robuste, et ne necessite aucune infrastructure SSE. Pas de gestion de reconnexion, pas de buffer, pas de `Last-Event-ID`.

4. **Le desktop est fiable.** L'admin est sur un navigateur desktop avec une connexion stable. Les contraintes de batterie et de reseau mobile ne s'appliquent pas. Le polling toutes les 5s est parfaitement acceptable.

```typescript
// React admin -- polling KPIs
const { data: kpis } = useQuery({
  queryKey: ['admin', 'kpis'],
  queryFn: () => api.get('/admin/dashboard/kpis'),
  refetchInterval: 5_000,
});
```

### 7.3 Exception : alertes fraude en SSE

Les alertes fraude (pattern suspect detecte par le `FraudHandler` de ADR-017) sont rares mais critiques. Un delai de 30 secondes (prochain cycle de polling) pourrait permettre a un fraudeur de passer plusieurs commandes. Le SSE garantit une alerte en < 1 seconde.

L'endpoint `/api/sse/admin` est donc maintenu, mais uniquement pour les alertes fraude. Les autres donnees admin restent en polling.

---

## 8. Supabase Realtime : pourquoi on ne l'utilise pas

### 8.1 Ce que Supabase Realtime offre

Supabase Realtime est un service WebSocket manage qui broadcast les changements de tables PostgreSQL (via le WAL) aux clients connectes. Il supporte :

- **Postgres Changes** : ecoute les INSERT/UPDATE/DELETE sur une table
- **Broadcast** : messages arbitraires entre clients (via un channel)
- **Presence** : tracking de la presence des utilisateurs connectes

### 8.2 Pourquoi ADR-001 l'avait envisage

ADR-001 avait initialement prevu que Flutter ecoute directement Supabase Realtime pour la synchro de stock. C'etait seduisant : zero code serveur pour le temps reel, le changement de stock en DB est automatiquement broadcast aux clients.

### 8.3 Pourquoi ADR-008 a pivote vers SSE via NestJS

| Raison | Detail |
|--------|--------|
| **Controle du payload** | Supabase Realtime broadcast la row entiere (ou un diff). On ne controle pas finement ce qui est envoye. Pour le stock, on veut envoyer `{stock: 2, total: 5}`, pas toute la row `baskets` (qui contient des champs sensibles ou inutiles pour le client). |
| **Logique metier cote serveur** | Le stock change suite a une reservation atomique (ADR-008). L'event SSE est emis **apres** le commit de la transaction, sous le controle du backend. Avec Supabase Realtime, l'event est emis par le WAL, ce qui melange la couche de persistance et la couche de notification. |
| **Authentification et filtrage** | Supabase Realtime utilise le RLS pour filtrer les events. Mais le RLS est complexe a debugger et a tester (ADR-011). En SSE via NestJS, le filtrage est du code TypeScript testable. |
| **Multiplexage** | On a besoin de multiplexer stock + notifications + reservation status sur un seul canal. Supabase Realtime fonctionne par table, pas par "flux metier". Il faudrait plusieurs subscriptions Supabase cote client. |
| **Dependance a Supabase** | Garder le temps reel dans NestJS reduit le lock-in Supabase (ADR-001, consequence negative #2). Si on migre de Supabase vers un autre PostgreSQL, le SSE NestJS continue de fonctionner. |
| **Latence** | SSE NestJS est intra-process (l'event est emis par le meme process qui a fait le commit). Supabase Realtime ajoute un hop supplementaire : PostgreSQL WAL -> Supabase Realtime service -> WebSocket client. |

### 8.4 Cas ou Supabase Realtime pourrait etre utile a l'avenir

Si un besoin de **presence** (ex: "3 personnes regardent ce panier en ce moment") emerge, Supabase Realtime Presence est un bon candidat car il gere nativement le tracking de connexions. Mais ce besoin n'est pas identifie dans les specs actuelles.

---

## 9. Implementation NestJS

### 9.1 Module SSE

```
src/
  sse/
    sse.module.ts
    sse.controller.ts          # Endpoints SSE (consumer, partner, admin)
    sse.service.ts             # Gestion des connexions, buffer, dispatch
    sse-connection.registry.ts # Map userId -> Observable<MessageEvent>
    channels/
      stock.channel.ts         # Ecoute pg_notify/Redis, dispatch stock_update
      notification.channel.ts  # Ecoute InAppProcessor, dispatch notification + unread_count
      reservation.channel.ts   # Ecoute state machine events, dispatch reservation_status
      fraud.channel.ts         # Ecoute FraudHandler, dispatch fraud_alert (admin)
```

### 9.2 Flow d'un event (exemple : stock_update)

```
Reservation confirmee
    │
    ▼
UPDATE baskets SET stock = stock - 1  (transaction PostgreSQL)
    │
    ▼
pg_notify('stock_changed', '{"basketId":"bsk_abc","stock":2,"total":5}')
    │
    ▼
StockChannel (LISTEN 'stock_changed')
    │
    ▼
SseService.dispatch('stock_update', basketId, payload)
    │
    ▼
SseConnectionRegistry : trouver tous les clients abonnes a ce basketId
    │
    ▼
Observable.next(new MessageEvent('stock_update', { data: JSON.stringify(payload) }))
    │
    ▼
SSE stream -> HTTP response -> Flutter client
```

### 9.3 Flow d'un event (exemple : notification in-app)

```
State machine emits 'reservation.status_changed'
    │
    ▼
NotificationHandler (@OnEvent) enqueue BullMQ job 'inapp'
    │
    ▼
InAppProcessor : INSERT notification en base
    │
    ▼
InAppProcessor : SseService.dispatch('notification', userId, payload)
                 SseService.dispatch('unread_count', userId, { count })
    │
    ▼
Si le user a une connexion SSE ouverte : event pousse en < 100ms
Si pas de connexion : le user verra la notification au prochain refresh (poll REST)
```

### 9.4 Heartbeat et timeout

Pour eviter que des proxies intermediaires (Cloudflare, load balancers) ne ferment les connexions SSE inactives, le serveur envoie un **heartbeat** (commentaire SSE) toutes les 30 secondes.

```
: heartbeat

event: stock_update
data: {"basketId":"bsk_abc","stock":2,"total":5}

: heartbeat
```

Le `:` en debut de ligne est un commentaire SSE, ignore par les clients mais maintient la connexion ouverte. Cloudflare a un timeout de 100 secondes pour les connexions HTTP inactives ; un heartbeat toutes les 30s est largement suffisant.

---

## 10. Metriques et observabilite

| Metrique | Description | Alerte si |
|----------|-------------|-----------|
| `sse.connections.active` | Nombre de connexions SSE ouvertes | > 5 000 (dimensionnement Phase 2) |
| `sse.connections.by_audience` | Repartition consumer / partner / admin | Anomalie si > 80% d'un seul type |
| `sse.events.dispatched` | Nombre d'events SSE envoyes / minute | > 10 000/min (indicateur de charge) |
| `sse.reconnections.count` | Nombre de reconnexions (avec `Last-Event-ID`) / minute | > 100/min (probleme reseau ou serveur instable) |
| `sse.buffer.miss` | Reconnexions ou le `Last-Event-ID` n'est plus dans le buffer | > 10% des reconnexions (augmenter la taille du buffer) |
| `sse.heartbeat.sent` | Heartbeats envoyes / minute | Proportionnel au nombre de connexions |

---

## 11. Recapitulatif des decisions

| # | Decision | Detail | Reference |
|---|----------|--------|-----------|
| D1 | Cartographie des transports | SSE pour le temps reel in-app, FCM pour le hors-app, polling pour l'admin | Section 2 |
| D2 | Endpoint SSE unique multiplexe | 1 endpoint par audience (`/sse/consumer`, `/sse/partner`, `/sse/admin`), events distingues par le champ `event` | Section 3 |
| D3 | Auth SSE via header Authorization | Bearer JWT dans le header, polyfill `@microsoft/fetch-event-source` pour React | Section 4 |
| D4 | Reconnexion Flutter avec backoff + `Last-Event-ID` | Buffer circulaire serveur (100 events), snapshot si buffer depasse | Section 5 |
| D5 | Phase 1 `pg_notify`, Phase 2 Redis Pub/Sub | Migration quand multi-instance ou events droppes | Section 6 (confirmant ADR-008) |
| D6 | Polling pour l'admin dashboard, SSE uniquement pour fraude | `useQuery` avec `refetchInterval` pour les KPIs | Section 7 |
| D7 | Pas de Supabase Realtime | Controle, multiplexage, testabilite, reduction du lock-in | Section 8 |

---

## 12. Consequences

### Positives

1. **Vision unifiee** : chaque besoin temps reel a un transport designe et une justification documentee. Pas de debat au moment de l'implementation.
2. **Connexions minimales** : 1 connexion SSE par utilisateur actif (pas 3-4), grace au multiplexage.
3. **Coherence auth** : le meme mecanisme JWT Bearer protege les endpoints REST et SSE.
4. **Reconnexion transparente** : le `Last-Event-ID` et le buffer circulaire garantissent que l'utilisateur ne rate pas d'events apres une coupure reseau breve.
5. **Simplicite admin** : pas de SSE superflu pour le dashboard. Polling 5s avec TanStack Query est trivial et robuste.

### Negatives

1. **Polyfill React** : le navigateur natif `EventSource` ne supporte pas les headers. Le package `@microsoft/fetch-event-source` ajoute une dependance (~5 KB) pour l'admin.
2. **Buffer memoire** : le buffer circulaire des events SSE consomme de la memoire (negligeable : ~100 events x ~200 octets = ~20 KB par channel).
3. **Complexite du SseService** : le service de dispatch SSE (registry des connexions, filtrage par userId et basketId, buffer, heartbeat) est un composant non trivial. Estime a **2-3 jours** d'implementation et de tests.

---

## 13. Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| Cloudflare coupe les connexions SSE malgre le heartbeat | Faible | Moyen | Tester le timeout Cloudflare en pre-prod. Ajuster l'intervalle de heartbeat si necessaire. Activer le mode "Long-Lived Connections" dans Cloudflare si disponible. |
| `pg_notify` droppe des events sous charge | Faible (Phase 1) | Moyen | Monitoring du nombre d'events `pg_notify` vs events SSE dispatches. Migration vers Redis Pub/Sub si ecart detecte. |
| Le package Flutter SSE a des bugs | Faible | Moyen | L'implementation SSE est manuelle (raw HTTP stream), pas de dependance sur un package tiers. Le code est simple et testable. |
| Railway restart cause une perte de toutes les connexions SSE | Moyenne | Faible | Le client Flutter se reconnecte automatiquement avec backoff. Le `Last-Event-ID` permet de rattraper les events manques. Le deploiement Railway est rapide (< 30s de downtime). |

---

## 14. Relations avec les autres ADR

| ADR | Relation |
|-----|----------|
| **ADR-001** | Remplace la decision d'utiliser Supabase Realtime par SSE via NestJS. |
| **ADR-008** | Confirme SSE + `pg_notify` pour le stock. Cette ADR generalise a tous les flux temps reel et ajoute le multiplexage. |
| **ADR-014** | Confirme SSE pour le transport in-app des notifications. Cette ADR precise l'authentification et la reconnexion. |
| **ADR-017** | Les events de state machine (`reservation.status_changed`, etc.) sont la source des events SSE de reservation et notification. |
| **ADR-020** | L'hebergement Railway (Singapour) avec Cloudflare en reverse proxy impacte la gestion des timeouts SSE (heartbeat). |
