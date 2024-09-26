import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { BrandService } from './brand.service';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateBrandDto, UpdateBrandDto } from '@app/libs/common/dto/brand.dto';

@ApiTags('brand')
@ApiBearerAuth()
@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @ApiCreatedResponse({ description: 'Brand created successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Post()
  async createBrandController(@Body() dto: CreateBrandDto) {
    await this.brandService.createBrandService(dto);
    return { message: 'Brand created successfully' };
  }

  @ApiOkResponse({ description: 'Brand updated successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Put(':id')
  async updateBrandService(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ): Promise<{ message: string }> {
    await this.brandService.updateBrandService(id, dto);
    return { message: 'Brand updated successfully' };
    
  }
  
  @Delete(':id')
  async deleteBrandController(@Param('id') id: string) {
    await this.brandService.deleteBrandService(id);
    return { message: 'Brand deleted successfully' };
  }

  @ApiOkResponse({ description: 'Get all brands' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'searchKey', required: false })
  @ApiQuery({ name: 'sortField', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @Get()
  async viewListBrandController(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchKey') searchKey: string,
    @Query('sortField') sortField: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    return this.brandService.viewListBrandService(
      page,
      limit,
      searchKey,
      sortField,
      sortOrder
    );
  } 
  @ApiOkResponse({ description: 'Get all brands' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @Get('list-brand-client')
  async listBrandForClientController(
  ): Promise<{ data: any }> {
    const data = await this.brandService.listBrandForClientService();
    return { data };
  }

}
