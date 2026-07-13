import { createHash } from 'crypto';

export interface WompiWebhookSignature {
  properties: string[];
  checksum: string;
}

export interface WompiWebhookEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
  signature: WompiWebhookSignature;
  sent_at?: string;
  environment?: string;
}

/**
 * Resolves dotted paths like `transaction.id` against the webhook `data` object.
 */
export function readWebhookProperty(
  data: Record<string, unknown>,
  path: string,
): string {
  const parts = path.split('.');
  let current: unknown = data;

  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return '';
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (current === null || current === undefined) {
    return '';
  }

  return String(current);
}

/**
 * Wompi event checksum:
 * SHA256(concat(propertyValues...) + timestamp + eventsSecret)
 */
export function computeWebhookChecksum(
  event: Pick<WompiWebhookEvent, 'data' | 'timestamp' | 'signature'>,
  eventsSecret: string,
): string {
  const propertyValues = event.signature.properties
    .map((path) => readWebhookProperty(event.data, path))
    .join('');

  const payload = `${propertyValues}${event.timestamp}${eventsSecret}`;
  return createHash('sha256').update(payload).digest('hex');
}

export function isValidWebhookSignature(
  event: WompiWebhookEvent,
  eventsSecret: string,
  headerChecksum?: string | null,
): boolean {
  if (!eventsSecret?.trim()) {
    return false;
  }
  if (
    !event?.signature?.checksum ||
    !Array.isArray(event.signature.properties)
  ) {
    return false;
  }

  const expected = computeWebhookChecksum(event, eventsSecret);
  const bodyChecksum = event.signature.checksum.toLowerCase();
  const computed = expected.toLowerCase();

  if (computed !== bodyChecksum) {
    return false;
  }

  if (headerChecksum && headerChecksum.toLowerCase() !== computed) {
    return false;
  }

  return true;
}
