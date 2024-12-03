import { Controller, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EvidenceService } from './evidence.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Evidence')
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file')) // Intercept file uploads
  async createEvidence(
    @Body() data: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.evidenceService.createEvidence(data, file);
  }
}
