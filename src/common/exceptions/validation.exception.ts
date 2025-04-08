import { BadRequestException } from '@nestjs/common';

export interface ValidationError {
  [key: string]: string[];
}

export class ValidationException extends BadRequestException {
  private validationErrors: ValidationError;

  constructor(validationErrors: ValidationError, message?: string) {
    super({
      message: message ?? 'Validation failed due to errors',
      errors: validationErrors,
    });
    this.validationErrors = validationErrors;
  }

  getValidationErrors(): ValidationError {
    return this.validationErrors;
  }
}
