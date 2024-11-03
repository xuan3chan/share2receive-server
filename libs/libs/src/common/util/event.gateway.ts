import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../../../../../src/auth/auth.service';
import * as cookie from 'cookie';
import { NotificationService } from 'src/notification/notification.service';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  },
})
export class EventGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private clients: Map<string, { socket: Socket; isAuthenticated: boolean }> =
    new Map();

  constructor(
    private readonly authService: AuthService,
    private readonly notificationService: NotificationService,
  ) {
    console.log('EventGateway instance created');
  }

  handleDisconnect(socket: Socket) {
    console.log('Socket disconnected:', socket.id);
    this.clients.delete(socket.id);
  }

  async handleConnection(socket: Socket): Promise<void> {
    console.log('Socket connected:', socket.id);
    const cookies = socket.handshake.headers.cookie;
    let isAuthenticated = false;
    let accessToken = null;

    if (cookies) {
      const parsedCookies = cookie.parse(cookies);
      accessToken = parsedCookies['accessToken'];
    }

    if (accessToken) {
      try {
        const userId = await this.authService.handleVerifyTokenService(accessToken);
        if (userId) {
          isAuthenticated = true;
          socket.data = { _id: userId };
          socket.join(userId);
          console.log('Authenticated user connected:', userId);
        }
      } catch (err) {
        console.error('Error verifying token:', err);
      }
    }

    this.clients.set(socket.id, { socket, isAuthenticated });
    console.log('Current clients:', Array.from(this.clients.keys()));

    if (!isAuthenticated) {
      console.log('Unauthenticated user connected:', socket.id);
    }
  }

  afterInit(server: Server) {
    console.log('Socket server initialized');
  }

  sendGeneralNotification(message: string) {
    this.server.emit('generalNotification', message);
  }

  sendAuthenticatedNotification(userId: string, title: string, message: string) {
    this.server.to(userId).emit('authenticatedNotification', { title, message });
    this.notificationService.createNotification(userId, title, message);
}

}