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

export class CreateReportDto {

    @ApiProperty({
        description: 'reportType',
        example: 'product or order'
    })
    @IsString()
    @IsNotEmpty()
    reportType: string;
    @ApiProperty({
        description: 'targetId',
        example: '60e1d0b5d8f1f40015e4e8b0'
    })
    @IsString()
    @IsNotEmpty()
    targetId: string;
    @ApiProperty({
        description: 'reason',
        example: 'spam'
    })
    @IsString()
    @IsNotEmpty()
    reason: string;
    @ApiProperty({
        description: 'description',
        example: 'spam qua nhieu'
    })
    description: string;
}