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
      console.log(`Saving message from ${senderId} to ${receiverId}`);
      
      let image: string | undefined;
      if (file) {
        const uploadResult = await this.cloudinaryService.uploadImageService(senderId.toString(), file);
        image = uploadResult.uploadResults[0].url;
      }
  
      if (!content && !image) {
        throw new BadRequestException('Message content or image must be provided.');
      }
  
      const messageData: any = { senderId, receiverId, roomId, isRead: false }; // Set isRead to false by default
      if (content) messageData.content = content;
      if (image) messageData.image = image;
  
      const message = new this.messageModel(messageData);
      const savedMessage = await message.save();
  
      return savedMessage;
    } catch (error) {
      console.error("Error saving message:", error);
      throw new BadRequestException(error.message);
    }
  }
  async markMessagesAsRead(roomId: string, receiverId: string): Promise<void> {
    await this.messageModel.updateMany(
      { roomId, receiverId, isRead: false },
      { $set: { isRead: true } }
    );
  }
  
  async getMessagesInRoom(roomId: string): Promise<Message[]> {
    return this.messageModel
      .find({ roomId })
      .populate('senderId', 'firstname lastname avatar')
      .populate('receiverId', 'firstname lastname avatar')
      .sort({ createdAt: 1 })
      .exec();
  }

  async getRoomMessagesService(userId: string): Promise<any[]> {
    // Step 1: Find all rooms involving the userId
    const rooms = await this.messageModel
      .find({
        $or: [{ senderId: userId }, { receiverId: userId }],
      })
      .select('roomId senderId receiverId')
      .populate('senderId', 'firstname lastname avatar')
      .populate('receiverId', 'firstname lastname avatar')
      .lean()
      .exec();

    console.log("Rooms found:", rooms); // Debug: Check the list of rooms for the user

    // Step 2: Filter out duplicate room IDs
    const uniqueRooms = rooms.filter(
      (room, index, self) =>
        index === self.findIndex((r) => r.roomId === room.roomId)
    );

    // Step 3: For each unique room, find the latest message and determine the chat partner
    const messagesWithPartners = await Promise.all(
      uniqueRooms.map(async (room) => {
        // Find the latest message in this room
        const latestMessage = await this.messageModel
          .findOne({ roomId: room.roomId })
          .sort({ createdAt: -1 })
          .lean()
          .exec();

        // Count unread messages in this room if userId is the receiver
        const unreadCount = await this.messageModel.countDocuments({
          roomId: room.roomId,
          receiverId: userId,
          isRead: false,
        });

        // Determine the chat partner based on userId's role in this room
        let chatPartner;
        if ((room.senderId as any)._id.toString() === userId) {
          // If userId is the sender, chatPartner is the receiver
          chatPartner = {
            _id: (room.receiverId as any)._id,
            firstname: (room.receiverId as any).firstname,
            lastname: (room.receiverId as any).lastname,
            avatar: (room.receiverId as any).avatar,
          };
        } else {
          // If userId is the receiver, chatPartner is the sender
          chatPartner = {
            _id: (room.senderId as any)._id,
            firstname: (room.senderId as any).firstname,
            lastname: (room.senderId as any).lastname,
            avatar: (room.senderId as any).avatar,
          };
        }

        // Remove senderId and receiverId from message, add myId
        const { senderId, receiverId, ...messageWithoutIds } = latestMessage;

        return {
          message: {
            ...messageWithoutIds,
            myId: userId, // Add myId field with userId
          },
          unreadCount, // Add the count of unread messages
          chatPartner, // Correctly set chatPartner details
        };
      })
    );

    console.log("Final messages with partners:", messagesWithPartners); // Debug: Verify final output structure

    return messagesWithPartners;
}







}
