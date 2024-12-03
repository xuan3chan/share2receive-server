import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema(
    {
        timestamps: true,
    },
)
export class Evidence extends Document {
  @Prop({ type: mongoose.Schema.Types.String })
  batchUUID: string;
  @Prop({ type: mongoose.Schema.Types.String })
  fileExport: string;
  @Prop({ type: mongoose.Schema.Types.String })
  fileEvidence: string;
  @Prop({
    type: mongoose.Schema.Types.String,
    enum: ['paymentPeriod', 'refundPeriod'],
  })
  type: string;
  @Prop({
    type: {
      decisionBy: { type: mongoose.Schema.Types.String, default: null },
      description: { type: mongoose.Schema.Types.String, default: null },
    },
    default: {
      description: null,
      decisionBy: null,
    },
  })
  shall: {
    decisionBy: string;
    description: string;
    date: Date;
  };
}
export type EvidenceDocument = HydratedDocument<Evidence>;
export const EvidenceSchema = SchemaFactory.createForClass(Evidence);
//tạo batchUUID để phân biệt các file evidence tự động
EvidenceSchema.pre('save', function (next) {
  if (!this.batchUUID) {
    this.batchUUID = 'EVD-' + uuidv4().replace(/-/g, '').slice(0, 12);
  }
  next();
});
EvidenceSchema.pre('save', function (next) {
  if (this.type === 'refundPeriod') {
    this.batchUUID = 'RP-' + uuidv4().replace(/-/g, '').slice(0, 12);
  } else if (this.type === 'paymentPeriod') {
    this.batchUUID = 'PP-' + uuidv4().replace(/-/g, '').slice(0, 12);
  }
  next();
});
