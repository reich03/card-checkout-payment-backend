import { Inject, Injectable } from '@nestjs/common';
import {
  Transaction,
  TransactionProduct,
  TransactionStatus,
} from '../../domain/entities/transaction.entity';
import type { IPaymentGateway } from '../../domain/ports/payment.gateway.port';
import { PAYMENT_GATEWAY } from '../../domain/ports/payment.gateway.port';
import type { IProductRepository } from '../../domain/ports/product.repository.port';
import { PRODUCT_REPOSITORY } from '../../domain/ports/product.repository.port';
import type { ITransactionRepository } from '../../domain/ports/transaction.repository.port';
import { TRANSACTION_REPOSITORY } from '../../domain/ports/transaction.repository.port';
import {
  InsufficientStockError,
  ProductNotFoundError,
} from '../errors/application.errors';

export interface ResolveTransactionInput {
  transaction: Transaction;
  status: TransactionStatus;
  paymentRef: string;
}

export interface ResolveTransactionResult {
  transaction: Transaction;
  changed: boolean;
}

/**
 * Applies a terminal (or still-pending) payment status to a local transaction.
 * Used by the scheduled reconciler and the payment webhook Lambda.
 */
@Injectable()
export class ResolveTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(
    input: ResolveTransactionInput,
  ): Promise<ResolveTransactionResult> {
    const { transaction, status, paymentRef } = input;

    if (!transaction.isPending()) {
      return { transaction, changed: false };
    }

    if (status === TransactionStatus.PENDING) {
      if (!transaction.paymentRef && paymentRef) {
        transaction.paymentRef = paymentRef;
        transaction.updatedAt = new Date();
        const saved = await this.transactionRepository.update(transaction);
        return { transaction: saved, changed: true };
      }
      return { transaction, changed: false };
    }

    if (status === TransactionStatus.APPROVED) {
      transaction.approve(paymentRef);
      await this.decrementStock(transaction.products);
      const saved = await this.transactionRepository.update(transaction);
      return { transaction: saved, changed: true };
    }

    transaction.decline(paymentRef);
    const saved = await this.transactionRepository.update(transaction);
    return { transaction: saved, changed: true };
  }

  /**
   * Loads latest status from the payment provider using paymentRef.
   */
  async executeFromGateway(
    transaction: Transaction,
  ): Promise<ResolveTransactionResult> {
    if (!transaction.isPending()) {
      return { transaction, changed: false };
    }

    if (!transaction.paymentRef) {
      return { transaction, changed: false };
    }

    const payment = await this.paymentGateway.getTransaction(
      transaction.paymentRef,
    );

    return this.execute({
      transaction,
      status: payment.status,
      paymentRef: payment.id,
    });
  }

  private async decrementStock(items: TransactionProduct[]): Promise<void> {
    for (const item of items) {
      const product = await this.productRepository.findById(item.productId);

      if (!product) {
        throw new ProductNotFoundError(item.productId);
      }

      if (!product.hasStock(item.quantity)) {
        throw new InsufficientStockError(
          product.id,
          item.quantity,
          product.stock,
        );
      }

      product.decrementStock(item.quantity);
      await this.productRepository.updateStock(product.id, product.stock);
    }
  }
}
