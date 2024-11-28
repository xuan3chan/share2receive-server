import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import {
  CreateExchangeDto,
} from '@app/libs/common/dto';
import {
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MemberGuard, PermissionGuard } from '@app/libs/common/gaurd';
import { ConfirmStatusE, ExchangeStatusE } from '@app/libs/common/enum';
import { ShippingStatusE } from '@app/libs/common/enum/shipping-status.enum';
import { Action, Subject } from '@app/libs/common/decorator';

@ApiTags('Exchange')
@Controller('Exchange')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  private getUserIdFromToken(request: Request): string {
    const token = (request.cookies.accessToken as string) || '';
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
      return decodedToken._id;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Post()
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Create Exchange' })
  async createExchange(
    @Body() createExchangeDto: CreateExchangeDto,
    @Req() request: Request,
  ) {
    const requesterId = this.getUserIdFromToken(request);
    return this.exchangeService.createExchangeService(requesterId, createExchangeDto);
  }

  @Get('get-list-exchange')
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit per page', example: 10 })
  @ApiQuery({ name: 'filterUserId', required: false, description: 'Filter by user id' })
  @ApiQuery({ name: 'filterRole', required: false,enum:['requester','receiver'], description: 'Filter by role' })
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Get list of exchanges' })
  async getListExchange(
    @Req() request: Request,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('filterUserId') filterUserId: string[],
    @Query('filterRole') filterRole: string,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.exchangeService.getListExchangeService(userId, filterUserId,filterRole, page, limit);
  }
  

  @Patch('approve-exchange/:id')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Approve Exchange' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'status', type: String, enum: ExchangeStatusE, required: true })
  async updateStatusExchangeController(
    @Param('id') id: string,
    @Req() request: Request,
    @Query('status') status: string,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.exchangeService.updateStatusExchangeService(userId, id, status);
  }

  @Patch('update-status-exchange/:id')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Update Exchange Status (Shipping)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'status', type: String, enum: ShippingStatusE, required: true })
  async updateExchangeStatusWhenShippingController(
    @Param('id') id: string,
    @Req() request: Request,
    @Query('status') status: string,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.exchangeService.updateExchangeStatuswhenShippingService(id, userId, status);
  }

  @Patch('update-confirm-status-exchange/:id')
  @UseGuards(MemberGuard)
  @ApiOperation({
  summary: 'Update Exchange Confirm Status (Confirm or Reject Exchange)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'confirmStatus', type: String, enum: ConfirmStatusE, required: true })
  async updateConfirmStatusExchangeController(
    @Param('id') id: string,
    @Req() request: Request,
    @Query('confirmStatus') confirmStatus: string,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.exchangeService.updateExchangeConfirmStatusService(userId, id, confirmStatus);
  }

  @Get('get-exchange-detail/:id')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Get Exchange Detail' })
  async getExchangeDetailController(
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.exchangeService.getExchangeDetailService(userId, id);
  }
  //***********manage */
  @ApiTags('ManagerTran')
  @UseGuards(PermissionGuard)
  @Action('read')
  @Subject('exchange')
  @Get('get-list-exchange-manage')
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit per page', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field' })
  @ApiQuery({ name: 'SortOrder', required: false, description: 'Sort order',enum:['asc','desc'] })
  @ApiOperation({ summary: 'Get list of exchanges' })
  async getListExchangeManage(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('sortBy') sortBy: string,
    @Query('SortOrder') sortOrder: string,
  ) {
    const pageNumber = page ? parseInt(page.toString()) : 1;
    const limitNumber = limit ? parseInt(limit.toString()) : 10;
    return this.exchangeService.getListExchangeForManageService(pageNumber, limitNumber,sortBy,sortOrder);
  }
}
