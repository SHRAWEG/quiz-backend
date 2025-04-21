import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreateOptionDto } from 'src/modules/options/dto/create-option.dto';

@ValidatorConstraint({ async: false })
export class UniqueOptionsTextConstraint
  implements ValidatorConstraintInterface
{
  validate(options: CreateOptionDto[], args: ValidationArguments) {
    console.log('ARGS : ', args);
    if (!Array.isArray(options)) return false;

    const texts = options.map((opt) => opt.option?.trim().toLowerCase());
    const unique = new Set(texts);
    return unique.size === texts.length;
  }

  defaultMessage(args: ValidationArguments) {
    console.log('ARGS : ', args);
    return `Option texts must be unique`;
  }
}

export function UniqueOptionsText(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: UniqueOptionsTextConstraint,
    });
  };
}
