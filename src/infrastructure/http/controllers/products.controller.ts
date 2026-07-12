import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetProductUseCase } from '../../../application/use-cases/get-product.use-case';
import { GetProductsUseCase } from '../../../application/use-cases/get-products.use-case';
import { toProductResponse } from '../mappers/response.mapper';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly getProductsUseCase: GetProductsUseCase,
    private readonly getProductUseCase: GetProductUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all products with current stock' })
  @ApiOkResponse({ description: 'Product catalog' })
  async findAll() {
    const products = await this.getProductsUseCase.execute();
    return products.map(toProductResponse);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single product by id' })
  @ApiOkResponse({ description: 'Product details' })
  async findOne(@Param('id') id: string) {
    const product = await this.getProductUseCase.execute(id);
    return toProductResponse(product);
  }
}
