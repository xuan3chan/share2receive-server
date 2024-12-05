import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  UnauthorizedException,
  Req,
  Get,
  Param,
  NotFoundException,
  Res,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { EvidenceService } from './evidence.service';
import { ApiBody, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { join } from 'path';
import { PermissionGuard } from '@app/libs/common/gaurd';
import { Action, Subject } from '@app/libs/common/decorator';
@ApiTags('Evidence')
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}
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
  @Post() // Đường dẫn phù hợp
  @UseGuards(PermissionGuard) // Sử dụng guard
  @Action('create')
  @Subject('evidence')
  @ApiConsumes('multipart/form-data') // Khai báo rằng endpoint này nhận multipart data
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary', // Định dạng file
        },
        description: {
          type: 'string',
          example: 'This is a description',
        },
        type: {
          type: 'string',
          enum: ['refundPeriod', 'paymentPeriod'],
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file')) // Intercept file uploads
  async createEvidenceController(
    @UploadedFile() file: Express.Multer.File, // Nhận file
    @Req() request: Request, // Lấy request để trích xuất thông tin user
    @Body('description') description: string, // Lấy description từ body
    @Body('type') type: string, // Lấy type từ body
  ) {
    const userId = this.getUserIdFromToken(request); // Custom method lấy userId
    return this.evidenceService.createEvidenceService(
      userId,
      file,
      type,
      description,
    ); // Gọi service
  }
  
  @Put(':evidenceId')
  @UseGuards(PermissionGuard) // Sử dụng guard
  @Action('update')
  @Subject('evidence')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['fileExport', 'fileEvidence'],
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async updateEvidenceController(
    @Param('evidenceId') evidenceId: string,
    @UploadedFile() file: Express.Multer.File, // Nhận file
    @Body('type') type: string, // Nhận type từ body
  ) {
    if (!file) {
      throw new Error('File is missing');
    }

    if (!['fileExport', 'fileEvidence'].includes(type)) {
      throw new Error(
        'Invalid type. It must be either fileExport or fileEvidence.',
      );
    }

    return this.evidenceService.updateEvidenceService(evidenceId, file, type);
  }

  @Get()
  @UseGuards(PermissionGuard) // Sử dụng guard
  @Action('read')
  @Subject('evidence')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'filterBy',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'filterValue',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
  })
  async getEvidenceController(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('filterBy') filterBy: string,
    @Query('filterValue') filterValue: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    
  ) {
    // ep kieu
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.evidenceService.getEvidenceService(
      pageNumber,
      limitNumber,
      filterBy,
      filterValue,
      sortBy,
      sortOrder,
    );
  }


}
