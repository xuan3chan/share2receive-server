import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema, Wallet, WalletSchema } from '@app/libs/common/schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AbilityFactory } from '@app/libs/common/abilities';

import { EncryptionModule } from 'src/encryption/encryption.module';
import { MailerModule } from 'src/mailer/mailer.module';
import { AdminModule } from 'src/admin/admin.module';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  imports: [
    forwardRef(() => EncryptionModule),
    WalletModule,
    AdminModule,
    CloudinaryModule,
    MailerModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Wallet.name, schema: WalletSchema }
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, AbilityFactory],
  exports: [UsersService],
})
export class UsersModule {}
