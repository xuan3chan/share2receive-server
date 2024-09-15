import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Admin, AdminSchema, Role, RoleSchema } from '@app/libs/common/schema';
import { MongooseModule } from '@nestjs/mongoose';
import { AbilityFactory } from '@app/libs/common/abilities';

@Module({
  imports : [
    MongooseModule.forFeature([{ name:Admin.name, schema: AdminSchema },{ name: Role.name, schema: RoleSchema }]),
    
  ],
  controllers: [AdminController],
  providers: [AdminService,AbilityFactory],
  exports: [AdminService],
})
export class AdminModule {}
