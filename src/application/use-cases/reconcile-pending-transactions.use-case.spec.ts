import {
  Transaction,
  TransactionStatus,
} from '../../domain/entities/transaction.entity';
import { Product } from '../../domain/entities/product.entity';
import { createReconcilePendingTransactionsUseCase } from './reconcile-pending-transactions.use-case';

describe('ReconcilePendingTransactionsUseCase', () => {
  it('scans pending transactions and resolves them', async () => {
    const pending = new Transaction(
      'tx-old',
      TransactionStatus.PENDING,
      50000,
      'COP',
      'pay_1',
      [{ productId: 'prod-1', quantity: 1, unitPrice: 50000 }],
      '4242',
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-01T00:00:00.000Z'),
    );

    const productRepository = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(
        new Product('prod-1', 'Item', 'd', 50000, 3, 'https://x'),
      ),
      updateStock: jest.fn().mockResolvedValue(
        new Product('prod-1', 'Item', 'd', 50000, 2, 'https://x'),
      ),
    };

    const transactionRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      update: jest.fn().mockImplementation(async (tx: Transaction) => tx),
      findPendingOlderThan: jest.fn().mockResolvedValue([pending]),
    };

    const paymentGateway = {
      tokenizeCard: jest.fn(),
      createTransaction: jest.fn(),
      getTransaction: jest.fn().mockResolvedValue({
        id: 'pay_1',
        status: TransactionStatus.APPROVED,
        amountInCents: 50000,
        currency: 'COP',
        reference: 'tx-old',
      }),
    };

    const useCase = createReconcilePendingTransactionsUseCase(
      transactionRepository,
      productRepository,
      paymentGateway,
    );

    const summary = await useCase.execute(3);

    expect(summary.scanned).toBe(1);
    expect(summary.resolved).toBe(1);
    expect(summary.failed).toBe(0);
    expect(transactionRepository.findPendingOlderThan).toHaveBeenCalled();
  });

  it('records failures without aborting the batch', async () => {
    const pending = new Transaction(
      'tx-fail',
      TransactionStatus.PENDING,
      50000,
      'COP',
      'pay_bad',
      [{ productId: 'prod-1', quantity: 1, unitPrice: 50000 }],
      '4242',
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-01T00:00:00.000Z'),
    );

    const transactionRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      findPendingOlderThan: jest.fn().mockResolvedValue([pending]),
    };

    const productRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      updateStock: jest.fn(),
    };

    const paymentGateway = {
      tokenizeCard: jest.fn(),
      createTransaction: jest.fn(),
      getTransaction: jest.fn().mockRejectedValue(new Error('Wompi down')),
    };

    const useCase = createReconcilePendingTransactionsUseCase(
      transactionRepository,
      productRepository,
      paymentGateway,
    );

    const summary = await useCase.execute(3);
    expect(summary.failed).toBe(1);
    expect(summary.errors[0].transactionId).toBe('tx-fail');
  });
});
