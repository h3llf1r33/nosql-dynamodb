import {AttributeValue} from "@aws-sdk/client-dynamodb";
import {IDatabaseExpression} from "@denis_bruns/core";

export interface DynamoExpression extends IDatabaseExpression {
    TableName?: string;
    KeyConditionExpression?: string;
    FilterExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, AttributeValue>;
    ScanIndexForward?: boolean;
}