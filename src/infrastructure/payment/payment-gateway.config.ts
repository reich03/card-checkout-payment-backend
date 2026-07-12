export interface PaymentGatewayConfig {
  baseUrl: string;
  publicKey: string;
  privateKey: string;
  integrityKey: string;
  timeoutMs: number;
}

export function loadPaymentGatewayConfig(
  env: NodeJS.ProcessEnv = process.env,
): PaymentGatewayConfig {
  const baseUrl = env.PAYMENT_API_BASE_URL;
  const publicKey = env.PAYMENT_API_PUBLIC_KEY;
  const privateKey = env.PAYMENT_API_PRIVATE_KEY;
  const integrityKey = env.PAYMENT_API_INTEGRITY_KEY;

  if (!baseUrl || !publicKey || !privateKey || !integrityKey) {
    throw new Error(
      'Missing payment gateway configuration. Required: PAYMENT_API_BASE_URL, PAYMENT_API_PUBLIC_KEY, PAYMENT_API_PRIVATE_KEY, PAYMENT_API_INTEGRITY_KEY',
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    publicKey,
    privateKey,
    integrityKey,
    timeoutMs: Number(env.PAYMENT_API_TIMEOUT_MS ?? 15000),
  };
}
