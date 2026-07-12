import { Product } from '../../../domain/entities/product.entity';
import { Transaction } from '../../../domain/entities/transaction.entity';

export function toProductResponse(product: Product) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    imageUrl: product.imageUrl,
  };
}

export function toTransactionResponse(transaction: Transaction) {
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
