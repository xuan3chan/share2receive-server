import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Matches,
  IsOptional,
  IsEnum,
  IsMongoId,
} from 'class-validator';

export class CreateExchangeDto {
    @ApiProperty({
        description: 'ID of requester',
        example: '60f3b3b3b3b3b3b3b3b3b3b3',
    })
    @IsMongoId()
    @IsNotEmpty()
    requester: string;

    @ApiProperty({
        description: 'ID of receiver',
        example: '60f3b3b3b3b3b3b3b3b3b3',
    })
    @IsMongoId()
    @IsNotEmpty()
    receiver: string;

    @ApiProperty({
        description: 'ID of requesterProductId',
        example: '60f3b3b3b3b3b3b3b3b3b3',
    })

    @IsMongoId()
    @IsNotEmpty()
    requesterProductId: string;

    @ApiProperty({
        description: 'ID of receiverProductId',
        example: '60f3b3b3b3b3b3b3b3b3b3',
    })
    @IsMongoId()
    @IsNotEmpty()
    receiverProductId: string;
}

