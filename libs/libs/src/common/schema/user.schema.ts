import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { UserStyle } from '@app/libs/common/interface'; // Đường dẫn tới file chứa interface UserStyle
import {MaterialE} from '@app/libs/common/enum/material.enum';
import { SizeE } from '../enum';

@Schema({ timestamps: true })
export class User extends Document {
  [x: string]: any;

  @Prop({ type: mongoose.Schema.Types.String, required: true })
  firstname: string;

  @Prop({ type: mongoose.Schema.Types.String, required: true })
  lastname: string;

  @Prop({ type: mongoose.Schema.Types.String, required: true, unique: true })
  email: string;

  @Prop({ type: mongoose.Schema.Types.String, required: true })
  password: string;

  @Prop({ type: mongoose.Schema.Types.String })
  address: string;

  @Prop({ type: mongoose.Schema.Types.String })
  phone: string;

  @Prop({ type: mongoose.Schema.Types.String })
  description: string;

  @Prop({
    type: mongoose.Schema.Types.String,
    default: 'user',
    required: true,
  })
  role: string;

  @Prop({ type: mongoose.Schema.Types.Date })
  dateOfBirth: Date;

  @Prop({
    type: mongoose.Schema.Types.String,
    default:
      'https://thumbs.dreamstime.com/b/default-profile-picture-avatar-photo-placeholder-vector-illustration-default-profile-picture-avatar-photo-placeholder-vector-189495158.jpg',
  })
  avatar: string;

  @Prop({
    type: {
      code: { type: String },
      expiredAt: { type: Date },
    },
    default: null,
  })
  authCode: { code: string; expiredAt: Date };

  @Prop({
    type: mongoose.Schema.Types.String,
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: string;

  @Prop({ type: mongoose.Schema.Types.Boolean, default: false })
  isBlock: boolean;

  @Prop({ type: mongoose.Schema.Types.String, default: null })
  refreshToken: string;

  @Prop({ type: mongoose.Schema.Types.String })
  gender: string;

  @Prop({ type: mongoose.Schema.Types.String })
  encryptKey: string;

  @Prop({
    type: {
      color: [{ type: mongoose.Schema.Types.String }],
      material: [{ type: mongoose.Schema.Types.String }],
      size: [{ type: mongoose.Schema.Types.String }],
      hobby: [
        {
          type: mongoose.Schema.Types.String,
        },
      ],
      age: { type: mongoose.Schema.Types.String },
      zodiacSign: {
        type: mongoose.Schema.Types.String,
      },
      style: [{ type: mongoose.Schema.Types.String }],
      gender: { type: mongoose.Schema.Types.String },
    },
    default: null,
  })
  userStyle: UserStyle;

  @Prop({ type: mongoose.Schema.Types.String, default: null })
  typeUser: string;

  @Prop({ type: mongoose.Schema.Types.Number, default: 0 })
  averageRating: number;
  
  @Prop({ type: mongoose.Schema.Types.Number, default: 0 })
  numberOfRating: number;
  
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = HydratedDocument<User>;
UserSchema.index({ firstname: 'text', lastname: 'text', email: 'text' });