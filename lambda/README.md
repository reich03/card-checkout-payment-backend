# GreenPay Lambda — transaction reconciler + Wompi webhook

Standalone Node 20 functions that reuse the Nest backend domain/infrastructure
(no Nest runtime in the bundle).

## Handlers

| Function | Trigger | Purpose |
|----------|---------|---------|
| `reconcile` | EventBridge every 5 min | Query PENDING txs older than 3 min → check Wompi → approve/decline + stock |
| `webhook` | API Gateway `POST /webhooks/wompi` | Validate event checksum → resolve transaction by `reference` |

## Local commands (from `backend/`)

```bash
npm test                 # includes use-case + webhook signature + handler specs
npm run lambda:build     # esbuild → lambda/dist/{reconcile,webhook}.js
```

Deploy (requires Serverless Framework + AWS credentials + env vars from `.env`):

```bash
cd lambda
npx serverless deploy --stage dev
```

## Required env

Same payment + DynamoDB vars as the API, plus:

- `PAYMENT_API_EVENTS_KEY` — Wompi events secret (webhook checksum)
- `RECONCILE_OLDER_THAN_MINUTES` — default `3`
