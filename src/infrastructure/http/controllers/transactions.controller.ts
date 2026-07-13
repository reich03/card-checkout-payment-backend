import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateTransactionDto } from '../../../application/dtos/create-transaction.dto';
import { CreateTransactionUseCase } from '../../../application/use-cases/create-transaction.use-case';
import { GetTransactionReceiptUseCase } from '../../../application/use-cases/get-transaction-receipt.use-case';
import { GetTransactionUseCase } from '../../../application/use-cases/get-transaction.use-case';
import { toTransactionResponse } from '../mappers/response.mapper';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly getTransactionUseCase: GetTransactionUseCase,
    private readonly getTransactionReceiptUseCase: GetTransactionReceiptUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a transaction and process payment' })
  @ApiCreatedResponse({ description: 'Transaction result' })
  async create(@Body() dto: CreateTransactionDto) {
    const transaction = await this.createTransactionUseCase.execute(dto);
    return toTransactionResponse(transaction);
  }

  @Get(':id/receipt')
  @ApiOperation({
    summary:
      'Get payment receipt (APPROVED only). Use ?format=html for printable HTML.',
  })
  @ApiOkResponse({ description: 'Receipt JSON or HTML' })
  @ApiProduces('application/json', 'text/html')
  async getReceipt(
    @Param('id') id: string,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const receipt = await this.getTransactionReceiptUseCase.execute(id);
    const wantsHtml = (format ?? 'json').toLowerCase() === 'html';

    if (wantsHtml) {
      res.type('html').send(receipt.html);
      return;
    }

    const { html: _html, ...json } = receipt;
    res.json({
      ...json,
      htmlUrl: `/api/transactions/${id}/receipt?format=html`,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get transaction status by id (refreshes PENDING from Wompi)',
  })
  @ApiOkResponse({ description: 'Transaction details' })
  async findOne(@Param('id') id: string) {
    const transaction = await this.getTransactionUseCase.execute(id);
    return toTransactionResponse(transaction);
  }
}
