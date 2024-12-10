import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '@app/libs/common/gaurd';
import { Action, Subject } from '@app/libs/common/decorator';

@ApiTags('revenue')
@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  
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
}
