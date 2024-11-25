import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { SizeE } from '../enum/size.enum';

export class CreateCartDto {

  @ApiProperty({
    description: 'Product ID',
    example: '64ff99c1234567890abcdef2',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    description: 'Size of the product',
    example: 'L',
  })
  @IsEnum(SizeE, { message: 'Size must be a valid enum value from SizeE' })
  @IsNotEmpty()
  size: string;

  @ApiProperty({
    description: 'Color of the product',
    example: 'red',
  })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({
    description: 'Quantity of the product',
    example: 2,
  })
  @IsNumber()
  @Min(1, { message: 'Amount must be at least 1' })
  amount: number;
}
export class UpdateCartDto {
  @ApiProperty({
    description: 'Amount of product',
    example: 2,
  })
  @IsNumber()
  @Min(1, { message: 'Amount must be at least 1' })
  amount: number;
}

