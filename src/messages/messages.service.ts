import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from '@app/libs/common/schema';
import { BadRequestException } from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private cloudinaryService: CloudinaryService,
  ) {}

 
 async saveMessage(
  roomId: string,
  senderId: string,
  receiverId: string,
  content?: string,
  file?: Express.Multer.File
): Promise<Message> {
  try {
    // Log the message save operation for debugging purposes
    console.log(`Saving message from ${senderId} to ${receiverId}`);
    
    let image: string | undefined;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImageService(senderId.toString(), file);
      image = uploadResult.uploadResults[0].url;
    }

    if (!content && !image) {
      throw new BadRequestException('Message content or image must be provided.');
    }

    const messageData: any = { senderId, receiverId, roomId };
    if (content) messageData.content = content;
    if (image) messageData.image = image;

    const message = new this.messageModel(messageData);
    const savedMessage = await message.save(); // Save the message and wait for the result

    return savedMessage;
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error saving message:", error);
    throw new BadRequestException(error.message);
  }
}

  async getMessagesInRoom(roomId: string): Promise<Message[]> {
    return this.messageModel
      .find({ roomId })
      .populate('senderId', 'firstname lastname avatar')
      .populate('receiverId', 'firstname lastname avatar')
      .sort({ createdAt: 1 })
      .exec();
  }
}
