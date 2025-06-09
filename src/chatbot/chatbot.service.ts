import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage, UniversityQuery } from './dto/chatbot.dto';
import { UniversityService } from '@UniversitiesModule/university.service';
import { UniEntity } from '@UniversitiesModule/entities';
import { GetUniversityDto, UniversityTypeEnum } from '@UniversitiesModule/dto/get-university.dto';
import { ChatResponseData } from './dto/chat-request.dto';

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

  constructor(private readonly _configService: ConfigService, private readonly _universityService: UniversityService) {
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

  async chat(message: string, conversationHistory: ChatMessage[] = []): Promise<ChatResponseData> {
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

      let responseText = ''; // Changed variable name to responseText

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
        const universitySearchParams: GetUniversityDto = {
          ...(queryParams as GetUniversityDto),
          page: queryParams.page || 1,
        };

        // Search universities in database
        const universities = await this._universityService.findAll(universitySearchParams); // Using universitySearchParams here

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
        response: responseText, // Using responseText here
        timestamp: new Date().toISOString(),
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
    Analyze this user message and extract university search parameters. Return ONLY a JSON object with these possible fields:
    - search: string (university name to search for)
    - country: string[] (array of country names)
    - type: string (university type)
    - minRank: number
    - maxRank: number
    - rank: number (specific rank)
    - location: string (city/location)
    - size: "small" | "medium" | "large" | "mega_large"
    - fields: object with boolean values for: agriculturalFoodScience, artsDesign, economicsBusinessManagement, engineering, lawPoliticalScience, medicinePharmacyHealthSciences, physicalScience, socialSciencesHumanities, sportsPhysicalEducation, technology, theology
    - limit: number (default 10)

    User message: "${message}"

    Examples:
    - "Find engineering universities in USA" -> {"country": ["USA"], "fields": {"engineering": true}, "limit": 10}
    - "Top 10 universities" -> {"minRank": 1, "maxRank": 10, "limit": 10}
    - "Universities in Singapore for medicine" -> {"country": ["Singapore"], "fields": {"medicinePharmacyHealthSciences": true}}

    Return only the JSON object, no other text:
    `;

    try {
      const result = await this._model.generateContent(extractionPrompt);
      const response = result.response.text().trim();

      // Clean the response to ensure it's valid JSON and set default limit
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.limit === undefined) {
          parsed.limit = 10; // Ensure limit defaults to 10 if not provided by AI
        }
        return parsed;
      }

      return { limit: 10 }; // Fallback if no JSON found
    } catch (error) {
      this._logger.warn(`Error extracting query parameters: ${error.message}`);
      return { limit: 10 }; // Return default limit on error
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
    // This check is moved to the 'chat' method for primary handling.
    // If this function is called, it means universities.length > 0
    // if (universities.length === 0) {
    //   return "No universities found matching the criteria.";
    // }

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
