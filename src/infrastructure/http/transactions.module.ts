import { Module } from '@nestjs/common';
import { CreateTransactionUseCase } from '../../application/use-cases/create-transaction.use-case';
import { GetTransactionUseCase } from '../../application/use-cases/get-transaction.use-case';
import { ResolveTransactionUseCase } from '../../application/use-cases/resolve-transaction.use-case';
import { TransactionsController } from '../http/controllers/transactions.controller';

@Module({
  controllers: [TransactionsController],
  providers: [
    CreateTransactionUseCase,
    GetTransactionUseCase,
    ResolveTransactionUseCase,
  ],
})
export class TransactionsModule {}
