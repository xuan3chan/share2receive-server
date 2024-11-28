import { Controller, Get, Param, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';
import { MemberGuard } from '@app/libs/common/gaurd';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}
  
  private getUserIdFromToken(request: Request): string {
    const token = (request.cookies.accessToken as string) || '';
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }
    try {
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET,
      ) as JwtPayload;
      return decodedToken._id;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
  @Get(
    'check-transaction/:orderId',
  )
  async checkTransaction(
    @Param('orderId') orderId: string,
  ) {
    return this.transactionService.checkTransactionStatus(orderId);
  }

  @Put('checkTranIsPaid/:orderId')
  @UseGuards(MemberGuard)
  async checkTranIsPaid(
    @Param('orderId') orderId: string,
    @Req() request: Request,
  ) { 
    const userId = this.getUserIdFromToken(request);
    return this.transactionService.checkTransactionIsPaid(userId,orderId);
  }
  // @ApiTags('ManagerTran')
  // @Get('get-transaction')
  // async getTransaction(
  // ) {
  //   return this.transactionService.getAllTransactionFoManageService()
  // }
}
