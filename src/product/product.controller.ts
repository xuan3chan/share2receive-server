import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import {
  CreateProductDto,
  DeleteImagesDto,
  idMongoDto,
  UpdateProductDto,
} from '@app/libs/common/dto';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Action, Subject } from '@app/libs/common/decorator';
import { MemberGuard, PermissionGuard } from '@app/libs/common/gaurd';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

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
  private getAdminNameFromToken(request: Request): string {
    const token = (request.cookies.accessToken as string) || '';
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }
    try {
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET,
      ) as JwtPayload;
      return decodedToken.adminName;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
  @Subject('product')
  @Action('read')
  @UseGuards(PermissionGuard)
  @ApiTags('Manage product')
  @ApiOperation({ summary: 'List all products for admin' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchKey', required: false, type: String })
  @ApiQuery({ name: 'sortField', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  @ApiQuery({
    name: 'filterField',
    required: false,
    type: String,
    example:
      'status:categoryId:brandId:IsDeleted:(approved.approveStatus):isBlock:type',
  })

  @ApiQuery({ name: 'filterValue', required: false, type: String })
  @Get('list')
  async listAllProductController(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchKey') searchKey?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    @Query('filterField') filter?: string,
    @Query('filterValue') filterValue?: string,
  ): Promise<any> {
    const data = await this.productService.listProductForAdminService(
      page,
      limit,
      searchKey,
      sortField,
      sortOrder,
      filter,
      filterValue,
    );
    return data;
  }

  @ApiTags('product')
  @UseGuards(MemberGuard)
  @Post()
  @ApiConsumes('application/json') // Sử dụng application/json cho DTO
  async createProductController(
    @Req() request: Request,
    @Body() createProductDto: CreateProductDto, // Xử lý sản phẩm thông qua DTO
  ): Promise<{ data: any; message: string }> {
    const userId = this.getUserIdFromToken(request); // Lấy userId từ token đã xác thực
    const newProduct = await this.productService.createProductService(
      userId,
      createProductDto,
    ); // Không truyền files
    return { data: newProduct, message: 'Product created successfully' };
  }
  @ApiTags('product')
  @UseGuards(MemberGuard)
  @Post('upload-images/:productId')
  @ApiConsumes('multipart/form-data') // Xử lý hình ảnh riêng qua multipart/form-data
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('images', 10)) // Cho phép upload nhiều ảnh
  async uploadProductImages(
    @Req() request: Request,
    @UploadedFiles() files: Express.Multer.File[], // Nhận mảng các file
    @Param('productId') productId: string, // Lấy productId từ route params
  ): Promise<{ message: string }> {
    const userId = this.getUserIdFromToken(request); // Lấy userId từ token đã xác thực
    await this.productService.uploadProductImages(userId, productId, files); // Upload hình ảnh cho sản phẩm đã tạo
    return { message: 'Images uploaded successfully' };
  }
  @ApiTags('product')
  @UseGuards(MemberGuard)
  @Patch('delete-images/:productId')
  async deleteProductImages(
    @Req() request: Request,
    @Param('productId') productId: string,
    @Body() dto: DeleteImagesDto,
  ): Promise<{ message: string }> {
    const userId = this.getUserIdFromToken(request);
    await this.productService.deleteImageService(
      userId,
      productId,
      dto.publicIds,
    );
    return { message: 'Images deleted successfully' };
  }
  @ApiTags('product')
  @UseGuards(MemberGuard)
  @Put(':productId')
  async updateProductController(
    @Req() request: Request,
    @Param('productId') productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<{ data: any; message: string }> {
    const userId = this.getUserIdFromToken(request);
    const updatedProduct = await this.productService.updateProductService(
      userId,
      productId,
      updateProductDto,
    );
    return { data: updatedProduct, message: 'Product updated successfully' };
  }
  @ApiTags('product')
  @UseGuards(MemberGuard)
  @Delete(':productId')
  async deleteProductController(
    @Req() request: Request,
    @Param('productId') productId: string,
  ): Promise<{ message: string }> {
    const userId = this.getUserIdFromToken(request);
    await this.productService.deleteProductService(userId, productId);
    return { message: 'Product deleted successfully' };
  }

  @ApiTags('product')
  @UseGuards(MemberGuard)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
        },
      },
    },
  })
  @Patch('update-status/:productId')
  async updateProductStatusController(
    @Req() request: Request,
    @Param('productId') productId: string,

    @Body('status') status: string,
  ): Promise<{ message: string }> {
    const userId = this.getUserIdFromToken(request);
    await this.productService.updateStatusService(userId, productId, status);
    return { message: 'Product status updated successfully' };
  }

  @ApiTags('product')     
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'List all products of user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchKey', required: false, type: String })
  @ApiQuery({ name: 'filterField', required: false, type: String })
  @ApiQuery({ name: 'filterValue', required: false, type: String })
  @ApiQuery({ name: 'sortField', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  @Get('list-product-of-user')
  async listProductController(
    @Req() request: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchKey') searchKey?: string,
    @Query('filterField') filterField?: string,
    @Query('filterValue') filterValue?: string,
    @Query('sortField') sortField: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<any> {
    const userId = this.getUserIdFromToken(request);

    try {
      const data = await this.productService.listProductService(
        userId,
        page,
        limit,
        searchKey,
        filterField,
        filterValue,
        sortField,
        sortOrder,
      );
      return data;
    } catch (error) {
      throw new BadRequestException(
        error.message || 'Failed to list products',
      );
    }
  }

  @ApiTags('product')
  @ApiOperation({ summary: 'List all products for client' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'filterCategory', required: false, type: [String] })
  @ApiQuery({ name: 'filterBrand', required: false, type: [String] })
  @ApiQuery({ name: 'filterStartPrice', required: false, type: Number })
  @ApiQuery({ name: 'filterEndPrice', required: false, type: Number })
  @ApiQuery({ name: 'filterSize', required: false, type: [String] })
  @ApiQuery({ name: 'filterColor', required: false, type: [String] })
  @ApiQuery({ name: 'filterMaterial', required: false, type: [String] })
  @ApiQuery({ name: 'filterCondition', required: false, type: [String] })
  @ApiQuery({ name: 'filterType', required: false, type: [String] })
  @ApiQuery({ name: 'filterStyle', required: false, type: [String] })
  @Get('list-product-for-client')
  async listProductForClientController(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('filterCategory') filterCategory?: string[],
    @Query('filterBrand') filterBrand?: string[],
    @Query('filterStartPrice') filterStartPrice?: number,
    @Query('filterEndPrice') filterEndPrice?: number,
    @Query('filterSize') filterSize?: string[],
    @Query('filterColor') filterColor?: string[],
    @Query('filterMaterial') filterMaterial?: string[],
    @Query('filterCondition') filterCondition?: string[],
    @Query('filterType') filterType?: string[],
    @Query('filterStyle') filterStyle?: string[],
  ): Promise<{ data: any; total: number }> {
    try {
      const { data, total } = await this.productService.listProductForClientService(
        page,
        limit,
        filterCategory,
        filterBrand,
        filterStartPrice,
        filterEndPrice,
        filterSize,
        filterColor,
        filterMaterial,
        filterCondition,
        filterType,
        filterStyle,
      );
      return { data, total };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to get products');
    }
  }
  @ApiTags('product')
  @ApiOperation({ summary: 'User can like product' })
  @Get('propose')
  async getProductsByUserStyleController(
    @Req() request: Request,
  ): Promise<{ data: any }> {
    const userId = this.getUserIdFromToken(request);
    const result = await this.productService.getProductsByUserStyleService(userId);
     // Có thể bỏ log sau khi xác nhận hoạt động
    return { data: result }; // Trả về dữ liệu trong một object
  }
  
  @ApiTags('product')
  @ApiOperation({ summary: 'Get product detail' })
  @Get(':id')
  async getProductDetailService(
    @Param('id') productId: string, // Lấy productId từ params
  ): Promise<{ data: any }> {
    const data = await this.productService.getProductDetailService(productId); // Truyền productId vào service
    return { data };
  }

  
    
 
  
  //*****************manage product***************** */


  @Subject('product')
  @Action('approve')
  @UseGuards(PermissionGuard)
  @ApiTags('Manage product')
  @ApiOperation({ summary: 'Approve product' })
  @Patch('approve/:productId')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        approveStatus: {
          type: 'string',
          enum: ['approved', 'rejected', 'pending'],
        },
        description: {
          type: 'string',
        },
      },
    },
  })
  async approveProductController(
    @Req() request: Request,
    @Param('productId') productId: string,
    @Body('approveStatus') approveStatus: string,
    @Body('description') description?: string,
  ): Promise<{ message: string }> {
    const adminName = this.getAdminNameFromToken(request);
    await this.productService.approveProductService(
      productId,
      adminName,
      approveStatus,
      description,
    );
    return { message: 'Product approved successfully' };
  }

  @Subject('product')
  @Action('block')
  @UseGuards(PermissionGuard)
  @ApiTags('Manage product')
  @ApiOperation({ summary: 'Block product' })
  @Patch('update-block/:productId')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isBlock: {
          type: 'boolean',
        }
      },
    },
  })
  async blockProductController(
    @Param('productId') productId: string,
    @Body('isBlock') isBlock: boolean,
  ): Promise<{ message: string }> {
    await this.productService.blockProductService(
      productId,
      isBlock
    );
    return { message: 'Product blocked successfully' };
  }
  
}
