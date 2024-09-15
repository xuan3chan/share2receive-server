import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import mongoose from 'mongoose';

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
  

  @Prop({ type: mongoose.Schema.Types.String})
  description: string;

  @Prop({
    type: mongoose.Schema.Types.String,
    default: 'user',
    required: true,
  })
  role: string;

  @Prop({ type: mongoose.Schema.Types.Date})
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

  @Prop({type: mongoose.Schema.Types.String})
  gender: string;

  @Prop({type: mongoose.Schema.Types.String,})
  encryptKey: string;

  @Prop([{type: mongoose.Schema.Types.String}])
  userStyle:{
    color: string;
    material: string;
    size: string;
    hobby: string;
    Age: string;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);
