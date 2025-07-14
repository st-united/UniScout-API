import { Controller, Get, Query, HttpStatus, HttpException } from '@nestjs/common';
import { ContactService } from './contact.service';
import { GetContactSubmissionsDto } from './dto/get-contact.dto';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { RequestTypeEnum } from '@Constant/enums';
import { SubmissionStatusEnum } from './entities';

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
  @ApiQuery({ name: 'universityName', required: false, type: String, description: 'Filter by university name' })
  @ApiQuery({ name: 'status', required: false, enum: SubmissionStatusEnum, description: 'Filter by submission status' })
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
}
