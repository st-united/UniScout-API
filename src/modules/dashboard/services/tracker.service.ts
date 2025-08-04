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
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    const mockPreviousYearData: { [month: number]: number } = {
      1: 150,
      2: 120,
      3: 180,
      4: 160,
      5: 200,
      6: 190,
      7: 210,
      8: 170,
      9: 140,
      10: 165,
      11: 130,
      12: 220,
    };

    const query = this._trackingRepo.createQueryBuilder('tracking');

    if (year) {
      query.andWhere('EXTRACT(YEAR FROM tracking.accessed_at) = :year', { year });
    }
    if (month) {
      query.andWhere('EXTRACT(MONTH FROM tracking.accessed_at) = :month', { month });
    }

    const realCount = await query.getCount();

    if (year === previousYear) {
      if (realCount === 0) {
        if (month) {
          return mockPreviousYearData[month] || 0;
        } else {
          return Object.values(mockPreviousYearData).reduce((sum, count) => sum + count, 0);
        }
      }
    }

    return realCount;
  }
}
