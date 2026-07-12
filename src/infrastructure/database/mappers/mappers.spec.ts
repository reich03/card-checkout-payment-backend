import { toProduct, toProductItem } from './product.mapper';
import { Product } from '../../../domain/entities/product.entity';
import {
  toTransaction,
  toTransactionItem,
} from './transaction.mapper';
import {
  Transaction,
  TransactionStatus,
} from '../../../domain/entities/transaction.entity';

describe('product mapper', () => {
  it('maps product to item and back', () => {
    const product = new Product(
      'prod-1',
      'Headphones',
      'Wireless',
      100000,
      5,
      'https://cdn.example.com/p.png',
    );

    const item = toProductItem(product);
    expect(toProduct(item)).toEqual(product);
  });
});

describe('transaction mapper', () => {
  it('maps transaction to item and back', () => {
    const transaction = new Transaction(
      'tx-1',
      TransactionStatus.APPROVED,
      100000,
      'COP',
      'pay_1',
      [{ productId: 'prod-1', quantity: 1, unitPrice: 100000 }],
      '4242',
      new Date('2026-07-12T10:00:00.000Z'),
      new Date('2026-07-12T10:01:00.000Z'),
    );

    const item = toTransactionItem(transaction);
    expect(item.createdAt).toBe('2026-07-12T10:00:00.000Z');
    expect(toTransaction(item)).toEqual(transaction);
  });
});
