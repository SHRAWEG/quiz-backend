import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/update-auth.dto';
import { AuthGuard } from './guards/auth.guard';

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
  async verifyEmail(token: string) {
    await this.usersService.verifyEmail(token);
    return {
      message: 'Email verified successfully',
    };
  }

  @Post('resend-verification')
  @UseGuards(AuthGuard)
  async resendVerification(@Body() userId: string) {
    const user = await this.usersService.findUserById(userId);

    if (!user) {
      return {
        message: 'User not found',
      };
    }

    if (user.isEmailVerified) {
      return {
        message: 'Email is already verified',
      };
    }

    await this.usersService.sendVerificationEmail(user);
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
