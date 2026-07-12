import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class TransactionProductItemDto {
  @ApiProperty({ example: 'prod-1' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CardInfoDto {
  @ApiProperty({ example: '4242424242424242' })
  @IsString()
  @Matches(/^\d[\d\s]{12,23}\d$/, {
    message: 'Card number must contain between 13 and 19 digits',
  })
  number!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  holderName!: string;

  @ApiProperty({ example: '12' })
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])$/, {
    message: 'Expiration month must be between 01 and 12',
  })
  expMonth!: string;

  @ApiProperty({ example: '30' })
  @IsString()
  @Matches(/^\d{2}$/, { message: 'Expiration year must be 2 digits' })
  expYear!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'CVV must be 3 or 4 digits' })
  cvv!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  installments!: number;
}

export class CreateTransactionDto {
  @ApiProperty({ type: [TransactionProductItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransactionProductItemDto)
  products!: TransactionProductItemDto[];

  @ApiProperty({ type: CardInfoDto })
  @ValidateNested()
  @Type(() => CardInfoDto)
  card!: CardInfoDto;

  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  customerEmail!: string;

  @ApiProperty({ example: 'COP', required: false, default: 'COP' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  currency?: string;
}
