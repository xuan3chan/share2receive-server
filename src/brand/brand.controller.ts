import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { BrandService } from './brand.service';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateBrandDto, UpdateBrandDto } from '@app/libs/common/dto/brand.dto';
import { Action, Subject } from '@app/libs/common/decorator';
import { PermissionGuard } from '@app/libs/common/gaurd';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('brand')
@ApiBearerAuth()
@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Subject('brand')
  @Action('create')
  @UseGuards(PermissionGuard)
  @ApiCreatedResponse({ description: 'Brand created successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiConsumes('multipart/form-data') // Để hỗ trợ upload file
  @UseInterceptors(FileInterceptor('imgUrl')) // Sử dụng FileInterceptor để upload file
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        imgUrl: { type: 'string', format: 'binary' }, // Hỗ trợ upload hình ảnh
      },
    },
  })
  @Post()
  async createBrandController(
    @Body() dto: CreateBrandDto,
    @UploadedFile() file: Express.Multer.File, // Nhận file hình ảnh từ yêu cầu
  ) {
    try {
      await this.brandService.createBrandService(dto, file);
      return { message: 'Brand created successfully' };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to create brand');
    }
  }

  @Subject('brand')
  @Action('update')
  @UseGuards(PermissionGuard)
  @ApiOkResponse({ description: 'Brand updated successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiConsumes('multipart/form-data') // Để hỗ trợ upload file
  @UseInterceptors(FileInterceptor('imgUrl')) // Sử dụng FileInterceptor để upload file
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['active', 'inactive'] },
        imgUrl: { type: 'string', format: 'binary' }, // Hỗ trợ upload hình ảnh
      },
    },
  })
  @Put(':id')
  async updateBrandController(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @UploadedFile() file: Express.Multer.File, // Nhận file hình ảnh từ yêu cầu
  ): Promise<{ message: string }> {
    try {
      await this.brandService.updateBrandService(id, dto, file);
      return { message: 'Brand updated successfully' };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to update brand');
    }
  }

  @Subject('brand')
  @Action('delete')
  @UseGuards(PermissionGuard)
  @Delete(':id')
  async deleteBrandController(@Param('id') id: string) {
    await this.brandService.deleteBrandService(id);
    return { message: 'Brand deleted successfully' };
  }

  @Subject('brand')
  @Action('read')
  @UseGuards(PermissionGuard)
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