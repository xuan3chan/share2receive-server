import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';



@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromCookies(request);
    if (!token) {
      
      throw new UnauthorizedException('token not found');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('invalid token');
    }
    return true;
  }

  private extractTokenFromCookies(request: Request): string | undefined {
    return request.cookies?.accessToken; // Assume the JWT is stored in a cookie named 'jwt'
  }
  
}
