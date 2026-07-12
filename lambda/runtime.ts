import { createDynamoDocumentClient } from '../src/infrastructure/database/dynamodb.client';
import { DynamoProductRepository } from '../src/infrastructure/database/dynamo-product.repository';
import { DynamoTransactionRepository } from '../src/infrastructure/database/dynamo-transaction.repository';
import { PaymentGatewayAdapter } from '../src/infrastructure/payment/payment-gateway.adapter';
import { loadPaymentGatewayConfig } from '../src/infrastructure/payment/payment-gateway.config';
import {
  createReconcilePendingTransactionsUseCase,
  type ReconcilePendingTransactionsUseCase,
} from '../src/application/use-cases/reconcile-pending-transactions.use-case';
import { ResolveTransactionUseCase } from '../src/application/use-cases/resolve-transaction.use-case';
import type { ITransactionRepository } from '../src/domain/ports/transaction.repository.port';

export interface LambdaRuntime {
  transactionRepository: ITransactionRepository;
  resolveTransaction: ResolveTransactionUseCase;
  reconcilePending: ReconcilePendingTransactionsUseCase;
  eventsSecret: string;
}

export function createLambdaRuntime(
  env: NodeJS.ProcessEnv = process.env,
): LambdaRuntime {
  const productsTable = env.DYNAMODB_TABLE_PRODUCTS ?? 'Products';
  const transactionsTable = env.DYNAMODB_TABLE_TRANSACTIONS ?? 'Transactions';
  const eventsSecret = env.PAYMENT_API_EVENTS_KEY ?? '';

  const client = createDynamoDocumentClient(env.AWS_REGION ?? 'us-east-1');
  const transactionRepository = new DynamoTransactionRepository(
    client,
    transactionsTable,
  );
  const productRepository = new DynamoProductRepository(client, productsTable);
  const paymentGateway = new PaymentGatewayAdapter(
    loadPaymentGatewayConfig(env),
  );

  const resolveTransaction = new ResolveTransactionUseCase(
    transactionRepository,
    productRepository,
    paymentGateway,
  );
  const reconcilePending = createReconcilePendingTransactionsUseCase(
    transactionRepository,
    productRepository,
    paymentGateway,
  );

  return {
    transactionRepository,
    resolveTransaction,
    reconcilePending,
    eventsSecret,
  };
}
