import { Module } from '@nestjs/common';
import { GetProductUseCase } from '../../application/use-cases/get-product.use-case';
import { GetProductsUseCase } from '../../application/use-cases/get-products.use-case';
import { ProductsController } from '../http/controllers/products.controller';

@Module({
  controllers: [ProductsController],
  providers: [GetProductsUseCase, GetProductUseCase],
})
export class ProductsModule {}
