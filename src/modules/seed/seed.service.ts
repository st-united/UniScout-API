import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { StatusEnum, UserRole } from '@Constant/enums';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly configService: ConfigService
  ) {}

  async onApplicationBootstrap() {
    await this.seedUsers();
  }

  private async seedUsers(): Promise<void> {
    try {
      const superUserEmail = 'superadmin@gmail.com';
      const existingUser = await this.userRepository.findOneBy({
        email: superUserEmail,
      });

      if (!existingUser) {
        this.logger.log(`Seeding initial SUPER user: ${superUserEmail}`);
        const plainTextPassword = this.configService.get<string>('RESET_PASSWORD') || 'password';

        const newUser = this.userRepository.create({
          email: superUserEmail,
          password: plainTextPassword,
          name: 'Super Administrator',
          role: UserRole.SUPER,
          status: StatusEnum.ACTIVE,
          phone: '1234567890',
          identityId: '1',
          avatar: null,
          dateOfBirth: null,
          address: null,
          refreshToken: null,
          failedLoginAttempts: 0,
          lockoutUntil: null,
        });
        await this.userRepository.save(newUser);
        this.logger.log('SUPER user seeded successfully!');
      } else {
        this.logger.log(`SUPER user '${superUserEmail}' already exists. Skipping seed.`);
      }
    } catch (error) {
      this.logger.error('Error seeding initial user:', error.message);
    }
  }
}
