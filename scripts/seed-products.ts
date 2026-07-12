import { seedProducts } from '../src/infrastructure/database/seed-products';

seedProducts().catch((error: unknown) => {
  console.error('Failed to seed products:', error);
  process.exit(1);
});
