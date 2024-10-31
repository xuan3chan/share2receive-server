import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document,HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

@Schema({
    timestamps: true,
  })
  export class Notification extends Document {
 
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: string;

    @Prop({ type: mongoose.Schema.Types.String, required: true })
    title?: string;

    @Prop({ type: mongoose.Schema.Types.String, required: true })
    content: string;

    @Prop({ type: mongoose.Schema.Types.Boolean, required: true })
    isViewed: Boolean;

  }
  
  
export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);