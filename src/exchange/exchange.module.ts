import { Module } from '@nestjs/common';
import { ExchangeService } from './exchange.service';
import { ExchangeController } from './exchange.controller';
import { Exchange, ExchangeSchema } from '@app/libs/common/schema/exchange.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema, Rating, RatingSchema, User, UserSchema } from '@app/libs/common/schema';
import { EventGateway } from '@app/libs/common/util/event.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { RatingModule } from 'src/rating/rating.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Exchange.name, schema: ExchangeSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: Rating.name, schema: RatingSchema },
    ]),
  ],
  controllers: [ExchangeController],
  providers: [ExchangeService,EventGateway],
})
export class ExchangeModule {}
