import {
  Controller,
  Get,
  UseGuards,
  Req,
  Put,
  Body,
  Patch,
  UseInterceptors,
  UploadedFile,
  Delete,
  HttpCode,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
  ApiQuery,
  ApiOperation,
} from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PermissionGuard,MemberGuard,AuthGuard } from '@app/libs/common/gaurd';
import { Subject, Action } from '@app/libs/common/decorator';
import { Request } from 'express';
import {
  DeleteUserDto,
  BlockUserDto,
  UpdateUserProfileDto,
  UserStyleDto,
  ChangePasswordDto,
} from '@app/libs/common/dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private getUserIdFromToken(request: Request): string {
    const token = (request.headers as any).authorization.split(' ')[1]; // Bearer <token>
    const decodedToken = jwt.decode(token) as JwtPayload;
    return decodedToken._id;
  }

  @Action('read')
  @Subject('user')
  @ApiOkResponse({ description: 'Get all users' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @UseGuards(PermissionGuard)
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchKey', required: false, type: String })
  @ApiQuery({
    name: 'sortField',
    required: false,
    type: String,
    description: 'The field to sort',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'The order to sort',
  })
  @Get('list-users')
  async findAllController(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchKey') searchKey: string,
    @Query('sortField') sortField: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<{ data: any }> {
    // ép kiểu 
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const data = await this.usersService.listUserService(pageNumber, limitNumber,searchKey,sortField,sortOrder);
    return { data };
  }

  @Get('view-profile/:userId')
  @ApiOkResponse({ description: 'Get user by id' })
  @ApiBadRequestResponse({ description: 'User not found' })
  @UseGuards(MemberGuard)
  async viewProfileByIdController(
    @Param('userId') userId: string,
  ): Promise<{ data: any }> {
    const data = await this.usersService.viewProfileService(userId);
    return { data };
  }

  @ApiOkResponse({ description: 'Get user by id' })
  @ApiBadRequestResponse({ description: 'User not found' })
  @UseGuards(MemberGuard)
  @Get('view-profile')
  async viewProfileController(@Req() request: Request): Promise<{ data: any }> {
    const userId = this.getUserIdFromToken(request);
    const data = await this.usersService.viewProfileService(userId);
    return { data };
  }

  @Put('update-style')
  async updateUserStyleController(
    @Req() request: Request,
    @Body() userStyleDto: UserStyleDto,
  ): Promise<{ message: string }> {
    const userId = this.getUserIdFromToken(request);
    await this.usersService.updateUserStyleService(userId, userStyleDto);
    return { message: 'User style updated successfully' };
  }

  @ApiOkResponse({ description: 'Update success' })
  @ApiBadRequestResponse({ description: 'User not found' })
  @UseGuards(AuthGuard)
  @Put('update-profile')
  async updateProfileController(
    @Req() request: Request,
    @Body() updateUserDto: UpdateUserProfileDto,
  ): Promise<{ message: string }> {
    const userId = this.getUserIdFromToken(request);
   
    await this.usersService.updateUserProfileService(
      userId,
      updateUserDto,
    );
    return { message: 'User profile updated successfully' };
  }
  @UseGuards(MemberGuard)
  @Patch('update-avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOkResponse({ description: 'Update avatar success' })
  @ApiBadRequestResponse({ description: 'bab Request' })
  @UseGuards(AuthGuard)
  async updateAvatarController(
    @Req() request: Request,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string }> {
    try {
      const userId = this.getUserIdFromToken(request);
      const fileResult = await this.cloudinaryService.uploadImageService(userId.toString(), file);
      await this.usersService.updateAvatarService(userId, fileResult.uploadResults[0].secure_url);
      return { message: 'Avatar updated successfully' };
    } catch (error) {
      // Handle the error appropriately
      throw new BadRequestException(error.message);
    }
  }

  @Get('search-user')
  @UseGuards(MemberGuard)
  @ApiOperation({ summary: 'Search for user' })
  @ApiOkResponse({ description: 'Search user success' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @ApiQuery({
    name: 'searchKey',
    required: true,
    type: String,
    description: 'The search key',
  })
  async searchUserForUserController(@Req() request: Request): Promise<{ data: any }> {
    const searchKey = request.query.searchKey as string;
    const data = await this.usersService.searchUserService(searchKey);
    return { data };
  }
  @UseGuards(PermissionGuard)
  @Action('block')
  @Subject('user')
  @Patch('update-block-user')
  @ApiOkResponse({ description: 'Block user success' })
  @ApiBadRequestResponse({ description: 'bad request' })
  async blockUserController(
    @Body() blockUserDto: BlockUserDto,
  ): Promise<{ message: string }> {
    await this.usersService.blockUserService(
      blockUserDto._id,
      blockUserDto.isBlock,
    );
    return { message: 'update block user successfully' };
  }

  @UseGuards(PermissionGuard)
  @Action('delete')
  @Subject('user')
  @Delete('delete-user')
  @ApiOkResponse({ description: 'Delete user success' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @HttpCode(200)
  async deleteUserController(
    @Body() deleteUserDto: DeleteUserDto,
  ): Promise<{ message: string }> {
    await this.usersService.deleteUserService(deleteUserDto._id);
    return { message: 'delete user successfully' };
  }
  

  @Patch('change-password')
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiBadRequestResponse({ description: 'bad request' })
  @UseGuards(MemberGuard)
  async changePasswordController(
    @Req() request: Request,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const userId = this.getUserIdFromToken(request);
    await this.usersService.changePasswordService(userId,dto.newPassword ,dto.oldPassword);
    return { message: 'Password changed successfully' };
  }
  
  

}
