import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document,HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { TypeCategoryE } from '../enum';
import { SlugHook } from '@app/libs/common/hook';

@Schema()
export class Category extends Document {
    @Prop({ type: mongoose.Schema.Types.String, required: true,unique:true })
    name: string;

    @Prop({ type: mongoose.Schema.Types.String,required: true})
    imgUrl: string;

    @Prop({ type: mongoose.Schema.Types.String,default:null  })
    description: string;
    
    @Prop({ type: mongoose.Schema.Types.String,required: true,enum:TypeCategoryE })
    type: TypeCategoryE;

    @Prop({ type: mongoose.Schema.Types.String,default:'active',enum: ['active', 'inactive'] })
    status: string;
    
}
export type CategoryDocument = HydratedDocument<Category>;
export const CategorySchema = SchemaFactory.createForClass(Category);

SlugHook(CategorySchema, 'name');