import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  CreateAdminDto,
  UpdateAdminDto,
  DeleteAdminDto,
  BlockAdminDto,
} from '@app/libs/common/dto';

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionGuard } from '@app/libs/common/gaurd';
import { Subject, Action } from '@app/libs/common/decorator';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

   private getUserIdFromToken(request: Request): string {
       try {
         const token = (request.headers as any).authorization.split(' ')[1]; // Bearer <token>
         const decodedToken = jwt.verify(
           token,
           process.env.JWT_SECRET,
         ) as JwtPayload;
         return decodedToken._id;
       } catch (error) {
         if (error instanceof jwt.TokenExpiredError) {
           throw new UnauthorizedException('Token has expired');
         } else if (error instanceof jwt.JsonWebTokenError) {
           throw new UnauthorizedException('Invalid token');
         } else {
           throw new UnauthorizedException('Token not found');
         }
       }
     }

  @Subject('admin')
  @Action('create')
  @UseGuards(PermissionGuard)
  @ApiCreatedResponse({ description: 'Admin created successfully' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @HttpCode(201)
  @Post()
  async createAdminController(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.createAdminService(createAdminDto);
  }
  @Action('update')
  @Subject('admin')
  @UseGuards(PermissionGuard)
  @ApiOkResponse({ description: 'Admin updated successfully' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @HttpCode(200)
  @Put(':id')
  async updateAdmincontroller(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    return this.adminService.updateAdminService(id, updateAdminDto);
  }

  @Action('delete')
  @Subject('admin')
  @UseGuards(PermissionGuard)
  @ApiOkResponse({ description: 'Admin deleted successfully' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @Delete()
  async deleteAdminController(@Body() deleteAdminDto: DeleteAdminDto) {
    return this.adminService.deleteAdminService(deleteAdminDto.id);
  }

  @Action('read')
  @Subject('admin')
  @UseGuards(PermissionGuard)
  @Get('list')
  @ApiOkResponse({ description: 'Get all admins with pagination' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchKey', required: false, type: String })
  async listAdminController(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchKey') searchKey?: string,
  ): Promise<{ data: any }> {
    const data = await this.adminService.listAdminService(page, limit,searchKey);
    return { data };
  }

  @Action('block')
  @Subject('admin')
  @UseGuards(PermissionGuard)
  @ApiOkResponse({ description: 'Admin blocked successfully' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @HttpCode(200)
  @Patch('update-block')
  async blockAdminController(@Body() blockAdminDto: BlockAdminDto) {
    return this.adminService.blockAdminService(
      blockAdminDto.id,
      blockAdminDto.isBlocked,
    );
  }

  @Get('view-profile')
  async viewProfileController(@Req() request: Request): Promise<any> {
    const id = this.getUserIdFromToken(request);
    const data = await this.adminService.viewProfileService(id);
    return { data };
  }

}
