import { TransactionStatus } from '../../src/domain/entities/transaction.entity';
import type { LambdaRuntime } from '../runtime';

const mockExecute = jest.fn();

jest.mock('../runtime', () => ({
  createLambdaRuntime: jest.fn(() => ({
    eventsSecret: 'secret',
    transactionRepository: {},
    resolveTransaction: {},
    reconcilePending: { execute: mockExecute },
  })),
}));

import { handler, runReconcile } from './reconcile.handler';

describe('reconcile.handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runReconcile maps use case results and marks ok when there are no failures', async () => {
    const runtime = {
      reconcilePending: {
        execute: jest.fn().mockResolvedValue({
          scanned: 1,
          resolved: 1,
          unchanged: 0,
          failed: 0,
          errors: [],
          results: [
            {
              changed: true,
              transaction: {
                id: 'tx-1',
                paymentRef: 'pay_1',
                status: TransactionStatus.APPROVED,
              },
            },
          ],
        }),
      },
    } as unknown as LambdaRuntime;

    const result = await runReconcile(runtime);

    expect(result).toEqual({
      ok: true,
      scanned: 1,
      resolved: 1,
      unchanged: 0,
      failed: 0,
      errors: [],
    });
  });

  it('runReconcile marks ok false when the use case reports failures', async () => {
    const runtime = {
      reconcilePending: {
        execute: jest.fn().mockResolvedValue({
          scanned: 1,
          resolved: 0,
          unchanged: 0,
          failed: 1,
          errors: [{ transactionId: 'tx-1', message: 'boom' }],
          results: [],
        }),
      },
    } as unknown as LambdaRuntime;

    const result = await runReconcile(runtime);

    expect(result.ok).toBe(false);
    expect(result.failed).toBe(1);
  });

  it('runs a primary pass, waits, runs a follow-up pass, and merges the results', async () => {
    jest.useFakeTimers();

    mockExecute
      .mockResolvedValueOnce({
        scanned: 1,
        resolved: 1,
        unchanged: 0,
        failed: 0,
        errors: [],
        results: [],
      })
      .mockResolvedValueOnce({
        scanned: 2,
        resolved: 0,
        unchanged: 2,
        failed: 0,
        errors: [],
        results: [],
      });

    const pending = handler();
    await jest.advanceTimersByTimeAsync(30_000);
    const result = await pending;

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      scanned: 3,
      resolved: 1,
      unchanged: 2,
      failed: 0,
      errors: [],
    });

    jest.useRealTimers();
  });

  it('merges failures and errors from both passes', async () => {
    jest.useFakeTimers();

    mockExecute
      .mockResolvedValueOnce({
        scanned: 1,
        resolved: 0,
        unchanged: 0,
        failed: 1,
        errors: [{ transactionId: 'tx-1', message: 'first failure' }],
        results: [],
      })
      .mockResolvedValueOnce({
        scanned: 1,
        resolved: 0,
        unchanged: 0,
        failed: 1,
        errors: [{ transactionId: 'tx-2', message: 'second failure' }],
        results: [],
      });

    const pending = handler();
    await jest.advanceTimersByTimeAsync(30_000);
    const result = await pending;

    expect(result.ok).toBe(false);
    expect(result.failed).toBe(2);
    expect(result.errors).toEqual([
      { transactionId: 'tx-1', message: 'first failure' },
      { transactionId: 'tx-2', message: 'second failure' },
    ]);

    jest.useRealTimers();
  });
});
