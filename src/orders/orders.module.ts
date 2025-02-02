import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import {
  Order,
  OrderSchema,
  SubOrder,
  SubOrderSchema,
  OrderItem,
  OrderItemSchema,
  Product,
  ProductSchema,
  Cart,
  CartSchema,
  User,
  UserSchema,
  Transaction,
  TransactionSchema,
  Rating,
  RatingSchema,
} from '@app/libs/common/schema';
import { TransactionModule } from 'src/transaction/transaction.module';
import { GatewayModule } from '@app/libs/common/util/gateway.module';
import { MailerModule } from 'src/mailer/mailer.module';
import { AdminModule } from 'src/admin/admin.module';
import { AbilityFactory } from '@app/libs/common/abilities';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: SubOrder.name, schema: SubOrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: Product.name, schema: ProductSchema },
      {name:Cart.name,schema:CartSchema},
      {name:User.name,schema:UserSchema},
      { name: Rating.name, schema: RatingSchema },
      
      
    ]),
    AdminModule,
    TransactionModule,
    GatewayModule,
    MailerModule
    
  ],
  controllers: [OrdersController],
  providers: [OrdersService,AbilityFactory],
  exports: [OrdersService], // Nếu cần sử dụng ở module khác
})
export class OrdersModule {}
