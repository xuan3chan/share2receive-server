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
  ApiTags,
} from '@nestjs/swagger';
import { PermissionGuard } from '@app/libs/common/gaurd';
import { Subject, Action } from '@app/libs/common/decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Subject('admin')
  @Action('create')
  @UseGuards(PermissionGuard)
  @ApiCreatedResponse({ description: 'Admin created successfully' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @HttpCode(201)
  @Post()
  async createAdminController(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.createAdminService(
      createAdminDto
    );
  }
  @Action('update')
  @Subject('admin')
  @UseGuards(PermissionGuard)
  @ApiOkResponse({ description: 'Admin updated successfully' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @HttpCode(200)
  @Put(':id')
  async updateAdmincontroller(
    @Param('id') id: string
    ,@Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.updateAdminService(
      id,
     updateAdminDto
    );
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
  @ApiOkResponse({ description: 'Admin listed successfully' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @HttpCode(200)
  @Get()
  async listAdminController() {
    return this.adminService.listAdminService();
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
}
