import { createHash } from 'crypto';
import { TransactionStatus } from '../../src/domain/entities/transaction.entity';
import type { WompiWebhookEvent } from '../../src/infrastructure/payment/webhook-signature';
import type { LambdaRuntime } from '../runtime';

const mockCreateLambdaRuntime = jest.fn();

jest.mock('../runtime', () => ({
  createLambdaRuntime: mockCreateLambdaRuntime,
}));

import { handler, runWebhook } from './webhook.handler';

describe('webhook.handler', () => {
  const secret = 'events-secret';

  const buildSignedEvent = (
    overrides?: Partial<{
      event: string;
      transaction: Record<string, unknown>;
    }>,
  ): WompiWebhookEvent => {
    const transaction = {
      id: 'pay_wompi_1',
      status: 'APPROVED',
      amount_in_cents: 90000,
      reference: 'tx-1',
      ...overrides?.transaction,
    };
    const data = { transaction };
    const timestamp = 1700000000;
    const properties = [
      'transaction.id',
      'transaction.status',
      'transaction.amount_in_cents',
    ];
    const toValue = (value: unknown): string =>
      value === undefined || value === null ? '' : String(value);
    const values = [
      toValue(transaction.id),
      toValue(transaction.status),
      toValue(transaction.amount_in_cents),
    ].join('');
    const checksum = createHash('sha256')
      .update(`${values}${timestamp}${secret}`)
      .digest('hex');

    return {
      event: overrides?.event ?? 'transaction.updated',
      data,
      timestamp,
      signature: { properties, checksum },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when the request body is missing', async () => {
    const runtime = {
      eventsSecret: secret,
      transactionRepository: { findById: jest.fn() },
      resolveTransaction: { execute: jest.fn() },
      reconcilePending: { execute: jest.fn() },
    } as unknown as LambdaRuntime;

    const response = await runWebhook({}, runtime);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({
      ok: false,
      error: 'Invalid JSON body',
    });
  });

  it('returns 400 when the request body is not valid JSON', async () => {
    const runtime = {
      eventsSecret: secret,
      transactionRepository: { findById: jest.fn() },
      resolveTransaction: { execute: jest.fn() },
      reconcilePending: { execute: jest.fn() },
    } as unknown as LambdaRuntime;

    const response = await runWebhook({ body: '{not-json' }, runtime);

    expect(response.statusCode).toBe(400);
  });

  it('ignores events other than transaction.updated', async () => {
    const signed = buildSignedEvent({ event: 'transaction.created' });
    // Recompute checksum for the overridden event name is unnecessary since
    // the checksum only covers `data`/`timestamp`, not the event name.
    const runtime = {
      eventsSecret: secret,
      transactionRepository: { findById: jest.fn() },
      resolveTransaction: { execute: jest.fn() },
      reconcilePending: { execute: jest.fn() },
    } as unknown as LambdaRuntime;

    const response = await runWebhook({ body: JSON.stringify(signed) }, runtime);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      ok: true,
      ignored: true,
      event: 'transaction.created',
    });
  });

  it('returns 400 when the transaction reference or id is missing', async () => {
    const signed = buildSignedEvent({ transaction: { id: undefined } });
    const runtime = {
      eventsSecret: secret,
      transactionRepository: { findById: jest.fn() },
      resolveTransaction: { execute: jest.fn() },
      reconcilePending: { execute: jest.fn() },
    } as unknown as LambdaRuntime;

    const response = await runWebhook({ body: JSON.stringify(signed) }, runtime);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toContain(
      'Missing transaction.reference or transaction.id',
    );
  });

  it('returns 404 when no local transaction matches the reference', async () => {
    const signed = buildSignedEvent();
    const runtime = {
      eventsSecret: secret,
      transactionRepository: { findById: jest.fn().mockResolvedValue(null) },
      resolveTransaction: { execute: jest.fn() },
      reconcilePending: { execute: jest.fn() },
    } as unknown as LambdaRuntime;

    const response = await runWebhook({ body: JSON.stringify(signed) }, runtime);

    expect(response.statusCode).toBe(404);
  });

  it('returns 500 when resolving the transaction throws', async () => {
    const signed = buildSignedEvent();
    const runtime = {
      eventsSecret: secret,
      transactionRepository: {
        findById: jest.fn().mockResolvedValue({ id: 'tx-1', isPending: () => true }),
      },
      resolveTransaction: {
        execute: jest.fn().mockRejectedValue(new Error('DB unavailable')),
      },
      reconcilePending: { execute: jest.fn() },
    } as unknown as LambdaRuntime;

    const response = await runWebhook({ body: JSON.stringify(signed) }, runtime);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toMatchObject({
      ok: false,
      error: 'DB unavailable',
    });
  });

  it('maps a declined Wompi status to DECLINED when resolving', async () => {
    const signed = buildSignedEvent({ transaction: { status: 'DECLINED' } });
    const executeMock = jest.fn().mockResolvedValue({
      changed: true,
      transaction: { id: 'tx-1', status: TransactionStatus.DECLINED },
    });
    const runtime = {
      eventsSecret: secret,
      transactionRepository: {
        findById: jest.fn().mockResolvedValue({ id: 'tx-1', isPending: () => true }),
      },
      resolveTransaction: { execute: executeMock },
      reconcilePending: { execute: jest.fn() },
    } as unknown as LambdaRuntime;

    const response = await runWebhook({ body: JSON.stringify(signed) }, runtime);

    expect(response.statusCode).toBe(200);
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: TransactionStatus.DECLINED }),
    );
  });

  it('maps an unknown Wompi status to PENDING when resolving', async () => {
    const signed = buildSignedEvent({ transaction: { status: 'VOIDED' } });
    const executeMock = jest.fn().mockResolvedValue({
      changed: false,
      transaction: { id: 'tx-1', status: TransactionStatus.DECLINED },
    });
    const runtime = {
      eventsSecret: secret,
      transactionRepository: {
        findById: jest.fn().mockResolvedValue({ id: 'tx-1', isPending: () => true }),
      },
      resolveTransaction: { execute: executeMock },
      reconcilePending: { execute: jest.fn() },
    } as unknown as LambdaRuntime;

    await runWebhook({ body: JSON.stringify(signed) }, runtime);

    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: TransactionStatus.DECLINED }),
    );

    const signedUnknown = buildSignedEvent({ transaction: { status: 'SOMETHING_ELSE' } });
    await runWebhook({ body: JSON.stringify(signedUnknown) }, runtime);

    expect(executeMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: TransactionStatus.PENDING }),
    );
  });

  it('reads the checksum header case-insensitively', async () => {
    const signed = buildSignedEvent();
    const runtime = {
      eventsSecret: secret,
      transactionRepository: {
        findById: jest.fn().mockResolvedValue({ id: 'tx-1', isPending: () => true }),
      },
      resolveTransaction: {
        execute: jest.fn().mockResolvedValue({
          changed: true,
          transaction: { id: 'tx-1', status: TransactionStatus.APPROVED },
        }),
      },
      reconcilePending: { execute: jest.fn() },
    } as unknown as LambdaRuntime;

    const response = await runWebhook(
      {
        body: JSON.stringify(signed),
        headers: { 'x-event-checksum': signed.signature.checksum },
      },
      runtime,
    );

    expect(response.statusCode).toBe(200);
  });

  it('delegates to createLambdaRuntime when invoked as a Lambda handler', async () => {
    const signed = buildSignedEvent();
    mockCreateLambdaRuntime.mockReturnValue({
      eventsSecret: secret,
      transactionRepository: {
        findById: jest.fn().mockResolvedValue({ id: 'tx-1', isPending: () => true }),
      },
      resolveTransaction: {
        execute: jest.fn().mockResolvedValue({
          changed: true,
          transaction: { id: 'tx-1', status: TransactionStatus.APPROVED },
        }),
      },
      reconcilePending: { execute: jest.fn() },
    });

    const response = await handler({ body: JSON.stringify(signed) });

    expect(mockCreateLambdaRuntime).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(200);
  });
});
