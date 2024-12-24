import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  private getUserIdFromToken(request: Request): string {
      try {
        const token = (request.headers as any).authorization.split(' ')[1]; // Bearer <token>
        const decodedToken = jwt.verify(
          token,
          process.env.JWT_SECRET,
        ) as JwtPayload;
        return decodedToken._id;
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new UnauthorizedException('Token has expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
          throw new UnauthorizedException('Invalid token');
        } else {
          throw new UnauthorizedException('Token not found');
        }
      }
    }
  @Get('get-wallet')
  async getWallet(
    @Req() request: Request,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.walletService.getWalletService(userId);
  }
}
