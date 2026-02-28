---
name: create-state-machine
description: Crée une state machine typée avec transitions, gardes, effets (ADR-017)
argument-hint: <MachineName> in <module-name>
---

# Create State Machine

Crée une state machine typée `$ARGUMENTS` selon le pattern ADR-017.

## Étape 1 — Définir les états et événements

Fichier : `src/modules/<module>/domain/<machine-name>.state-machine.ts`

```typescript
export enum <MachineName>State {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  READY = 'READY',
  PICKED_UP = 'PICKED_UP',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  EXPIRED = 'EXPIRED',
}

export enum <MachineName>Event {
  CONFIRM = 'CONFIRM',
  PREPARE = 'PREPARE',
  PICKUP = 'PICKUP',
  COMPLETE = 'COMPLETE',
  CANCEL = 'CANCEL',
  MARK_NO_SHOW = 'MARK_NO_SHOW',
  EXPIRE = 'EXPIRE',
}
```

## Étape 2 — Définir la table de transitions

```typescript
interface Transition<C = unknown> {
  from: <MachineName>State;
  event: <MachineName>Event;
  to: <MachineName>State;
  guard?: (context: C) => boolean;
  effects?: ((context: C) => void)[];
}

const transitions: Transition<Context>[] = [
  {
    from: <MachineName>State.PENDING,
    event: <MachineName>Event.CONFIRM,
    to: <MachineName>State.CONFIRMED,
    guard: (ctx) => ctx.paymentAuthorized,
    effects: [emitReservationConfirmed, decrementStock],
  },
  // ... toutes les transitions
];
```

## Étape 3 — Créer l'exécuteur

```typescript
export function transition<C>(
  currentState: <MachineName>State,
  event: <MachineName>Event,
  context: C,
): { newState: <MachineName>State; effects: ((ctx: C) => void)[] } {
  const t = transitions.find(
    (t) => t.from === currentState && t.event === event,
  );
  if (!t) throw new InvalidTransitionError(currentState, event);
  if (t.guard && !t.guard(context)) throw new GuardFailedError(currentState, event);
  return { newState: t.to, effects: t.effects ?? [] };
}
```

## Étape 4 — Tests exhaustifs

Tester :
- **Chaque transition valide** : from + event → to correct
- **Chaque transition invalide** : combinaisons from + event non définies → erreur
- **Chaque guard** : condition true/false
- **Effets** : vérifier qu'ils sont appelés
- **Matrice complète** : toutes les combinaisons état × événement

```typescript
// Génération de la matrice de test
const allCombinations = Object.values(State).flatMap(s =>
  Object.values(Event).map(e => [s, e] as const)
);

const validTransitions = transitions.map(t => [t.from, t.event] as const);

const invalidCombinations = allCombinations.filter(
  ([s, e]) => !validTransitions.some(([vs, ve]) => vs === s && ve === e)
);

invalidCombinations.forEach(([state, event]) => {
  it(`rejects ${event} in state ${state}`, () => {
    expect(() => transition(state, event, ctx)).toThrow(InvalidTransitionError);
  });
});
```

## Validation

- [ ] Tous les états et événements sont définis dans des enums
- [ ] La table de transitions est complète
- [ ] Les guards sont des fonctions pures
- [ ] Tests couvrent toutes les transitions valides ET invalides
- [ ] Pas de dépendance framework dans la state machine
