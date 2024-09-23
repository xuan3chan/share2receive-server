import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true })
export class Admin extends Document {
  [x: string]: any;

  @Prop({ type: mongoose.Schema.Types.String, required: true })
  adminName: string;

  @Prop({ type: mongoose.Schema.Types.String, required: true, unique: true })
  accountName: string;

  @Prop({ type: mongoose.Schema.Types.String, required: true, unique: true })
  password: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'roles' }) 
  role: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.Boolean, default: false })
  isBlock: boolean;

  @Prop({ type: mongoose.Schema.Types.String,default: null })
  refreshToken: string;

}

export type AdminsDocument = HydratedDocument<Admin>;
export const AdminSchema = SchemaFactory.createForClass(Admin);
