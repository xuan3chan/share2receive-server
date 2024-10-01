import { Module, forwardRef } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Role, RoleSchema } from '@app/libs/common/schema';
import { AbilityFactory } from '@app/libs/common/abilities';
import { AdminModule } from 'src/admin/admin.module';
@Module({
  imports: [
    forwardRef(() => AdminModule),
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
  
  ],
  controllers: [RoleController],
  providers: [RoleService, AbilityFactory],
  exports: [RoleService],
})
export class RoleModule {}
