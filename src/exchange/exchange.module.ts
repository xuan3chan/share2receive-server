import { Module } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { ExchangeController } from './exchange.controller';
import { Exchange, ExchangeSchema } from '@app/libs/common/schema/exchange.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema, Rating, RatingSchema, User, UserSchema } from '@app/libs/common/schema';
import { EventGateway } from '@app/libs/common/util/event.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationModule } from 'src/notification/notification.module';
import { MessagesModule } from 'src/messages/messages.module';
import { AbilityFactory } from '@app/libs/common/abilities';
import { AdminModule } from 'src/admin/admin.module';

@Module({
  imports: [
    AuthModule,
    NotificationModule,
    MessagesModule,
    AdminModule,
    MongooseModule.forFeature([
      { name: Exchange.name, schema: ExchangeSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: Rating.name, schema: RatingSchema },
    ]),
  ],

  controllers: [ExchangeController],
  providers: [ExchangeService,AbilityFactory],
})
export class ExchangeModule {}
