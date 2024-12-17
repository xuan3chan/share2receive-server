import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { UpdateUserProfileDto, UserStyleDto } from '@app/libs/common/dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { User, Wallet, WalletDocument } from '@app/libs/common/schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { remove as removeAccents } from 'remove-accents';
import { EncryptionService } from '../encryption/encryption.service';
import { MailerService } from 'src/mailer/mailer.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class UsersService {
  constructor(
    private cloudinaryService: CloudinaryService,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @Inject(forwardRef(() => EncryptionService))
    private encryptionService: EncryptionService,
    private mailerService: MailerService,
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
  async listUserService(
    page: number,
    limit: number,
    searchKey?: string,
    sortField: string = 'lastname',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<{ total: number; users: any[] }> {
    const skip = (page - 1) * limit;

    // Preprocess search key: loại bỏ dấu, ký tự đặc biệt, chuyển về chữ thường
    // Preprocess search key: loại bỏ dấu, khoảng trắng thừa, và chữ thường hóa
const preprocessString = (str: string) =>
  str
    ? str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu tiếng Việt
        .trim()
        .toLowerCase()
    : '';

// Preprocess searchKey
const preprocessedSearchKey = searchKey ? preprocessString(searchKey) : null;

// Build regex: Tìm kiếm linh hoạt (cho phép cả chuỗi email chứa ký tự đặc biệt)
const regex = preprocessedSearchKey
  ? new RegExp(preprocessedSearchKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  : null;

// Xây dựng matchQuery
const matchQuery = regex
  ? {
      $or: [
        { firstname: { $regex: regex } }, // Khớp tên
        { lastname: { $regex: regex } },  // Khớp họ
        { email: { $regex: regex } },     // Khớp email chứa từ khóa
      ],
    }
  : {};


    // Aggregation pipeline
    const pipeline: PipelineStage[] = [
      { $match: matchQuery }, // Bộ lọc tìm kiếm
      {
        $lookup: {
          from: 'wallets', // Tên collection Wallet
          localField: '_id', // ID của user
          foreignField: 'userId', // Tham chiếu đến userId của Wallet
          as: 'wallet', // Tên key để ánh xạ kết quả
        },
      },
      { $unwind: { path: '$wallet', preserveNullAndEmptyArrays: true } }, // Flatten mảng wallet
      {
        $project: {
          firstname: 1,
          lastname: 1,
          email: 1,
          avatar: 1,
          isBlock: 1,
          createdAt: 1,
          averageRating: 1,
          numberOfRating: 1,
          wallet: { $ifNull: ['$wallet.point', 0] }, // Lấy wallet.point, nếu null trả về 0
        },
      },
      { $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 } }, // Sắp xếp
      { $skip: skip }, // Phân trang: bỏ qua n bản ghi
      { $limit: limit }, // Phân trang: giới hạn số bản ghi
    ];

    // Thực thi aggregation pipeline
    const users = await this.userModel.aggregate(pipeline).exec();
    const total = await this.userModel.countDocuments(matchQuery).exec();

    // Trả về kết quả
    return { total, users };
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
    typeUser?: string,
  ): Promise<any> {
    console.log(typeUser);
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
      typeUser,
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
    updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<User> {
    const { bankingNumber, bankingName, bankingNameUser, bankingBranch, ...otherUpdates } = updateUserProfileDto;
  
    const updatedUser = await this.userModel
      .findOneAndUpdate(
        { _id }, // Tìm theo _id của người dùng
        {
          $set: {
            ...otherUpdates, // Cập nhật các thuộc tính khác ngoài banking
            ...(bankingNumber || bankingName || bankingNameUser || bankingBranch
              ? {
                  banking: {
                    bankingNumber,
                    bankingName,
                    bankingNameUser,
                    bankingBranch,
                  },
                }
              : {}), // Cập nhật banking nếu có dữ liệu
          },
        },
        { new: true, upsert: false } // Trả về tài liệu đã được cập nhật
      )
      .exec();
  
    return updatedUser;
  }
  
  

  async updateUserStyleService(
    _id: string,
    userStyle: UserStyleDto, // Sử dụng kiểu UserStyleDto
  ): Promise<User> {
    const updatedUser = await this.userModel
      .findOneAndUpdate(
        { _id },
        {
          $set: {
            userStyle,
          },
        },
        { new: true },
      )
      .exec();

    return updatedUser;
  }

  async updateAvatarService(_id: string, avatar: string): Promise<User> {
    const user = await this.userModel.findOne({ _id }).exec();
    try{
    const deleteAvatar = this.cloudinaryService.deleteMediaService(user.avatar);
    if (!deleteAvatar) {
      return null;
    }
  }catch(error){
    // console.log(error);
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
      // Xử lý trước khi tìm kiếm (loại bỏ dấu, ký tự không cần thiết)
      const preprocessString = (str: string) =>
        str
          ? removeAccents(str)
              .replace(/[^a-zA-Z0-9\s]/gi, '')
              .trim()
              .toLowerCase()
          : '';

      const preprocessedSearchKey = preprocessString(searchKey);
      // Tạo regex cho firstname, lastname và email
      const regex = new RegExp(preprocessedSearchKey, 'i');
      // Tìm kiếm người dùng trong MongoDB với regex trên firstname, lastname, hoặc email
      const users = await this.userModel
        .find({
          $or: [{ firstname: regex }, { lastname: regex }, { email: regex }],
        })
        .select('firstname lastname email avatar isBlock createdAt') // Chỉ chọn các trường cần thiết
        .lean() // Tăng hiệu suất bằng cách trả về plain objects
        .exec();

      if (users.length > 0) {
        return {
          message: `Found ${users.length} user(s)`,
          user: users,
        };
      }
      return { message: 'No user found', user: [] };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async blockUserService(_id: string, isBlock: boolean): Promise<User> {
    const updatedUser = await this.userModel
      .findOneAndUpdate({ _id }, { isBlock }, { new: true })
      .exec();
    if (isBlock == true) this.mailerService.sendEmailBlocked(updatedUser.email);
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

  async changePasswordService(
    id: string,
    newPassword: string,
    oldPassword: string,
  ): Promise<{ message: string }> {
    try {
      const user = await this.userModel.findOne({ _id: id });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (!(await bcrypt.compare(oldPassword, user.password))) {
        throw new BadRequestException('Old password is incorrect');
      }
      if (oldPassword === newPassword) {
        throw new BadRequestException('New password must be different');
      }
      
      const hashPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashPassword;
      await user.save();
  
      return { message: 'Password reset successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
