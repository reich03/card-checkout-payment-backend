import { config } from 'dotenv';
import { resolve } from 'path';

// Seed runs outside Nest — load backend/.env explicitly.
config({ path: resolve(__dirname, '../.env') });

import { seedProducts } from '../src/infrastructure/database/seed-products';

seedProducts().catch((error: unknown) => {
  console.error('Failed to seed products:', error);
  process.exit(1);
});
