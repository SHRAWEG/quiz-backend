import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreateOptionDto } from 'src/modules/options/dto/create-option.dto';

@ValidatorConstraint({ async: false })
export class OnlyOneCorrectOptionConstraint
  implements ValidatorConstraintInterface
{
  validate(options: CreateOptionDto[]) {
    if (!Array.isArray(options)) return false;
    const correctCount = options.filter((opt) => opt.isCorrect === true).length;
    return correctCount === 1;
  }

  defaultMessage(args: ValidationArguments) {
    return `The property '${args.property}' in '${args.targetName}' must have exactly one option marked as correct.`;
  }
}

export function OnlyOneCorrectOption(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: OnlyOneCorrectOptionConstraint,
    });
  };
}
