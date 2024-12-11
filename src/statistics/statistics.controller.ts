import { Controller, Get, HttpCode, Query, Req, UnauthorizedException } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';
@ApiTags('statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}
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
  @Get('get-static-saller')
  @ApiQuery({ name: 'startDate', required: false,example:'2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false,example:'2024-12-01' })
  @ApiQuery({ name: 'viewBy', required: false,enum:['day','month','year'] })
  async getStaticSallerController(
    @Req() request: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('viewBy') viewBy: string,
  ): Promise<any> {
    const userId = this.getUserIdFromToken(request);
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.statisticsService.getStaticSallerService(userId, start, end, viewBy);
  }

  @Get('get-static-eco-of-user')
  async getStaticEcoController(
    @Req() request: Request,
  ): Promise<any> {
    const userId = this.getUserIdFromToken(request);
    return this.statisticsService.getStaticEcoService(userId);
  }
  
  @Get('get-static-eco-all')
  async getStaticEcoAllController(): Promise<any> {
    return this.statisticsService.getStaticAllEcoService();
  }

  @Get('get-time-add-cart')
  async getTimeAddCartController(
    @Req() request: Request,
  ): Promise<any> {
    const userId = this.getUserIdFromToken(request);
    return this.statisticsService.getStaticTimeAddCartService(userId);
  }
  
  @ApiTags('manager-statistics')
  @Get('get-time-register')
  @ApiQuery({ name: 'startDate', required: false,example:'2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false,example:'2024-12-01' })
  @ApiQuery({ name: 'viewBy', required: false,enum:['day','month','year'] }) 
  async getTimeRegisterController(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('viewBy') viewBy: string
  ): Promise<any> {
    return this.statisticsService.getStaticTimeRegisterService(
      startDate,
      endDate,
      viewBy
    );
  }

  @ApiTags('manager-statistics')
  @Get('get-static-order')
  @ApiQuery({ name: 'startDate', required: false,example:'2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false,example:'2024-12-01' })
  @ApiQuery({ name: 'viewBy', required: false,enum:['day','month','year'] })
  async getStaticOrderController(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('viewBy') viewBy: string
  ): Promise<any> {
    return this.statisticsService.getStaticOrderManagerService(
      startDate,
      endDate,
      viewBy
    );
  }
}
