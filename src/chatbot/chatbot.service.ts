import { Injectable, Logger } from '@nestjs/common';
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  GenerativeModel,
  ChatSession,
  Part,
  Content,
} from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { UniversityService } from '@UniversitiesModule/university.service';
import { CountryEnum } from '@UniversitiesModule/dto/get-university.dto';
import { UniEntity } from '@UniversitiesModule/entities/uni.entity';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private genAI: GoogleGenerativeAI;
  private readonly modelName = 'gemini-1.5-flash';

  private chatSessions: Map<string, ChatSession> = new Map();

  private readonly initialChatHistory: Content[] = [
    {
      role: 'user',
      parts: [
        {
          text: `You are a helpful and friendly university information assistant named UniBot.
Your purpose is to answer questions about universities information.
You MUST ONLY answer questions based on the information provided to you.
If you don't know the answer or the information is not provided, politely state that you cannot assist with that specific query.
Avoid giving personal opinions or financial advice.`,
        },
      ],
    },
    {
      role: 'model',
      parts: [
        {
          text: `Okay, I understand!

Hello! I am UniBot, your friendly university information assistant. I'm here to help answer your questions about universities. I will only use the information I'm provided with.
How can I assist you today?`,
        },
      ],
    },
    {
      role: 'user',
      parts: [{ text: `what is the top 10 universities in korea` }],
    },
    {
      role: 'model',
      parts: [
        {
          text: `I do not have access to university ranking information. Therefore, I cannot provide a list of the top 10 universities in Korea, as this information is not in my current database.`,
        },
      ],
    },
    {
      role: 'user',
      parts: [{ text: `who is the president of singapore` }],
    },
    {
      role: 'model',
      parts: [
        {
          text: `I am designed to provide information about universities. Therefore, I cannot assist with your query about the president of Singapore.`,
        },
      ],
    },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly universityService: UniversityService // Inject UniversityService
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not set in environment variables or config.');
      throw new Error('Gemini API key is missing.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private async createNewChatSession(sessionId: string): Promise<ChatSession> {
    const model: GenerativeModel = this.genAI.getGenerativeModel({ model: this.modelName });

    const chat = model.startChat({
      history: [...this.initialChatHistory],
      generationConfig: {
        temperature: 0.5, // Lower temperature for more factual responses
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 1024, // Adjusted for potentially longer contextual responses
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    this.chatSessions.set(sessionId, chat);
    this.logger.log(`New chat session created: ${sessionId}`);
    return chat;
  }

  async sendChatMessage(sessionId: string, message: string): Promise<string> {
    let chat = this.chatSessions.get(sessionId);

    if (!chat) {
      chat = await this.createNewChatSession(sessionId);
    }

    let contextualMessage = message;
    let universityData: UniEntity | null; // Type for university data

    // Simplified Intent Recognition & Entity Extraction
    const lowerCaseMessage = message.toLowerCase();
    let detectedCountry: CountryEnum | undefined;
    let detectedUniversityName: string | undefined;

    // Basic keyword detection for countries
    if (lowerCaseMessage.includes('usa') || lowerCaseMessage.includes('united states'))
      detectedCountry = CountryEnum.USA;
    else if (lowerCaseMessage.includes('korea') || lowerCaseMessage.includes('south korea'))
      detectedCountry = CountryEnum.KOREA;
    else if (lowerCaseMessage.includes('australia')) detectedCountry = CountryEnum.AUSTRALIA;
    else if (lowerCaseMessage.includes('india')) detectedCountry = CountryEnum.INDIA;
    else if (lowerCaseMessage.includes('japan')) detectedCountry = CountryEnum.JAPAN;
    else if (lowerCaseMessage.includes('vietnam')) detectedCountry = CountryEnum.VIETNAM;

    // Basic keyword detection for university names (expand as needed)
    // This is a placeholder and should be replaced with more robust NLP or a list of known universities.
    const knownUniversities = [
      'harvard',
      'stanford',
      'mit', // USA
      'seoul national university',
      'korea university',
      'yonsei university', // Korea
      'university of melbourne',
      'sydney university', // Australia
      // ... add more as per your database
    ];

    for (const uniName of knownUniversities) {
      if (lowerCaseMessage.includes(uniName)) {
        detectedUniversityName = uniName;
        break;
      }
    }

    // If both country and university name are detected, attempt database lookup
    if (detectedCountry && detectedUniversityName) {
      try {
        universityData = await this.universityService.findUniversityByNameAndCountry(
          detectedUniversityName,
          detectedCountry
        );

        if (universityData) {
          // Construct a rich contextual prompt from database data
          contextualMessage =
            `The user is asking about a university. Here is the information I have about ${universityData.university} in ${universityData.country}:\n\n` +
            `**Name**: ${universityData.university}\n` +
            `**Country**: ${universityData.country}\n` +
            `**Location**: ${universityData.location || 'N/A'}\n` +
            `**Website**: ${universityData.website || 'N/A'}\n` +
            `**Description**: ${universityData.description || 'No detailed description available.'}\n` +
            `**Contact Email**: ${universityData.email || 'N/A'}\n` +
            `**Contact Phone**: ${universityData.contact || 'N/A'}\n` +
            `**Established Year**: ${universityData.year || 'N/A'}\n` +
            `**Number of Students**: ${universityData.student || 'N/A'}\n` +
            `Based ONLY on the above information, please answer the user's question: "${message}"`;
        } else {
          this.logger.warn(
            `University "${detectedUniversityName}" not found in ${detectedCountry} database. Proceeding with general prompt.`
          );
        }
      } catch (dbError) {
        this.logger.error(`Error querying university database: ${dbError.message}`, dbError.stack);
        // Fallback: Continue with the original message if database query fails
      }
    }

    try {
      this.logger.debug(`Sending message to Gemini for session ${sessionId}: "${contextualMessage}"`);
      const result = await chat.sendMessage(contextualMessage);
      const response = await result.response;
      const text = response.text();
      this.logger.log(`Gemini response for session ${sessionId}: "${text}"`);
      return text;
    } catch (error) {
      this.logger.error(
        `Error sending chat message to Gemini API for session ${sessionId}: ${error.message}`,
        error.stack
      );
      if (error.response && error.response.candidates && error.response.candidates.length > 0) {
        this.logger.error(
          'Gemini Candidate Block Reason:',
          JSON.stringify(error.response.candidates[0].safetyRatings, null, 2)
        );
      }
      throw new Error('Failed to get response from AI chatbot. Please try again.');
    }
  }

  async getSingleResponse(message: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      // For single response, you might also want to do a quick lookup if appropriate
      const contents: Content[] = [...this.initialChatHistory, { role: 'user', parts: [{ text: message }] }];

      const result = await model.generateContent({
        contents: contents,
        generationConfig: {
          temperature: 0.5,
          topK: 1,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      });
      const response = await result.response;
      return response.text();
    } catch (error) {
      this.logger.error(`Error getting single response from Gemini API: ${error.message}`, error.stack);
      throw new Error('Failed to get response from AI chatbot.');
    }
  }
}
