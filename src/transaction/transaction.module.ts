import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema, Transaction, TransactionSchema, User, UserSchema } from '@app/libs/common/schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema }
    ]),
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService], // Nếu cần sử dụng ở module khác
})
export class TransactionModule {}
