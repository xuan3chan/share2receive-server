import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsNumber,
  ArrayMinSize,
  IsEnum,
  IsMongoId,
  IsOptional,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';

export class UpdateInfoOrderDto{
    
    @ApiProperty({
        description: 'Address of the order',
        example: 'Thanh Pu, Chau Thanh, Tien Ging',
    })
    @IsString()
    @IsNotEmpty()
    address:string

    @ApiProperty({
        description: 'Phone number of the order',
        example: '0123456789',
    })
    @IsString()
    @IsNotEmpty()
    phone:string
}