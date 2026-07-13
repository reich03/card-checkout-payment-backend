export class ProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Product not found: ${productId}`);
    this.name = 'ProductNotFoundError';
  }
}

export class InsufficientStockError extends Error {
  constructor(productId: string, requested: number, available: number) {
    super(
      `Insufficient stock for product ${productId}: requested ${requested}, available ${available}`,
    );
    this.name = 'InsufficientStockError';
  }
}

export class TransactionNotFoundError extends Error {
  constructor(transactionId: string) {
    super(`Transaction not found: ${transactionId}`);
    this.name = 'TransactionNotFoundError';
  }
}

export class PaymentProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentProcessingError';
  }
}

export class ReceiptNotAvailableError extends Error {
  constructor(transactionId: string, status: string) {
    super(
      `Receipt is only available for APPROVED transactions (id=${transactionId}, status=${status})`,
    );
    this.name = 'ReceiptNotAvailableError';
  }
}
