import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true })
export class Wallet extends Document {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true })
    userId: mongoose.Schema.Types.ObjectId;

    @Prop({ type: mongoose.Schema, default: 0 })
    balance: number;

    @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }], default: [] })
    transactions: mongoose.Schema.Types.ObjectId[];  // Array of transaction references
}

export type WalletDocument = HydratedDocument<Wallet>;
export const WalletSchema = SchemaFactory.createForClass(Wallet);