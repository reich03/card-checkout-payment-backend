import { Product } from '../../domain/entities/product.entity';
import { DynamoProductRepository } from './dynamo-product.repository';
import { SEED_PRODUCTS, seedProducts } from './seed-products';

describe('seedProducts', () => {
  it('saves all seed products through the repository', async () => {
    const save = jest
      .fn()
      .mockImplementation(async (product: Product) => product);
    const repository = { save } as unknown as DynamoProductRepository;

    await seedProducts(repository);

    expect(save).toHaveBeenCalledTimes(SEED_PRODUCTS.length);
    expect(save).toHaveBeenCalledWith(SEED_PRODUCTS[0]);
  });
});
