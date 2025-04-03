import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user-role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.roleRepo.find();
  }

  async findById(id: number): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { id } });
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { name } });
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.findByName(dto.name);
    if (existingRole) throw new BadRequestException('Role already exists');

    const role = this.roleRepo.create(dto);
    return this.roleRepo.save(role);
  }

  async seedRoles(): Promise<void> {
    // check if roles already exist
    const existingRoles = await this.findAll();
    if (existingRoles.length > 0) return;

    const roles = ['Admin', 'Teacher', 'Student'];
    for (const roleName of roles) {
      await this.createRole({ name: roleName }).catch(() => {});
    }
  }

    /**
   * Retrieves the role of a user by their user ID.
   *
   * @param userId - The unique identifier of the user.
   * @returns {Promise<Role>} The role associated with the user.
   */
    async getUserRole(userId: string): Promise<Role> {
      const userRole = await this.userRoleRepo.findOne({
        where: { user: { id: userId } },
        relations: ['role'], // Ensure the role is loaded
      });
  
      if (!userRole) {
        throw new BadRequestException('Role not found for the user');
      }
  
      return userRole.role;
    }
}
