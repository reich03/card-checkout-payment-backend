export type { IProductRepository } from './product.repository.port';
export { PRODUCT_REPOSITORY } from './product.repository.port';

export type { ITransactionRepository } from './transaction.repository.port';
export { TRANSACTION_REPOSITORY } from './transaction.repository.port';

export type {
  IPaymentGateway,
  TokenizeCardResult,
  CreatePaymentInput,
  PaymentResult,
} from './payment.gateway.port';
export { PAYMENT_GATEWAY } from './payment.gateway.port';
