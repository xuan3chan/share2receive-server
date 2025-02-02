import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Cart,
  CartSchema,
  Configs,
  ConfigsSchema,
  Order,
  OrderItem,
  OrderItemSchema,
  OrderSchema,
  Packet,
  PacketSchema,
  Product,
  ProductSchema,
  SubOrder,
  SubOrderSchema,
  User,
  UserSchema,
  Wallet,
  WalletSchema,
} from '@app/libs/common/schema';
import { TransactionModule } from 'src/transaction/transaction.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { RevenueModule } from 'src/revenue/revenue.module';
import { ConfigsModule } from 'src/configs/configs.module';
// import { QueueService } from '@app/libs/common/util/queue.service';

@Module({
  imports: [
    WalletModule,
    MongooseModule.forFeature([
      {
        name: Cart.name,
        schema: CartSchema,
      },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: SubOrder.name, schema: SubOrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: User.name, schema: UserSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Packet.name, schema: PacketSchema },
      { name: Configs.name, schema: ConfigsSchema },
    ]),
    TransactionModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
