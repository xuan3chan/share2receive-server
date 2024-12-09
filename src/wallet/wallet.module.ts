import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema, Wallet, WalletSchema } from '@app/libs/common/schema';
import { RevenueModule } from 'src/revenue/revenue.module';

@Module({
  imports: [
    RevenueModule,
    MongooseModule.forFeature([
      { name: Wallet.name, schema: WalletSchema },
      {name: User.name, schema: UserSchema}
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService]
})
export class WalletModule {}
