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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiConsumes,
  ApiBody,
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

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {}

  @Get('callback/google')
  @UseGuards(AuthGuard('google'))
  @UseFilters(OAuthExceptionFilter)
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    try {
      const googleUserProfile = req.user;
      const result = await this.authService.googleLogin(googleUserProfile);
  
      // Use process.env.FRONTEND_URL for the redirect URL
      const frontendUrl = process.env.FRONTEND_URL;
      const redirectUrl = `${frontendUrl}?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;
  
      return res.redirect(redirectUrl);
    } catch (err) {
      const frontendUrl = process.env.FRONTEND_URL ;
      const errorRedirectUrl = `${frontendUrl}?message=${encodeURIComponent(err.message)}`;
  
      return res.redirect(errorRedirectUrl);
    }
  }

  @Post('process-google')
  @ApiBody({ type: Object })
  async processGoogle(@Body('profile') profile: Record<string, any>) {
    if (!profile || typeof profile !== 'object') {
      throw new BadRequestException(
        'Profile data is required and must be an object',
      );
    }

    try {
      return await this.authService.googleLogin(profile);
    } catch (error) {
      console.error('Error in processGoogle endpoint:', error.message);
      throw error;
    }
  }

  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'register successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Post('register')
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
    setCookie(response, 'refreshToken', result.refreshToken);
    setCookie(response, 'accessToken', result.accessToken);
    const userDecode = encodeURIComponent(JSON.stringify(result.user));
    setCookie(response, 'userData', userDecode);
    return { message: 'successfully', data: result };
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
    if (loginResult.user.role != 'user') {
      setCookie(response, 'refreshToken', loginResult.refreshToken, {
        domain: 'https://share2receive-admin.vercel.app/',
      });
      setCookie(response, 'accessToken', loginResult.accessToken, {
        domain: 'https://share2receive-admin.vercel.app/',
      });
    }
    setCookie(response, 'refreshToken', loginResult.refreshToken);
    setCookie(response, 'accessToken', loginResult.accessToken);

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

    setCookie(response, 'refreshToken', result.refreshToken);
    setCookie(response, 'accessToken', result.accessToken);

    return { message: 'successfully', data: result };
  }

  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'logout successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Patch('logout')
  async logoutController(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const refreshToken = await request.cookies.refreshToken;
    await this.authService.logoutService(refreshToken);
    if (refreshToken) {
      clearCookie(response, 'refreshToken');
      clearCookie(response, 'accessToken');
      clearCookie(response, 'userData');
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
      statusCode: 201,
    };
  }
}
