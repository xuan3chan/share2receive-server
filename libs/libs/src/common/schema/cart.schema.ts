import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { SizeE } from '../enum/size.enum';

@Schema({
  timestamps: true, // Tự động thêm createdAt và updatedAt
})
export class Cart extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' })
  userId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product',
  })
  productId: string;

  @Prop({ type: mongoose.Schema.Types.String, required: true, enum: SizeE })
  size: string;
  @Prop({ type: mongoose.Schema.Types.String, required: true })
  color: string;

  @Prop({ type: mongoose.Schema.Types.Number, required: true, min: 1 })
  amount: number;

  @Prop({ type: mongoose.Schema.Types.Number, required: true, min: 0 })
  price: number;

  @Prop({
    type: mongoose.Schema.Types.Number,
    required: true,
    min: 0,
    validate: {
      validator: function (this: Cart, value: number) {
        return value === this.amount * this.price;
      },
      message: 'Total must be equal to quantity * price',
    },
  })
  total: number;

  @Prop({
    type: mongoose.Schema.Types.Boolean,
    default: false,
  })
  isCheckedOut: boolean; // Đánh dấu nếu giỏ hàng đã thanh toán
}

export type CartDocument = HydratedDocument<Cart>;
export const CartSchema = SchemaFactory.createForClass(Cart);
