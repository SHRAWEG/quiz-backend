import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { EntityManager } from 'typeorm';
import { IsUniqeInterface } from '../decorators/is-unique.decorator';

@ValidatorConstraint({ name: 'IsUnique', async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private readonly entityManager: EntityManager) {}

  async validate(
    value: string | number,
    args?: ValidationArguments,
  ): Promise<boolean> {
    if (!args?.constraints?.length) return false;

    // catch options from decorator
    const { tableName, column }: IsUniqeInterface = args
      .constraints[0] as IsUniqeInterface;

    if (!tableName || !column) {
      throw new Error('tableName and column must be provided');
    }

    // database query check if data exists
    const count = await this.entityManager
      .getRepository(tableName)
      .createQueryBuilder(tableName)
      .where({ [column]: value })
      .getCount();

    return count === 0; // If count is 0, the value is unique
  }
  defaultMessage(validationArguments?: ValidationArguments): string {
    const field: string = validationArguments?.property || 'Field';
    return `${field} is already taken`;
  }
}
