import { DynamoTransactionRepository } from '../src/infrastructure/database/dynamo-transaction.repository';
import { ReconcilePendingTransactionsUseCase } from '../src/application/use-cases/reconcile-pending-transactions.use-case';
import { ResolveTransactionUseCase } from '../src/application/use-cases/resolve-transaction.use-case';
import { createLambdaRuntime } from './runtime';

describe('createLambdaRuntime', () => {
  const baseEnv = {
    PAYMENT_API_BASE_URL: 'https://api-sandbox.co.uat.wompi.dev/v1',
    PAYMENT_API_PUBLIC_KEY: 'pub_test',
    PAYMENT_API_PRIVATE_KEY: 'prv_test',
    PAYMENT_API_INTEGRITY_KEY: 'integrity_test',
  } as NodeJS.ProcessEnv;

  it('wires repositories, payment gateway, and use cases using defaults', () => {
    const runtime = createLambdaRuntime(baseEnv);

    expect(runtime.transactionRepository).toBeInstanceOf(
      DynamoTransactionRepository,
    );
    expect(runtime.resolveTransaction).toBeInstanceOf(
      ResolveTransactionUseCase,
    );
    expect(runtime.reconcilePending).toBeInstanceOf(
      ReconcilePendingTransactionsUseCase,
    );
    expect(runtime.eventsSecret).toBe('');
  });

  it('honors configured table names, region, and events secret', () => {
    const runtime = createLambdaRuntime({
      ...baseEnv,
      DYNAMODB_TABLE_PRODUCTS: 'CustomProducts',
      DYNAMODB_TABLE_TRANSACTIONS: 'CustomTransactions',
      AWS_REGION: 'us-west-2',
      PAYMENT_API_EVENTS_KEY: 'events-secret',
    } as NodeJS.ProcessEnv);

    expect(runtime.eventsSecret).toBe('events-secret');
    expect(runtime.transactionRepository).toBeInstanceOf(
      DynamoTransactionRepository,
    );
  });
});
