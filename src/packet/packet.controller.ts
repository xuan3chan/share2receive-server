import { Body, Controller, Delete, Get, Param, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { PacketService } from './packet.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CreatePacketDto, UpdatePacketDto } from '@app/libs/common/dto';
import { MemberGuard, PermissionGuard } from '@app/libs/common/gaurd';
import { Action, Subject } from '@app/libs/common/decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Packet')
@ApiBearerAuth()
@Controller('packet')
export class PacketController {
  constructor(private readonly packetService: PacketService) {}
  
  @Post()
  @UseGuards(PermissionGuard)
  @Subject('packet')
  @Action('create')
  async createPacketController(
    @Body() createPacketDto: CreatePacketDto,
  ) {
    return this.packetService.createPacketService(createPacketDto);
  }
  @Put(':packetId')
  @UseGuards(PermissionGuard)
  @Subject('packet')
  @Action('update')
  async updatePacketController(
    @Body() updatePacketDto: UpdatePacketDto,
    @Param('packetId') packetId: string,
  ) {
    return this.packetService.updatePacketService(packetId,updatePacketDto);
  }

  @Delete(':packetId')
  @UseGuards(PermissionGuard)
  @Subject('packet')
  @Action('delete')
  async deletePacketController(
    @Param('packetId') packetId: string,
  ) {
    return this.packetService.deletePacketService(packetId);
  }


  @Get()
  @UseGuards(PermissionGuard)
  @Subject('packet')
  @Action('read')
  async getAllPacketsController() {
    return this.packetService.getAllPacketsService();
  }

  @Put('upload/:packetId')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseGuards(PermissionGuard)
  @Subject('packet')
  @Action('update')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPacketController(
    @Param('packetId') packetId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.packetService.updateImgService(packetId, file);
  }

  @Get('get-packet-client')
  @UseGuards(MemberGuard)
  async getPacketClientController() {
    return this.packetService.getAllPacketsForClientService();
  }
}
