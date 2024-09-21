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
  ): Promise<{ massage: string }> {
    let { adminName, accountName, password, roleId } = updateData;
    if (accountName) {
      const duplicate = await this.adminModel
        .findOne({ accountName, _id: { $ne: id } })
        .exec();
      if (duplicate) {
        throw new BadRequestException('Admin already exists');
      }
    }
    if (password) {
      password = await bcrypt.hash(password, 10);
    }
    if (roleId) {
      const findRole = await this.roleModel
        .find({ _id: { $in: roleId } })
        .exec();
      if (findRole.length !== roleId.length) {
        throw new BadRequestException('Some roles were not found');
      }
      roleId = findRole.map((role) => role._id.toString()); // Extract _id values as strings
    }
    await this.adminModel
      .findByIdAndUpdate(
        id,
        { $set: { adminName, accountName, password, role: roleId } },
        { new: true, runValidators: true },
      )
      .orFail(new BadRequestException('Admin not exists'))
      .lean()
      .exec();
    return { massage: 'Admin updated successfully' };
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
    if (admin.email === 'masterAdmin@gmail.com') {
      throw new BadRequestException('Cannot delete master admin');
    }
    await this.adminModel.findByIdAndDelete(id).exec();
    return { message: 'Admin deleted successfully' };
  }
  async listAdminService(page: number, limit: number): Promise<(Admin & { role: Role[] })[]> {
    if (!page) {
      page = 1;
    }
    if (!limit) {
      limit = 10;
    }
    const skip = (page - 1) * limit;
    
    // Fetch paginated admins from the database without certain fields (password, createdAt, etc.)
    const admins = await this.adminModel
      .find()
      .select('-password -createdAt -updatedAt -refreshToken')
      .skip(skip)
      .limit(limit)
      .exec();
  
    // Extract all roleIds from the admins
    const roleIds = admins.reduce((ids, admin) => [...ids, ...admin.role], []);
  
    // Fetch the roles for the corresponding role IDs
    const roles = await this.roleModel
      .find({ _id: { $in: roleIds } })
      .select('-permissionID')
      .exec();
  
    // Attach the appropriate roles to each admin
    return admins.map((admin) => {
      const role = roles.filter(
        (role) => admin.role.includes(role.id),
      );
      return {
        ...admin.toObject(),
        role,
      } as Admin & { role: Role[] };
    });
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
