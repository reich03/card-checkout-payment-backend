export class Product {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly price: number,
    public stock: number,
    public readonly imageUrl: string,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.id?.trim()) {
      throw new Error('Product id is required');
    }
    if (!this.name?.trim()) {
      throw new Error('Product name is required');
    }
    if (this.price < 0) {
      throw new Error('Product price cannot be negative');
    }
    if (this.stock < 0) {
      throw new Error('Product stock cannot be negative');
    }
  }

  hasStock(quantity: number): boolean {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    return this.stock >= quantity;
  }

  decrementStock(quantity: number): void {
    if (!this.hasStock(quantity)) {
      throw new Error(
        `Insufficient stock for product ${this.id}: requested ${quantity}, available ${this.stock}`,
      );
    }
    this.stock -= quantity;
  }

  incrementStock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    this.stock += quantity;
  }
}
