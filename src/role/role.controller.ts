import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  Put,
  Get,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto,UpdateRoleDto,DeleteRoleDto } from '@app/libs/common/dto';

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Action, Subject } from '@app/libs/common/decorator';
import { PermissionGuard } from '@app/libs/common/gaurd';

@ApiTags('role')
@ApiBearerAuth()
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}
  @UseGuards(PermissionGuard)
  @Action('create')
  @Subject('role')
  @ApiCreatedResponse({ description: 'Role created successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @HttpCode(201)
  @Post()
  async createRoleController(@Body() role: CreateRoleDto) {
    await this.roleService.createRoleService(role.name, role.permissionID);
    return { message: 'Role created successfully' };
  }

  @UseGuards(PermissionGuard)
  @Action('update')
  @Subject('role')
  @ApiOkResponse({ description: 'Role updated successfully' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @HttpCode(200)
  @Put()
  async updateRoleController(
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<{ message: string }> {
    await this.roleService.updateRoleService(
      updateRoleDto._id,
      updateRoleDto.name,
      updateRoleDto.permissionID,
    );
    return { message: 'Role updated successfully' };
  }

  // @Action('read')
  // @Subject('role')
  // @UseGuards(PermissionGuard)
  @Get()
  @ApiOkResponse({ description: 'Get all roles' })
  @ApiBadRequestResponse({ description: 'Bad Request' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async viewlistRoleController(
    @Query('page') page: number,  // default value if page is not provided
    @Query('limit') limit: number, // default value if limit is not provided
  ): Promise<{ data: any }> {
    const data = await this.roleService.viewlistRoleService(page, limit);
    return { data };
  }
  
  
  @UseGuards(PermissionGuard)
  @Action('delete')
  @Subject('role')
  @Delete()
  @ApiOkResponse({ description: 'Delete user success' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @HttpCode(200)
  async deleteRoleController(@Body() deleteRoleDto: DeleteRoleDto) {
    return this.roleService.deleteRoleService(deleteRoleDto.id);
  }
}
