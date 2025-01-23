import {DynamoValidationError} from "@denis_bruns/core";

const MAX_FIELD_DEPTH = 20;
const MAX_FIELD_LENGTH = 255;
const MAX_VALUE_LENGTH = 400000;
const VALID_FIELD_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;

const UNSAFE_PATTERNS = [
    '__proto__',
    'constructor',
    'prototype',
    '$',
    ';',
    'DROP',
    'DELETE',
    'INSERT',
    'UPDATE'
];

export const NOSQL_OPERATORS = [
    '$where',
    '$regex',
    '$ne',
    '$gt',
    '$lt',
    '$gte',
    '$lte',
    '$in',
    '$nin',
    '$or',
    '$and',
    '$not',
    '$exists',
    '$type',
    '$mod',
    '$text',
    '$elemMatch',
    '$size',
    '$all',
    '$expr'
];

export function validateFieldName(field: string): void {
    if (!field) {
        throw new DynamoValidationError('Field name cannot be empty');
    }

    // Check for SQL/NoSQL injection patterns
    if (UNSAFE_PATTERNS.some(pattern =>
        field.toLowerCase().includes(pattern.toLowerCase()))) {
        throw new DynamoValidationError(`Field name contains unsafe pattern: ${field}`);
    }

    const parts = field.split('.');
    if (parts.length > MAX_FIELD_DEPTH) {
        throw new DynamoValidationError(`Field depth exceeds maximum of ${MAX_FIELD_DEPTH}`);
    }

    parts.forEach(part => {
        if (part.length > MAX_FIELD_LENGTH) {
            throw new DynamoValidationError(`Field part length exceeds maximum of ${MAX_FIELD_LENGTH}`);
        }
        if (!VALID_FIELD_REGEX.test(part)) {
            throw new DynamoValidationError(`Invalid characters in field name: ${part}`);
        }
    });
}

export function validateValue(value: any): void {
    if (value === undefined || value === null) {
        throw new DynamoValidationError('Value cannot be null or undefined');
    }

    const stringified = JSON.stringify(value);
    const dangerousPatterns = [
        '$where', '$regex', '$ne', '$gt', '$lt', '$gte', '$lte',
        '$in', '$nin', '$or', '$and', '$not', '$exists', '$type',
        '$mod', '$text', '$elemMatch', '$size', '$all', '$expr',
        '__proto__', 'constructor', 'prototype'
    ];

    if (dangerousPatterns.some(pattern =>
        stringified.toLowerCase().includes(pattern.toLowerCase()))) {
        throw new DynamoValidationError('Potential NoSQL injection detected');
    }

    if (typeof value === 'string' && value.length > MAX_VALUE_LENGTH) {
        throw new DynamoValidationError(`Value length exceeds maximum of ${MAX_VALUE_LENGTH}`);
    }

    if (Array.isArray(value)) {
        if (!value.length) {
            throw new DynamoValidationError('Empty arrays not supported');
        }
        value.forEach(validateValue);
    } else if (typeof value === 'object' && value !== null) {
        const propsToCheck = [...Object.keys(value), ...Object.getOwnPropertyNames(value)];
        if (propsToCheck.some(prop => dangerousPatterns.includes(prop))) {
            throw new DynamoValidationError('Potential NoSQL injection detected');
        }

        Object.values(value).forEach(validateValue);
    }
}


export function validatePagination(pagination: any = {}): void {
    if (!pagination) {
        pagination = {};
    }

    const {page = 1, size = 10, limit, offset = 0} = pagination;

    if (page !== undefined && !Number.isInteger(Number(page))) {
        throw new DynamoValidationError('Page must be an integer');
    }

    if (size !== undefined && !Number.isInteger(Number(size))) {
        throw new DynamoValidationError('Size must be an integer');
    }

    if (limit !== undefined && !Number.isInteger(Number(limit))) {
        throw new DynamoValidationError('Limit must be an integer');
    }

    if (offset !== undefined && !Number.isInteger(Number(offset))) {
        throw new DynamoValidationError('Offset must be an integer');
    }
}