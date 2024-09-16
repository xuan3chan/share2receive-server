import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@app/libs/common/schema';
import { ConfigModule } from '@nestjs/config';
import {CloudinaryModule} from '../cloudinary/cloudinary.module';
import {AbilityFactory} from '@app/libs/common/abilities';

import { AdminModule } from 'src/admin/admin.module';
import { EncryptionModule } from 'src/encryption/encryption.module';


@Module({
  imports: [
    forwardRef(() => EncryptionModule),
    AdminModule,
    CloudinaryModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
 
  ],
  controllers: [UsersController],
  providers: [UsersService,AbilityFactory],
  exports: [UsersService],
})
export class UsersModule { }
