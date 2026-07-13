import { TransactionStatus } from '../../src/domain/entities/transaction.entity';
import {
  isValidWebhookSignature,
  type WompiWebhookEvent,
} from '../../src/infrastructure/payment/webhook-signature';
import {
  createLambdaRuntime,
  type LambdaRuntime,
} from '../runtime';

export interface ApiGatewayProxyEvent {
  body?: string | null;
  headers?: Record<string, string | undefined>;
  isBase64Encoded?: boolean;
}

export interface ApiGatewayProxyResult {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

function mapWompiStatus(status: string | undefined): TransactionStatus {
  switch ((status ?? '').toUpperCase()) {
    case 'APPROVED':
      return TransactionStatus.APPROVED;
    case 'DECLINED':
    case 'ERROR':
    case 'VOIDED':
      return TransactionStatus.DECLINED;
    default:
      return TransactionStatus.PENDING;
  }
}

function getHeader(
  headers: Record<string, string | undefined> | undefined,
  name: string,
): string | undefined {
  if (!headers) {
    return undefined;
  }
  const target = name.toLowerCase();
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === target,
  );
  return entry?.[1];
}

function parseBody(event: ApiGatewayProxyEvent): WompiWebhookEvent {
  if (!event.body) {
    throw new Error('Missing request body');
  }

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  return JSON.parse(raw) as WompiWebhookEvent;
}

function json(statusCode: number, payload: unknown): ApiGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

export async function runWebhook(
  event: ApiGatewayProxyEvent,
  runtime: LambdaRuntime = createLambdaRuntime(),
): Promise<ApiGatewayProxyResult> {
  let payload: WompiWebhookEvent;

  try {
    payload = parseBody(event);
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body' });
  }

  const headerChecksum = getHeader(event.headers, 'X-Event-Checksum');

  if (!isValidWebhookSignature(payload, runtime.eventsSecret, headerChecksum)) {
    return json(401, { ok: false, error: 'Invalid webhook signature' });
  }

  if (payload.event !== 'transaction.updated') {
    console.log(
      JSON.stringify({
        message: 'wompi.webhook.ignored',
        event: payload.event,
      }),
    );
    return json(200, { ok: true, ignored: true, event: payload.event });
  }

  const txData = payload.data?.transaction as
    | {
        id?: string;
        reference?: string;
        status?: string;
        status_message?: string;
        amount_in_cents?: number;
        currency?: string;
      }
    | undefined;

  console.log(
    JSON.stringify({
      message: 'wompi.webhook.received',
      event: payload.event,
      wompi: {
        id: txData?.id,
        reference: txData?.reference,
        status: txData?.status,
        status_message: txData?.status_message ?? null,
        amount_in_cents: txData?.amount_in_cents,
        currency: txData?.currency,
      },
    }),
  );

  if (!txData?.reference || !txData.id) {
    return json(400, {
      ok: false,
      error: 'Missing transaction.reference or transaction.id',
    });
  }

  const transaction = await runtime.transactionRepository.findById(
    txData.reference,
  );

  if (!transaction) {
    return json(404, {
      ok: false,
      error: `Transaction not found for reference ${txData.reference}`,
    });
  }

  try {
    const result = await runtime.resolveTransaction.execute({
      transaction,
      status: mapWompiStatus(txData.status),
      paymentRef: txData.id,
    });

    return json(200, {
      ok: true,
      changed: result.changed,
      transactionId: result.transaction.id,
      status: result.transaction.status,
    });
  } catch (error) {
    console.error('webhook.resolve_failed', error);
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Resolve failed',
    });
  }
}

/**
 * API Gateway HTTP handler — Wompi `transaction.updated` webhook.
 * NOTE: AWS invokes handler(event, context). Runtime must not be arg #2.
 */
export async function handler(
  event: ApiGatewayProxyEvent,
): Promise<ApiGatewayProxyResult> {
  return runWebhook(event, createLambdaRuntime());
}
