import {
  computeWebhookChecksum,
  isValidWebhookSignature,
  readWebhookProperty,
  type WompiWebhookEvent,
} from './webhook-signature';

describe('webhook-signature', () => {
  const secret = 'stagtest_events_secret';

  const event: WompiWebhookEvent = {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: '1234-1610641025-49201',
        status: 'APPROVED',
        amount_in_cents: 4490000,
        reference: 'tx-ref-1',
      },
    },
    timestamp: 1530291411,
    signature: {
      properties: [
        'transaction.id',
        'transaction.status',
        'transaction.amount_in_cents',
      ],
      checksum: '',
    },
  };

  it('reads nested webhook properties', () => {
    expect(readWebhookProperty(event.data, 'transaction.status')).toBe(
      'APPROVED',
    );
  });

  it('validates checksum against events secret', () => {
    const checksum = computeWebhookChecksum(event, secret);
    const signed: WompiWebhookEvent = {
      ...event,
      signature: { ...event.signature, checksum },
    };

    expect(isValidWebhookSignature(signed, secret)).toBe(true);
    expect(isValidWebhookSignature(signed, 'wrong-secret')).toBe(false);
  });

  it('rejects mismatched X-Event-Checksum header', () => {
    const checksum = computeWebhookChecksum(event, secret);
    const signed: WompiWebhookEvent = {
      ...event,
      signature: { ...event.signature, checksum },
    };

    expect(isValidWebhookSignature(signed, secret, 'deadbeef')).toBe(false);
    expect(isValidWebhookSignature(signed, secret, checksum)).toBe(true);
  });
});
