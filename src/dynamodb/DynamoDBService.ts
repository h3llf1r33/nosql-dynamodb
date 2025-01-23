import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {DynamoExpression} from './types/DynamoExpression';
import {DynamoQueryExecutor} from './DynamoQueryExecutor';
import {DynamoDBExpressionBuilder} from "./DynamoDBExpressionBuilder";
import {validateFieldName, validatePagination} from "./DynamoValidator";
import {fromDynamoDBValue, mapDynamoDBItemToType} from "./DynamoUtils";
import {IGenericFilterQuery, IPaginatedResponse, IPaginationQuery, DynamoValidationError} from "@denis_bruns/core";
import {BaseDatabaseService} from "@denis_bruns/database-core";

export class DynamoDBService extends BaseDatabaseService<DynamoExpression, DynamoDBClient> {
    protected readonly expressionBuilder: DynamoDBExpressionBuilder;

    constructor(tableName: string, pkName: string = "id") {
        const expressionBuilder = new DynamoDBExpressionBuilder(pkName);
        const queryExecutor = new DynamoQueryExecutor();
        super(tableName, pkName, expressionBuilder, queryExecutor);
        this.expressionBuilder = expressionBuilder;
    }

    protected async prepareQueryParameters(query: IGenericFilterQuery): Promise<{
        params: DynamoExpression;
        limit: number;
        offset: number;
        page: number;
        pagination: IPaginationQuery;
    }> {
        const {pagination = {}, filters = []} = query;
        validatePagination(pagination);

        const {limit, offset, page} = this.calculatePaginationValues(pagination);
        if (limit === 0) {
            return {
                params: {TableName: this.tableName},
                limit: 0,
                offset: 0,
                page: 1,
                pagination
            };
        }

        const expr = this.buildQueryParams(
            this.expressionBuilder.buildFilterExpression(filters),
            pagination
        );
        expr.TableName = this.tableName;

        return {
            params: expr,
            limit,
            offset,
            page,
            pagination
        };
    }

    protected processResults<T>(
        items: any[],
        limit: number,
        offset: number,
        pagination: IPaginationQuery
    ): T[] {
        if (limit === 0) return [];
        if (offset >= items.length) return [];

        let results = items;

        if (pagination?.sortBy) {
            const sortKey = pagination.sortBy;
            const scanForward = pagination.sortDirection !== 'desc';

            items.slice(0, 5).forEach((item, index) => {
                const val = fromDynamoDBValue(item[sortKey] || {S: ""});
            });

            results = [...items].sort((a, b) => {
                let aVal = a[sortKey] ? fromDynamoDBValue(a[sortKey]) : "";
                let bVal = b[sortKey] ? fromDynamoDBValue(b[sortKey]) : "";

                if (typeof aVal === "string" && typeof bVal === "string") {
                    return scanForward ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
                if (typeof aVal === "number" && typeof bVal === "number") {
                    return scanForward ? aVal - bVal : bVal - aVal;
                }
                aVal = String(aVal);
                bVal = String(bVal);
                return scanForward ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });
        }

        const endIndex = offset + limit;
        const sliced = results.slice(offset, endIndex);
        return sliced.map(item => mapDynamoDBItemToType<T>(item));
    }

    protected handleError(error: any): void {
        if (error instanceof DynamoValidationError) {
            console.error("Validation error:", error.message);
            throw error;
        } else {
            console.error("Error in DynamoDB operation:", error);
            throw error;
        }
    }

    private buildQueryParams(expr: DynamoExpression, pagination?: IPaginationQuery): DynamoExpression {
        const {
            KeyConditionExpression,
            FilterExpression,
            ExpressionAttributeNames,
            ExpressionAttributeValues
        } = expr;

        const params: DynamoExpression = {
            TableName: this.tableName
        };

        if (KeyConditionExpression) {
            params.KeyConditionExpression = KeyConditionExpression;

            if (pagination?.sortBy) {
                validateFieldName(pagination.sortBy);
                params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
                params.ExpressionAttributeNames['#sortKey'] = pagination.sortBy;
                params.ScanIndexForward = pagination.sortDirection !== 'desc';
            }
        }

        if (FilterExpression) {
            params.FilterExpression = FilterExpression;
        }
        if (ExpressionAttributeNames) {
            params.ExpressionAttributeNames = {
                ...params.ExpressionAttributeNames,
                ...ExpressionAttributeNames
            };
        }
        if (ExpressionAttributeValues) {
            params.ExpressionAttributeValues = ExpressionAttributeValues;
        }

        return params;
    }
}

export function fetchWithFiltersAndPaginationDynamoDb<T>(
    tableName: string,
    query: IGenericFilterQuery,
    dynamoDBClient: DynamoDBClient,
    pkName = "id",
    _service?: DynamoDBService,
): Promise<IPaginatedResponse<T>> {
    if(_service) {
        return _service.fetchWithFiltersAndPagination<T>(query, dynamoDBClient);
    }else{
        const service = new DynamoDBService(tableName, pkName);
        return service.fetchWithFiltersAndPagination<T>(query, dynamoDBClient);
    }
}