import { ValidationOptions, registerDecorator } from 'class-validator';
import { EntityTarget } from 'typeorm';
import { IdExistsConstraint } from '../validators/id-exists.validator';

export function IdExists<E>(
  entity: EntityTarget<E>,
  validationOptions?: ValidationOptions,
) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions, // This allows custom messages
      constraints: [entity],
      validator: IdExistsConstraint,
    });
  };
}
