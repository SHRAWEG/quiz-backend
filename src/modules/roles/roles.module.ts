import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRole } from '../users/entities/user-role.entity';
import { Role } from './entities/role.entity';
import { RolesService } from './roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, UserRole])],
  providers: [RolesService],
  exports: [RolesService], // Needed in other modules
})
export class RolesModule {}
