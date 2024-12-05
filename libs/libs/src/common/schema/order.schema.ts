import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
@Schema({
  timestamps: true, // Tự động thêm createdAt và updatedAt
})
export class Order extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: string; // Người mua
  @Prop({ type: String }) //
  orderUUID: string;
  @Prop({ type: String, default: null })
  phone: string; // Số điện thoại người mua

  @Prop({ type: String, default: null })
  address: string; // Địa chỉ người mua

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number; // Tổng tiền toàn bộ đơn hàng

  @Prop({
    type: String,
    enum: ['pending', 'paid','PayPickup', 'failed'],
    default: 'pending',
  })
  paymentStatus: string; // Trạng thái thanh toán

  @Prop({ type: mongoose.Types.ObjectId, default: null })
  transactionId: string; // Mã giao dịch từ MoMo
  @Prop({
    type: mongoose.Schema.Types.String,
    enum: ['momo_wallet', 'agreement','point_wallet'],
    default: 'momo_wallet',
  })
  type: string; // Loại đơn hàng (momo_wallet, etc.)
  @Prop([{ type: mongoose.Schema.Types.ObjectId, ref: 'SubOrder' }])
  subOrders: mongoose.Types.ObjectId[]; // Danh sách subOrders thuộc đơn hàng
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);

@Schema({
  timestamps: true, // Tự động thêm createdAt và updatedAt
})
export class SubOrder extends Document {
  @Prop({ type: String }) //
  subOrderUUID: string; // Mã đơn hàng
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order' })
  orderId: mongoose.Schema.Types.ObjectId; // ID của đơn hàng cha

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  sellerId: string; // Người bán

  @Prop({ type: Number, required: true, min: 0 })
  subTotal: number; // Tổng tiền cho shop này

  @Prop([{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem' }])
  products: mongoose.Types.ObjectId[]; // Danh sách sản phẩm trong subOrder

  @Prop({
    type: mongoose.Schema.Types.String,
    default: 'GHN',
    enum: ['GHN', 'GHTK', 'agreement'],
  })
  shippingService: string; // Dịch vụ vận chuyển

  @Prop({ type: Number })
  shippingFee: number; // Phí vận chuyển

  @Prop({ type: mongoose.Schema.Types.String, default: null })
  note: string;

  @Prop({ 
    type:{
    status: { type: mongoose.Schema.Types.String, enum: ['approved', 'rejected', 'pending','refunded'] },
    bankingNumber: { type: mongoose.Schema.Types.String, },
    bankingName: { type: mongoose.Schema.Types.String, },
    bankingNameUser: { type: mongoose.Schema.Types.String, },
    bankingBranch: { type: mongoose.Schema.Types.String, },
    reason: { type: mongoose.Schema.Types.String, },
    createdAt: { type: mongoose.Schema.Types.Date, },
    updatedAt: { type: mongoose.Schema.Types.Date,default: null },
   },default: null })
  requestRefund: {
    status: string;
    bankingNumber: string;
    bankingNameUser: string;
    bankingName: string;
    bankingBranch: string;
    reason: string;
    createdAt: Date;
    updatedAt?: Date;
  };
  @Prop({
    type: String,
    enum: ['pending', 'shipping', 'delivered', 'completed', 'canceled'],
    default: 'pending',
  })
  status: string; // Trạng thái đơn hàng

  @Prop({ type: mongoose.Schema.Types.String, default: 'pending', enum: ['processing', 'completed', 'pending'] })
  payProcessStatus: string;
}

export type SubOrderDocument = HydratedDocument<SubOrder>;
export const SubOrderSchema = SchemaFactory.createForClass(SubOrder);
@Schema({
  timestamps: true, // Tự động thêm createdAt và updatedAt
})
export class OrderItem extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubOrder',
  })
  subOrderId: string; // ID của subOrder cha

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  productId: string; // ID sản phẩm

  @Prop({ type: String,text: true })
  productName: string; // Tên sản phẩm (snapshot để tránh thay đổi nếu sản phẩm bị xóa)

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number; // Số lượng sản phẩm

  @Prop({ type: Number, required: true, min: 0 })
  price: number; // Giá từng sản phẩm

  @Prop({ type: String, required: true })
  size: string; // Kích cỡ sản phẩm

  @Prop({ type: String, required: true })
  color: string; // Màu sắc sản phẩm
}

export type OrderItemDocument = HydratedDocument<OrderItem>;
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// tạo mã đơn hàng
SubOrderSchema.pre<SubOrder>('save', function (next) {
  if (!this.subOrderUUID) {
    this.subOrderUUID = 'SUB-ORD-' + uuidv4().replace(/-/g, '').slice(0, 12);
  }
  next();
});
OrderSchema.pre<Order>('save', function (next) {
  if (!this.orderUUID) {
    this.orderUUID = 'ORD-' + uuidv4().replace(/-/g, '').slice(0, 12);
  }
  next();
});
