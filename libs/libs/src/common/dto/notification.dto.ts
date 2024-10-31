// import { ApiProperty, PartialType } from '@nestjs/swagger';
// import {
//   IsNotEmpty,
//   IsString,
//   IsArray,
//   IsNumber,
//   ArrayMinSize,
//   IsEnum,
//   IsMongoId,
//   IsOptional,
//   MaxLength,
//   MinLength,
//   Min,
//   Max,
// } from 'class-validator';

// export class CreateNotificationDto {

//     @ApiProperty({
//         description: 'Content of the notification',
//         example: 'This is a new notification',
//     })
//     @IsString()
//     @IsNotEmpty()
//     content: string;
    
//     @ApiProperty({
//         description: 'Id of the user who receives the notification',
//         example: '60e1d0b5d8f1f40015e4e8b0',
//     })
//     @IsString()
//     @IsNotEmpty()
//     userId: string;
//     }