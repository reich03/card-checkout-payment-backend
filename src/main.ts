import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Credit Card Checkout API')
    .setDescription(
      'REST API for product catalog, credit card transactions, and payment processing',
    )
    .setVersion('1.0')
    .addTag('health', 'Service health')
    .addTag('products', 'Product catalog and stock')
    .addTag('transactions', 'Payment transaction lifecycle')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
