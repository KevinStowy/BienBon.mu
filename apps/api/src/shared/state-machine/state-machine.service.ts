// =============================================================================
// Generic State Machine Engine — ADR-017
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { DomainException, ErrorCode } from '@bienbon/shared-types';
import type { TransitionContext, TransitionDef, TransitionTable } from './state-machine.types';

@Injectable()
export class StateMachineService {
  private readonly logger = new Logger(StateMachineService.name);

  /**
   * Execute a state machine transition.
   *
   * 1. Validates the transition exists in the table.
   * 2. Runs all guards — if any fails, throws DomainException.
   * 3. Runs all effects asynchronously (side effects).
   * 4. Returns the target state.
   */
  async transition<TState extends string, TEvent extends string, TEntity>(
    currentState: TState,
    event: TEvent,
    table: TransitionTable<TState, TEvent, TEntity>,
    ctx: TransitionContext<TEntity>,
  ): Promise<TState> {
    const stateTransitions = table[currentState];

    if (!stateTransitions) {
      throw new DomainException(
        ErrorCode.PARTNER_INVALID_STATUS_TRANSITION,
        `No transitions defined for state "${currentState}"`,
        { currentState, event },
      );
    }

    const transitionDef = stateTransitions[event] as
      | TransitionDef<TState, TEvent, TEntity>
      | undefined;

    if (!transitionDef) {
      throw new DomainException(
        ErrorCode.PARTNER_INVALID_STATUS_TRANSITION,
        `Invalid transition: "${event}" is not allowed from state "${currentState}"`,
        { currentState, event },
      );
    }

    // Run guards
    if (transitionDef.guards) {
      for (const guard of transitionDef.guards) {
        const passed = await guard(ctx);
        if (!passed) {
          throw new DomainException(
            ErrorCode.PARTNER_INVALID_STATUS_TRANSITION,
            `Transition guard failed for event "${event}" from state "${currentState}"`,
            { currentState, event, actorId: ctx.actorId, actorRole: ctx.actorRole },
          );
        }
      }
    }

    // Run effects (fire and forget with error logging)
    if (transitionDef.effects) {
      for (const effect of transitionDef.effects) {
        try {
          await effect(ctx);
        } catch (err) {
          this.logger.error(
            `Effect failed during transition "${event}" from state "${currentState}": ${err instanceof Error ? err.message : String(err)}`,
          );
          // Effects are not rolled back — they are logged and execution continues
        }
      }
    }

    this.logger.debug(
      `Transition: ${currentState} --[${event}]--> ${transitionDef.target} (actor: ${ctx.actorId})`,
    );

    return transitionDef.target;
  }
}
