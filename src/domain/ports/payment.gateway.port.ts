import { CardInfo } from '../entities/card-info.vo';
import { TransactionStatus } from '../entities/transaction.entity';

export interface TokenizeCardResult {
  token: string;
}

export interface CreatePaymentInput {
  amountInCents: number;
  currency: string;
  customerEmail: string;
  paymentToken: string;
  installments: number;
  reference: string;
  integritySignature: string;
}

export interface PaymentResult {
  id: string;
  status: TransactionStatus;
  amountInCents: number;
  currency: string;
  reference: string;
  statusMessage?: string;
}

export interface IPaymentGateway {
  tokenizeCard(card: CardInfo): Promise<TokenizeCardResult>;
  createTransaction(input: CreatePaymentInput): Promise<PaymentResult>;
  getTransaction(paymentRef: string): Promise<PaymentResult>;
}

export const PAYMENT_GATEWAY = Symbol('IPaymentGateway');
