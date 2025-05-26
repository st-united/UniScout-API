import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { UserEntity } from '@UsersModule/entities';
import { CredentialsDto } from './dto/credentials.dto';
import { StatusEnum } from '@Constant/enums';
import { UserPayloadDto } from './dto/user-payload.dto';
import { JwtPayload } from '@Constant/types';
import { ResponseItem } from '@app/common/dtos';
import { TokenDto } from './dto/token.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>
  ) {}

  async validateUser(credentialsDto: CredentialsDto): Promise<UserPayloadDto> {
    const user = await this.userRepository.findOneBy({
      email: credentialsDto.email,
      status: StatusEnum.ACTIVE,
      deletedBy: null,
    });

    if (!user) throw new UnauthorizedException('Tài khoản không đúng');

    const comparePassword = await bcrypt.compareSync(credentialsDto.password, user.password);
    if (!comparePassword) throw new UnauthorizedException('Tài khoản không đúng');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  async login(userPayloadDto: UserPayloadDto): Promise<ResponseItem<TokenDto>> {
    const payload: JwtPayload = { sub: userPayloadDto.id, email: userPayloadDto.email };

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

    return new ResponseItem(data, 'Đăng nhập thành công');
  }

  async logout(userId: string) {
    const logout = await this.userRepository.update(userId, { refreshToken: null });
    if (!logout) {
      throw new BadRequestException('Đăng xuất không thành công');
    }

    return new ResponseItem('', 'Đăng xuất thành công');
  }

  async refreshToken(token: string): Promise<ResponseItem<TokenDto>> {
    const user = await this.userRepository.findOneBy({
      refreshToken: token,
      status: StatusEnum.ACTIVE,
      deletedBy: null,
    });

    if (!user) throw new UnauthorizedException('Tài khoản không đúng');
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const data = {
      accessToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRETKEY'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES'),
      }),
    };

    return new ResponseItem(data, 'Làm mới token thành công');
  }
}
