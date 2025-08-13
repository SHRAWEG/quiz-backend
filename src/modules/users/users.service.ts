import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Request } from 'express';
import { ApiResponse } from 'src/common/classes/api-response';
import { Role } from 'src/common/enums/roles.enum';
import {
  ValidationError,
  ValidationException,
} from 'src/common/exceptions/validation.exception';
import { DataSource, ILike, In, Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SetUserPreferencesDto } from './dto/save-user-preference.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { VerificationToken } from './entities/verification-token.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(VerificationToken)
    private readonly verificationTokenRepo: Repository<VerificationToken>,
    private readonly emailService: EmailService,
    @Inject(REQUEST) private readonly request: Request,
    private readonly dataSource: DataSource,
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
      .leftJoinAndSelect('users.preferredCategories', 'preferredCategories')
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

  async updateUser(dto: UpdateUserDto): Promise<ApiResponse<object>> {
    const userId = this.request.user.sub;
    if (!userId) {
      throw new BadRequestException('Unauthorized');
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager
        .getRepository(User)
        .createQueryBuilder('user')
        .where('user.id = :userId', { userId })
        .getOne();

      if (!user) throw new NotFoundException('User not found');

      const validationErrors: Record<string, string[]> = {};

      // ✅ Email uniqueness check
      if (dto.email && dto.email !== user.email) {
        const existingEmailUser = await this.userRepo.findOneBy({
          email: dto.email,
        });
        if (existingEmailUser) {
          validationErrors['email'] = ['Email already exists'];
        }
      }

      // ✅ Phone uniqueness check
      if (dto.phone && dto.phone !== user.phone) {
        const existingPhoneUser = await this.userRepo.findOneBy({
          phone: dto.phone,
        });
        if (existingPhoneUser) {
          validationErrors['phone'] = ['Phone already exists'];
        }
      }

      if (Object.keys(validationErrors).length > 0) {
        throw new ValidationException(validationErrors);
      }

      // ✅ Password update check
      if (dto.oldPassword || dto.newPassword || dto.confirmNewPassword) {
        if (!dto.oldPassword || !dto.newPassword || !dto.confirmNewPassword) {
          throw new BadRequestException(
            'All password fields are required to change password.',
          );
        }

        const isOldPasswordValid = await argon2.verify(
          user.password,
          dto.oldPassword,
        );
        if (!isOldPasswordValid) {
          throw new BadRequestException('Old password is incorrect.');
        }

        if (dto.newPassword !== dto.confirmNewPassword) {
          throw new BadRequestException('New passwords do not match.');
        }

        // Hash new password
        user.password = await argon2.hash(dto.newPassword);
        await queryRunner.manager.save(user);
      }

      // ✅ Prepare update fields
      const updateFields: Partial<User> = {};
      if (dto.firstName !== undefined) updateFields.firstName = dto.firstName;
      if (dto.middleName !== undefined)
        updateFields.middleName = dto.middleName;
      if (dto.lastName !== undefined) updateFields.lastName = dto.lastName;
      if (dto.email !== undefined) updateFields.email = dto.email;
      if (dto.phone !== undefined) updateFields.phone = dto.phone;

      // ✅ Update user
      if (Object.keys(updateFields).length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(User)
          .set(updateFields)
          .where('id = :userId', { userId })
          .execute();
      }

      await queryRunner.commitTransaction();

      const updatedUser = await this.userRepo.findOneBy({ id: userId });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...safeUser } = updatedUser;

      return new ApiResponse({
        success: true,
        message: 'User updated successfully.',
        data: safeUser,
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.log(err);
      throw new BadRequestException('User update failed');
    } finally {
      await queryRunner.release();
    }
  }

  async getUserPreferences() {
    const user = this.request.user;

    const preferences = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.preferredCategories', 'preferredCategories')
      .where('user.id = :id', { id: user.sub })
      .getOne();

    return preferences.preferredCategories;
  }

  async setUserPreferences(dto: SetUserPreferencesDto) {
    const currentUser = this.request.user;

    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.preferredCategories', 'preferredCategories')
      .where('user.id = :id', { id: currentUser.sub })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newCategories = await this.categoryRepo.findBy({
      id: In(dto.categoryIds),
    });

    if (newCategories.length !== dto.categoryIds.length) {
      throw new BadRequestException(
        'One or more provided category IDs are invalid.',
      );
    }

    if (user.preferredCategories && user.preferredCategories.length > 0) {
      await this.dataSource
        .createQueryBuilder()
        .relation(User, 'preferredCategories')
        .of(user)
        .remove(user.preferredCategories);
    }

    if (newCategories.length > 0) {
      await this.dataSource
        .createQueryBuilder()
        .relation(User, 'preferredCategories')
        .of(user)
        .add(newCategories);
    }

    const updatedUser = await this.userRepo.findOne({
      where: { id: currentUser.sub },
      relations: ['preferredCategories'],
    });

    return {
      success: true,
      message: 'Preferences saved successfully',
      data: updatedUser.preferredCategories, // Return the newly set categories
    };
  }

  async getStudents(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const query = this.userRepo
      .createQueryBuilder('user')
      .where('user.role = :role', { role: Role.STUDENT })
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere(
        `(user.firstName ILIKE :search OR user.middleName ILIKE :search OR user.lastName ILIKE :search)`,
        { search: `%${search}%` },
      );
    }
    const [students, totalItems] = await query.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);
    return {
      message: 'Students fetched successfully.',
      success: true,
      data: students,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
    };
  }

  async getTeachers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;

    const query = this.userRepo
      .createQueryBuilder('user')
      .where('user.role = :role', { role: Role.TEACHER })
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      query.andWhere(
        `(user.firstName ILIKE :search OR user.middleName ILIKE :search OR user.lastName ILIKE :search)`,
        { search: `%${search}%` },
      );
    }
    const [students, totalItems] = await query.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);
    return {
      message: 'Students fetched successfully.',
      success: true,
      data: students,
      totalItems,
      totalPages,
      currentPage: page,
      pageSize: limit,
    };
  }

  async seedAdmin(): Promise<void> {
    const existingAdmin = await this.userRepo.findOneBy({
      email: 'admin@quizit.com',
    });
    if (existingAdmin) {
      return; // Admin user already exists
    }

    const admin = this.userRepo.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@quizit.com',
      phone: '1234567890',
      role: Role.ADMIN,
      password: await argon2.hash('admin123'), // Default password
      isEmailVerified: true,
      isActive: true,
    });

    await this.userRepo.save(admin);
  }

  async seedTeacher(): Promise<void> {
    const existingTeacher = await this.userRepo.findOneBy({
      email: 'teacher@quizit.com',
    });
    if (existingTeacher) {
      return; // Admin user already exists
    }

    const teacher = this.userRepo.create({
      firstName: 'Teacher',
      lastName: 'User',
      email: 'teacher@quizit.com',
      phone: '1234567890',
      role: Role.TEACHER,
      password: await argon2.hash('admin123'), // Default password
      isEmailVerified: true,
      isActive: true,
    });

    await this.userRepo.save(teacher);
  }

  async seedStudent(): Promise<void> {
    const existingStudent = await this.userRepo.findOneBy({
      email: 'student@quizit.com',
    });
    if (existingStudent) {
      return; // Student user already exists
    }

    const teacher = this.userRepo.create({
      firstName: 'Student',
      lastName: 'User',
      email: 'student@quizit.com',
      phone: '1234567890',
      role: Role.STUDENT,
      password: await argon2.hash('admin123'), // Default password
      isEmailVerified: true,
      isActive: true,
    });

    await this.userRepo.save(teacher);
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
