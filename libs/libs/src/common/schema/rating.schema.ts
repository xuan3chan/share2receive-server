import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document,HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

@Schema(
    {
        timestamps: true,
    }
)
export class Rating extends Document {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product' })
    productId: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Exchange' })
    exchangeId: string;

    @Prop({ type: mongoose.Schema.Types.Number, max:5,min:1,required: true })
    rating: number;

    @Prop({ type: mongoose.Schema.Types.String })
    comment: string;
}
export type RatingDocument = HydratedDocument<Rating>;
export const RatingSchema = SchemaFactory.createForClass(Rating);