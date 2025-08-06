import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UniEntity } from '@UniversitiesModule/entities';
import { Like, Repository } from 'typeorm';

@Injectable()
export class UniversityDataService {
  private readonly logger = new Logger(UniversityDataService.name);

  constructor(
    @InjectRepository(UniEntity)
    private uniRepository: Repository<UniEntity>
  ) {}

  /**
   * Fetches top universities based on country and a specified limit.
   * Assumes 'rank' column exists on UniEntity and lower rank is better.
   * Filters out soft-deleted universities.
   *
   * @param country The country to filter universities by (case-insensitive). Optional.
   * @param limit The maximum number of universities to return. Default is 5.
   * @returns An array of UniEntity objects.
   */
  async getTopUniversitiesByCountry(country?: string, limit = 5): Promise<UniEntity[]> {
    this.logger.log(`Attempting to fetch top ${limit} universities for country: ${country || 'All'}`);

    const qb = this.uniRepository.createQueryBuilder('uni');

    qb.andWhere('uni.isDeleted = :isDeleted', { isDeleted: false });

    if (country && country.trim() !== '') {
      qb.andWhere('LOWER(uni.country) ILIKE LOWER(:country)', { country: country.trim() });
      this.logger.debug(`Applying country filter: ${country.trim()}`);
    } else {
      this.logger.debug('No specific country filter applied.');
    }

    qb.orderBy('uni.rank', 'ASC', 'NULLS LAST');

    qb.limit(limit);

    try {
      const universities = await qb.getMany();
      this.logger.log(`Successfully found ${universities.length} universities for the query.`);
      if (universities.length > 0) {
        this.logger.debug(
          'First 5 universities retrieved for export: ' +
            JSON.stringify(
              universities.slice(0, 5).map((uni) => ({
                id: uni.id,
                university: uni.university,
                country: uni.country,
                rank: uni.rank,
                studentPopulation: uni.studentPopulation,
                website: uni.website,
              })),
              null,
              2
            )
        );
      } else {
        this.logger.debug('No universities found for the current query parameters.');
      }
      return universities;
    } catch (error) {
      this.logger.error(`Error in getTopUniversitiesByCountry: ${error.message}`, error.stack);
      throw new Error('Failed to retrieve university data from the database. Please check logs for details.');
    }
  }

  async getUniversityByName(name: string): Promise<UniEntity | null> {
    this.logger.log(`Attempting to fetch university by name: "${name}" including academic fields and subjects.`);

    try {
      const university = await this.uniRepository.findOne({
        where: {
          university: Like(`%${name.trim()}%`),
          isDeleted: false,
        },
        relations: ['academicFields', 'subjects'],
      });

      if (university) {
        this.logger.log(`Successfully found university: "${university.university}"`);

        this.logger.debug(`Loaded academic fields count: ${university.academicFields?.length || 0}`);
        this.logger.debug(`Loaded subjects count: ${university.subjects?.length || 0}`);
      } else {
        this.logger.log(`No university found for name: "${name}"`);
      }
      return university;
    } catch (error) {
      this.logger.error(`Error in getUniversityByName: ${error.message}`, error.stack);
      throw new Error('Failed to retrieve university data from the database. Please check logs for details.');
    }
  }
  // async getUniversitiesByAcademicField(field: string, limit: number = 5): Promise<UniEntity[]> {
  //   this.logger.log(`Fetching universities by academic field: ${field}`);
  //   return this.uniRepository.createQueryBuilder('uni')
  //     .leftJoin('uni.academicFields', 'academicField')
  //     .andWhere('LOWER(academicField.name) = LOWER(:field)', { field })
  //     .andWhere('uni.isDeleted = :isDeleted', { isDeleted: false })
  //     .limit(limit)
  //     .getMany();
  // }
  async getUniversitiesBySubjectAndCountry(
    subjectName?: string,
    academicFieldName?: string,
    country?: string
  ): Promise<UniEntity[]> {
    this.logger.log(
      `Attempting to fetch universities for subject: "${subjectName || 'N/A'}", academic field: "${
        academicFieldName || 'N/A'
      }", country: "${country || 'N/A'}"`
    );

    if (!subjectName && !academicFieldName) {
      this.logger.warn('Called getUniversitiesBySubjectAndCountry without a subjectName or academicFieldName.');
      return [];
    }

    const qb = this.uniRepository.createQueryBuilder('uni');

    qb.leftJoinAndSelect('uni.academicFields', 'academicField').leftJoinAndSelect('uni.subjects', 'subject');

    qb.andWhere('uni.isDeleted = :isDeleted', { isDeleted: false });

    if (country && country.trim() !== '') {
      qb.andWhere('LOWER(uni.country) ILIKE LOWER(:country)', { country: country.trim() });
      this.logger.debug(`Applying country filter: ${country.trim()}`);
    }

    if (subjectName && subjectName.trim() !== '') {
      qb.andWhere('LOWER(subject.name) ILIKE LOWER(:subjectName)', { subjectName: `%${subjectName.trim()}%` });
      this.logger.debug(`Applying subject filter: ${subjectName.trim()}`);
    }

    if (academicFieldName && academicFieldName.trim() !== '') {
      if (subjectName) {
        qb.orWhere('LOWER(academicField.name) ILIKE LOWER(:academicFieldName)', {
          academicFieldName: `%${academicFieldName.trim()}%`,
        });
      } else {
        qb.andWhere('LOWER(academicField.name) ILIKE LOWER(:academicFieldName)', {
          academicFieldName: `%${academicFieldName.trim()}%`,
        });
      }
      this.logger.debug(`Applying academic field filter: ${academicFieldName.trim()}`);
    }

    qb.orderBy('uni.rank', 'ASC', 'NULLS LAST');
    qb.limit(10);

    try {
      const universities = await qb.getMany();
      this.logger.log(`Successfully found ${universities.length} universities for the subject/country query.`);
      return universities;
    } catch (error) {
      this.logger.error(`Error in getUniversitiesBySubjectAndCountry: ${error.message}`, error.stack);
      throw new Error(
        'Failed to retrieve university data by subject/country from the database. Please check logs for details.'
      );
    }
  }
}
