import { Controller, Get, Query } from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('revenue')
@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('get-revenue-For-manager')
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
