import { ExceptionFilter, Catch, ArgumentsHost, HttpException, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { TokenError } from 'passport-oauth2';

@Catch(TokenError)
export class OAuthExceptionFilter implements ExceptionFilter {
  catch(exception: TokenError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    response
      .status(400)
      .json({
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: 'Google login failed: ' + exception.message,
      });
  }
}