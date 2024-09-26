import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  MinLength,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsNumber,
  ArrayNotEmpty,
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({
        description: 'Name of category ',
        example: 'category',
      })
      @IsString()
      @IsNotEmpty()
      @MaxLength(50)
      @MinLength(2)
      // Cho phép chữ cái (bao gồm có dấu), số và khoảng trắng, không có ký tự đặc biệt
      @Matches(/^[\p{L}0-9 ]+$/u, { message: 'name must only contain letters, numbers, and spaces' })
      name: string;
      
    
    @ApiProperty({
        description: 'Description of category ',
        example: 'category description',
    })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    description: string;

    @ApiProperty({
        description: 'Status of category ',
        example: 'active',
    })
    @IsString()
    @IsOptional()
    @IsEnum(['active', 'inactive'])
    status: string;
    }
export class UpdateCategoryDto {
    @ApiProperty({
        description: 'Name of category ',
        example: 'category',
    })
    @IsString()
    @IsOptional()
    @MaxLength(50)
    @MinLength(2)
    @Matches(/^[\p{L}0-9 ]+$/u, { message: 'name must only contain letters, numbers, and spaces' })
    name: string;
    
    @ApiProperty({
        description: 'Description of category ',
        example: 'category description',
    })
    @IsString()
    @IsOptional()
    @MaxLength(300)
    description: string;

    @ApiProperty({
        description: 'Status of category ',
        example: 'active',
    })
    @IsString()
    @IsOptional()
    @IsEnum(['active', 'inactive'])
    status: string;
    }
