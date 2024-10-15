import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';
import { ProductSearchCriteria } from '@app/libs/common/interface';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  
  @ApiTags('product')
  @Get('search-prodcut')
  @ApiQuery({ name: 'productName', required: false, type: String })
  @ApiQuery({ name: 'categoryName', required: false, type: String })
  @ApiQuery({ name: 'brandName', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'price', required: false, type: Number })
  @ApiQuery({ name: 'condition', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'material', required: false, type: String })
  @ApiQuery({ name: 'size', required: false, type: String })
  @ApiQuery({ name: 'colors', required: false, type: String })
  @ApiQuery({ name: 'amount', required: false, type: Number })
  @ApiQuery({ name: 'style', required: false, type: String })
  async searchProductsController(
    @Query('productName') productName?: string,
    @Query('categoryName') categoryName?: string,
    @Query('brandName') brandName?: string,
    @Query('type') type?: 'sale' | 'barter',
    @Query('price') price?: number,
    @Query('condition') condition?: 'new' | 'used',
    @Query('tags') tags?: string[],
    @Query('material') material?: string,
    @Query('size') size?: string,
    @Query('colors') colors?: string,
    @Query('amount') amount?: number,
    @Query('style') style?: string,
  ) {
    try {
      const criteria: ProductSearchCriteria = {
        productName,
        categoryName,
        brandName,
        type,
        price,
        condition,
        tags, // Directly assign the tags array
        material,
        sizeVariants: size || colors || amount ? { size, colors, amount } : undefined,
        style,
      };

      const results = await this.searchService.searchProductsService(criteria);
      return { data: results };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to search products');
    }
  }
}

