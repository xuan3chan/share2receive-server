import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailerModule } from '../mailer/mailer.module';
import { AdminModule } from 'src/admin/admin.module';
import { RoleModule } from 'src/role/role.module';
import { UsersModule } from 'src/users/users.module';
import {GoogleStrategy}from './google.strategy'
import { PassportModule } from '@nestjs/passport';
import { BullModule } from '@nestjs/bull';
import { MailConsumer } from './mail.consumer';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'google' }),
    UsersModule,
    RoleModule,
    AdminModule,
    MailerModule,
    BullModule.registerQueue({
      name: 'send-email',
    }),
    JwtModule.register({
    global: true,
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: '1h' },
  }),],
  controllers: [AuthController],
  providers: [AuthService,GoogleStrategy,MailConsumer],
  exports: [AuthService]
})
export class AuthModule {}
