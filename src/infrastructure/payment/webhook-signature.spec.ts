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

  it('returns an empty string when an intermediate path segment is not an object', () => {
    expect(
      readWebhookProperty(event.data, 'transaction.status.nested'),
    ).toBe('');
  });

  it('returns an empty string when the resolved value is null or undefined', () => {
    expect(
      readWebhookProperty(event.data, 'transaction.missing_field'),
    ).toBe('');
  });

  it('rejects when the events secret is empty or blank', () => {
    const checksum = computeWebhookChecksum(event, secret);
    const signed: WompiWebhookEvent = {
      ...event,
      signature: { ...event.signature, checksum },
    };

    expect(isValidWebhookSignature(signed, '')).toBe(false);
    expect(isValidWebhookSignature(signed, '   ')).toBe(false);
  });

  it('rejects when the signature checksum or properties are malformed', () => {
    expect(
      isValidWebhookSignature(
        { ...event, signature: { properties: [], checksum: '' } },
        secret,
      ),
    ).toBe(false);

    expect(
      isValidWebhookSignature(
        {
          ...event,
          signature: {
            properties: 'not-an-array' as unknown as string[],
            checksum: 'abc',
          },
        },
        secret,
      ),
    ).toBe(false);
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
