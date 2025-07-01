import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { UniversityService } from './university.service';
import { DataSource, EntityTarget, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUniversityDto } from './dto/create-university.dto';
import { SubjectEntity } from './entities/subject.entity';
import { AcademicFieldEntity } from './entities/academic-field.entity';

@Injectable()
@ValidatorConstraint({ name: 'isCountryValid', async: true })
export class IsCountryValidConstraint implements ValidatorConstraintInterface {
  constructor(
    @Inject(forwardRef(() => UniversityService))
    private readonly _universityService: UniversityService
  ) {}

  async validate(country: string, args: ValidationArguments): Promise<boolean> {
    try {
      const validCountries = await this._universityService.getAllAvailableCountries();
      return validCountries.includes(country);
    } catch (err) {
      console.error('Error in IsCountryValidConstraint.validate:', err);
      throw new Error('Failed to validate country due to internal service error');
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Each country must be a valid country from the database.';
  }
}

@Injectable()
@ValidatorConstraint({ async: true })
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private dataSource: DataSource) {}

  async validate(value: any, args: ValidationArguments) {
    const [entityClass, property] = args.constraints;
    const repository = this.dataSource.getRepository(entityClass as EntityTarget<any>);

    const exists = await repository.findOne({ where: { [property]: value } });
    return !exists;
  }

  defaultMessage(args: ValidationArguments) {
    const [entityClass, property] = args.constraints;
    return `${property} "${args.value}" already exists.`;
  }
}

export function IsUnique(entity: EntityTarget<any>, validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entity, propertyName],
      validator: IsUniqueConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'IsSubjectValid', async: true })
@Injectable()
export class IsSubjectValid implements ValidatorConstraintInterface {
  constructor(
    @InjectRepository(AcademicFieldEntity)
    private academicFieldRepo: Repository<AcademicFieldEntity>,
    @InjectRepository(SubjectEntity)
    private subjectRepo: Repository<SubjectEntity>
  ) {}

  async validate(value: string[], args: ValidationArguments) {
    const { academicFields } = args.object as CreateUniversityDto;
    const subjectNames = value;

    if (!academicFields || academicFields.length === 0) {
      return true;
    }

    if (!subjectNames || subjectNames.length === 0) {
      return false;
    }

    const selectedAcademicFields = await this.academicFieldRepo.find({
      where: { name: In(academicFields) },
      relations: ['subjects'],
    });

    const existingAcademicFieldNames = new Set(selectedAcademicFields.map((field) => field.name));
    for (const fieldName of academicFields) {
      if (!existingAcademicFieldNames.has(fieldName)) {
        return false;
      }
    }

    const selectedSubjectsWithFields = await this.subjectRepo.find({
      where: { name: In(subjectNames) },
      relations: ['academicField'],
    });

    const existingSubjectNames = new Set(selectedSubjectsWithFields.map((subject) => subject.name));
    for (const subName of subjectNames) {
      if (!existingSubjectNames.has(subName)) {
        return false;
      }
    }

    const selectedAcademicFieldNamesSet = new Set<string>(academicFields);
    const providedSubjectNamesSet = new Set<string>(subjectNames);

    for (const academicField of selectedAcademicFields) {
      const subjectsInThisField = academicField.subjects.map((sub) => sub.name);

      const hasAssociatedSubject = subjectsInThisField.some((subName) => providedSubjectNamesSet.has(subName));

      if (!hasAssociatedSubject) {
        return false;
      }
    }

    for (const subject of selectedSubjectsWithFields) {
      const subjectAcademicFieldName = subject.academicField?.name;
      if (!subjectAcademicFieldName || !selectedAcademicFieldNamesSet.has(subjectAcademicFieldName)) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const { academicFields, subjects } = args.object as CreateUniversityDto;
    if (!academicFields || academicFields.length === 0) {
      return 'Academic fields must be selected to choose subjects.';
    }
    if (!subjects || subjects.length === 0) {
      return 'Subjects must be selected if academic fields are chosen.';
    }
    return `Selected subjects do not match the academic fields, some academic fields lack associated subjects, or some provided names do not exist.`;
  }
}
