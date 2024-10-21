import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExchangeStatusE, SizeE } from '../enum';

class ProductDetailsDto {
  @ApiProperty({
    description: 'ID of the product',
    example: '60f3b3b3b3b3b3b3b3b3b3',
  })
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Size of the product',
    example: 'M',
  })
  @IsEnum(SizeE)
  @IsOptional()
  size: string;

  @ApiProperty({
    description: 'Colors of the product',
    example: 'red',
  })
  @IsString()
  @IsNotEmpty()
  colors: string;

  @ApiProperty({
    description: 'Amount of the product',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}

export class CreateExchangeDto {

  @ApiProperty({
    description: 'Details of the requester product',
    type: ProductDetailsDto,
  })
  @ValidateNested()
  @Type(() => ProductDetailsDto)
  @IsNotEmpty()
  requestProduct: ProductDetailsDto;

  @ApiProperty({
    description: 'Details of the receiver product',
    type: ProductDetailsDto,
  })
  @ValidateNested()
  @Type(() => ProductDetailsDto)
  @IsNotEmpty()
  receiveProduct: ProductDetailsDto;

  @ApiProperty({
    description: 'Optional note',
    example: 'note',
  })
  @IsString()
  @IsOptional()
  note: string;
}