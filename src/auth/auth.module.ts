import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailerModule } from '../mailer/mailer.module';
import { AdminModule } from 'src/admin/admin.module';
import { RoleModule } from 'src/role/role.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    UsersModule,
    RoleModule,
    AdminModule,
    MailerModule,
    JwtModule.register({
    global: true,
    secret: process.env.JWT_SECRET,
    signOptions: { expiresIn: '1h' },
  }),],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
