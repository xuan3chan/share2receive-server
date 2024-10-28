import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { PriorityE, TypeCategoryE } from '../enum';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Name of category',
    example: 'category',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @MinLength(2)
  @Matches(/^[\p{L}0-9 ]+$/u, { message: 'name must only contain letters, numbers, and spaces' })
  name: string;

  @ApiProperty({
    description: 'Priority of category',
    example: 'high',
  })
  @IsEnum(PriorityE, { message: 'priority must be one of the following values: veryHigh, high, medium, low' })
  @IsNotEmpty()
  priority: PriorityE;

  @ApiProperty({
    description: 'Description of category',
    example: 'category description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  description: string;

  @ApiProperty({
    description: 'Type of category',
    example: TypeCategoryE.Male,
  })
  @IsEnum(TypeCategoryE, { message: 'type must be one of the following values: male, female, unisex, item, other' })
  type: TypeCategoryE;

  @ApiProperty({
    description: 'Status of category',
    example: 'active',
  })
  @IsString()
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status: string;
}

export class UpdateCategoryDto {
  @ApiProperty({
    description: 'Name of category',
    example: 'category',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @MinLength(2)
  @Matches(/^[\p{L}0-9 ]+$/u, { message: 'name must only contain letters, numbers, and spaces' })
  name: string;

  @ApiProperty({
    description: 'Description of category',
    example: 'category description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  description: string;

  @ApiProperty({
    description: 'Priority of category',
    example: 'high',
  })
  @IsEnum(PriorityE, { message: 'priority must be one of the following values: veryHigh, high, medium, low' })
  @IsNotEmpty()
  @IsOptional()
  priority: string;

  @ApiProperty({
    description: 'Type of category',
    example: TypeCategoryE.Male,
  })
  @IsEnum(TypeCategoryE, { message: 'type must be one of the following values: men, women, unisex, item, other' })
  @IsOptional()
  type: string;

  @ApiProperty({
    description: 'Status of category',
    example: 'active',
  })
  @IsString()
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status: string;
}
