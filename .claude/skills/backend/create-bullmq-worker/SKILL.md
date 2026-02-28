---
name: create-bullmq-worker
description: Crée un job processor BullMQ avec retry, logging, dead-letter
argument-hint: <WorkerName> in <module-name>
---

# Create BullMQ Worker

Crée un worker BullMQ `$ARGUMENTS` pour le traitement asynchrone de jobs.

## Étape 1 — Définir l'interface du job

Fichier : `src/modules/<module>/jobs/<worker-name>.job.ts`

```typescript
export const <WORKER_NAME>_QUEUE = '<module>:<worker-name>';

export interface <WorkerName>JobData {
  // Payload typé du job
}

export interface <WorkerName>JobResult {
  // Résultat typé
}
```

## Étape 2 — Créer le processor

Fichier : `src/modules/<module>/jobs/<worker-name>.processor.ts`

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor(<WORKER_NAME>_QUEUE)
export class <WorkerName>Processor extends WorkerHost {
  private readonly logger = new Logger(<WorkerName>Processor.name);

  async process(job: Job<<WorkerName>JobData>): Promise<<WorkerName>JobResult> {
    this.logger.log(`Processing job ${job.id}`, { data: job.data });

    try {
      // Logique de traitement
      const result = await this.handle(job.data);

      this.logger.log(`Job ${job.id} completed`, { result });
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.id} failed`, { error: error.message, attempt: job.attemptsMade });
      throw error; // BullMQ gère le retry
    }
  }

  private async handle(data: <WorkerName>JobData): Promise<<WorkerName>JobResult> {
    // Implémentation
  }
}
```

## Étape 3 — Configurer la queue dans le module

```typescript
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: <WORKER_NAME>_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86400 },  // 24h
        removeOnFail: { age: 604800 },     // 7 jours
      },
    }),
  ],
  providers: [<WorkerName>Processor],
})
```

## Étape 4 — Service pour ajouter des jobs

```typescript
@Injectable()
export class <WorkerName>Service {
  constructor(@InjectQueue(<WORKER_NAME>_QUEUE) private queue: Queue) {}

  async enqueue(data: <WorkerName>JobData, opts?: JobsOptions): Promise<Job> {
    return this.queue.add('<worker-name>', data, opts);
  }

  async enqueueDelayed(data: <WorkerName>JobData, delay: number): Promise<Job> {
    return this.queue.add('<worker-name>', data, { delay });
  }
}
```

## Étape 5 — Tests

- Tester le processor avec un job mock
- Tester le retry behavior
- Tester le logging structuré
- Tester l'enqueue service

## Validation

- [ ] Le queue name est unique et namespaced (`<module>:<worker>`)
- [ ] Le retry est configuré (exponential backoff)
- [ ] Le logging est structuré
- [ ] Les jobs complétés/échoués sont nettoyés
- [ ] Tests passent
