import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument } from 'mongoose';


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
  valueToCross: number; // Tỷ lệ chuyển đổi, nâng cấp (nếu cần lưu số)
  
  @Prop({ type: mongoose.Schema.Types.Number})
  reportWarning:number;
  @Prop({ type: mongoose.Schema.Types.Number})
  reprotBlockerProduct:number;
  @Prop({ type: mongoose.Schema.Types.Number})
  reportBlockUser:number;

  @Prop({ type:
    {
      title_1: { type: mongoose.Schema.Types.String },
      content_1: { type: mongoose.Schema.Types.String },
      title_2: { type: mongoose.Schema.Types.String },
      content_2: { type: mongoose.Schema.Types.String },
      title_3: { type: mongoose.Schema.Types.String },
      content_3: { type: mongoose.Schema.Types.String },
    }
  })
  detailSuport: {
        title_1: string;
        content_1: string;
        title_2: string;
        content_2: string;
        title_3: string;
        content_3: string;
  }
}

export const ConfigsSchema = SchemaFactory.createForClass(Configs);
export type ConfigsDocument =HydratedDocument<Configs>;
