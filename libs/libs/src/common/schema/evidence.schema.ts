import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document,HydratedDocument } from 'mongoose';
import mongoose from 'mongoose';


@Schema()
export class Evidence extends Document {
    @Prop({ type: mongoose.Schema.Types.String, required: true })
    batchUUID: string;
    @Prop({ type: mongoose.Schema.Types.String,})
    fileExport: string;
    @Prop({ type: mongoose.Schema.Types.String })
    fileEvidence: string;
}
export type EvidenceDocument = HydratedDocument<Evidence>;
export const EvidenceSchema = SchemaFactory.createForClass(Evidence);
//tạo batchUUID để phân biệt các file evidence tự động

