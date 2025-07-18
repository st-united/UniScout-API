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

  async logWebsiteAccess() {
    await this._trackingRepo.save({ accessed_at: new Date() });
  }

  async getTotalWebsiteAccesses() {
    return this._trackingRepo.count();
  }

  async getWebsiteAccessesByMonthAndYear(month?: number, year?: number) {
    const query = this._trackingRepo.createQueryBuilder('tracking');

    if (year) {
      query.andWhere('EXTRACT(YEAR FROM tracking.accessed_at) = :year', { year });
    }
    if (month) {
      query.andWhere('EXTRACT(MONTH FROM tracking.accessed_at) = :month', { month });
    }

    return query.getCount();
  }
}
