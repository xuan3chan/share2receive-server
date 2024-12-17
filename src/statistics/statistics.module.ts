import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema, Configs, ConfigsSchema, Order,OrderSchema, Product, ProductSchema, Revenue, RevenueSchema, SubOrder, SubOrderSchema, User, UserSchema } from '@app/libs/common/schema';
import { AdminModule } from 'src/admin/admin.module';
import { AbilityFactory } from '@app/libs/common/abilities/abilities.factory';

@Module({
  imports: [
    AdminModule,
    MongooseModule.forFeature([
      { name: SubOrder.name, schema: SubOrderSchema },
      {name: Order.name, schema: OrderSchema},
      {name:Product.name, schema:ProductSchema},
      {name:Cart.name, schema:CartSchema},
      {name:User.name, schema:UserSchema},
      {name:Revenue.name, schema:RevenueSchema},
      {name:Configs.name, schema:ConfigsSchema},
    ]),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService,AbilityFactory],
})
export class StatisticsModule {}
  