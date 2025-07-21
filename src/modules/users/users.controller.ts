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
import { Job, StatusEnum, UserRole } from '@Constant/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UserListResponseDto } from './dto/user-list-response.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@Controller('users')
@UseGuards(JwtAccessTokenGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('job-roles')
  @ApiOperation({ summary: 'Get predefined job roles for dropdown lists (Marketing, Business Development)' })
  @ApiResponse({ status: 200, description: 'Job roles retrieved successfully', type: [String] })
  // @UseGuards(JwtAccessTokenGuard) // Uncomment if you want to protect this endpoint
  // @Roles(UserRole.ADMIN, UserRole.SUPER, UserRole.USER) // Adjust roles as needed
  getJobRolesForDropdown(): string[] {
    return this.usersService.getJobDropdownOptions();
  }

  @Get('all-job-roles')
  @ApiOperation({ summary: 'Get all available job roles from the enum' })
  @ApiResponse({ status: 200, description: 'All job roles retrieved successfully', type: [String] })
  getAllJobRoles(): string[] {
    return this.usersService.getAllJobRoles();
  }

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
  @Get('status')
  @ApiOperation({ summary: 'Get all available user statuses for dropdown lists' })
  @ApiResponse({ status: 200, description: 'User statuses retrieved successfully', type: [String] })
  // @UseGuards(JwtAccessTokenGuard) // Uncomment if you want to protect this endpoint
  // @Roles(UserRole.ADMIN, UserRole.SUPER, UserRole.USER) // Adjust roles as needed
  getAllUserStatusesForDropdown(): string[] {
    return this.usersService.getAllUserStatuses();
  }
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER)
  @ApiOperation({ summary: 'Get a paginated and filterable list of users (SUPER only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    type: String,
    description: 'Field to order by (e.g., createdAt, name)',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Order direction (ASC or DESC)',
    type: String, // FIXED: Changed type: [] to type: String
  })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name, email, or phone' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String, // Keep as String for single enum value as per your DTO
    enum: StatusEnum,
    description: 'Filter by user status (e.g., ACTIVE, PENDING)',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    isArray: true,
    schema: {
      type: 'array',
      items: {
        type: 'string',
        enum: Object.values(UserRole),
      },
    },
    description: 'Filter by user role (can be multiple)',
  })
  @ApiQuery({
    name: 'job',
    required: false,
    // type: [String], // <--- REMOVE THIS LINE
    isArray: true, // <--- ADD THIS LINE
    schema: {
      // <--- ADD THIS BLOCK
      type: 'array',
      items: {
        type: 'string',
        enum: Object.values(Job), // Use Object.values to get string values from enum
      },
    },
    description: 'Filter by user job (can be multiple)',
  })
  @ApiQuery({
    name: 'createdAtStart',
    required: false,
    type: String,
    description: 'Filter by creation date from (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'createdAtEnd',
    required: false,
    type: String,
    description: 'Filter by creation date to (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully', type: UserListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Insufficient role)' })
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
