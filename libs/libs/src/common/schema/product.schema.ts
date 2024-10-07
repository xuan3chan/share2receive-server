import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { SizeE } from '../enum/size.enum';
import mongoose from 'mongoose';
import { ApproveStatusE } from '../enum';

@Schema({
  timestamps: true,
})
export class Product extends Document {
  @Prop({ type: mongoose.Schema.Types.String, required: true, unique: true })
  productName: string;

  @Prop({
    type: [mongoose.Schema.Types.String],
    validate: {
      validator: (arr: string[]) => arr.length <= 10,
      message: 'imgUrls array can contain a maximum of 10 values',
    },
  })
  imgUrls: string[];

  // Thay đổi thuộc tính `size` và `color` để chúng liên kết với nhau
  @Prop([
    {
      size: { type: mongoose.Schema.Types.String, enum: SizeE, required: true },
      colors: { type: mongoose.Schema.Types.String, required: true },
      amount: { type: mongoose.Schema.Types.Number, required: true },
    },
  ])
  sizeVariants: {
    size: string;
    colors: string;
    amount: number;
  }[];

  @Prop({ type: mongoose.Schema.Types.String, required: true })
  material: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' })
  userId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Category',
  })
  categoryId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Brand' })
  brandId: string;

  @Prop({ type: mongoose.Schema.Types.Boolean, default: false })
  isDeleted: boolean;

  @Prop({
    type: {
      approveStatus: { type: mongoose.Schema.Types.String, enum: ApproveStatusE, default: 'pending' },
      date: { type: mongoose.Schema.Types.Date, default: null },
      decisionBy: { type: mongoose.Schema.Types.String, default: null },
      description: { type: mongoose.Schema.Types.String, default: null },
    },
    default: { approveStatus: 'pending', date: null, description: null, decisionBy: null },
  })
  approved: {
    approveStatus: ApproveStatusE;
    decisionBy: string;
    description: string;
    date: Date;
  };

  @Prop({
    type: mongoose.Schema.Types.String,
    enum: ['active', 'inactive','suspend'],
    default: 'active',
  })
  status: string;

  @Prop({ type: mongoose.Schema.Types.Boolean, default: false })
  isBlock: boolean;

  @Prop({ type: mongoose.Schema.Types.String, enum: ['sale', 'barter'] })
  type: string;

  @Prop({ type: mongoose.Schema.Types.Number, required: true })
  price: number;

  @Prop({ type: mongoose.Schema.Types.Number, required: true })
  priceNew: number;

  @Prop([{ type: mongoose.Schema.Types.String, required: true }])
  tags: string[];
}
export type ProductDocument = HydratedDocument<Product>;
export const ProductSchema = SchemaFactory.createForClass(Product);
