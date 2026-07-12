import { Inject, Injectable } from '@nestjs/common';
import { Product } from '../../domain/entities/product.entity';
import type { IProductRepository } from '../../domain/ports/product.repository.port';
import { PRODUCT_REPOSITORY } from '../../domain/ports/product.repository.port';
import { ProductNotFoundError } from '../errors/application.errors';

@Injectable()
export class GetProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(productId: string): Promise<Product> {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    return product;
  }
}
