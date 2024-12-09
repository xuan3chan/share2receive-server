import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document,HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import {RatingTypeE} from '@app/libs/common/enum/rating-type.enum';

@Schema({
    timestamps: true,
  })
  export class Rating extends Document {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: string;
  
    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
    targetId: string; // Đây là ID của Product hoặc Exchange
  
    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
    targetUserId:string
    @Prop({ type: String, enum:RatingTypeE , required: true })
    targetType: string;
  
    @Prop({ type: mongoose.Schema.Types.Number, max: 5, min: 1, required: true })
    rating: number;
    
    @Prop({ type: mongoose.Schema.Types.String })
    comment?: string;

  }
  
  
export type RatingDocument = HydratedDocument<Rating>;
export const RatingSchema = SchemaFactory.createForClass(Rating);

