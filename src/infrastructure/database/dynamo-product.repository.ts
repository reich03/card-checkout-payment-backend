import {
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Injectable } from '@nestjs/common';
import { Product } from '../../domain/entities/product.entity';
import type { IProductRepository } from '../../domain/ports/product.repository.port';
import { toProduct, toProductItem } from './mappers/product.mapper';

@Injectable()
export class DynamoProductRepository implements IProductRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string = process.env.DYNAMODB_TABLE_PRODUCTS ??
      'Products',
  ) {}

  async findAll(): Promise<Product[]> {
    const result = await this.client.send(
      new ScanCommand({ TableName: this.tableName }),
    );

    return (result.Items ?? []).map((item) =>
      toProduct({
        id: String(item.id),
        name: String(item.name),
        description: String(item.description),
        price: Number(item.price),
        stock: Number(item.stock),
        imageUrl: String(item.imageUrl),
      }),
    );
  }

  async findById(id: string): Promise<Product | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
      }),
    );

    if (!result.Item) {
      return null;
    }

    return toProduct({
      id: String(result.Item.id),
      name: String(result.Item.name),
      description: String(result.Item.description),
      price: Number(result.Item.price),
      stock: Number(result.Item.stock),
      imageUrl: String(result.Item.imageUrl),
    });
  }

  async updateStock(id: string, stock: number): Promise<Product> {
    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { id },
        UpdateExpression: 'SET stock = :stock',
        ExpressionAttributeValues: { ':stock': stock },
        ConditionExpression: 'attribute_exists(id)',
        ReturnValues: 'ALL_NEW',
      }),
    );

    const item = result.Attributes;
    if (!item) {
      throw new Error(`Failed to update stock for product ${id}`);
    }

    return toProduct({
      id: String(item.id),
      name: String(item.name),
      description: String(item.description),
      price: Number(item.price),
      stock: Number(item.stock),
      imageUrl: String(item.imageUrl),
    });
  }

  async save(product: Product): Promise<Product> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: toProductItem(product),
      }),
    );

    return product;
  }
}
