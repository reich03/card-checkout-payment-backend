import { Product } from '../entities/product.entity';

export interface IProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  updateStock(id: string, stock: number): Promise<Product>;
}

export const PRODUCT_REPOSITORY = Symbol('IProductRepository');
