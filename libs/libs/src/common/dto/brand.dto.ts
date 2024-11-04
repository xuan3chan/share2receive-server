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
import { PriorityE } from '../enum';

export class CreateBrandDto {
  @ApiProperty({
    description: 'Name of brand',
    example: 'brand',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Priority of brand',
    example: 'high',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(PriorityE)
  priority: string;  // Corrected field name

  @ApiProperty({
    description: 'Description of brand',
    example: 'brand description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  description: string;

  @ApiProperty({
    description: 'Status of brand',
    example: 'active',
  })
  @IsString()
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status: string;
}

export class UpdateBrandDto {
  @ApiProperty({
    description: 'Name of brand',
    example: 'brand',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Description of brand',
    example: 'brand description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  description: string;

  @ApiProperty({
    description: 'Priority of brand',
    example: 'high',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(PriorityE)
  priority: string;  // Corrected field name

  @ApiProperty({
    description: 'Status of brand',
    example: 'active',
  })
  @IsString()
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status: string;
}
