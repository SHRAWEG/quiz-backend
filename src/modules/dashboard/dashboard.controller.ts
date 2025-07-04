import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/role.gaurd';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('/admin')
  @Roles(Role.ADMIN)
  async getAdminDashboard() {
    return await this.dashboardService.getAdminDashboard();
  }

  @Get('/student')
  @Roles(Role.STUDENT)
  async getStudentDashboard() {
    return await this.dashboardService.getStudentDashboard();
  }

  @Get('/teacher')
  @Roles(Role.TEACHER)
  async getTeacherDashboard() {
    return await this.dashboardService.getTeacherDashboard();
  }
}
