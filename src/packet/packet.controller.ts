import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PacketService } from './packet.service';
import { ApiTags } from '@nestjs/swagger';
import { CreatePacketDto, UpdatePacketDto } from '@app/libs/common/dto';
import { PermissionGuard } from '@app/libs/common/gaurd';
import { Action, Subject } from '@app/libs/common/decorator';

@ApiTags('Packet')
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

  @Delete()
  @UseGuards(PermissionGuard)
  @Subject('packet')
  @Action('delete')
  async deletePacketController(
    @Param() packetId: string,
  ) {
    return this.packetService.deletePacketService(packetId);
  }

  @Get(':packetId')
  @UseGuards(PermissionGuard)
  @Subject('packet')
  @Action('read')
  async getPacketController(
    @Param() packetId: string,
  ) {
    return this.packetService.getPacketService(packetId);
  }

  @Get()
  @UseGuards(PermissionGuard)
  @Subject('packet')
  @Action('read')
  async getAllPacketsController() {
    return this.packetService.getAllPacketsService();
  }

}
