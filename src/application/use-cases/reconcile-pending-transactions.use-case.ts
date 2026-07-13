import type { ITransactionRepository } from '../../domain/ports/transaction.repository.port';
import type { IPaymentGateway } from '../../domain/ports/payment.gateway.port';
import type { IProductRepository } from '../../domain/ports/product.repository.port';
import {
  ResolveTransactionResult,
  ResolveTransactionUseCase,
} from './resolve-transaction.use-case';

export interface ReconcilePendingResult {
  scanned: number;
  resolved: number;
  unchanged: number;
  failed: number;
  errors: Array<{ transactionId: string; message: string }>;
  results: ResolveTransactionResult[];
}

export class ReconcilePendingTransactionsUseCase {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly resolveTransaction: ResolveTransactionUseCase,
  ) {}

  /**
   * Finds PENDING transactions older than `olderThanMinutes` and resolves
   * each against the payment gateway.
   */
  async execute(olderThanMinutes: number = 3): Promise<ReconcilePendingResult> {
    const olderThan = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    const pending =
      await this.transactionRepository.findPendingOlderThan(olderThan);

    const summary: ReconcilePendingResult = {
      scanned: pending.length,
      resolved: 0,
      unchanged: 0,
      failed: 0,
      errors: [],
      results: [],
    };

    for (const transaction of pending) {
      try {
        const result =
          await this.resolveTransaction.executeFromGateway(transaction);
        summary.results.push(result);
        if (result.changed) {
          summary.resolved += 1;
        } else {
          summary.unchanged += 1;
        }
      } catch (error) {
        summary.failed += 1;
        summary.errors.push({
          transactionId: transaction.id,
          message:
            error instanceof Error ? error.message : 'Unknown reconcile error',
        });
      }
    }

    return summary;
  }
}

/** Manual wiring helper for Lambda (no Nest DI). */
export function createReconcilePendingTransactionsUseCase(
  transactionRepository: ITransactionRepository,
  productRepository: IProductRepository,
  paymentGateway: IPaymentGateway,
): ReconcilePendingTransactionsUseCase {
  const resolve = new ResolveTransactionUseCase(
    transactionRepository,
    productRepository,
    paymentGateway,
  );
  return new ReconcilePendingTransactionsUseCase(
    transactionRepository,
    resolve,
  );
}
