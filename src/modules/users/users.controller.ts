import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { ResponseItem, ResponsePaginate } from '@app/common/dtos';
import { fileOption } from '@app/config/image-multer-config';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetUsersDto } from '@UsersModule/dto/get-users.dto';
import { UpdateUserDto } from '@UsersModule/dto/update-user.dto';
import { UsersService } from '@UsersModule/users.service';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileDto } from './dto/profile.dto';
import { UserDto } from './dto/user.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@AuthModule/guards/roles.guard';
import { Roles } from '@AuthModule/decorators/roles.decorator';
import { UserRole } from '@Constant/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UserListResponseDto } from './dto/user-list-response.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('users')
@UseGuards(JwtAccessTokenGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPER)
  @UseInterceptors(FileInterceptor('avatar', fileOption('users')))
  async create(
    @UploadedFile()
    avatar: Express.Multer.File,
    @Body() createUserDto: CreateUserDto
  ): Promise<ResponseItem<UserDto>> {
    if (!avatar && createUserDto.containFile === 'true') {
      throw new BadRequestException('Hình ảnh không hợp lệ');
    }
    return await this.usersService.create(avatar, createUserDto);
  }

  @Patch('reset-password/:id')
  async resetPassword(@Param('id', ParseIntPipe) id: number): Promise<ResponseItem<UserDto>> {
    return await this.usersService.resetPassword(id);
  }

  @Post('change-password')
  async changePassword(@Req() req, @Body() changePasswordDto: ChangePasswordDto): Promise<ResponseItem<UserDto>> {
    return await this.usersService.changePassword(req.user.userId, changePasswordDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER)
  async getUsers(@Query() getUsersDto: GetUsersDto): Promise<ResponsePaginate<UserListResponseDto>> {
    return await this.usersService.getUsers(getUsersDto);
  }
  @Get('me')
  async getProfile(@Req() req): Promise<ResponseItem<ProfileDto>> {
    return await this.usersService.getProfile(req.user.userId);
  }

  // @Patch('profile')
  // async updateProfile(@Req() req, @Body() updateUserDto: UpdateUserDto): Promise<ResponseItem<UserDto>> {
  //   return await this.usersService.updateProfile(req.user.userId, updateUserDto);
  // }

  @Delete(':id')
  async deleteUser(@Param('id', ParseIntPipe) id: number): Promise<ResponseItem<null>> {
    return await this.usersService.deleteUser(id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER)
  @ApiOperation({ summary: 'Get details of a single user by ID (SUPER/ADMIN only)' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully', type: UserDto })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., user not found)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Insufficient role)' })
  async getUser(@Param('id', ParseIntPipe) id: number): Promise<ResponseItem<UserDto>> {
    return await this.usersService.getUser(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER)
  @ApiOperation({ summary: 'Update a user by ID (SUPER only - restricted fields)' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Insufficient role)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<ResponseItem<UserDto>> {
    return await this.usersService.update(id, updateUserDto);
  }

  @Post('avatar/:identityId')
  @UseInterceptors(FileInterceptor('avatar', fileOption('users')))
  async uploadAvatar(
    @Param('identityId', ParseIntPipe) identityId: number,
    @UploadedFile()
    avatar: Express.Multer.File
  ): Promise<ResponseItem<any>> {
    if (avatar) {
      return await this.usersService.uploadAvatar(identityId, avatar);
    }
    throw new BadRequestException('Hình ảnh không hợp lệ');
  }

  @Patch('avatar/:identityId')
  async removeAvatar(@Param('identityId', ParseIntPipe) identityId: number): Promise<ResponseItem<any>> {
    return await this.usersService.removeAvatar(identityId);
  }
}
