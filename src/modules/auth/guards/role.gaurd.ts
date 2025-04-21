// src/common/guards/roles.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from 'src/common/decorators/role.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      // No role restrictions, allow access
      return true;
    }

    console.log('Required Roles:', requiredRoles); // DEBUG
    const request = context.switchToHttp().getRequest<Request>();
    const { user } = request;
    console.log('User:', user); // DEBUG

    if (!user) {
      console.log('RolesGuard: user is undefined');
      throw new ForbiddenException('No user found');
    }

    console.log('RolesGuard: user.role =', user.role);
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
