import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/update-auth.dto';
import { AuthGuard } from './guards/auth.guard';

interface ResendVerificationDto {
  email: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register-user')
  registerUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.registerUser(createUserDto);
  }

  @Post('login')
  signIn(@Body() loginDto: LoginDto) {
    return this.authService.signIn(loginDto);
  }

  @Get('verify-email')
  @ApiQuery({
    name: 'token',
    required: true,
    type: String,
    description: 'Verification token',
  })
  async verifyEmail(@Query('token') token: string) {
    await this.usersService.verifyEmail(token);
    return {
      message: 'Email verified successfully',
    };
  }

  @Post('resend-verification')
  async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ) {
    const { email } = resendVerificationDto;
    const user = await this.usersService.findUserByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    await this.usersService.resendVerificationEmail(user);
    return {
      message: 'Verification email sent successfully',
    };
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  findUserDetails(@AuthUser('sub') userId: string) {
    return this.authService.findUserDetails(userId);
  }
}
