import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { EntityManager } from 'typeorm';
import { IsUniqeInterface } from '../decorators/is-unique.decorator';

@ValidatorConstraint({ name: 'Exists', async: true })
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

    // database query check data is exists
    const dataExist = await this.entityManager
      .getRepository(tableName)
      .createQueryBuilder(tableName)
      .where({ [column]: value })
      .getExists();

    return !dataExist;
  }
  defaultMessage(validationArguments?: ValidationArguments): string {
    // return custom field message
    const field: string = validationArguments?.property || 'Field';
    return `${field} is already exist`;
  }
}
