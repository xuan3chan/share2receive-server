import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true }) // Tự động thêm createdAt và updatedAt
export class Transaction extends Document {

  @Prop({ type:mongoose.Schema.Types.ObjectId, })
  orderS2RId:mongoose.Schema.Types.ObjectId; // ID của đơn hàng S2R
  @Prop({ type: mongoose.Schema.Types.ObjectId,ref:'User', required: true })
  userId: mongoose.Schema.Types.ObjectId; // ID của người dùng
  @Prop({ type: String, required: true })
  orderId: string; // Mã đơn hàng (do hệ thống tạo)

  @Prop({ type: String, required: true })
  requestId: string; // Mã yêu cầu (requestId)

  @Prop({ type: Number, required: true })
  amount: number; // Số tiền giao dịch

  @Prop({ type: String, required: true })
  orderInfo: string; // Thông tin đơn hàng

  @Prop({ type: String, required: true })
  orderType: string; // Loại đơn hàng (momo_wallet, etc.)

  @Prop({ type: Number, required: true })
  transId: number; // Mã giao dịch do MoMo cung cấp

  @Prop({ type: Number, required: true })
  resultCode: number; // Mã trạng thái giao dịch (0: thành công, các mã khác là lỗi)

  @Prop({ type: String, required: true })
  message: string; // Thông báo từ MoMo

  @Prop({ type: String, required: true })
  payType: string; // Phương thức thanh toán (qr, card, etc.)

  @Prop({ type: Number, required: true })
  responseTime: number; // Thời gian phản hồi (timestamp)

  @Prop({ type: String, default: null })
  extraData: string; // Dữ liệu bổ sung từ hệ thống

  @Prop({ type: String, required: true })
  signature: string; // Chữ ký bảo mật từ MoMo

  @Prop({ type: mongoose.Schema.Types.String,enum:['nomal','refunded'], default: 'nomal' })
  status: string; 
}

export type TransactionDocument = Transaction & Document;
export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index({ orderInfo: 'text' });