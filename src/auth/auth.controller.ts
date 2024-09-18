import {
  Body,
  Put,
  Patch,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  Get,
  UseGuards,
  Req,
  ForbiddenException,
  UseFilters,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '@app/libs/common/dto';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { OAuthExceptionFilter } from '@app/libs/common/filter/oauth-exception.filter';
@ApiTags('authentication')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates the Google OAuth2 login flow
  }
  
  @Get('/google/redirect')
  @UseGuards(AuthGuard('google'))
  @UseFilters(OAuthExceptionFilter)
  async googleAuthRedirect(
    @Req() req,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const googleUserProfile = req.user;
      const result = await this.authService.googleLogin(googleUserProfile);
      response.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,    // Bảo mật, không cho phép truy cập từ JavaScript
        secure: process.env.NODE_ENV === 'production',  // Chỉ sử dụng trên HTTPS trong môi trường production
        maxAge: 7 * 24 * 60 * 60 * 1000,  // Thời gian sống của cookie, ví dụ: 7 ngày
      });
  
      response.cookie('accessToken', result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 1000,  // Ví dụ: 1 giờ
      });
      return result;
  
    } catch (err) {
      throw new ForbiddenException('Google login failed');
    }
  }
  

  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'register successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Post('register')
  async registerController(@Body() register: RegisterDto) {
    return await this.authService.registerService(
      register.email,
      register.password,
      register.firstname,
      register.lastname,
    );
  }

  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'login successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Post('login')
  async loginController(
    @Body() user: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const loginResult = await this.authService.loginService(
      user.account,
      user.password,
    );
    response.cookie('refreshToken', loginResult.refreshToken, {
      httpOnly: true,    // Bảo mật, không cho phép truy cập từ JavaScript
      secure: process.env.NODE_ENV === 'production',  // Chỉ sử dụng trên HTTPS trong môi trường production
      maxAge: 7 * 24 * 60 * 60 * 1000,  // Thời gian sống của cookie, ví dụ: 7 ngày
    });

    response.cookie('accessToken', loginResult.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000,  // Ví dụ: 1 giờ
    });
    return { message: 'successfully', data: loginResult };
  }

  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'refresh token successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Patch('refresh-token')
  async refreshTokenController(
    @Body() refreshToken: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refreshTokenService(
      refreshToken.refreshToken,
    );
    response.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,    // Bảo mật, không cho phép truy cập từ JavaScript
      secure: process.env.NODE_ENV === 'production',  // Chỉ sử dụng trên HTTPS trong môi trường production
      maxAge: 7 * 24 * 60 * 60 * 1000,  // Thời gian sống của cookie, ví dụ: 7 ngày
    });

    response.cookie('accessToken', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000,  // Ví dụ: 1 giờ
    });
    return { message: 'successfully', data: result };
  }

  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'logout successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Patch('logout')
  async logoutController(
    @Body() refreshToken: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    // xoa cookie
    const result = await this.authService.logoutService(
      refreshToken.refreshToken,
    );

    if (result) {
      response.clearCookie('refreshToken');
      response.clearCookie('accessToken');
      return { message: 'Logout successfully' };
    }
    return { message: 'Logout failed' };
  }

  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOkResponse({ description: 'sent code successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Post('forgot-password')
  async forgotPasswordController(@Body() forgotPassword: ForgotPasswordDto) {
    return await this.authService.forgotPasswordService(forgotPassword.email);
  }

  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'reset password successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Put('reset-password')
  async resetPasswordController(
    @Body() resetPassword: ResetPasswordDto,
  ): Promise<{ statusCode: number; message: string }> {
    const result = await this.authService.resetPasswordService(
      resetPassword.code,
      resetPassword.newPassword,
    );
    return {
      ...result,
      statusCode: 201, // Replace with the appropriate status code
    };
  }
}
