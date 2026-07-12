import {
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Product } from '../../domain/entities/product.entity';
import { DynamoProductRepository } from './dynamo-product.repository';

describe('DynamoProductRepository', () => {
  const tableName = 'Products';
  const product = new Product(
    'prod-1',
    'Headphones',
    'Wireless headphones',
    100000,
    10,
    'https://cdn.example.com/headphones.png',
  );

  const createRepository = () => {
    const send = jest.fn();
    const client = { send } as unknown as DynamoDBDocumentClient;
    const repository = new DynamoProductRepository(client, tableName);
    return { repository, send };
  };

  it('finds all products', async () => {
    const { repository, send } = createRepository();
    send.mockResolvedValue({
      Items: [
        {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock,
          imageUrl: product.imageUrl,
        },
      ],
    });

    const result = await repository.findAll();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(product);
    expect(send).toHaveBeenCalledWith(expect.any(ScanCommand));
  });

  it('finds a product by id', async () => {
    const { repository, send } = createRepository();
    send.mockResolvedValue({
      Item: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
      },
    });

    const result = await repository.findById('prod-1');

    expect(result).toEqual(product);
    expect(send).toHaveBeenCalledWith(expect.any(GetCommand));
  });

  it('returns null when product does not exist', async () => {
    const { repository, send } = createRepository();
    send.mockResolvedValue({});

    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('updates product stock', async () => {
    const { repository, send } = createRepository();
    send.mockResolvedValue({
      Attributes: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: 7,
        imageUrl: product.imageUrl,
      },
    });

    const result = await repository.updateStock('prod-1', 7);

    expect(result.stock).toBe(7);
    expect(send).toHaveBeenCalledWith(expect.any(UpdateCommand));
  });

  it('saves a product', async () => {
    const { repository, send } = createRepository();
    send.mockResolvedValue({});

    await expect(repository.save(product)).resolves.toEqual(product);
    expect(send).toHaveBeenCalledWith(expect.any(PutCommand));
  });
});
