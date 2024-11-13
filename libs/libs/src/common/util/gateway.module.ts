// gateway.module.ts
import { Global, Module } from '@nestjs/common';
import { EventGateway } from '@app/libs/common/util/event.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationModule } from 'src/notification/notification.module';
import { MessagesModule } from 'src/messages/messages.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Global()
@Module({
    imports:[
        AuthModule,
        NotificationModule,
        MessagesModule,
        CloudinaryModule,
    ],
  providers: [EventGateway],
  exports: [EventGateway],
})
export class GatewayModule {}
