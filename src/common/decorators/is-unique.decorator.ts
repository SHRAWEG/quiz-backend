import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsUniqueConstraint } from '../validators/is-unique.validator';

export interface IsUniqeInterface {
  tableName: string;
  column: string;
}

export function IsUnique(
  tableName: string,
  column: string,
  validationOptions?: ValidationOptions,
) {
  return (object: Record<string, any>, propertyName: string) => {
    registerDecorator({
      name: 'IsUnique',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [{ tableName, column }],
      validator: IsUniqueConstraint,
    });
  };
}
