import {DynamoExpression} from './types/DynamoExpression';
import {toDynamoDBValue} from "./DynamoUtils";
import {validateFieldName, validateValue} from "./DynamoValidator";
import {IFilterQuery, DynamoValidationError} from "@denis_bruns/core";
import {BaseExpressionBuilder} from "@denis_bruns/database-core";

export class DynamoDBExpressionBuilder extends BaseExpressionBuilder<DynamoExpression> {
    private readonly operatorMap: Record<string, string> = {
        "<": "<",
        ">": ">",
        "<=": "<=",
        ">=": ">=",
        "=": "=",
        "!=": "<>",
        "in": "IN",
        "not in": "NOT IN",
        "like": "contains",
        "not like": "NOT contains"
    };

    buildFilterExpression(filters: IFilterQuery[]): DynamoExpression {
        if (!filters.length) return {};

        filters.forEach(filter => {
            validateFieldName(filter.field);
            validateValue(filter.value);
        });

        const expr: DynamoExpression = {
            ExpressionAttributeNames: {},
            ExpressionAttributeValues: {}
        };

        const {pkFilter, remainingFilters} = this.extractPartitionKeyFilter(filters);

        if (pkFilter) {
            this.addPartitionKeyExpression(expr, pkFilter);
        }

        if (remainingFilters.length) {
            this.addFilterExpressions(expr, remainingFilters);
        }

        return expr;
    }

    protected buildSubExpression(
        expr: DynamoExpression,
        field: string,
        operator: string,
        value: any,
        index: number
    ): string {
        const pathParts = field.split(".");
        pathParts.forEach((part, idx) => {
            expr.ExpressionAttributeNames![`#key${index}_${idx}`] = part;
        });

        const path = pathParts
            .map((_, idx) => `#key${index}_${idx}`)
            .join(".");

        switch (operator) {
            case 'like':
                expr.ExpressionAttributeValues![`:val${index}`] = toDynamoDBValue(value);
                return `contains(${path}, :val${index})`;
            case 'not like':
                expr.ExpressionAttributeValues![`:val${index}`] = toDynamoDBValue(value);
                return `NOT contains(${path}, :val${index})`;
            case 'in':
            case 'not in':
                if (!Array.isArray(value)) {
                    value = [value];
                }
                const conditions = value.map((v: any, i: any) => {
                    expr.ExpressionAttributeValues![`:val${index}_${i}`] = toDynamoDBValue(v);
                    return `${path} = :val${index}_${i}`;
                });
                return operator === 'in'
                    ? `(${conditions.join(' OR ')})`
                    : `NOT (${conditions.join(' OR ')})`;
            default:
                expr.ExpressionAttributeValues![`:val${index}`] = toDynamoDBValue(value);
                const dynOp = this.operatorMap[operator];
                if (!dynOp) {
                    throw new DynamoValidationError(`Unsupported operator: ${operator}`);
                }
                return `${path} ${dynOp} :val${index}`;
        }
    }

    private addPartitionKeyExpression(
        expr: DynamoExpression,
        pkFilter: IFilterQuery
    ): void {
        expr.KeyConditionExpression = "#pk = :pkVal";
        expr.ExpressionAttributeNames!["#pk"] = pkFilter.field;
        expr.ExpressionAttributeValues![":pkVal"] = toDynamoDBValue(pkFilter.value);
    }

    private addFilterExpressions(
        expr: DynamoExpression,
        filters: IFilterQuery[]
    ): void {
        const subExpressions = filters.map((filter, i) =>
            this.buildSubExpression(expr, filter.field, filter.operator, filter.value, i)
        );

        expr.FilterExpression = subExpressions.join(" AND ");
    }
}