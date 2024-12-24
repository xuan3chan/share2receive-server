import { Controller, Get, Param, Put, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';
import { MemberGuard, PermissionGuard } from '@app/libs/common/gaurd';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Action, Subject } from '@app/libs/common/decorator';

@ApiTags('Transaction')
@ApiBearerAuth()
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}
  
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
  @ApiTags('ManagerTran')
  @Get('get-transaction')
  @UseGuards(PermissionGuard)
  @Subject('transaction')
  @Action('read')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getTransaction(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: string,
    @Query('search') search: string,
  ) {
    return this.transactionService.getAllTransactionFoManageService(
      page,
      limit,
      sortBy,
      sortOrder,
      search,
    )
  }

  @Get('get-list-transaction')
  @UseGuards(MemberGuard)
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getListTransaction(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Req() request: Request,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.transactionService.getAllTranOfUser(userId, page, limit);
  }
}
