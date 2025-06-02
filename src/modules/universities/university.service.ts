import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UniEntity } from './entities/uni.entity';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { CountryEnum, GetUniversityDto } from './dto/get-university.dto';

@Injectable()
export class UniversityService {
  private readonly logger = new Logger(UniversityService.name);

  constructor(
    @InjectRepository(UniEntity)
    private readonly uniRepository: Repository<UniEntity>
  ) {}

  async create(createDto: CreateUniversityDto & { logo: string }): Promise<UniEntity> {
    try {
      const uni = this.uniRepository.create(createDto);
      return await this.uniRepository.save(uni);
    } catch (error) {
      this.logger.error(`Failed to create university: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create university');
    }
  }

  async findAll(query?: GetUniversityDto): Promise<UniEntity[]> {
    try {
      const qb = this.uniRepository.createQueryBuilder('uni');

      if (query?.country) {
        qb.andWhere('uni.country = :country', { country: query.country });
      }

      if (query?.search) {
        qb.andWhere('LOWER(uni.university) LIKE :search', { search: `%${query.search.toLowerCase()}%` });
      }

      const page = query?.page || 1;
      const limit = query?.limit || 10;

      qb.skip((page - 1) * limit).take(limit);

      return await qb.getMany();
    } catch (error) {
      this.logger.error(`Error fetching universities: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to fetch universities: ${error.message}`);
    }
  }

  async getUniversity(country: CountryEnum, id: number): Promise<UniEntity> {
    try {
      const university = await this.uniRepository.findOne({
        where: { id, country },
      });

      if (!university) {
        throw new NotFoundException(`University with ID ${id} not found in ${country}`);
      }

      return university;
    } catch (error) {
      this.logger.error(`Error fetching university: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;

      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async findUniversityByNameAndCountry(name: string, country: string): Promise<UniEntity | null> {
    try {
      return await this.uniRepository
        .createQueryBuilder('uni')
        .where('uni.country = :country', { country })
        .andWhere('similarity(uni.university, :name) > 0.3', { name })
        .orderBy('similarity(uni.university, :name)', 'DESC')
        .getOne();
    } catch (error) {
      this.logger.error(`Search error: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Database search error: ${error.message}`);
    }
  }

  async updateUniversity(country: CountryEnum, id: number, dto: UpdateUniversityDto): Promise<UniEntity | null> {
    try {
      const existing = await this.uniRepository.findOne({ where: { id, country } });

      if (!existing) {
        return null;
      }

      await this.uniRepository.update({ id, country }, dto);
      return this.uniRepository.findOne({ where: { id, country } });
    } catch (error) {
      this.logger.error(`Error updating university: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async deleteUniversity(country: CountryEnum, id: number): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Deletion attempt: University ID=${id}, Country=${country}`);

    try {
      const university = await this.uniRepository.findOne({ where: { id, country } });

      if (!university) {
        this.logger.warn(`Deletion failed: University not found. ID=${id}, Country=${country}`);
        return { success: false, message: 'University not found.' };
      }

      const result = await this.uniRepository.delete({ id, country });

      if (result.affected && result.affected > 0) {
        this.logger.log(`University deleted: ID=${id}, Country=${country}`);
        return { success: true, message: 'Successfully deleted university.' };
      } else {
        this.logger.warn(`Deletion failed (unknown reason). ID=${id}, Country=${country}`);
        return { success: false, message: 'Deletion failed.' };
      }
    } catch (error) {
      this.logger.error(`Delete error for University ID=${id}, Country=${country}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }
}
