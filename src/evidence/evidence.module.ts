import { Module } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { EvidenceController } from './evidence.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema, Evidence, EvidenceSchema } from '@app/libs/common/schema';
import { AbilityFactory } from '@app/libs/common/abilities';
import { AdminModule } from 'src/admin/admin.module';
import { DropboxModule } from 'src/dropbox/dropbox.module';
@Module({
  imports:[
    AdminModule,
    DropboxModule,
    MongooseModule.forFeature([{ name: Evidence.name, schema: EvidenceSchema
    },
    {name:Admin.name,schema:AdminSchema},
  ]),],
  controllers: [EvidenceController],
  providers: [EvidenceService,AbilityFactory],
})
export class EvidenceModule {}
