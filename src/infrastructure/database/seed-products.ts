import { Product } from '../../domain/entities/product.entity';
import { createDynamoDocumentClient } from './dynamodb.client';
import { DynamoProductRepository } from './dynamo-product.repository';

export const SEED_PRODUCTS: Product[] = [
  new Product(
    'prod-headphones',
    'Wireless Headphones',
    'Noise-cancelling over-ear headphones with 30h battery life',
    249900,
    25,
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
  ),
  new Product(
    'prod-smartwatch',
    'Smart Watch Pro',
    'GPS fitness tracker with heart-rate monitor and AMOLED display',
    499900,
    15,
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
  ),
  new Product(
    'prod-keyboard',
    'Mechanical Keyboard',
    'RGB mechanical keyboard with hot-swappable switches',
    189900,
    40,
    'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800',
  ),
  new Product(
    'prod-speaker',
    'Portable Speaker',
    'Waterproof Bluetooth speaker with 12h playback',
    129900,
    30,
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
  ),
];

export async function seedProducts(
  repository: DynamoProductRepository = new DynamoProductRepository(
    createDynamoDocumentClient(),
  ),
): Promise<void> {
  for (const product of SEED_PRODUCTS) {
    await repository.save(product);
    console.log(`Seeded product: ${product.id} — ${product.name}`);
  }

  console.log(`Done. Seeded ${SEED_PRODUCTS.length} products.`);
}
