import { Injectable } from '@nestjs/common';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { UniversityService } from '@UniversitiesModule/university.service';

@Injectable()
@ValidatorConstraint({ name: 'isCountryValid', async: true })
export class IsCountryValidConstraint implements ValidatorConstraintInterface {
  constructor(private readonly universityService: UniversityService) {}

  async validate(countries: any[], args: ValidationArguments): Promise<boolean> {
    if (!Array.isArray(countries)) return false;

    const validCountries = await this.universityService.getValidCountries();

    return countries.every((country) => validCountries.includes(country));
  }

  defaultMessage(args: ValidationArguments): string {
    return `Each country must be a valid country from the database.`;
  }
}
