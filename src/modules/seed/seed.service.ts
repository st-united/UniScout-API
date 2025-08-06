import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
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
      // --- Seed SUPER User ---
      const superUserEmail = 'superadmin@gmail.com';
      const existingSuperUser = await this.userRepository.findOneBy({
        email: superUserEmail,
        deletedAt: null,
      } as FindOptionsWhere<UserEntity>);

      if (!existingSuperUser) {
        this.logger.log(`Seeding initial SUPER user: ${superUserEmail}`);
        const plainTextPassword = this.configService.get<string>('RESET_PASSWORD') || 'password';

        const newSuperUser = this.userRepository.create({
          email: superUserEmail,
          password: plainTextPassword,
          name: 'Super Administrator',
          role: UserRole.SUPER,
          status: StatusEnum.ACTIVE,
          phone: '1234567890',
          job: 'Business Development',
          avatar: null,
          dateOfBirth: null,
          address: null,
          refreshToken: null,
          failedLoginAttempts: 0,
          lockoutUntil: null,
        });
        await this.userRepository.save(newSuperUser);
        this.logger.log('SUPER user seeded successfully!');
      } else {
        this.logger.log(`SUPER user '${superUserEmail}' already exists. Skipping seed.`);
      }

      const adminUserEmail = 'admin@gmail.com';
      const existingAdminUser = await this.userRepository.findOneBy({
        email: adminUserEmail,
        deletedAt: null,
      } as FindOptionsWhere<UserEntity>);

      if (!existingAdminUser) {
        this.logger.log(`Seeding initial ADMIN user: ${adminUserEmail}`);
        const plainTextPassword = this.configService.get<string>('RESET_PASSWORD') || 'password';

        const newAdminUser = this.userRepository.create({
          email: adminUserEmail,
          password: plainTextPassword,
          name: 'Regular Administrator',
          role: UserRole.ADMIN,
          status: StatusEnum.ACTIVE,
          phone: '0987654321',
          job: 'Business Development',
          avatar: null,
          dateOfBirth: null,
          address: null,
          refreshToken: null,
          failedLoginAttempts: 0,
          lockoutUntil: null,
        });
        await this.userRepository.save(newAdminUser);
        this.logger.log('ADMIN user seeded successfully!');
      } else {
        this.logger.log(`ADMIN user '${adminUserEmail}' already exists. Skipping seed.`);
      }
    } catch (error) {
      this.logger.error('Error seeding initial users:', error.message, error.stack);
    }
  }
}
