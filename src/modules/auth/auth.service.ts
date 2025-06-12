import { BadRequestException, Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';

import { UserEntity } from '@UsersModule/entities';
import { CredentialsDto } from './dto/credentials.dto';
import { StatusEnum } from '@Constant/enums';
import { UserRole } from '@Constant/enums';
import { UserPayloadDto } from './dto/user-payload.dto';
import { JwtPayload } from '@Constant/types';
import { ResponseItem } from '@app/common/dtos';
import { TokenDto } from './dto/token.dto';
import { ConfigService } from '@nestjs/config';
import { UserDto } from '@UsersModule/dto/user.dto';
import { RegisterUserDto } from './dto/register-user.dto';

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS: number;
  private readonly LOCKOUT_DURATION_MINUTES: number;
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>
  ) {
    this.MAX_LOGIN_ATTEMPTS = this.configService.get<number>('MAX_LOGIN_ATTEMPTS', 3);
    this.LOCKOUT_DURATION_MINUTES = this.configService.get<number>('LOCKOUT_DURATION_MINUTES', 15);
  }

  async register(registerDto: RegisterUserDto): Promise<ResponseItem<UserDto>> {
    const emailExisted = await this.userRepository.findOneBy({
      email: registerDto.email,
      deletedAt: null, // Important: check for non-deleted users
    });
    if (emailExisted) {
      throw new BadRequestException('Email Already Exist!');
    }
    const user = await this.userRepository.create(registerDto);
    await this.userRepository.save(user);
    return new ResponseItem(user, 'Account Created Successful!');
  }
  async validateUser(credentialsDto: CredentialsDto): Promise<UserPayloadDto> {
    try {
      const user = await this.userRepository.findOneBy({
        email: credentialsDto.email,
        deletedAt: null, // Ensure not a soft-deleted user
      });

      // 1. Check if user exists and is active
      if (!user || user.status !== StatusEnum.ACTIVE) {
        // Increment attempts for unknown/inactive user attempts as well to prevent enumeration attacks
        // However, we can't lock out a non-existent user.
        // For security, always return the same generic message.
        throw new UnauthorizedException('Invalid username or password.');
      }

      // 2. Check for account lockout
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        const remainingTime = Math.ceil((user.lockoutUntil.getTime() - new Date().getTime()) / (1000 * 60));
        throw new UnauthorizedException(`Account locked. Please try again in ${remainingTime} minutes.`);
      }

      // 3. Compare password
      const comparePassword = await bcrypt.compare(credentialsDto.password, user.password); // Use await with bcrypt.compare

      if (!comparePassword) {
        // Incorrect password: Increment failed attempts
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

        if (user.failedLoginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
          // Lock the account
          user.lockoutUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);
          user.failedLoginAttempts = 0; // Reset for next lockout period if needed
          await this.userRepository.save(user); // Save lockout state
          throw new UnauthorizedException(
            `Invalid username or password. Account locked for ${this.LOCKOUT_DURATION_MINUTES} minutes due to multiple failed attempts.`
          );
        } else {
          await this.userRepository.save(user); // Save incremented attempts
          throw new UnauthorizedException('Invalid username or password.');
        }
      }

      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
      await this.userRepository.save(user);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Login validation error:', error);
      throw new InternalServerErrorException('Login failed due to server error. Please try again later.');
    }
  }

  async login(userPayloadDto: UserPayloadDto): Promise<ResponseItem<TokenDto>> {
    const payload: JwtPayload = { sub: userPayloadDto.id, email: userPayloadDto.email, role: userPayloadDto.role };

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRETKEY'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES'),
    });
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRETKEY'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES'),
    });

    await this.userRepository.update(userPayloadDto.id, { refreshToken });

    const data = {
      name: userPayloadDto.name,
      accessToken,
      refreshToken,
    };

    return new ResponseItem(data, 'Log In Successful!');
  }
  async logout(userId: string): Promise<ResponseItem<string | null>> {
    try {
      console.log(`Attempting logout for userId: ${userId}`);
      const numericUserId = parseInt(userId, 10); // Use parseInt with radix 10 for safety

      // 1. Find the user to check their current refreshToken status
      const user = await this.userRepository.findOneBy({ id: numericUserId });

      if (!user) {
        console.log(`User with ID ${userId} not found.`);
        throw new BadRequestException('User not found.'); // Or 'Session already expired.'
      }

      // 2. Check if the user is already logged out (refreshToken is null)
      if (user.refreshToken === null) {
        console.log(`User with ID ${userId} is already logged out.`);
        throw new BadRequestException('User is already logged out.');
      }

      // 3. If refreshToken exists, proceed with nullifying it
      // Use the numericUserId here as well for the update operation
      const updateResult = await this.userRepository.update(numericUserId, { refreshToken: null });
      console.log('TypeORM Update Result:', updateResult);
      console.log('Affected rows:', updateResult.affected);

      if (updateResult.affected === 0) {
        console.log('Update reported 0 affected rows even though refreshToken was not null. Investigate DB behavior.');
        throw new InternalServerErrorException('Logout failed due to an unexpected database issue.');
      }

      console.log('Logout successful, refreshToken nullified.');
      return new ResponseItem(null, 'Logged Out Succesful!');
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Logout failed due to a server error:', error);
      throw new InternalServerErrorException('Logout failed. Please try again.');
    }
  }

  async refreshToken(token: string): Promise<ResponseItem<TokenDto>> {
    const user = await this.userRepository.findOneBy({
      refreshToken: token,
      status: StatusEnum.ACTIVE,
      deletedBy: null,
    });

    if (!user) throw new UnauthorizedException('Incorrect Account!');
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const data = {
      accessToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRETKEY'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES'),
      }),
    };

    return new ResponseItem(data, 'Refresh Token Successful!');
  }
}
