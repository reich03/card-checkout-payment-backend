import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export function createDynamoDocumentClient(
  region: string = process.env.AWS_REGION ?? 'us-east-2',
): DynamoDBDocumentClient {
  const client = new DynamoDBClient({ region });
  console.log('Creating DynamoDB document client for region:', region);

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });
}
