import {
  Transaction,
  TransactionStatus,
} from '../../domain/entities/transaction.entity';
import { Product } from '../../domain/entities/product.entity';
import { ResolveTransactionUseCase } from './resolve-transaction.use-case';

describe('ResolveTransactionUseCase', () => {
  const baseTx = () =>
    new Transaction(
      'tx-1',
      TransactionStatus.PENDING,
      90000,
      'COP',
      'pay_abc',
      [{ productId: 'prod-1', quantity: 1, unitPrice: 90000 }],
      '4242',
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-01T00:00:00.000Z'),
    );

  const createMocks = () => {
    const productRepository = {
      findAll: jest.fn(),
      findById: jest
        .fn()
        .mockResolvedValue(
          new Product('prod-1', 'Kit', 'desc', 90000, 5, 'https://x'),
        ),
      updateStock: jest.fn().mockImplementation(async (_id, stock) => {
        return new Product('prod-1', 'Kit', 'desc', 90000, stock, 'https://x');
      }),
    };

    const transactionRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      update: jest.fn().mockImplementation(async (tx: Transaction) => tx),
      findPendingOlderThan: jest.fn(),
    };

    const paymentGateway = {
      tokenizeCard: jest.fn(),
      createTransaction: jest.fn(),
      getTransaction: jest.fn(),
    };

    const useCase = new ResolveTransactionUseCase(
      transactionRepository,
      productRepository,
      paymentGateway,
    );

    return {
      useCase,
      productRepository,
      transactionRepository,
      paymentGateway,
    };
  };

  it('approves pending transaction and decrements stock', async () => {
    const { useCase, productRepository, transactionRepository } = createMocks();
    const result = await useCase.execute({
      transaction: baseTx(),
      status: TransactionStatus.APPROVED,
      paymentRef: 'pay_abc',
    });

    expect(result.changed).toBe(true);
    expect(result.transaction.status).toBe(TransactionStatus.APPROVED);
    expect(productRepository.updateStock).toHaveBeenCalledWith('prod-1', 4);
    expect(transactionRepository.update).toHaveBeenCalled();
  });

  it('declines pending transaction without touching stock', async () => {
    const { useCase, productRepository } = createMocks();
    const result = await useCase.execute({
      transaction: baseTx(),
      status: TransactionStatus.DECLINED,
      paymentRef: 'pay_abc',
    });

    expect(result.changed).toBe(true);
    expect(result.transaction.status).toBe(TransactionStatus.DECLINED);
    expect(productRepository.updateStock).not.toHaveBeenCalled();
  });

  it('is idempotent when transaction is already terminal', async () => {
    const { useCase, transactionRepository } = createMocks();
    const approved = baseTx();
    approved.approve('pay_abc');

    const result = await useCase.execute({
      transaction: approved,
      status: TransactionStatus.APPROVED,
      paymentRef: 'pay_abc',
    });

    expect(result.changed).toBe(false);
    expect(transactionRepository.update).not.toHaveBeenCalled();
  });

  it('resolves via payment gateway lookup', async () => {
    const { useCase, paymentGateway } = createMocks();
    paymentGateway.getTransaction.mockResolvedValue({
      id: 'pay_abc',
      status: TransactionStatus.APPROVED,
      amountInCents: 90000,
      currency: 'COP',
      reference: 'tx-1',
    });

    const result = await useCase.executeFromGateway(baseTx());
    expect(result.changed).toBe(true);
    expect(result.transaction.status).toBe(TransactionStatus.APPROVED);
  });
});
