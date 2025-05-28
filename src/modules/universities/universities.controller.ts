import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards, // Import UseGuards for applying guards
} from '@nestjs/common';

import { UniversitiesService } from './universities.service';
import { CreateUniversityDto } from './dto/create-university.dto';

// --- Authorization Imports ---
// 1. Your custom JWT Access Token Guard (make sure the path is correct)
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard'; // <-- Changed '../../' to '../'
// 2. Your custom Roles Guard (make sure the path is correct)
import { RolesGuard } from '../../common/guards/roles.guard';
// 3. Your custom Roles decorator (make sure the path is correct)
import { Roles } from '../../common/decorators/roles.decorator';
// 4. Your UserRole enum (make sure the path is correct)
import { UserRole } from '../../common/constants/enums';
// 5. Your custom CurrentUser decorator (make sure the path is correct)
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
// 6. Your User entity (make sure the path is correct and it matches what's used in JwtStrategy)
import { UserEntity } from '@UsersModule/entities';

@Controller('universities')
export class UniversitiesController {
  constructor(private readonly universitiesService: UniversitiesService) {}

  @Post()
  // Apply guards: First, authenticate with JWT, then authorize with roles.
  @UseGuards(JwtAccessTokenGuard, RolesGuard)

  // Define which roles are allowed to access this endpoint.
  // Only users with the UserRole.ADMIN role will be allowed.
  @Roles(UserRole.ADMIN)
  async create(
    @Body() dto: CreateUniversityDto, // Extract the request body data
    @CurrentUser() user: UserEntity // Inject the authenticated user object into the handler
  ) {
    // This console log will only execute if the user is authenticated AND has the ADMIN role
    console.log(`Authenticated User ID: ${user.id}, Role: ${user.role}`);

    // Call your service method
    // Your UniversitiesService.create method should now only expect the DTO
    return this.universitiesService.create(dto);
  }

  @Get()
  findAll() {
    return this.universitiesService.findAll();
  }
}
