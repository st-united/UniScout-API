// src/chatbot/chatbot.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  GoogleGenerativeAI,
  ChatSession,
  HarmBlockThreshold,
  HarmCategory,
  GenerativeModel,
} from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { UniversityDataService } from './university-data.service';
import { UniEntity } from '@UniversitiesModule/entities';

// Define a type for structured queries Gemini will generate
interface UniversityQuery {
  type: 'TOP_UNIVERSITIES_BY_COUNTRY' | 'GET_UNIVERSITY_BY_NAME' | 'GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY';
  country?: string;
  limit?: number;
  universityName?: string;
  subjectName?: string; // <--- ADDED NEW FIELD
  academicFieldName?: string;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private genAI: GoogleGenerativeAI;
  private chatSessions: Map<string, ChatSession> = new Map();
  private model: GenerativeModel; // Declare model at class level

  constructor(private configService: ConfigService, private universityDataService: UniversityDataService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not set in environment variables.');
      throw new Error('GEMINI_API_KEY is not set.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);

    // Initialize the model here once in the constructor
    this.model = this.genAI.getGenerativeModel({
      model: 'models/gemini-1.5-flash',
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });
    this.logger.log('Initialized ChatbotService with Gemini model: models/gemini-1.5-flash');
  }

  async sendMessage(message: string, sessionId: string): Promise<{ reply: string; sessionId: string }> {
    let chatSession = this.chatSessions.get(sessionId);

    if (!chatSession) {
      this.logger.log(`Creating new chat session for ID: ${sessionId}`);

      chatSession = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [
              {
                text: `
              You are UniScout Assistant, an AI designed to help users find university information.
              Your capabilities include:
              1.  Answering questions about top universities in a specific country.
              2.  Answering questions about specific universities by name.
              3.  Answering questions about universities offering specific subjects or in specific academic fields, potentially filtered by country. // <--- NEW LINE
              4.  Answering general university-related questions using your knowledge.

              When a user asks for 'top', 'best', or 'highest-ranked' universities in a specific country, you MUST respond with a JSON object in the following format. Ensure the JSON is valid and only contains the action and query fields.
              \`\`\`json
              {
                "action": "query_university_data",
                "query": {
                  "type": "TOP_UNIVERSITIES_BY_COUNTRY",
                  "country": "[extracted_country_name]", // e.g., "Japan", "USA", "Vietnam" - capitalize first letter if possible
                  "limit": [number] // Infer a reasonable number like 1, 3, 5, or 10 based on the user's request (e.g., "top university" -> 1, "best universities" -> 5). Omit if no number is clear.
                }
              }
              \`\`\`
              Example queries and your expected JSON responses for top universities:
              - User: "What is the top university in Japan?"
                Your JSON: \`\`\`json\n{ "action": "query_university_data", "query": { "type": "TOP_UNIVERSITIES_BY_COUNTRY", "country": "Japan", "limit": 1 } }\n\`\`\`
              - User: "List the best 3 universities in USA."
                Your JSON: \`\`\`json\n{ "action": "query_university_data", "query": { "type": "TOP_UNIVERSITIES_BY_COUNTRY", "country": "USA", "limit": 3 } }\n\`\`\`
              - User: "Tell me about top universities in Germany."
                Your JSON: \`\`\`json\n{ "action": "query_university_data", "query": { "type": "TOP_UNIVERSITIES_BY_COUNTRY", "country": "Germany", "limit": 5 } }\n\`\`\`

              When a user asks about a SPECIFIC university by name (e.g., "Tell me more about Harvard University", "What is Harvard University?"), you MUST respond with a JSON object in the following format. Ensure the JSON is valid and only contains the action and query fields.
              \`\`\`json
              {
                "action": "query_university_data",
                "query": {
                  "type": "GET_UNIVERSITY_BY_NAME",
                  "universityName": "[extracted_university_name]" // e.g., "Harvard University", "Massachusetts Institute of Technology" - use the full, likely official name
                }
              }
              \`\`\`
              Example queries and your expected JSON responses for specific universities:
              - User: "Can you tell me more about Harvard University?"
                Your JSON: \`\`\`json\n{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITY_BY_NAME", "universityName": "Harvard University" } }\n\`\`\`
              - User: "What about MIT?"
                Your JSON: \`\`\`json\n{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITY_BY_NAME", "universityName": "Massachusetts Institute of Technology" } }\n\`\`\`
              - User: "Is University of Cambridge good?"
                Your JSON: \`\`\`json\n{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITY_BY_NAME", "universityName": "University of Cambridge" } }\n\`\`\`

              When a user asks for universities that offer a specific subject or are strong in an academic field, possibly in a specific country (e.g., "universities for computing in Korea", "study engineering in Germany"), you MUST respond with a JSON object in the following format. Ensure the JSON is valid and only contains the action and query fields.
              \`\`\`json
              {
                "action": "query_university_data",
                "query": {
                  "type": "GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY", // <--- NEW TYPE
                  "subjectName": "[extracted_subject_name]", // e.g., "Computing", "Medicine". Prioritize if a specific subject is mentioned. Capitalize first letter if possible.
                  "academicFieldName": "[extracted_academic_field_name]", // e.g., "Engineering Technology", "Natural Sciences". Use if a broader field is mentioned and no specific subject. Capitalize first letter if possible.
                  "country": "[extracted_country_name]" // e.g., "Korea", "Germany". Omit if no country is mentioned. Capitalize first letter if possible.
                }
              }
              \`\`\`
              Example queries and your expected JSON responses for universities by subject/field: // <--- NEW EXAMPLE SECTION
              - User: "I want to study computing in Korea, which university would you recommend me to go?"
                Your JSON: \`\`\`json\n{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY", "subjectName": "Computer Science", "country": "Korea" } }\n\`\`\`
              - User: "I am interested in IT in Australia."
              Your JSON: \`\`\`json\n{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY", "subjectName": "Information Technology", "country": "Australia" } }\n\`\`\`
              - User: "Which universities offer medicine?"
                Your JSON: \`\`\`json\n{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY", "subjectName": "Medicine" } }\n\`\`\`
              - User: "Best engineering universities in USA."
                Your JSON: \`\`\`json\n{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY", "academicFieldName": "Engineering Technology", "country": "USA" } }\n\`\`\`


              If the user's question is university-related but CANNOT be answered by a specific data query (e.g., "how to apply to college?", "what are student exchange programs?"), answer it using your general knowledge.

              If the user's question is NOT related to universities at all (e.g., "what is the capital of France?", "tell me a joke"), you MUST ONLY reply with the exact phrase: "Please ask me a university-related question".
              Do not provide any other information or context for non-university questions.
              Your responses for general university questions should be concise and helpful.
            `,
              },
            ],
          },
          {
            role: 'model',
            parts: [
              {
                text: 'Understood. I will provide university data via JSON query when appropriate, answer general university questions, and redirect non-university queries with the specified phrase.',
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 500,
        },
      });
      this.logger.log(`[Session ${sessionId}] New chat session created. Is chatSession defined: ${!!chatSession}`);
      this.chatSessions.set(sessionId, chatSession);
    }

    try {
      this.logger.log(`[Session ${sessionId}] User: "${message}"`);
      // Ensure chatSession is indeed defined before calling sendMessage
      if (!chatSession) {
        throw new Error('Chat session was not initialized. This should not happen after new session creation.');
      }

      const result = await chatSession.sendMessage(message);
      const response = await result.response;
      const text = response.text();
      this.logger.log(`[Session ${sessionId}] Raw Gemini Response: "${text}"`);

      let dbReply: string | null = null;
      let isDbQueryAttempted = false;

      // Regex to extract content from ```json block
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      let jsonStringFromGemini: string | null = null;

      if (jsonMatch && jsonMatch[1]) {
        jsonStringFromGemini = jsonMatch[1];
        this.logger.debug(`[Session ${sessionId}] Extracted JSON string from Gemini: "${jsonStringFromGemini}"`);
      }

      try {
        let parsedResponse: any;
        if (jsonStringFromGemini) {
          parsedResponse = JSON.parse(jsonStringFromGemini); // Parse the extracted JSON string
        } else {
          // If no JSON markdown block was found, it's a regular text response.
          // 'parsedResponse' will remain undefined, and the conditional check below won't trigger.
          // The original 'text' from Gemini will then be used as the final reply.
        }

        if (parsedResponse && parsedResponse.action === 'query_university_data' && parsedResponse.query) {
          isDbQueryAttempted = true;
          const query: UniversityQuery = parsedResponse.query;
          this.logger.log(`[Session ${sessionId}] Detected DB Query: ${JSON.stringify(query)}`);

          switch (query.type) {
            case 'TOP_UNIVERSITIES_BY_COUNTRY':
              // ... (existing logic for TOP_UNIVERSITIES_BY_COUNTRY)
              const universities: UniEntity[] = await this.universityDataService.getTopUniversitiesByCountry(
                query.country,
                query.limit
              );

              if (universities.length > 0) {
                let dataSummary = `Here are the top ${universities.length} universities found:\n`;
                universities.forEach((uni, index) => {
                  const rankText = uni.rank !== null && uni.rank !== undefined ? `${uni.rank}. ` : '';
                  dataSummary += `${rankText}${uni.university} in ${uni.country}\n`;
                });

                this.logger.log(`[Session ${sessionId}] DB Results for Gemini: \n${dataSummary}`);

                const finalResponseResult = await chatSession.sendMessage(
                  `Based on the user's previous query, here is the university data:\n\n${dataSummary}\n\nFormulate a helpful and concise natural language answer for the user based *only* on this data. Do not add outside information or disclaimers about data. Start directly with the answer.`
                );
                const finalResponse = await finalResponseResult.response;
                dbReply = finalResponse.text();
              } else {
                dbReply = `I couldn't find any top universities for ${query.country || 'the specified criteria'}.`;
              }
              break;

            case 'GET_UNIVERSITY_BY_NAME': // <--- NEW CASE HERE
              if (!query.universityName) {
                dbReply = 'I need a university name to search for more details.';
                break;
              }
              const universityByName: UniEntity | null = await this.universityDataService.getUniversityByName(
                query.universityName
              );

              if (universityByName) {
                let universityDetails = `Here is some information about ${universityByName.university}:\n`;
                universityDetails += `  Country: ${universityByName.country}\n`;
                if (universityByName.rank) {
                  universityDetails += `  World Rank: ${universityByName.rank}\n`;
                }
                if (universityByName.website) {
                  universityDetails += `  Website: ${universityByName.website}\n`;
                }
                if (universityByName.studentPopulation) {
                  universityDetails += `  Total Students: ${universityByName.studentPopulation}\n`;
                }
                if (universityByName.year) {
                  universityDetails += `  Year founded: ${universityByName.year}\n`;
                }
                if (universityByName.type) {
                  universityDetails += `  University Type: ${universityByName.year}\n`;
                }
                if (universityByName.location) {
                  universityDetails += `  Location: ${universityByName.location}\n`;
                }
                if (universityByName.contact) {
                  universityDetails += `  Contact: ${universityByName.contact}\n`;
                }
                if (universityByName.email) {
                  universityDetails += `  Email: ${universityByName.email}\n`;
                }
                if (universityByName.strength) {
                  universityDetails += `  University Strength: ${universityByName.strength}\n`;
                }
                if (universityByName.description) {
                  universityDetails += `  University description: ${universityByName.description}\n`;
                }
                if (universityByName.academicFields && universityByName.academicFields.length > 0) {
                  const fields = universityByName.academicFields.map((field) => field.name).join(', ');
                  universityDetails += `  Academic Fields: ${fields}\n`;
                }
                if (universityByName.subjects && universityByName.subjects.length > 0) {
                  const subjects = universityByName.subjects.map((subject) => subject.name).join(', ');
                  universityDetails += `  Popular Subjects: ${subjects}\n`;
                }
                // Add more fields here as needed from UniEntity to provide a richer summary
                // Example: if (universityByName.description) { universityDetails += `  Description: ${universityByName.description}\n`; }

                this.logger.log(
                  `[Session ${sessionId}] DB Results for Gemini (University by Name): \n${universityDetails}`
                );

                const finalResponseResult = await chatSession.sendMessage(
                  `Based on the user's previous query, here is the university data:\n\n${universityDetails}\n\nFormulate a helpful and concise natural language answer for the user based *only* on this data. Do not add outside information or disclaimers about data. Start directly with the answer.`
                );
                const finalResponse = await finalResponseResult.response;
                dbReply = finalResponse.text();
              } else {
                dbReply = `I couldn't find any information for a university named "${query.universityName}". Please check the spelling or try another name.`;
              }
              break; // <--- END OF NEW CASE
            case 'GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY': // <--- NEW CASE HERE
              if (!query.subjectName && !query.academicFieldName) {
                dbReply = 'I need a subject or academic field to search for universities.';
                break;
              }

              const universitiesBySubject: UniEntity[] =
                await this.universityDataService.getUniversitiesBySubjectAndCountry(
                  query.subjectName,
                  query.academicFieldName,
                  query.country
                );

              if (universitiesBySubject.length > 0) {
                let dataSummary = `Here are some universities for ${
                  query.subjectName || query.academicFieldName || 'your query'
                } in ${query.country || 'various countries'}:\n`;
                universitiesBySubject.forEach((uni, index) => {
                  const rankText = uni.rank !== null && uni.rank !== undefined ? ` (Rank ${uni.rank})` : '';
                  dataSummary += `- ${uni.university} in ${uni.country}${rankText}\n`;

                  // Add subjects and academic fields for each university if available
                  if (uni.academicFields && uni.academicFields.length > 0) {
                    const fields = uni.academicFields.map((field) => field.name).join(', ');
                    dataSummary += `  Academic Fields: ${fields}\n`;
                  }
                  if (uni.subjects && uni.subjects.length > 0) {
                    const subjects = uni.subjects.map((subject) => subject.name).join(', ');
                    dataSummary += `  Related Subjects: ${subjects}\n`;
                  }
                });

                this.logger.log(
                  `[Session ${sessionId}] DB Results for Gemini (Subject/Country Query): \n${dataSummary}`
                );

                const finalResponseResult = await chatSession.sendMessage(
                  `Based on the user's previous query, here is the university data:\n\n${dataSummary}\n\nFormulate a helpful and concise natural language answer for the user based *only* on this data. Do not add outside information or disclaimers about data. Start directly with the answer.`
                );
                const finalResponse = await finalResponseResult.response;
                dbReply = finalResponse.text();
              } else {
                dbReply = `I couldn't find any universities offering "${
                  query.subjectName || query.academicFieldName || 'that field'
                }" ${query.country ? `in ${query.country}` : ''}.`;
              }
              break; // <--- END OF NEW CASE
            default:
              dbReply = 'I received a university data query, but the specific type of query is not yet supported.';
              break;
          }
        }
      } catch (jsonError) {
        this.logger.debug(
          `[Session ${sessionId}] Failed to parse extracted JSON or process query: ${jsonError.message}`
        );
        // If an error occurs here, it means the *extracted* JSON was invalid,
        // or there was some other issue in processing the parsed query.
        // In this case, we proceed to use the original 'text' from Gemini.
      }

      // If a database query was processed and a reply generated, use that.
      // Otherwise, use the original text from Gemini (which could be general answer or "Please ask university related...")
      const finalReply = dbReply || text;
      this.logger.log(`[Session ${sessionId}] Final Bot Reply: "${finalReply}"`);

      return { reply: finalReply, sessionId };
    } catch (error) {
      this.logger.error(`Error communicating with Gemini API or processing query for session ${sessionId}:`, error);
      // More specific error handling for API content blocking vs. general errors
      if (error.message && error.message.includes('Content was blocked')) {
        return {
          reply:
            'I am unable to answer that question as it violates my safety guidelines. Please ask a university-related question.',
          sessionId,
        };
      }
      return { reply: 'Something went wrong while processing your request. Please try again.', sessionId };
    }
  }

  resetChatSession(sessionId: string): void {
    if (this.chatSessions.has(sessionId)) {
      this.chatSessions.delete(sessionId);
      this.logger.log(`Chat session ${sessionId} reset and removed.`);
    } else {
      this.logger.warn(`Attempted to reset non-existent session: ${sessionId}`);
    }
  }
}
