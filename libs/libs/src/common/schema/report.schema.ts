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
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  targetUserId: string;
  @Prop({ type: String, required: true }) // theo chủ đề
  reason: string;
  @Prop({ type: String })
  description: string;
  @Prop({ type: mongoose.Schema.Types.Boolean, default: null }) // đã kiểm tra
  isChecked:boolean;
  @Prop({ type: String, default: 'pending',enum:['pending','Processed'] }) // trạng thái
  status: string;
}

export type ReportDocument = HydratedDocument<Report>;
export const ReportSchema = SchemaFactory.createForClass(Report);
@Schema({
  timestamps: true,
})
export class ReportHistory extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ type: mongoose.Schema.Types.String,enums:['block_user','block_product','warning']})
  action:string

  @Prop({ type: mongoose.Schema.Types.String})
  decisionBy:string
  
}
export type ReportHistoryDocument = HydratedDocument<ReportHistory>;
export const ReportHistorySchema = SchemaFactory.createForClass(ReportHistory);