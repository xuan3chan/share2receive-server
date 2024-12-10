import { Controller, Get, Query, Req, UnauthorizedException } from '@nestjs/common';
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
}
