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
  validate(options: CreateOptionDto[]) {
    if (!Array.isArray(options)) return false;

    const texts = options.map((opt) => opt.optionText?.trim().toLowerCase());
    const unique = new Set(texts);
    return unique.size === texts.length;
  }

  defaultMessage(args: ValidationArguments) {
    return `The property '${args.property}' in '${args.targetName}' must have unique option texts.`;
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
