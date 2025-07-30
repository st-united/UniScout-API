// src/chatbot/university-data.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UniEntity } from '@UniversitiesModule/entities';
import { Like, Repository } from 'typeorm';
// !! IMPORTANT: Adjust this path if your UniEntity is located elsewhere !!

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

    // Always filter out soft-deleted universities
    qb.andWhere('uni.isDeleted = :isDeleted', { isDeleted: false });

    // Apply country filter if provided and not an empty string
    if (country && country.trim() !== '') {
      // Using ILIKE for case-insensitive country matching
      qb.andWhere('LOWER(uni.country) ILIKE LOWER(:country)', { country: country.trim() });
      this.logger.debug(`Applying country filter: ${country.trim()}`);
    } else {
      this.logger.debug('No specific country filter applied.');
    }

    // Order by rank (ASC for top universities, assuming lower rank is better)
    // NULLS LAST ensures universities without a rank appear after ranked ones.
    qb.orderBy('uni.rank', 'ASC', 'NULLS LAST');

    // Apply limit to the number of results
    qb.limit(limit);

    try {
      const universities = await qb.getMany();
      this.logger.log(`Successfully found ${universities.length} universities for the query.`);
      return universities;
    } catch (error) {
      this.logger.error(`Error in getTopUniversitiesByCountry: ${error.message}`, error.stack);
      throw new Error('Failed to retrieve university data from the database. Please check logs for details.');
    }
  }

  // You can add more specific data retrieval methods here as needed for future chatbot capabilities.
  // For example:
  async getUniversityByName(name: string): Promise<UniEntity | null> {
    this.logger.log(`Attempting to fetch university by name: "${name}" including academic fields and subjects.`);

    try {
      const university = await this.uniRepository.findOne({
        where: {
          // Using ILIKE for case-insensitive partial matching
          // Adjust this if you need an exact match: university: name.trim(),
          university: Like(`%${name.trim()}%`),
          isDeleted: false, // Ensure it's not soft-deleted
        },
        relations: ['academicFields', 'subjects'], // <--- ADDED THIS LINE
      });

      if (university) {
        this.logger.log(`Successfully found university: "${university.university}"`);
        // Log loaded relations for debugging
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
      return []; // Must have at least one filter
    }

    const qb = this.uniRepository.createQueryBuilder('uni');

    // Eagerly load relations for comprehensive results
    qb.leftJoinAndSelect('uni.academicFields', 'academicField').leftJoinAndSelect('uni.subjects', 'subject');

    // Always filter out soft-deleted universities
    qb.andWhere('uni.isDeleted = :isDeleted', { isDeleted: false });

    // Apply country filter if provided
    if (country && country.trim() !== '') {
      qb.andWhere('LOWER(uni.country) ILIKE LOWER(:country)', { country: country.trim() });
      this.logger.debug(`Applying country filter: ${country.trim()}`);
    }

    // Apply subject name filter if provided
    if (subjectName && subjectName.trim() !== '') {
      // Check if the subject name exists in the university's subjects
      qb.andWhere('LOWER(subject.name) ILIKE LOWER(:subjectName)', { subjectName: `%${subjectName.trim()}%` });
      this.logger.debug(`Applying subject filter: ${subjectName.trim()}`);
    }

    // Apply academic field name filter if provided
    // This will act as an OR with subjectName if both are present, or standalone
    if (academicFieldName && academicFieldName.trim() !== '') {
      // Check if the academic field name exists in the university's academic fields
      // Use OR to combine with subjectName if subjectName is also present
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

    // Optional: Add ordering, e.g., by rank, if desired
    qb.orderBy('uni.rank', 'ASC', 'NULLS LAST');
    qb.limit(10); // Limit results to a reasonable number

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
