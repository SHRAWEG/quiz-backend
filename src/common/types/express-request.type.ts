import { JwtPayload } from '../interfaces/jwt-payload.interface'; // Import your JwtPayload

declare module 'express' {
  interface Request {
    tenantId: string | null;
    user: JwtPayload | null;
  }
}

export {};
