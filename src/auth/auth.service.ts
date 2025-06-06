import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { MailerService } from '../mailer/mailer.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AdminService } from '../admin/admin.service';
import { RoleService } from '../role/role.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private adminService: AdminService,
    private roleService: RoleService,
    @InjectQueue('send-email') private readonly sendEmailQueue: Queue,
  ) {}

  private async createJwtPayload(
    accountHolder: any,
    isUser: boolean,
  ): Promise<any> {
    if (isUser) {
      return {
        _id: accountHolder._id,
        role: accountHolder.role,
        isBlock: accountHolder.isBlock,
        firstname: accountHolder.firstname,
        lastname: accountHolder.lastname,
        avatar: accountHolder.avatar,
        userStyle: accountHolder.userStyle,
        sub: accountHolder._id,
      };
    } else {
      const roles = await this.roleService.findRoleService(accountHolder.role);
      return {
        _id: accountHolder._id,
        adminName: accountHolder.adminName,
        role: roles,
        isBlock: accountHolder.isBlock,
      };
    }
  }

  async registerService(
    email: string,
    password: string,
    firstname: string,
    lastname: string,
  ): Promise<{
    refreshToken: string;
    accessToken: string;
    user: any;
  }> {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createRefreshToken = randomBytes(32).toString('hex');
      const user = await this.usersService.createUserService(
        email,
        hashedPassword,
        firstname,
        lastname,
        createRefreshToken,
      );
      if ('message' in user) {
        throw new BadRequestException(user.message);
      }

      const returnedUser = user
        ? {
            email: user.email,
            role: user.role,
            _id: user._id,
            avatar: user.avatar,
            firstname: user.firstname,
            lastname: user.lastname,
            address: user.address,
            dateOfBirth: user.dateOfBirth,
            description: user.description,
            gender: user.gender,
            nickname: user.nickname,
            phone: user.phone,
            userStyle: user.userStyle,
          }
        : null;

      if (user) {
        await this.usersService.updateRefreshTokenService(
          user._id,
          createRefreshToken,
        );
      }

      const payload = await this.createJwtPayload(user, true);

      return {
        accessToken: this.jwtService.sign(payload),
        refreshToken: createRefreshToken,
        user: returnedUser,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async googleLogin(
    profile: Record<string, any>,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const { email, firstName, lastName, avatar } = profile;
  
    if (!email || !firstName || !lastName || !avatar) {
      throw new BadRequestException('Invalid Google profile data provided');
    }
  
    try {
      // Check if user already exists in the database
      let user = await this.usersService.findOneEmailOrUsernameService(email);
  
      // If user doesn't exist, create a new user
      if (!user) {
        const refreshToken = randomBytes(32).toString('hex');
        const temporaryPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
  
        user = await this.usersService.createUserService(
          email,
          hashedPassword, // Google users don't initially have a password
          firstName,
          lastName,
          refreshToken,
          avatar,
          'google',
        );
      }
  
      // Check if the user account is blocked
      if (user.isBlock) {
        throw new UnauthorizedException('This account is blocked');
      }
  
      // Generate a new refresh token
      const newRefreshToken = randomBytes(32).toString('hex');
      const payload = await this.createJwtPayload(user, true);
  
      // Update the refresh token in the database
      await this.usersService.updateRefreshTokenService(user.email, newRefreshToken);
  
      // Prepare the user data to be returned
      const returnedUser = {
        email: user.email,
        role: user.role,
        _id: user._id,
        avatar: user.avatar,
        firstName: user.firstName,
        lastName: user.lastName,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        description: user.description,
        gender: user.gender,
        phone: user.phone,
        userStyle: user.userStyle,
      };
  
      return {
        accessToken: this.jwtService.sign(payload),
        refreshToken: newRefreshToken,
        user: returnedUser,
      };
    } catch (error) {
      console.error('Error during Google login:', error.message);
      throw new BadRequestException('Failed to process Google login');
    }
  }

  async loginService(
    account: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    try {
      const user =
        await this.usersService.findOneEmailOrUsernameService(account);
      const admin =
        await this.adminService.findOneAdminAccountNameService(account);
      const accountHolder = user || admin;

      if (!accountHolder) {
        throw new UnauthorizedException('Account not found');
      }

      if (!(await bcrypt.compare(password, accountHolder.password))) {
        throw new UnauthorizedException('Password is incorrect');
      }

      if (accountHolder.isBlock) {
        throw new UnauthorizedException('Account is blocked');
      }

      const createRefreshToken = randomBytes(32).toString('hex');
      const payload = await this.createJwtPayload(accountHolder, !!user);
      const returnedUser = user
        ? {
            email: user.email,
            role: user.role,
            _id: user._id,
            avatar: user.avatar,
            firstname: user.firstname,
            lastname: user.lastname,
            address: user.address,
            dateOfBirth: user.dateOfBirth,
            description: user.description,
            gender: user.gender,
            nickname: user.nickname,
            phone: user.phone,
            userStyle: user.userStyle,
          }
        : {
            adminName: admin.adminName,
            role: await this.roleService.findRoleService(admin.role.toString()),
            _id: admin._id,
          };

      if (user) {
        await this.usersService.updateRefreshTokenService(
          account,
          createRefreshToken,
        );
      } else if (admin) {
        await this.adminService.updateRefreshTokenService(
          account,
          createRefreshToken,
        );
      }

      return {
        accessToken: this.jwtService.sign(payload),
        refreshToken: createRefreshToken,
        user: returnedUser,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async refreshTokenService(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    try {
      const user = await this.usersService.findOneReTokenService(refreshToken);
      const admin = await this.adminService.findOneAdminRefreshTokenService(refreshToken);
      const accountHolder = user || admin;
  
      if (!accountHolder) {
        throw new UnauthorizedException('Refresh token not found');
      }
  
      if (accountHolder.isBlock) {
        throw new UnauthorizedException('Account is blocked');
      }
  
      const createRefreshToken = randomBytes(32).toString('hex');
      const payload = await this.createJwtPayload(accountHolder, !!user);
  
      const returnedUser = user
        ? {
            email: user.email,
            role: user.role,
            _id: user._id,
            avatar: user.avatar,
            firstname: user.firstname,
            lastname: user.lastname,
            address: user.address,
            dateOfBirth: user.dateOfBirth,
            description: user.description,
            gender: user.gender,
            nickname: user.nickname,
            phone: user.phone,
            userStyle: user.userStyle,
          }
        : {
            adminName: admin.adminName,
            role: await this.roleService.findRoleService(admin.role.toString()),
            _id: admin._id,
          };
  
      if (user) {
        await this.usersService.updateRefreshTokenService(user.email, createRefreshToken);
      } else if (admin) {
        await this.adminService.updateRefreshTokenService(admin.adminName, createRefreshToken);
      }
  
      return {
        accessToken: this.jwtService.sign(payload),
        refreshToken: createRefreshToken,
        user: returnedUser,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  

  async logoutService(refreshToken: string): Promise<{ message: string }> {
    try {
      const user = await this.usersService.findOneReTokenService(refreshToken);
      const admin =
        await this.adminService.findOneAdminRefreshTokenService(refreshToken);

      const accountHolder = user || admin;

      if (!accountHolder) {
        throw new Error('refresh Token not found');
      }

      if (user) {
        await this.usersService.updateRefreshTokenService(user.email, null);
      } else if (admin) {
        await this.adminService.updateRefreshTokenService(admin.email, null);
      }

      return { message: 'Logout successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async forgotPasswordService(
    email: string,
  ): Promise<{ statusCode: number; message: string }> {
    const munitesExp = 5;
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const expiredCode = new Date(vnTime.getTime() + munitesExp * 60000);
    try {
      const saveDate = await this.usersService.updateCodeService(
        email,
        authCode,
        expiredCode,
      );
      if (!saveDate || saveDate === null) {
        throw new BadRequestException('Email not found');
      }
      // await this.mailerService.sendEmailWithCode(email, authCode);
      await this.sendEmailQueue.add(
        'send-email-code',
        {
          email,
          authCode,
        },
        {
          removeOnComplete: true,
        },
      );
      return { statusCode: 202, message: 'Email sent successfully' };
    } catch (error) {
      throw new BadRequestException(
        'something went wrong with email. please try again',
      );
    }
  }

  async resetPasswordService(
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      const user = await this.usersService.findOneCodeService(code);
      const hashPassword = await bcrypt.hash(newPassword, 10);
      if (!user || user === null) {
        throw new BadRequestException('Code is incorrect');
      }
      const now = new Date();
      const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      if (user.authCode.expiredAt < vnTime) {
        throw new BadRequestException('Code is expired');
      }
      await this.usersService.updatePasswordService(code, hashPassword);

      return { message: 'Password reset successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async handleVerifyTokenService(token: string): Promise<string> {
    try {
      const Payload = this.jwtService.verify(token);
      return Payload['_id'];
    } catch (error) {
      throw new BadRequestException('Token is invalid');
    }
  }
}
