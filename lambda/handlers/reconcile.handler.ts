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
  /** Present when the handler runs the mid-minute follow-up pass. */
  pass?: 'primary' | 'follow_up';
}

const FOLLOW_UP_DELAY_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runReconcile(
  runtime: LambdaRuntime = createLambdaRuntime(),
): Promise<ReconcileHandlerResult> {
  const olderThanMinutes = Number(
    process.env.RECONCILE_OLDER_THAN_MINUTES ?? 0,
  );

  const summary = await runtime.reconcilePending.execute(olderThanMinutes);

  console.log(
    JSON.stringify({
      message: 'reconcile.completed',
      olderThanMinutes,
      ...summary,
      results: summary.results.map((r) => ({
        id: r.transaction.id,
        paymentRef: r.transaction.paymentRef,
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

function mergePasses(
  first: ReconcileHandlerResult,
  second: ReconcileHandlerResult,
): ReconcileHandlerResult {
  return {
    ok: first.ok && second.ok,
    scanned: first.scanned + second.scanned,
    resolved: first.resolved + second.resolved,
    unchanged: first.unchanged + second.unchanged,
    failed: first.failed + second.failed,
    errors: [...first.errors, ...second.errors],
  };
}

/**
 * EventBridge schedule handler.
 * EventBridge min rate is 1 minute, so we run once, wait 30s, run again
 * (~every 30s). Timeout must be > 30s + reconcile work.
 * NOTE: AWS always invokes as handler(event, context) — do not put runtime
 * in the 2nd parameter or it will shadow createLambdaRuntime().
 */
export async function handler(_event?: unknown): Promise<ReconcileHandlerResult> {
  const primary = await runReconcile(createLambdaRuntime());
  primary.pass = 'primary';

  console.log(
    JSON.stringify({
      message: 'reconcile.waiting_follow_up',
      delayMs: FOLLOW_UP_DELAY_MS,
    }),
  );
  await sleep(FOLLOW_UP_DELAY_MS);

  const followUp = await runReconcile(createLambdaRuntime());
  followUp.pass = 'follow_up';

  return mergePasses(primary, followUp);
}
