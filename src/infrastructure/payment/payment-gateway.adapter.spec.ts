import { CardInfo } from '../../domain/entities/card-info.vo';
import { TransactionStatus } from '../../domain/entities/transaction.entity';
import {
  PaymentGatewayAdapter,
  PaymentGatewayHttpError,
} from './payment-gateway.adapter';
import type { PaymentGatewayConfig } from './payment-gateway.config';

describe('PaymentGatewayAdapter', () => {
  const config: PaymentGatewayConfig = {
    baseUrl: 'https://api-sandbox.co.uat.wompi.dev/v1',
    publicKey: 'pub_test',
    privateKey: 'prv_test',
    integrityKey: 'integrity_test',
    timeoutMs: 5000,
  };

  const card = new CardInfo(
    '4242424242424242',
    'Jane Doe',
    '12',
    '30',
    '123',
    1,
  );

  const createAdapter = (fetchFn: typeof fetch) =>
    new PaymentGatewayAdapter(config, fetchFn);

  const jsonResponse = (body: unknown, status = 200): Response =>
    ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    }) as Response;

  it('tokenizes a card using the public key', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse({
        status: 'CREATED',
        data: { id: 'tok_test_123' },
      }),
    );

    const adapter = createAdapter(fetchFn);
    const result = await adapter.tokenizeCard(card);

    expect(result).toEqual({ token: 'tok_test_123' });
    expect(fetchFn).toHaveBeenCalledWith(
      `${config.baseUrl}/tokens/cards`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${config.publicKey}`,
        }),
      }),
    );

    const body = JSON.parse(
      (fetchFn.mock.calls[0][1] as RequestInit).body as string,
    ) as Record<string, string>;
    expect(body).toEqual({
      number: '4242424242424242',
      cvc: '123',
      exp_month: '12',
      exp_year: '30',
      card_holder: 'Jane Doe',
    });
  });

  it('creates a transaction with acceptance tokens and integrity signature', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            presigned_acceptance: {
              acceptance_token: 'acceptance-token',
            },
            presigned_personal_data_auth: {
              acceptance_token: 'personal-auth-token',
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            id: 'pay_123',
            status: 'APPROVED',
            amount_in_cents: 200000,
            currency: 'COP',
            reference: 'tx-1',
            status_message: 'Approved',
          },
        }),
      );

    const adapter = createAdapter(fetchFn);
    const result = await adapter.createTransaction({
      amountInCents: 200000,
      currency: 'COP',
      customerEmail: 'jane@example.com',
      paymentToken: 'tok_test_123',
      installments: 1,
      reference: 'tx-1',
    });

    expect(result).toEqual({
      id: 'pay_123',
      status: TransactionStatus.APPROVED,
      amountInCents: 200000,
      currency: 'COP',
      reference: 'tx-1',
      statusMessage: 'Approved',
    });

    expect(fetchFn).toHaveBeenNthCalledWith(
      1,
      `${config.baseUrl}/merchants/${config.publicKey}`,
      expect.objectContaining({ method: 'GET' }),
    );

    const transactionBody = JSON.parse(
      (fetchFn.mock.calls[1][1] as RequestInit).body as string,
    ) as {
      acceptance_token: string;
      accept_personal_auth: string;
      signature: string;
      payment_method: { type: string; token: string; installments: number };
    };

    expect(transactionBody.acceptance_token).toBe('acceptance-token');
    expect(transactionBody.accept_personal_auth).toBe('personal-auth-token');
    expect(transactionBody.signature).toHaveLength(64);
    expect(transactionBody.payment_method).toEqual({
      type: 'CARD',
      token: 'tok_test_123',
      installments: 1,
    });
  });

  it('maps declined gateway statuses to DECLINED', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse({
        data: {
          id: 'pay_declined',
          status: 'DECLINED',
          amount_in_cents: 200000,
          currency: 'COP',
          reference: 'tx-2',
          status_message: 'Insufficient funds',
        },
      }),
    );

    const adapter = createAdapter(fetchFn);
    const result = await adapter.getTransaction('pay_declined');

    expect(result.status).toBe(TransactionStatus.DECLINED);
    expect(result.statusMessage).toBe('Insufficient funds');
  });

  it('throws on non-2xx responses', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            reason: 'Invalid public key',
          },
        },
        401,
      ),
    );

    const adapter = createAdapter(fetchFn);

    await expect(adapter.tokenizeCard(card)).rejects.toBeInstanceOf(
      PaymentGatewayHttpError,
    );
    await expect(adapter.tokenizeCard(card)).rejects.toThrow('Invalid public key');
  });

  it('throws on timeout', async () => {
    const fetchFn = jest.fn().mockImplementation(() => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    const adapter = createAdapter(fetchFn);

    await expect(adapter.getTransaction('pay_1')).rejects.toThrow(
      'Payment API timeout after 5000ms',
    );
  });
});
