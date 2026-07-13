export class CardInfo {
  constructor(
    public readonly number: string,
    public readonly holderName: string,
    public readonly expMonth: string,
    public readonly expYear: string,
    public readonly cvv: string,
    public readonly installments: number,
  ) {
    this.validate();
  }

  private validate(): void {
    const digitsOnly = this.number.replace(/\s+/g, '');

    if (!/^\d{13,19}$/.test(digitsOnly)) {
      throw new Error('Card number must be between 13 and 19 digits');
    }
    if (!this.holderName?.trim()) {
      throw new Error('Card holder name is required');
    }
    if (!/^(0[1-9]|1[0-2])$/.test(this.expMonth)) {
      throw new Error('Expiration month must be between 01 and 12');
    }
    if (!/^\d{2}$/.test(this.expYear)) {
      throw new Error('Expiration year must be 2 digits');
    }
    if (!/^\d{3,4}$/.test(this.cvv)) {
      throw new Error('CVV must be 3 or 4 digits');
    }
    if (!Number.isInteger(this.installments) || this.installments < 1) {
      throw new Error(
        'Installments must be an integer greater than or equal to 1',
      );
    }
    if (this.isExpired()) {
      throw new Error('Card is expired');
    }
  }

  get sanitizedNumber(): string {
    return this.number.replace(/\s+/g, '');
  }

  get last4(): string {
    return this.sanitizedNumber.slice(-4);
  }

  isExpired(referenceDate: Date = new Date()): boolean {
    const month = Number(this.expMonth);
    const year = 2000 + Number(this.expYear);
    const expiryEnd = new Date(year, month, 0, 23, 59, 59, 999);
    return referenceDate > expiryEnd;
  }
}
