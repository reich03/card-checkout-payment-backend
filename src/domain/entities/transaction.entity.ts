export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
}

export interface TransactionProduct {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export class Transaction {
  constructor(
    public readonly id: string,
    public status: TransactionStatus,
    public readonly amount: number,
    public readonly currency: string,
    public paymentRef: string | null,
    public readonly products: TransactionProduct[],
    public readonly cardLast4: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    this.validate();
  }

  static create(params: {
    id: string;
    amount: number;
    currency: string;
    products: TransactionProduct[];
    cardLast4: string;
    createdAt?: Date;
  }): Transaction {
    const now = params.createdAt ?? new Date();
    return new Transaction(
      params.id,
      TransactionStatus.PENDING,
      params.amount,
      params.currency,
      null,
      params.products,
      params.cardLast4,
      now,
      now,
    );
  }

  private validate(): void {
    if (!this.id?.trim()) {
      throw new Error('Transaction id is required');
    }
    if (this.amount <= 0) {
      throw new Error('Transaction amount must be greater than zero');
    }
    if (!this.currency?.trim()) {
      throw new Error('Transaction currency is required');
    }
    if (!this.products?.length) {
      throw new Error('Transaction must include at least one product');
    }
    for (const item of this.products) {
      if (!item.productId?.trim()) {
        throw new Error('Transaction product id is required');
      }
      if (item.quantity <= 0) {
        throw new Error(
          'Transaction product quantity must be greater than zero',
        );
      }
      if (item.unitPrice < 0) {
        throw new Error('Transaction product unit price cannot be negative');
      }
    }
    if (!/^\d{4}$/.test(this.cardLast4)) {
      throw new Error('Card last4 must be exactly 4 digits');
    }
  }

  isPending(): boolean {
    return this.status === TransactionStatus.PENDING;
  }

  isApproved(): boolean {
    return this.status === TransactionStatus.APPROVED;
  }

  isDeclined(): boolean {
    return this.status === TransactionStatus.DECLINED;
  }

  approve(paymentRef: string, updatedAt: Date = new Date()): void {
    this.ensurePending();
    if (!paymentRef?.trim()) {
      throw new Error('Payment reference is required to approve a transaction');
    }
    this.status = TransactionStatus.APPROVED;
    this.paymentRef = paymentRef;
    this.updatedAt = updatedAt;
  }

  decline(
    paymentRef: string | null = null,
    updatedAt: Date = new Date(),
  ): void {
    this.ensurePending();
    this.status = TransactionStatus.DECLINED;
    this.paymentRef = paymentRef;
    this.updatedAt = updatedAt;
  }

  private ensurePending(): void {
    if (!this.isPending()) {
      throw new Error(
        `Cannot change transaction ${this.id} from status ${this.status}`,
      );
    }
  }
}
