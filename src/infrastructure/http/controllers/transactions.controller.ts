import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateTransactionDto } from '../../../application/dtos/create-transaction.dto';
import { CreateTransactionUseCase } from '../../../application/use-cases/create-transaction.use-case';
import { GetTransactionUseCase } from '../../../application/use-cases/get-transaction.use-case';
import { toTransactionResponse } from '../mappers/response.mapper';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly getTransactionUseCase: GetTransactionUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a transaction and process payment' })
  @ApiCreatedResponse({ description: 'Transaction result' })
  async create(@Body() dto: CreateTransactionDto) {
    const transaction = await this.createTransactionUseCase.execute(dto);
    return toTransactionResponse(transaction);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction status by id' })
  @ApiOkResponse({ description: 'Transaction details' })
  async findOne(@Param('id') id: string) {
    const transaction = await this.getTransactionUseCase.execute(id);
    return toTransactionResponse(transaction);
  }
}
