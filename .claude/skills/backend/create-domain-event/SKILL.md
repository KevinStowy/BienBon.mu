---
name: create-domain-event
description: Crée un domain event + listener EventEmitter2
argument-hint: <EventName> in <module-name>
---

# Create Domain Event

Crée un domain event `$ARGUMENTS` et son listener.

## Étape 1 — Créer l'événement

Fichier : `src/modules/<module>/domain/events/<event-name>.event.ts`

```typescript
export class <EventName>Event {
  static readonly EVENT_NAME = '<module>.<event-name>';

  constructor(
    public readonly aggregateId: string,
    public readonly payload: <EventName>Payload,
    public readonly occurredAt: Date = new Date(),
    public readonly correlationId?: string,
  ) {}
}

export interface <EventName>Payload {
  // Données de l'événement (immutables)
}
```

## Étape 2 — Émettre l'événement dans le use case

```typescript
this.eventEmitter.emit(
  <EventName>Event.EVENT_NAME,
  new <EventName>Event(entity.id, { /* payload */ }),
);
```

## Étape 3 — Créer le listener

Fichier : `src/modules/<target-module>/listeners/<event-name>.listener.ts`

```typescript
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class <EventName>Listener {
  private readonly logger = new Logger(<EventName>Listener.name);

  @OnEvent(<EventName>Event.EVENT_NAME)
  async handle(event: <EventName>Event): Promise<void> {
    this.logger.log(`Handling ${<EventName>Event.EVENT_NAME}`, {
      aggregateId: event.aggregateId,
      correlationId: event.correlationId,
    });

    // Logique de réaction à l'événement
  }
}
```

## Étape 4 — Enregistrer le listener dans le module cible

## Conventions

- Nommage : `<Entity><Action>Event` (ex: `ReservationCreatedEvent`, `BasketStockDepletedEvent`)
- Les events sont **immutables** (readonly properties)
- Chaque event a un `correlationId` pour le tracing
- Les listeners sont **idempotents** (re-traitement safe)
- Les listeners ne lancent pas d'exception (log + monitoring)

## Tests

- Tester l'émission de l'événement dans le use case
- Tester le handler du listener isolément
- Tester l'idempotence (envoyer le même event 2x)

## Validation

- [ ] L'event a un EVENT_NAME unique
- [ ] Le payload est typé et immutable
- [ ] Le listener est idempotent
- [ ] Tests passent
