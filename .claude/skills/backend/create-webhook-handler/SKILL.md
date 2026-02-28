---
name: create-webhook-handler
description: Crée un handler de webhook avec HMAC + anti-replay
argument-hint: <Provider> in <module-name> [peach-payments | other]
---

# Create Webhook Handler

Crée un handler de webhook `$ARGUMENTS` sécurisé.

## Étape 1 — Controller webhook

Fichier : `src/modules/<module>/adapters/inbound/<provider>-webhook.controller.ts`

```typescript
import { Controller, Post, Body, Headers, RawBodyRequest, Req, HttpCode } from '@nestjs/common';

@Controller('webhooks/<provider>')
export class <Provider>WebhookController {
  constructor(private readonly handler: <Provider>WebhookHandler) {}

  @Post()
  @HttpCode(200) // Toujours répondre 200 pour éviter les retries inutiles
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature: string,
    @Headers('x-timestamp') timestamp: string,
  ): Promise<{ received: true }> {
    // 1. Vérifier la signature HMAC
    this.handler.verifySignature(req.rawBody, signature, timestamp);

    // 2. Traiter l'événement
    await this.handler.process(req.body);

    return { received: true };
  }
}
```

## Étape 2 — Service de vérification et traitement

Fichier : `src/modules/<module>/services/<provider>-webhook.handler.ts`

```typescript
@Injectable()
export class <Provider>WebhookHandler {
  private readonly secret = process.env.<PROVIDER>_WEBHOOK_SECRET;

  verifySignature(rawBody: Buffer, signature: string, timestamp: string): void {
    // Anti-replay : vérifier que le timestamp n'est pas trop ancien (< 5 min)
    const age = Date.now() - new Date(timestamp).getTime();
    if (age > 5 * 60 * 1000) {
      throw new UnauthorizedException('Webhook timestamp too old');
    }

    // HMAC SHA-256
    const expected = createHmac('sha256', this.secret)
      .update(`${timestamp}.${rawBody.toString()}`)
      .digest('hex');

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  async process(body: WebhookPayload): Promise<void> {
    // Idempotence : vérifier si l'event a déjà été traité
    const exists = await this.prisma.webhookEvent.findUnique({
      where: { externalId: body.id },
    });
    if (exists) return; // Already processed

    // Router par type d'événement
    switch (body.type) {
      case 'payment.success':
        await this.handlePaymentSuccess(body);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(body);
        break;
      // ...
    }

    // Enregistrer l'event comme traité
    await this.prisma.webhookEvent.create({
      data: { externalId: body.id, type: body.type, processedAt: new Date() },
    });
  }
}
```

## Étape 3 — Configuration NestJS

Activer le raw body pour la vérification HMAC :
```typescript
// main.ts
const app = await NestFactory.create(AppModule, {
  rawBody: true,
});
```

## Étape 4 — Tests

- Tester avec une signature valide → 200
- Tester avec une signature invalide → 401
- Tester anti-replay (timestamp ancien) → 401
- Tester idempotence (même event 2x) → 200 sans double traitement
- Tester chaque type d'événement

## Sécurité (ADR-022)

- **HMAC SHA-256** avec `timingSafeEqual` (timing attack prevention)
- **Anti-replay** : timestamp < 5 minutes
- **Idempotence** : déduplication par event ID
- **Pas d'auth JWT** sur le webhook endpoint (le HMAC suffit)
- **Rate limiting** sur l'endpoint webhook

## Validation

- [ ] Signature HMAC vérifiée avec timingSafeEqual
- [ ] Anti-replay activé
- [ ] Idempotence implémentée
- [ ] Chaque type d'événement a un handler
- [ ] Tests couvrent tous les scénarios de sécurité
