import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { SubjectsService } from 'src/modules/subjects/subjects.service';

@ValidatorConstraint({ name: 'subjectExists', async: true })
@Injectable()
export class SubjectExistsValidator implements ValidatorConstraintInterface {
  constructor(private readonly subjectsService: SubjectsService) {}

  async validate(subjectId: string): Promise<boolean> {
    if (!subjectId) return false;

    const subject = await this.subjectsService.findOne(subjectId);
    return !!subject;
  }

  defaultMessage() {
    return 'Subject with this ID does not exist';
  }
}

export function SubjectExists(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: SubjectExistsValidator,
    });
  };
}
