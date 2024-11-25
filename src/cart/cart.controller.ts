import { Body, Controller, Delete, Get, Param, Patch, Post,Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateCartDto, UpdateCartDto } from '@app/libs/common/dto/cart.dto';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { MemberGuard } from '@app/libs/common/gaurd';
@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}
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
  async deleteCart(@Req() request: Request,
  @Param('id') cartId: string,
) {
    const userId = this.getUserIdFromToken(request);
    return this.cartService.deleteCartService(userId, cartId);
  }
  @Patch(':id')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Update Cart' })
  async updateCart(@Req() request: Request,
  @Param('id') cartId: string,
  @Body() updateCartDto: UpdateCartDto,
) {
    const userId = this.getUserIdFromToken(request);
    return this.cartService.updateCartService(userId, cartId, updateCartDto.amount);
  }
}
