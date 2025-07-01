import { TypeOrmModule } from '@nestjs/typeorm';
import 'dotenv/config';
import { Seeder, seeder } from 'nestjs-seeder';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { UserEntity } from '@UsersModule/entities';
import { DatabaseModule } from './config/database.module';
import { UserRole } from '@Constant/enums';

@Injectable()
export class SuperUserSeeder implements Seeder {
  constructor(@InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>) {}
  drop(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  async seed(): Promise<any> {
    const defaultSuperUserEmail = 'super@gmail.com';
    const defaultSuperUserPassword = 'password';

    const existingUser = await this.userRepository.findOne({
      where: { email: defaultSuperUserEmail },
    });

    if (existingUser) {
      console.log(`User with email ${defaultSuperUserEmail} already exists. Skipping super user creation.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(defaultSuperUserPassword, 10);

    const superUser = this.userRepository.create({
      email: defaultSuperUserEmail,
      password: hashedPassword,
      role: UserRole.SUPER,
    });

    await this.userRepository.save(superUser);
    console.log(`Super user ${defaultSuperUserEmail} created successfully.`);
  }
}

seeder({
  imports: [DatabaseModule, TypeOrmModule.forFeature([UserEntity])],
}).run([SuperUserSeeder]);
