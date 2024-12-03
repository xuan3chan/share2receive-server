import { Module } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { EvidenceController } from './evidence.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema, Evidence, EvidenceSchema } from '@app/libs/common/schema';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
@Module({
  imports:[
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // Thư mục chứa file
      serveRoot: '/files', // URL để truy cập file
    }),
    MongooseModule.forFeature([{ name: Evidence.name, schema: EvidenceSchema
    },
    {name:Admin.name,schema:AdminSchema},
  ]),],
  controllers: [EvidenceController],
  providers: [EvidenceService],
})
export class EvidenceModule {}
