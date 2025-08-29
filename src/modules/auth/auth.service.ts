import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiResponse } from 'src/common/classes/api-response';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/update-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Creates a new user in the system.
   *
   * @param {CreateUserDto} dto - The data transfer object containing user details.
   * @returns {Promise<ApiResponse>} - The response containing the created user details.
   * @throws {ValidationException} - If there are validation errors such as email or phone already existing, or role not found.
   */
  async registerUser(dto: CreateUserDto): Promise<object> {
    return this.usersService.createUser(dto);
  }

  /**
   * Signs in a user with the provided credentials.
   *
   * @param {LoginDto} dto - The login data transfer object containing the user's email and password.
   * @returns {Promise<ApiResponse<{ accessToken: string }>>} - A promise that resolves to an ApiResponse containing the access token if the sign-in is successful.
   * @throws {UnauthorizedException} - If the email or password is invalid.
   * @throws {ForbiddenException} - If the user's account is suspended or email is not verified.
   */
  async signIn(dto: LoginDto): Promise<ApiResponse<{ accessToken: string }>> {
    const user = await this.usersService.validateUserCredentials(
      dto.email,
      dto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // check if user's account is active
    if (!user.isActive) {
      throw new ForbiddenException("User's account has been suspended");
    }

    // Check if user's email is verified
    // We'll skip this check for admin users in the validateUserCredentials method
    if (!user.isEmailVerified) {
      throw new ForbiddenException(
        'Please verify your email before logging in',
      );
    }

    await this.usersService.updateLastLogin(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    // Fetch the user's role

    return new ApiResponse({
      message: 'User signed in successfully',
      data: {
        accessToken,
        email: user.email,
        role: user.role,
        name: `${user.firstName} ${user.middleName ?? ''} ${user.lastName}`,
        hasPreference: user.preferredCategories.length > 0,
        profilePicture: user.profilePicture,
      },
    });
  }

  /**
   * Retrieves the details of a user by their unique identifier.
   *
   * @param userId - The unique identifier of the user whose details are to be retrieved.
   * @returns {Promise<ApiResponse<object>>} A promise that resolves to the user's details with profile picture URL.
   */
  findUserDetails(userId: string): Promise<ApiResponse<object>> {
    return this.usersService.getUserDetails(userId);
  }
}
