import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage, UniversityQuery, ChatResponseDataWithFile } from './dto/chatbot.dto';
import { UniversityService } from '@UniversitiesModule/university.service';
import { UniEntity } from '@UniversitiesModule/entities';
import { GetUniversityDto, UniversityTypeEnum } from '@UniversitiesModule/dto/get-university.dto';
import { FileExportService } from './file-export/file-export.service';

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
    'agriculturalFoodScience',
    'artsDesign',
    'economicsBusinessManagement',
    'lawPoliticalScience',
    'medicinePharmacyHealthSciences',
    'scienceEngineering',
    'socialSciencesHumanities',
    'sportsPhysicalEducation',
    'technology',
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
        dynamicSuggestedQuestions = await this.generateSuggestedQuestions(message, conversationHistory, true); // Added 'true' to indicate general suggestions
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
              if (Object.values(UniversityTypeEnum).includes(u.type)) {
                presentTypes.add(u.type);
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

        try {
          if (queryParams.exportFormat === 'excel') {
            const excelBase64 = await this._fileExportService.generateExcel(
              universitiesToExport,
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
              universitiesToExport,
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
      responseText = await this.generateUniversityResponse(message, universities, conversationHistory);

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
    return this._fileExportService.generateExcel(
      universities,
      `universities_export_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }

  async exportUniversitiesAsPdf(universityIds: number[]): Promise<string> {
    const universities = await this._universityService.findByIds(universityIds);
    if (universities.length === 0) {
      throw new InternalServerErrorException('No universities found for the provided IDs to export to PDF.');
    }
    return this._fileExportService.generatePdf(
      universities,
      `universities_export_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  }

  private getCommonFieldsFromSample(universities: UniEntity[]): string {
    const fieldCounts: { [key: string]: number } = {};
    universities.forEach((uni) => {
      const fields = this.getUniversityFields(uni);
      fields.forEach((field) => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      });
    });

    const sortedFields = Object.entries(fieldCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([field]) => field);

    return sortedFields.slice(0, 3).join(', ') + (sortedFields.length > 3 ? ', etc.' : '');
  }

  private async isUniversityRelatedQuery(message: string, conversationHistory: ChatMessage[]): Promise<boolean> {
    const historyForPrompt = this.formatConversationHistory(conversationHistory);
    const prompt = `
    Analyze the following user message and recent conversation history. Determine if the user's intent is primarily related to universities, colleges, higher education, academic programs, rankings, admissions, or exporting university data.

    Respond with "YES" if it is university-related, and "NO" if it is not.
    Provide ONLY "YES" or "NO". Do not add any other text or explanation.

    Conversation History:
    ${historyForPrompt}

    User's last message: "${message}"

    Is this message university-related?
    `;

    try {
      const result = await this._model.generateContent(prompt);
      const responseText = result.response.text().trim().toUpperCase();
      return responseText === 'YES';
    } catch (error) {
      const universityKeywords = [
        'university',
        'universities',
        'college',
        'school',
        'education',
        'study',
        'degree',
        'ranking',
        'rank',
        'student',
        'campus',
        'engineering',
        'medicine',
        'business',
        'arts',
        'science',
        'location',
        'country',
        'exchange',
        'program',
        'field',
        'recommend',
        'suggest',
        'best',
        'top',
        'find',
        'how many',
        'number of',
        'all universities',
        'export',
        'download',
        'file',
        'spreadsheet',
        'excel',
        'pdf',
      ];
      const lowerMessage = message.toLowerCase();
      return universityKeywords.some((keyword) => lowerMessage.includes(keyword));
    }
  }

  private async extractUniversityQuery(message: string, conversationHistory: ChatMessage[]): Promise<UniversityQuery> {
    const historyForPrompt = this.formatConversationHistory(conversationHistory);

    const prompt = `
    You are a highly precise JSON extraction bot. Your task is to analyze user requests for university searches or data exports and return ONLY a single JSON object.

    Strict Rules for JSON Output:
    1.  Output ONLY the JSON object. Do not include any other text, markdown formatting (like triple backticks), or comments outside the JSON.
    2.  If a field's value cannot be inferred from the user message, OMIT that field from the JSON object. Do not use null for missing fields.
    3.  **For country names, extract them as literally as possible from the user's message. Do NOT perform any normalization like "USA" to "United States" internally.** The application will handle normalization based on its valid countries.
    4.  If the user asks for a specific number of results (e.g., "top 5", "show me 10"), set the 'limit' field. Default conversational limit is 10 if not specified and not an export request.
    5.  **CRITICAL FOR EXPORT:**
        * Set 'exportFormat' ONLY if the user explicitly asks to "export", "download", "get a file", "spreadsheet", "excel file", or "PDF".
        * If 'exportFormat' is set, you MUST also set 'exportLimit'. If the user does not specify a number for export (e.g., "export all", "get a spreadsheet"), set 'exportLimit' to a large number like 1000.
        * If 'exportFormat' is set, DO NOT set the 'limit' field. 'exportLimit' takes precedence for file exports.
    6.  **For pure count queries (e.g., "How many universities in Canada?"):** Only return the 'country' field. Do NOT return 'limit' or 'exportFormat' or 'exportLimit'.
    7.  **For academic fields:** If the user mentions a field of study (e.g., "computer science", "medicine", "business"), map it to the closest possible canonical field name from the provided list. Return this as a boolean true for the corresponding field key in the 'fields' object.
        **Canonical Academic Fields:** ${this.CANONICAL_UNIVERSITY_FIELDS.map((f) => `"${f}"`).join(', ')}

    Possible JSON fields:
    - search: string (e.g., "Seoul National University")
    - country: string[] (array of country names, e.g., ["United States", "Canada"])
    - type: string[] (array of type strings, e.g., ["Public", "Private"])
    - minRank: number (e.g., 1 for "top 10")
    - maxRank: number (e.g., 10 for "top 10")
    - rank: number (specific rank, e.g., 5)
    - location: string (city or region)
    - size: "small" | "medium" | "large" | "mega_large"
    - fields: Record<string, boolean> (e.g., {"engineering": true, "medicinePharmacyHealthSciences": true})
    - limit: number (for conversational display, e.g., "show 5", "list 10")
    - exportFormat: "excel" | "pdf" (set for file export requests)
    - exportLimit: number (number of items for export, e.g., 30 for "top 30")

    Conversation History:
    ${historyForPrompt}

    User message: "${message}"

    Examples for academic fields:
    - "I want to study computer science in Korea" -> {"country": ["Korea"], "fields": {"technology": true}}
    - "Looking for medical schools in USA" -> {"country": ["USA"], "fields": {"medicinePharmacyHealthSciences": true}}
    - "Universities with good economics programs" -> {"fields": {"economicsBusinessManagement": true}}

    JSON output:
    `;

    try {
      const result = await this._model.generateContent(prompt);
      let response = result.response.text().trim();

      if (response.startsWith('```json')) {
        response = response.substring(7, response.lastIndexOf('```')).trim();
      } else if (response.startsWith('```')) {
        response = response.substring(3, response.lastIndexOf('```')).trim();
      }

      let parsed: UniversityQuery;
      try {
        parsed = JSON.parse(response);
      } catch (parseError) {
        this._logger.error(`Failed to parse AI's JSON output for query extraction: "${response}"`, parseError.stack);
        return {};
      }

      const isPureCountryCountQuery =
        parsed.country &&
        parsed.country.length === 1 &&
        !parsed.search &&
        !parsed.minRank &&
        !parsed.maxRank &&
        !parsed.type &&
        !parsed.location &&
        !parsed.size &&
        !parsed.fields &&
        !parsed.limit &&
        !parsed.exportFormat;

      if (parsed.limit === undefined && !parsed.exportFormat && !isPureCountryCountQuery) {
        parsed.limit = 10;
      }

      if (parsed.exportFormat && parsed.exportLimit === undefined) {
        parsed.exportLimit = 1000;
      }
      if (parsed.exportFormat) {
        delete parsed.limit;
      }

      this._logger.log(`[DEBUG] Parsed UniversityQuery: ${JSON.stringify(parsed)}`);
      return parsed;
    } catch (error) {
      this._logger.error(`Error extracting query parameters: ${error.message}`, error.stack);
      return {};
    }
  }

  private async generateUniversityResponse(
    userMessage: string,
    universities: UniEntity[],
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    const universityContext = this.formatUniversitiesForAI(universities);

    const prompt = `
    You are a helpful university advisor chatbot. Based on the user's question and the university data provided, give a comprehensive and helpful response.

    User Question: "${userMessage}"

    University Data Found (${universities.length} results):
    ${universityContext}

    Previous Conversation:
    ${this.formatConversationHistory(conversationHistory)}

    Guidelines:
    1. If universities were found, provide detailed information about them.
    2. Highlight key features like rankings, locations, specializations.
    3. Make recommendations based on the user's apparent needs.
    4. Be conversational and helpful.
    5. Include specific details from the database when relevant.
    6. If the user asks for comparisons, provide comparative analysis.
    7. Mention contact information if available and relevant.
    8. **IMPORTANT: This function assumes universities are found and will generate a response based on the provided data. The scenario where no universities are found is handled before this function is called.**

    Provide a helpful, informative response:
    `;

    try {
      const result = await this._model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this._logger.error(`Error generating university response: ${error.message}`);
      return `I found ${universities.length} universities that might match your criteria, but I'm having trouble generating a detailed response right now. Please try rephrasing your question.`;
    }
  }

  private formatUniversitiesForAI(universities: UniEntity[]): string {
    const maxUniversitiesForAI = 10;
    return universities
      .slice(0, maxUniversitiesForAI)
      .map((uni, index) => {
        const fields = this.getUniversityFields(uni);
        return `
${index + 1}. ${uni.university}
    - Rank: ${uni.rank || 'Not ranked'}
    - Country: ${uni.country}
    - Location: ${uni.location || 'Not specified'}
    - Type: ${uni.type || 'Not specified'}
    - Student Population: ${uni.studentPopulation ? uni.studentPopulation.toLocaleString() : 'Not available'}
    - Specializations: ${fields.length > 0 ? fields.join(', ') : 'General'}
    - Website: ${uni.website || 'Not available'}
    - Contact: ${uni.email || uni.contact || 'Not available'}
    ${uni.description ? `- Description: ${uni.description.substring(0, 200)}...` : ''}
      `.trim();
      })
      .join('\n\n');
  }

  private getUniversityFields(uni: UniEntity): string[] {
    const fields = [];
    const fieldMap: { [key: string]: string } = {
      agriculturalFoodScience: 'Agricultural & Food Science',
      artsDesign: 'Arts & Design',
      economicsBusinessManagement: 'Economics & Business',
      lawPoliticalScience: 'Law & Political Science',
      medicinePharmacyHealthSciences: 'Medicine & Health Sciences',
      scienceEngineering: 'Science & Engineering',
      socialSciencesHumanities: 'Social Sciences & Humanities',
      sportsPhysicalEducation: 'Sports & Physical Education',
      technology: 'Technology',
      others: 'Others',
    };

    this.CANONICAL_UNIVERSITY_FIELDS.forEach((key) => {
      if (uni[key as keyof UniEntity] === true) {
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

    const titleCased = lowerInput.replace(/\b\w/g, (char) => char.toUpperCase());
    if (this._validCountries.includes(titleCased)) {
      return titleCased;
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
  private async generateSuggestedQuestions(
    message: string,
    conversationHistory: ChatMessage[],
    forceGeneral = false
  ): Promise<string[]> {
    const historyForPrompt = this.formatConversationHistory(conversationHistory);

    let prompt: string;
    if (forceGeneral) {
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
