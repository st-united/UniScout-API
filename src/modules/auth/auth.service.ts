import { BadRequestException, Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { FindOptionsWhere, Repository } from 'typeorm';

import { UserEntity } from '@UsersModule/entities';
import { CredentialsDto } from './dto/credentials.dto';
import { StatusEnum, UserRole } from '@Constant/enums';
import { UserPayloadDto } from './dto/user-payload.dto';
import { JwtPayload } from '@Constant/types';
import { ResponseItem } from '@app/common/dtos';
import { TokenDto } from './dto/token.dto';
import { ConfigService } from '@nestjs/config';
import { UserDto } from '@UsersModule/dto/user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { plainToClass } from 'class-transformer';

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
    this.LOCKOUT_DURATION_MINUTES = this.configService.get<number>('LOCKOUT_DURATION_MINUTES', 1);
  }

  async register(registerDto: RegisterUserDto): Promise<ResponseItem<UserDto>> {
    const emailExisted = await this.userRepository.findOneBy({
      email: registerDto.email,
      deletedAt: null,
    } as FindOptionsWhere<UserEntity>);

    if (emailExisted) {
      throw new BadRequestException('Email Already Exist!');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      status: StatusEnum.PENDING,
      role: UserRole.USER,
    });
    await this.userRepository.save(user);

    const userDto = plainToClass(UserDto, user, { excludeExtraneousValues: true });
    return new ResponseItem(userDto, 'Account Created Successful!');
  }

  async validateUser(credentialsDto: CredentialsDto): Promise<UserPayloadDto> {
    try {
      const user = await this.userRepository.findOneBy({
        email: credentialsDto.email,
        deletedAt: null,
      } as FindOptionsWhere<UserEntity>);

      if (!user) {
        throw new UnauthorizedException('Invalid username or password.');
      }
      if (user.status === StatusEnum.BLOCKED) {
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
          const remainingTime = Math.ceil((user.lockoutUntil.getTime() - new Date().getTime()) / (1000 * 60));
          throw new UnauthorizedException(`Account locked. Please try again in ${remainingTime} minutes.`);
        } else {
          user.status = StatusEnum.ACTIVE;
          user.failedLoginAttempts = 0;
          user.lockoutUntil = null;
          await this.userRepository.save(user);
        }
      }

      if (user.status !== StatusEnum.ACTIVE && user.status !== StatusEnum.PENDING) {
        throw new UnauthorizedException('Account is not active. Please contact support.');
      }

      const comparePassword = await bcrypt.compare(credentialsDto.password, user.password);

      if (!comparePassword) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

        if (user.failedLoginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
          user.lockoutUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);
          user.failedLoginAttempts = 0;
          user.status = StatusEnum.BLOCKED;
          await this.userRepository.save(user);
          throw new UnauthorizedException(
            `Invalid username or password. Account locked for ${this.LOCKOUT_DURATION_MINUTES} minutes due to multiple failed attempts.`
          );
        } else {
          await this.userRepository.save(user);
          throw new UnauthorizedException('Invalid username or password.');
        }
      }
      if (user.status === StatusEnum.PENDING) {
        user.status = StatusEnum.ACTIVE;
      }

      user.failedLoginAttempts = 0;
      user.lockoutUntil = null;
      await this.userRepository.save(user);

      const userPayload = plainToClass(UserPayloadDto, user, { excludeExtraneousValues: true });
      return userPayload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
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

    const data: TokenDto = {
      name: userPayloadDto.name,
      accessToken,
      refreshToken,
    };

    return new ResponseItem(data, 'Log In Successful!');
  }

  async logout(userId: number): Promise<ResponseItem<string | null>> {
    try {
      const user = await this.userRepository.findOneBy({ id: userId } as FindOptionsWhere<UserEntity>);

      if (!user) {
        throw new BadRequestException('User not found.');
      }
      if (user.refreshToken === null) {
        throw new BadRequestException('User is already logged out.');
      }
      const updateResult = await this.userRepository.update(userId, { refreshToken: null });

      if (updateResult.affected === 0) {
        throw new InternalServerErrorException('Logout failed due to an unexpected database issue.');
      }

      return new ResponseItem(null, 'Logged Out Succesful!');
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Logout failed. Please try again.');
    }
  }

  async refreshToken(token: string): Promise<ResponseItem<TokenDto>> {
    const user = await this.userRepository.findOneBy({
      refreshToken: token,
      status: StatusEnum.ACTIVE,
      deletedAt: null,
    } as FindOptionsWhere<UserEntity>);

    if (!user) throw new UnauthorizedException('Incorrect Account!');

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const data: TokenDto = {
      accessToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRETKEY'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES'),
      }),
    };

    return new ResponseItem(data, 'Refresh Token Successful!');
  }
}
