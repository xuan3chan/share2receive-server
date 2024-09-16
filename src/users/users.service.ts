import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {UpdateUserProfileDto} from '@app/libs/common/dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '@app/libs/common/schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { remove as removeAccents } from 'remove-accents';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class UsersService {
  constructor(
    private cloudinaryService: CloudinaryService,
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(forwardRef(() => EncryptionService))
    private encryptionService: EncryptionService,
    
  ) {}

 

  async findOneEmailOrUsernameService(account: string): Promise<User> {
    const user = await this.userModel
      .findOne({
        $or: [{ email: account }, { username: account }],
      })
      .exec();
   
    return user;
  }

  async findOneUsernameService(username: string): Promise<User> {
    return this.findOneEmailOrUsernameService(username);
  }


  async findOneReTokenService(refreshToken: string): Promise<User> {
    const user = await this.userModel.findOne({ refreshToken }).exec();

    return user;
  }

  async findOneCodeService(Code: string): Promise<User> {
    const user = await this.userModel.findOne({ 'authCode.code': Code }).exec();

    return user;
  }

  async updatePasswordService(
    code: string,
    newPassword: string,
  ): Promise<User> {
    const user = await this.findOneCodeService(code);
    if (!user) {
      return null;
    }
    const encryptKey = user.encryptKey;
    const decryptKey = this.encryptionService.decryptEncryptKey(
      encryptKey,
      user.password,
    );
    const newEncryptKey = this.encryptionService.updateEncryptKey(
      newPassword,
      decryptKey,
    );
    user.encryptKey = newEncryptKey;
    user.password = newPassword;
    user.authCode = null;
    await user.save();

    return user;
  }

  async listUserService(): Promise<User[]> {
   
    const users = await this.userModel
      .find()
      .exec();
 
    return users;
  }

  async updateRefreshTokenService(
    account: string,
    refreshToken: string,
  ): Promise<User> {
    const user = await this.userModel
      .findOneAndUpdate(
        { $or: [{ email: account }, { username: account }] },
        { refreshToken },
        { new: true },
      )
      .exec();
  
    return user;
  }

  async updateCodeService(
    email: string,
    authCode: string,
    expiredCode: Date,
  ): Promise<User> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      return null;
    }
    user.authCode = {
      code: authCode,
      expiredAt: expiredCode,
    };
    await user.save();
  
    return user;
  }

  async createUserService(
      email: string,
      password: string,
      firstname: string,
      lastname: string,
      refreshToken: string,
      avatar?: string,
  ): Promise<any> {
      const userExist = await this.userModel
          .findOne({
              $or: [{ email: email }],
          })
          .exec();
      if (userExist) {
          return { message: 'Email or username already exists' };
      }
     
      const createEncryptKey = this.encryptionService.createEncryptKey(
          password.toString(),
      );
      const newUser = new this.userModel({
          email,
          password,
          firstname,
          lastname,
          avatar,
          encryptKey: createEncryptKey,
          refreshToken,
      });
  
      const savedUser = await newUser.save();
    
      return savedUser;
  }

  async viewProfileService(_id: string): Promise<User> {
 
    const user = await this.userModel
      .findOne({ _id })
      .select('-password -encryptKey -refreshToken -authCode')  
      .exec();
  
    return user;
  }

  async updateUserProfileService(
    _id: string,
    UpdateUserProfileDto
  ): Promise<User> {
    const updatedUser = await this.userModel
      .findOneAndUpdate(
        { _id },
        {
          UpdateUserProfileDto
        },
        { new: true },
      )
      .exec();
   
  
    return updatedUser;
  }

  async updateAvatarService(_id: string, avatar: string): Promise<User> {
    const user = await this.userModel.findOne({ _id }).exec();
    const deleteAvatar = this.cloudinaryService.deleteMediaService(user.avatar);
    if (!deleteAvatar) {
      return null;
    }
    const updatedUser = await this.userModel
      .findOneAndUpdate({ _id }, { avatar }, { new: true })
      .exec();
   
    return updatedUser;
  }

  async searchUserService(
    searchKey: string,
  ): Promise<{ message: string; user: User[] }> {
    try {
   

      const users = await this.userModel.find({}, { password: 0 }).exec();
      const preprocessString = (str: string) =>
        str
          ? removeAccents(str)
              .replace(/[^a-zA-Z0-9\s]/gi, '')
              .trim()
              .toLowerCase()
          : '';
      const preprocessedSearchKey = preprocessString(searchKey);
      const regex = new RegExp(`${preprocessedSearchKey}`, 'i');
      const matchedUsers = users.filter((user) => {
        const { username, firstname, lastname, email } = user;
        const fullname = `${firstname} ${lastname}`;
        const [preprocessedUsername, preprocessedFullname, preprocessedEmail] =
          [username, fullname, email].map((field) => preprocessString(field));
        return (
          regex.test(preprocessedUsername) ||
          regex.test(preprocessedFullname) ||
          regex.test(preprocessedEmail)
        );
      });

      if (matchedUsers.length > 0) {
        return {
          message: `Found ${matchedUsers.length} user(s)`,
          user: matchedUsers,
        };
      }
      return { message: 'No user found', user: [] };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }
 

  async blockUserService(_id: string, isBlock: boolean): Promise<User> {
    const updatedUser = await this.userModel
      .findOneAndUpdate({ _id }, { isBlock }, { new: true })
      .exec();


    return updatedUser;
  }

  async deleteUserService(_id: string): Promise<User> {
    const user = await this.userModel.findById(_id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const deletedUser = await this.userModel.findOneAndDelete({ _id }).exec();
   
 
    return deletedUser;
  }

  async findUserByIdService(userId: string): Promise<any> {
 
    const user = await this.userModel.findOne({ _id: userId }).exec();
  
    return user;
  }

  
}
