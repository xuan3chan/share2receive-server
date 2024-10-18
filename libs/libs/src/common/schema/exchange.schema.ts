import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument } from 'mongoose';
import { ExchangeStatusE } from '../enum';

@Schema({
  timestamps: true,
})
export class Exchange extends Document {
  // Người yêu cầu trao đổi (người gửi yêu cầu)
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  requesterId: string;

  // Người nhận yêu cầu trao đổi (người được yêu cầu)
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  receiverId: string;

  // Sản phẩm của người gửi yêu cầu
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true })
  requesterProductId: string;

  // Sản phẩm của người nhận yêu cầu
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true })
  receiverProductId: string;

  // Trạng thái yêu cầu trao đổi (pending, accepted, rejected, canceled)
  @Prop({
    type: mongoose.Schema.Types.String,
    enum: ExchangeStatusE,
    default: 'pending',
  })
  exchangeStatus: string;

  // Lý do từ chối yêu cầu (nếu có)
  @Prop({ type: mongoose.Schema.Types.String, default: null })
  rejectionReason: string;

  // Ngày hoàn thành trao đổi (nếu có)
  @Prop({ type: mongoose.Schema.Types.Date, default: null })
  completedAt: Date;

  // Các yêu cầu trao đổi khác đang chờ xử lý đối với sản phẩm của người nhận
  @Prop([{ type: mongoose.Schema.Types.ObjectId, ref: 'Exchange' }])
  pendingRequests: string[];
}

export type ExchangeDocument = HydratedDocument<Exchange>;
export const ExchangeSchema = SchemaFactory.createForClass(Exchange);
