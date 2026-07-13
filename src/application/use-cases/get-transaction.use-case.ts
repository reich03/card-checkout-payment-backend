import { Inject, Injectable, Logger } from '@nestjs/common';
import { Transaction } from '../../domain/entities/transaction.entity';
import type { ITransactionRepository } from '../../domain/ports/transaction.repository.port';
import { TRANSACTION_REPOSITORY } from '../../domain/ports/transaction.repository.port';
import { TransactionNotFoundError } from '../errors/application.errors';
import { ResolveTransactionUseCase } from './resolve-transaction.use-case';

@Injectable()
export class GetTransactionUseCase {
  private readonly logger = new Logger(GetTransactionUseCase.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
    private readonly resolveTransaction: ResolveTransactionUseCase,
  ) {}

  async execute(transactionId: string): Promise<Transaction> {
    const transaction =
      await this.transactionRepository.findById(transactionId);

    if (!transaction) {
      throw new TransactionNotFoundError(transactionId);
    }

    // On demand refresh (mobile "Consultar estado"): pull latest from Wompi.
    if (transaction.isPending() && transaction.paymentRef) {
      try {
        const result =
          await this.resolveTransaction.executeFromGateway(transaction);
        return result.transaction;
      } catch (error) {
        this.logger.warn(
          `Wompi refresh failed for ${transactionId}: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
        return transaction;
      }
    }

    return transaction;
  }
}
