import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';


@Schema({ timestamps: true })
export class Configs {

  @Prop({ type: mongoose.Schema.Types.String})
  sectionUrl_1: string; 
  @Prop({ type: mongoose.Schema.Types.String})
  sectionUrl_2: string; 
  @Prop({ type: mongoose.Schema.Types.String})
  videoUrl_1: string;
  @Prop({ type: mongoose.Schema.Types.String})
  videoUrl_2: string;

  @Prop({ type: mongoose.Schema.Types.Number})
  valueToPoint: number; // Tỷ lệ chuyển đổi, nâng cấp (nếu cần lưu số)
  @Prop({ type: mongoose.Schema.Types.Number})
  valueToPromotion: number; // Tỷ lệ chuyển đổi, nâng cấp (nếu cần lưu số)

  @Prop({ type: mongoose.Schema.Types.Number})
  reportWarning:number;
  @Prop({ type: mongoose.Schema.Types.Number})
  reprotBlockerProduct:number;
  @Prop({ type: mongoose.Schema.Types.Number})
  reportBlockUser:number;
  
  
}

export const ConfigsSchema = SchemaFactory.createForClass(Configs);
export type ConfigsDocument = Document & Configs;
