import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AcademicFieldEntity } from '../universities/entities/academic-field.entity';
import { SubjectEntity } from '../universities/entities/subject.entity';
import { ResponseArray } from '@app/common/dtos';

@Injectable()
export class FieldsService {
  private readonly _logger = new Logger(FieldsService.name);

  constructor(
    @InjectRepository(AcademicFieldEntity)
    private readonly academicFieldRepo: Repository<AcademicFieldEntity>,
    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>
  ) {}

  async findAllBroadFields(): Promise<ResponseArray<AcademicFieldEntity>> {
    this._logger.log('Fetching all broad academic fields.');
    const fields = await this.academicFieldRepo.find();
    return new ResponseArray(fields, 'Broad fields fetched successfully.');
  }

  async findSpecificSubjectsByBroadFieldNames(broadFieldNames: string[]): Promise<ResponseArray<SubjectEntity>> {
    if (!broadFieldNames || broadFieldNames.length === 0) {
      return new ResponseArray([], 'No broad field names provided.', 0);
    }

    this._logger.log(`Fetching specific subjects for broad field names: ${broadFieldNames.join(', ')}`);

    const broadFields = await this.academicFieldRepo.find({
      where: { name: In(broadFieldNames) },
    });

    if (broadFields.length === 0) {
      this._logger.warn(`No matching broad academic fields found for names: ${broadFieldNames.join(', ')}.`);
      throw new NotFoundException(`No matching broad academic fields found for names: ${broadFieldNames.join(', ')}.`);
    }
    const broadFieldIds = broadFields.map((field) => field.id);

    const specificSubjects = await this.subjectRepo.find({
      where: { academicFieldId: In(broadFieldIds) },
      relations: ['academicField'],
      order: { name: 'ASC' },
    });

    return new ResponseArray(specificSubjects, `Specific subjects for provided broad fields fetched successfully.`);
  }

  async findAllSubjects(): Promise<ResponseArray<SubjectEntity>> {
    this._logger.log('Fetching all subjects.');
    const subjects = await this.subjectRepo.find({
      relations: ['academicField'],
      order: { name: 'ASC' },
    });
    return new ResponseArray(subjects, 'All subjects fetched successfully.');
  }
}
