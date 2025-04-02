import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(@InjectRepository(Role) private roleRepo: Repository<Role>) {}

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
    const roles = ['Admin', 'Teacher', 'Student'];
    for (const roleName of roles) {
      await this.createRole({ name: roleName }).catch(() => {});
    }
  }
}
