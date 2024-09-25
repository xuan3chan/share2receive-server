import { BadRequestException, Injectable } from '@nestjs/common';
import { Admin } from '@app/libs/common/schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Role } from '@app/libs/common/schema';
import { IAdmin } from '@app/libs/common/interface';
import * as bcrypt from 'bcrypt';
import {
  CreateAdminDto,
  UpdateAdminDto,
  DeleteAdminDto,
  BlockAdminDto,
} from '@app/libs/common/dto';
@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
  ) {}

  async createAdminService(_admin: CreateAdminDto): Promise<Admin> {
    const { accountName, adminName, password, roleId } = _admin;
    //sle
    const duplicate = await this.adminModel.findOne({ accountName }).exec();
    const findRole = await this.roleModel.find({ _id: { $in: roleId } }).exec();
    if (!findRole.length) {
      throw new BadRequestException('Role not exists');
    }
    if (duplicate) {
      throw new BadRequestException('Admin already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new this.adminModel({
      accountName,
      adminName,
      password: hashedPassword,
      role: findRole.map((role) => role._id.toString()),
    });
    return admin.save();
  }
  async updateAdminService(
    id: string,
    updateData: Partial<UpdateAdminDto>,
  ): Promise<{ message: string }> {
    let { adminName, password, roleId } = updateData;
  
    if (password) {
      password = await bcrypt.hash(password, 10);
    }
    if (roleId) {
      const findRole = await this.roleModel.findById(roleId).exec();
      if (!findRole) {
        throw new BadRequestException('Role not found');
      }
      roleId = findRole._id.toString(); // Ensure roleId is a string
    }
  
    await this.adminModel
      .findByIdAndUpdate(
        id,
        { $set: { adminName, password, role: roleId } },
        { new: true, runValidators: true },
      )
      .orFail(new BadRequestException('Admin not exists'))
      .lean()
      .exec();
  
    return { message: 'Admin updated successfully' };
  }

  async findOneAdminAccountNameService(accountName: string): Promise<Admin> {
    return this.adminModel.findOne({ accountName }).exec();
  }
  async updateRefreshTokenService(
    accountName: string,
    refreshToken: string,
  ): Promise<Admin> {
    return this.adminModel
      .findOneAndUpdate(
        {
          accountName,
        },
        {
          refreshToken,
        },
        {
          new: true,
        },
      )
      .exec();
  }
  async findOneAdminRefreshTokenService(refreshToken: string): Promise<Admin> {
    return this.adminModel.findOne({
      refreshToken,
    });
  }
  async deleteAdminService(id: string): Promise<{ message: string }> {
    const admin = await this.adminModel.findById(id).exec();
    if (!admin) {
      throw new BadRequestException('Admin not exists');
    }
    if (admin.accountName === 'masteradmin') {
      throw new BadRequestException('Cannot delete master admin');
    }
    await this.adminModel.findByIdAndDelete(id).exec();
    return { message: 'Admin deleted successfully' };
  }
  async listAdminService(
    page: number = 1, 
    limit: number = 10, 
    searchKey?: string
  ): Promise<{ total: number, admins: (Admin & { role: Role })[] }> {
  
    let query = {};
    if (searchKey) {
      query = {
        $or: [
          { accountName: { $regex: searchKey, $options: 'i' } },
          { adminName: { $regex: searchKey, $options: 'i' } },
        ],
      };
    }
  
    const total = await this.adminModel.countDocuments(query).exec(); // Đếm số lượng admin dựa trên query tìm kiếm nếu có
    
    const skip = (page - 1) * limit; // Tính số lượng cần bỏ qua
    const admins = await this.adminModel
      .find(query) // Tìm kiếm nếu có từ khóa
      .select('-password -createdAt -updatedAt -refreshToken') // Bỏ qua các trường không cần thiết
      .skip(skip)
      .limit(limit)
      .exec();
    
    // Lấy danh sách roleIds từ các admin
    const roleIds = admins.map((admin) => admin.role);
  
    // Lấy các roles tương ứng với roleIds
    const roles = await this.roleModel
      .find({ _id: { $in: roleIds } })
      .select('-permissionID')
      .exec();
  
    // Tạo map roleId -> role để dễ tra cứu
    const roleMap = roles.reduce((map, role) => {
      map[role.id] = role;
      return map;
    }, {});
  
    // Gán roles tương ứng cho mỗi admin
    const adminsWithRoles = admins.map((admin) => {
      const role = roleMap[admin.role.toString()];
      return {
        ...admin.toObject(),
        role,
      } as Admin & { role: Role };
    });
  
    return { total, admins: adminsWithRoles };
  }
  

  async blockAdminService(id: string, isBlock: boolean): Promise<any> {
    await this.adminModel
      .findByIdAndUpdate(
        id,
        { $set: { isBlock } },
        { new: true, runValidators: true },
      )
      .exec();
    return { message: 'Block admin success' };
  }
  async findOneAdminService(id: string): Promise<Admin> {
    return this.adminModel.findById(id).exec();
  }
  async findOneAdminbyIdRoleService(id: string): Promise<Admin> {
    return this.adminModel.findOne({ role: id }).exec();
  }
  async viewProfileService(id: string): Promise<Admin> {
    return this.adminModel
      .findById(id)
      .select('adminName _id').lean()
      .exec();
  }

}
