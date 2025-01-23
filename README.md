# @denis_bruns/nosql-dynamodb-service

> **A robust DynamoDB service for clean architecture projects, featuring filter expressions, pagination, and injection-safe validations.**

[![NPM Version](https://img.shields.io/npm/v/@denis_bruns/nosql-dynamodb-service?style=flat-square&logo=npm)](https://www.npmjs.com/package/@denis_bruns/nosql-dynamodb-service)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub--181717.svg?style=flat-square&logo=github)](https://github.com/h3llf1r33/nosql-dynamodb-service)

---

## Overview

`@denis_bruns/nosql-dynamodb-service` provides a **DynamoDB-specific** data service built around clean architecture principles. It extends the functionality of [`@denis_bruns/database-core`](https://www.npmjs.com/package/@denis_bruns/database-core) to offer:

- **Type-safe** query building via `DynamoDBExpressionBuilder`
- **Partition key** and **filter** expression support
- **Pagination** handling, including **sorting** and offset-based slicing
- **Validation** utilities to guard against potential NoSQL injection
- Seamless integration with the **AWS SDK** for DynamoDB

If you’re looking to unify your **business logic** and **data access** in a clean, testable manner, this package is an excellent place to start.

---

## Key Features

1. **DynamoDB-Specific Expression Builder**
- Converts filter queries into `KeyConditionExpression`, `FilterExpression`, and attribute maps.
- Supports operators like `=`, `<`, `<=`, `>`, `>=`, `!=`, `in`, `not in`, `like`, and `not like`.

2. **Automatic Query vs. Scan Selection**
- If your query includes a partition key (`pkName`), it uses a `QueryCommand`.
- Otherwise, it defaults to a `ScanCommand`.

3. **Pagination & Sorting**
- Built-in pagination checks (`limit`, `offset`, `page`).
- Sorting is handled by setting `ScanIndexForward` for queries or by sorting scanned results in memory (for non-key fields).

4. **Type-Safe Results**
- The service converts raw DynamoDB `AttributeValue` objects into typed entities.
- JSON properties, nested maps, arrays, and booleans are all mapped back to JavaScript types.

5. **Injection-Safe Validations**
- Guards against malicious operators like `$where`, `$regex`, and others.
- Ensures field names are valid and do not exceed depth or length limits.

---

## Installation

With **npm**:

```bash
npm install @denis_bruns/nosql-dynamodb-service
```

Or with **yarn**:

```bash
yarn add @denis_bruns/nosql-dynamodb-service
```

You’ll also need the AWS DynamoDB client:

```bash
npm install @aws-sdk/client-dynamodb
```

---

## Usage Example

Below is a **basic** usage demonstration. In practice, you’d integrate this into your domain logic or repository layer.

```ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
fetchWithFiltersAndPaginationDynamoDb,
DynamoDBService,
} from "@denis_bruns/nosql-dynamodb-service";
import { IGenericFilterQuery } from "@denis_bruns/core";

async function demo() {
const client = new DynamoDBClient({ region: "us-east-1" });

// Example filter query: fetch items by a "status" field, limited to 5 results
const query: IGenericFilterQuery = {
filters: [
{ field: "status", operator: "=", value: "active" }
],
pagination: { page: 1, limit: 5 }
};

// Option A: Direct helper function
const directResult = await fetchWithFiltersAndPaginationDynamoDb<MyItem>(
"my-table",
query,
client
);
console.log("Direct Helper Results:", directResult.data);

// Option B: Using the DynamoDBService instance directly
const service = new DynamoDBService("my-table", "id"); // "id" is the partition key
const serviceResult = await service.fetchWithFiltersAndPagination<MyItem>(query, client);
console.log("Service Class Results:", serviceResult.data);
}

interface MyItem {
id: string;
status: string;
createdAt: string;
// ... other fields
}
```

In this snippet:
- **`fetchWithFiltersAndPaginationDynamoDb`** quickly fetches data from DynamoDB, applying filters and pagination.
- **`DynamoDBService`** is more extensible if you need to override methods or customize expression handling.

---

## Core Concepts

### 1. Filter Expressions

The library uses a `filters` array where each filter has `field`, `operator`, and `value`. Example:

```ts
filters: [
{ field: "category", operator: "=", value: "books" },
{ field: "price", operator: ">", value: 20 }
]
```

**Supported Operators**: `<`, `<=`, `>`, `>=`, `=`, `!=`, `in`, `not in`, `like`, `not like`.

### 2. Pagination & Sorting

- **Pagination** properties: `page`, `limit`, `offset`.
- **Sorting**: if `pagination.sortBy` is set to the partition key or sort key, DynamoDB’s native sort can be used. Otherwise, items are sorted in memory.

### 3. Validation

- **`validateFieldName`** ensures fields are free of unsafe patterns and exceed neither max depth nor length.
- **`validateValue`** checks for NoSQL injection attempts and invalid input types.
- **`validatePagination`** ensures `page`, `limit`, `offset` are integers.

---

## Related Packages

- **@denis_bruns/core**
  [![NPM](https://img.shields.io/npm/v/@denis_bruns/core?style=flat-square&logo=npm)](https://www.npmjs.com/package/@denis_bruns/core)  
  [![GitHub](https://img.shields.io/badge/GitHub--181717.svg?style=flat-square&logo=github)](https://github.com/h3llf1r33/core)  
  *Provides the fundamental interfaces and types used by this library.*

- **@denis_bruns/database-core**
  [![NPM](https://img.shields.io/npm/v/@denis_bruns/database-core?style=flat-square&logo=npm)](https://www.npmjs.com/package/@denis_bruns/database-core)  
  [![GitHub](https://img.shields.io/badge/GitHub--181717.svg?style=flat-square&logo=github)](https://github.com/h3llf1r33/database-core)  
  *A foundational database service layer that this package extends for DynamoDB usage.*

---

## Contributing

Contributions are welcome! If you find a bug or have a feature request, feel free to open an issue or submit a pull request on [GitHub](https://github.com/h3llf1r33/nosql-dynamodb-service).

---

## License

This project is [MIT licensed](LICENSE).

---

<p align="center">
Built with ❤️ by <a href="https://github.com/h3llf1r33">h3llf1r33</a>
</p>