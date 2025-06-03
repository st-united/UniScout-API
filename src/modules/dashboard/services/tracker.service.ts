import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackingEntity } from '../entities/tracker.entity';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(TrackingEntity)
    private readonly trackingRepo: Repository<TrackingEntity>
  ) {}

  async incrementCountryTraffic(country: string) {
    const record = await this.trackingRepo.findOne({ where: { country } });

    if (record) {
      record.count += 1;
      await this.trackingRepo.save(record);
    } else {
      await this.trackingRepo.save({ country, count: 1 });
    }
  }

  async getTrafficByCountry() {
    return this.trackingRepo.find({ order: { count: 'DESC' } });
  }
}
