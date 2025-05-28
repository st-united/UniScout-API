import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { University } from './entities/university.entity';
import { CreateUniversityDto } from './dto/create-university.dto';

@Injectable()
export class UniversitiesService {
  constructor(
    @InjectRepository(University)
    private universityRepo: Repository<University>
  ) {}

  async create(createDto: CreateUniversityDto) {
    const university = this.universityRepo.create(createDto);
    return this.universityRepo.save(university);
  }

  async findAll() {
    return this.universityRepo.find();
  }
}
