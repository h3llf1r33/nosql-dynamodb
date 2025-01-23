import {DynamoDBClient, QueryCommand, ScanCommand} from "@aws-sdk/client-dynamodb";
import {DynamoExpression} from './types/DynamoExpression';
import {IQueryExecutor} from "@denis_bruns/core";

export class DynamoQueryExecutor implements IQueryExecutor<DynamoExpression, DynamoDBClient> {
    async executeQuery(params: DynamoExpression, client: DynamoDBClient): Promise<any[]> {
        const commandInput = {
            TableName: params.TableName,
            KeyConditionExpression: params.KeyConditionExpression,
            FilterExpression: params.FilterExpression,
            ExpressionAttributeNames: params.ExpressionAttributeNames,
            ExpressionAttributeValues: params.ExpressionAttributeValues
        };

        let response;
        if (params.KeyConditionExpression) {
            response = await client.send(new QueryCommand(commandInput));
        } else {
            response = await client.send(new ScanCommand(commandInput));
        }

        return response.Items || [];
    }
}