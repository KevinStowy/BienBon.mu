---
name: create-sse-channel
description: Crée un endpoint SSE multiplexé avec pg_notify (ADR-009)
argument-hint: <ChannelName> in <module-name>
---

# Create SSE Channel

Crée un endpoint Server-Sent Events `$ARGUMENTS` avec pg_notify pour le temps réel.

## Étape 1 — Créer le listener pg_notify

Fichier : `src/modules/<module>/services/<channel-name>-notify.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';
import { Client } from 'pg';

@Injectable()
export class <ChannelName>NotifyService implements OnModuleInit, OnModuleDestroy {
  private client: Client;
  private subject = new Subject<<ChannelName>Event>();

  readonly events$ = this.subject.asObservable();

  async onModuleInit() {
    this.client = new Client(process.env.DATABASE_URL);
    await this.client.connect();
    await this.client.query('LISTEN <channel_name>');

    this.client.on('notification', (msg) => {
      if (msg.channel === '<channel_name>' && msg.payload) {
        const data = JSON.parse(msg.payload) as <ChannelName>Event;
        this.subject.next(data);
      }
    });
  }

  async onModuleDestroy() {
    await this.client?.end();
  }
}
```

## Étape 2 — Créer le controller SSE

Fichier : `src/modules/<module>/adapters/inbound/<channel-name>-sse.controller.ts`

```typescript
import { Controller, Sse, UseGuards, Req, MessageEvent } from '@nestjs/common';
import { Observable, filter, map } from 'rxjs';

@Controller('<module>/events')
@UseGuards(JwtAuthGuard)
export class <ChannelName>SseController {
  constructor(private readonly notifyService: <ChannelName>NotifyService) {}

  @Sse('stream')
  @ApiOperation({ summary: 'SSE stream for <channel> events' })
  stream(@Req() req: Request): Observable<MessageEvent> {
    const userId = req.user.id;

    return this.notifyService.events$.pipe(
      // Filtrer par utilisateur (multiplexage)
      filter((event) => event.targetUserId === userId),
      // Formater en SSE MessageEvent
      map((event) => ({
        id: event.id,
        type: event.type,
        data: JSON.stringify(event.payload),
      })),
    );
  }
}
```

## Étape 3 — Émettre depuis PostgreSQL

Trigger SQL ou appel depuis le use case :
```sql
SELECT pg_notify('<channel_name>', json_build_object(
  'id', gen_random_uuid(),
  'type', 'stock_updated',
  'targetUserId', user_id,
  'payload', json_build_object('basketId', basket_id, 'newStock', new_stock)
)::text);
```

Ou depuis NestJS :
```typescript
await this.prisma.$queryRaw`SELECT pg_notify('<channel_name>', ${JSON.stringify(event)})`;
```

## Étape 4 — Gestion de la reconnexion

Le client envoie `Last-Event-ID` dans le header. Stocker les événements récents (Redis ou mémoire) pour le replay.

## Validation

- [ ] Le listener pg_notify se connecte au démarrage
- [ ] Le SSE endpoint est protégé par JwtAuthGuard
- [ ] Les événements sont filtrés par utilisateur
- [ ] Le format MessageEvent est correct (id, type, data)
- [ ] La reconnexion avec Last-Event-ID fonctionne
- [ ] Tests passent
