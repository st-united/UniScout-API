import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { plainToClass } from 'class-transformer';
import * as fs from 'fs';
import { Not, Repository } from 'typeorm';

import { PageMetaDto, ResponseItem, ResponsePaginate } from '@app/common/dtos';
import { convertPath } from '@app/common/utils';
import { StatusEnum } from '@Constant/enums';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '@UsersModule/dto/create-user.dto';
import { GetUsersDto } from '@UsersModule/dto/get-users.dto';
import { UpdateUserDto } from '@UsersModule/dto/update-user.dto';
import { UserEntity } from '@UsersModule/entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileDto } from './dto/profile.dto';
import { UserDto } from './dto/user.dto';
import { avtPathName, baseImageUrl } from '@Constant/url';

@Injectable()
export class UsersService {
  constructor(
    private readonly configService: ConfigService,

    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {}

  async create(avatar, params: CreateUserDto): Promise<ResponseItem<UserDto>> {
    const emailExisted = await this.userRepository.findOneBy({
      email: params.email,
      deletedAt: null,
    });
    if (emailExisted) throw new BadRequestException('Email đã tồn tại');

    const identityIdExisted = await this.userRepository.findOneBy({
      identityId: params.identityId,
      deletedAt: null,
    });
    if (identityIdExisted) {
      throw new BadRequestException('CMND/CCCD đã tồn tại');
    }

    const existPhone = await this.userRepository.findOneBy({
      phone: params.phone,
      deletedAt: null,
    });
    if (existPhone) throw new BadRequestException('Số điện thoại đã tồn tại');

    if (avatar) {
      params = { ...params, avatar: avtPathName('users', avatar.filename) };
    } else {
      params = { ...params, avatar: null };
    }

    const userParams = this.userRepository.create(params);
    const user = await this.userRepository.save(userParams);

    return new ResponseItem(user, 'Tạo mới dữ liệu thành công');
  }

  async resetPassword(id: number): Promise<ResponseItem<UserDto>> {
    const user = await this.userRepository.findOneBy({ id, deletedAt: null });
    if (!user) {
      throw new BadRequestException('Nhân viên không tồn tại');
    }
    const newPassword = await bcrypt.hash(this.configService.get<string>('RESET_PASSWORD'), 10);

    await this.userRepository.update(id, {
      ...user,
      password: newPassword,
    });

    const response = await this.userRepository.findOneBy({ id, deletedAt: null });

    const result = {
      ...response,
      password: this.configService.get<string>('RESET_PASSWORD'),
    };

    return new ResponseItem(result, 'Đặt lại mật khẩu thành công');
  }

  async changePassword(id: number, data: ChangePasswordDto): Promise<ResponseItem<UserDto>> {
    const user = await this.userRepository.findOneBy({ id, deletedAt: null });
    if (!user || !bcrypt.compareSync(data.oldPassword, user.password)) {
      throw new BadRequestException('Mật khẩu cũ không chính xác');
    }

    const password = await bcrypt.hash(data.newPassword, 10);
    await this.userRepository.update(id, { password });

    return new ResponseItem(user, 'Thay đổi mật khẩu thành công');
  }

  async getUsers(params: GetUsersDto): Promise<ResponsePaginate<UserDto>> {
    const users = this.userRepository
      .createQueryBuilder('users')
      .where('users.status = ANY(:status)', {
        status: params.status ? [params.status] : [StatusEnum.ACTIVE, StatusEnum.INACTIVE],
      })
      .andWhere('unaccent(LOWER(users.name)) LIKE unaccent(LOWER(:name))', {
        name: `%${params.search ?? ''}%`,
      })
      .orderBy(`users.${params.orderBy}`, params.order)
      .skip(params.skip)
      .take(params.take);

    const [result, total] = await users.getManyAndCount();

    const pageMetaDto = new PageMetaDto({ itemCount: total, pageOptionsDto: params });

    return new ResponsePaginate(result, pageMetaDto, 'Thành công');
  }

  async getUser(id: number): Promise<ResponseItem<UserDto>> {
    const user = await this.userRepository.findOne({
      where: {
        id,
      },
      relations: ['role', 'permissions'],
    });
    if (!user) throw new BadRequestException('Nhân viên không tồn tại');

    return new ResponseItem(
      { ...user, avatar: user.avatar ? baseImageUrl + convertPath(user.avatar) : null },
      'Thành công'
    );
  }

  async getProfile(id: number): Promise<ResponseItem<ProfileDto>> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    const result = plainToClass(
      ProfileDto,
      { ...user, avatar: user.avatar ? baseImageUrl + convertPath(user.avatar) : null },
      { excludeExtraneousValues: true }
    );

    return new ResponseItem(result, 'Thành công');
  }

  async updateProfile(id: number, updateUserDto: UpdateUserDto): Promise<ResponseItem<UserDto>> {
    const user = await this.userRepository.findOneBy({ id, deletedAt: null });
    if (!user) {
      throw new BadRequestException('Thông tin cá nhân không tồn tại');
    }

    const identityIdExisted = await this.userRepository.findOneBy({
      identityId: updateUserDto.identityId,
      id: Not(id),
      deletedAt: null,
    });
    if (identityIdExisted) {
      throw new BadRequestException('CMND/CCCD đã tồn tại');
    }

    const phoneExisted = await this.userRepository.findOneBy({
      phone: updateUserDto.phone,
      id: Not(id),
      deletedAt: null,
    });
    if (phoneExisted) {
      throw new BadRequestException('Số điện thoại đã tồn tại');
    }

    await this.userRepository.update(id, {
      ...user,
      ...plainToClass(UpdateUserDto, updateUserDto, { excludeExtraneousValues: true }),
    });

    const result = await this.userRepository.findOneBy({ id, deletedAt: null });

    return new ResponseItem(result, 'Cập nhật dữ liệu thành công');
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<ResponseItem<UserDto>> {
    const user = await this.userRepository.findOneBy({ id, deletedAt: null });
    if (!user) {
      throw new BadRequestException('Nhân viên không tồn tại');
    }

    const emailExisted = await this.userRepository.findOneBy({
      email: updateUserDto.email,
      id: Not(id),
      deletedAt: null,
    });
    if (emailExisted) throw new BadRequestException('Email đã tồn tại');

    const identityIdExisted = await this.userRepository.findOneBy({
      identityId: updateUserDto.identityId,
      id: Not(id),
      deletedAt: null,
    });
    if (identityIdExisted) {
      throw new BadRequestException('CMND/CCCD đã tồn tại');
    }

    const phoneExisted = await this.userRepository.findOneBy({
      phone: updateUserDto.phone,
      id: Not(id),
      deletedAt: null,
    });
    if (phoneExisted) {
      throw new BadRequestException('Số điện thoại đã tồn tại');
    }

    const identityExisted = await this.userRepository.findOneBy({
      identityId: updateUserDto.identityId,
      id: Not(id),
      deletedAt: null,
    });
    if (identityExisted) {
      throw new BadRequestException('CMND/CCCD đã tồn tại');
    }

    await this.userRepository.update(id, {
      ...user,
      ...plainToClass(UpdateUserDto, updateUserDto, { excludeExtraneousValues: true }),
    });

    const result = await this.userRepository.findOneBy({ id, deletedAt: null });

    return new ResponseItem(result, 'Cập nhật dữ liệu thành công');
  }

  async deleteUser(id: number): Promise<ResponseItem<null>> {
    const user = await this.userRepository.findOneBy({ id, deletedAt: null });
    if (!user) throw new BadRequestException('Người dùng không tồn tại');
    if (user.status === StatusEnum.ACTIVE) throw new BadRequestException('Không được xóa nhân viên đang hoạt động');

    await this.userRepository.softDelete(id);

    return new ResponseItem(null, 'Xóa nhân viên thành công');
  }

  async uploadAvatar(identityId: string, file: Express.Multer.File): Promise<ResponseItem<any>> {
    const user = await this.userRepository.findOneBy({ identityId, deletedAt: null });

    if (!user) {
      throw new BadRequestException('Nhân viên không tồn tại');
    }

    await this.userRepository
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        avatar: avtPathName('users', file.filename),
      })
      .where('identityId = :identityId', { identityId })
      .execute();

    if (fs.existsSync(user.avatar)) {
      fs.unlinkSync(user.avatar);
    }

    return new ResponseItem(null, 'Cập nhật thông tin thành công');
  }

  async removeAvatar(identityId: string): Promise<ResponseItem<any>> {
    const user = await this.userRepository.findOneBy({ identityId, deletedAt: null });

    if (!user) {
      throw new BadRequestException('Nhân viên không tồn tại');
    }

    await this.userRepository
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        avatar: null,
      })
      .where('identityId = :identityId', { identityId })
      .execute();

    if (fs.existsSync(user.avatar)) {
      fs.unlinkSync(user.avatar);
    }

    return new ResponseItem(null, 'Xóa ảnh đại diện thành công');
  }
}
