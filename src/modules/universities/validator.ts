import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { UniversityService } from './university.service';

@Injectable()
@ValidatorConstraint({ name: 'isCountryValid', async: true })
export class IsCountryValidConstraint implements ValidatorConstraintInterface {
  constructor(
    @Inject(forwardRef(() => UniversityService))
    private readonly _universityService: UniversityService
  ) {}

  async validate(countries: any[], args: ValidationArguments): Promise<boolean> {
    try {
      if (!Array.isArray(countries)) return false;
      const validCountries = await this._universityService.getAllAvailableCountries();
      return countries.every((country) => validCountries.includes(country));
    } catch (err) {
      console.error('Error in IsCountryValidConstraint.validate:', err);
      throw new Error('Failed to validate country due to internal service error');
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Each country must be a valid country from the database.';
  }
}
