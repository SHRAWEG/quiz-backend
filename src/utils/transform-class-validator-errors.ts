import { ValidationError as ClassValidationError } from 'class-validator';
import { ValidationError } from 'src/common/exceptions/validation.exception';

export function formatClassValidatorErrors(
  errors: ClassValidationError[],
): ValidationError {
  const formattedErrors: ValidationError = {};

  console.log('TRYING TO FORMAT');

  for (const error of errors) {
    const property = error.property;
    const constraints = error.constraints;

    if (!formattedErrors[property]) {
      formattedErrors[property] = [];
    }

    if (constraints) {
      Object.keys(constraints).forEach((constraintKey) => {
        formattedErrors[property].push(constraints[constraintKey]);
      });
    }
  }

  return formattedErrors;
  const newFormattedErrors: ValidationError = {
    test: [JSON.stringify(errors)],
  };

  return newFormattedErrors;
}
