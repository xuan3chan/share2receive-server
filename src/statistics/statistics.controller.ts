import {
  Controller,
  Get,
  HttpCode,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';
import { MemberGuard, PermissionGuard } from '@app/libs/common/gaurd';
import { Action, Subject } from '@app/libs/common/decorator';
@ApiTags('statistics')
@ApiBearerAuth()
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}
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
  @Get('get-static-saller')
  @UseGuards(MemberGuard)
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-12-01' })
  @ApiQuery({ name: 'viewBy', required: false, enum: ['day', 'month', 'year'] })
  async getStaticSallerController(
    @Req() request: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('viewBy') viewBy: string,
  ): Promise<any> {
    const userId = this.getUserIdFromToken(request);
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.statisticsService.getStaticSallerService(
      userId,
      start,
      end,
      viewBy,
    );
  }

  @Get('get-static-eco-of-user')
  @UseGuards(MemberGuard)
  async getStaticEcoController(@Req() request: Request): Promise<any> {
    const userId = this.getUserIdFromToken(request);
    return this.statisticsService.getStaticEcoService(userId);
  }

  @Get('get-static-eco-all')
  async getStaticEcoAllController(): Promise<any> {
    return this.statisticsService.getStaticAllEcoService();
  }

  @Get('get-time-add-cart')
  @UseGuards(MemberGuard)
  async getTimeAddCartController(@Req() request: Request): Promise<any> {
    const userId = this.getUserIdFromToken(request);
    return this.statisticsService.getStaticTimeAddCartService(userId);
  }

  @ApiTags('manager-statistics')
  @Get('get-time-register')
  @UseGuards(PermissionGuard)
  @Subject('statistics')
  @Action('read')
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-12-01' })
  @ApiQuery({ name: 'viewBy', required: false, enum: ['day', 'month', 'year'] })
  async getTimeRegisterController(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('viewBy') viewBy: string,
  ): Promise<any> {
    return this.statisticsService.getStaticTimeRegisterService(
      startDate,
      endDate,
      viewBy,
    );
  }

  @ApiTags('manager-statistics')
  @Get('get-static-order')
  @UseGuards(PermissionGuard)
  @Subject('statistics')
  @Action('read')
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-12-01' })
  @ApiQuery({ name: 'viewBy', required: false, enum: ['day', 'month', 'year'] })
  async getStaticOrderController(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('viewBy') viewBy: string,
  ): Promise<any> {
    return this.statisticsService.getStaticOrderManagerService(
      startDate,
      endDate,
      viewBy,
    );
  }
  @ApiTags('manager-statistics')
  @Get('get-static-revenue')
  @UseGuards(PermissionGuard)
  @Subject('statistics')
  @Action('read')
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-12-01' })
  @ApiQuery({ name: 'viewBy', required: false, enum: ['point', 'revenue'] })
  @ApiQuery({ name: 'dateBy', required: false, enum: ['day', 'month', 'year'] })
  async getStaticRevenueController(
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
    @Query('viewBy') viewBy: string,
    @Query('dateBy') dateBy: string,
  ): Promise<any> {
    return this.statisticsService.getStaticRevenueService(
      startDate,
      endDate,
      viewBy,
      dateBy,
    );
  }
}
