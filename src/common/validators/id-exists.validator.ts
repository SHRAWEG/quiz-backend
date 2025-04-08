import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { EntityManager, EntityTarget } from 'typeorm';

@Injectable()
@ValidatorConstraint({ name: 'idExists', async: true })
export class IdExistsConstraint implements ValidatorConstraintInterface {
  constructor(private readonly entityManager: EntityManager) {}

  async validate(value: unknown, args?: ValidationArguments): Promise<boolean> {
    const entityTarget = args?.constraints?.[0] as EntityTarget<object>;
    if (!entityTarget) {
      throw new Error(
        'You must specify the entity (class) to check against as a constraint.',
      );
    }

    if (typeof value === 'undefined' || value === null) {
      return true; // Allow optional foreign keys to be null
    }

    try {
      const entityExists = await this.entityManager.findOne(entityTarget, {
        where: { id: value },
      });
      console.log('entityExists:', entityExists);
      console.log('entityExists:', entityExists);
      console.log('entityExists:', entityExists);
      return !!entityExists;
    } catch (error) {
      const entityName =
        typeof entityTarget === 'function' ? entityTarget.name : 'Entity';
      console.error(
        `Error checking existence in ${entityName} using EntityManager:`,
        error,
      );
      return false;
    }
  }
  defaultMessage(args?: ValidationArguments): string {
    const entityTarget = args?.constraints?.[0] as EntityTarget<unknown>;
    const property = args?.property;
    const entityName =
      typeof entityTarget === 'function' ? entityTarget.name : 'Entity';
    return `${property} must be a valid ID in the ${entityName} table.`;
  }
}
