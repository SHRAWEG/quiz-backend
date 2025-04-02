import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export const AuthUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        'User information not found in request. Authentication may be missing or invalid.',
      );
    }

    if (data) {
      return user[data]; // Return specific property from payload
    }

    return user; // Otherwise, return the whole payload
  },
);
