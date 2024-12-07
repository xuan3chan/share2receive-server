import { BadRequestException, Injectable } from '@nestjs/common';
import { Packet } from '@app/libs/common/schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { PacketDocument } from '@app/libs/common/schema';
import { CreatePacketDto, UpdatePacketDto } from '@app/libs/common/dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
@Injectable()
export class PacketService {
    constructor(
        @InjectModel(Packet.name) private readonly packetModel: Model<PacketDocument>,
        private readonly cloudinaryService: CloudinaryService
    ) {}

    async createPacketService(createPacketDto: CreatePacketDto): Promise<PacketDocument> {
        try {
            const newPacket = new this.packetModel(createPacketDto);
            return await newPacket.save();
        } catch (error) {
            throw new BadRequestException(`Error creating packet: ${error.message}`);
        }
    }

    async updatePacketService(packetId: string, updatePacketDto: UpdatePacketDto): Promise<PacketDocument> {
        try {
            const packet = await this.packetModel.findById(packetId).lean();
            if (!packet) {
                throw new BadRequestException('Packet not found');
            }
            return await this.packetModel.findByIdAndUpdate
                (packetId, updatePacketDto, { new: true });
        } catch (error) {
            throw new BadRequestException(`Error updating packet: ${error.message}`);
        }
    }
    async deletePacketService(packetId: string): Promise<PacketDocument> {
        try {
            const packet = await this.packetModel.findById(packetId).lean();
            if (!packet) {
                throw new BadRequestException('Packet not found');
            }
            return await this.packetModel.findByIdAndDelete(packetId);
        } catch (error) {
            throw new BadRequestException(`Error deleting packet: ${error.message}`);
        }
    }
    async getPacketService(packetId: string): Promise<PacketDocument> {
        try {
            const packet = await this.packetModel.findById(packetId).lean();
            if (!packet) {
                throw new BadRequestException('Packet not found');
            }
            return packet;
        } catch (error) {
            throw new BadRequestException(`Error retrieving packet: ${error.message}`);
        }
    }
    async getAllPacketsService(): Promise<PacketDocument[]> {
        try {
            return await this.packetModel.find().lean();
        } catch (error) {
            throw new BadRequestException(`Error retrieving packets: ${error.message}`);
        }
    }
    async updateImgService(packetId: string, file: Express.Multer.File): Promise<PacketDocument> {
        try {
            const packet = await this.packetModel.findById(packetId).lean();
            if (!packet) {
                throw new BadRequestException('Packet not found');
            }
            if(packet.image){
                // Delete old image
                await this.cloudinaryService.deleteMediaService(packet.image)
            }
            const imgUrl = await this.cloudinaryService.uploadImageService(packet.name,file) // Assuming you want to store the image as a base64 string
            return await this.packetModel.findByIdAndUpdate(
                packetId, 
                { image: imgUrl.uploadResults[0].url }, 
                { new: true }
            ).lean();
        } catch (error) {
            throw new BadRequestException(`Error updating packet image: ${error.message}`);
        }
    }
    async getAllPacketsForClientService(): Promise<PacketDocument[]> {
        try {
            return await this.packetModel.find({ status: 'active' }).lean();
        } catch (error) {
            throw new BadRequestException(`Error retrieving packets: ${error.message}`);
        }
    }
}
