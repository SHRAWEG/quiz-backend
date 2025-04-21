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
  validate(options: CreateOptionDto[], args?: ValidationArguments) {
    console.log('ARGS : ', args);
    if (!Array.isArray(options)) return false;
    const correctCount = options.filter((opt) => opt.isCorrect === true).length;
    return correctCount === 1;
  }

  defaultMessage(args: ValidationArguments) {
    console.log('ARGS : ', args);
    return `Exactly one option must be marked as correct`;
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
