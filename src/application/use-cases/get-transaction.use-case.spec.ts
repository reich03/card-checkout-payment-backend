import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionNotFoundError } from '../errors/application.errors';
import { GetTransactionUseCase } from './get-transaction.use-case';

describe('GetTransactionUseCase', () => {
  const transaction = Transaction.create({
    id: 'tx-1',
    amount: 100000,
    currency: 'COP',
    products: [{ productId: 'prod-1', quantity: 1, unitPrice: 100000 }],
    cardLast4: '4242',
  });

  it('returns a transaction by id', async () => {
    const transactionRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(transaction),
      update: jest.fn(),
      findPendingOlderThan: jest.fn(),
    };

    const useCase = new GetTransactionUseCase(transactionRepository);
    const result = await useCase.execute('tx-1');

    expect(result).toBe(transaction);
    expect(transactionRepository.findById).toHaveBeenCalledWith('tx-1');
  });

  it('throws when transaction does not exist', async () => {
    const transactionRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      findPendingOlderThan: jest.fn(),
    };

    const useCase = new GetTransactionUseCase(transactionRepository);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      TransactionNotFoundError,
    );
  });
});
