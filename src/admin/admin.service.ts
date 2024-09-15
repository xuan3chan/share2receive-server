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

  async findOneAdminEmailService(email: string): Promise<Admin> {
    return this.adminModel.findOne({ email }).exec();
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
  async listAdminService(): Promise<(Admin & { role: Role[] })[]> {
    // Fetch admins from the database without certain fields (password, createdAt, etc.)
    const admins = await this.adminModel
      .find()
      .select('-password -createdAt -updatedAt -refreshToken')
      .exec();
    const roleIds = admins.reduce((ids, admin) => [...ids, ...admin.role], []);
    const roles = await this.roleModel
      .find({ _id: { $in: roleIds } })
      .select('-permissionID')
      .exec();
    return admins.map((admin) => {
      const role = roles.filter(
        (role) => admin.role.includes(role.id), // Use _id (since roles have _id, not id)
      );
      return {
        ...admin.toObject(), // Convert admin to a plain object
        role, // Attach the filtered roles to the admin
      } as Admin & { role: Role[] }; // Explicitly cast to the correct type
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
}
