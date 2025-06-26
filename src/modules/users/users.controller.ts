import { Body, Controller, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/role.gaurd';
import { CreateUserDto } from './dto/create-user.dto';
import { SetUserPreferencesDto } from './dto/save-user-preference.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async registerUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Put(':id')
  async updateUser(@Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(updateUserDto);
  }

  @Patch('preferences')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async setPreferences(@Body() dto: SetUserPreferencesDto) {
    return this.usersService.setUserPreferences(dto);
  }
}
