import { ApiProperty } from "@nestjs/swagger";  
import { IsDate,MinLength, IsEmail, IsNotEmpty, IsString, MaxLength,Matches } from "class-validator";

export class LoginDto {
    
    @ApiProperty({
        description: 'Email of user or username',
        example: 'xuanchimto@gmail.com'
    })
    @IsString()
    account: string;

    @ApiProperty({
        description: 'Username of user ',
        example: 'Xuanchimto123'
    })
    @IsString()
    @IsNotEmpty({message:'Password is required'})
    @MaxLength(80)
    
    password: string;
}
export class ResetPasswordDto {

    @ApiProperty({
        description: 'Code',
        example: 'string'
    })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({
        description: 'New password',
        example: 'string'
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    newPassword: string;
}
export class RegisterDto {
    

    @ApiProperty({
        description: 'firstname of user',
        example: 'Nguyên Lê Minh'
    })
    @IsString()
    @IsNotEmpty()
    firstname: string;

    @ApiProperty({
        description: 'Full name of user ',
        example: 'Xuân'
    })
    @IsString()
    @IsNotEmpty()
    lastname: string;

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
}
export class ForgotPasswordDto {
    
    @ApiProperty({
        description: 'Email of user ',
        example: 'xuanchimto@gmail.com'
    })
    @IsString()
    @IsNotEmpty({message:'Email is required'})
    @MaxLength(100)
    @IsEmail({},{message:'please enter correct email'})
    email: string; 
}

export class RefreshTokenDto {
    
    @ApiProperty({
        description: 'Refresh token',
        example: 'string'
    })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}
