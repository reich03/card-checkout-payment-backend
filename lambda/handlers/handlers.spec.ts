import { createHash } from 'crypto';
import { TransactionStatus } from '../../src/domain/entities/transaction.entity';
import { runReconcile } from './reconcile.handler';
import { runWebhook } from './webhook.handler';
import type { LambdaRuntime } from '../runtime';
import type { WompiWebhookEvent } from '../../src/infrastructure/payment/webhook-signature';

describe('lambda handlers', () => {
  const secret = 'events-secret';

  const buildSignedEvent = (
    overrides?: Partial<WompiWebhookEvent['data']>,
  ): WompiWebhookEvent => {
    const data = {
      transaction: {
        id: 'pay_wompi_1',
        status: 'APPROVED',
        amount_in_cents: 90000,
        reference: 'tx-1',
        ...(overrides?.transaction as object),
      },
    };
    const timestamp = 1700000000;
    const properties = [
      'transaction.id',
      'transaction.status',
      'transaction.amount_in_cents',
    ];
    const values = ['pay_wompi_1', 'APPROVED', '90000'].join('');
    const checksum = createHash('sha256')
      .update(`${values}${timestamp}${secret}`)
      .digest('hex');

    return {
      event: 'transaction.updated',
      data,
      timestamp,
      signature: { properties, checksum },
    };
  };

  it('reconcile handler returns summary from use case', async () => {
    const runtime = {
      eventsSecret: secret,
      transactionRepository: {} as LambdaRuntime['transactionRepository'],
      resolveTransaction: {} as LambdaRuntime['resolveTransaction'],
      reconcilePending: {
        execute: jest.fn().mockResolvedValue({
          scanned: 2,
          resolved: 1,
          unchanged: 1,
          failed: 0,
          errors: [],
          results: [],
        }),
      },
    } as unknown as LambdaRuntime;

    const result = await runReconcile(runtime);
    expect(result).toEqual({
      ok: true,
      scanned: 2,
      resolved: 1,
      unchanged: 1,
      failed: 0,
      errors: [],
    });
  });

  it('webhook handler rejects invalid signature', async () => {
    const runtime = {
      eventsSecret: secret,
      transactionRepository: {
        findById: jest.fn(),
      },
      resolveTransaction: { execute: jest.fn() },
      reconcilePending: { execute: jest.fn() },
    } as unknown as LambdaRuntime;

    const response = await runWebhook(
      {
        body: JSON.stringify({
          ...buildSignedEvent(),
          signature: {
            properties: ['transaction.id'],
            checksum: 'invalid',
          },
        }),
      },
      runtime,
    );

    expect(response.statusCode).toBe(401);
  });

  it('webhook handler resolves known transaction', async () => {
    const signed = buildSignedEvent();
    const runtime = {
      eventsSecret: secret,
      transactionRepository: {
        findById: jest.fn().mockResolvedValue({
          id: 'tx-1',
          isPending: () => true,
        }),
      },
      resolveTransaction: {
        execute: jest.fn().mockResolvedValue({
          changed: true,
          transaction: {
            id: 'tx-1',
            status: TransactionStatus.APPROVED,
          },
        }),
      },
      reconcilePending: { execute: jest.fn() },
    } as unknown as LambdaRuntime;

    const response = await runWebhook(
      {
        body: JSON.stringify(signed),
        headers: { 'X-Event-Checksum': signed.signature.checksum },
      },
      runtime,
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      ok: true,
      changed: true,
      status: TransactionStatus.APPROVED,
    });
  });
});
