import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Product } from '../../../domain/entities/product.entity';
import { ProductNotFoundError } from '../../../application/errors/application.errors';
import { GetProductUseCase } from '../../../application/use-cases/get-product.use-case';
import { GetProductsUseCase } from '../../../application/use-cases/get-products.use-case';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';
import { ProductsController } from './products.controller';

describe('ProductsController (integration)', () => {
  let app: INestApplication;
  const getProductsUseCase = { execute: jest.fn() };
  const getProductUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: GetProductsUseCase, useValue: getProductsUseCase },
        { provide: GetProductUseCase, useValue: getProductUseCase },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/products returns catalog', async () => {
    getProductsUseCase.execute.mockResolvedValue([
      new Product(
        'prod-1',
        'Headphones',
        'Wireless',
        100000,
        5,
        'https://cdn.example.com/p.png',
      ),
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/products')
      .expect(200);

    expect(response.body).toEqual([
      {
        id: 'prod-1',
        name: 'Headphones',
        description: 'Wireless',
        price: 100000,
        stock: 5,
        imageUrl: 'https://cdn.example.com/p.png',
      },
    ]);
  });

  it('GET /api/products/:id returns a product', async () => {
    getProductUseCase.execute.mockResolvedValue(
      new Product(
        'prod-1',
        'Headphones',
        'Wireless',
        100000,
        5,
        'https://cdn.example.com/p.png',
      ),
    );

    const response = await request(app.getHttpServer())
      .get('/api/products/prod-1')
      .expect(200);

    expect(response.body.id).toBe('prod-1');
    expect(getProductUseCase.execute).toHaveBeenCalledWith('prod-1');
  });

  it('GET /api/products/:id returns 404 when missing', async () => {
    getProductUseCase.execute.mockRejectedValue(
      new ProductNotFoundError('missing'),
    );

    await request(app.getHttpServer())
      .get('/api/products/missing')
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toContain('Product not found');
      });
  });
});
