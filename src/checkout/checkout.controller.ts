import { Controller, Post, Param, Req } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { Request } from 'express';
@Controller('checkout')
export class CheckoutController {
    constructor(private readonly checkoutService: CheckoutService) {}

    @Post('momo/:userId')
    async checkoutWithMomo(@Param('userId') userId: string) {
        try {
            const result = await this.checkoutService.momoPayment(userId);
            return {
                message: 'Thanh toán với MoMo được tạo thành công.',
                ...result
            };
        } catch (error) {
            return { message: error.message };
        }
    }
    @Post('callback/momo')
    async momoCallback(
      @Req() request: Request,
    ) {
      console.log('MoMo callback:', request.body);
        return { message: 'Callback from MoMo' };
    }
}
