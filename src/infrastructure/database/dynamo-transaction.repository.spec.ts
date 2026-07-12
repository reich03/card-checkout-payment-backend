import {
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  Transaction,
  TransactionStatus,
} from '../../domain/entities/transaction.entity';
import {
  DynamoTransactionRepository,
  TRANSACTIONS_STATUS_CREATED_AT_INDEX,
} from './dynamo-transaction.repository';

describe('DynamoTransactionRepository', () => {
  const tableName = 'Transactions';

  const createTransaction = () =>
    Transaction.create({
      id: 'tx-1',
      amount: 200000,
      currency: 'COP',
      products: [{ productId: 'prod-1', quantity: 2, unitPrice: 100000 }],
      cardLast4: '4242',
      createdAt: new Date('2026-07-12T10:00:00.000Z'),
    });

  const createRepository = () => {
    const send = jest.fn();
    const client = { send } as unknown as DynamoDBDocumentClient;
    const repository = new DynamoTransactionRepository(client, tableName);
    return { repository, send };
  };

  it('saves a transaction', async () => {
    const transaction = createTransaction();
    const { repository, send } = createRepository();
    send.mockResolvedValue({});

    await expect(repository.save(transaction)).resolves.toEqual(transaction);
    expect(send).toHaveBeenCalledWith(expect.any(PutCommand));
  });

  it('finds a transaction by id', async () => {
    const transaction = createTransaction();
    const { repository, send } = createRepository();
    send.mockResolvedValue({
      Item: {
        id: transaction.id,
        status: TransactionStatus.PENDING,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentRef: null,
        products: transaction.products,
        cardLast4: transaction.cardLast4,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      },
    });

    const result = await repository.findById('tx-1');

    expect(result?.id).toBe('tx-1');
    expect(result?.status).toBe(TransactionStatus.PENDING);
    expect(send).toHaveBeenCalledWith(expect.any(GetCommand));
  });

  it('returns null when transaction does not exist', async () => {
    const { repository, send } = createRepository();
    send.mockResolvedValue({});

    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('updates a transaction', async () => {
    const transaction = createTransaction();
    const { repository, send } = createRepository();
    send.mockResolvedValue({});
    transaction.approve('pay_123', new Date('2026-07-12T10:05:00.000Z'));

    await expect(repository.update(transaction)).resolves.toEqual(transaction);
    expect(send).toHaveBeenCalledWith(expect.any(PutCommand));
  });

  it('queries pending transactions older than a date', async () => {
    const { repository, send } = createRepository();
    const pending = Transaction.create({
      id: 'tx-old',
      amount: 50000,
      currency: 'COP',
      products: [{ productId: 'prod-1', quantity: 1, unitPrice: 50000 }],
      cardLast4: '1111',
      createdAt: new Date('2026-07-12T09:00:00.000Z'),
    });

    send.mockResolvedValue({
      Items: [
        {
          id: pending.id,
          status: pending.status,
          amount: pending.amount,
          currency: pending.currency,
          paymentRef: null,
          products: pending.products,
          cardLast4: pending.cardLast4,
          createdAt: pending.createdAt.toISOString(),
          updatedAt: pending.updatedAt.toISOString(),
        },
      ],
    });

    const olderThan = new Date('2026-07-12T09:50:00.000Z');
    const result = await repository.findPendingOlderThan(olderThan);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tx-old');
    expect(send).toHaveBeenCalledWith(expect.any(QueryCommand));

    const command = send.mock.calls[0][0] as QueryCommand;
    expect(command.input.IndexName).toBe(TRANSACTIONS_STATUS_CREATED_AT_INDEX);
    expect(command.input.ExpressionAttributeValues).toEqual({
      ':status': 'PENDING',
      ':olderThan': olderThan.toISOString(),
    });
  });
});
