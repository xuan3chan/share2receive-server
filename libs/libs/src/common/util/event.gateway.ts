import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as cookie from 'cookie';
import { NotificationService } from 'src/notification/notification.service';
import { MessagesService } from '../../../../../src/messages/messages.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      callback(null, true); // Allow all origins
    },
    credentials: true,
  },
})
export class EventGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private clients: Map<string, { socket: Socket; isAuthenticated: boolean }> = new Map();
  private authenticatedUsers: Set<string> = new Set(); // Track authenticated users
  private connectedClients: Set<string> = new Set(); // Track all connected users (authenticated + guests)
  private roomMembers: Map<string, Set<string>> = new Map(); // Track users in each room

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    private readonly messageService: MessagesService,
  ) {
    console.log('EventGateway instance created');
  }

  handleDisconnect(socket: Socket) {
    console.log('Socket disconnected:', socket.id);

    // Remove from connected clients
    this.connectedClients.delete(socket.id);

    if (socket.data._id) {
      // Remove authenticated user
      this.authenticatedUsers.delete(socket.data._id);
      this.clients.delete(socket.data._id);

      // Remove user from all rooms they were part of
      for (const [roomId, members] of this.roomMembers.entries()) {
        members.delete(socket.data._id);
        if (members.size === 0) this.roomMembers.delete(roomId);
      }
    } else {
      // Remove guest user
      this.clients.delete(socket.id);
    }

    // Emit updated counts
    this.emitTotalUserCount();
    this.emitActiveUserCount();
  }

  async handleConnection(socket: Socket): Promise<void> {
    this.connectedClients.add(socket.id); // Add to connected clients
    let isAuthenticated = false;
    let accessToken = null;

    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && typeof authHeader === 'string') {
      accessToken = authHeader.split(' ')[1];
    }

    if (accessToken) {
      try {
        const userData = await this.handleVerifyToken(accessToken);

        if (userData && !this.authenticatedUsers.has(userData._id)) {
          isAuthenticated = true;
          socket.data = {
            _id: userData._id,
            firstname: userData.firstname,
            lastname: userData.lastname,
            avatar: userData.avatar,
          };
          this.clients.set(userData._id, { socket, isAuthenticated });
          this.authenticatedUsers.add(userData._id);
          socket.join(userData._id);
          console.log('Authenticated user connected:', userData._id);

          // Emit active user count
          this.emitActiveUserCount();
        }
      } catch (err) {
        console.error('Error verifying token:', err);
      }
    }

    if (!isAuthenticated) {
      console.log('Unauthenticated user connected:', socket.id);
      this.clients.set(socket.id, { socket, isAuthenticated: false });
    }
    
    // Emit total user count
    this.emitTotalUserCount();
  }

  afterInit(server: Server) {
    console.log('Socket server initialized');
  }

  private emitActiveUserCount() {
    const userCount = this.authenticatedUsers.size;
    this.server.emit('activeUserCount', { count: userCount });
    console.log(`Authenticated active users: ${userCount}`);
  }

  private emitTotalUserCount() {
    const totalUsers = this.connectedClients.size;
    this.server.emit('totalUserCount', { count: totalUsers });
    console.log(`Total connected users: ${totalUsers}`);
  }

  @SubscribeMessage('getActiveUserCount')
  handleGetActiveUserCount(@ConnectedSocket() client: Socket) {
    const userCount = this.authenticatedUsers.size;
    client.emit('activeUserCount', { count: userCount });
  }

  @SubscribeMessage('getTotalUserCount')
  handleGetTotalUserCount(@ConnectedSocket() client: Socket) {
    const totalUsers = this.connectedClients.size;
    client.emit('totalUserCount', { count: totalUsers });
  }

  @SubscribeMessage('getGuests')
  handleGetGuests(@ConnectedSocket() client: Socket) {
    const guests = Array.from(this.clients.values())
      .filter(({ isAuthenticated }) => !isAuthenticated);
  
    const guestCount = guests.length; // Đếm số lượng guest users
    client.emit('guestUsers', { count: guestCount });
    console.log(`Number of unauthenticated users: ${guestCount}`);
  }
  

  sendAuthenticatedNotification(userId: string, title: string, message: string) {
    this.server.to(userId).emit('authenticatedNotification', { title, message });
    this.notificationService.createNotification(userId, title, message);
    console.log('sendAuthenticatedNotification', userId, title, message);
  }

  sendNotificationMessage(userId: string, title: string, receiver: string, message: string) {
    this.server.to(userId).emit('messageNotification', { title, receiver, message });
    console.log('sendNotificationMessage', userId, title, receiver, message);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    client.join(roomId);
    if (!this.roomMembers.has(roomId)) {
      this.roomMembers.set(roomId, new Set());
    }
    this.roomMembers.get(roomId)?.add(client.data._id);

    await this.messageService.markMessagesAsRead(roomId, client.data._id);
    const previousMessages = await this.messageService.getMessagesInRoom(roomId);
    client.emit('previousMessages', previousMessages);

    client.to(roomId).emit('messagesRead', { roomId, readerId: client.data._id });
  }

  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    client.leave(roomId);
    this.roomMembers.get(roomId)?.delete(client.data._id);
    if (this.roomMembers.get(roomId)?.size === 0) {
      this.roomMembers.delete(roomId);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() message: { receiverId: string; content?: string; file?: string; fileName?: string; fileType?: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const senderId = client.data._id;
    const roomId = [senderId, message.receiverId].sort().join('_');

    try {
      let file: Express.Multer.File | undefined;
      if (message.file && message.fileName && message.fileType) {
        file = await this.processFile({
          file: message.file,
          fileName: message.fileName,
          fileType: message.fileType,
        });
      }

      const savedMessage = await this.messageService.saveMessage(
        roomId,
        senderId,
        message.receiverId,
        message.content,
        file,
      );

      const isRecipientInRoom = this.roomMembers.get(roomId)?.has(message.receiverId) || false;
      if (isRecipientInRoom) {
        await this.messageService.markMessagesAsRead(roomId, message.receiverId);
      }

      client.to(roomId).emit('receiveMessage', {
        senderId,
        firstname: client.data.firstname,
        lastname: client.data.lastname,
        avatar: client.data.avatar,
        content: message.content,
        image: savedMessage.image,
        isRead: isRecipientInRoom,
        createdAt: new Date(),
      });

      if (!isRecipientInRoom) {
        const receiver = (savedMessage.receiverId as any).firstname + ' ' + (savedMessage.receiverId as any).lastname;
        this.sendNotificationMessage(message.receiverId, 'Có tin nhắn mới', receiver, message.content || 'Hình ảnh');
      }

      if (isRecipientInRoom) {
        this.server.to(roomId).emit('messagesRead', { roomId, readerId: message.receiverId });
      }
    } catch (error) {
      console.error('Error saving message:', error);
      throw new BadRequestException('Failed to save message.');
    }
  }

  private async processFile(data: { file: string; fileName: string; fileType: string }): Promise<Express.Multer.File> {
    const base64Data = data.file.split(',')[1];
    const fileBuffer = Buffer.from(base64Data, 'base64');

    const readableInstanceStream = new Readable();
    readableInstanceStream.push(fileBuffer);
    readableInstanceStream.push(null);

    return {
      buffer: fileBuffer,
      originalname: data.fileName,
      mimetype: data.fileType,
      fieldname: '',
      encoding: '',
      size: fileBuffer.length,
      stream: readableInstanceStream,
      destination: '',
      filename: data.fileName,
      path: '',
    };
  }

  async handleVerifyToken(token: string) {
    try {
      const userData = await this.jwtService.verifyAsync(token);
      return userData;
    } catch (err) {
      console.error('Error verifying token:', err);
      return null;
    }
  }
}
