import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { RatingService } from './rating.service';
import { request, Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import {
   CreateRatingDto,
} from '@app/libs/common/dto';
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MemberGuard } from '@app/libs/common/gaurd';

@ApiTags('Rating')
@Controller('rating')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

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
  @ApiCreatedResponse({ description: 'Rating created successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @HttpCode(201)
  async createRatingController(
    @Body() createRatingDto: CreateRatingDto,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    try {
      const userId = this.getUserIdFromToken(request);
      await this.ratingService.createRatingService( userId,createRatingDto);
      return { message: 'Rating created successfully' };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to create rating',
      );
    }
  }

  @Get('get-list-detail-rating')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Get list detail rating' })
  async getListDetailRating(
    @Query('targetId') targetId: string,
    @Req() request: Request,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ratingService.getRatingForExchangeService(userId, targetId);
  }

  @Get('get-list-detail-sale')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Get list detail rating' })
  async getListDetailRatingForSale(
    @Query('targetId') targetId: string,
    @Req() request: Request,
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.ratingService.getRatingForSaleService(userId, targetId);
  }

}
