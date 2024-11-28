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
  Put,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import {
  CreateOrderByProductDto,
  RequestRefundDto,
  UpdateInfoOrderDto,
  UpdateShippingDto,
} from '@app/libs/common/dto/order.dto';
import { ApiBody, ApiConsumes, ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MemberGuard, PermissionGuard } from '@app/libs/common/gaurd';
import { Action, Subject } from '@app/libs/common/decorator';

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

  @Patch('cancel/:id')
  @UseGuards(MemberGuard)
  async cancelOrderController(
    @Req() request: Request,
    @Param('id') orderId: string,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.cancelOrderService(orderId, userId);
  }

  @Post()
  @UseGuards(MemberGuard)
  async createOrderController(@Req() request: Request) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.createOrderService(userId);
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

  @Delete(':subOrderId')
  @UseGuards(MemberGuard)
  async deleteSubOrderController(
    @Req() request: Request,
    @Param('subOrderId') subOrderId: string,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.deleteSubOrderService(subOrderId, userId);
  }

  @Delete(':subOrderId/:orderItemId')
  @UseGuards(MemberGuard)
  async deleteOrderItemController(
    @Param('subOrderId') subOrderId: string,
    @Param('orderItemId') orderItemId: string,
  ) {
    return this.ordersService.deleteOrderItemService(subOrderId, orderItemId);
  }

  @Get()
  @ApiQuery({
    name: 'paymentStatus',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    example: '2024-11-01', // Định dạng chuẩn ISO
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    example: '2024-11-30', // Định dạng chuẩn ISO
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'], // Giới hạn giá trị hợp lệ
  })
  @ApiQuery({
    name: 'searchKey',
    required: false,
    type: String,
  })
  @UseGuards(MemberGuard)
  async getOrdersByUserController(
    @Req() request: Request,
    @Query('paymentStatus') paymentStatus: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: string,
    @Query('searchKey') searchKey: string,
  ) {
    const userId = this.getUserIdFromToken(request);

    // Chuyển đổi dateFrom và dateTo thành Date nếu có
    const dateFromObj = dateFrom ? new Date(dateFrom) : undefined;
    const dateToObj = dateTo ? new Date(dateTo) : undefined;

    // Chuyển đổi page và limit thành number, nếu không có giá trị thì dùng mặc định
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;

    return this.ordersService.getOrdersByUserService(
      userId,
      paymentStatus,
      dateFromObj,
      dateToObj,
      pageNumber,
      limitNumber,
      sortBy,
      sortOrder,
      searchKey,
    );
  }
  @ApiTags('ManagerTran')
  @Get('get-order-for-manager')
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    example: '2024-11-01', // Định dạng chuẩn ISO
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    example: '2024-11-30', // Định dạng chuẩn ISO
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'], // Giới hạn giá trị hợp lệ
  })
  @ApiQuery({
    name: 'searchKey',
    required: false,
    type: String,
  })
  @UseGuards(PermissionGuard)
  @Subject('order')
  @Action('read')
  async getOrdersForManagerController(
    @Query('dateFrom') dateFrom: Date,
    @Query('dateTo') dateTo: Date,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: string,
    @Query('searchKey') searchKey: string,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.ordersService.getListSubOrderForManagerService(
      dateFrom,
      dateTo,
      pageNumber,
      limitNumber,
      sortBy,
      sortOrder,
      searchKey,
    );
  }

  @Get('get-order-for-seller')
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    example: '2024-11-01', // Định dạng chuẩn ISO
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    example: '2024-11-30', // Định dạng chuẩn ISO
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['asc', 'desc'], // Giới hạn giá trị hợp lệ
  })
  @ApiQuery({
    name: 'searchKey',
    required: false,
    type: String,
  })
  @UseGuards(MemberGuard)
  async getOrdersForSellerController(
    @Req() request: Request,
    @Query('dateFrom') dateFrom: Date,
    @Query('dateTo') dateTo: Date,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: string,
    @Query('searchKey') searchKey: string,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    console.log(typeof pageNumber);
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.getOrdersBySellerService(
      userId,
      dateFrom,
      dateTo,
      pageNumber,
      limitNumber,
      sortBy,
      sortOrder,
      searchKey,
    );
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

  @Put('request-refund/:subOrderId')
  @UseGuards(MemberGuard)
  async requestRefundController(
    @Param('subOrderId') subOrderId: string,
    @Body() requestRefundDto: RequestRefundDto,
  ) {
    return this.ordersService.requestRefundService(subOrderId, requestRefundDto);
  }

  @Patch(':id')
  @UseGuards(MemberGuard)
  async updateOrderController(
    @Req() request: Request,
    @Param('id') orderId: string,
    @Body() updateInfoOrderDto: UpdateInfoOrderDto,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.updateInfoOrderService(
      orderId,
      userId,
      updateInfoOrderDto.phone,
      updateInfoOrderDto.address,
    );
  }

  @Patch('update-shipping-service/:id')
  @UseGuards(MemberGuard)
  async updateShippingController(
    @Param('id') subOrderId: string,
    @Body() updateShippingDto: UpdateShippingDto,
  ) {
    return this.ordersService.updateShippingService(
      subOrderId,
      updateShippingDto.shippingService,
      updateShippingDto.note,
    );
  }

  @Patch('update-status-for-buyer/:subOrderId')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['completed'],
        },
      },
    },
  })
  @UseGuards(MemberGuard)
  async updateStatusForBuyerController(
    @Param('subOrderId') subOrderId: string,
    @Body('status') status: string,
    @Req() request: Request,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ordersService.updateStatusForBuyerService(
      userId,
      subOrderId,
      status,
    );
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
    return this.ordersService.updateSubOrderStatusService(
      userId,
      orderId,
      status,
    );
  }
  @ApiTags('ManagerTran')
  @UseGuards(PermissionGuard)
  @Action('update')
  @Subject('order')
  @Patch('update-status-refund')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        subOrderIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Danh sách các subOrderId cần cập nhật',
        },
        status: {
          type: 'string',
          enum: ['accepted', 'rejected'],
          description: 'Trạng thái hoàn tiền mới',
        },
      },
    },
  })
  async updateStatusRefundController(
    @Body('subOrderIds') subOrderIds: string[],  // Nhận mảng subOrderId
    @Body('status') status: string,
  ) {
    return this.ordersService.updateStatusForRefunds(subOrderIds, status);  // Gọi service với mảng subOrderId
  }
}
