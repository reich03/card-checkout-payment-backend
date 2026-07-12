import { Transaction } from '../entities/transaction.entity';

export interface ITransactionRepository {
  save(transaction: Transaction): Promise<Transaction>;
  findById(id: string): Promise<Transaction | null>;
  update(transaction: Transaction): Promise<Transaction>;
  findPendingOlderThan(olderThan: Date): Promise<Transaction[]>;
}

export const TRANSACTION_REPOSITORY = Symbol('ITransactionRepository');
