---
name: add-fraud-rule
description: Crée une règle de détection de fraude configurable (ADR-019)
argument-hint: <RuleName>
---

# Add Fraud Rule

Crée une règle de détection de fraude `$ARGUMENTS` (ADR-019).

## Étape 1 — Définir la règle

Fichier : `src/modules/fraud/rules/<rule-name>.rule.ts`

```typescript
import { FraudRule, FraudContext, FraudVerdict } from '../domain/fraud-rule.interface';

export class <RuleName>Rule implements FraudRule {
  readonly name = '<rule-name>';
  readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  // Seuils configurables
  constructor(private readonly config: {
    threshold: number;
    windowMinutes: number;
  }) {}

  async evaluate(context: FraudContext): Promise<FraudVerdict> {
    // Logique de détection
    const count = await context.counters.get(
      `<rule-name>:${context.userId}`,
      this.config.windowMinutes,
    );

    if (count >= this.config.threshold) {
      return {
        rule: this.name,
        severity: this.severity,
        action: 'FLAG', // FLAG | BLOCK | SUSPEND
        reason: `<Human-readable reason>`,
        metadata: { count, threshold: this.config.threshold },
      };
    }

    return { rule: this.name, action: 'ALLOW' };
  }
}
```

## Étape 2 — Enregistrer la règle

Dans le module fraud :
```typescript
providers: [
  {
    provide: '<RuleName>Rule',
    useFactory: () => new <RuleName>Rule({
      threshold: 5,         // Configurable via env/admin
      windowMinutes: 60,
    }),
  },
],
```

## Étape 3 — Types de règles courantes

| Règle | Seuil | Action |
|-------|-------|--------|
| Comptes multiples (même device/IP) | 3 comptes | BLOCK |
| Réclamations excessives | 3 en 30 jours | FLAG |
| No-shows récurrents | 3 en 14 jours | SUSPEND réservations |
| Réservations massives | 10 en 1h | FLAG |
| Annulations excessives | 5 en 24h | FLAG |
| Tentatives de paiement échouées | 5 en 1h | BLOCK paiement |

## Étape 4 — Tests

- Tester sous le seuil → ALLOW
- Tester au seuil → action déclenchée
- Tester avec des contextes variés
- Tester la configurabilité des seuils

## Validation

- [ ] Règle implémente l'interface FraudRule
- [ ] Seuils configurables (pas hardcodés)
- [ ] Sévérité et action appropriées
- [ ] Tests couvrent les seuils
- [ ] Enregistrée dans le module fraud
