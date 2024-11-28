import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

@Schema({
  timestamps: true,
})
export class Report extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: string;
  @Prop({ type: mongoose.Schema.Types.String, enum: ['product', 'order'] })
  reportType: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  targetId: string;
  @Prop({ type: String, required: true }) // theo chủ đề
  reason: string;
  @Prop({ type: String })
  description: string;
  @Prop({ type: String, default: 'pending',enum:['pending','Processed'] }) // trạng thái
  status: string;
}

export type ReportDocument = HydratedDocument<Report>;
export const ReportSchema = SchemaFactory.createForClass(Report);
