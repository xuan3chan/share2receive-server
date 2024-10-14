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
import { Response,Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { OAuthExceptionFilter } from '@app/libs/common/filter/oauth-exception.filter';
import { setCookie } from '@app/libs/common/util/';

@ApiTags('authentication')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
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
    
    // Set cookies for refreshToken, accessToken, and userData
    await setCookie(response, 'refreshToken', result.refreshToken, { domain: 'share2receive-client.onrender.com', secure: process.env.NODE_ENV === 'production' });
    await setCookie(response, 'accessToken', result.accessToken, { domain: 'share2receive-client.onrender.com', secure: process.env.NODE_ENV === 'production' });
    const userDecode = encodeURIComponent(JSON.stringify(result.user));
    setCookie(response, 'userData', userDecode, { domain: 'share2receive-client.onrender.com', secure: process.env.NODE_ENV === 'production' });
    
    // Redirect to frontend
    await response.redirect(process.env.FRONTEND_URL);
    return { message: 'successfully', data: result };
  } catch (err) {
    throw new ForbiddenException('Google login failed: ' + err.message);
  }
}



  @ApiConsumes('application/json')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'register successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Post('register')
  async registerController(@Body() register: RegisterDto,@Res({ passthrough: true }) response: Response,) {
    
    const result = await this.authService.registerService(
      register.email,
      register.password,
      register.firstname,
      register.lastname,
    );
    setCookie(response, 'refreshToken', result.refreshToken)
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

    setCookie(response, 'refreshToken', result.refreshToken,);
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
    const refreshToken = request.cookies.refreshToken;
    await this.authService.logoutService(
      refreshToken,
    );
    if (refreshToken) {
      response.clearCookie('refreshToken');
      response.clearCookie('accessToken');
      response.clearCookie('userData');
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
