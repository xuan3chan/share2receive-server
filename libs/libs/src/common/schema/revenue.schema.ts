import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

@Schema({
  timestamps: true,
})
export class Revenue extends Document {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    userId: string;
    @Prop({ type: mongoose.Schema.Types.Number, required: true })
    amount: number;
    @Prop({ type: mongoose.Schema.Types.String, enum:['in','out']})
    type: string;
    @Prop({ type: mongoose.Schema.Types.String })
    description: string;    
  
}
export type RevenueDocument = HydratedDocument<Revenue>;
export const  RevenueSchema  = SchemaFactory.createForClass(Revenue);