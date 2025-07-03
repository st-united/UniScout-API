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

      const isGeneralCountryCountQuery =
        queryParams.country &&
        queryParams.country.length === 1 &&
        !queryParams.search &&
        !queryParams.minRank &&
        !queryParams.maxRank &&
        !queryParams.type &&
        !queryParams.location &&
        !queryParams.size &&
        !queryParams.fields &&
        !queryParams.limit &&
        !queryParams.exportFormat;

      if (isGeneralCountryCountQuery) {
        const countryName = queryParams.country[0];

        const countFilter: GetUniversityDto = {
          country: queryParams.country,
          page: 1,
          limit: 1,
          search: queryParams.search,
          minRank: queryParams.minRank,
          maxRank: queryParams.maxRank,
          type: queryParams.type,
          location: queryParams.location,
          size: queryParams.size,
        };
        const actualTotalUniversitiesInDb = await this._universityService.countAll(countFilter);

        if (actualTotalUniversitiesInDb > 0) {
          const { universities: universitiesSampleForOverview } = await this._universityService.findAll({
            country: queryParams.country,
            limit: 10,
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
              universitiesSampleForOverview.map((uni) => ({
                ...uni,
                exchange: String(uni.exchange),
                size: this.categorizeUniversitySize(uni.studentPopulation),
                subjects:
                  uni.subjects && Array.isArray(uni.subjects)
                    ? (uni.subjects as any[]).map((s) => s.name).join(', ')
                    : '',
              }))
            )}.\n\n`;
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

      const universitySearchParams: GetUniversityDto = {
        ...(queryParams as GetUniversityDto),
        page: 1,
        limit: queryParams.exportFormat ? queryParams.exportLimit : queryParams.limit || 10,
      };

      if (queryParams.exportFormat) {
        this._logger.log(
          `[DEBUG] Export request detected. Format: ${queryParams.exportFormat}, Query: ${JSON.stringify(
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

        const universitiesDisplayDto: UniversityDisplayDto[] = universitiesToExport.map((uni) => ({
          ...uni,
          exchange: String(uni.exchange),
          size: this.categorizeUniversitySize(uni.studentPopulation),
          subjects:
            uni.subjects && Array.isArray(uni.subjects) ? (uni.subjects as any[]).map((s) => s.name).join(', ') : '',
        }));

        try {
          if (queryParams.exportFormat === 'excel') {
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
          } else if (queryParams.exportFormat === 'pdf') {
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
        fileData: fileData,
        suggestedQuestions: dynamicSuggestedQuestions,
      };
    } catch (error) {
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

      if (uni.subjects && uni.subjects !== 'NA') {
        subjectsFromDto.push(...uni.subjects.split(', ').map((subject) => subject.trim()));
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
        (msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${Array.isArray(msg.parts) ? msg.parts[0] : msg.parts}`
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
    const validAcademicFields = this.CANONICAL_UNIVERSITY_FIELDS.map((field) =>
      field.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    ).join(', ');

    const prompt = `
    You are an expert at extracting university search parameters from natural language.
    Based on the following conversation history and the latest user message, extract specific parameters for a university search.
    If a parameter is not explicitly mentioned or clearly implied, leave it as undefined.
    Infer boolean values (e.g., for 'exchange' or specific academic fields) as true if mentioned.
    If the user asks for "top" universities, infer minRank: 1 and a reasonable maxRank (e.g., 100).
    If the user asks for "all" universities or an export without a limit, infer exportLimit: null.
    If the user asks to "export" as "pdf" or "excel", set exportFormat accordingly.

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

    Conversation History:
    ${this.formatConversationHistory(conversationHistory)}

    User's latest message: "${message}"

    Extracted parameters (JSON format):
    `;

    try {
      const result = await this._model.generateContent(prompt);
      const jsonResponse = result.response.text().trim();
      this._logger.log(`[DEBUG] Extracted query JSON: ${jsonResponse}`);
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
      this._logger.error(
        `Error extracting university query: ${error.message}. Raw response: ${error.response?.text()}`,
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
