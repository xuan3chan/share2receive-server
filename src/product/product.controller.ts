import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UnauthorizedException, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ProductService } from './product.service';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { CreateProductDto, DeleteImagesDto, UpdateProductDto } from '@app/libs/common/dto';
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';

@ApiTags('product')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  private getUserIdFromToken(request: Request): string {
    const token = (request.cookies.accessToken as string) || '';
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload; 
      return decodedToken._id;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // Tạo sản phẩm mà không có hình ảnh
  @Post()
  @ApiConsumes('application/json')  // Sử dụng application/json cho DTO
  async createProductController(
    @Req() request: Request,
    @Body() createProductDto: CreateProductDto,  // Xử lý sản phẩm thông qua DTO
  ): Promise<{ data: any; message: string }> {
    const userId = this.getUserIdFromToken(request); // Lấy userId từ token đã xác thực
    const newProduct = await this.productService.createProductService(userId, createProductDto); // Không truyền files
    return { data: newProduct, message: 'Product created successfully' };
  }

  @Post('upload-images/:productId')
  @ApiConsumes('multipart/form-data')  // Xử lý hình ảnh riêng qua multipart/form-data
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
  @UseInterceptors(FilesInterceptor('images', 10))  // Cho phép upload nhiều ảnh
  async uploadProductImages(
    @Req() request: Request,
    @UploadedFiles() files: Express.Multer.File[],  // Nhận mảng các file
    @Param('productId') productId: string,  // Lấy productId từ route params
  ): Promise<{ message: string }> {
    const userId = this.getUserIdFromToken(request);  // Lấy userId từ token đã xác thực
    await this.productService.uploadProductImages(userId, productId, files);  // Upload hình ảnh cho sản phẩm đã tạo
    return { message: 'Images uploaded successfully' };
  }
  
  @Patch('delete-images/:productId')
  async deleteProductImages(
    @Req() request: Request,
    @Param('productId') productId: string,
    @Body() dto:DeleteImagesDto
  ): Promise<{ message: string }> {
    const userId = this.getUserIdFromToken(request);
    await this.productService.deleteImageService(userId, productId, dto.publicIds);
    return { message: 'Images deleted successfully' };
  }
  @Put(':productId')
  async updateProductController(
    @Req() request: Request,
    @Param('productId') productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<{ data: any; message: string }> {
    const userId = this.getUserIdFromToken(request);
    const updatedProduct = await this.productService.updateProductService(userId,productId, updateProductDto);
    return { data: updatedProduct, message: 'Product updated successfully' };
  }

  @Delete(':productId')
  async deleteProductController(
    @Req() request: Request,
    @Param('productId') productId: string,
  ): Promise<{ message: string }> {
    const userId = this.getUserIdFromToken(request);
    await this.productService.deleteProductService(userId, productId);
    return { message: 'Product deleted successfully' };
  }

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
  @ApiOperation({ summary: 'List all products for user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchKey', required: false, type: String })
  @ApiQuery({ name: 'sortField', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  @Get('list')
  async listProductController(
    @Req() request: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchKey') searchKey?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<any> {
    const userId = this.getUserIdFromToken(request);
    const data = await this.productService.listProductService(userId, page, limit, searchKey, sortField, sortOrder);
    return data;
  }
  //*****************manage product***************** */
  @ApiTags('Manage product')
  @ApiOperation({ summary: 'List all products for admin' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchKey', required: false, type: String })
  @ApiQuery({ name: 'sortField', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String})
  @ApiQuery({ name: 'filterField', required: false, type: String,
    example: 'status:categoryId:brandId:IsDeleted:(approved.isApproved):isBlock:type'
  })
  @ApiQuery({ name: 'filterValue', required: false, type: String,

  })
  @Get('list-all-product')
  async listAllProductController(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchKey') searchKey?: string,
    @Query('sortField') sortField?: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
    @Query('filterField') filter?: string,
    @Query('filterValue') filterValue?: string,
  ): Promise<any> {
    const data = await this.productService.listProductForAdminService(page, limit, searchKey, sortField, sortOrder,filter,filterValue);
    return data;
  }
}
