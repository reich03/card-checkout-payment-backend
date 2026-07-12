import { createHash } from 'crypto';
import { generateIntegritySignature } from './integrity-signature';

describe('generateIntegritySignature', () => {
  it('builds SHA256 of reference + amount + currency + integrity key', () => {
    const reference = 'tx-123';
    const amountInCents = 1500000;
    const currency = 'COP';
    const integrityKey = 'stagtest_integrity_example';

    const expected = createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${integrityKey}`)
      .digest('hex');

    expect(
      generateIntegritySignature(
        reference,
        amountInCents,
        currency,
        integrityKey,
      ),
    ).toBe(expected);
  });
});
