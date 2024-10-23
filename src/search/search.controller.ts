import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiTags('product')
  @Get('search-product')
  @ApiQuery({ name: 'searchKey', required: true, type: String })
  async searchProductsController(@Query('searchKey') searchKey: string) {
    try {
      // Pass the searchKey directly to the service
      const results = await this.searchService.searchProductsService(searchKey);
      return { data: results };
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to search products',
      );
    }
  }
}
