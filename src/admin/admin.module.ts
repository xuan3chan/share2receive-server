import { forwardRef, Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Admin, AdminSchema, Role, RoleSchema } from '@app/libs/common/schema';
import { MongooseModule } from '@nestjs/mongoose';
import { AbilityFactory } from '@app/libs/common/abilities';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports : [
    forwardRef(() => RoleModule),
    MongooseModule.forFeature([{ name:Admin.name, schema: AdminSchema },{ name: Role.name, schema: RoleSchema }]),
    
  ],
  controllers: [AdminController],
  providers: [AdminService,AbilityFactory],
  exports: [AdminService],
})
export class AdminModule {}
