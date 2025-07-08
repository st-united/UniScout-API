import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UniEntity, SubjectEntity, AcademicFieldEntity } from './entities';
import * as fs from 'fs';
import * as Papa from 'papaparse';

@Injectable()
export class CsvImport {
  private readonly _logger = new Logger(CsvImport.name);

  constructor(
    @InjectRepository(UniEntity) private uniRepo: Repository<UniEntity>,
    @InjectRepository(SubjectEntity) private subjectRepo: Repository<SubjectEntity>,
    @InjectRepository(AcademicFieldEntity) private academicFieldRepo: Repository<AcademicFieldEntity>
  ) {}

  async importUniCsv(filePath: string): Promise<void> {
    const csvData = fs.readFileSync(filePath, 'utf8');

    this._logger.log(`\nImporting universities from: ${filePath}`);
    const results = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (header: string) => header.trim().toLowerCase(),
        complete: resolve,
        error: reject,
      });
    });

    const records = results.data;
    const totalRecords = records.length;

    const academicFieldHeadersInCsv = [
      'agricultural_veterinary_sciences',
      'arts_design',
      'business_management_law',
      'education_training',
      'engineering_technology',
      'health_medicine',
      'humanities_languages',
      'ict',
      'natural_sciences',
      'social_behavioral_sciences',
      'services',
      'transport_safety_security_military',
    ];

    const academicFieldEntities: AcademicFieldEntity[] = [];
    for (const name of academicFieldHeadersInCsv) {
      let field = await this.academicFieldRepo.findOne({ where: { name } });
      if (!field) {
        field = this.academicFieldRepo.create({ name });
        await this.academicFieldRepo.save(field);
      }
      academicFieldEntities.push(field);
    }
    const academicFieldMap = new Map<string, AcademicFieldEntity>(
      academicFieldEntities.map((field) => [field.name, field])
    );

    for (let i = 0; i < totalRecords; i++) {
      const record = records[i];
      const uniAcademicFields: AcademicFieldEntity[] = [];
      const subjectsToLinkToUni: SubjectEntity[] = [];

      for (const fieldName of academicFieldHeadersInCsv) {
        const recordValue = record[fieldName];

        if (
          recordValue &&
          typeof recordValue === 'string' &&
          recordValue.trim() !== '' &&
          recordValue.trim().toLowerCase() !== 'na'
        ) {
          const academicField = academicFieldMap.get(fieldName);
          if (academicField) {
            uniAcademicFields.push(academicField);

            const rawSubjectNames = recordValue.split(',').map((s: string) => s.trim());

            const validSubjectNames = rawSubjectNames.filter(
              (name: string) => name !== '' && name.toLowerCase() !== 'na'
            );

            if (validSubjectNames.length > 0) {
              try {
                const foundSubjects = await this.subjectRepo.find({
                  where: {
                    name: In(validSubjectNames),
                    academicField: { id: academicField.id },
                  },
                });

                foundSubjects.forEach((subject) => {
                  if (!subjectsToLinkToUni.some((s) => s.id === subject.id)) {
                    subjectsToLinkToUni.push(subject);
                  }
                });
              } catch (error) {
                this._logger.error(
                  `Error fetching subjects for academic field ${academicField.name}: ${error.message}`
                );
              }
            }
          } else {
            this._logger.warn(
              `Academic field header '${fieldName}' from CSV not found in academicFieldMap for university '${record.university}'. Check CSV headers and academicFieldHeadersInCsv array.`
            );
          }
        }
      }

      const entity = this.uniRepo.create({
        university: record.university?.toString().trim() || null,
        abbreviation: record.abbreviation?.toString().trim() || null,
        latitude: this.parseNumber(record.latitude),
        longitude: this.parseNumber(record.longitude),
        logo: record.logo?.toString().trim() || null,
        rank: this.parseNumber(record.rank),
        type: record.type?.toString().trim() || null,
        country: record.country?.toString().trim() || null,
        location: record.location?.toString().trim() || null,
        studentPopulation: this.parseNumber(record.studentpopulation),
        year: this.parseNumber(record.year),
        contact: this.parseContact(record.contact),
        email: this.parseStringOrNull(record.email),
        website: record.website?.toString().trim() || null,
        strength: record.strength?.toString().trim() || null,
        description: record.description?.toString().trim() || null,
        exchange: this.parseBoolean(record.exchange),
        academicFields: uniAcademicFields,
        subjects: subjectsToLinkToUni,
      });

      if (entity.university) {
        const existingUni = await this.uniRepo.findOne({
          where: { university: entity.university },
          relations: ['academicFields', 'subjects'],
        });

        if (existingUni) {
          existingUni.abbreviation = entity.abbreviation;
          existingUni.latitude = entity.latitude;
          existingUni.longitude = entity.longitude;
          existingUni.logo = entity.logo;
          existingUni.rank = entity.rank;
          existingUni.type = entity.type;
          existingUni.country = entity.country;
          existingUni.location = entity.location;
          existingUni.studentPopulation = entity.studentPopulation;
          existingUni.year = entity.year;
          existingUni.contact = entity.contact;
          existingUni.email = entity.email;
          existingUni.website = entity.website;
          existingUni.strength = entity.strength;
          existingUni.description = entity.description;
          existingUni.exchange = entity.exchange;
          existingUni.academicFields = uniAcademicFields;
          existingUni.subjects = subjectsToLinkToUni;
          await this.uniRepo.save(existingUni);
          this._logger.log(`Updated university record ${i + 1}/${totalRecords}: ${entity.university}`);
        } else {
          await this.uniRepo.save(entity);
          this._logger.log(`Inserted university record ${i + 1}/${totalRecords}: ${entity.university}`);
        }
      } else {
        this._logger.warn(`Skipping university record ${i + 1} due to missing university name.`);
      }
    }

    const totalCount = await this.uniRepo.count();
    this._logger.log(`University import completed! Total records: ${totalCount}`);
  }

  async importSubjectsCsv(filePath: string): Promise<void> {
    const csvData = fs.readFileSync(filePath, 'utf8');

    this._logger.log(`\nImporting subjects from: ${filePath}`);
    const results = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
      Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (header: string) => header.trim().toLowerCase(),
        complete: resolve,
        error: reject,
      });
    });

    const records = results.data;
    const headers = results.meta.fields || [];
    const totalRecords = records.length;
    let subjectsImported = 0;

    const allAcademicFieldNamesFromSubjectsCsv = headers.filter((header) => header.trim() !== '');
    const academicFieldEntities: AcademicFieldEntity[] = [];
    for (const name of allAcademicFieldNamesFromSubjectsCsv) {
      let field = await this.academicFieldRepo.findOne({ where: { name } });
      if (!field) {
        field = this.academicFieldRepo.create({ name });
        await this.academicFieldRepo.save(field);
      }
      academicFieldEntities.push(field);
    }
    const academicFieldMap = new Map<string, AcademicFieldEntity>(
      academicFieldEntities.map((field) => [field.name, field])
    );

    for (let i = 0; i < totalRecords; i++) {
      const record = records[i];
      for (const header of headers) {
        const subjectName = record[header];
        if (
          subjectName &&
          typeof subjectName === 'string' &&
          subjectName.trim() !== '' &&
          subjectName.trim().toLowerCase() !== 'na'
        ) {
          const academicField = academicFieldMap.get(header.trim());
          if (!academicField) {
            this._logger.warn(
              `Academic field "${header.trim()}" not found for subject "${subjectName.trim()}", skipping.`
            );
            continue;
          }
          const entity: Partial<SubjectEntity> = {
            name: subjectName.trim(),
            academicField: academicField,
          };
          try {
            await this.subjectRepo.upsert(entity, ['name']);
            subjectsImported++;
            this._logger.log(`Processed subject: ${entity.name} (${academicField.name})`);
          } catch (error) {
            this._logger.error(`Failed to upsert subject ${entity.name}: ${error.message}`);
          }
        }
      }
    }

    const totalCount = await this.subjectRepo.count();
    this._logger.log(
      `Subject import completed! Total subjects imported in this run: ${subjectsImported}. Total subjects in database: ${totalCount}`
    );
  }

  private parseNumber(value: any): number | null {
    if (value === null || value === undefined || value === '' || value === 'NA') {
      return null;
    }
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? null : parsed;
  }

  private parseBoolean(value: any): boolean | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const stringValue = value.toString().toLowerCase().trim();
    return stringValue === 'true' || stringValue === '1'
      ? true
      : stringValue === 'false' || stringValue === '0'
      ? false
      : null;
  }

  private parseContact(value: any): string | null {
    const str = value?.toString().trim();
    if (!str || str.toLowerCase() === 'na') {
      return null;
    }
    return str;
  }

  private parseStringOrNull(value: any): string | null {
    const str = value?.toString().trim();
    if (!str || str.toLowerCase() === 'na') {
      return null;
    }
    return str;
  }
}
