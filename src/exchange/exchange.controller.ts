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
import { MemberGuard } from '@app/libs/common/gaurd';
import { ExchangeStatusE } from '@app/libs/common/enum';
import { ShippingStatusE } from '@app/libs/common/enum/shipping-status.enum';

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
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Get list of exchanges' })
  async getListExchange(@Req() request: Request) {
    const userId = this.getUserIdFromToken(request);
    return this.exchangeService.getListExchangeService(userId);
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
}
