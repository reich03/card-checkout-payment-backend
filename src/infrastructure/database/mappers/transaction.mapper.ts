import {
  Transaction,
  TransactionProduct,
  TransactionStatus,
} from '../../../domain/entities/transaction.entity';

export interface TransactionItem {
  id: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  paymentRef: string | null;
  products: TransactionProduct[];
  cardLast4: string;
  createdAt: string;
  updatedAt: string;
}

export function toTransactionItem(transaction: Transaction): TransactionItem {
  return {
    id: transaction.id,
    status: transaction.status,
    amount: transaction.amount,
    currency: transaction.currency,
    paymentRef: transaction.paymentRef,
    products: transaction.products,
    cardLast4: transaction.cardLast4,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

export function toTransaction(item: TransactionItem): Transaction {
  return new Transaction(
    item.id,
    item.status,
    item.amount,
    item.currency,
    item.paymentRef,
    item.products,
    item.cardLast4,
    new Date(item.createdAt),
    new Date(item.updatedAt),
  );
}
