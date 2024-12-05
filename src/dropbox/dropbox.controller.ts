import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DropboxService } from './dropbox.service';
import { Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Dropbox')
@Controller('dropbox')
export class DropboxController {
  constructor(private readonly dropboxService: DropboxService) {}
  // @Post('upload')
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  // @UseInterceptors(FileInterceptor('file'))
  // async uploadFile(@UploadedFile() file: Express.Multer.File) {
  //   const filePath = `/${file.originalname}`;
  //   const contents = file.buffer;
  //   return await this.dropboxService.uploadFile();
  // }
  @Get('get-link')
  async getTemporaryLink(@Query('fileId') fileId: string) {
    const link = await this.dropboxService.getTemporaryLink(fileId);
    return { link };
  }

  @Get('share-file')
  async getPreviewLink(@Query('filePath') filePath: string, @Res() res: Response) {
    try {
      // Lấy link xem trước từ DropboxService
      const previewLink = await this.dropboxService.shareFile(filePath);
      
      // Trả về link xem trước
      return res.json({ previewLink });
    } catch (error) {
      // Xử lý lỗi
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error fetching preview link', error });
    }
  }
}