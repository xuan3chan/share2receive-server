import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document,HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

@Schema({
    timestamps: true,
})
export class Message extends Document {

    @Prop({ type: mongoose.Schema.Types.String, required: true })
    roomId: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
    senderId: string;
  
    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
    receiverId: string;
  
    @Prop({ type: mongoose.Schema.Types.String,  })
    image:string
    @Prop({ type: mongoose.Schema.Types.String, })
    content: string;
    
}
export type MessageDocument = HydratedDocument<Message>;
export const MessageSchema = SchemaFactory.createForClass(Message);

