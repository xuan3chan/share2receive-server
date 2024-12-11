import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema, Order, OrderItem, OrderItemSchema, OrderSchema, Product, ProductSchema, SubOrder, SubOrderSchema } from '@app/libs/common/schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubOrder.name, schema: SubOrderSchema },
      {name: OrderItem.name, schema: OrderItemSchema},
      {name: Order.name, schema: OrderSchema},
      {name:Product.name, schema:ProductSchema},
      {name:Cart.name, schema:CartSchema},
    ]),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
