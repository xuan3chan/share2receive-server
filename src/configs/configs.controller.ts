import { Body, Controller, Get, Param, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigsService } from './configs.service';
import { ApiBody, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UpdateConfigDto } from '@app/libs/common/dto';

@ApiTags('configs')
@Controller('configs')
export class ConfigsController {
  constructor(private readonly configsService: ConfigsService) {}

  @Put(':id')
  async updateConfigsController(
    @Body() updateConfigDto: UpdateConfigDto,
    @Param('id') id: string,
  ) {
    // Assuming file is used somewhere else in the method
    return this.configsService.updateConfigsService(
      id,
      updateConfigDto,
      
    );
  }
  
  @Get()
  async getConfigs() {
    return this.configsService.getConfigs();
  }

  @Put('upload/:id')
  @UseInterceptors(FileInterceptor('file'))
  @Put('upload/:id')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['sectionUrl_1', 'sectionUrl_2'],
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadConfigsController(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
    @Body('type') type: string,
  ) {
    // Assuming file is used somewhere else in the method
    return this.configsService.updateSessionUrl(
      id,
      type,
      file,
    );
  }
}
