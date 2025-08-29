import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateBy,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

// Custom validator to check if toDate is after fromDate
function IsAfterDate(property: string, validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isAfterDate',
      constraints: [property],
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedPropertyName] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          return (
            value instanceof Date &&
            relatedValue instanceof Date &&
            value > relatedValue
          );
        },
        defaultMessage(): string {
          return 'To date must be after from date';
        },
      },
    },
    validationOptions,
  );
}

export class CreateNoticeDto {
  @ApiProperty({
    description: 'Title of the notice',
    example: 'Important Announcement',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Content of the notice',
    example: 'This is an important announcement for all students and teachers.',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Start date for the notice visibility',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  fromDate: Date;

  @ApiProperty({
    description: 'End date for the notice visibility',
    example: '2024-02-15',
    type: 'string',
    format: 'date',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  @IsAfterDate('fromDate')
  toDate: Date;
}
