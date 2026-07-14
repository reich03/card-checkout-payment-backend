import { Product } from './product.entity';

describe('Product', () => {
  const validProps = {
    id: 'prod-1',
    name: 'Wireless Headphones',
    description: 'Noise-cancelling over-ear headphones',
    price: 199900,
    stock: 10,
    imageUrl: 'https://cdn.example.com/headphones.png',
  };

  it('creates a valid product', () => {
    const product = new Product(
      validProps.id,
      validProps.name,
      validProps.description,
      validProps.price,
      validProps.stock,
      validProps.imageUrl,
    );

    expect(product.id).toBe('prod-1');
    expect(product.stock).toBe(10);
  });

  it('rejects missing id', () => {
    expect(
      () =>
        new Product(
          '',
          validProps.name,
          validProps.description,
          validProps.price,
          validProps.stock,
          validProps.imageUrl,
        ),
    ).toThrow('Product id is required');
  });

  it('rejects missing name', () => {
    expect(
      () =>
        new Product(
          validProps.id,
          '',
          validProps.description,
          validProps.price,
          validProps.stock,
          validProps.imageUrl,
        ),
    ).toThrow('Product name is required');
  });

  it('rejects negative price', () => {
    expect(
      () =>
        new Product(
          validProps.id,
          validProps.name,
          validProps.description,
          -1,
          validProps.stock,
          validProps.imageUrl,
        ),
    ).toThrow('Product price cannot be negative');
  });

  it('rejects negative stock', () => {
    expect(
      () =>
        new Product(
          validProps.id,
          validProps.name,
          validProps.description,
          validProps.price,
          -5,
          validProps.imageUrl,
        ),
    ).toThrow('Product stock cannot be negative');
  });

  it('reports available stock correctly', () => {
    const product = new Product(
      validProps.id,
      validProps.name,
      validProps.description,
      validProps.price,
      validProps.stock,
      validProps.imageUrl,
    );

    expect(product.hasStock(10)).toBe(true);
    expect(product.hasStock(11)).toBe(false);
  });

  it('rejects checking stock for a non-positive quantity', () => {
    const product = new Product(
      validProps.id,
      validProps.name,
      validProps.description,
      validProps.price,
      validProps.stock,
      validProps.imageUrl,
    );

    expect(() => product.hasStock(0)).toThrow(
      'Quantity must be greater than zero',
    );
  });

  it('decrements stock when available', () => {
    const product = new Product(
      validProps.id,
      validProps.name,
      validProps.description,
      validProps.price,
      validProps.stock,
      validProps.imageUrl,
    );

    product.decrementStock(3);

    expect(product.stock).toBe(7);
  });

  it('throws when decrementing more stock than available', () => {
    const product = new Product(
      validProps.id,
      validProps.name,
      validProps.description,
      validProps.price,
      validProps.stock,
      validProps.imageUrl,
    );

    expect(() => product.decrementStock(11)).toThrow('Insufficient stock');
  });

  it('increments stock', () => {
    const product = new Product(
      validProps.id,
      validProps.name,
      validProps.description,
      validProps.price,
      validProps.stock,
      validProps.imageUrl,
    );

    product.incrementStock(2);

    expect(product.stock).toBe(12);
  });

  it('rejects incrementing stock by a non-positive quantity', () => {
    const product = new Product(
      validProps.id,
      validProps.name,
      validProps.description,
      validProps.price,
      validProps.stock,
      validProps.imageUrl,
    );

    expect(() => product.incrementStock(0)).toThrow(
      'Quantity must be greater than zero',
    );
  });
});
