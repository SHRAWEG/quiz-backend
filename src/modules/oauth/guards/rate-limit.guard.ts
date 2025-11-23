import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private store: RateLimitStore = {};
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    // Default: 100 requests per 15 minutes
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canActivate(context: ExecutionContext): boolean {
    const httpRequest = context.switchToHttp().getRequest<{
      ip?: string;
      connection?: { remoteAddress?: string };
      path?: string;
    }>();
    const key = this.getKey(httpRequest);

    const now = Date.now();
    const record = this.store[key];

    if (!record || now > record.resetTime) {
      // Create or reset the record
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return true;
    }

    if (record.count >= this.maxRequests) {
      throw new HttpException(
        `Rate limit exceeded. Maximum ${this.maxRequests} requests per ${this.windowMs / 1000 / 60} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }

  private getKey(request: {
    ip?: string;
    connection?: { remoteAddress?: string };
    path?: string;
  }): string {
    // Use IP address and endpoint as key
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const path = request.path || 'unknown';
    return `${ip}:${path}`;
  }

  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }
}
