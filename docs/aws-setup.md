# AWS setup (GreenPay)

Region used: **`us-east-2` (Ohio)**. Keep CLI, DynamoDB, Lambda, and EC2 in the same region.

## Live endpoints

| Resource | Value |
|----------|--------|
| API (EC2 Elastic IP) | `http://18.224.46.220:3000` |
| Swagger | `http://18.224.46.220:3000/api/docs` |
| Products | `http://18.224.46.220:3000/api/products` |
| Wompi webhook (Lambda) | `https://3jsq09cakf.execute-api.us-east-2.amazonaws.com/webhooks/wompi` |

## A-01 DynamoDB

- Tables: `Products`, `Transactions`
- GSI on Transactions: `status-createdAt-index` (`status` + `createdAt`)
- Seed from laptop: `cd backend && npm run seed:products` (loads `.env`)

## A-02 EC2

- AMI: Amazon Linux 2023, type `t2.micro`
- Security group: SSH `22` (My IP), TCP `3000` (API)
- Key pair: `greenpay-ec2.pem`
- Deploy (manual):

```bash
# From your Mac
rsync -avz --exclude node_modules --exclude dist --exclude coverage \
  -e "ssh -i ~/Downloads/greenpay-ec2.pem" \
  backend/ ec2-user@18.224.46.220:~/backend/

# On EC2
cd ~/backend
docker compose up -d --build
```

`.env` stays **only on the server** (never commit it). Docker Compose injects AWS + Wompi vars into the container.

## A-03 Lambda

```bash
cd backend
set -a && source .env && set +a
npm run lambda:build
cd lambda
npx serverless@3 deploy --stage dev --region us-east-2
```

Functions: `greenpay-reconciler-dev-reconcile` (EventBridge every **1 min** with a mid-minute follow-up ≈ every **30s**), `greenpay-reconciler-dev-webhook`.

Smoke test webhook: invalid signature → `{"ok":false,"error":"Invalid webhook signature"}` means the endpoint is live.

Optional email for alarms (confirm SNS subscription after deploy):

```bash
export ALARM_EMAIL=you@example.com
```

## A-04 CloudWatch

- Lambda log groups: `/aws/lambda/greenpay-reconciler-dev-*`
- EC2 API logs: `docker compose logs -f` on the instance
- Alarms (created by `serverless.yml` on deploy):
  - `greenpay-reconciler-dev-reconcile-errors` — Errors Sum > 3 in 5 min
  - `greenpay-reconciler-dev-webhook-errors` — Errors Sum > 3 in 5 min
  - SNS topic `greenpay-reconciler-dev-alarms` (email only if `ALARM_EMAIL` is set)

## GitHub Actions secrets (Phase 5)

Add in the **backend** GitHub repo → **Settings → Secrets and variables → Actions**:

| Secret | Example / notes |
|--------|-----------------|
| `EC2_HOST` | `18.224.46.220` |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | full contents of `greenpay-ec2.pem` |
| `AWS_ACCESS_KEY_ID` | IAM user that can deploy Lambda / CloudFormation |
| `AWS_SECRET_ACCESS_KEY` | matching secret |
| `PAYMENT_API_BASE_URL` | Wompi sandbox base URL |
| `PAYMENT_API_PUBLIC_KEY` | `pub_...` |
| `PAYMENT_API_PRIVATE_KEY` | `prv_...` |
| `PAYMENT_API_INTEGRITY_KEY` | integrity key |
| `PAYMENT_API_EVENTS_KEY` | events/webhook key |
| `ALARM_EMAIL` | optional — your email for SNS alarm alerts |

On push to `production` / `main`, CI runs **Deploy API to EC2** and **Deploy Lambda** in parallel after tests.
