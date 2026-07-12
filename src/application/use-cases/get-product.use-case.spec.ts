import { Product } from '../../domain/entities/product.entity';
import { ProductNotFoundError } from '../errors/application.errors';
import { GetProductUseCase } from './get-product.use-case';

describe('GetProductUseCase', () => {
  const product = new Product(
    'prod-1',
    'Headphones',
    'Wireless headphones',
    100000,
    5,
    'https://cdn.example.com/headphones.png',
  );

  it('returns a product by id', async () => {
    const productRepository = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(product),
      updateStock: jest.fn(),
    };

    const useCase = new GetProductUseCase(productRepository);
    await expect(useCase.execute('prod-1')).resolves.toBe(product);
  });

  it('throws when product does not exist', async () => {
    const productRepository = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      updateStock: jest.fn(),
    };

    const useCase = new GetProductUseCase(productRepository);
    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });
});
