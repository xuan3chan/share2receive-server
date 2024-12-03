import { Module } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { EvidenceController } from './evidence.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Evidence, EvidenceSchema } from '@app/libs/common/schema';

@Module({
  imports:[
    MongooseModule.forFeature([{ name: Evidence.name, schema: EvidenceSchema
    }]),],
  controllers: [EvidenceController],
  providers: [EvidenceService],
})
export class EvidenceModule {}
