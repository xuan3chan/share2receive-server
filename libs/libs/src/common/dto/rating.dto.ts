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
import { RatingTypeE } from '../enum';

export class CreateRatingDto {

  @ApiProperty({
    description: 'Id of target ',
    example: '60e1d0b5d8f1f40015e4e8b0',
  })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiProperty({
    description: 'Type of target ',
    example: RatingTypeE.PRODUCT,
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(RatingTypeE)
  targetType: string;

  @ApiProperty({
    description: 'Rating of target ',
    example: 5,
  })
  @IsNumber()
  @IsNotEmpty()
  rating: number;

  @ApiProperty({
    description: 'Comment of target ',
    example: 'Good',
  })
  @IsString()
  @IsOptional()
  comment?: string;

}