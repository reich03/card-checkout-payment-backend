import { Transaction, TransactionStatus } from './transaction.entity';

describe('Transaction', () => {
  const products = [{ productId: 'prod-1', quantity: 2, unitPrice: 50000 }];

  it('creates a pending transaction via factory', () => {
    const transaction = Transaction.create({
      id: 'tx-1',
      amount: 100000,
      currency: 'COP',
      products,
      cardLast4: '4242',
    });

    expect(transaction.status).toBe(TransactionStatus.PENDING);
    expect(transaction.paymentRef).toBeNull();
    expect(transaction.isPending()).toBe(true);
  });

  it('rejects zero or negative amount', () => {
    expect(
      () =>
        new Transaction(
          'tx-1',
          TransactionStatus.PENDING,
          0,
          'COP',
          null,
          products,
          '4242',
          new Date(),
          new Date(),
        ),
    ).toThrow('Transaction amount must be greater than zero');
  });

  it('rejects empty products', () => {
    expect(
      () =>
        new Transaction(
          'tx-1',
          TransactionStatus.PENDING,
          100000,
          'COP',
          null,
          [],
          '4242',
          new Date(),
          new Date(),
        ),
    ).toThrow('Transaction must include at least one product');
  });

  it('rejects invalid card last4', () => {
    expect(
      () =>
        new Transaction(
          'tx-1',
          TransactionStatus.PENDING,
          100000,
          'COP',
          null,
          products,
          '42',
          new Date(),
          new Date(),
        ),
    ).toThrow('Card last4 must be exactly 4 digits');
  });

  it('approves a pending transaction', () => {
    const transaction = Transaction.create({
      id: 'tx-1',
      amount: 100000,
      currency: 'COP',
      products,
      cardLast4: '4242',
    });

    transaction.approve('pay_ref_123');

    expect(transaction.isApproved()).toBe(true);
    expect(transaction.paymentRef).toBe('pay_ref_123');
  });

  it('declines a pending transaction', () => {
    const transaction = Transaction.create({
      id: 'tx-1',
      amount: 100000,
      currency: 'COP',
      products,
      cardLast4: '4242',
    });

    transaction.decline('pay_ref_456');

    expect(transaction.isDeclined()).toBe(true);
    expect(transaction.paymentRef).toBe('pay_ref_456');
  });

  it('does not allow approving a non-pending transaction', () => {
    const transaction = Transaction.create({
      id: 'tx-1',
      amount: 100000,
      currency: 'COP',
      products,
      cardLast4: '4242',
    });

    transaction.approve('pay_ref_123');

    expect(() => transaction.decline()).toThrow(
      'Cannot change transaction tx-1 from status APPROVED',
    );
  });

  it('requires payment reference when approving', () => {
    const transaction = Transaction.create({
      id: 'tx-1',
      amount: 100000,
      currency: 'COP',
      products,
      cardLast4: '4242',
    });

    expect(() => transaction.approve('')).toThrow(
      'Payment reference is required to approve a transaction',
    );
  });
});
