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
  UseGuards,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { CreateOrderByProductDto, UpdateInfoOrderDto } from '@app/libs/common/dto/order.dto';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { MemberGuard } from '@app/libs/common/gaurd';

@ApiTags('Orders')
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
  @UseGuards(MemberGuard)
  async createOrderController(@Req() request: Request) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.createOrderService(userId);
  }
  @Get('get-order-for-seller')
  @UseGuards(MemberGuard)
  async getOrdersForSellerController(@Req() request: Request) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.getOrdersBySellerService(userId);
  }
  @Get(':id')
  @UseGuards(MemberGuard)
  async getOrderController(
    @Req() request: Request,
    @Param('id') orderId: string,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.getOrdersService(orderId, userId);
  }

  @Patch(':id')
  @UseGuards(MemberGuard)
  async updateOrderController(
    @Req() request: Request,
    @Param('id') orderId: string,
    @Body() updateInfoOrderDto: UpdateInfoOrderDto,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.updateInfoOrderService(orderId, userId,updateInfoOrderDto.phone,updateInfoOrderDto.address);
  }

  @Post('create-now')
  @UseGuards(MemberGuard)
  async createOrderByProductController(
    @Req() request: Request,
    @Body() createOrderByProductDto: CreateOrderByProductDto,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.createOrderByProductService(
      userId,
      createOrderByProductDto,
    );
  }

  @Get()
  @UseGuards(MemberGuard)
  async getOrdersByUserController(@Req() request: Request) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.getOrdersByUserService(userId);
  }
  @Patch('cancel/:id')
  @UseGuards(MemberGuard)
  async cancelOrderController(
    @Req() request: Request,
    @Param('id') orderId: string,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.cancelOrderService(orderId, userId);
  }
  @Patch('update-status-for-sell/:id')
  @ApiConsumes('application/json') // Dùng JSON thay vì multipart/form-data
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'shipping', 'delivered', 'complete', 'canceled'],
        },
      },
    },
  })
  @UseGuards(MemberGuard)
  async updateStatusForSellerController(
    @Req() request: Request,
    @Param('id') orderId: string,
    @Body('status') status: string,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.updateSubOrderStatusService(userId, orderId, status);
  }
  
}
