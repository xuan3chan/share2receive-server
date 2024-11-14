import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

@Schema({
    timestamps: true,
})
export class Message extends Document {
    @Prop({ type: mongoose.Schema.Types.String, required: true })
    roomId: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' })
    senderId: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' })
    receiverId: string;

    @Prop({ type: mongoose.Schema.Types.String })
    image: string;

    @Prop({ type: mongoose.Schema.Types.String })
    content: string;

    @Prop({ type: Boolean, default: false }) // New field to track if the message has been read
    isRead: boolean;
}

export type MessageDocument = HydratedDocument<Message>;
export const MessageSchema = SchemaFactory.createForClass(Message);
