import { Module } from '@nestjs/common';
import { ConfigsService } from './configs.service';
import { ConfigsController } from './configs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Configs, ConfigsSchema } from '@app/libs/common/schema';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Configs.name, schema: ConfigsSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [ConfigsController],
  providers: [ConfigsService],
  exports: [ConfigsService],
})
export class ConfigsModule {}
