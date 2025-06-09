import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage, UniversityQuery, ChatResponseDataWithFile } from './dto/chatbot.dto';
import { UniversityService } from '@UniversitiesModule/university.service';
import { UniEntity } from '@UniversitiesModule/entities';
import { GetUniversityDto, UniversityTypeEnum } from '@UniversitiesModule/dto/get-university.dto';
import { ChatResponseData } from './dto/chat-request.dto';
import { FileExportService } from '../file-export/file-export.service';

@Injectable()
export class ChatbotService {
  private readonly _logger = new Logger(ChatbotService.name);
  private readonly _genAI: GoogleGenerativeAI;
  private readonly _model: any;
  1;
  private readonly INITIAL_GREETING: string = 'Hello, I’m DevBot! 👋 I’m your personal assistant. How can I help you?';
  private readonly STANDARD_QUESTIONS: string[] = [
    'How do I search for universities by location or type?',
    'How can I contact with DevPlus?',
    'What are the top-ranked universities in USA?',
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
        temperature: 0.7,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
    });
  }

  async chat(message: string, conversationHistory: ChatMessage[] = []): Promise<ChatResponseDataWithFile> {
    try {
      if (conversationHistory.length === 0 && !message) {
        // Check if message is also empty for initial prompt
        return {
          response: this.INITIAL_GREETING,
          timestamp: new Date().toISOString(),
          suggestedQuestions: this.STANDARD_QUESTIONS,
        };
      }

      const lowerCaseMessage = message.toLowerCase();
      // Analyze user message to determine if it's university-related
      const isUniversityQuery = await this.isUniversityRelatedQuery(message);

      let responseText = '';
      let fileData: ChatResponseDataWithFile['fileData'] = undefined;

      if (isUniversityQuery) {
        // Extract university search parameters from the message
        const queryParams = (await this.extractUniversityQuery(message)) as UniversityQuery;
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
              "I'm sorry, I couldn't understand your university search criteria. Can you rephrase your question or would you like to submit a contact request?",
            timestamp: new Date().toISOString(),
          };
        }
        if (queryParams.type) {
          const enumValue = this.toUniversityTypeEnum(queryParams.type);
          if (enumValue) {
            queryParams.type = enumValue;
          } else {
            this._logger.warn(`Unknown university type: ${queryParams.type}`);
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

          // Get the actual total count of universities you have for this country
          const actualTotalUniversitiesInDb = await this._universityService.countAll({
            country: queryParams.country,
            page: 1,
            limit: 1,
          });

          if (actualTotalUniversitiesInDb > 0) {
            // Fetch a small sample of universities for an overview in the chat
            const universitiesSampleForOverview = await this._universityService.findAll({
              country: queryParams.country,
              limit: 10,
              page: 1,
            });

            responseText = `Hi there! That's a great question. While I may not have *all* universities in ${countryName} listed, I do have information on **${actualTotalUniversitiesInDb} universities** in my database for ${countryName}.\n\n`;

            // Add a quick overview based on the sample
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
              responseText += `* **Diverse Types:** Including ${
                universitiesSampleForOverview.some((u) => u.type === 'Public') ? 'Public' : ''
              } and ${
                universitiesSampleForOverview.some((u) => u.type === 'Private') ? 'Private' : ''
              } institutions.\n`;
              responseText += `* **Common Fields:** You'll find universities specializing in ${this.getCommonFieldsFromSample(
                universitiesSampleForOverview
              )}.\n\n`;
            }

            responseText += `Would you like me to export this list of all ${actualTotalUniversitiesInDb} universities for ${countryName} in a **PDF** or **Excel** file?`;

            return {
              response: responseText,
              timestamp: new Date().toISOString(),
              suggestedQuestions: [
                `Export all universities in ${countryName} as PDF`,
                `Export all universities in ${countryName} as Excel`,
                `Tell me more about the top universities in ${countryName}`, // Re-engages AI for detailed summary if needed
              ],
            };
          }
        }
        const universitySearchParams: GetUniversityDto = {
          ...(queryParams as GetUniversityDto),
          page: 1,
          limit: queryParams.exportLimit || queryParams.limit || 100, // Use exportLimit if specified, or default limit, or a higher limit for export
        };

        if (queryParams.exportFormat) {
          this._logger.log(
            `[DEBUG] Export request detected. Format: ${queryParams.exportFormat}, Query: ${JSON.stringify(
              universitySearchParams
            )}`
          );
          const universitiesToExport = await this._universityService.findAll(universitySearchParams);

          if (universitiesToExport.length === 0) {
            return {
              response:
                "I couldn't find any universities matching your criteria to export. Please try a different query.",
              timestamp: new Date().toISOString(),
            };
          }

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
              responseText = `I've generated the Excel file for ${universitiesToExport.length} universities based on your request. You should see a download prompt.`;
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
              responseText = `I've generated the PDF file for ${universitiesToExport.length} universities based on your request. You should see a download prompt.`;
            }
          } catch (fileError) {
            this._logger.error(`Error during file generation: ${fileError.message}`, fileError.stack);
            responseText = `I encountered an error while generating the ${queryParams.exportFormat} file. Please try again later.`;
          }
          return {
            response: responseText,
            timestamp: new Date().toISOString(),
            fileData: fileData,
          };
        }

        // Search universities in database
        const universities = await this._universityService.findAll(universitySearchParams);

        if (universities.length === 0) {
          return {
            response: 'No matching universities found. Please try another query or submit a contact request.',
            timestamp: new Date().toISOString(),
          };
        }
        // Generate context-aware response
        responseText = await this.generateUniversityResponse(message, universities, conversationHistory);
      } else {
        // Handle general conversation
        responseText = "I'm here to help you find information about universities. What would you like to know?";
      }
      return {
        response: responseText,
        timestamp: new Date().toISOString(),
        fileData: fileData,
      };
    } catch (error) {
      this._logger.error(`Error in chat: ${error.message}`, error.stack);
      if (error instanceof InternalServerErrorException) {
        return {
          response: `The chatbot is currently experiencing a database issue. Please try again later or submit a contact request. (Error: ${error.message})`,
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          response: 'The chatbot is currently unavailable. Please try again later or submit a contact request.',
          timestamp: new Date().toISOString(),
        };
      }
    }
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

  private async isUniversityRelatedQuery(message: string): Promise<boolean> {
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
    ];

    const lowerMessage = message.toLowerCase();
    return universityKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  private async extractUniversityQuery(message: string): Promise<UniversityQuery> {
    const extractionPrompt = `
    You are a highly precise JSON extraction bot. Your task is to analyze user requests for university searches or data exports and return ONLY a single JSON object.

    Strict Rules for JSON Output:
    1.  Output ONLY the JSON object. Do not include any other text, markdown formatting (like triple backticks), or comments outside the JSON.
    2.  If a field's value cannot be inferred from the user message, OMIT that field from the JSON object. Do not use null for missing fields.
    3.  Country names must be normalized (e.g., "South Korea" should be "Korea").
    4.  If the user asks for a specific number of results (e.g., "top 5", "show me 10"), set the 'limit' field. Default conversational limit is 10 if not specified.
    5.  **CRITICAL FOR EXPORT:**
        * Set 'exportFormat' ONLY if the user explicitly asks to "export", "download", "get a file", "spreadsheet", "excel file", or "PDF".
        * If 'exportFormat' is set, you MUST also set 'exportLimit'. If the user does not specify a number for export (e.g., "export all", "get a spreadsheet"), set 'exportLimit' to a large number like 1000.
        * If 'exportFormat' is set, DO NOT set the 'limit' field. 'exportLimit' takes precedence for file exports.

    Possible JSON fields:
    - search: string (e.g., "Seoul National University")
    - country: string[] (array of country names, e.g., ["USA", "Canada"])
    - type: string (e.g., "Public", "Private")
    - minRank: number (e.g., 1 for "top 10")
    - maxRank: number (e.g., 10 for "top 10")
    - rank: number (specific rank, e.g., 5)
    - location: string (city or region)
    - size: "small" | "medium" | "large" | "mega_large"
    - fields: Record<string, boolean> (e.g., {"engineering": true, "medicinePharmacyHealthSciences": true})
    - limit: number (for conversational display, e.g., "show 5", "list 10")
    - exportFormat: "excel" | "pdf" (set for file export requests)
    - exportLimit: number (number of items for export, e.g., 30 for "top 30")

    User message: "${message}"

    Examples:
    - "Find engineering universities in USA" -> {"country": ["USA"], "fields": {"engineering": true}, "limit": 10}
    - "Top 10 universities" -> {"minRank": 1, "maxRank": 10, "limit": 10}
    - "Universities in Singapore for medicine" -> {"country": ["Singapore"], "fields": {"medicinePharmacyHealthSciences": true}, "limit": 10}
    - "Show me 5 best universities in Germany" -> {"country": ["Germany"], "minRank": 1, "maxRank": 5, "limit": 5}
    - "Export top 30 universities in Korea as Excel" -> {"country": ["Korea"], "minRank": 1, "maxRank": 30, "exportFormat": "excel", "exportLimit": 30}
    - "Download all public universities in USA as PDF" -> {"country": ["USA"], "type": "Public", "exportFormat": "pdf", "exportLimit": 1000}
    - "Give me a spreadsheet of universities in France" -> {"country": ["France"], "exportFormat": "excel", "exportLimit": 1000}
    - "What is the ranking of Seoul National University?" -> {"search": "Seoul National University", "limit": 1}
    - "How many universities are there in Canada?" -> {"country": ["Canada"]}
    - "I need a list of all universities in the UK" -> {"country": ["United Kingdom"], "limit": 1000}

    JSON output:
    `;

    try {
      const result = await this._model.generateContent(extractionPrompt);
      const response = result.response.text().trim();

      let jsonString = response;
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.substring(7, jsonString.lastIndexOf('```')).trim();
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.substring(3, jsonString.lastIndexOf('```')).trim();
      }

      let parsed: UniversityQuery;
      try {
        parsed = JSON.parse(jsonString);
      } catch (parseError) {
        this._logger.error(`Failed to parse AI's JSON output: "${jsonString}"`, parseError.stack);
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
        !parsed.limit && // Make sure AI didn't explicitly add a limit
        !parsed.exportFormat; // Make sure AI didn't explicitly add an export format

      if (parsed.limit === undefined && !parsed.exportFormat && !isPureCountryCountQuery) {
        parsed.limit = 10; // Default limit for *conversational display* of search results
      }

      // Ensure exportLimit is set if exportFormat is present but exportLimit is missing
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
    1. If universities were found, provide detailed information about them
    2. Highlight key features like rankings, locations, specializations
    3. Make recommendations based on the user's apparent needs
    // 4. If no universities match, suggest alternative search criteria // <-- REMOVED this guideline as primary logic handles it
    4. Be conversational and helpful
    5. Include specific details from the database when relevant
    6. If the user asks for comparisons, provide comparative analysis
    7. Mention contact information if available and relevant.
    8. **IMPORTANT: This function assumes universities are found and will generate a response based on the provided data. The scenario where no universities are found is handled before this function is called.** // <-- Added explicit guideline

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
    return universities
      .slice(0, 10)
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
    const fieldMap = {
      agriculturalFoodScience: 'Agricultural & Food Science',
      artsDesign: 'Arts & Design',
      economicsBusinessManagement: 'Economics & Business',
      engineering: 'Engineering',
      lawPoliticalScience: 'Law & Political Science',
      medicinePharmacyHealthSciences: 'Medicine & Health Sciences',
      physicalScience: 'Physical Science',
      socialSciencesHumanities: 'Social Sciences & Humanities',
      sportsPhysicalEducation: 'Sports & Physical Education',
      technology: 'Technology',
      theology: 'Theology',
    };

    Object.entries(fieldMap).forEach(([key, label]) => {
      if (uni[key] === true) {
        fields.push(label);
      }
    });

    return fields;
  }
  private toUniversityTypeEnum(value: string): UniversityTypeEnum | undefined {
    const normalized = value.trim().toUpperCase();
    return Object.values(UniversityTypeEnum).find((enumVal) => (enumVal as string).toUpperCase() === normalized);
  }
  private formatConversationHistory(history: ChatMessage[]): string {
    if (history.length === 0) return 'No previous conversation.';

    return history
      .slice(-5)
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.parts[0]?.text || ''}`)
      .join('\n');
  }

  async getValidCountries(): Promise<string[]> {
    return await this._universityService.getValidCountries();
  }
}
