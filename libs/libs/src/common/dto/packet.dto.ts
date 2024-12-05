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

export class CreatePacketDto {
    @ApiProperty({
        description: 'Name of the packet',
        example: 'Packet 1',
    })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiProperty({
        description: 'Description of the packet',
        example: 'This is packet 1',
    })
    @IsString()
    @IsNotEmpty()
    description: string

    @ApiProperty({
        description: 'Price of the packet',
        example: 100000,
    })
    @IsNumber()
    @IsNotEmpty()
    price: number

    @ApiProperty({
        description: 'Promotion price of the packet',
        example: 25,
    })
    @IsNumber()
    @IsNotEmpty()
    promotionPoint: number

    @ApiProperty({
        description: 'Status of the packet',
        example: 'active',
    })
    @IsString()
    @IsOptional()
    status: string
}

export class UpdatePacketDto {
    @ApiProperty({
        description: 'Name of the packet',
        example: 'Packet 1',
    })
    @IsString()
    @IsOptional()
    name: string

    @ApiProperty({
        description: 'Description of the packet',
        example: 'This is packet 1',
    })
    @IsString()
    @IsOptional()
    description: string

    @ApiProperty({
        description: 'Price of the packet',
        example: 100000,
    })
    @IsNumber()
    @IsOptional()
    price: number

    @ApiProperty({
        description: 'Promotion price of the packet',
        example: 25,
    })
    @IsNumber()
    @IsOptional()
    promotionPoint: number

    @ApiProperty({
        description: 'Image of the packet',
        example: 'https://www.google.com',
    })
    @IsString()
    @IsOptional()
    image: string

    @ApiProperty({
        description: 'Status of the packet',
        example: 'active',
    })
    @IsString()
    @IsOptional()
    status: string
}