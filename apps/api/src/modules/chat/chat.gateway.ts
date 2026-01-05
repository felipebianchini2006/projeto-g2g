import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';

import type { JwtPayload } from '../auth/auth.types';
import { ChatRateLimiter } from './chat.rate-limiter';
import { ChatService } from './chat.service';

type ChatSocket = Socket & {
  data: {
    user?: JwtPayload;
  };
};

type JoinRoomPayload = {
  orderId?: string;
};

type SendMessagePayload = {
  orderId?: string;
  text?: string;
};

type MessageCreatedPayload = {
  id: string;
  orderId: string;
  userId: string;
  text: string;
  createdAt: Date;
};

const MAX_MESSAGE_LENGTH = 2000;

@WebSocketGateway({
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly rateLimiter: ChatRateLimiter,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      const client = socket as ChatSocket;
      const token = this.extractToken(client);
      if (!token) {
        return next(new Error('Missing bearer token.'));
      }

      try {
        const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
        client.data.user = payload;
        return next();
      } catch {
        return next(new Error('Invalid or expired token.'));
      }
    });
  }

  async handleConnection(client: ChatSocket) {
    if (!client.data.user) {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: ChatSocket) {
    client.data.user = undefined;
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @MessageBody() payload: JoinRoomPayload | string,
    @ConnectedSocket() client: ChatSocket,
  ) {
    const orderId = this.extractOrderId(payload);
    if (!orderId) {
      throw new WsException('Order not found.');
    }

    const user = this.getUser(client);
    await this.assertOrderAccess(orderId, user);

    const roomKey = this.getRoomKey(orderId);
    await client.join(roomKey);

    return { room: roomKey };
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @MessageBody() payload: SendMessagePayload | string | string[],
    @ConnectedSocket() client: ChatSocket,
  ) {
    const { orderId, text } = this.extractMessagePayload(payload);
    if (!orderId) {
      throw new WsException('Order not found.');
    }

    const messageText = text?.trim();
    if (!messageText) {
      throw new WsException('Message cannot be empty.');
    }
    if (messageText.length > MAX_MESSAGE_LENGTH) {
      throw new WsException('Message too long.');
    }

    const user = this.getUser(client);
    await this.assertOrderAccess(orderId, user);

    const rateKey = `${user.sub}:${orderId}`;
    const rate = this.rateLimiter.check(rateKey);
    if (!rate.allowed) {
      throw new WsException(rate.reason ?? 'Rate limit exceeded.');
    }

    const message = await this.chatService.createMessage(orderId, user.sub, messageText);
    const payloadToSend: MessageCreatedPayload = {
      id: message.id,
      orderId,
      userId: user.sub,
      text: message.content,
      createdAt: message.createdAt,
    };

    const roomKey = this.getRoomKey(orderId);
    await client.join(roomKey);
    this.server.to(roomKey).emit('messageCreated', payloadToSend);

    return payloadToSend;
  }

  private getUser(client: ChatSocket): JwtPayload {
    const user = client.data.user;
    if (!user) {
      throw new WsException('Missing user context.');
    }
    return user;
  }

  private async assertOrderAccess(orderId: string, user: JwtPayload) {
    try {
      return await this.chatService.ensureOrderAccess(orderId, user.sub, user.role);
    } catch (error) {
      if (error instanceof Error) {
        throw new WsException(error.message);
      }
      throw new WsException('Order access denied.');
    }
  }

  private extractOrderId(payload: JoinRoomPayload | string): string | null {
    if (typeof payload === 'string') {
      return payload.trim();
    }
    if (payload && typeof payload.orderId === 'string') {
      return payload.orderId.trim();
    }
    return null;
  }

  private extractMessagePayload(payload: SendMessagePayload | string | string[]) {
    if (Array.isArray(payload)) {
      const [orderId, text] = payload;
      return {
        orderId: typeof orderId === 'string' ? orderId.trim() : undefined,
        text: typeof text === 'string' ? text : undefined,
      };
    }
    if (typeof payload === 'string') {
      return { orderId: payload.trim(), text: undefined };
    }
    return {
      orderId: typeof payload?.orderId === 'string' ? payload.orderId.trim() : undefined,
      text: typeof payload?.text === 'string' ? payload.text : undefined,
    };
  }

  private getRoomKey(orderId: string) {
    return `order:${orderId}`;
  }

  private extractToken(client: ChatSocket) {
    const token = client.handshake.auth?.['token'];
    if (typeof token === 'string' && token.trim()) {
      return token.trim();
    }

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7).trim();
    }

    const queryToken = client.handshake.query?.['token'];
    if (typeof queryToken === 'string' && queryToken.trim()) {
      return queryToken.trim();
    }

    return null;
  }
}
