import {
  Controller,
  Post,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
  Get,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { MemberGuard } from '@app/libs/common/gaurd';
import { ApiBadRequestResponse, ApiTags } from '@nestjs/swagger';
import { IMomoPaymentResponse } from '@app/libs/common/interface';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

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
        console.log('error',error)
      throw new UnauthorizedException('Invalid or expired token');
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


}
