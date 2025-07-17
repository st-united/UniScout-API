import {
  Controller,
  Get,
  Query,
  HttpStatus,
  HttpException,
  Param,
  ParseIntPipe,
  Body,
  Patch,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { GetContactSubmissionsDto } from './dto/get-contact.dto';
import { RequestTypeEnum } from '@Constant/enums';
import { ContactSubmissionEntity, SubmissionStatusEnum } from './entities';
import { UpdateContactSubmissionStatusDto } from './dto/update-contact.dto';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import * as path from 'path';

@Controller('admin/contact')
export class AdminContactController {
  constructor(private readonly _contactService: ContactService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of contact submissions' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order for timestamp (default: DESC)',
  })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by (default: submittedAt)' })
  @ApiQuery({ name: 'requestType', required: false, enum: RequestTypeEnum, description: 'Filter by request type' })
  @ApiQuery({ name: 'country', required: false, type: String, description: 'Filter by country' })
  @ApiQuery({ name: 'status', required: false, enum: SubmissionStatusEnum, description: 'Filter by submission status' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'General search term for university name and abbreviation',
  })
  async getContactSubmissions(@Query() query: GetContactSubmissionsDto) {
    try {
      const submissions = await this._contactService.getContactSubmissions(query);
      return submissions;
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve contact submissions.',
          error: error.message || 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('countries')
  @ApiOperation({ summary: 'Get list of countries (Admin)' })
  async getContactCountries() {
    const countries = await this._contactService.getAvailableCountriesForContactForm();
    return {
      message: 'Countries for contact form retrieved successfully.',
      data: countries,
    };
  }

  @Get('request-types')
  @ApiOperation({ summary: 'Get list of contact request types (Admin)' })
  getRequestTypes() {
    return {
      message: 'Request types retrieved successfully.',
      data: Object.values(RequestTypeEnum),
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get list of contact submission statuses (Admin)' })
  getSubmissionStatuses() {
    return {
      message: 'Submission statuses retrieved successfully.',
      data: Object.values(SubmissionStatusEnum),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full details of a specific contact submission by ID' })
  @ApiResponse({ status: 200, description: 'The contact submission details', type: ContactSubmissionEntity })
  @ApiResponse({ status: 404, description: 'Contact submission not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getContactSubmissionById(@Param('id', ParseIntPipe) id: number) {
    try {
      const submission = await this._contactService.getContactSubmissionById(id);
      if (!submission) {
        throw new HttpException('Contact submission not found.', HttpStatus.NOT_FOUND);
      }
      return submission;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve contact submission details.',
          error: error.message || 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update the status of a specific contact submission by ID' })
  @ApiBody({ type: UpdateContactSubmissionStatusDto, description: 'New status and rejection reason' })
  @ApiResponse({
    status: 200,
    description: 'The contact submission status updated successfully',
    type: ContactSubmissionEntity,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition or missing rejection reason' })
  @ApiResponse({ status: 404, description: 'Contact submission not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async updateContactSubmissionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateContactSubmissionStatusDto
  ) {
    try {
      const updatedSubmission = await this._contactService.updateContactSubmissionStatus(id, updateDto);
      return updatedSubmission;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to update contact submission status.',
          error: error.message || 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('download-excel/:id')
  @ApiOperation({ summary: 'Download an uploaded subjects Excel file by contact submission ID (Admin Only)' })
  @ApiParam({ name: 'id', description: 'ID of the contact submission' })
  @ApiResponse({
    status: 200,
    description: 'Uploaded Excel file downloaded successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Contact submission not found or Excel file not found' })
  async downloadSubmissionExcel(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const submission = await this._contactService.getContactSubmissionById(id);

    if (!submission) {
      throw new HttpException('Contact submission not found.', HttpStatus.NOT_FOUND);
    }

    const excelFilePath = submission.subjectsExcelFilePath;

    if (!excelFilePath) {
      throw new HttpException('No Excel file associated with this submission.', HttpStatus.NOT_FOUND);
    }

    const absoluteFilePath = path.isAbsolute(excelFilePath) ? excelFilePath : join(process.cwd(), excelFilePath);

    const filename = excelFilePath.split('/').pop();

    if (!existsSync(absoluteFilePath)) {
      throw new HttpException('Uploaded Excel file not found on server.', HttpStatus.NOT_FOUND);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(absoluteFilePath);
  }
}
