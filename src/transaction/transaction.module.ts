import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema, Transaction, TransactionSchema, User, UserSchema } from '@app/libs/common/schema';
import { AdminModule } from 'src/admin/admin.module';
import { AbilityFactory } from '@app/libs/common/abilities';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema }
    ]),
  AdminModule
  ],
  controllers: [TransactionController],
  providers: [TransactionService,AbilityFactory],
  exports: [TransactionService], // Nếu cần sử dụng ở module khác
})
export class TransactionModule {}
