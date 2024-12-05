import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true })
export class Wallet extends Document {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true })
    userId: mongoose.Schema.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.Mixed, default: 0 })
    point: number;
}

export type WalletDocument = HydratedDocument<Wallet>;
export const WalletSchema = SchemaFactory.createForClass(Wallet);