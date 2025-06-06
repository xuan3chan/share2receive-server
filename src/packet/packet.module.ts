import { Module } from '@nestjs/common';
import { PacketService } from './packet.service';
import { PacketController } from './packet.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Packet, PacketSchema } from '@app/libs/common/schema';
import { AdminModule } from 'src/admin/admin.module';
import { AbilityFactory } from '@app/libs/common/abilities';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    AdminModule,
    CloudinaryModule,
    MongooseModule.forFeature([
      {
        name: Packet.name,
        schema: PacketSchema,
      },
    ]),
  ],
  controllers: [PacketController],
  providers: [PacketService,AbilityFactory],
})
export class PacketModule {}
