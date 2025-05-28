// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport'; // Used for Passport authentication
import { JwtModule } from '@nestjs/jwt'; // Used for JWT token creation/signing

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

// Import your specific strategies
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAccessTokenStrategy } from './strategies/jwt-access-token.strategy';
import { JwtRefreshTokenStrategy } from './strategies/jwt-refresh-token.strategy';

import { UsersModule } from '../users/users.module'; // Assuming UsersModule provides UserEntity directly or via export
import { UserEntity } from '@UsersModule/entities'; // Your User entity

@Module({
  imports: [
    // 1. PassportModule: Register a default strategy if you primarily use one (e.g., 'jwt-access-token')
    // This isn't strictly necessary if you always specify the strategy name in @UseGuards(),
    // but it's good practice for clarity.
    PassportModule.register({ defaultStrategy: 'jwt-access-token' }), // Or 'jwt' if your access token strategy is named 'jwt'

    // 2. TypeOrmModule: For injecting repositories (e.g., UserRepository)
    TypeOrmModule.forFeature([UserEntity]),

    // 3. JwtModule: Configure this for your ACCESS tokens.
    // It's configured async to fetch secrets and expiration from ConfigService.
    JwtModule.registerAsync({
      imports: [ConfigModule], // Make sure ConfigModule is imported here so ConfigService can be injected
      inject: [ConfigService], // Inject ConfigService to use it in useFactory
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRETKEY'),
        signOptions: { expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES') }, // Use get<string> or get<number> if it's a number
      }),
    }),

    // If you need JwtService to also sign/verify refresh tokens *within* AuthService
    // with a different secret, you might register a second JwtModule or manage secrets manually.
    // For most cases, the above JwtModule setup is sufficient for AuthService to sign both.
    // The JwtRefreshTokenStrategy will handle verification of refresh tokens.

    // 4. UsersModule: Your AuthService likely interacts with UserEntity, which is typically part of UsersModule.
    // Ensure UsersModule correctly exports UserEntity or its repository.
    UsersModule,

    // 5. ConfigModule: To make ConfigService available throughout this module.
    // It's good that you have it here. If ConfigModule is global, you might not need to import it in every module.
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy, // Provide your Local strategy
    JwtAccessTokenStrategy, // Provide your JWT Access Token strategy
    JwtRefreshTokenStrategy, // Provide your JWT Refresh Token strategy
    // You DO NOT need to list ConfigService as a provider here.
    // ConfigModule already provides it when you import ConfigModule.
    // Removing ConfigService from providers here.
  ],
  // Export AuthService if other modules need to inject it.
  // Also export PassportModule and JwtModule if their functionalities (e.g., AuthGuard('jwt-access-token'))
  // or JwtService are directly used by other modules that import AuthModule.
  exports: [
    AuthService,
    PassportModule, // Exporting PassportModule makes AuthGuard available in other modules that import AuthModule
    JwtModule, // Exporting JwtModule makes JwtService available in other modules
    // You might also export JwtAccessTokenStrategy if it's referenced directly by other modules.
    // For general use, AuthService, PassportModule, and JwtModule are common exports.
  ],
})
export class AuthModule {}
