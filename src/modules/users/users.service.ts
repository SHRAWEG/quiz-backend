import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { ApiResponse } from 'src/common/classes/api-response';
import { Role } from 'src/common/enums/roles.enum';
import {
  ValidationError,
  ValidationException,
} from 'src/common/exceptions/validation.exception';
import { ILike, Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { VerificationToken } from './entities/verification-token.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(VerificationToken)
    private readonly verificationTokenRepo: Repository<VerificationToken>,
    private readonly emailService: EmailService,
  ) {}

  // Utility method to find a user by their ID.
  async findUserById(id: string) {
    return this.userRepo.findOneBy({ id });
  }

  // Utility method to find a user by their email.
  async findUserByEmail(email: string) {
    return this.userRepo.findOneBy({ email: ILike(email) });
  }

  // Utility method to update the last login date of a user.
  async updateLastLogin(id: string) {
    return await this.userRepo.update(id, { lastLogin: new Date() });
  }

  /**
   * Validates user credentials by checking the provided email and password.
   *
   * @param email - The email address of the user.
   * @param password - The plain text password of the user.
   * @returns {Promise<User | null>} The user object if the credentials are valid, otherwise null.
   */
  async validateUserCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.userRepo
      .createQueryBuilder('users')
      .where('users.email = :email', { email })
      .addSelect('users.password')
      .addSelect('users.isEmailVerified')
      .getOne();
    if (!user) {
      return null;
    }

    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Creates a new user in the system.
   *
   * @param {CreateUserDto} dto - The data transfer object containing user details.
   * @returns {Promise<ApiResponse>} - The response containing the created user details.
   * @throws {ValidationException} - If there are validation errors such as email or phone already existing, or role not found.
   */
  async createUser(dto: CreateUserDto): Promise<ApiResponse<object>> {
    const validationErrors: ValidationError = {};

    const existingUserByEmail = await this.userRepo.findOneBy({
      email: dto.email,
    });
    if (existingUserByEmail) {
      validationErrors['email'] = ['email already exists'];
    }
    const existingUserByPhone = await this.userRepo.findOneBy({
      phone: dto.phone,
    });
    if (existingUserByPhone) {
      validationErrors['phone'] = ['phone already exists'];
    }
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      throw new ValidationException(validationErrors);
    }

    const passwordHash = await argon2.hash(dto.password);

    const newUser = this.userRepo.create({
      ...dto,
      password: passwordHash,
    });
    const savedUser = await this.userRepo.save(newUser);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...user } = savedUser;

    try {
      await this.sendVerificationEmail(savedUser);
    } catch (error) {
      console.error('Error sending verification email:', error);
    }

    return new ApiResponse({
      message: 'User created successfully.',
      data: user,
    });
  }

  async seedAdminUser(): Promise<void> {
    const existingAdmin = await this.userRepo.findOneBy({
      email: 'admin@quizit.com',
    });
    if (existingAdmin) {
      return; // Admin user already exists
    }

    const adminUser = this.userRepo.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@quizit.com',
      phone: '1234567890',
      role: Role.ADMIN,
      password: await argon2.hash('admin123'), // Default password
      isEmailVerified: true,
      isActive: true,
    });

    await this.userRepo.save(adminUser);
  }

  /**
   * Sends verification mail to the user provided email.
   *
   * @param {User} user - The user object containing the email address to send the verification to.
   * @returns {Promise<void>} A promise that resolves when the mail is sent.
   */
  async sendVerificationEmail(user: User): Promise<void> {
    // Create a verification token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    // Save the token
    await this.verificationTokenRepo.save({
      token,
      userId: user.id,
      expiresAt,
    });

    // Send the verification email
    await this.emailService.sendVerificationEmail(user.email, token);
  }

  /**
   * Resends verification mail to the user provided email.
   *
   * @param {User} user - The user object containing the email address to send the verification to.
   * @returns {Promise<void>} A promise that resolves when the mail is sent.
   */
  async resendVerificationEmail(user: User): Promise<void> {
    // Check existing verification token
    const existingToken = await this.verificationTokenRepo.findOneBy({
      userId: user.id,
    });

    if (existingToken) {
      // If a token exists, expire it to prevent reuse
      existingToken.expiresAt = new Date(); // Set to past date to expire it
      existingToken.expiresAt.setHours(existingToken.expiresAt.getHours() - 1); // Expire the token

      //save the expired token
      await this.verificationTokenRepo.save(existingToken);
    }

    // Create a verification token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    // Save the token
    await this.verificationTokenRepo.save({
      token,
      userId: user.id,
      expiresAt,
    });

    // Send the verification email
    await this.emailService.sendVerificationEmail(user.email, token);
  }

  /**
   * Verifies email of the user by verifying the provided token.
   *
   * @param {string} token - The token to verify.
   * @returns {Promise<void>} A promise that resolves when the email is verified.
   * @throws {NotFoundException} If the verification token is not found in the database.
   * @throws {UnauthorizedException} If the verification token has expired.
   */
  async verifyEmail(token: string): Promise<void> {
    const verificationToken = await this.verificationTokenRepo.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!verificationToken) {
      throw new NotFoundException('Verification token not found');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Verification token has expired');
    }

    // Update user's email verification status
    await this.userRepo.update(
      { id: verificationToken.userId },
      { isEmailVerified: true },
    );

    // Delete the used token
    await this.verificationTokenRepo.remove(verificationToken);

    // Delete all expired tokens
    await this.verificationTokenRepo.delete({
      userId: verificationToken.userId,
    });
  }

  /**
   * Retrieves the details of a user by their ID.
   *
   * @param {string} userId - The ID of the user to retrieve details for.
   * @returns {Promise<ApiResponse<User>>} A promise that resolves to an ApiResponse containing the user's details.
   * @throws {NotFoundException} If the user ID is not provided or if no user is found with the provided ID.
   */
  async getUserDetails(userId: string): Promise<ApiResponse<User>> {
    if (!userId) {
      throw new NotFoundException('User with provided ID not found');
    }

    const user = await this.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User with provided ID not found');
    }

    return new ApiResponse({
      message: 'User profile fetched successfully',
      data: user,
    });
  }
}
