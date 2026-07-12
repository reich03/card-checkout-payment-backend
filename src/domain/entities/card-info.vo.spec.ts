import { CardInfo } from './card-info.vo';

describe('CardInfo', () => {
  const validProps = {
    number: '4242424242424242',
    holderName: 'Jane Doe',
    expMonth: '12',
    expYear: '30',
    cvv: '123',
    installments: 1,
  };

  it('creates a valid card info value object', () => {
    const card = new CardInfo(
      validProps.number,
      validProps.holderName,
      validProps.expMonth,
      validProps.expYear,
      validProps.cvv,
      validProps.installments,
    );

    expect(card.last4).toBe('4242');
    expect(card.sanitizedNumber).toBe('4242424242424242');
  });

  it('accepts spaced card numbers and sanitizes them', () => {
    const card = new CardInfo(
      '4242 4242 4242 4242',
      validProps.holderName,
      validProps.expMonth,
      validProps.expYear,
      validProps.cvv,
      validProps.installments,
    );

    expect(card.sanitizedNumber).toBe('4242424242424242');
    expect(card.last4).toBe('4242');
  });

  it('rejects invalid card number length', () => {
    expect(
      () =>
        new CardInfo(
          '1234',
          validProps.holderName,
          validProps.expMonth,
          validProps.expYear,
          validProps.cvv,
          validProps.installments,
        ),
    ).toThrow('Card number must be between 13 and 19 digits');
  });

  it('rejects invalid expiration month', () => {
    expect(
      () =>
        new CardInfo(
          validProps.number,
          validProps.holderName,
          '13',
          validProps.expYear,
          validProps.cvv,
          validProps.installments,
        ),
    ).toThrow('Expiration month must be between 01 and 12');
  });

  it('rejects invalid CVV', () => {
    expect(
      () =>
        new CardInfo(
          validProps.number,
          validProps.holderName,
          validProps.expMonth,
          validProps.expYear,
          '12',
          validProps.installments,
        ),
    ).toThrow('CVV must be 3 or 4 digits');
  });

  it('rejects installments below 1', () => {
    expect(
      () =>
        new CardInfo(
          validProps.number,
          validProps.holderName,
          validProps.expMonth,
          validProps.expYear,
          validProps.cvv,
          0,
        ),
    ).toThrow('Installments must be an integer greater than or equal to 1');
  });

  it('rejects expired cards', () => {
    expect(
      () =>
        new CardInfo(
          validProps.number,
          validProps.holderName,
          '01',
          '20',
          validProps.cvv,
          validProps.installments,
        ),
    ).toThrow('Card is expired');
  });

  it('detects expiration relative to a reference date', () => {
    const card = new CardInfo(
      validProps.number,
      validProps.holderName,
      '12',
      '26',
      validProps.cvv,
      validProps.installments,
    );

    expect(card.isExpired(new Date(2026, 11, 15))).toBe(false);
    expect(card.isExpired(new Date(2027, 0, 1))).toBe(true);
  });
});
