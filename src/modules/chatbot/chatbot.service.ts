import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage, UniversityQuery, ChatResponseDataWithFile } from './dto/chatbot.dto';
import { UniversityService } from '@UniversitiesModule/university.service';
import { GetUniversityDto, UniversityTypeEnum } from '@UniversitiesModule/dto/get-university.dto';
import { FileExportService } from './file-export/file-export.service';
import { UniversityDisplayDto } from '@UniversitiesModule/dto/university.dto';

@Injectable()
export class ChatbotService {
  private readonly _logger = new Logger(ChatbotService.name);
  private readonly _genAI: GoogleGenerativeAI;
  private readonly _model: any;
  private readonly INITIAL_GREETING: string = 'Hello, I’m DevBot! 👋 I’m your personal assistant. How can I help you?';
  private readonly STANDARD_QUESTIONS: string[] = [
    'How do I search for universities by location or type?',
    'How can I contact with DevPlus?',
    'What are the top-ranked universities in USA?',
  ];
  private _validCountries: string[] = [];

  private readonly CANONICAL_UNIVERSITY_FIELDS: string[] = [
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
    'others',
  ];

  constructor(
    private readonly _configService: ConfigService,
    private readonly _universityService: UniversityService,
    private readonly _fileExportService: FileExportService
  ) {
    const apiKey = this._configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    this._genAI = new GoogleGenerativeAI(apiKey);
    this._model = this._genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.4,
        topP: 0.7,
        maxOutputTokens: 2048,
      },
    });

    this.initializeValidCountries();
  }

  private async initializeValidCountries() {
    try {
      this._validCountries = await this._universityService.getAllAvailableCountries();
    } catch (error) {
      this._logger.error(`Failed to initialize valid countries: ${error.message}`, error.stack);
    }
  }

  async chat(message: string, conversationHistory: ChatMessage[] = []): Promise<ChatResponseDataWithFile> {
    try {
      let dynamicSuggestedQuestions: string[];

      if (conversationHistory.length === 0 && (!message || message.trim() === '')) {
        dynamicSuggestedQuestions = this.STANDARD_QUESTIONS;
        return {
          response: this.INITIAL_GREETING,
          timestamp: new Date().toISOString(),
          suggestedQuestions: dynamicSuggestedQuestions,
        };
      }

      const isUniversityRelated = await this.isUniversityRelatedQuery(message, conversationHistory);

      if (!isUniversityRelated) {
        dynamicSuggestedQuestions = await this.generateSuggestedQuestions(message, conversationHistory, true);
        return {
          response:
            "I'm DevBot, your personal university assistant. I can only provide information about universities. Please ask me something related to universities, like finding specific programs, rankings, or export options. If you need general assistance, please try again with a university-related question or contact DevPlus support.",
          timestamp: new Date().toISOString(),
          suggestedQuestions: dynamicSuggestedQuestions,
        };
      }

      dynamicSuggestedQuestions = await this.generateSuggestedQuestions(message, conversationHistory);

      let responseText = '';
      let fileData: ChatResponseDataWithFile['fileData'] = undefined;

      const queryParams = (await this.extractUniversityQuery(message, conversationHistory)) as UniversityQuery;

      if (queryParams.country && queryParams.country.length > 0) {
        const normalizedCountries = queryParams.country
          .map((c) => this.normalizeCountryName(c))
          .filter((c) => c !== null);

        if (normalizedCountries.length === 0 && queryParams.country.length > 0) {
          const invalidCountries = queryParams.country.join(', ');
          return {
            response: `I'm sorry, I don't have data for the country/countries you mentioned (${invalidCountries}). I currently have information for: ${this._validCountries.join(
              ', '
            )}. Please try a different country or submit a contact request.`,
            timestamp: new Date().toISOString(),
            suggestedQuestions: dynamicSuggestedQuestions,
          };
        }
        queryParams.country = normalizedCountries;
      }

      const hasMeaningfulQueryParams = Object.keys(queryParams).some(
        (key) =>
          queryParams[key] !== undefined &&
          queryParams[key] !== null &&
          !(Array.isArray(queryParams[key]) && queryParams[key].length === 0) &&
          !(typeof queryParams[key] === 'object' && Object.keys(queryParams[key]).length === 0)
      );

      if (!hasMeaningfulQueryParams && message.length > 5 && !message.includes('hello') && !message.includes('hi')) {
        return {
          response:
            "I'm sorry, I don't understand the specifics of your university request. Can you rephrase it or would you like to submit a contact request?",
          timestamp: new Date().toISOString(),
          suggestedQuestions: dynamicSuggestedQuestions,
        };
      }

      if (queryParams.type && queryParams.type.length > 0) {
        const enumValue = this.toUniversityTypeEnum(queryParams.type[0]);
        if (enumValue) {
          queryParams.type = [enumValue];
        } else {
          this._logger.warn(`Unknown university type: ${queryParams.type[0]}`);
          delete queryParams.type;
        }
      }

      // Prepare universitySearchParams with all extracted and mapped parameters
      const universitySearchParams: GetUniversityDto = {
        ...(queryParams as GetUniversityDto),
        page: 1,
        limit: queryParams.exportFormat ? queryParams.exportLimit : queryParams.limit || 10,
      };

      // Initialize fieldNames array if it doesn't exist
      if (!universitySearchParams.fieldNames) {
        universitySearchParams.fieldNames = [];
      }
      // Populate fieldNames from individual academic field flags in queryParams
      this.CANONICAL_UNIVERSITY_FIELDS.forEach((fieldKey) => {
        if ((queryParams as any)[fieldKey] === true) {
          universitySearchParams.fieldNames.push(fieldKey);
        }
      });

      // --- START OF REFINED GENERAL COUNTRY COUNT QUERY CHECK ---
      // This condition should only be true if ONLY country is specified, and no other filters.
      // We check universitySearchParams AFTER all relevant fields (like fieldNames) have been populated.
      const isGeneralCountryCountQuery =
        universitySearchParams.country &&
        universitySearchParams.country.length === 1 &&
        !universitySearchParams.search && // Checks if there's no specific search term
        (!universitySearchParams.minRank || universitySearchParams.minRank === 0) && // Checks if there's no minimum rank specified or it's 0
        (!universitySearchParams.maxRank || universitySearchParams.maxRank === 0) && // Checks if there's no maximum rank specified or it's 0
        (!universitySearchParams.type || universitySearchParams.type.length === 0) && // Checks if no university type is specified or the array is empty
        !universitySearchParams.location && // Checks if no specific location is specified
        (!universitySearchParams.size || universitySearchParams.size.length === 0) && // Checks if no size category is specified or the array is empty
        (!universitySearchParams.fieldNames || universitySearchParams.fieldNames.length === 0) && // Checks if no academic fields are specified or the array is empty
        (!universitySearchParams.subjectNames || universitySearchParams.subjectNames.length === 0) && // Checks if no subjects are specified or the array is empty
        !queryParams.exportFormat; // Ensures it's not an export request
      // This refined condition ensures that if any specific search criteria (like search term, rank, type, location, size, academic fields, or subjects) are present, this general count block is skipped.
      // --- END OF REFINED GENERAL COUNTRY COUNT QUERY CHECK ---

      if (isGeneralCountryCountQuery) {
        const countryName = universitySearchParams.country[0]; // Use universitySearchParams

        const countFilter: GetUniversityDto = {
          country: universitySearchParams.country,
          page: 1,
          limit: 1, // Only need 1 result to get the total count
          search: universitySearchParams.search,
          minRank: universitySearchParams.minRank,
          maxRank: universitySearchParams.maxRank,
          type: universitySearchParams.type,
          location: universitySearchParams.location,
          size: universitySearchParams.size,
          fieldNames: universitySearchParams.fieldNames, // Include fieldNames in countFilter
          subjectNames: universitySearchParams.subjectNames, // Include subjectNames in countFilter
        };
        const actualTotalUniversitiesInDb = await this._universityService.countAll(countFilter);

        if (actualTotalUniversitiesInDb > 0) {
          const { universities: universitiesSampleForOverview } = await this._universityService.findAll({
            country: universitySearchParams.country,
            limit: 10, // Fetches a small sample for the overview
            page: 1,
          });

          responseText = `Hi there! That's a great question. I have information on **${actualTotalUniversitiesInDb} universities** in my database for ${countryName}.\n\n`;

          if (universitiesSampleForOverview.length > 0) {
            responseText += `Here's a quick overview of some of them:\n\n`;
            const topRankedSample =
              universitiesSampleForOverview.find((u) => u.rank === 1) || universitiesSampleForOverview[0];
            const largestStudentBodySample = universitiesSampleForOverview.reduce(
              (prev, current) => ((prev.studentPopulation || 0) > (current.studentPopulation || 0) ? prev : current),
              universitiesSampleForOverview[0]
            );

            if (topRankedSample) {
              responseText += `* **Top-Ranked (Sample):** ${topRankedSample.university} (Rank: ${
                topRankedSample.rank || 'N/A'
              })\n`;
            }
            if (largestStudentBodySample && largestStudentBodySample.studentPopulation) {
              responseText += `* **Largest Student Body (Sample):** ${
                largestStudentBodySample.university
              } (${largestStudentBodySample.studentPopulation.toLocaleString()} students)\n`;
            }
            const presentTypes = new Set<UniversityTypeEnum>();
            universitiesSampleForOverview.forEach((u) => {
              if (Object.values(UniversityTypeEnum).includes(u.type as UniversityTypeEnum)) {
                presentTypes.add(u.type as UniversityTypeEnum);
              }
            });

            let typesOverview = '';
            if (presentTypes.size > 0) {
              const typeNames = Array.from(presentTypes)
                .map((type) => type.charAt(0).toUpperCase() + type.slice(1))
                .sort();

              if (typeNames.length === 1) {
                typesOverview = typeNames[0];
              } else if (typeNames.length === 2) {
                typesOverview = `${typeNames[0]} and ${typeNames[1]}`;
              } else {
                const lastType = typeNames.pop();
                typesOverview = `${typeNames.join(', ')}, and ${lastType}`;
              }
              responseText += `* **Diverse Types:** Including ${typesOverview} institutions.\n`;
            } else {
              responseText += `* **Diverse Types:** Specific types not found in sample.\n`;
            }
            responseText += `* **Common Fields:** You'll find universities specializing in ${this.getCommonFieldsFromSample(
              universitiesSampleForOverview
            )}.\n\n`; // Pass universitiesSampleForOverview directly
          }

          responseText += `Would you like me to export this list of all ${actualTotalUniversitiesInDb} universities for ${countryName} in a **PDF** or **Excel** file?`;
          dynamicSuggestedQuestions = [
            `Export all universities in ${countryName} as PDF`,
            `Export all universities in ${countryName} as Excel`,
            `Tell me more about the top universities in ${countryName}`,
          ];

          return {
            response: responseText,
            timestamp: new Date().toISOString(),
            suggestedQuestions: dynamicSuggestedQuestions,
          };
        } else {
          return {
            response: 'No matching universities found. Please try another query or submit a contact request.',
            timestamp: new Date().toISOString(),
            suggestedQuestions: dynamicSuggestedQuestions,
          };
        }
      }

      // Determine the export format to use if queryParams.exportFormat is an array
      let chosenExportFormat: 'pdf' | 'excel' | undefined;

      if (queryParams.exportFormat) {
        if (Array.isArray(queryParams.exportFormat)) {
          // Prioritize PDF if both are present, otherwise pick the first one
          if (queryParams.exportFormat.includes('pdf')) {
            chosenExportFormat = 'pdf';
          } else if (queryParams.exportFormat.includes('excel')) {
            chosenExportFormat = 'excel';
          } else {
            // If it's an array but contains neither 'pdf' nor 'excel', log a warning
            this._logger.warn(
              `[DEBUG] Export request detected with unsupported array formats: ${queryParams.exportFormat.join(
                ', '
              )}. No file will be generated.`
            );
            chosenExportFormat = undefined; // No valid format to export
          }
        } else {
          // If it's a string, use it directly
          chosenExportFormat = queryParams.exportFormat as 'pdf' | 'excel';
        }
      }

      if (chosenExportFormat) {
        // Only proceed with export if a valid format is chosen
        this._logger.log(
          `[DEBUG] Export request detected. Format: ${chosenExportFormat}, Query: ${JSON.stringify(
            universitySearchParams
          )}`
        );

        const totalMatchingUniversities = await this._universityService.countAll(universitySearchParams);

        let exportMessage = '';
        const requestedExportLimit = queryParams.exportLimit;

        if (totalMatchingUniversities === 0) {
          return {
            response: 'No matching universities found. Please try another query or submit a contact request.',
            timestamp: new Date().toISOString(),
            suggestedQuestions: dynamicSuggestedQuestions,
          };
        }

        let actualLimitToExport: number;

        if (
          requestedExportLimit !== undefined &&
          requestedExportLimit !== null &&
          requestedExportLimit <= totalMatchingUniversities
        ) {
          actualLimitToExport = requestedExportLimit;
          exportMessage = `I'm preparing a file for ${requestedExportLimit} universities matching your request. `;
        } else if (
          requestedExportLimit !== undefined &&
          requestedExportLimit !== null &&
          requestedExportLimit > totalMatchingUniversities
        ) {
          actualLimitToExport = totalMatchingUniversities;
          exportMessage = `Sorry, we do not have ${requestedExportLimit} universities that match your criteria. However, I found ${totalMatchingUniversities} universities that do. I'm preparing a file for these ${totalMatchingUniversities} universities. `;
        } else {
          actualLimitToExport = totalMatchingUniversities;
          exportMessage = `I'm preparing a file for all ${totalMatchingUniversities} universities matching your request. `;
        }

        universitySearchParams.limit = actualLimitToExport;

        const { universities: universitiesToExport } = await this._universityService.findAll(universitySearchParams);

        // universitiesToExport are already UniversityDisplayDto objects from universityService.findAll
        // No need for further mapping here.
        const universitiesDisplayDto: UniversityDisplayDto[] = universitiesToExport;

        try {
          if (chosenExportFormat === 'excel') {
            const excelBase64 = await this._fileExportService.generateExcel(
              universitiesDisplayDto,
              `universities_export_${new Date().toISOString().slice(0, 10)}.xlsx`
            );
            fileData = {
              type: 'excel',
              base64: excelBase64,
              filename: `universities_export_${new Date().toISOString().slice(0, 10)}.xlsx`,
            };
            responseText = `${exportMessage}You should see a download prompt.`;
          } else if (chosenExportFormat === 'pdf') {
            const pdfBase64 = await this._fileExportService.generatePdf(
              universitiesDisplayDto,
              `universities_export_${new Date().toISOString().slice(0, 10)}.pdf`
            );
            fileData = {
              type: 'pdf',
              base64: pdfBase64,
              filename: `universities_export_${new Date().toISOString().slice(0, 10)}.pdf`,
            };
            responseText = `${exportMessage}You should see a download prompt.`;
          }
        } catch (fileError) {
          this._logger.error(`File export failed: ${fileError.message}`, fileError.stack);
          responseText = 'Export failed. Please try again later.';
        }
        return {
          response: responseText,
          timestamp: new Date().toISOString(),
          fileData: fileData,
          suggestedQuestions: dynamicSuggestedQuestions,
        };
      }

      const { universities } = await this._universityService.findAll(universitySearchParams);

      if (universities.length === 0) {
        return {
          response: 'No matching universities found. Please try another query or submit a contact request.',
          timestamp: new Date().toISOString(),
          suggestedQuestions: dynamicSuggestedQuestions,
        };
      }
      const universitiesDisplayDtoForResponse: UniversityDisplayDto[] = universities.map((uni) => ({
        ...uni,
        exchange: String(uni.exchange),
        size: this.categorizeUniversitySize(uni.studentPopulation),
        subjects:
          uni.subjects && Array.isArray(uni.subjects) ? (uni.subjects as any[]).map((s) => s.name).join(', ') : '',
      }));
      responseText = await this.generateUniversityResponse(
        message,
        universitiesDisplayDtoForResponse,
        conversationHistory
      );

      return {
        response: responseText,
        timestamp: new Date().toISOString(),
        fileData: fileData, // Will be undefined here as no export was chosen
        suggestedQuestions: dynamicSuggestedQuestions,
      };
    } catch (error) {
      this._logger.error(`Chatbot service general error: ${error.message}`, error.stack);
      const fallbackSuggestedQuestions = this.STANDARD_QUESTIONS;

      return {
        response: 'The chatbot is currently unavailable. Please try again later or submit a contact request.',
        timestamp: new Date().toISOString(),
        suggestedQuestions: fallbackSuggestedQuestions,
      };
    }
  }

  async exportUniversitiesAsExcel(universityIds: number[]): Promise<string> {
    const universities = await this._universityService.findByIds(universityIds);
    if (universities.length === 0) {
      throw new InternalServerErrorException('No universities found for the provided IDs to export to Excel.');
    }
    const universitiesDisplayDto: UniversityDisplayDto[] = universities.map((uni) => ({
      ...uni,
      exchange: String(uni.exchange),
      size: this.categorizeUniversitySize(uni.studentPopulation),
      subjects:
        uni.subjects && Array.isArray(uni.subjects) ? (uni.subjects as any[]).map((s) => s.name).join(', ') : '',
    }));
    return this._fileExportService.generateExcel(
      universitiesDisplayDto,
      `universities_export_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }

  async exportUniversitiesAsPdf(universityIds: number[]): Promise<string> {
    const universities = await this._universityService.findByIds(universityIds);
    if (universities.length === 0) {
      throw new InternalServerErrorException('No universities found for the provided IDs to export to PDF.');
    }
    const universitiesDisplayDto: UniversityDisplayDto[] = universities.map((uni) => ({
      ...uni,
      exchange: String(uni.exchange),
      size: this.categorizeUniversitySize(uni.studentPopulation),
      subjects:
        uni.subjects && Array.isArray(uni.subjects) ? (uni.subjects as any[]).map((s) => s.name).join(', ') : '',
    }));
    return this._fileExportService.generatePdf(
      universitiesDisplayDto,
      `universities_export_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  }

  private categorizeUniversitySize(
    studentPopulation: number | null
  ): 'small' | 'medium' | 'large' | 'extra large' | null {
    if (studentPopulation === null || studentPopulation === undefined) {
      return null;
    }
    if (studentPopulation < 5000) {
      return 'small';
    } else if (studentPopulation >= 5000 && studentPopulation < 15000) {
      return 'medium';
    } else if (studentPopulation >= 15000 && studentPopulation < 30000) {
      return 'large';
    } else {
      return 'extra large';
    }
  }

  private getCommonFieldsFromSample(universities: UniversityDisplayDto[]): string {
    const allAcademicFieldsFound: string[] = [];
    const subjectsFromDto: string[] = [];

    universities.forEach((uni) => {
      this.CANONICAL_UNIVERSITY_FIELDS.forEach((fieldKey) => {
        if (uni[fieldKey as keyof UniversityDisplayDto] === true) {
          allAcademicFieldsFound.push(this.formatFieldKeyForDisplay(fieldKey));
        }
      });

      if (uni.academicFieldsCommaSeparated && uni.academicFieldsCommaSeparated !== 'NA') {
        allAcademicFieldsFound.push(...uni.academicFieldsCommaSeparated.split(', ').map((field) => field.trim()));
      }

      // Here, uni.subjects is already the string subjectsList from UniversityService,
      // so no need to check Array.isArray or map again.
      if (uni.subjectsList && uni.subjectsList !== 'NA') {
        subjectsFromDto.push(...uni.subjectsList.split(', ').map((subject) => subject.trim()));
      }
    });

    const uniqueAcademicFields = [...new Set(allAcademicFieldsFound)].filter(Boolean);
    const uniqueSubjects = [...new Set(subjectsFromDto)].filter(Boolean);

    let commonFieldsText = '';
    if (uniqueAcademicFields.length > 0) {
      commonFieldsText += `academic fields like ${uniqueAcademicFields.slice(0, 3).join(', ')}`;
      if (uniqueAcademicFields.length > 3) {
        commonFieldsText += ` and more`;
      }
    }

    if (uniqueSubjects.length > 0) {
      if (commonFieldsText) {
        commonFieldsText += ' and ';
      }
      commonFieldsText += `subjects such as ${uniqueSubjects.slice(0, 3).join(', ')}`;
      if (uniqueSubjects.length > 3) {
        commonFieldsText += ` and more`;
      }
    }

    return commonFieldsText || 'various fields';
  }

  private formatFieldKeyForDisplay(fieldKey: string): string {
    return fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private getUniversityFields(uni: UniversityDisplayDto): string[] {
    const fields = [];
    const fieldMap: { [key: string]: string } = {
      agricultural_veterinary_sciences: 'Agricultural & Veterinary Sciences',
      arts_design: 'Arts & Design',
      business_management_law: 'Business Management & Law',
      education_training: 'Education & Training',
      engineering_technology: 'Engineering & Technology',
      health_medicine: 'Health & Medicine',
      humanities_languages: 'Humanities & Languages',
      ict: 'ICT',
      natural_sciences: 'Natural Sciences',
      social_behavioral_sciences: 'Social & Behavioral Sciences',
      services: 'Services',
      transport_safety_security_military: 'Transport, Safety, Security & Military',
      others: 'Others',
    };

    this.CANONICAL_UNIVERSITY_FIELDS.forEach((key) => {
      if (uni[key as keyof UniversityDisplayDto] === true) {
        fields.push(fieldMap[key]);
      }
    });

    return fields;
  }

  private toUniversityTypeEnum(value: string): UniversityTypeEnum | undefined {
    const normalized = value.trim().toUpperCase();
    return Object.values(UniversityTypeEnum).find((enumVal) => (enumVal as string).toUpperCase() === normalized);
  }

  private normalizeCountryName(country: string): string | null {
    const lowerInput = country.trim().toLowerCase();

    const countryMap: { [key: string]: string } = {
      usa: 'USA',
      us: 'USA',
      'united states': 'USA',
      korea: 'Korea',
      'south korea': 'Korea',
      vietnam: 'Vietnam',
      'viet nam': 'Vietnam',
      japan: 'Japan',
      india: 'India',
      australia: 'Australia',
    };

    const mappedCountry = countryMap[lowerInput];
    if (mappedCountry) {
      if (this._validCountries.includes(mappedCountry)) {
        return mappedCountry;
      }
    }

    const foundValidCountry = this._validCountries.find(
      (validDbCountry) => validDbCountry.toLowerCase() === lowerInput
    );
    if (foundValidCountry) {
      return foundValidCountry;
    }

    this._logger.warn(`Could not normalize country "${country}" to a valid database country.`);
    return null;
  }

  private formatConversationHistory(history: ChatMessage[]): string {
    if (history.length === 0) return 'No previous conversation.';

    return history
      .slice(-5)
      .map(
        (msg) =>
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${
            Array.isArray(msg.parts) && msg.parts.length > 0 ? msg.parts[0].text : ''
          }`
      )
      .join('\n');
  }

  private async isUniversityRelatedQuery(message: string, conversationHistory: ChatMessage[]): Promise<boolean> {
    const prompt = `
    Given the following conversation history and the latest user message, determine if the user's intent is related to querying or discussing universities. Respond with 'yes' or 'no'.

    Conversation History:
    ${this.formatConversationHistory(conversationHistory)}

    User's latest message: "${message}"

    Is the user's intent related to universities? (yes/no)
    `;

    try {
      const result = await this._model.generateContent(prompt);
      const response = result.response.text().trim().toLowerCase();
      return response.includes('yes');
    } catch (error) {
      this._logger.error(`Error in isUniversityRelatedQuery: ${error.message}`, error.stack);
      return true;
    }
  }

  private async extractUniversityQuery(message: string, conversationHistory: ChatMessage[]): Promise<UniversityQuery> {
    const validCountriesList = this._validCountries.join(', ');

    const prompt = `
    You are an expert at extracting university search parameters from natural language.
    Based on the following conversation history and the latest user message, extract specific parameters for a university search.
    If a parameter is not explicitly mentioned or clearly implied, leave it as undefined.
    Infer boolean values (e.g., for 'exchange' or specific academic fields) as true if mentioned.
    If the user asks for "top" universities, infer minRank: 1 and a reasonable maxRank (e.g., 100).
    If the user asks for "all" universities or an export without a limit, infer exportLimit: null.
    If the user asks to "export" as "pdf" or "excel", set exportFormat accordingly.
    When a specific university name is mentioned (e.g., "Harvard University"), prioritize extracting it as the 'search' parameter.
    If the user asks about a specific university's courses or subjects (e.g., "does Harvard have ICT courses?"), extract the university name as 'search' and the subject/field as 'fields' or the relevant academic field flag.

    Available university types: Public, Private, For-Profit, Non-Profit.
    Available academic fields (use these exact strings as boolean flags if inferred): ${this.CANONICAL_UNIVERSITY_FIELDS.join(
      ', '
    )}.
    Available countries: ${validCountriesList}

    Example of expected JSON output:
    {
      "search": "engineering",
      "country": ["USA", "Canada"],
      "minRank": 1,
      "maxRank": 50,
      "type": ["Public"],
      "location": "New York",
      "size": "medium",
      "limit": 10,
      "exportFormat": "pdf",
      "exportLimit": 100,
      "agricultural_veterinary_sciences": true,
      "arts_design": true
    }
    Example for specific university query:
    {
      "search": "Harvard University",
      "ict": true
    }
    Example for another specific university query:
    {
      "search": "MIT",
      "fields": ["engineering_technology"]
    }

    Conversation History:
    ${this.formatConversationHistory(conversationHistory)}

    User's latest message: "${message}"

    Extracted parameters (JSON format):
    `;

    // Declare 'result' outside the try block
    let result: any;

    try {
      result = await this._model.generateContent(prompt);
      let jsonResponse = result.response.text().trim();
      this._logger.log(`[DEBUG] Raw Gemini response for query extraction: ${jsonResponse}`); // New log for debugging

      // Regex to extract content inside ```json ... ``` block
      const jsonMatch = jsonResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonResponse = jsonMatch[1].trim(); // Use the captured group as the JSON string
      } else {
        // Fallback: If Gemini doesn't wrap in markdown, log a warning and proceed
        this._logger.warn(`Gemini response for query extraction not in markdown block. Attempting direct parse.`);
      }

      this._logger.log(`[DEBUG] Cleaned JSON string for query extraction: ${jsonResponse}`); // New log for debugging
      const parsed = JSON.parse(jsonResponse) as UniversityQuery;

      if (parsed.country && Array.isArray(parsed.country)) {
        parsed.country = parsed.country.map((c) => this.normalizeCountryName(c)).filter((c) => c !== null) as string[];
      }

      if (parsed.fields && Array.isArray(parsed.fields)) {
        (parsed.fields as string[]).some((field) => {
          this.CANONICAL_UNIVERSITY_FIELDS.forEach((canonicalField) => {
            if (
              field.toLowerCase().includes(canonicalField.replace(/_/g, ' ').toLowerCase()) ||
              canonicalField.replace(/_/g, ' ').toLowerCase().includes(field.toLowerCase())
            ) {
              (parsed as any)[canonicalField] = true;
            }
          });
          return false;
        });
        delete parsed.fields;
      }
      return parsed;
    } catch (error) {
      const rawResponseText =
        result?.response?.text() || 'N/A - Gemini response was not available or error occurred before response.';
      this._logger.error(
        `Error extracting university query: ${error.message}. Raw response causing error: "${rawResponseText}"`,
        error.stack
      );
      return {};
    }
  }

  private async generateUniversityResponse(
    userMessage: string,
    universities: UniversityDisplayDto[],
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    const formattedUniversities = universities
      .map((uni, index) => {
        const fields = this.getUniversityFields(uni);
        const academicFields = fields.length > 0 ? ` - Fields: ${fields.join(', ')}` : '';
        const rank = uni.rank ? `Rank: ${uni.rank}` : 'Rank: N/A';
        const studentPopulation = uni.studentPopulation ? `Students: ${uni.studentPopulation.toLocaleString()}` : '';
        const type = uni.type ? `Type: ${uni.type}` : '';
        const location = uni.location
          ? `Location: ${uni.location}, ${uni.country}`
          : `Location: ${uni.country || 'N/A'}`;
        const website = uni.website ? `Website: ${uni.website}` : '';

        return `${index + 1}. **${
          uni.university
        }** (${rank}, ${location}, ${studentPopulation}, ${type}${academicFields}). ${website}`;
      })
      .join('\n\n');

    const prompt = `
    The user asked: "${userMessage}"
    Here is the previous conversation history:
    ${this.formatConversationHistory(conversationHistory)}
    I found the following universities:
    ${formattedUniversities}

    Please provide a concise and helpful response summarizing the found universities.
    Highlight key information for the user and offer a follow-up.
    Do not just list them. Make it conversational.
    If less than 3 universities are found, mention that.
    Suggest to the user if they want to export the list as PDF or Excel.

    Response:
    `;

    try {
      const result = await this._model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      this._logger.error(`Error generating university response: ${error.message}`, error.stack);
      return `I found ${universities.length} universities matching your criteria. Here are some details:\n\n${formattedUniversities}\n\nWould you like to export this list as a PDF or Excel file?`;
    }
  }

  private async generateSuggestedQuestions(
    message: string,
    conversationHistory: ChatMessage[],
    isFallback = false
  ): Promise<string[]> {
    const historyForPrompt = this.formatConversationHistory(conversationHistory);
    let prompt: string;

    if (isFallback) {
      prompt = `
      The user's last message was not directly related to universities. Provide 3 short and concise questions that encourage the user to ask about universities or related topics (like rankings, programs, or specific countries). Ensure they are in a numbered list format.

      Example:
      1. What are the top universities for engineering in the USA?
      2. Can you help me find universities in Canada?
      3. How do I search for universities by type?

      Generate 3 suggested questions:
      `;
    } else {
      prompt = `
      Based on the current user message and conversation history, suggest 3 highly relevant and concise follow-up questions that a user might ask about universities. These questions should directly relate to the ongoing university search or information retrieval. Ensure they are in a numbered list format.

      Conversation History:
      ${historyForPrompt}

      User's last message: "${message}"

      Generate 3 suggested questions:
      `;
    }

    try {
      const result = await this._model.generateContent(prompt);
      const responseText = result.response.text().trim();
      return responseText
        .split('\n')
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((line) => line.length > 0);
    } catch (error) {
      this._logger.error(`Error generating suggested questions: ${error.message}`, error.stack);
      return this.STANDARD_QUESTIONS;
    }
  }
}
