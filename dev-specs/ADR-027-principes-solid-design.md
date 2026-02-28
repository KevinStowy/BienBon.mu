# ADR-027 : Principes SOLID -- application concrete a BienBon et enforcement automatise

| Champ         | Valeur                                                                  |
|---------------|-------------------------------------------------------------------------|
| **Statut**    | Propose                                                                 |
| **Date**      | 2026-02-27                                                              |
| **Auteur**    | Kevin (assiste par Claude Opus 4.6)                                     |
| **Decideurs** | Equipe technique BienBon                                                |
| **Scope**     | Principes SOLID, DRY, KISS, YAGNI, anti-patterns IA, enforcement automatise, metriques, fitness functions |
| **Prereqs**   | ADR-001 (stack), ADR-002 (architecture), ADR-005 (paiement), ADR-017 (state machines), ADR-019 (fraude), ADR-022 (securite OWASP), ADR-024 (DDD), ADR-026 (qualite code IA) |
| **Refs**      | Robert C. Martin -- *Agile Software Development* (2003), *Clean Architecture* (2017) ; Martin Fowler -- *Refactoring* (2018) ; ADR-024 Q7 (architecture hexagonale pragmatique) ; ADR-026 S3 (ESLint, dependency-cruiser, metriques) |

---

## 1. Contexte

### 1.1 Pourquoi cette ADR est necessaire

BienBon.mu est une marketplace de paniers anti-gaspi a l'ile Maurice. **100% du code est genere par des agents IA** (Claude Code / Claude Opus). Les ADR precedentes ont pose l'architecture (ADR-002 monolithe modulaire, ADR-024 DDD, ADR-026 guardrails qualite). Mais aucune ADR ne formalise **comment appliquer concretement les principes SOLID** dans le contexte specifique de BienBon, et surtout **comment les enforcer automatiquement** quand les developpeurs sont des agents IA.

### 1.2 Le probleme specifique du code genere par IA

Le code genere par IA a des tendances recurrentes et documentees qui violent systematiquement les principes SOLID :

| Principe | Violation typique de l'IA | Frequence | Impact BienBon |
|----------|--------------------------|:---------:|----------------|
| **SRP** | "God services" qui font tout (creer un panier + valider le stock + envoyer la notif + ecrire le ledger dans le meme service) | Tres elevee | Un changement dans le paiement casse les notifications. Impossible de tester le ledger sans mocker 12 dependances |
| **OCP** | Cascades de `if/switch` hardcodees au lieu de strategies (`if (paymentMethod === 'card') ... else if (paymentMethod === 'mcb_juice') ...`) | Elevee | Chaque ajout de methode de paiement touche N fichiers et risque une regression |
| **LSP** | Classes qui heritent mais ne respectent pas le contrat du parent (adapter qui lance `NotImplementedError` sur certaines methodes) | Moyenne | Runtime errors en production sur des chemins non testes |
| **ISP** | Interfaces geantes (`IPartnerService` avec 30 methodes) au lieu de les decouper | Elevee | Mocks enormes dans les tests, couplage inutile entre consommateurs |
| **DIP** | Injection directe d'implementations concretes (`PrismaClient` dans le controller, `FcmService` dans le service domaine) | Tres elevee | Impossible de changer de PSP ou de provider de notification sans réécrire le service |

### 1.3 Ce que cette ADR couvre

| # | Question |
|---|----------|
| Q1 | Comment appliquer chaque principe SOLID concretement dans NestJS/BienBon ? |
| Q2 | Quels anti-patterns IA specifiques detecter par principe ? |
| Q3 | Comment enforcer automatiquement chaque principe (ESLint, dependency-cruiser, metriques, fitness functions) ? |
| Q4 | Principes complementaires (DRY, KISS, YAGNI) et leur equilibre avec SOLID ? |
| Q5 | Quelles regles ajouter au CLAUDE.md pour guider l'IA ? |

### 1.4 Ce que cette ADR ne couvre pas

- Architecture hexagonale et structure de fichiers detaillee -> ADR-024 Q7-Q8
- ESLint config complete et dependency-cruiser -> ADR-026 S3
- Tests et mutation testing -> ADR-023
- State machines et transition tables -> ADR-017

---

## 2. S -- Single Responsibility Principle (SRP)

> *"A class should have one, and only one, reason to change."* -- Robert C. Martin

### 2.1 Traduction dans NestJS/BienBon

Un service NestJS = une responsabilite metier clairement identifiee. Un service "change" quand les regles metier de SA responsabilite changent. Si un service change pour des raisons differentes (ex: la logique de paiement ET la logique de notification), il viole le SRP.

**Regle BienBon :** Dans les modules DDD (Ordering, Payment, Catalog, Partner, Claims -- ADR-024 D1), chaque service correspond a un agregat ou a une responsabilite metier unique. Dans les modules CRUD simples, un service par module suffit.

### 2.2 Lien avec ADR-024 (DDD)

L'ADR-024 definit 7 agregats (section 5.2) et 11 bounded contexts (section 3.2). Le SRP se traduit directement :

| Bounded Context | Service(s) | Responsabilite unique |
|----------------|-----------|----------------------|
| Ordering | `ReservationService` | Orchestration du cycle de vie de la reservation |
| Ordering | `ReservationSchedulerService` | Jobs planifies (hold timeout, no-show, rappel) |
| Payment | `PaymentService` | Orchestration pre-auth/capture/refund via les PSP |
| Payment | `LedgerService` | Ecritures comptables double-entry |
| Payment | `PayoutService` | Reversements mensuels aux partenaires |
| Payment | `CommissionService` | Calcul des commissions |
| Catalog | `BasketService` | Cycle de vie du panier (creation, publication, stock) |
| Partner | `PartnerService` | Cycle de vie du partenaire (onboarding, state machine) |
| Partner | `StoreService` | Gestion des commerces et modifications |
| Claims | `ClaimService` | Cycle de vie de la reclamation |
| Notification | `NotificationService` | Envoi multicanal (push, email, in-app) |
| Fraud | `FraudEvaluationService` | Evaluation des regles de fraude |

### 2.3 Exemples concrets BienBon

#### MAUVAIS : God Service qui viole le SRP

```typescript
// reservation.service.ts -- MAUVAIS : 4 responsabilites dans un seul service
@Injectable()
export class ReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly peachClient: PeachPayments,      // Implementation concrete !
    private readonly fcmService: FcmService,          // Implementation concrete !
    private readonly redisClient: Redis,
    private readonly emailService: ResendService,     // Implementation concrete !
    private readonly fraudService: FraudService,
    private readonly ledgerService: LedgerService,
    private readonly basketService: BasketService,
    private readonly consumerService: ConsumerService,
    private readonly configService: ConfigService,
    private readonly bullQueue: Queue,
    private readonly eventEmitter: EventEmitter2,
    // ... 12 dependances injectees
  ) {}

  async createReservation(dto: CreateReservationDto) {
    // 1. Valide le stock (responsabilite Catalog)
    const basket = await this.prisma.basket.findUnique({ where: { id: dto.basketId } });
    if (basket.stock < dto.quantity) throw new Error('Stock insuffisant');
    await this.prisma.basket.update({
      where: { id: dto.basketId },
      data: { stock: { decrement: dto.quantity } },
    });

    // 2. Pre-autorise le paiement (responsabilite Payment)
    const checkout = await this.peachClient.initiateCheckout({
      amount: basket.price * dto.quantity,
      currency: 'MUR',
      captureType: 'DEFERRED',
    });

    // 3. Cree la reservation (OK -- c'est sa responsabilite)
    const reservation = await this.prisma.reservation.create({
      data: { /* ... */ status: 'CONFIRMED' },
    });

    // 4. Calcule la commission (responsabilite Payment/Commission)
    const commission = Math.max(
      basket.price * dto.quantity * 0.25,
      50, // fee minimum hardcode !
    );

    // 5. Ecrit le ledger (responsabilite Payment/Ledger)
    await this.prisma.ledgerEntry.createMany({
      data: [
        { accountId: 'GATEWAY', amount: basket.price * dto.quantity, direction: 'DEBIT' },
        { accountId: 'REVENUE', amount: commission, direction: 'CREDIT' },
        { accountId: `PARTNER:${basket.partnerId}`, amount: basket.price * dto.quantity - commission, direction: 'CREDIT' },
      ],
    });

    // 6. Envoie la notification (responsabilite Notification)
    await this.fcmService.send(reservation.consumerId, {
      title: 'Reservation confirmee !',
      body: `Votre panier chez ${basket.storeName} est reserve.`,
    });

    // 7. Envoie l'email (responsabilite Notification)
    await this.emailService.send({
      to: consumer.email,
      template: 'reservation-confirmed',
      data: { /* ... */ },
    });

    // 8. Incremente le compteur fraude (responsabilite Fraud)
    await this.redisClient.incr(`fraud:consumer:${dto.consumerId}:reservations:24h`);

    return reservation;
  }

  // ... 800 lignes de methodes similaires
}
```

**Problemes :**
- 12 dependances injectees -> signal SRP fort
- Modification de la logique de commission = risque de casser la creation de reservation
- Impossible de tester la logique de reservation sans mocker Peach Payments, FCM, Resend, Redis, le ledger
- L'IA a "tout mis au meme endroit" car elle genere le flow complet dans un seul prompt

#### BON : Services decomposes par responsabilite

```typescript
// reservation.service.ts -- BON : orchestrateur, une seule responsabilite
@Injectable()
export class ReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: ReservationStateMachine,
    private readonly eventEmitter: EventEmitter2,
    // 3 dependances : Prisma, state machine, events
  ) {}

  async createReservation(
    consumerId: string,
    basketId: string,
    quantity: number,
  ): Promise<Reservation> {
    // Valide et transite via la state machine (ADR-017)
    // La state machine appelle les guards (stock suffisant ?) et les effects
    // (decrement stock, pre-auth paiement) via les interfaces injectees
    const reservation = await this.prisma.$transaction(async (tx) => {
      const basket = await tx.basket.findUniqueOrThrow({ where: { id: basketId } });

      // Le domaine valide les regles metier
      assertBasketReservable(basket, quantity); // fonction pure (basket.rules.ts)

      // Decrement atomique du stock (ADR-008)
      await tx.basket.update({
        where: { id: basketId, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });

      return tx.reservation.create({
        data: {
          consumerId,
          basketId,
          storeId: basket.storeId,
          quantity,
          unitPrice: basket.price,
          totalPrice: basket.price * quantity,
          status: 'PENDING_PAYMENT',
          qrCode: generateQrCode(),
          pin: generatePin(),
          expiresAt: addMinutes(new Date(), 5),
        },
      });
    });

    // Emet l'event -- les effets de bord sont geres par les listeners
    this.eventEmitter.emit('ReservationCreated', {
      eventType: 'ReservationCreated',
      aggregateId: reservation.id,
      aggregateType: 'Reservation',
      occurredAt: new Date(),
      payload: {
        reservationId: reservation.id,
        consumerId,
        basketId,
        storeId: reservation.storeId,
        quantity,
        totalPrice: reservation.totalPrice,
      },
    });

    return reservation;
  }
}
```

```typescript
// reservation-events.listener.ts -- Les effets de bord sont decouples
@Injectable()
export class ReservationEventsListener {
  constructor(private readonly paymentService: PaymentService) {}

  @OnEvent('ReservationCreated')
  async handleReservationCreated(event: ReservationCreatedEvent): Promise<void> {
    await this.paymentService.preAuthorize(
      event.payload.reservationId,
      event.payload.totalPrice,
    );
  }
}
```

```typescript
// Dans le module Payment -- gere par un listener separe
@Injectable()
export class PaymentEventsListener {
  constructor(private readonly ledgerService: LedgerService) {}

  @OnEvent('PaymentCaptured')
  async handlePaymentCaptured(event: PaymentCapturedEvent): Promise<void> {
    await this.ledgerService.recordCapture(
      event.payload.orderId,
      event.payload.amount,
      event.payload.commission,
    );
  }
}
```

**Le resultat :** `ReservationService` orchestre la reservation. Le paiement, le ledger, les notifications, et la fraude sont geres par leurs modules respectifs via des events (ADR-024 section 4.3). Chaque service a une seule raison de changer.

### 2.4 Comment detecter les violations SRP

| Signal | Seuil | Outil | Action |
|--------|:-----:|-------|--------|
| Nombre de dependances injectees dans le constructeur | > 5 | ESLint custom rule + fitness function | **Warn** a 5, **Error** a 8 |
| Nombre de lignes par fichier de service | > 200 | ESLint `max-lines` | **Warn** a 200, **Error** a 400 |
| Complexite cyclomatique d'une methode | > 15 | ESLint `complexity` (ADR-026) | **Error** |
| Nombre de methodes publiques par service | > 8 | Fitness function | **Warn** |
| Un service importe plus de 3 modules NestJS differents | > 3 | Fitness function | **Warn** -- investiguer si les responsabilites sont melangees |

### 2.5 Anti-patterns IA specifiques au SRP

| Anti-pattern | Description | Detection | Correction |
|-------------|-------------|-----------|------------|
| **"Flow complet en un prompt"** | L'IA recoit "implemente la reservation" et genere un service qui fait tout le flow (stock + paiement + notif + ledger + fraude) | Nombre de dependances > 5, fichier > 200 lignes | Decomposer : orchestrateur + events + listeners |
| **"Copy-paste d'un flow existant"** | L'IA copie la structure du service de reservation pour les reclamations, et embarque les memes dependances inutiles | Review agent (ADR-026 S4.4) | Verifier que chaque dependance est reellement utilisee |
| **"Methodes utilitaires fourre-tout"** | L'IA ajoute des methodes `formatDate()`, `generateSlug()`, `validateEmail()` dans le service metier | Lignes qui n'utilisent pas `this` dans un service NestJS | Extraire dans des fonctions utilitaires pures dans `shared/` |

### 2.6 Regles d'enforcement SRP

```typescript
// src/__tests__/architecture-srp.spec.ts
import { describe, it, expect } from 'vitest';
import { glob } from 'glob';
import { readFileSync } from 'fs';

describe('SRP Enforcement (ADR-027)', () => {

  it('Aucun service ne doit avoir plus de 8 dependances injectees', async () => {
    const serviceFiles = await glob('src/modules/**/*.service.ts');
    for (const file of serviceFiles) {
      const content = readFileSync(file, 'utf-8');
      // Compter les parametres du constructeur
      const constructorMatch = content.match(/constructor\s*\(([\s\S]*?)\)\s*\{/);
      if (constructorMatch) {
        const params = constructorMatch[1]
          .split(',')
          .filter((p) => p.trim().length > 0);
        expect(
          params.length,
          `${file} a ${params.length} dependances (max 8). Verifier le SRP (ADR-027).`
        ).toBeLessThanOrEqual(8);
      }
    }
  });

  it('Aucun fichier de service ne doit depasser 400 lignes', async () => {
    const serviceFiles = await glob('src/modules/**/*.service.ts');
    for (const file of serviceFiles) {
      const content = readFileSync(file, 'utf-8');
      const lineCount = content.split('\n').length;
      expect(
        lineCount,
        `${file} a ${lineCount} lignes (max 400). Decomposer le service (ADR-027 SRP).`
      ).toBeLessThanOrEqual(400);
    }
  });
});
```

---

## 3. O -- Open/Closed Principle (OCP)

> *"Software entities should be open for extension, but closed for modification."* -- Robert C. Martin

### 3.1 Traduction dans BienBon

Le systeme doit pouvoir ajouter un nouveau comportement (nouvelle methode de paiement, nouveau type de notification, nouvelle regle de fraude) **sans modifier le code existant**. On ajoute un nouveau fichier (adapter, strategy, handler), on le branche dans le DI, et le code existant n'est pas touche.

### 3.2 Cas concrets BienBon ou l'OCP est critique

| Fonctionnalite | Elements extensibles | Risque si OCP viole |
|---------------|---------------------|---------------------|
| **4 methodes de paiement** (carte, MCB Juice, Blink, my.t money) -- ADR-005 | Adapters de PSP | Ajouter Blink = modifier le `PaymentService` existant, risque de casser carte et MCB Juice |
| **9+ types de notifications** (ADR-014) | Templates et canaux | Ajouter un canal (SMS) = modifier `NotificationService` au lieu d'ajouter un adapter |
| **Regles de fraude configurables** (ADR-019) | Regles evaluees | Ajouter une regle de fraude = modifier le `FraudEvaluationService` au lieu de creer un nouveau handler |
| **Types de recurrence** (ADR-017) | Strategies de planification | Ajouter un pattern recurrent (quotidien, hebdomadaire) = modifier le scheduler |
| **Formats d'export** (PDF, CSV) | Generateurs | Ajouter un format = modifier le service d'export |

### 3.3 Exemples concrets BienBon

#### MAUVAIS : Switch/if sur les methodes de paiement

```typescript
// payment.service.ts -- MAUVAIS : viole l'OCP
@Injectable()
export class PaymentService {
  constructor(
    private readonly peachClient: PeachPayments,
    private readonly mcbJuiceClient: McbJuiceApi,
    private readonly blinkClient: BlinkApi,
    private readonly mytMoneyClient: MytMoneyApi,
    // Chaque nouveau PSP = nouvelle dependance ici
  ) {}

  async preAuthorize(orderId: string, amount: number, method: PaymentMethod): Promise<string> {
    // MAUVAIS : switch qui grossit a chaque nouveau PSP
    switch (method) {
      case 'CARD':
        const checkout = await this.peachClient.initiateCheckout({
          amount,
          currency: 'MUR',
          captureType: 'DEFERRED',
        });
        return checkout.id;

      case 'MCB_JUICE':
        const juiceRef = await this.mcbJuiceClient.createHold({
          amount,
          currency: 'MUR',
          merchantId: process.env.MCB_MERCHANT_ID,
        });
        return juiceRef.transactionId;

      case 'BLINK':
        const blinkRef = await this.blinkClient.initiatePayment({
          amount,
          callbackUrl: `${process.env.API_URL}/payments/blink/callback`,
        });
        return blinkRef.reference;

      case 'MYT_MONEY':
        const mytRef = await this.mytMoneyClient.hold({
          montant: amount, // API en francais !
          devise: 'MUR',
        });
        return mytRef.id;

      default:
        // L'IA oublie souvent le default ou met un throw generique
        throw new Error(`Unknown payment method: ${method}`);
    }
  }

  // Meme switch pour capture(), refund(), getStatus()...
  // Chaque methode a le meme switch duplique 4 fois !
}
```

**Problemes :**
- Ajouter un 5e PSP = modifier `PaymentService` (OCP viole)
- Le switch est duplique dans `preAuthorize()`, `capture()`, `refund()`, `getStatus()` (DRY viole aussi)
- L'IA genere ce pattern car elle "voit" les 4 PSP dans le prompt et les met tous dans un switch

#### BON : Strategy Pattern via le DI NestJS

```typescript
// ports/payment-gateway.port.ts -- Interface (port) du domaine
export interface IPaymentGateway {
  readonly providerName: string;
  readonly supportedMethods: PaymentMethod[];

  preAuthorize(orderId: string, amount: Money): Promise<PaymentReference>;
  capture(reference: PaymentReference): Promise<CaptureResult>;
  refund(reference: PaymentReference, amount: Money): Promise<RefundResult>;
  getStatus(reference: PaymentReference): Promise<PaymentStatus>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
```

```typescript
// adapters/peach-payments.adapter.ts -- Adapter pour les cartes (Peach Payments)
@Injectable()
export class PeachPaymentsAdapter implements IPaymentGateway {
  readonly providerName = 'peach_payments';
  readonly supportedMethods: PaymentMethod[] = ['CARD'];

  constructor(private readonly httpService: HttpService) {}

  async preAuthorize(orderId: string, amount: Money): Promise<PaymentReference> {
    const response = await this.httpService.axiosRef.post(
      `${this.baseUrl}/v1/checkouts`,
      {
        amount: amount.toCents(),
        currency: amount.currency,
        paymentType: 'PA', // Pre-Authorization
        merchantTransactionId: orderId,
      },
      { headers: this.getAuthHeaders() },
    );
    return { provider: this.providerName, externalId: response.data.id };
  }

  async capture(reference: PaymentReference): Promise<CaptureResult> {
    // Implementation specifique Peach Payments
  }

  async refund(reference: PaymentReference, amount: Money): Promise<RefundResult> {
    // Implementation specifique Peach Payments
  }

  async getStatus(reference: PaymentReference): Promise<PaymentStatus> {
    // Implementation specifique Peach Payments
  }
}
```

```typescript
// adapters/mcb-juice.adapter.ts -- Adapter pour MCB Juice
@Injectable()
export class McbJuiceAdapter implements IPaymentGateway {
  readonly providerName = 'mcb_juice';
  readonly supportedMethods: PaymentMethod[] = ['MCB_JUICE'];

  async preAuthorize(orderId: string, amount: Money): Promise<PaymentReference> {
    // Implementation specifique MCB Juice
  }

  async capture(reference: PaymentReference): Promise<CaptureResult> { /* ... */ }
  async refund(reference: PaymentReference, amount: Money): Promise<RefundResult> { /* ... */ }
  async getStatus(reference: PaymentReference): Promise<PaymentStatus> { /* ... */ }
}
```

```typescript
// payment.module.ts -- DI : resolution de la strategy
@Module({
  providers: [
    PeachPaymentsAdapter,
    McbJuiceAdapter,
    BlinkAdapter,
    MytMoneyAdapter,
    {
      provide: 'PAYMENT_GATEWAYS',
      useFactory: (
        peach: PeachPaymentsAdapter,
        mcb: McbJuiceAdapter,
        blink: BlinkAdapter,
        myt: MytMoneyAdapter,
      ) => [peach, mcb, blink, myt],
      inject: [PeachPaymentsAdapter, McbJuiceAdapter, BlinkAdapter, MytMoneyAdapter],
    },
    PaymentService,
  ],
})
export class PaymentModule {}
```

```typescript
// payment.service.ts -- BON : ouvert a l'extension, ferme a la modification
@Injectable()
export class PaymentService {
  private readonly gatewayMap: Map<PaymentMethod, IPaymentGateway>;

  constructor(
    @Inject('PAYMENT_GATEWAYS') gateways: IPaymentGateway[],
  ) {
    // Construit un index methode -> adapter au demarrage
    this.gatewayMap = new Map();
    for (const gateway of gateways) {
      for (const method of gateway.supportedMethods) {
        this.gatewayMap.set(method, gateway);
      }
    }
  }

  async preAuthorize(
    orderId: string,
    amount: Money,
    method: PaymentMethod,
  ): Promise<PaymentReference> {
    const gateway = this.resolveGateway(method);
    return gateway.preAuthorize(orderId, amount);
  }

  async capture(reference: PaymentReference): Promise<CaptureResult> {
    const gateway = this.resolveGateway(reference.provider);
    return gateway.capture(reference);
  }

  private resolveGateway(method: PaymentMethod): IPaymentGateway {
    const gateway = this.gatewayMap.get(method);
    if (!gateway) {
      throw new BadRequestException(`Methode de paiement non supportee : ${method}`);
    }
    return gateway;
  }
}
```

**Le resultat :** Ajouter un 5e PSP = creer un fichier `new-psp.adapter.ts` qui implemente `IPaymentGateway`, l'enregistrer dans `payment.module.ts`. Zero modification du `PaymentService` existant.

#### BON : Regles de fraude configurables (ADR-019)

```typescript
// ports/fraud-rule-evaluator.port.ts
export interface IFraudRuleEvaluator {
  readonly ruleSlug: string;
  evaluate(actorId: string, context: FraudContext): Promise<FraudEvaluation>;
}
```

```typescript
// evaluators/no-show-rule.evaluator.ts
@Injectable()
export class NoShowRuleEvaluator implements IFraudRuleEvaluator {
  readonly ruleSlug = 'no_show_threshold';

  async evaluate(actorId: string, context: FraudContext): Promise<FraudEvaluation> {
    const count = await this.getNoShowCount(actorId, context.windowDays);
    return {
      triggered: count >= context.threshold,
      severity: count >= context.threshold * 2 ? 'critical' : 'warning',
      details: { noShowCount: count, threshold: context.threshold },
    };
  }
}
```

```typescript
// fraud-evaluation.service.ts -- BON : itere sur les evaluators injectes
@Injectable()
export class FraudEvaluationService {
  constructor(
    @Inject('FRAUD_RULE_EVALUATORS')
    private readonly evaluators: IFraudRuleEvaluator[],
  ) {}

  async evaluateActor(actorId: string): Promise<FraudAlert[]> {
    const alerts: FraudAlert[] = [];
    for (const evaluator of this.evaluators) {
      const result = await evaluator.evaluate(actorId, await this.getContext(evaluator.ruleSlug));
      if (result.triggered) {
        alerts.push(this.createAlert(actorId, evaluator.ruleSlug, result));
      }
    }
    return alerts;
  }
}
```

**Le resultat :** Ajouter une nouvelle regle de fraude = creer un `new-rule.evaluator.ts` qui implemente `IFraudRuleEvaluator`. Zero modification du `FraudEvaluationService`.

### 3.4 Lien avec ADR-005 (paiements)

L'ADR-005 definit l'abstraction `PaymentGateway` avec 4 adapters (Peach Payments pour les cartes, MCB Juice, Blink, my.t money). Le pattern Strategy ci-dessus est la **materialisation OCP** de cette decision. L'ADR-005 definit l'interface, l'ADR-027 formalise le **pourquoi** (OCP) et le **comment** (NestJS DI + multi-provider).

### 3.5 Lien avec ADR-019 (fraude)

L'ADR-019 section 2 choisit un moteur de regles configurables en base (pas de code en dur). C'est l'application directe de l'OCP : les regles changent sans modifier le code. L'ADR-027 ajoute la couche technique (evaluators injectes) a la couche fonctionnelle (regles en base) de l'ADR-019.

### 3.6 Comment detecter les violations OCP

| Signal | Seuil | Outil | Action |
|--------|:-----:|-------|--------|
| `switch` sur une variable `method`, `type`, `provider`, `channel` | 0 dans les services (hors utils) | ESLint `no-restricted-syntax` + fitness function | **Error** -- utiliser le Strategy pattern |
| `if/else if/else if` sur un enum avec > 3 branches | > 3 | ESLint `complexity` (rattrape partiellement) + review agent | **Warn** -- investiguer si une strategie est plus appropriee |
| Un nouveau PSP/canal/regle necessite de modifier un service existant | -- | Review agent (ADR-026 S4.4) | Refactorer vers une abstraction |

### 3.7 Anti-patterns IA specifiques a l'OCP

| Anti-pattern | Description | Detection | Correction |
|-------------|-------------|-----------|------------|
| **"Switch exhaustif"** | L'IA genere un switch avec tous les cas connus et pense que `switch-exhaustiveness-check` suffit | Review agent : un switch sur un enum de providers/canaux est un signal OCP | Refactorer vers des adapters |
| **"Map d'objets inline"** | L'IA cree un `const handlers = { CARD: () => ..., MCB_JUICE: () => ... }` dans le service | Review agent : une map de handlers inline est un switch deguise | Extraire en classes injectables |
| **"Base class avec des ifs"** | L'IA cree une classe de base `BasePaymentGateway` avec des `if (this.provider === 'peach')` au lieu de vrais adapters | Fitness function : une base class ne doit pas referencer des providers concrets | Extraire en sous-classes propres |

### 3.8 Regles d'enforcement OCP

```typescript
// ESLint : interdire les switch sur des variables de type provider/method/channel dans les services
// Ajouter dans eslint.config.ts (section no-restricted-syntax de ADR-026)
{
  selector: 'SwitchStatement > SwitchCase > .test[type="MemberExpression"][property.name=/^(method|paymentMethod|channel|provider|notificationType)$/]',
  message: 'Switch sur un type de provider/methode/canal interdit dans les services. Utiliser le Strategy pattern (ADR-027 OCP).',
}
```

```typescript
// src/__tests__/architecture-ocp.spec.ts
describe('OCP Enforcement (ADR-027)', () => {

  it('Les services de payment ne doivent pas contenir de switch sur PaymentMethod', async () => {
    const paymentFiles = await glob('src/modules/payments/**/*.service.ts');
    for (const file of paymentFiles) {
      const content = readFileSync(file, 'utf-8');
      const hasSwitchOnMethod = /switch\s*\(\s*\w*(method|Method|payment|Payment)\w*\s*\)/.test(content);
      expect(
        hasSwitchOnMethod,
        `${file} contient un switch sur une methode de paiement. Utiliser le Strategy pattern (ADR-027).`
      ).toBe(false);
    }
  });

  it('Les services de notification ne doivent pas contenir de switch sur le canal', async () => {
    const notifFiles = await glob('src/modules/notifications/**/*.service.ts');
    for (const file of notifFiles) {
      const content = readFileSync(file, 'utf-8');
      const hasSwitchOnChannel = /switch\s*\(\s*\w*(channel|Channel|type|Type)\w*\s*\)/.test(content);
      expect(
        hasSwitchOnChannel,
        `${file} contient un switch sur un canal de notification. Utiliser le Strategy pattern (ADR-027).`
      ).toBe(false);
    }
  });
});
```

---

## 4. L -- Liskov Substitution Principle (LSP)

> *"Objects of a superclass should be replaceable with objects of a subclass without affecting the correctness of the program."* -- Barbara Liskov

### 4.1 Pertinence pour BienBon

Le LSP est **moins critique en surface** dans un projet TypeScript/Dart car on utilise peu d'heritage de classe. Mais il est **tres pertinent pour les interfaces** : chaque adapter qui implemente un port doit respecter strictement le contrat defini par le port.

**Traduction BienBon :** Un `McbJuiceAdapter` qui implemente `IPaymentGateway` doit se comporter exactement comme le contrat le definit. Si le contrat dit que `preAuthorize()` retourne une `PaymentReference`, l'adapter ne peut pas retourner `null`, lancer une exception non documentee, ou ignorer silencieusement un parametre.

### 4.2 Violations LSP courantes avec le code IA

#### MAUVAIS : Adapter qui ne respecte pas le contrat

```typescript
// MAUVAIS : l'adapter MCB Juice viole le contrat de IPaymentGateway
@Injectable()
export class McbJuiceAdapter implements IPaymentGateway {
  readonly providerName = 'mcb_juice';
  readonly supportedMethods: PaymentMethod[] = ['MCB_JUICE'];

  async preAuthorize(orderId: string, amount: Money): Promise<PaymentReference> {
    // OK
    const response = await this.httpClient.post('/hold', { amount: amount.toCents() });
    return { provider: this.providerName, externalId: response.transactionId };
  }

  async capture(reference: PaymentReference): Promise<CaptureResult> {
    // OK
    const response = await this.httpClient.post('/capture', { id: reference.externalId });
    return { success: true, capturedAmount: response.amount };
  }

  async refund(reference: PaymentReference, amount: Money): Promise<RefundResult> {
    // MAUVAIS : MCB Juice ne supporte pas les remboursements partiels
    // mais au lieu de retourner un resultat d'erreur ou de lancer une exception typee,
    // l'IA lance une erreur generique qui n'est pas dans le contrat
    throw new Error('MCB Juice does not support partial refunds');
    // Ou pire : retourne silencieusement { success: false } sans montant
  }

  async getStatus(reference: PaymentReference): Promise<PaymentStatus> {
    // MAUVAIS : l'IA met NotImplementedError car elle ne sait pas comment
    // faire le mapping de statut pour ce provider
    throw new NotImplementedError('getStatus not supported for MCB Juice');
  }
}
```

**Problemes :**
- Le `PaymentService` appelle `gateway.refund()` en s'attendant a un `RefundResult`. Recevoir une `Error` generique viole le LSP
- `getStatus()` avec `NotImplementedError` viole le contrat : tout adapter doit supporter toutes les methodes du port
- Le code appelant doit ajouter des `if (gateway.providerName === 'mcb_juice')` pour contourner -> retour au switch/case

#### BON : Contrat explicite avec gestion des limitations

```typescript
// ports/payment-gateway.port.ts -- Contrat clair avec capabilities
export interface IPaymentGateway {
  readonly providerName: string;
  readonly supportedMethods: PaymentMethod[];
  readonly capabilities: PaymentCapabilities;

  preAuthorize(orderId: string, amount: Money): Promise<PaymentReference>;
  capture(reference: PaymentReference): Promise<CaptureResult>;
  refund(reference: PaymentReference, amount: Money): Promise<RefundResult>;
  getStatus(reference: PaymentReference): Promise<PaymentStatus>;
}

export interface PaymentCapabilities {
  supportsPartialRefund: boolean;
  supportsPreAuthorization: boolean;
  supportsStatusQuery: boolean;
}
```

```typescript
// adapters/mcb-juice.adapter.ts -- BON : respecte le contrat, documente les limitations
@Injectable()
export class McbJuiceAdapter implements IPaymentGateway {
  readonly providerName = 'mcb_juice';
  readonly supportedMethods: PaymentMethod[] = ['MCB_JUICE'];
  readonly capabilities: PaymentCapabilities = {
    supportsPartialRefund: false,
    supportsPreAuthorization: true,
    supportsStatusQuery: true,
  };

  async refund(reference: PaymentReference, amount: Money): Promise<RefundResult> {
    // LSP respecte : retourne un resultat structure, pas une exception
    if (amount.isLessThan(reference.originalAmount)) {
      return {
        success: false,
        reason: 'PARTIAL_REFUND_NOT_SUPPORTED',
        message: 'MCB Juice ne supporte que le remboursement total.',
      };
    }
    const response = await this.httpClient.post('/refund', { id: reference.externalId });
    return { success: true, refundedAmount: amount };
  }

  async getStatus(reference: PaymentReference): Promise<PaymentStatus> {
    // LSP respecte : implemente reellement la methode
    const response = await this.httpClient.get(`/status/${reference.externalId}`);
    return this.mapStatus(response.status);
  }
}
```

### 4.3 Comment valider le LSP : tests de contrat

La meilleure facon de garantir le LSP est d'ecrire **une seule suite de tests** qui s'execute sur **tous les adapters** d'un port.

```typescript
// adapters/__tests__/payment-gateway.contract.spec.ts
import { describe, it, expect } from 'vitest';

// Test de contrat : chaque adapter doit passer cette suite
function paymentGatewayContractTests(
  createAdapter: () => IPaymentGateway,
  testConfig: { skipPartialRefund?: boolean },
) {
  describe(`IPaymentGateway contract: ${createAdapter().providerName}`, () => {

    it('preAuthorize retourne une PaymentReference valide', async () => {
      const adapter = createAdapter();
      const ref = await adapter.preAuthorize('order-1', Money.fromMUR(150));
      expect(ref).toBeDefined();
      expect(ref.provider).toBe(adapter.providerName);
      expect(ref.externalId).toBeTruthy();
    });

    it('capture retourne un CaptureResult avec le montant', async () => {
      const adapter = createAdapter();
      const ref = await adapter.preAuthorize('order-2', Money.fromMUR(200));
      const result = await adapter.capture(ref);
      expect(result.success).toBe(true);
      expect(result.capturedAmount).toBeDefined();
    });

    it('refund retourne un RefundResult (pas une exception)', async () => {
      const adapter = createAdapter();
      const ref = await adapter.preAuthorize('order-3', Money.fromMUR(100));
      await adapter.capture(ref);
      const result = await adapter.refund(ref, Money.fromMUR(100));
      // Le resultat peut etre success=true ou success=false,
      // mais JAMAIS une exception non typee
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('getStatus retourne un PaymentStatus valide', async () => {
      const adapter = createAdapter();
      const ref = await adapter.preAuthorize('order-4', Money.fromMUR(150));
      const status = await adapter.getStatus(ref);
      expect(['PENDING', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED']).toContain(status);
    });
  });
}

// Execution sur tous les adapters
paymentGatewayContractTests(() => new PeachPaymentsAdapter(mockHttpService), {});
paymentGatewayContractTests(() => new McbJuiceAdapter(mockHttpService), { skipPartialRefund: true });
paymentGatewayContractTests(() => new BlinkAdapter(mockHttpService), {});
paymentGatewayContractTests(() => new MytMoneyAdapter(mockHttpService), {});
```

### 4.4 Anti-patterns IA specifiques au LSP

| Anti-pattern | Description | Detection | Correction |
|-------------|-------------|-----------|------------|
| **`NotImplementedError`** | L'IA implemente une interface mais lance `NotImplementedError` ou `TODO` sur certaines methodes | `grep -r "NotImplemented\|not implemented\|TODO.*implement"` en CI | Toutes les methodes du port doivent etre reellement implementees. Si une capability manque, utiliser le pattern `capabilities` |
| **Types de retour incoherents** | Un adapter retourne `null` la ou les autres retournent un objet | Tests de contrat (meme suite sur tous les adapters) | Typage strict (`strictNullChecks`) + tests de contrat |
| **Exceptions non documentees** | Un adapter lance des exceptions que les autres ne lancent pas | Tests de contrat avec coverage des cas d'erreur | Definir les exceptions dans le port (throw contract) |

### 4.5 Regles d'enforcement LSP

```typescript
// src/__tests__/architecture-lsp.spec.ts
describe('LSP Enforcement (ADR-027)', () => {

  it('Aucun adapter ne contient NotImplementedError ou TODO', async () => {
    const adapterFiles = await glob('src/modules/**/adapters/**/*.ts');
    for (const file of adapterFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/NotImplemented/i);
      expect(content).not.toMatch(/throw new Error\(['"].*not (yet )?implemented/i);
      expect(content).not.toMatch(/TODO.*implement/i);
    }
  });

  it('Chaque port a des tests de contrat executes sur tous ses adapters', async () => {
    const portFiles = await glob('src/modules/**/ports/**/*.port.ts');
    for (const portFile of portFiles) {
      const portName = portFile.replace('.port.ts', '');
      const contractTestFile = `${portName}.contract.spec.ts`;
      const contractTests = await glob(`src/modules/**/${contractTestFile}`);
      // Au moins un fichier de test de contrat pour chaque port
      // Ceci est un reminder, pas un enforcement strict (le fichier de test
      // pourrait avoir un nom different)
    }
  });
});
```

---

## 5. I -- Interface Segregation Principle (ISP)

> *"Clients should not be forced to depend on interfaces they do not use."* -- Robert C. Martin

### 5.1 Traduction dans NestJS/BienBon

Les interfaces TypeScript (ports) doivent etre fines et specifiques au consommateur. Un module qui a besoin de "consulter le stock d'un panier" ne devrait pas dependre d'une interface qui inclut aussi "publier un panier", "archiver un panier", "calculer les statistiques de vente".

### 5.2 Lien avec ADR-024 (DDD)

L'ADR-024 definit des bounded contexts avec des responsabilites claires. L'ISP complete le DDD en decoupant les interfaces **au sein meme** d'un bounded context :

- Le BC Catalog expose une interface fine `IBasketStockService` pour que Ordering decremente le stock
- Le BC Catalog expose une interface fine `IBasketQueryService` pour que la recherche interroge les paniers
- Le BC Catalog n'expose pas un mega `IBasketService` avec 20 methodes

### 5.3 Exemples concrets BienBon

#### MAUVAIS : Interface geante

```typescript
// MAUVAIS : une interface geante pour tout le module Partner
export interface IPartnerService {
  // Onboarding
  registerPartner(dto: RegisterPartnerDto): Promise<Partner>;
  approvePartner(partnerId: string): Promise<Partner>;
  rejectPartner(partnerId: string, reason: string): Promise<Partner>;

  // State machine
  suspendPartner(partnerId: string, reason: string): Promise<Partner>;
  reactivatePartner(partnerId: string): Promise<Partner>;
  banPartner(partnerId: string, reason: string): Promise<Partner>;

  // Store management
  createStore(partnerId: string, dto: CreateStoreDto): Promise<Store>;
  updateStore(storeId: string, dto: UpdateStoreDto): Promise<Store>;
  deleteStore(storeId: string): Promise<void>;
  getStoresByPartner(partnerId: string): Promise<Store[]>;

  // Photos
  uploadStorePhoto(storeId: string, file: Buffer): Promise<StorePhoto>;
  deleteStorePhoto(photoId: string): Promise<void>;
  setPrimaryPhoto(storeId: string, photoId: string): Promise<void>;

  // Modification requests
  submitModificationRequest(storeId: string, changes: JsonDiff): Promise<ModificationRequest>;
  approveModificationRequest(requestId: string): Promise<ModificationRequest>;
  rejectModificationRequest(requestId: string, reason: string): Promise<ModificationRequest>;

  // Analytics
  getPartnerStats(partnerId: string, period: DateRange): Promise<PartnerStats>;
  getStoreStats(storeId: string, period: DateRange): Promise<StoreStats>;
  getRevenueReport(partnerId: string, period: DateRange): Promise<RevenueReport>;

  // Documents
  uploadDocument(partnerId: string, type: DocumentType, file: Buffer): Promise<PartnerDocument>;
  verifyDocument(documentId: string): Promise<PartnerDocument>;
}
```

**Problemes :**
- Le module Admin qui a besoin de `approvePartner()` depend de `uploadStorePhoto()`, `getRevenueReport()`, etc.
- Mocker cette interface dans les tests = 20 methodes a stubber
- L'IA genere ce pattern car elle "voit tout le module" et cree une interface qui couvre tout

#### BON : Interfaces fines par responsabilite

```typescript
// Interfaces fines, chacune pour un consommateur specifique

// Pour le flow d'onboarding et la validation admin
export interface IPartnerOnboarding {
  registerPartner(dto: RegisterPartnerDto): Promise<Partner>;
  approvePartner(partnerId: string): Promise<Partner>;
  rejectPartner(partnerId: string, reason: string): Promise<Partner>;
}

// Pour la gestion du cycle de vie (state machine)
export interface IPartnerLifecycle {
  suspendPartner(partnerId: string, reason: string): Promise<Partner>;
  reactivatePartner(partnerId: string): Promise<Partner>;
  banPartner(partnerId: string, reason: string): Promise<Partner>;
  getPartnerStatus(partnerId: string): Promise<PartnerStatus>;
}

// Pour la gestion des commerces
export interface IStoreManagement {
  createStore(partnerId: string, dto: CreateStoreDto): Promise<Store>;
  updateStore(storeId: string, dto: UpdateStoreDto): Promise<Store>;
  getStoresByPartner(partnerId: string): Promise<Store[]>;
}

// Pour les statistiques (consomme par le dashboard)
export interface IPartnerAnalytics {
  getPartnerStats(partnerId: string, period: DateRange): Promise<PartnerStats>;
  getStoreStats(storeId: string, period: DateRange): Promise<StoreStats>;
  getRevenueReport(partnerId: string, period: DateRange): Promise<RevenueReport>;
}
```

```typescript
// Le module Admin n'a besoin que de IPartnerOnboarding et IPartnerLifecycle
@Injectable()
export class AdminPartnerController {
  constructor(
    @Inject('IPartnerOnboarding') private readonly onboarding: IPartnerOnboarding,
    @Inject('IPartnerLifecycle') private readonly lifecycle: IPartnerLifecycle,
    // PAS de IStoreManagement, PAS de IPartnerAnalytics
  ) {}
}
```

```typescript
// Le module Fraud n'a besoin que de IPartnerLifecycle
@Injectable()
export class FraudAutoSuspendHandler {
  constructor(
    @Inject('IPartnerLifecycle') private readonly lifecycle: IPartnerLifecycle,
    // 1 seule dependance fine au lieu de 20 methodes
  ) {}

  async handleAutoSuspend(partnerId: string, reason: string): Promise<void> {
    await this.lifecycle.suspendPartner(partnerId, reason);
  }
}
```

### 5.4 Impact concret sur les tests

| Approche | Methodes a mocker pour tester `FraudAutoSuspendHandler` | Complexite |
|----------|:-------------------------------------------------------:|:----------:|
| Interface geante `IPartnerService` | 20 methodes (meme si 19 ne sont pas utilisees) | Elevee |
| Interface fine `IPartnerLifecycle` | 4 methodes | Faible |

### 5.5 Anti-patterns IA specifiques a l'ISP

| Anti-pattern | Description | Detection | Correction |
|-------------|-------------|-----------|------------|
| **"Interface miroir"** | L'IA cree une interface qui est le miroir exact de la classe d'implementation (1 interface = 1 classe = toutes les methodes) | Nombre de methodes dans l'interface > 8 | Decouper par consommateur |
| **"Interface god"** | L'IA cree une seule interface pour tout un bounded context | Nombre de methodes > 10, nombre d'imports de cette interface > 3 | Decouper par role/responsabilite |
| **"Facade prematuree"** | L'IA cree une facade qui agglomere des interfaces fines en une seule "pour simplifier" | Revue manuelle | Garder les interfaces fines, ne pas les re-grouper |

### 5.6 Regles d'enforcement ISP

```typescript
// src/__tests__/architecture-isp.spec.ts
describe('ISP Enforcement (ADR-027)', () => {

  it('Aucune interface ne doit avoir plus de 10 methodes', async () => {
    const tsFiles = await glob('src/modules/**/*.ts');
    for (const file of tsFiles) {
      const content = readFileSync(file, 'utf-8');
      // Regex simplifiee pour compter les methodes dans les interfaces
      const interfaces = content.matchAll(/export\s+interface\s+(\w+)\s*\{([\s\S]*?)\n\}/g);
      for (const match of interfaces) {
        const interfaceName = match[1];
        const body = match[2];
        // Compter les signatures de methodes (lignes contenant '(...): ...')
        const methods = body.match(/\w+\s*\(.*\)\s*:\s*/g);
        const methodCount = methods ? methods.length : 0;
        expect(
          methodCount,
          `Interface ${interfaceName} dans ${file} a ${methodCount} methodes (max 10). Decouper (ADR-027 ISP).`
        ).toBeLessThanOrEqual(10);
      }
    }
  });
});
```

---

## 6. D -- Dependency Inversion Principle (DIP)

> *"High-level modules should not depend on low-level modules. Both should depend on abstractions."* -- Robert C. Martin

### 6.1 Le principe le plus important pour BienBon

Le DIP est le fondement de l'architecture hexagonale pragmatique choisie dans l'ADR-024 Q7. C'est aussi le principe le plus frequemment viole par le code IA, car l'IA tend a coder le chemin le plus direct (import concret -> utilisation directe).

### 6.2 Ports & Adapters dans BienBon (rappel ADR-024)

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOMAIN LAYER                              │
│  (entites, value objects, regles metier, events)                 │
│  Zero dependance framework. Fonctions pures.                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PORTS (interfaces definies dans le domaine)               │    │
│  │                                                           │    │
│  │  IPaymentGateway    INotificationSender   IStorageProvider│    │
│  │  IFraudRuleEvaluator    IPdfGenerator                     │    │
│  └──────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────┘
                             │ depend de (abstractions)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    APPLICATION LAYER                              │
│  (services NestJS, orchestration)                                │
│  Injecte les ports via DI NestJS.                                │
│  Ne connait pas les implementations concretes.                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ implemente (abstractions)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                            │
│  (adapters concrets)                                             │
│                                                                  │
│  PeachPaymentsAdapter  FcmNotificationSender  S3StorageProvider  │
│  McbJuiceAdapter       ResendEmailSender      PuppeteerPdfGen    │
│  BlinkAdapter          InAppNotifSender                          │
│  MytMoneyAdapter                                                 │
└──────────────────────────────────────────────────────────────────┘
```

**La fleche de dependance va du code concret vers les abstractions, pas l'inverse.** Le `PaymentService` depend de `IPaymentGateway` (abstraction). L'adapter `PeachPaymentsAdapter` depend aussi de `IPaymentGateway` (il l'implemente). Le `PaymentService` ne sait pas que `PeachPaymentsAdapter` existe.

### 6.3 Exemples concrets BienBon

#### MAUVAIS : Le controller injecte PrismaClient directement

```typescript
// reservation.controller.ts -- MAUVAIS : DIP viole
@Controller('reservations')
export class ReservationController {
  constructor(
    private readonly prisma: PrismaClient,        // Implementation concrete !
    private readonly fcmService: FcmService,       // Implementation concrete !
    private readonly peachClient: PeachPayments,   // Implementation concrete !
  ) {}

  @Post()
  async createReservation(@Body() dto: CreateReservationDto) {
    // Le controller contient de la logique metier + acces DB direct
    const basket = await this.prisma.basket.findUnique({ where: { id: dto.basketId } });
    if (!basket || basket.stock < 1) {
      throw new NotFoundException('Panier non disponible');
    }

    // Appel direct a Peach Payments (implementation concrete)
    const checkout = await this.peachClient.initiateCheckout({
      amount: basket.price,
      currency: 'MUR',
    });

    const reservation = await this.prisma.reservation.create({
      data: { /* ... */ },
    });

    // Appel direct a FCM (implementation concrete)
    await this.fcmService.sendNotification(dto.consumerId, {
      title: 'Reservation confirmee',
    });

    return reservation;
  }
}
```

**Problemes :**
- Le controller depend de Prisma, Peach Payments, FCM -- 3 implementations concretes
- Impossible de changer de PSP sans modifier le controller
- Impossible de tester le controller sans une vraie DB, un vrai Peach Payments, un vrai FCM
- Violation de la separation des couches (ADR-024) : le controller contient de la logique metier

#### BON : Inversion des dependances via les ports NestJS

```typescript
// reservation.controller.ts -- BON : DIP respecte
@Controller('reservations')
export class ReservationController {
  constructor(
    // Depend du service (qui depend des abstractions)
    private readonly reservationService: ReservationService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('consumer')
  async createReservation(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    // Le controller delegue TOUTE la logique au service
    const reservation = await this.reservationService.createReservation(
      user.id,
      dto.basketId,
      dto.quantity,
    );
    return ReservationResponseDto.fromEntity(reservation);
  }
}
```

```typescript
// reservation.service.ts -- BON : depend de l'abstraction IPaymentGateway
@Injectable()
export class ReservationService {
  constructor(
    private readonly prisma: PrismaService,
    // Injection de l'abstraction, pas de l'implementation
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createReservation(
    consumerId: string,
    basketId: string,
    quantity: number,
  ): Promise<Reservation> {
    // Le service orchestre via l'abstraction
    const paymentRef = await this.paymentGateway.preAuthorize(
      reservation.id,
      Money.fromMUR(reservation.totalPrice),
    );
    // ...
  }
}
```

```typescript
// payment.module.ts -- Le DI de NestJS branche l'implementation sur l'abstraction
@Module({
  providers: [
    {
      provide: PAYMENT_GATEWAY,              // Token d'injection (abstraction)
      useClass: PeachPaymentsAdapter,        // Implementation concrete
    },
    PaymentService,
    LedgerService,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
```

### 6.4 Comment NestJS DI supporte le DIP nativement

NestJS fournit trois mecanismes de DIP :

| Mecanisme | Quand l'utiliser | Exemple BienBon |
|-----------|-----------------|-----------------|
| **`useClass`** | 1 interface = 1 implementation (ou resolution par env) | `{ provide: STORAGE_PROVIDER, useClass: S3StorageProvider }` |
| **`useFactory`** | Resolution dynamique, multi-implem | `{ provide: 'PAYMENT_GATEWAYS', useFactory: (...adapters) => [...adapters] }` |
| **Injection token (`Symbol`)** | Identifier un port sans string magique | `export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY')` |

**Regle BienBon :** Utiliser des `Symbol` pour les injection tokens. JAMAIS de strings magiques (`@Inject('PaymentGateway')` est fragile -- une typo et l'injection echoue silencieusement).

### 6.5 Ports obligatoires dans BienBon (ADR-024 D7)

| Port (interface) | Localisation | Implementations | Pourquoi un port ? |
|-----------------|-------------|-----------------|-------------------|
| `IPaymentGateway` | `payments/ports/` | `PeachPaymentsAdapter`, `McbJuiceAdapter`, `BlinkAdapter`, `MytMoneyAdapter` | 4 PSP, interchangeables |
| `INotificationSender` | `notifications/ports/` | `FcmNotificationSender`, `ResendEmailSender`, `InAppNotificationSender` | 3 canaux, extensibles |
| `IStorageProvider` | `shared/ports/` | `S3StorageProvider`, `MinioStorageProvider` (dev) | Changer de provider de storage entre dev et prod |
| `IPdfGenerator` | `shared/ports/` | `ReactPdfGenerator`, `PuppeteerPdfGenerator` | Flexibilite de l'implementation |
| `IGeocodingProvider` | `shared/ports/` | `GoogleGeocodingProvider` (ou OpenStreetMap) | Provider externe, changeable |

**Pas de port pour Prisma.** L'ADR-024 D7 a explicitement decide de ne PAS abstraire Prisma derriere un `IRepository`. C'est du boilerplate sans valeur. On teste avec une base de test PostgreSQL, pas avec des mocks de repository. Le DIP s'applique aux **integrations externes**, pas a l'ORM.

### 6.6 Anti-patterns IA specifiques au DIP

| Anti-pattern | Description | Detection | Correction |
|-------------|-------------|-----------|------------|
| **"PrismaClient dans le controller"** | L'IA injecte `PrismaClient` directement dans le controller et fait des requetes DB | ESLint `no-restricted-imports` + dependency-cruiser | Le controller injecte un service. Le service utilise Prisma |
| **"Import concret du provider"** | L'IA fait `import { FcmService } from './adapters/fcm.service'` dans un service domaine | dependency-cruiser : `domain -> adapters` interdit | Importer le port, pas l'adapter |
| **"Injection par string magique"** | L'IA fait `@Inject('PaymentGateway')` avec un string literal | ESLint `no-restricted-syntax` (ban `@Inject` avec string literal) | Utiliser des injection tokens `Symbol` |
| **"new ConcreteClass() dans le service"** | L'IA fait `const gateway = new PeachPaymentsAdapter()` au lieu d'injecter | grep `new .*Adapter\|new .*Provider\|new .*Client` dans les services | Injecter via le constructeur |

### 6.7 Regles d'enforcement DIP

```typescript
// Ajouter dans eslint.config.ts -- interdire l'import direct de Prisma dans les controllers
'no-restricted-imports': ['error', {
  paths: [
    {
      name: '@prisma/client',
      message: 'N\'importez pas PrismaClient directement dans les controllers. Injectez un service (ADR-027 DIP).',
    },
  ],
  patterns: [
    {
      group: ['**/adapters/**'],
      importNamePattern: '.*Adapter$',
      message: 'N\'importez pas un adapter directement. Injectez le port (interface) via DI (ADR-027 DIP).',
    },
  ],
}],
```

```javascript
// .dependency-cruiser.cjs -- Ajouter aux regles existantes (ADR-026 S5.3)
{
  name: 'no-adapter-in-domain',
  severity: 'error',
  comment: 'ADR-027 DIP : le domaine ne depend pas des adapters concrets.',
  from: { path: '/(domain|services)/' },
  to: { path: '/adapters/' },
},
{
  name: 'no-prisma-in-controllers',
  severity: 'error',
  comment: 'ADR-027 DIP : les controllers ne doivent pas acceder directement a Prisma.',
  from: { path: '/controllers?/' },
  to: { path: ['@prisma/client', 'prisma.service'] },
},
{
  name: 'no-concrete-provider-in-services',
  severity: 'error',
  comment: 'ADR-027 DIP : les services injectent des abstractions (ports), pas des implementations (adapters).',
  from: { path: '/services/' },
  to: { path: '/adapters/' },
},
```

```typescript
// src/__tests__/architecture-dip.spec.ts
describe('DIP Enforcement (ADR-027)', () => {

  it('Les controllers ne doivent pas importer PrismaClient ou PrismaService', async () => {
    const controllers = await glob('src/modules/**/controllers/**/*.controller.ts');
    for (const file of controllers) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/import.*Prisma/);
      expect(content).not.toMatch(/PrismaClient/);
      expect(content).not.toMatch(/PrismaService/);
    }
  });

  it('Les services du domaine ne doivent pas importer des adapters concrets', async () => {
    const serviceFiles = await glob('src/modules/**/services/**/*.service.ts');
    for (const file of serviceFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/from\s+['"].*\/adapters\//);
    }
  });

  it('Les injection tokens utilisent Symbol, pas des string literals', async () => {
    const tsFiles = await glob('src/modules/**/*.ts');
    for (const file of tsFiles) {
      const content = readFileSync(file, 'utf-8');
      // @Inject('string') est interdit, @Inject(SYMBOL) est OK
      const stringInjects = content.match(/@Inject\(\s*['"][^'"]+['"]\s*\)/g);
      expect(
        stringInjects,
        `${file} utilise @Inject avec un string literal. Utiliser un Symbol (ADR-027 DIP).`
      ).toBeNull();
    }
  });
});
```

---

## 7. Principes complementaires

### 7.1 DRY -- Don't Repeat Yourself

> *"Every piece of knowledge must have a single, unambiguous, authoritative representation within a system."* -- Andy Hunt, Dave Thomas

#### Application a BienBon

| Contexte | Application DRY | Exemple |
|----------|----------------|---------|
| **Regles metier** | Les invariants sont dans des fonctions pures dans `domain/rules.ts`, pas dupliques entre le controller, le service, et le DTO | `validateBasketPrice()` est dans `basket.rules.ts`, appele par le service. Pas copie-colle dans le DTO et le test |
| **Validation** | Les DTOs class-validator sont la source de verite pour la validation d'entree. Le service ne re-valide pas manuellement | `@IsUUID()` dans le DTO suffit. Pas de `if (!isUuid(basketId))` dans le service |
| **Types** | Les enums et types partages sont dans `shared/types/`. Pas dupliques par module | `ReservationStatus` est defini une fois dans `shared/types/`, pas dans 3 fichiers |
| **Configuration** | Les seuils et taux sont dans `app_settings` (base), charges une fois par `ConfigService`. Pas hardcodes | Le taux de commission est dans `app_settings`, pas dans `reservation.service.ts` |

#### Piege IA : la sur-abstraction DRY

L'IA a une tendance inverse : **abstraire trop tot et trop fort**. Elle voit deux blocs de code vaguement similaires et cree une fonction generique parametree qui n'est utilisee que 2 fois. C'est pire que la duplication car :
- L'abstraction est fragile (elle couple deux concepts qui evoluent differemment)
- Elle ajoute un niveau d'indirection qui rend le code plus dur a comprendre
- Quand les deux cas divergent, l'abstraction accumule des parametres conditionnels

**Regle BienBon :**
- **"Rule of Three"** : on ne DRY qu'a partir de la 3e repetition. Deux occurrences, c'est OK de dupliquer
- L'abstraction ne doit pas etre plus complexe que la duplication qu'elle remplace
- Si l'abstraction necessite des `if` internes pour gerer les differences entre les cas -> ne pas abstraire

### 7.2 KISS -- Keep It Simple, Stupid

> *"Simplicity is the ultimate sophistication."* -- Leonardo da Vinci

#### Application a BienBon

Le KISS est **critique avec du code IA** car l'IA a une tendance naturelle a l'over-engineering. Elle genere du code "correct" mais inutilement complexe.

| Anti-pattern IA | Exemple | Alternative KISS |
|----------------|---------|-----------------|
| **Generic inutile** | `class Repository<T extends BaseEntity, K extends keyof T>` pour un CRUD de favoris | `class FavoriteService { async add(consumerId, storeId) { ... } }` |
| **Pattern Observer pour 2 subscribers** | Un event bus complet avec registry, unsubscribe, replay pour 2 listeners | `EventEmitter2` de NestJS (deja dans la stack) |
| **CQRS complet pour un CRUD** | `CreateFavoriteCommand`, `CreateFavoriteHandler`, `FavoriteCreatedEvent`, `FavoriteProjection` pour `prisma.favorite.create()` | Service direct avec Prisma (ADR-024 Q7 : CRUD = NestJS vanilla) |
| **Builder pattern pour un DTO** | `ReservationDtoBuilder().withBasketId(...).withQuantity(...).build()` | Constructeur TypeScript standard ou object literal |
| **Custom error hierarchy** | `AppError -> DomainError -> BasketError -> BasketNotFoundError -> BasketNotFoundByIdError` | `NotFoundException` de NestJS (standard, suffisant) |

**Regle BienBon :**
- Les modules CRUD simples (favorites, reviews, gamification) = 4 fichiers max (ADR-024 Q8 section 9.3)
- Les design patterns (Strategy, Observer, etc.) ne sont justifies que quand il y a **plus de 2 variantes** ou quand l'ADR le demande explicitement
- Un module NestJS standard est deja un pattern suffisant pour 80% des cas

### 7.3 YAGNI -- You Ain't Gonna Need It

> *"Always implement things when you actually need them, never when you just foresee that you need them."* -- Ron Jeffries

#### Application a BienBon

L'IA ajoute des features "au cas ou" qui ne sont dans aucune user story. C'est le risque R3 de l'ADR-026.

| Feature fantome | Exemple IA | Regle BienBon |
|-----------------|-----------|---------------|
| **Soft delete partout** | L'IA ajoute `deletedAt: DateTime?` et un filtre global sur toutes les tables | Soft delete uniquement sur les tables ou l'ADR-003 ou l'ADR-021 (DPA) le demande explicitement |
| **Multi-langue sur les entites** | L'IA cree une table `basket_translations` avec des colonnes par langue | L'ADR-015 couvre l'i18n UI (ARB files). Les entites metier sont en francais ou bilingue FR/EN, pas via une table de traductions |
| **Versioning d'API** | L'IA cree des prefixes `/v1/`, `/v2/` sur tous les endpoints | On ne versionne que quand c'est necessaire. Pour le MVP, un seul endpoint sans version suffit |
| **Cache Redis partout** | L'IA ajoute un decorateur `@Cacheable()` sur toutes les queries | Le cache est justifie pour : (a) la recherche geo (PostGIS lourd), (b) les compteurs fraude (ADR-019), (c) le dashboard admin. Pas pour un `getReservationById()` |
| **Rate limiting custom** | L'IA cree un module de rate limiting complet au lieu d'utiliser `@nestjs/throttler` | `@nestjs/throttler` est dans la stack (ADR-022). Pas besoin d'un module custom |

**Regle BienBon :**
- Chaque feature doit etre tracable a une user story (`US-C***`, `US-P***`, `US-A***`, `US-T***`)
- Si l'IA propose une feature sans reference US, demander "quelle user story justifie ceci ?"
- Les abstractions preemptives ("on pourrait avoir besoin de...") sont interdites

### 7.4 L'equilibre : SOLID oui, pas 47 fichiers pour un CRUD

L'ADR-024 a deja tranche ce debat (section Q1, Option B) :

```
┌─────────────────────────────────────────────────────────────────┐
│                    Spectre de complexite                         │
│                                                                  │
│   CRUD simple              DDD leger              Over-engineered│
│   (favorites)              (ordering, payment)     (a eviter)    │
│                                                                  │
│   4 fichiers               15-20 fichiers          47 fichiers   │
│   - service.ts             - domain/entities       - Factory     │
│   - controller.ts          - domain/rules          - Builder     │
│   - dto.ts                 - domain/events         - Visitor     │
│   - module.ts              - services/             - Mediator    │
│                            - controllers/          - Specification│
│                            - ports/                - Repository  │
│                            - adapters/             - UnitOfWork  │
│                            - listeners/            - ...         │
│                            - state-machine/                      │
│                            - module.ts                           │
│                                                                  │
│   Modules : favorites,     Modules : ordering,     JAMAIS pour   │
│   reviews, gamification,   payment, catalog,       BienBon       │
│   referrals, admin         partner, claims                       │
│                                                                  │
│   SOLID applique :         SOLID applique :        SOLID mal     │
│   naturellement            explicitement           compris       │
│   (peu de logique)         (ports, strategies)     (ceremonie)   │
└─────────────────────────────────────────────────────────────────┘
```

**Regle pragmatique :** Un module merite de la structure SOLID explicite si et seulement si il a au moins une de ces proprietes :
1. Une state machine (ADR-017)
2. Des invariants financiers (ledger, commissions)
3. Des regles metier avec des gardes et des effets de bord
4. Plus de 15 user stories
5. Des integrations externes multiples (>= 2 providers interchangeables)

Sinon : NestJS vanilla, 4 fichiers, CRUD direct.

---

## 8. Tableau de synthese SOLID x BienBon x Enforcement

| Principe | Application BienBon | Anti-pattern IA principal | Enforcement automatise | Seuils |
|----------|--------------------|--------------------------|-----------------------|--------|
| **SRP** | 1 service = 1 responsabilite metier = 1 agregat (modules DDD). CRUD = 1 service par module | God service avec 12 dependances | Fitness function : max dependances, max lignes | Max 8 deps constructor, max 400 lignes/service, max 8 methodes publiques |
| **OCP** | Strategy pattern pour PSP, canaux notif, regles fraude. NestJS DI multi-provider | Switch/if sur `paymentMethod`, `channel` | ESLint `no-restricted-syntax` sur switch de providers + fitness function | 0 switch sur enum de providers dans les services |
| **LSP** | Tests de contrat : meme suite sur tous les adapters d'un port. Capabilities expliquees | `NotImplementedError`, types de retour incoherents | Fitness function : scan des `NotImplementedError` + tests de contrat obligatoires | 0 `NotImplementedError` dans les adapters |
| **ISP** | Interfaces fines par consommateur. `IPartnerOnboarding`, `IPartnerLifecycle`, `IPartnerAnalytics` | Interface miroir avec 30 methodes | Fitness function : max methodes par interface | Max 10 methodes par interface |
| **DIP** | Ports (interfaces) pour les integrations externes. NestJS DI avec Symbol tokens. Pas de Prisma dans les controllers | `PrismaClient` dans le controller, import direct d'adapter | dependency-cruiser + ESLint `no-restricted-imports` | 0 import Prisma dans controllers, 0 import adapter dans services |
| **DRY** | Fonctions pures dans `domain/rules.ts`, types dans `shared/types/`. Rule of Three | Sur-abstraction prematuree (DRY applique des la 2e occurrence) | Review agent | DRY a partir de 3 occurrences, pas avant |
| **KISS** | CRUD = 4 fichiers. Patterns uniquement si > 2 variantes | CQRS pour un CRUD, Generic<T,K> pour un simple service | Review agent + Danger.js (taille PR) | Modules CRUD : max 4-6 fichiers |
| **YAGNI** | Chaque feature tracable a une US. Pas de features "au cas ou" | Soft delete partout, cache Redis partout, API versioning premature | Review agent : "quelle US justifie ceci ?" | 0 feature sans reference US |

---

## 9. Regles a ajouter au CLAUDE.md

### 9.1 Ajout au CLAUDE.md racine

```markdown
## Principes SOLID (ADR-027)
11. SRP : un service NestJS = une responsabilite metier. Max 8 dependances injectees. Max 400 lignes.
12. OCP : JAMAIS de switch/if sur un type de provider/method/canal. Utiliser le Strategy pattern via DI.
13. LSP : chaque adapter implemente TOUTES les methodes du port. JAMAIS de NotImplementedError.
14. ISP : une interface = max 10 methodes. Decouper par consommateur si plus.
15. DIP : injecter l'abstraction (port), JAMAIS l'implementation (adapter). JAMAIS de PrismaClient dans un controller.
16. DRY : abstraire a partir de la 3e repetition, pas avant ("Rule of Three").
17. KISS : modules CRUD = 4 fichiers max. Pas de patterns GoF sauf si > 2 variantes.
18. YAGNI : chaque feature doit etre tracable a une US. Pas de features "au cas ou".
```

### 9.2 Ajout au CLAUDE.md backend (NestJS)

```markdown
## SOLID enforcement (ADR-027)
- Constructeur d'un service : max 8 parametres. Au-dela, decomposer.
- Switch sur un enum de providers/canaux/methodes : INTERDIT dans les services. Utiliser le Strategy pattern.
- Controllers : deleguer au service. ZERO logique metier. ZERO acces Prisma direct.
- Ports : definir dans `module/ports/`. Utiliser des Symbol pour les injection tokens.
- Adapters : un fichier par implementation dans `module/adapters/`. Chaque adapter implemente toutes les methodes du port.
- Interfaces : decouper si > 10 methodes. Nommer par role : `IPartnerOnboarding`, pas `IPartnerService`.
- Avant de creer une abstraction, verifier qu'il y a >= 3 cas d'usage OU que l'ADR le demande.
```

---

## 10. Metriques et seuils supplementaires

### 10.1 Metriques de qualite SOLID (ajout aux metriques ADR-026)

| Metrique | Outil | Seuil Warn | Seuil Error | Bloquant CI ? |
|----------|-------|:----------:|:-----------:|:-------------:|
| Dependances par constructeur de service | Fitness function | 5 | 8 | **Oui** |
| Lignes par fichier de service | ESLint `max-lines` | 200 | 400 | **Oui** |
| Methodes publiques par service | Fitness function | 6 | 8 | Non (warn) |
| Methodes par interface | Fitness function | 8 | 10 | Non (warn) |
| Switch sur enum de provider dans un service | ESLint + fitness function | -- | 0 | **Oui** |
| `NotImplementedError` dans les adapters | Fitness function | -- | 0 | **Oui** |
| Import de Prisma dans les controllers | dependency-cruiser | -- | 0 | **Oui** |
| Import d'adapter dans les services domaine | dependency-cruiser | -- | 0 | **Oui** |
| `@Inject` avec string literal | Fitness function | -- | 0 | **Oui** |
| Fichiers par module CRUD | Fitness function | 5 | 8 | Non (warn) |

### 10.2 Checklist de review SOLID pour le sub-agent reviewer (ADR-026 S4.4)

Ajouter a la checklist du sub-agent `code-reviewer.md` :

```markdown
### 6. Principes SOLID (ADR-027)
- Le service respecte-t-il le SRP ? (une seule responsabilite, < 8 deps)
- Y a-t-il des switch/if sur des enums de providers/canaux ? (OCP)
- Les adapters implementent-ils toutes les methodes du port ? (LSP)
- Les interfaces sont-elles fines ? (< 10 methodes) (ISP)
- Le code injecte-t-il des abstractions, pas des implementations ? (DIP)
- Y a-t-il des abstractions prematurees ? (YAGNI, Rule of Three)
- Un module CRUD est-il sur-ingenierie ? (KISS)
```

---

## 11. Tests d'architecture complets (fitness functions SOLID)

Les fitness functions ci-dessous completent celles de l'ADR-026 section 5.4. Elles sont regroupees dans un fichier unique pour le runner CI.

```typescript
// src/__tests__/architecture-solid.spec.ts
import { describe, it, expect } from 'vitest';
import { glob } from 'glob';
import { readFileSync } from 'fs';

describe('SOLID Architecture Fitness Functions (ADR-027)', () => {

  // ============ SRP ============

  describe('SRP - Single Responsibility', () => {

    it('Aucun service ne doit avoir plus de 8 dependances injectees', async () => {
      const serviceFiles = await glob('src/modules/**/*.service.ts');
      for (const file of serviceFiles) {
        const content = readFileSync(file, 'utf-8');
        const constructorMatch = content.match(/constructor\s*\(([\s\S]*?)\)\s*\{/);
        if (constructorMatch) {
          const params = constructorMatch[1]
            .split(',')
            .filter((p) => p.trim().length > 0);
          expect(
            params.length,
            `${file} a ${params.length} dependances (max 8). SRP viole.`
          ).toBeLessThanOrEqual(8);
        }
      }
    });

    it('Aucun fichier de service ne doit depasser 400 lignes', async () => {
      const serviceFiles = await glob('src/modules/**/*.service.ts');
      for (const file of serviceFiles) {
        const lineCount = readFileSync(file, 'utf-8').split('\n').length;
        expect(lineCount, `${file} : ${lineCount} lignes (max 400).`).toBeLessThanOrEqual(400);
      }
    });
  });

  // ============ OCP ============

  describe('OCP - Open/Closed', () => {

    it('Pas de switch sur PaymentMethod/Channel/Provider dans les services', async () => {
      const serviceFiles = await glob('src/modules/**/*.service.ts');
      for (const file of serviceFiles) {
        const content = readFileSync(file, 'utf-8');
        const violations = content.match(
          /switch\s*\(\s*\w*(method|Method|channel|Channel|provider|Provider|type|Type)\w*\s*\)/g
        );
        expect(
          violations,
          `${file} contient un switch sur un type extensible. Utiliser Strategy pattern.`
        ).toBeNull();
      }
    });
  });

  // ============ LSP ============

  describe('LSP - Liskov Substitution', () => {

    it('Aucun adapter ne contient NotImplementedError', async () => {
      const adapterFiles = await glob('src/modules/**/adapters/**/*.ts');
      for (const file of adapterFiles) {
        const content = readFileSync(file, 'utf-8');
        expect(content).not.toMatch(/NotImplemented/i);
        expect(content).not.toMatch(/not (yet )?implemented/i);
      }
    });
  });

  // ============ ISP ============

  describe('ISP - Interface Segregation', () => {

    it('Aucune interface ne doit avoir plus de 10 methodes', async () => {
      const tsFiles = await glob('src/modules/**/*.ts', { ignore: '**/*.spec.ts' });
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const interfaces = [...content.matchAll(
          /export\s+interface\s+(\w+)[^{]*\{([\s\S]*?)\n\}/g
        )];
        for (const match of interfaces) {
          const name = match[1];
          const body = match[2];
          const methods = (body.match(/\w+\s*\(.*?\)\s*:/g) ?? []).length;
          expect(
            methods,
            `Interface ${name} dans ${file} : ${methods} methodes (max 10). Decouper.`
          ).toBeLessThanOrEqual(10);
        }
      }
    });
  });

  // ============ DIP ============

  describe('DIP - Dependency Inversion', () => {

    it('Les controllers ne doivent pas importer Prisma', async () => {
      const controllers = await glob('src/modules/**/*.controller.ts');
      for (const file of controllers) {
        const content = readFileSync(file, 'utf-8');
        expect(content, `${file} importe Prisma.`).not.toMatch(/import.*Prisma/);
      }
    });

    it('Les services ne doivent pas importer des adapters', async () => {
      const services = await glob('src/modules/**/services/**/*.service.ts');
      for (const file of services) {
        const content = readFileSync(file, 'utf-8');
        expect(content, `${file} importe un adapter.`).not.toMatch(/from\s+['"].*\/adapters\//);
      }
    });

    it('Les @Inject utilisent des Symbol, pas des strings', async () => {
      const tsFiles = await glob('src/modules/**/*.ts', { ignore: '**/*.spec.ts' });
      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const stringInjects = content.match(/@Inject\(\s*['"][^'"]+['"]\s*\)/g);
        expect(
          stringInjects,
          `${file} utilise @Inject avec un string. Utiliser un Symbol.`
        ).toBeNull();
      }
    });
  });
});
```

---

## 12. Synthese des decisions

| # | Decision | Justification |
|---|----------|---------------|
| D1 | SRP : max 8 dependances, max 400 lignes par service | Seuils pratiques pour detecter les god services generes par l'IA |
| D2 | OCP : Strategy pattern obligatoire pour PSP, notifications, fraude | Les switch/if sur les providers sont la violation #1 de l'IA. Le DI NestJS supporte nativement les strategies |
| D3 | LSP : tests de contrat obligatoires pour chaque port avec >= 2 adapters | Seule facon de garantir que tous les adapters respectent le meme contrat |
| D4 | ISP : max 10 methodes par interface, decouper par consommateur | Interfaces fines = mocks simples dans les tests = code IA plus facile a verifier |
| D5 | DIP : ports obligatoires pour integrations externes, pas pour Prisma | Coherent avec ADR-024 D7 (hexagonal pragmatique). Les ports la ou ils apportent de la valeur |
| D6 | DRY : Rule of Three (abstraire a la 3e repetition) | Contrebalance la tendance IA a sur-abstraire des la 2e occurrence |
| D7 | KISS : modules CRUD = 4 fichiers max, pas de patterns GoF sauf > 2 variantes | Empêche l'IA de creer un framework pour un `prisma.favorite.create()` |
| D8 | YAGNI : chaque feature tracable a une US | Empêche l'IA d'ajouter du cache Redis, du soft delete, et du versioning d'API non demandes |
| D9 | Fitness functions automatisees en CI pour les 5 principes SOLID | L'IA ne retient pas les feedbacks entre sessions. Seul l'enforcement automatise est fiable |
| D10 | Ajout de regles au CLAUDE.md (racine + backend) | Le CLAUDE.md est le "contrat" que l'IA lit a chaque session. Les regles SOLID doivent y figurer |

---

## 13. Consequences

### Consequences positives

1. **Violations SOLID detectees automatiquement.** Les fitness functions et les regles ESLint/dependency-cruiser bloquent les violations en CI avant la review humaine. L'IA recoit le feedback immediatement et corrige.

2. **Code plus testable.** Les services avec 3-5 dependances au lieu de 12 sont plus simples a tester unitairement. Les ports permettent de mocker les integrations externes.

3. **Extensibilite reelle.** Ajouter un 5e PSP, un 4e canal de notification, ou une nouvelle regle de fraude ne touche aucun code existant. Uniquement un nouveau fichier adapter/evaluator + enregistrement dans le module.

4. **Coherence entre sessions IA.** Les regles dans le CLAUDE.md et les seuils en CI garantissent que l'IA respecte les memes principes d'une session a l'autre, meme sans memoire.

5. **Equilibre pragmatisme/rigueur.** Les seuils (8 deps, 400 lignes, 10 methodes) ne sont pas arbitraires -- ils sont calibres pour detecter les violations reelles sans bloquer le travail sur les modules simples.

### Consequences negatives

1. **Faux positifs des fitness functions.** Les regex sur les constructeurs et les interfaces sont des heuristiques. Des cas legitimes (ex: un orchestrateur qui coordonne 6 services) pourraient declencher un warn. Mitigation : les seuils sont des warn, pas des error pour les cas limites.

2. **Complexite du pipeline CI.** Ajouter des fitness functions et des regles dependency-cruiser augmente le temps de CI. Mitigation : ces checks sont rapides (scan de fichiers, pas d'execution de code).

3. **Resistance IA au refactoring.** Quand l'IA recoit un feedback de CI "trop de dependances", elle peut sur-reagir en creant des abstractions inutiles (ISP inverse). Mitigation : les regles CLAUDE.md incluent KISS et YAGNI pour contrebalancer.

4. **Documentation a maintenir.** Cette ADR (avec ses exemples de code) doit etre mise a jour si les seuils changent ou si de nouveaux patterns emergent. Mitigation : les exemples sont en TypeScript/NestJS, la stack principale.

---

## 14. References

- Robert C. Martin, *Agile Software Development, Principles, Patterns, and Practices* (2003) -- Definition originale de SOLID
- Robert C. Martin, *Clean Architecture: A Craftsman's Guide to Software Structure and Design* (2017)
- Martin Fowler, *Refactoring: Improving the Design of Existing Code* (2018) -- DRY, code smells
- ADR-002 : Architecture applicative -- monolithe modulaire
- ADR-005 : Architecture de paiement -- Strategy pattern PSP
- ADR-017 : State machines metier -- transition tables typees
- ADR-019 : Detection de fraude -- regles configurables
- ADR-022 : Securite applicative OWASP -- patterns interdits
- ADR-024 : Domain-Driven Design -- bounded contexts, agregats, ports & adapters
- ADR-026 : Qualite code IA -- ESLint, dependency-cruiser, metriques, fitness functions
