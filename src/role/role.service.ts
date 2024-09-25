import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '@app/libs/common/schema';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class RoleService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>,
    private adminService: AdminService,
  ) {}
  async createRoleService(name: string, permissionID: number[]): Promise<Role> {
    const role = await this.roleModel
      .findOne({
        name,
      })
      .exec();
    if (role) {
      throw new BadRequestException('Role already exists');
    }
    const newRole = new this.roleModel({
      name,
      permissionID,
    });
    return newRole.save();
  }

  async updateRoleService(
    id: string,
    name: string,
    permissionID: number[],
  ): Promise<Role> {
    // Check for duplicate role name
    const roleDuplicate = await this.roleModel.findOne({ name }).exec();
    if (roleDuplicate && roleDuplicate._id.toString() !== id) {
      throw new BadRequestException('Role already exists');
    }
    // Update the role
    const role = await this.roleModel
      .findByIdAndUpdate(
        id,
        { $set: { name, permissionID } },
        { new: true, runValidators: true },
      )
      .exec();

    if (!role) {
      throw new BadRequestException('Role not exists');
    }

    return role;
  }
  async findRoleService(id: string): Promise<Role> {
    return this.roleModel.findById(id)
    .select('-_id')
    .exec();
  }
  async viewlistRoleService(
    page: number, 
    limit: number, 
    searchKey?: string
  ): Promise<{ total: number, roles: Role[] }> {
  
    let query = {};
    if (searchKey) {
      query = { name: { $regex: searchKey, $options: 'i' } }; // Tìm kiếm theo tên có chứa searchKey, không phân biệt hoa thường
    }
  
    const total = await this.roleModel.countDocuments(query).exec(); // Đếm tổng số roles theo query (nếu có tìm kiếm)
    
    const skip = (page - 1) * limit; // Tính toán số lượng tài liệu cần bỏ qua
    const roles = await this.roleModel
      .find(query) // Thực hiện tìm kiếm nếu có searchKey
      .skip(skip)
      .limit(limit)
      .exec();
      
    return { total, roles }; // Trả về tổng số và danh sách roles
  }
  
  
  async deleteRoleService(id: string): Promise<{ message: string }> {
    try {
      const checkRoleExistInAdmin =
        await this.adminService.findOneAdminbyIdRoleService(id);
      if (checkRoleExistInAdmin) {
        throw new BadRequestException('Role exists in admin');
      }
      const role = await this.roleModel.findById(id).exec();
      if (!role) {
        throw new BadRequestException('Role not exists');
      }
      await this.roleModel.findByIdAndDelete(id).exec();
      return { message: 'Role deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}