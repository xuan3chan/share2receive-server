import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import {
  CreateExchangeDto,
  CreateProductDto,
  DeleteImagesDto,
  idMongoDto,
  UpdateProductDto,
} from '@app/libs/common/dto';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Action, Subject } from '@app/libs/common/decorator';
import { MemberGuard, PermissionGuard } from '@app/libs/common/gaurd';

@ApiTags('Exchange')
@Controller('Exchange')
export class ExchangeController{
  constructor(private readonly exchangeService: ExchangeService) {}

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
  @ApiOperation({ summary: 'Create Exchange' })
  async createExchange(
    @Body() createExchangeDto: CreateExchangeDto,
    @Req() request: Request,
  ) {
    const requesterId = this.getUserIdFromToken(request);
    
    return this.exchangeService.createExchangeService(requesterId,createExchangeDto);
  }

  @Get('get-list-exchange')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Get list exchange' })
  async getListExchange(@Req() request: Request) {
    const userId = this.getUserIdFromToken(request);
    return this.exchangeService.getListExchangeService(userId);
  }
}