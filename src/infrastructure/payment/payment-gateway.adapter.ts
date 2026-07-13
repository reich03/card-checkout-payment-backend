import { Injectable } from '@nestjs/common';
import { CardInfo } from '../../domain/entities/card-info.vo';
import { TransactionStatus } from '../../domain/entities/transaction.entity';
import type {
  CreatePaymentInput,
  IPaymentGateway,
  PaymentResult,
  TokenizeCardResult,
} from '../../domain/ports/payment.gateway.port';
import { generateIntegritySignature } from './integrity-signature';
import type { PaymentGatewayConfig } from './payment-gateway.config';
import type {
  WompiMerchantResponse,
  WompiTokenResponse,
  WompiTransactionResponse,
  WompiTransactionStatus,
} from './wompi.types';

export type FetchLike = typeof fetch;

export class PaymentGatewayHttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PaymentGatewayHttpError';
  }
}

@Injectable()
export class PaymentGatewayAdapter implements IPaymentGateway {
  constructor(
    private readonly config: PaymentGatewayConfig,
    private readonly fetchFn: FetchLike = fetch,
  ) {}

  async tokenizeCard(card: CardInfo): Promise<TokenizeCardResult> {
    const response = await this.request<WompiTokenResponse>(
      'POST',
      '/tokens/cards',
      {
        number: card.sanitizedNumber,
        cvc: card.cvv,
        exp_month: card.expMonth,
        exp_year: card.expYear,
        card_holder: card.holderName,
      },
      this.config.publicKey,
    );

    const token = response.data?.id;
    if (!token) {
      throw new PaymentGatewayHttpError(
        this.extractErrorMessage(response, 'Card tokenization failed'),
        undefined,
        response,
      );
    }

    return { token };
  }

  async createTransaction(input: CreatePaymentInput): Promise<PaymentResult> {
    const acceptance = await this.getAcceptanceTokens();
    const signature = generateIntegritySignature(
      input.reference,
      input.amountInCents,
      input.currency,
      this.config.integrityKey,
    );

    const response = await this.request<WompiTransactionResponse>(
      'POST',
      '/transactions',
      {
        acceptance_token: acceptance.acceptanceToken,
        accept_personal_auth: acceptance.acceptPersonalAuth,
        amount_in_cents: input.amountInCents,
        currency: input.currency,
        customer_email: input.customerEmail,
        reference: input.reference,
        signature,
        payment_method: {
          type: 'CARD',
          token: input.paymentToken,
          installments: input.installments,
        },
      },
      this.config.privateKey,
    );

    return this.mapTransaction(response, 'Payment transaction creation failed');
  }

  async getTransaction(paymentRef: string): Promise<PaymentResult> {
    const response = await this.request<WompiTransactionResponse>(
      'GET',
      `/transactions/${encodeURIComponent(paymentRef)}`,
      undefined,
      this.config.privateKey,
    );

    console.log(
      JSON.stringify({
        message: 'wompi.get_transaction',
        paymentRef,
        wompi: {
          id: response.data?.id,
          status: response.data?.status,
          status_message: response.data?.status_message ?? null,
          amount_in_cents: response.data?.amount_in_cents,
          currency: response.data?.currency,
          reference: response.data?.reference,
        },
      }),
    );

    return this.mapTransaction(response, 'Payment transaction lookup failed');
  }

  private async getAcceptanceTokens(): Promise<{
    acceptanceToken: string;
    acceptPersonalAuth: string;
  }> {
    const response = await this.request<WompiMerchantResponse>(
      'GET',
      `/merchants/${encodeURIComponent(this.config.publicKey)}`,
      undefined,
      this.config.publicKey,
    );

    const acceptanceToken =
      response.data?.presigned_acceptance?.acceptance_token;
    const acceptPersonalAuth =
      response.data?.presigned_personal_data_auth?.acceptance_token;

    if (!acceptanceToken || !acceptPersonalAuth) {
      throw new PaymentGatewayHttpError(
        this.extractErrorMessage(response, 'Failed to fetch acceptance tokens'),
        undefined,
        response,
      );
    }

    return { acceptanceToken, acceptPersonalAuth };
  }

  private mapTransaction(
    response: WompiTransactionResponse,
    fallbackMessage: string,
  ): PaymentResult {
    const data = response.data;
    if (!data?.id || !data.status) {
      throw new PaymentGatewayHttpError(
        this.extractErrorMessage(response, fallbackMessage),
        undefined,
        response,
      );
    }

    return {
      id: data.id,
      status: this.mapStatus(data.status),
      amountInCents: data.amount_in_cents,
      currency: data.currency,
      reference: data.reference,
      statusMessage: data.status_message ?? undefined,
    };
  }

  private mapStatus(status: WompiTransactionStatus): TransactionStatus {
    switch (status) {
      case 'APPROVED':
        return TransactionStatus.APPROVED;
      case 'DECLINED':
      case 'ERROR':
      case 'VOIDED':
        return TransactionStatus.DECLINED;
      case 'PENDING':
      case 'PENDING_APPROVAL':
      default:
        return TransactionStatus.PENDING;
    }
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown | undefined,
    authKey: string,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchFn(`${this.config.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${authKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const payload = (await this.parseJson(response)) as T & {
        error?: { reason?: string; messages?: Record<string, string[]> };
      };

      if (!response.ok) {
        throw new PaymentGatewayHttpError(
          this.extractErrorMessage(
            payload,
            `Payment API error (${response.status})`,
          ),
          response.status,
          payload,
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof PaymentGatewayHttpError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new PaymentGatewayHttpError(
          `Payment API timeout after ${this.config.timeoutMs}ms`,
        );
      }

      const message =
        error instanceof Error ? error.message : 'Unknown payment API error';
      throw new PaymentGatewayHttpError(message);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parseJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { error: { reason: text } };
    }
  }

  private extractErrorMessage(
    payload: {
      error?: { reason?: string; messages?: Record<string, string[]> };
    },
    fallback: string,
  ): string {
    if (payload.error?.reason) {
      return payload.error.reason;
    }

    const messages = payload.error?.messages;
    if (messages) {
      const flattened = Object.values(messages).flat().filter(Boolean);
      if (flattened.length > 0) {
        return flattened.join('; ');
      }
    }

    return fallback;
  }
}
