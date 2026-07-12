import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { TransactionNotFoundError } from '../../../application/errors/application.errors';
import { CreateTransactionUseCase } from '../../../application/use-cases/create-transaction.use-case';
import { GetTransactionUseCase } from '../../../application/use-cases/get-transaction.use-case';
import {
  Transaction,
  TransactionStatus,
} from '../../../domain/entities/transaction.entity';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';
import { TransactionsController } from './transactions.controller';

describe('TransactionsController (integration)', () => {
  let app: INestApplication;
  const createTransactionUseCase = { execute: jest.fn() };
  const getTransactionUseCase = { execute: jest.fn() };

  const validBody = {
    products: [{ productId: 'prod-1', quantity: 1 }],
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: CreateTransactionUseCase,
          useValue: createTransactionUseCase,
        },
        { provide: GetTransactionUseCase, useValue: getTransactionUseCase },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /api/transactions creates a payment transaction', async () => {
    const transaction = Transaction.create({
      id: 'tx-1',
      amount: 100000,
      currency: 'COP',
      products: [{ productId: 'prod-1', quantity: 1, unitPrice: 100000 }],
      cardLast4: '4242',
    });
    transaction.approve('pay_123');
    createTransactionUseCase.execute.mockResolvedValue(transaction);

    const response = await request(app.getHttpServer())
      .post('/api/transactions')
      .send(validBody)
      .expect(201);

    expect(response.body).toMatchObject({
      id: 'tx-1',
      status: TransactionStatus.APPROVED,
      paymentRef: 'pay_123',
      cardLast4: '4242',
    });
    expect(createTransactionUseCase.execute).toHaveBeenCalled();
  });

  it('POST /api/transactions validates the body', async () => {
    await request(app.getHttpServer())
      .post('/api/transactions')
      .send({ products: [] })
      .expect(400);
  });

  it('GET /api/transactions/:id returns transaction status', async () => {
    const transaction = Transaction.create({
      id: 'tx-1',
      amount: 100000,
      currency: 'COP',
      products: [{ productId: 'prod-1', quantity: 1, unitPrice: 100000 }],
      cardLast4: '4242',
    });
    getTransactionUseCase.execute.mockResolvedValue(transaction);

    const response = await request(app.getHttpServer())
      .get('/api/transactions/tx-1')
      .expect(200);

    expect(response.body.id).toBe('tx-1');
    expect(getTransactionUseCase.execute).toHaveBeenCalledWith('tx-1');
  });

  it('GET /api/transactions/:id returns 404 when missing', async () => {
    getTransactionUseCase.execute.mockRejectedValue(
      new TransactionNotFoundError('missing'),
    );

    await request(app.getHttpServer())
      .get('/api/transactions/missing')
      .expect(404);
  });
});
