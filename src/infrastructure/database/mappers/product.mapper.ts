import { Product } from '../../../domain/entities/product.entity';

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
}

export function toProductItem(product: Product): ProductItem {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    imageUrl: product.imageUrl,
  };
}

export function toProduct(item: ProductItem): Product {
  return new Product(
    item.id,
    item.name,
    item.description,
    item.price,
    item.stock,
    item.imageUrl,
  );
}
