import {
  Transaction,
  TransactionStatus,
} from '../../domain/entities/transaction.entity';
import {
  ReceiptNotAvailableError,
  TransactionNotFoundError,
} from '../errors/application.errors';
import { GetTransactionReceiptUseCase } from './get-transaction-receipt.use-case';

describe('GetTransactionReceiptUseCase', () => {
  const approved = Transaction.create({
    id: 'abcdef12-3456-7890-abcd-ef1234567890',
    amount: 90000,
    currency: 'COP',
    products: [{ productId: 'prod-1', quantity: 2, unitPrice: 45000 }],
    cardLast4: '4242',
  });
  approved.approve('pay_abc');

  const productRepository = {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue({
      id: 'prod-1',
      name: 'Café Especial',
      description: 'Premium',
      price: 45000,
      stock: 8,
      imageUrl: 'https://example.com/x.jpg',
    }),
    updateStock: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a receipt for an approved transaction', async () => {
    const transactionRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(approved),
      update: jest.fn(),
      findPendingOlderThan: jest.fn(),
    };

    const useCase = new GetTransactionReceiptUseCase(
      transactionRepository,
      productRepository,
    );

    const receipt = await useCase.execute(approved.id);

    expect(receipt.receiptNumber).toBe('GP-ABCDEF12');
    expect(receipt.status).toBe(TransactionStatus.APPROVED);
    expect(receipt.items[0]).toMatchObject({
      name: 'Café Especial',
      quantity: 2,
      lineTotal: 90000,
    });
    expect(receipt.html).toContain('Café Especial');
    expect(receipt.html).toContain('PAGO APROBADO');
  });

  it('throws when transaction is missing', async () => {
    const transactionRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      findPendingOlderThan: jest.fn(),
    };

    const useCase = new GetTransactionReceiptUseCase(
      transactionRepository,
      productRepository,
    );

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      TransactionNotFoundError,
    );
  });

  it('throws when transaction is not approved', async () => {
    const pending = Transaction.create({
      id: 'tx-pending',
      amount: 1000,
      currency: 'COP',
      products: [{ productId: 'prod-1', quantity: 1, unitPrice: 1000 }],
      cardLast4: '1111',
    });

    const transactionRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(pending),
      update: jest.fn(),
      findPendingOlderThan: jest.fn(),
    };

    const useCase = new GetTransactionReceiptUseCase(
      transactionRepository,
      productRepository,
    );

    await expect(useCase.execute(pending.id)).rejects.toBeInstanceOf(
      ReceiptNotAvailableError,
    );
  });
});
