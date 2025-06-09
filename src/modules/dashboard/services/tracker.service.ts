import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackingEntity } from '../entities/tracker.entity';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(TrackingEntity)
    private readonly _trackingRepo: Repository<TrackingEntity>
  ) {}

  async incrementCountryTraffic(country: string) {
    const record = await this._trackingRepo.findOne({ where: { country } });

    if (record) {
      record.count += 1;
      await this._trackingRepo.save(record);
    } else {
      await this._trackingRepo.save({ country, count: 1 });
    }
  }

  async getTrafficByCountry() {
    return this._trackingRepo.find({ order: { count: 'DESC' } });
  }
}
