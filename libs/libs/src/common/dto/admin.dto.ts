import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  MinLength,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  IsMongoId,
  IsOptional,
} from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({
    description: 'Name of the admin',
    example: 'Admin1',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  adminName: string;

  @ApiProperty({
    description: 'enter account name',
    example: 'xuanadmin',
  })
  @IsNotEmpty()
  @IsString()
  accountName: string;

  @ApiProperty({
    description: 'Password of the admin',
    example: 'Admin@123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Role of the admin',
    example: '66445e3ad052f97add5912c1',
  })
  @IsNotEmpty()
  @IsMongoId({ each: true })
  roleId: string;
}
export class DeleteAdminDto {
  @ApiProperty({
    description: 'Id of the admin',
    example: '60e1d0b5d8f1f40015e4e8b0',
  })
  @IsString()
  @IsMongoId()
  id: string;
}
export class UpdateAdminDto {

  @ApiProperty({
    description: 'Name of the admin',
    example: 'Admin1',
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(30)
  adminName: string;

  @ApiProperty({
    description: 'Password of the admin',
    example: 'Admin@123',
  })
  @IsString()
  @IsOptional()
  @MinLength(6)
  @MaxLength(30)
  password: string;

  @ApiProperty({
    description: 'Role of the admin',
    example: '66445e3ad052f97add5912c1',
  })
  @IsOptional()
  roleId: string;
}
export class BlockAdminDto {
  @ApiProperty({
    description: 'Id of the admin',
    example: '66445e3ad052f97add5912c1',
  })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  id: string;

  @ApiProperty({
    description: 'Block status of the admin',
    example: 'true',
  })
  @IsNotEmpty()
  isBlocked: boolean;
}
