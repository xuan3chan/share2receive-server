import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from '@app/libs/common/dto/category.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionGuard } from '@app/libs/common/gaurd';
import { Action, Subject } from '@app/libs/common/decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { PriorityE, TypeCategoryE } from '@app/libs/common/enum';

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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('imgUrl'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: Object.values(PriorityE) }, // Reference the correct enum
        type: { type: 'string', enum: Object.values(TypeCategoryE) }, // Reference the correct enum
        status: { type: 'string', enum: ['active', 'inactive'] },
        imgUrl: { type: 'string', format: 'binary' },
      },
    },
  })
  async createCategoryController(
    @Body() dto: CreateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      await this.categoryService.createCategoryService(dto, file);
      return { message: 'Category created successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Subject('category')
  @Action('update')
  @UseGuards(PermissionGuard)
  @ApiOkResponse({ description: 'Category updated successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('imgUrl'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: Object.values(PriorityE) }, // Correct enum reference
        type: { type: 'string', enum: Object.values(TypeCategoryE) }, // Correct enum reference
        status: { type: 'string', enum: ['active', 'inactive'] },
        imgUrl: { type: 'string', format: 'binary' },
      },
    },
  })
  @Put(':id')
  async updateCategoryController(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      await this.categoryService.updateCategoryService(id, dto, file);
      return { message: 'Category updated successfully' };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to update category');
    }
  }

  @Subject('category')
  @Action('delete')
  @UseGuards(PermissionGuard)
  @ApiOkResponse({ description: 'Category deleted successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @Delete(':id')
  async deleteCategoryController(@Param('id') id: string) {
    await this.categoryService.deleteCategoryService(id);
    return { message: 'Category deleted successfully' };
  }

  @Subject('category')
  @Action('read')
  @UseGuards(PermissionGuard)
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
    return this.categoryService.viewListCategoryService(
      page,
      limit,
      searchKey,
      sortField,
      sortOrder,
    );
  }

  @Get('list-category-client')
  async listCategoryForClientController(): Promise<{ data: any }> {
    const data = await this.categoryService.listCategoryForClientService();
    return { data };
  }
}
