import { ValidationError as ClassValidationError } from 'class-validator';
import { ValidationError } from 'src/common/exceptions/validation.exception';

export function formatClassValidatorErrors(
  errors: ClassValidationError[],
): ValidationError {
  const formattedErrors: ValidationError = {};
  function processErrors(
    currentErrors: ClassValidationError[],
    parentProperty?: string,
  ) {
    for (const error of currentErrors) {
      const property = parentProperty
        ? `${parentProperty}.${error.property}`
        : error.property;
      const constraints = error.constraints;
      const children = error.children;

      if (constraints) {
        if (!formattedErrors[property]) {
          formattedErrors[property] = [];
        }
        Object.keys(constraints).forEach((constraintKey) => {
          formattedErrors[property].push(constraints[constraintKey]);
        });
      }

      if (children && children.length > 0) {
        processErrors(children, property); // Recursively process children
      }
    }
  }

  processErrors(errors);
  return formattedErrors;

  // for (const error of errors) {
  //   const property = error.property;
  //   const constraints = error.constraints;

  //   if (!formattedErrors[property]) {
  //     formattedErrors[property] = [];
  //   }

  //   if (constraints) {
  //     Object.keys(constraints).forEach((constraintKey) => {
  //       formattedErrors[property].push(constraints[constraintKey]);
  //     });
  //   }
  // }

  // return formattedErrors;
  // const newFormattedErrors: ValidationError = {
  //   test: [JSON.stringify(errors)],
  // };

  // return newFormattedErrors;
}
