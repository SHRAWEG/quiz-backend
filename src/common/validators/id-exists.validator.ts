import { Injectable } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { EntityManager, EntityTarget, In } from 'typeorm';

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

    if (value === null || typeof value === 'undefined') {
      return true; // Allow optional values
    }

    try {
      if (Array.isArray(value)) {
        if (value.length === 0) return true;

        const found = await this.entityManager.findBy(entityTarget, {
          id: In(value),
        });
        return found.length === value.length;
      } else {
        const entityExists = await this.entityManager.findOne(entityTarget, {
          where: { id: value },
        });
        return !!entityExists;
      }
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
    return `${property} must contain valid ID(s) from the ${entityName} table.`;
  }
}
