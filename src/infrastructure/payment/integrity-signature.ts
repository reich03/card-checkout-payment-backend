import { createHash } from 'crypto';

/**
 * Wompi integrity signature:
 * SHA256(reference + amountInCents + currency + integrityKey)
 */
export function generateIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integrityKey: string,
): string {
  const payload = `${reference}${amountInCents}${currency}${integrityKey}`;
  return createHash('sha256').update(payload).digest('hex');
}
