import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CardInfo } from '../../domain/entities/card-info.vo';
import { Product } from '../../domain/entities/product.entity';
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
import { CreateTransactionDto } from '../dtos/create-transaction.dto';
import {
  InsufficientStockError,
  PaymentProcessingError,
  ProductNotFoundError,
} from '../errors/application.errors';

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(dto: CreateTransactionDto): Promise<Transaction> {
    const { products: lineItems, amount } = await this.resolveProducts(
      dto.products,
    );
    const card = new CardInfo(
      dto.card.number,
      dto.card.holderName,
      dto.card.expMonth,
      dto.card.expYear,
      dto.card.cvv,
      dto.card.installments,
    );

    let transaction = Transaction.create({
      id: randomUUID(),
      amount,
      currency: dto.currency ?? 'COP',
      products: lineItems,
      cardLast4: card.last4,
    });

    transaction = await this.transactionRepository.save(transaction);

    try {
      const { token } = await this.paymentGateway.tokenizeCard(card);
      const paymentResult = await this.paymentGateway.createTransaction({
        amountInCents: amount,
        currency: transaction.currency,
        customerEmail: dto.customerEmail,
        paymentToken: token,
        installments: card.installments,
        reference: transaction.id,
      });

      if (paymentResult.status === TransactionStatus.APPROVED) {
        transaction.approve(paymentResult.id);
        await this.decrementStock(lineItems);
      } else if (paymentResult.status === TransactionStatus.DECLINED) {
        transaction.decline(paymentResult.id);
      } else {
        transaction.paymentRef = paymentResult.id;
        transaction.updatedAt = new Date();
      }

      return this.transactionRepository.update(transaction);
    } catch (error) {
      if (transaction.isPending()) {
        transaction.decline(transaction.paymentRef);
        await this.transactionRepository.update(transaction);
      }

      if (
        error instanceof ProductNotFoundError ||
        error instanceof InsufficientStockError
      ) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : 'Payment processing failed';
      throw new PaymentProcessingError(message);
    }
  }

  private async resolveProducts(
    items: CreateTransactionDto['products'],
  ): Promise<{ products: TransactionProduct[]; amount: number }> {
    const products: TransactionProduct[] = [];
    let amount = 0;

    for (const item of items) {
      const product = await this.productRepository.findById(item.productId);

      if (!product) {
        throw new ProductNotFoundError(item.productId);
      }

      this.ensureStock(product, item.quantity);

      products.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
      });
      amount += product.price * item.quantity;
    }

    return { products, amount };
  }

  private ensureStock(product: Product, quantity: number): void {
    if (!product.hasStock(quantity)) {
      throw new InsufficientStockError(product.id, quantity, product.stock);
    }
  }

  private async decrementStock(items: TransactionProduct[]): Promise<void> {
    for (const item of items) {
      const product = await this.productRepository.findById(item.productId);

      if (!product) {
        throw new ProductNotFoundError(item.productId);
      }

      product.decrementStock(item.quantity);
      await this.productRepository.updateStock(product.id, product.stock);
    }
  }
}
