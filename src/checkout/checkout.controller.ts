import {
  Controller,
  Post,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
  Get,
  Body,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { MemberGuard } from '@app/libs/common/gaurd';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { IMomoPaymentResponse } from '@app/libs/common/interface';

@ApiTags('Checkout')
@ApiBearerAuth()
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

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
  @Post('momo/:orderId')
  @UseGuards(MemberGuard)
  @ApiBadRequestResponse({ description: 'Thanh toán với MoMo thất bại.' })
  async checkoutWithMomo(
    @Req() request: Request,
    @Param('orderId') orderId: string,
  ) {
    try {
      const userId = this.getUserIdFromToken(request);
      const result = await this.checkoutService.momoPayment(userId, orderId);
      return {
        message: 'Thanh toán với MoMo được tạo thành công.',
        ...result,
      };
    } catch (error) {
      return { message: error.message };
    }
  }
  @Post('callback/momo')
  async momoCallback(@Req() request: Request) {
    const body: IMomoPaymentResponse = request.body;

    const processResult = await this.checkoutService.momoCallbackService(body);
    return processResult;

    // Kiểm tra các trường cần thiết
  }
  @Post('checkoutout-agreement/:orderId')
  @UseGuards(MemberGuard)
  async checkoutWithAgreement(
    @Req() request: Request,
    @Param('orderId') orderId: string,
  ) {
    try {
      const userId = this.getUserIdFromToken(request);
      const result = await this.checkoutService.checkoutByAgreementService(userId, orderId);
      return {
        message: 'Thành công khi thanh toán khi nhận hàng',
        ...result,
      };
    } catch (error) {
      return { message: error.message };
    }
  }

  @Post('momo-point')
  @ApiBody({ schema: { example: { point: 100 } } })
  @UseGuards(MemberGuard)
  @ApiBadRequestResponse({ description: 'Thanh toán với MoMo thất bại.' })
  async momoPaymentPointController(
    @Req() request: Request,
    @Body('point') point: number,
  ) {
    try {
      const userId = this.getUserIdFromToken(request);
      const result = await this.checkoutService.momoPaymentPoint(userId, point);
      return {
        message: 'Thanh toán với MoMo được tạo thành công.',
        ...result,
      };
    } catch (error) {
      return { message: error.message };
    }
  }
  @Post('momo-packet-point')
  @ApiBody({ schema: { example: { packetId: '67514010014b30bb84740c3b' } } })
  @UseGuards(MemberGuard)
  @ApiBadRequestResponse({ description: 'Thanh toán với MoMo thất bại.' })
  async checkoutPacketController(
    @Req() request: Request,
    @Body('packetId') packetId: string,
  ) {
    try {
      const userId = this.getUserIdFromToken(request);
      const result = await this.checkoutService.checkoutPacketService(userId, packetId);
      return {
        message: 'Thanh toán với MoMo được tạo thành công.',
        ...result,
      };
    } catch (error) {
      return { message: error.message };
    }
  }
  @Post('wallet-point')
  @ApiBody({ schema: { example: { orderId: '67514010014b30bb84740c3b' } } })
  @UseGuards(MemberGuard)
  @ApiBadRequestResponse({ description: 'Thanh toán với ví thất bại.' })
  async walletPaymentPointController(
    @Req() request: Request,
    @Body('orderId') orderId: string
  ) {
    try {
      const userId = this.getUserIdFromToken(request);
      const result = await this.checkoutService.checkoutByWalletService(userId, orderId);
      return {
        message: 'Thanh toán với ví được tạo thành công.',
        ...result,
      };
    } catch (error) {
      return { message: error.message };
    }
  }
}
