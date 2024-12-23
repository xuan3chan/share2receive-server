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
