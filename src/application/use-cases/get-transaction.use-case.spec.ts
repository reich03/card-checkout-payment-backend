import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionNotFoundError } from '../errors/application.errors';
import { GetTransactionUseCase } from './get-transaction.use-case';
import type { ResolveTransactionUseCase } from './resolve-transaction.use-case';

describe('GetTransactionUseCase', () => {
  const transaction = Transaction.create({
    id: 'tx-1',
    amount: 100000,
    currency: 'COP',
    products: [{ productId: 'prod-1', quantity: 1, unitPrice: 100000 }],
    cardLast4: '4242',
  });

  const resolveTransaction = {
    executeFromGateway: jest.fn(),
  } as unknown as ResolveTransactionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a transaction by id', async () => {
    const transactionRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(transaction),
      update: jest.fn(),
      findPendingOlderThan: jest.fn(),
    };

    const useCase = new GetTransactionUseCase(
      transactionRepository,
      resolveTransaction,
    );
    const result = await useCase.execute('tx-1');

    expect(result).toBe(transaction);
    expect(transactionRepository.findById).toHaveBeenCalledWith('tx-1');
    expect(resolveTransaction.executeFromGateway).not.toHaveBeenCalled();
  });

  it('refreshes pending transactions from the payment gateway', async () => {
    const pending = Transaction.create({
      id: 'tx-2',
      amount: 100000,
      currency: 'COP',
      products: [{ productId: 'prod-1', quantity: 1, unitPrice: 100000 }],
      cardLast4: '4242',
    });
    pending.paymentRef = 'pay_1';

    const approved = Transaction.create({
      id: 'tx-2',
      amount: 100000,
      currency: 'COP',
      products: [{ productId: 'prod-1', quantity: 1, unitPrice: 100000 }],
      cardLast4: '4242',
    });
    approved.approve('pay_1');

    (
      resolveTransaction.executeFromGateway as jest.Mock
    ).mockResolvedValue({ transaction: approved, changed: true });

    const transactionRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(pending),
      update: jest.fn(),
      findPendingOlderThan: jest.fn(),
    };

    const useCase = new GetTransactionUseCase(
      transactionRepository,
      resolveTransaction,
    );
    const result = await useCase.execute('tx-2');

    expect(resolveTransaction.executeFromGateway).toHaveBeenCalledWith(pending);
    expect(result.status).toBe(approved.status);
  });

  it('throws when transaction does not exist', async () => {
    const transactionRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      findPendingOlderThan: jest.fn(),
    };

    const useCase = new GetTransactionUseCase(
      transactionRepository,
      resolveTransaction,
    );

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      TransactionNotFoundError,
    );
  });
});
