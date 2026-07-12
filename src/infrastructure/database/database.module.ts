import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { PRODUCT_REPOSITORY } from '../../domain/ports/product.repository.port';
import { TRANSACTION_REPOSITORY } from '../../domain/ports/transaction.repository.port';
import { createDynamoDocumentClient } from '../database/dynamodb.client';
import { DynamoProductRepository } from '../database/dynamo-product.repository';
import { DynamoTransactionRepository } from '../database/dynamo-transaction.repository';

export const DYNAMODB_CLIENT = Symbol('DYNAMODB_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: DYNAMODB_CLIENT,
      useFactory: (config: ConfigService) =>
        createDynamoDocumentClient(config.get<string>('AWS_REGION') ?? 'us-east-1'),
      inject: [ConfigService],
    },
    {
      provide: PRODUCT_REPOSITORY,
      useFactory: (client: DynamoDBDocumentClient, config: ConfigService) =>
        new DynamoProductRepository(
          client,
          config.get<string>('DYNAMODB_TABLE_PRODUCTS') ?? 'Products',
        ),
      inject: [DYNAMODB_CLIENT, ConfigService],
    },
    {
      provide: TRANSACTION_REPOSITORY,
      useFactory: (client: DynamoDBDocumentClient, config: ConfigService) =>
        new DynamoTransactionRepository(
          client,
          config.get<string>('DYNAMODB_TABLE_TRANSACTIONS') ?? 'Transactions',
        ),
      inject: [DYNAMODB_CLIENT, ConfigService],
    },
  ],
  exports: [PRODUCT_REPOSITORY, TRANSACTION_REPOSITORY, DYNAMODB_CLIENT],
})
export class DatabaseModule {}
