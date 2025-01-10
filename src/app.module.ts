import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleModule } from './role/role.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from './mailer/mailer.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { EncryptionModule } from './encryption/encryption.module';
import { CategoryModule } from './category/category.module';
import { BrandModule } from './brand/brand.module';
import { ProductModule } from './product/product.module';
import { SearchModule } from './search/search.module';
import { BullModule } from '@nestjs/bull';
import { ExchangeModule } from './exchange/exchange.module';
import { EventGateway } from '../libs/libs/src/common/util/event.gateway';
import { RatingModule } from './rating/rating.module';
import { NotificationModule } from './notification/notification.module';
import { RedisCacheModule } from './redis/redis.module';
import { WalletModule } from './wallet/wallet.module';
import { MessagesModule } from './messages/messages.module';
import { GatewayModule } from '@app/libs/common/util/gateway.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { TransactionModule } from './transaction/transaction.module';
import { ReportModule } from './report/report.module';
import { EvidenceModule } from './evidence/evidence.module';
import { StaticFileMiddleware } from '@app/libs/common/middleware/file.mid';
import { AttendanceModule } from './attendance/attendance.module';
import { PacketModule } from './packet/packet.module';
import { DropboxModule } from './dropbox/dropbox.module';
import { RevenueModule } from './revenue/revenue.module';
import { StatisticsModule } from './statistics/statistics.module';
import { ConfigsModule } from './configs/configs.module';
@Module({
  imports: [
    SearchModule,
    EncryptionModule,
    CloudinaryModule,
    AdminModule,
    RoleModule,
    AuthModule,
    MailerModule,
    RedisCacheModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '3h' },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.DB_URI),
    CategoryModule,
    BrandModule,
    ProductModule,
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD, // Add this line
      },
    }),
    ExchangeModule,
    RatingModule,
    NotificationModule,
    WalletModule,
    MessagesModule,
    GatewayModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    TransactionModule,
    ReportModule,
    EvidenceModule,
    AttendanceModule,
    PacketModule,
    DropboxModule,
    RevenueModule,
    StatisticsModule,
    ConfigsModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(StaticFileMiddleware).forRoutes('*');
  }
}