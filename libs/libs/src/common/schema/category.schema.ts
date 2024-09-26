import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document,HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

@Schema()
export class Category extends Document {
    @Prop({ type: mongoose.Schema.Types.String, required: true,unique:true })
    name: string;

    @Prop({ type: mongoose.Schema.Types.String,default:null  })
    description: string;

    @Prop({ type: mongoose.Schema.Types.String,default:'active',enum: ['active', 'inactive'] })
    status: string;
    
}
export type CategoryDocument = HydratedDocument<Category>;
export const CategorySchema = SchemaFactory.createForClass(Category);