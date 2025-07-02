import { Controller, Get, Param, Query } from '@nestjs/common';
import { FieldsService } from './fields.service';
import { ResponseArray } from '@app/common/dtos';
import { AcademicFieldEntity } from '../universities/entities/academic-field.entity';
import { SubjectEntity } from '../universities/entities/subject.entity';

@Controller('fields')
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Get('broad')
  async getBroadFields(): Promise<ResponseArray<AcademicFieldEntity>> {
    return this.fieldsService.findAllBroadFields();
  }

  @Get('specific-by-broad-fields')
  async getSpecificSubjectsByBroadFieldNames(
    @Query('broadFieldNames') broadFieldNames: string | string[]
  ): Promise<ResponseArray<SubjectEntity>> {
    const broadFieldNamesArray = Array.isArray(broadFieldNames) ? broadFieldNames : [broadFieldNames]; // If it's a single string, wrap it in an array

    return this.fieldsService.findSpecificSubjectsByBroadFieldNames(broadFieldNamesArray);
  }

  @Get('specific')
  async getAllSpecificFields(): Promise<ResponseArray<SubjectEntity>> {
    return this.fieldsService.findAllSubjects();
  }
}
