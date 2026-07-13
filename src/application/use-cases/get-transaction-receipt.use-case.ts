import { Inject, Injectable } from '@nestjs/common';
import {
  Transaction,
  TransactionStatus,
} from '../../domain/entities/transaction.entity';
import type { IProductRepository } from '../../domain/ports/product.repository.port';
import { PRODUCT_REPOSITORY } from '../../domain/ports/product.repository.port';
import type { ITransactionRepository } from '../../domain/ports/transaction.repository.port';
import { TRANSACTION_REPOSITORY } from '../../domain/ports/transaction.repository.port';
import {
  ReceiptNotAvailableError,
  TransactionNotFoundError,
} from '../errors/application.errors';

export interface ReceiptLineItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface TransactionReceipt {
  receiptNumber: string;
  transactionId: string;
  paymentRef: string | null;
  status: TransactionStatus;
  issuedAt: string;
  currency: string;
  amount: number;
  cardLast4: string;
  merchant: {
    name: string;
    tagline: string;
  };
  items: ReceiptLineItem[];
  html: string;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildReceiptHtml(receipt: Omit<TransactionReceipt, 'html'>): string {
  const rows = receipt.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${formatMoney(item.unitPrice, receipt.currency)}</td>
        <td style="text-align:right">${formatMoney(item.lineTotal, receipt.currency)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recibo ${escapeHtml(receipt.receiptNumber)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f6f7f8; color:#1c1b1b; margin:0; padding:24px; }
    .card { max-width:560px; margin:0 auto; background:#fff; border-radius:16px; padding:28px; box-shadow:0 8px 24px rgba(0,0,0,.08); }
    h1 { margin:0 0 4px; color:#006c4a; font-size:28px; }
    .muted { color:#747878; font-size:14px; }
    .badge { display:inline-block; margin-top:12px; background:#e6fff5; color:#006c4a; border-radius:999px; padding:6px 12px; font-weight:700; font-size:12px; }
    table { width:100%; border-collapse:collapse; margin-top:24px; }
    th, td { padding:10px 0; border-bottom:1px solid #ececec; font-size:14px; }
    th { text-align:left; color:#747878; font-weight:600; }
    .total { display:flex; justify-content:space-between; margin-top:20px; font-size:20px; font-weight:700; }
    .meta { margin-top:20px; font-size:13px; line-height:1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(receipt.merchant.name)}</h1>
    <div class="muted">${escapeHtml(receipt.merchant.tagline)}</div>
    <div class="badge">PAGO APROBADO</div>
    <div class="meta">
      <div><strong>Recibo:</strong> ${escapeHtml(receipt.receiptNumber)}</div>
      <div><strong>Transacción:</strong> ${escapeHtml(receipt.transactionId)}</div>
      <div><strong>Referencia Wompi:</strong> ${escapeHtml(receipt.paymentRef ?? '—')}</div>
      <div><strong>Fecha:</strong> ${escapeHtml(new Date(receipt.issuedAt).toLocaleString('es-CO'))}</div>
      <div><strong>Tarjeta:</strong> **** ${escapeHtml(receipt.cardLast4)}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th style="text-align:center">Cant.</th>
          <th style="text-align:right">Precio</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total">
      <span>Total</span>
      <span>${formatMoney(receipt.amount, receipt.currency)}</span>
    </div>
    <p class="muted" style="margin-top:24px">Gracias por tu compra en GreenPay.</p>
  </div>
</body>
</html>`;
}

@Injectable()
export class GetTransactionReceiptUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(transactionId: string): Promise<TransactionReceipt> {
    const transaction =
      await this.transactionRepository.findById(transactionId);

    if (!transaction) {
      throw new TransactionNotFoundError(transactionId);
    }

    if (transaction.status !== TransactionStatus.APPROVED) {
      throw new ReceiptNotAvailableError(transactionId, transaction.status);
    }

    const items = await this.buildLineItems(transaction);
    const base: Omit<TransactionReceipt, 'html'> = {
      receiptNumber: `GP-${transaction.id.slice(0, 8).toUpperCase()}`,
      transactionId: transaction.id,
      paymentRef: transaction.paymentRef,
      status: transaction.status,
      issuedAt: transaction.updatedAt.toISOString(),
      currency: transaction.currency,
      amount: transaction.amount,
      cardLast4: transaction.cardLast4,
      merchant: {
        name: 'GreenPay',
        tagline: 'Recibo de compra',
      },
      items,
    };

    return {
      ...base,
      html: buildReceiptHtml(base),
    };
  }

  private async buildLineItems(
    transaction: Transaction,
  ): Promise<ReceiptLineItem[]> {
    const lines: ReceiptLineItem[] = [];

    for (const item of transaction.products) {
      const product = await this.productRepository.findById(item.productId);
      lines.push({
        productId: item.productId,
        name: product?.name ?? item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.unitPrice * item.quantity,
      });
    }

    return lines;
  }
}
