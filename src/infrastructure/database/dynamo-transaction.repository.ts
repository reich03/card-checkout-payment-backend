import {
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Injectable } from '@nestjs/common';
import { Transaction } from '../../domain/entities/transaction.entity';
import type { ITransactionRepository } from '../../domain/ports/transaction.repository.port';
import {
  toTransaction,
  toTransactionItem,
  type TransactionItem,
} from './mappers/transaction.mapper';

export const TRANSACTIONS_STATUS_CREATED_AT_INDEX = 'status-createdAt-index';

@Injectable()
export class DynamoTransactionRepository implements ITransactionRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string = process.env
      .DYNAMODB_TABLE_TRANSACTIONS ?? 'Transactions',
    private readonly statusCreatedAtIndex: string = TRANSACTIONS_STATUS_CREATED_AT_INDEX,
  ) {}

  async save(transaction: Transaction): Promise<Transaction> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: toTransactionItem(transaction),
        ConditionExpression: 'attribute_not_exists(id)',
      }),
    );

    return transaction;
  }

  async findById(id: string): Promise<Transaction | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id },
      }),
    );

    if (!result.Item) {
      return null;
    }

    return toTransaction(result.Item as TransactionItem);
  }

  async update(transaction: Transaction): Promise<Transaction> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: toTransactionItem(transaction),
        ConditionExpression: 'attribute_exists(id)',
      }),
    );

    return transaction;
  }

  async findPendingOlderThan(olderThan: Date): Promise<Transaction[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: this.statusCreatedAtIndex,
        KeyConditionExpression: '#status = :status AND #createdAt < :olderThan',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#createdAt': 'createdAt',
        },
        ExpressionAttributeValues: {
          ':status': 'PENDING',
          ':olderThan': olderThan.toISOString(),
        },
      }),
    );

    return (result.Items ?? []).map((item) =>
      toTransaction(item as TransactionItem),
    );
  }
}
