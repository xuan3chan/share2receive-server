import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsDate,MinLength, IsEmail, IsNotEmpty, IsString, MaxLength,Matches, IsOptional, IsBoolean, IsEnum, ValidateNested, Min, IsArray } from "class-validator";

export class CreateUserDto {
    
    @ApiProperty({
        description: 'Email of user ',
        example: 'xuanchimto@gmail.com'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    @IsEmail({},{message:'please enter correct email'})
    email: string;

    @ApiProperty({
        description: 'Password of user ',
        example: 'Xuanchimto123'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    @MinLength(6,{message:'Password must be at least 6 characters'})
    password: string;

    @ApiProperty({
        description: 'Full name of user ',
        example: 'Nguyen Le Minh Xuan'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    fullname: string;

    @ApiProperty({
        description: 'Date of birth of user ',
        example: '1999-12-31'
    })
    @IsDate()
    @IsNotEmpty()
    @Transform(({ value }) => new Date(value))
    dateOfBirth: Date;

    @ApiProperty({
        description: 'Avatar of user ',
        example: 'https://thumbs.dreamstime.com/b/default-profile-picture-avatar-photo-placeholder-vector-illustration-default-profile-picture-avatar-photo-placeholder-vector-189495158.jpg'
    })
    @IsString()
    avatar: string;

    @ApiProperty({
        description: 'Address of user ',
        example: 'Ho Chi Minh City'
    })
    @IsString()
    @MaxLength(150)
    address: string;
    
   

}
export class UserStyleDto {
  @ApiProperty({
    description: 'User color preference',
    example: ['blue', 'green'],
  })
  @IsString({ each: true })
  @IsOptional()
  color?: string[];

  @ApiProperty({
    description: 'User material preference',
    example: ['cotton', 'silk'],
  })
  @IsString({ each: true })
  @IsOptional()
  material?: string[];

  @ApiProperty({
    description: 'User size preference',
    example: ['M', 'L'],
  })
  @IsString({ each: true })
  @IsOptional()
  size?: string[];

  @ApiProperty({
    description: 'User hobbies',
    example: ['reading', 'traveling'],
  })
  @IsString({ each: true })
  @IsOptional()
  hobby?: string[];

  @ApiProperty({
    description: 'User age range',
    example: '25-30',
  })
  @IsString()
  @IsOptional()
  age?: string;

  @ApiProperty({
    description: 'Zodiac sign of user',
    example: 'Leo',
  })
  @IsString()
  @IsOptional()
  zodiacSign?: string;

  @ApiProperty({
    description: 'User style',
    example: ['casual'],
  })
  @IsArray()
  @IsOptional()
  style?: string[];

  @ApiProperty({
    description: 'gender of user',
    example:'male'
  })
  @IsString()
  @IsOptional()
  gender?: string;
}

export class UpdateUserProfileDto {
  @ApiProperty({
    description: 'Firstname of user',
    example: 'Nguyên Lê Minh',
  })
  @IsString()
  @MaxLength(20)
  @MinLength(2)
  @IsOptional()
  firstname?: string;

  @ApiProperty({
    description: 'Lastname of user',
    example: 'Xuân',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @MinLength(2)
  lastname?: string;

  @ApiProperty({
    description: 'Date of birth of user',
    example: '1999-12-31',
  })
  @IsDate()
  @Transform(({ value }) => new Date(value))
  @IsOptional()
  dateOfBirth?: Date;

  @ApiProperty({
    description: 'Address of user',
    example: 'Duong Quan Ham, Phuong 5, Quan 6, TP.HCM',
  })
  @IsString()
  @MaxLength(150)
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Gender of user (male, female, other)',
    example: 'male',
  })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({
    description: 'Phone number of user',
    example: '0123456789',
  })
  @IsString()
  @IsOptional()
  @MaxLength(11)
  phone?: string;

  @ApiProperty({
    description: 'Description of user',
    example: 'I am a student',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Banking number of user',
    example: '123456789',
  })
  @IsString()
  @IsOptional()
  bankingNumber?: string;

  @ApiProperty({
    description: 'Banking name of user',
    example: 'Vietcombank',
  })
  @IsString()
  @IsOptional()
  bankingName?: string;

  @ApiProperty({
    description: 'Name of the banking user',
    example: 'Nguyen Van A',
  })
  @IsString()
  @IsOptional()
  bankingNameUser?: string;

  @ApiProperty({
    description: 'Branch of the banking user',
    example: 'Ho Chi Minh City',
  })
  @IsString()
  @IsOptional()
  bankingBranch?: string;

}

  export class DeleteUserDto {
    
    @ApiProperty({
        description: 'Id of user ',
        example: '60e1d0b5d8f1f40015e4e8b0'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(40)
    _id: string;
}
export class BlockUserDto {
        
    @ApiProperty({
        description: 'Id of user ',
        example: '60e1d0b5d8f1f40015e4e8b0'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(40)
    _id: string;


    @ApiProperty({
        description: 'Block status of user ',
        example: 'true'
    })
    @IsBoolean()
    @IsNotEmpty()
    isBlock: boolean;
}
export class ChangePasswordDto {
  @ApiProperty({
    description: 'New password',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;

  @ApiProperty({
    description: 'Old password',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  oldPassword: string;
}