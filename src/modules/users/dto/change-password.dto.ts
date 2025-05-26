import { Expose } from 'class-transformer';
import { IsNotEmpty, Matches, Validate } from 'class-validator';

import { MatchPassword } from '@app/validations';
import { PASSWORD_REGEX_PATTERN } from '@Constant/regex';

export class ChangePasswordDto {
  @Expose()
  @IsNotEmpty()
  oldPassword: string;

  @Expose()
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX_PATTERN, {
    message:
      'New password must be at least 8 characters, with numbers, lowercase letters, uppercase letters and special characters',
  })
  newPassword: string;

  @Expose()
  @Validate(MatchPassword, ['newPassword'])
  confirmPassword: string;
}
