# Credit Card Checkout — Backend API

REST API built with **NestJS 11** + **TypeScript** following **Hexagonal Architecture** (Ports & Adapters). Manages product catalog, credit card transactions, and integrates with an external payment gateway (sandbox).

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| NestJS | 11.x | API framework |
| TypeScript | 5.x | Type-safe language |
| Swagger | @nestjs/swagger | OpenAPI docs at `/api/docs` |
| DynamoDB | - | NoSQL database (AWS) |
| Jest | 29.x | Unit testing (>80% coverage) |
| Docker | - | Containerization |

## Architecture

```
src/
├── domain/                  # Business logic — zero dependencies
│   ├── entities/            # Product, Transaction, CardInfo
│   └── ports/               # Interfaces (IProductRepo, IPaymentGateway)
├── application/             # Use cases — orchestration layer
│   ├── use-cases/           # CreateTransaction, ProcessPayment, UpdateStock
│   └── dtos/                # Request/Response DTOs with validation
└── infrastructure/          # External world — adapters
    ├── database/            # DynamoDB adapter (implements ports)
    ├── payment/             # Payment API client (implements ports)
    └── http/                # NestJS controllers & middlewares
        ├── controllers/
        └── middlewares/
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/products` | List all products with stock |
| `GET` | `/api/products/:id` | Get single product |
| `POST` | `/api/transactions` | Create transaction + process payment |
| `GET` | `/api/transactions/:id` | Get transaction status |

## Getting Started

### Prerequisites
- Node.js 22+
- npm 10+
- AWS CLI configured (or local DynamoDB)

### Install & Run
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Run in development
npm run start:dev

# Swagger UI → http://localhost:3000/api/docs

# Run tests
npm run test

# Run tests with coverage
npm run test:cov
```

### Docker
```bash
# Build image
docker build -t checkout-api .

# Run container
docker run -p 3000:3000 --env-file .env checkout-api

# Or with docker-compose
docker-compose up
```

## Test Coverage

> Coverage results will be added here after implementation.

```
-----------------------------|---------|----------|---------|---------|
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
All files                    |   XX.XX |    XX.XX |   XX.XX |   XX.XX |
-----------------------------|---------|----------|---------|---------|
```

## Environment Variables

See `.env.example` for required configuration.

## License

Private — not for distribution.
