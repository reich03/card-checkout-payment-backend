import {
  createLambdaRuntime,
  type LambdaRuntime,
} from '../runtime';

export interface ReconcileHandlerResult {
  ok: boolean;
  scanned: number;
  resolved: number;
  unchanged: number;
  failed: number;
  errors: Array<{ transactionId: string; message: string }>;
}

/**
 * EventBridge schedule handler — reconciles PENDING transactions older than 3 minutes.
 */
export async function handler(
  _event?: unknown,
  runtime: LambdaRuntime = createLambdaRuntime(),
): Promise<ReconcileHandlerResult> {
  const olderThanMinutes = Number(
    process.env.RECONCILE_OLDER_THAN_MINUTES ?? 3,
  );

  const summary = await runtime.reconcilePending.execute(olderThanMinutes);

  console.log(
    JSON.stringify({
      message: 'reconcile.completed',
      ...summary,
      results: summary.results.map((r) => ({
        id: r.transaction.id,
        status: r.transaction.status,
        changed: r.changed,
      })),
    }),
  );

  return {
    ok: summary.failed === 0,
    scanned: summary.scanned,
    resolved: summary.resolved,
    unchanged: summary.unchanged,
    failed: summary.failed,
    errors: summary.errors,
  };
}
