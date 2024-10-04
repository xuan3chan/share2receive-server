import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from '@app/libs/common/dto/category.dto';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '@app/libs/common/gaurd';
import { Action, Subject } from '@app/libs/common/decorator';

@ApiTags('category')
@ApiBearerAuth()
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Subject('category')
  @Action('create')
  @UseGuards(PermissionGuard)
  @ApiCreatedResponse({ description: 'Category created successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Post()
  async createCategoryController(@Body() dto: CreateCategoryDto) {
    await this.categoryService.createCategoryService(dto);
    return { message: 'Category created successfully' };
  }

  @Subject('category')
  @Action('update')
  @UseGuards(PermissionGuard)
  @ApiOkResponse({ description: 'Category updated successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Put(':id')
  async updateCategoryService(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto) {
    await this.categoryService.updateCategoryService(id,dto);
    return { message: 'Category created successfully' };
  }

  @Subject('category')
  @Action('delete')
  @ApiOkResponse({ description: 'Category deleted successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Delete(':id')
  async deleteCategoryController(@Param('id') id: string) {
    await this.categoryService.deleteCategoryService(id);
    return { message: 'Category deleted successfully' };
  }

  @Subject('category')
  @Action('read')
  @ApiOkResponse({ description: 'Get all categories' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'searchKey', required: false })
  @ApiQuery({ name: 'sortField', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @Get()
  async viewListCategoryController(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchKey') searchKey: string,
    @Query('sortField') sortField: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    return this.categoryService.viewListCategoryService(page, limit, searchKey, sortField, sortOrder);
  }

  @Get('list-category-client') 
  async listCategoryForClientController(
  ): Promise<{ data: any }> {
    const data = await this.categoryService.listCategoryForClientService();
    return { data };
  }
  

}
