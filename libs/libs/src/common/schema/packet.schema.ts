import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
@Schema(
    {
        timestamps: true,
    },
)
export class Packet extends Document {

    @Prop({ type: mongoose.Schema.Types.String})
    packetIdUUID:string
    @Prop({ type: mongoose.Schema.Types.String, required: true,unique:true })
    name: string;
    @Prop({ type: mongoose.Schema.Types.String,})
    description: string;
    @Prop({ type: mongoose.Schema.Types.Number,required:true})
    price: number;
    @Prop({ type: mongoose.Schema.Types.Number,required:true})
    promotionPoint: number;
    @Prop({ type: mongoose.Schema.Types.String, default: null })
    image: string;
    @Prop({ type: mongoose.Schema.Types.String, enum: ['active', 'inactive'], default: 'active' })
    status: string;

}
export type PacketDocument = HydratedDocument<Packet>;
export const PacketSchema = SchemaFactory.createForClass(Packet);
//tạo batchUUID để phân biệt các file packet tự động
PacketSchema.pre('save', function (next) {
    if (!this.packetIdUUID) {
        this.packetIdUUID = 'PCK-' + uuidv4().replace(/-/g, '').slice(0, 12);
    }
    next();
});