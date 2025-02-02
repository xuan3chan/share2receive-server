import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument } from 'mongoose';
import { ConfirmStatusE, ExchangeStatusE, SizeE } from '../enum';
import { ShippingStatusE } from '../enum/shipping-status.enum';

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

  // Chi tiết sản phẩm của người gửi yêu cầu
  @Prop({
    type: {
      requesterProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      size: { type: mongoose.Schema.Types.String, enum: SizeE },
      colors: { type: mongoose.Schema.Types.String, required: true },
      amount: { type: mongoose.Schema.Types.Number, required: true },
    },
  })
  requestProduct: {
    requesterProductId: string;
    size: string;
    colors: string;
    amount: number;
  };

  @Prop({
    type: {
      exchangeStatus: {
        type: mongoose.Schema.Types.String,
        enum: ShippingStatusE,
      },
      confirmStatus: {
        type: mongoose.Schema.Types.String,
        enum: ConfirmStatusE,
      },
      statusDate:{
        type:mongoose.Schema.Types.Date
        }
    },
  })
  requestStatus: {
    exchangeStatus: string;
    confirmStatus: string;
    statusDate:Date
  };

  // Chi tiết sản phẩm của người nhận yêu cầu
  @Prop({
    type: {
      receiverProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      size: { type: mongoose.Schema.Types.String, enum: SizeE },
      colors: { type: mongoose.Schema.Types.String, required: true },
      amount: { type: mongoose.Schema.Types.Number, required: true },
    },
  })
  receiveProduct: {
    receiverProductId: string;
    size: string;
    colors: string;
    amount: number;
  };

  @Prop({
    type: {
      exchangeStatus: {
        type: mongoose.Schema.Types.String,
        enum: ShippingStatusE,
      },
      confirmStatus: {
        type: mongoose.Schema.Types.String,
        enum: ConfirmStatusE,
      },
      statusDate:{
      type:mongoose.Schema.Types.Date
      }
    },
  })
  receiverStatus: {
    exchangeStatus: string;
    confirmStatus: string;
    statusDate:Date
  };

  // Trạng thái yêu cầu trao đổi (pending, accepted, rejected, canceled)
  @Prop({
    type: mongoose.Schema.Types.String,
    enum: ExchangeStatusE,
    default: 'pending',
  })
  allExchangeStatus: string;

  // Phương thức vận chuyển (negotiated, GHN)
  @Prop({
    type: mongoose.Schema.Types.String,
    default: 'negotiated',
    enum: ['negotiated', 'GHN'],
  })
  shippingMethod: string;

  // Ghi chú tùy chọn
  @Prop({ type: mongoose.Schema.Types.String, default: null })
  note: string;

  // Ngày hoàn thành trao đổi (nếu có)
  @Prop({ type: mongoose.Schema.Types.Date, default: null })
  completedAt: Date;
}

export type ExchangeDocument = HydratedDocument<Exchange>;
export const ExchangeSchema = SchemaFactory.createForClass(Exchange);
