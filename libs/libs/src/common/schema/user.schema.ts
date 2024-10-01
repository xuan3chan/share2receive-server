import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
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
      material: [{ type: mongoose.Schema.Types.String, enum:MaterialE  }],
      size: [{ type: mongoose.Schema.Types.String, enum: SizeE }],
      hobby: [
        {
          type: mongoose.Schema.Types.String,
          enum: [
            'sport',
            'music',
            'reading',
            'travel',
            'movie',
            'game',
            'cooking',
            'fishing',
            'shopping',
            'gardening',
            'photography',
            'painting',
            'writing',
            'dancing',
            'other',
          ],
        },
      ],
      age: { type: mongoose.Schema.Types.String, enum: ['0-18', '19-30', '31-50', '51-70', '71-100'] },
      zodiacSign: {
        type: mongoose.Schema.Types.String,
        enum: [
          'Aries',
          'Taurus',
          'Gemini',
          'Cancer',
          'Leo',
          'Virgo',
          'Libra',
          'Scorpio',
          'Sagittarius',
          'Capricorn',
          'Aquarius',
          'Pisces',
        ],
      },
    },
    default: null,
  })
  userStyle: UserStyle;
}

export const UserSchema = SchemaFactory.createForClass(User);
