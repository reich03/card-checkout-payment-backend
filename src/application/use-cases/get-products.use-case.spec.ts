import { Product } from '../../domain/entities/product.entity';
import { GetProductsUseCase } from './get-products.use-case';

describe('GetProductsUseCase', () => {
  const products = [
    new Product(
      'prod-1',
      'Headphones',
      'Wireless headphones',
      100000,
      5,
      'https://cdn.example.com/headphones.png',
    ),
  ];

  it('returns all products from the repository', async () => {
    const productRepository = {
      findAll: jest.fn().mockResolvedValue(products),
      findById: jest.fn(),
      updateStock: jest.fn(),
    };

    const useCase = new GetProductsUseCase(productRepository);
    const result = await useCase.execute();

    expect(result).toEqual(products);
    expect(productRepository.findAll).toHaveBeenCalledTimes(1);
  });
});
