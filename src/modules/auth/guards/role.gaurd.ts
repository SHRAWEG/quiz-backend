import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // To access JWT secret
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express'; // Import the Express Request type
import { Role } from 'src/common/enums/roles.enum';
import { User } from 'src/modules/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User & { sub: string } }>(); // Add sub to the user type
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token missing in the request');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        token,
        {
          secret: this.configService.get<string>('JWT_SECRET'), // Make sure you have JWT_SECRET in your .env file
        },
      );

      // Assuming your JWT payload contains the user ID (e.g., sub)
      const userId = payload.sub;

      if (!userId) {
        throw new UnauthorizedException('Invalid JWT payload');
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Attach the user object to the request for further use in controllers/services
      request.user = { ...user, sub: userId };

      const userHasRequiredRole = requiredRoles.some(
        (role) => user.role === role,
      );

      if (!userHasRequiredRole) {
        throw new ForbiddenException(
          'You do not have the necessary permissions.',
        );
      }

      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization; // Express uses .authorization directly
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
