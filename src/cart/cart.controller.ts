import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateCartDto, UpdateCartDto } from '@app/libs/common/dto/cart.dto';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { MemberGuard } from '@app/libs/common/gaurd';
@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}
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
  @Post()
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Create Cart' })
  async createCart(
    @Req() request: Request,
    @Body() createCartDto: CreateCartDto, // Sử dụng @Body để nhận DTO từ request body
  ) {
    const userId = this.getUserIdFromToken(request); // Hàm lấy userId từ token
    return this.cartService.createCartService(userId, createCartDto);
  }

  @Get()
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Get Cart of user' })
  async getCart(@Req() request: Request) {
    const userId = this.getUserIdFromToken(request);
    return this.cartService.getCartService(userId);
  }

  @Delete(':id')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Delete Cart' })
  async deleteCart(@Req() request: Request, @Param('id') cartId: string) {
    const userId = this.getUserIdFromToken(request);
    return this.cartService.deleteCartService(userId, cartId);
  }
  @Patch(':id')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Update Cart' })
  async updateCart(
    @Req() request: Request,
    @Param('id') cartId: string,
    @Body() updateCartDto: UpdateCartDto,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.cartService.updateCartService(
      userId,
      cartId,
      updateCartDto.amount,
    );
  }
}
