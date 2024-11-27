import { Module } from '@nestjs/common';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Rating, RatingSchema } from '@app/libs/common/schema/rating.schema';
import { SubOrderSchema } from '@app/libs/common/schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rating.name, schema: RatingSchema },
      { name: 'User', schema: RatingSchema },
      { name: 'Product', schema: RatingSchema },
      { name: 'Exchange', schema: RatingSchema },
      { name: 'SubOrder', schema: SubOrderSchema },
    ]),
  ],
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
