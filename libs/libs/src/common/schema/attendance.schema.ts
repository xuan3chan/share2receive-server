import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

@Schema()
export class Attendance extends Document {
  @Prop({ type: mongoose.Schema.Types.String })
  userId: string;
  @Prop({ type: mongoose.Schema.Types.Date })
  date: Date;
  @Prop({ type: mongoose.Schema.Types.Boolean })
  isAttendance: boolean;
}
export type AttendanceDocument = HydratedDocument<Attendance>;
export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
