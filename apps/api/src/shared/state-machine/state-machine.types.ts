// =============================================================================
// Generic State Machine Types — ADR-017
// =============================================================================

export interface TransitionContext<TEntity> {
  entity: TEntity;
  actorId: string;
  actorRole: 'consumer' | 'partner' | 'admin' | 'system';
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface TransitionDef<TState, _TEvent, TEntity> {
  target: TState;
  guards?: Array<(ctx: TransitionContext<TEntity>) => boolean | Promise<boolean>>;
  effects?: Array<(ctx: TransitionContext<TEntity>) => Promise<void>>;
  description: string;
}

export type TransitionTable<
  TState extends string,
  TEvent extends string,
  TEntity,
> = {
  [S in TState]?: {
    [E in TEvent]?: TransitionDef<TState, TEvent, TEntity>;
  };
};
