import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { UpdateInfoOrderDto } from '@app/libs/common/dto/order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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

  @Post()
  async createOrderController(@Req() request: Request) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.createOrderService(userId);
  }

  @Get(':id')
  async getOrderController(
    @Req() request: Request,
    @Param('id') orderId: string,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.getOrdersService(orderId, userId);
  }

  @Patch(':id')
  async updateOrderController(
    @Req() request: Request,
    @Param('id') orderId: string,
    @Body() updateInfoOrderDto: UpdateInfoOrderDto,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.updateInfoOrderService(orderId, userId,updateInfoOrderDto.phone,updateInfoOrderDto.address);
  }
}
