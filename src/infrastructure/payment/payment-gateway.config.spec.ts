import { loadPaymentGatewayConfig } from './payment-gateway.config';

describe('loadPaymentGatewayConfig', () => {
  const validEnv = {
    PAYMENT_API_BASE_URL: 'https://api-sandbox.co.uat.wompi.dev/v1/',
    PAYMENT_API_PUBLIC_KEY: 'pub_test',
    PAYMENT_API_PRIVATE_KEY: 'prv_test',
    PAYMENT_API_INTEGRITY_KEY: 'integrity_test',
  };

  it('builds a config from environment variables and strips a trailing slash', () => {
    const config = loadPaymentGatewayConfig(validEnv);

    expect(config).toEqual({
      baseUrl: 'https://api-sandbox.co.uat.wompi.dev/v1',
      publicKey: 'pub_test',
      privateKey: 'prv_test',
      integrityKey: 'integrity_test',
      timeoutMs: 15000,
    });
  });

  it('parses a custom timeout from the environment', () => {
    const config = loadPaymentGatewayConfig({
      ...validEnv,
      PAYMENT_API_TIMEOUT_MS: '5000',
    });

    expect(config.timeoutMs).toBe(5000);
  });

  it.each([
    'PAYMENT_API_BASE_URL',
    'PAYMENT_API_PUBLIC_KEY',
    'PAYMENT_API_PRIVATE_KEY',
    'PAYMENT_API_INTEGRITY_KEY',
  ])('throws when %s is missing', (key) => {
    const env = { ...validEnv, [key]: undefined };

    expect(() => loadPaymentGatewayConfig(env)).toThrow(
      'Missing payment gateway configuration',
    );
  });
});
