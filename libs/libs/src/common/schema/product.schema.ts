import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { SizeE } from '../enum/size.enum';
import mongoose from 'mongoose';
import { ApproveStatusE } from '../enum';
import {SlugHook} from '@app/libs/common/hook';

@Schema({
  timestamps: true,
})
export class Product extends Document {
  @Prop({ type: mongoose.Schema.Types.String, required: true })
  productName: string;

  @Prop({
    type: [mongoose.Schema.Types.String],
    validate: {
      validator: (arr: string[]) => arr.length <= 10,
      message: 'imgUrls array can contain a maximum of 10 values',
    },
  })
  imgUrls: string[];
  @Prop([
    {
      size: { type: mongoose.Schema.Types.String, enum: SizeE },
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
  categoryId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Brand' })
  brandId: mongoose.Schema.Types.ObjectId;

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
    enum: ['active', 'inactive','suspend','exchanging','exchanged','soldOut'],
    default: 'active',
  })
  status: string;

  @Prop({ type: mongoose.Schema.Types.Boolean, default: false })
  isBlock: boolean;

  @Prop({ type: mongoose.Schema.Types.String, enum: ['sale', 'barter'] })
  type: string;

  @Prop({ type: mongoose.Schema.Types.Number})
  price: number;

  @Prop({ type: mongoose.Schema.Types.Number })
  priceNew: number;

  @Prop([{ type: mongoose.Schema.Types.String, required: true }])
  tags: string[];

  @Prop({ type: mongoose.Schema.Types.String,reuired:true,enun:['new','used'] })
  condition: string;

  @Prop({ type: mongoose.Schema.Types.String, required: true })
  style: string;  

  @Prop({ type: mongoose.Schema.Types.String})
  slug: string;

  @Prop({ type: mongoose.Schema.Types.String,required:true})
  description: string;

  @Prop({ type: mongoose.Schema.Types.Number,required:true})
  weight: number;
}
export type ProductDocument = HydratedDocument<Product>;
export const ProductSchema = SchemaFactory.createForClass(Product);

SlugHook(ProductSchema, 'productName');