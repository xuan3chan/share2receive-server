import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document,HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

@Schema()
export class Brand extends Document {
    @Prop({ type: mongoose.Schema.Types.String, required: true,unique:true })
    name: string;

    @Prop({ type: mongoose.Schema.Types.Number,default:0 })
    totalProduct: number;
    
    @Prop({ type: mongoose.Schema.Types.String,required: true })
    imgUrl: string;
    
    @Prop({ type: mongoose.Schema.Types.String,default:null  })
    description: string;

    @Prop({ type: mongoose.Schema.Types.String,default:'active',enum: ['active', 'inactive'] })
    status: string;
    
}
export type BrandDocument = HydratedDocument<Brand>;
export const BrandSchema = SchemaFactory.createForClass(Brand);