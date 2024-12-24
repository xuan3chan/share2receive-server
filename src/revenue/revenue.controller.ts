import { Controller, Get, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { MemberGuard, PermissionGuard } from '@app/libs/common/gaurd';
import { Action, Subject } from '@app/libs/common/decorator';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
@ApiTags('revenue')
@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

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
  
  @Get('get-revenue-For-manager')
  @UseGuards(PermissionGuard)
  @Subject('revenue')
  @Action('read')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'filterBy', required: false })
  @ApiQuery({ name: 'filterValue', required: false })
  async getRevenueForManager(@Query() query: { page?: number, limit?: number, filterBy?: string, filterValue?: string }) {
    const { page, limit, filterBy, filterValue } = query;
    return this.revenueService.getAllRevenue(
      page,
      limit,
      filterBy,
      filterValue
    );
  }
  @Get('get-revenue-For-user')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'filterBy', required: false })
  @ApiQuery({ name: 'filterValue', required: false })
  @UseGuards(MemberGuard)
  async getRevenueForUser(
    @Req() request: Request,
    @Query() query: { page?: number, limit?: number, filterBy?: string, filterValue?: string }
    
  ) {
    const userId = this.getUserIdFromToken(request);
    return this.revenueService.getDiamonOfUser(userId,
      query.page,
      query.limit,
      query.filterBy,
      query.filterValue
    );
  }

}
