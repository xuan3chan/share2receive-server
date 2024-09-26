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

export class CreateBrandDto {
    @ApiProperty({
        description: 'Name of brand ',
        example: 'brand',
      })
      @IsString()
      @IsNotEmpty()
      @MaxLength(50)
      @MinLength(2)
      // Cho phép chữ cái (bao gồm có dấu), số và khoảng trắng, không có ký tự đặc biệt
      @Matches(/^[\p{L}0-9 ]+$/u, { message: 'name must only contain letters, numbers, and spaces' })
      name: string;
      
    
    @ApiProperty({
        description: 'Description of brand ',
        example: 'brand description',
    })
    @IsString()
    @IsOptional()
    @MaxLength(100)
    description: string;

    @ApiProperty({
        description: 'Status of brand ',
        example: 'active',
    })
    @IsString()
    @IsOptional()
    @IsEnum(['active', 'inactive'])
    status: string;
    }
export class UpdateBrandDto {
    @ApiProperty({
        description: 'Name of brand ',
        example: 'brand',
    })
    @IsString()
    @IsOptional()
    @MaxLength(50)
    @MinLength(2)
    @Matches(/^[\p{L}0-9 ]+$/u, { message: 'name must only contain letters, numbers, and spaces' })
    name: string;
    
    @ApiProperty({
        description: 'Description of brand ',
        example: 'brand description',
    })
    @IsString()
    @IsOptional()
    @MaxLength(300)
    description: string;

    @ApiProperty({
        description: 'Status of brand ',
        example: 'active',
    })
    @IsString()
    @IsOptional()
    @IsEnum(['active', 'inactive'])
    status: string;
    }
