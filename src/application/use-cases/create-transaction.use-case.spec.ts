import { Product } from '../../domain/entities/product.entity';
import {
  Transaction,
  TransactionStatus,
} from '../../domain/entities/transaction.entity';
import { CreateTransactionDto } from '../dtos/create-transaction.dto';
import {
  InsufficientStockError,
  PaymentProcessingError,
  ProductNotFoundError,
} from '../errors/application.errors';
import { CreateTransactionUseCase } from './create-transaction.use-case';

describe('CreateTransactionUseCase', () => {
  const product = new Product(
    'prod-1',
    'Headphones',
    'Wireless headphones',
    100000,
    5,
    'https://cdn.example.com/headphones.png',
  );

  const dto: CreateTransactionDto = {
    products: [{ productId: 'prod-1', quantity: 2 }],
    card: {
      number: '4242424242424242',
      holderName: 'Jane Doe',
      expMonth: '12',
      expYear: '30',
      cvv: '123',
      installments: 1,
    },
    customerEmail: 'jane@example.com',
    currency: 'COP',
  };

  const createMocks = () => {
    const productRepository = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(
        new Product(
          product.id,
          product.name,
          product.description,
          product.price,
          product.stock,
          product.imageUrl,
        ),
      ),
      updateStock: jest.fn().mockImplementation(async (id: string, stock: number) => {
        return new Product(
          id,
          product.name,
          product.description,
          product.price,
          stock,
          product.imageUrl,
        );
      }),
    };

    const transactionRepository = {
      save: jest.fn().mockImplementation(async (tx: Transaction) => tx),
      findById: jest.fn(),
      update: jest.fn().mockImplementation(async (tx: Transaction) => tx),
      findPendingOlderThan: jest.fn(),
    };

    const paymentGateway = {
      tokenizeCard: jest.fn().mockResolvedValue({ token: 'tok_test' }),
      createTransaction: jest.fn().mockResolvedValue({
        id: 'pay_123',
        status: TransactionStatus.APPROVED,
        amountInCents: 200000,
        currency: 'COP',
        reference: 'ignored',
      }),
      getTransaction: jest.fn(),
    };

    const useCase = new CreateTransactionUseCase(
      productRepository,
      transactionRepository,
      paymentGateway,
    );

    return { useCase, productRepository, transactionRepository, paymentGateway };
  };

  it('creates an approved transaction and decrements stock', async () => {
    const { useCase, productRepository, transactionRepository, paymentGateway } =
      createMocks();

    const result = await useCase.execute(dto);

    expect(result.status).toBe(TransactionStatus.APPROVED);
    expect(result.amount).toBe(200000);
    expect(result.cardLast4).toBe('4242');
    expect(result.paymentRef).toBe('pay_123');
    expect(paymentGateway.tokenizeCard).toHaveBeenCalledTimes(1);
    expect(paymentGateway.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amountInCents: 200000,
        paymentToken: 'tok_test',
        customerEmail: 'jane@example.com',
        reference: result.id,
      }),
    );
    expect(productRepository.updateStock).toHaveBeenCalledWith('prod-1', 3);
    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
    expect(transactionRepository.update).toHaveBeenCalledTimes(1);
  });

  it('throws when a product does not exist', async () => {
    const { useCase, productRepository } = createMocks();
    productRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });

  it('throws when stock is insufficient', async () => {
    const { useCase, productRepository } = createMocks();
    productRepository.findById.mockResolvedValue(
      new Product(
        product.id,
        product.name,
        product.description,
        product.price,
        1,
        product.imageUrl,
      ),
    );

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      InsufficientStockError,
    );
  });

  it('marks the transaction as declined when payment is declined', async () => {
    const { useCase, productRepository, paymentGateway } = createMocks();
    paymentGateway.createTransaction.mockResolvedValue({
      id: 'pay_declined',
      status: TransactionStatus.DECLINED,
      amountInCents: 200000,
      currency: 'COP',
      reference: 'ignored',
      statusMessage: 'Insufficient funds',
    });

    const result = await useCase.execute(dto);

    expect(result.status).toBe(TransactionStatus.DECLINED);
    expect(result.paymentRef).toBe('pay_declined');
    expect(productRepository.updateStock).not.toHaveBeenCalled();
  });

  it('keeps the transaction pending when payment is still processing', async () => {
    const { useCase, productRepository, paymentGateway } = createMocks();
    paymentGateway.createTransaction.mockResolvedValue({
      id: 'pay_pending',
      status: TransactionStatus.PENDING,
      amountInCents: 200000,
      currency: 'COP',
      reference: 'ignored',
    });

    const result = await useCase.execute(dto);

    expect(result.status).toBe(TransactionStatus.PENDING);
    expect(result.paymentRef).toBe('pay_pending');
    expect(productRepository.updateStock).not.toHaveBeenCalled();
  });

  it('declines the transaction and wraps gateway failures', async () => {
    const { useCase, transactionRepository, paymentGateway } = createMocks();
    paymentGateway.tokenizeCard.mockRejectedValue(new Error('Gateway timeout'));

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      PaymentProcessingError,
    );

    expect(transactionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TransactionStatus.DECLINED,
      }),
    );
  });
});
