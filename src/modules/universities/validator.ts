import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { UniversityService } from './university.service';
import { DataSource, EntityTarget } from 'typeorm';

@Injectable()
@ValidatorConstraint({ name: 'isCountryValid', async: true })
export class IsCountryValidConstraint implements ValidatorConstraintInterface {
  constructor(
    @Inject(forwardRef(() => UniversityService))
    private readonly _universityService: UniversityService
  ) {}

  async validate(countries: string | string[], args: ValidationArguments): Promise<boolean> {
    try {
      const validCountries = await this._universityService.getAllAvailableCountries();

      const countriesToValidate = Array.isArray(countries) ? countries : [countries];

      const allValid = countriesToValidate.every((country) => validCountries.includes(country));

      return allValid;
    } catch (err) {
      throw new Error('Failed to validate country due to internal service error');
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Each country must be a valid country from the database.';
  }
}

@Injectable()
@ValidatorConstraint({ async: true })
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private dataSource: DataSource) {}

  async validate(value: any, args: ValidationArguments) {
    const [entityClass, property] = args.constraints;
    const repository = this.dataSource.getRepository(entityClass as EntityTarget<any>);

    const exists = await repository.findOne({ where: { [property]: value } });
    return !exists;
  }

  defaultMessage(args: ValidationArguments) {
    const [entityClass, property] = args.constraints;
    return `${property} "${args.value}" already exists.`;
  }
}

export function IsUnique(entity: EntityTarget<any>, validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entity, propertyName],
      validator: IsUniqueConstraint,
    });
  };
}
