import {
  Body,
  Controller,
  Post,
  Patch,
  Get,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseGuards,
  UseFilters,
  ForbiddenException,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '@app/libs/common/dto';
import { Response, Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { OAuthExceptionFilter } from '@app/libs/common/filter/oauth-exception.filter';
import { setCookie, clearCookie } from '@app/libs/common/util/';

@ApiTags('authentication')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. Google OAuth Authentication
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Redirects to Google login
  }

  @Get('callback/google')
  @UseGuards(AuthGuard('google'))
  @UseFilters(OAuthExceptionFilter)
  async googleAuthRedirect(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const googleUserProfile = req.user;
      const result = await this.authService.googleLogin(googleUserProfile);

      // Set cookies for Google login
      setCookie(response, 'refreshToken', result.refreshToken, {
        domain: 'share2receive-client.vercel.app',
      });
      setCookie(response, 'accessToken', result.accessToken, {
        domain: 'share2receive-client.vercel.app',
      });

      return response.redirect(process.env.FRONTEND_URL);
    } catch (err) {
      throw new ForbiddenException('Google login failed: ' + err.message);
    }
  }

  // 2. User Registration
  @Post('register')
  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'User registered successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  async registerController(
    @Body() register: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.registerService(
      register.email,
      register.password,
      register.firstname,
      register.lastname,
    );

    // Set cookies for registration
    setCookie(response, 'refreshToken', result.refreshToken);
    setCookie(response, 'accessToken', result.accessToken);

    return { message: 'successfully', data: result };
  }

  // 3. User Login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'User logged in successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  async loginController(
    @Body() user: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    const loginResult = await this.authService.loginService(
      user.account,
      user.password,
    );

    // Set cookies based on role or origin
    const domain =
      loginResult.user.role === 'user'
        ? 'share2receive-client.vercel.app'
        : 'share2receive-admin.vercel.app';

    setCookie(response, 'refreshToken', loginResult.refreshToken, { domain });
    setCookie(response, 'accessToken', loginResult.accessToken, { domain });

    return { message: 'successfully', data: loginResult };
  }

  // 4. Refresh Tokens
  @Patch('refresh-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'Tokens refreshed successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  async refreshTokenController(
    @Body() refreshToken: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refreshTokenService(
      refreshToken.refreshToken,
    );

    // Set refreshed tokens
    setCookie(response, 'refreshToken', result.refreshToken);
    setCookie(response, 'accessToken', result.accessToken);

    return { message: 'successfully', data: result };
  }

  // 5. Logout
  @Patch('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'User logged out successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  async logoutController(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const refreshToken = request.cookies.refreshToken;
    await this.authService.logoutService(refreshToken);

    if (refreshToken) {
      clearCookie(response, 'refreshToken', {
        domain: 'share2receive-client.vercel.app',
      });
      clearCookie(response, 'accessToken', {
        domain: 'share2receive-client.vercel.app',
      });
      return { message: 'Logout successfully' };
    }

    return { message: 'Logout failed' };
  }

  // 6. Forgot Password
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOkResponse({ description: 'Forgot password email sent' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  async forgotPasswordController(@Body() forgotPassword: ForgotPasswordDto) {
    return await this.authService.forgotPasswordService(forgotPassword.email);
  }

  // 7. Reset Password
  @Put('reset-password')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'Password reset successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  async resetPasswordController(
    @Body() resetPassword: ResetPasswordDto,
  ): Promise<{ statusCode: number; message: string }> {
    const result = await this.authService.resetPasswordService(
      resetPassword.code,
      resetPassword.newPassword,
    );
    return {
      ...result,
      statusCode: 201,
    };
  }
}
