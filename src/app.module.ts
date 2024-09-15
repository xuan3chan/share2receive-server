import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleModule } from './role/role.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from './mailer/mailer.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { EncryptionModule } from './encryption/encryption.module';

@Module({
  imports: [
    EncryptionModule,
    CloudinaryModule,
    AdminModule,
    RoleModule,
    AuthModule,
    MailerModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.DB_URI),
  ],
})
export class AppModule {}
