import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { ApiResponse } from 'src/common/classes/api-response';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/common/enums/roles.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/role.gaurd';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { SetUserPreferencesDto } from './dto/save-user-preference.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  findUserDetails(@AuthUser('sub') userId: string) {
    return this.usersService.getUserDetails(userId);
  }

  @Get('preferences')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.STUDENT)
  async getPreferences() {
    const preferencedCategories = await this.usersService.getUserPreferences();

    return new ApiResponse({
      success: true,
      message: 'User updated successfully.',
      data: {
        categories: preferencedCategories,
      },
    });
  }

  @Get('students')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Term to search for subjects',
  })
  async getStudents(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.usersService.getStudents(pageNumber, limitNumber, search);
  }

  @Get('teachers')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Term to search for subjects',
  })
  async getTeachers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.usersService.getTeachers(pageNumber, limitNumber, search);
  }

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
  @ApiBearerAuth()
  @Roles(Role.STUDENT)
  async setPreferences(@Body() dto: SetUserPreferencesDto) {
    return this.usersService.setUserPreferences(dto);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async updateProfile(@Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(updateProfileDto);
  }

  @Patch('change-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.usersService.changePassword(changePasswordDto);
  }

  @Patch('profile-picture')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        // Allow only image files
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return cb(
            new BadRequestException(
              'Only image files (jpg, jpeg, png, gif, webp) are allowed!',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profilePicture: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture image file',
        },
      },
    },
  })
  async updateProfilePicture(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No profile picture file uploaded.');
    }
    return this.usersService.updateProfilePicture(file);
  }
}
