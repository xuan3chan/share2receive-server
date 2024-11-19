import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
@Schema({
  timestamps: true, // Tự động thêm createdAt và updatedAt
})
export class Order extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: string; // Người mua

  @Prop({ type: String,default:null })
  phone: string; // Số điện thoại người mua

  @Prop({ type: String,default:null })
  address: string; // Địa chỉ người mua

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number; // Tổng tiền toàn bộ đơn hàng

  @Prop({
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  })
  paymentStatus: string; // Trạng thái thanh toán

  @Prop({ type: String, default: null })
  TransactionId: string; // Mã giao dịch từ MoMo

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
  orderUUID:string; // Mã đơn hàng
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order',})
  orderId: string; // ID của đơn hàng cha

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  sellerId: string; // Người bán

  @Prop({ type: Number, required: true, min: 0 })
  subTotal: number; // Tổng tiền cho shop này

  @Prop([{ type: mongoose.Schema.Types.ObjectId, ref: 'OrderItem' }])
  products: mongoose.Types.ObjectId[]; // Danh sách sản phẩm trong subOrder
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

  @Prop({ type: String })
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
    if (!this.orderUUID) {
      this.orderUUID = 'SUB-ORD' + new Date().getTime(); // Tạo mã SubOrder với thời gian hiện tại
    }
    next();
  });