// forbid-if-not-type.decorator.ts
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function ForbidIfNotType(
  targetType: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Record<string, any>, propertyName: string) {
    console.log(object);
    console.log(propertyName);
    registerDecorator({
      name: 'forbidIfNotType',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(_: any, args: ValidationArguments) {
          const obj = args.object as Record<string, any>;
          return obj['type'] === targetType || obj[propertyName] === undefined;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} is only allowed when type is "${targetType}"`;
        },
      },
    });
  };
}
