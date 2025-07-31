// src/modules/chatbot/chatbot.service.ts
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
import { PdfService } from './pdf.service';
import * as fs from 'fs'; // Add this import for file system operations
import * as path from 'path'; // Add this import for path manipulation
import { ExcelService } from './excel.service';
import { CsvService } from './csv.service';

interface UniversityQuery {
  type:
    | 'TOP_UNIVERSITIES_BY_COUNTRY'
    | 'GET_UNIVERSITY_BY_NAME'
    | 'GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY'
    | 'EXPORT_TOP_UNIVERSITIES_PDF'
    | 'EXPORT_TOP_UNIVERSITIES_EXCEL'
    | 'EXPORT_TOP_UNIVERSITIES_CSV'; // Add new type for Excel
  country?: string;
  limit?: number;
  universityName?: string;
  subjectName?: string;
  academicFieldName?: string;
}

export interface ChatbotReply {
  reply: string;
  sessionId: string;
  action?: 'initiate_pdf_download' | 'initiate_excel_download' | 'initiate_csv_download' | 'query_result' | 'error'; // Add 'initiate_csv_download'
  data?: any;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private genAI: GoogleGenerativeAI;
  private chatSessions: Map<string, ChatSession> = new Map();
  private model: GenerativeModel;

  constructor(
    private configService: ConfigService,
    private universityDataService: UniversityDataService,
    private pdfService: PdfService,
    private excelService: ExcelService,
    private csvService: CsvService // Inject ExcelService here
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not set in environment variables.');
      throw new Error('GEMINI_API_KEY is not set.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);

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

  async sendMessage(message: string, sessionId: string): Promise<ChatbotReply> {
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
                3.  Answering questions about universities offering specific subjects or in specific academic fields, potentially filtered by country.
                4.  Answering general university-related questions using your knowledge.
                5.  Generating a PDF report of top universities in a country when explicitly requested.
                6.  Generating an **Excel report** of top universities in a country when explicitly requested.
                7.  Generating a **CSV report** of top universities in a country when explicitly requested.


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
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "TOP_UNIVERSITIES_BY_COUNTRY", "country": "Japan", "limit": 1 } }
\`\`\`
                - User: "List the best 3 universities in USA."
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "TOP_UNIVERSITIES_BY_COUNTRY", "country": "USA", "limit": 3 } }
\`\`\`
                - User: "Tell me about top universities in Germany."
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "TOP_UNIVERSITIES_BY_COUNTRY", "country": "Germany", "limit": 5 } }
\`\`\`

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
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITY_BY_NAME", "universityName": "Harvard University" } }
\`\`\`
                - User: "What about MIT?"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITY_BY_NAME", "universityName": "Massachusetts Institute of Technology" } }
\`\`\`
                - User: "Is University of Cambridge good?"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITY_BY_NAME", "universityName": "University of Cambridge" } }
\`\`\`

                When a user asks for universities that offer a specific subject or are strong in an academic field, possibly in a specific country (e.g., "universities for computing in Korea", "study engineering in Germany"), you MUST respond with a JSON object in the following format. Ensure the JSON is valid and only contains the action and query fields.
                \`\`\`json
                {
                  "action": "query_university_data",
                  "query": {
                    "type": "GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY",
                    "subjectName": "[extracted_subject_name]", // e.g., "Computing", "Medicine". Prioritize if a specific subject is mentioned. Capitalize first letter if possible.
                    "academicFieldName": "[extracted_academic_field_name]", // e.g., "Engineering Technology", "Natural Sciences". Use if a broader field is mentioned and no specific subject. Capitalize first letter if possible.
                    "country": "[extracted_country_name]" // e.g., "Korea", "Germany". Omit if no country is mentioned. Capitalize first letter if possible.
                  }
                }
                \`\`\`
                Example queries and your expected JSON responses for universities by subject/field:
                - User: "I want to study computing in Korea, which university would you recommend me to go?"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY", "subjectName": "Computer Science", "country": "Korea" } }
\`\`\`
                - User: "I am interested in IT in Australia."
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY", "subjectName": "Information Technology", "country": "Australia" } }
\`\`\`
                - User: "Which universities offer medicine?"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY", "subjectName": "Medicine" } }
\`\`\`
                - User: "Best engineering universities in USA."
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY", "academicFieldName": "Engineering Technology", "country": "USA" } }
\`\`\`

                When a user asks to export or download a list of top universities in a country as a PDF (e.g., "export the top 20 universities in Vietnam in pdf", "download best 10 universities in France as a PDF report"), you MUST respond with a JSON object in the following format. Ensure the JSON is valid and only contains the action and query fields.
                \`\`\`json
                {
                  "action": "query_university_data",
                  "query": {
                    "type": "EXPORT_TOP_UNIVERSITIES_PDF",
                    "country": "[extracted_country_name]", // e.g., "Vietnam", "France" - capitalize first letter if possible
                    "limit": [number] // Infer the number, e.g., 20, 10. Default to 10 or 20 if not specified.
                  }
                }
                \`\`\`
                Example queries and your expected JSON responses for PDF export:
                - User: "I want to export the top 20 universities in Vietnam in pdf"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "EXPORT_TOP_UNIVERSITIES_PDF", "country": "Vietnam", "limit": 20 } }
\`\`\`
                - User: "Download best 10 universities in France as a PDF report"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "EXPORT_TOP_UNIVERSITIES_PDF", "country": "France", "limit": 10 } }
\`\`\`
                - User: "Can you give me a PDF of top universities in UK?"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "EXPORT_TOP_UNIVERSITIES_PDF", "country": "UK", "limit": 10 } }
\`\`\`

                When a user asks to export or download a list of top universities in a country as an **Excel** file (e.g., "export the top 20 universities in Vietnam to excel", "download best 10 universities in France as an Excel report"), you MUST respond with a JSON object in the following format. Ensure the JSON is valid and only contains the action and query fields.
                \`\`\`json
                {
                  "action": "query_university_data",
                  "query": {
                    "type": "EXPORT_TOP_UNIVERSITIES_EXCEL",
                    "country": "[extracted_country_name]", // e.g., "Vietnam", "France" - capitalize first letter if possible
                    "limit": [number] // Infer the number, e.g., 20, 10. Default to 10 or 20 if not specified.
                  }
                }
                \`\`\`
                Example queries and your expected JSON responses for Excel export:
                - User: "I want to export the top 20 universities in Vietnam to excel"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "EXPORT_TOP_UNIVERSITIES_EXCEL", "country": "Vietnam", "limit": 20 } }
\`\`\`
                - User: "Download best 10 universities in France as an Excel report"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "EXPORT_TOP_UNIVERSITIES_EXCEL", "country": "France", "limit": 10 } }
\`\`\`
                - User: "Can you give me an Excel file of top universities in UK?"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "EXPORT_TOP_UNIVERSITIES_EXCEL", "country": "UK", "limit": 10 } }
\`\`\`

                When a user asks to export or download a list of top universities in a country as a **CSV** file (e.g., "export the top 20 universities in Vietnam to csv", "download best 10 universities in France as a CSV report"), you MUST respond with a JSON object in the following format. Ensure the JSON is valid and only contains the action and query fields.
                \`\`\`json
                {
                  "action": "query_university_data",
                  "query": {
                    "type": "EXPORT_TOP_UNIVERSITIES_CSV",
                    "country": "[extracted_country_name]", // e.g., "Vietnam", "France" - capitalize first letter if possible
                    "limit": [number] // Infer the number, e.g., 20, 10. Default to 10 or 20 if not specified.
                  }
                }
                \`\`\`
                Example queries and your expected JSON responses for CSV export:
                - User: "I want to export the top 20 universities in Vietnam to csv"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "EXPORT_TOP_UNIVERSITIES_CSV", "country": "Vietnam", "limit": 20 } }
\`\`\`
                - User: "Download best 10 universities in France as a CSV report"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "EXPORT_TOP_UNIVERSITIES_CSV", "country": "France", "limit": 10 } }
\`\`\`
                - User: "Can you give me a CSV file of top universities in UK?"
                  Your JSON: \`\`\`json
{ "action": "query_university_data", "query": { "type": "EXPORT_TOP_UNIVERSITIES_CSV", "country": "UK", "limit": 10 } }
\`\`\`


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
      if (!chatSession) {
        throw new Error('Chat session was not initialized. This should not happen after new session creation.');
      }

      const result = await chatSession.sendMessage(message);
      const response = await result.response;
      const text = response.text();
      this.logger.log(`[Session ${sessionId}] Raw Gemini Response: "${text}"`);

      let finalReply: string = text;
      let action: ChatbotReply['action'] = 'query_result';
      let data: ChatbotReply['data'] = null;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      let jsonStringFromGemini: string | null = null;

      if (jsonMatch && jsonMatch[1]) {
        jsonStringFromGemini = jsonMatch[1];
        this.logger.debug(`[Session ${sessionId}] Extracted JSON string from Gemini: "${jsonStringFromGemini}"`);
      }

      try {
        let parsedResponse: any;
        if (jsonStringFromGemini) {
          parsedResponse = JSON.parse(jsonStringFromGemini);
        }

        if (parsedResponse && parsedResponse.action === 'query_university_data' && parsedResponse.query) {
          const query: UniversityQuery = parsedResponse.query;
          this.logger.log(`[Session ${sessionId}] Detected DB Query: ${JSON.stringify(query)}`);

          switch (query.type) {
            case 'TOP_UNIVERSITIES_BY_COUNTRY':
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
                finalReply = finalResponse.text();
                action = 'query_result';
              } else {
                finalReply = `I couldn't find any top universities for ${query.country || 'the specified criteria'}.`;
                action = 'query_result';
              }
              break;

            case 'GET_UNIVERSITY_BY_NAME':
              if (!query.universityName) {
                finalReply = 'I need a university name to search for more details.';
                action = 'query_result';
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
                  universityDetails += `  University Type: ${universityByName.type}\n`;
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

                this.logger.log(
                  `[Session ${sessionId}] DB Results for Gemini (University by Name): \n${universityDetails}`
                );

                const finalResponseResult = await chatSession.sendMessage(
                  `Based on the user's previous query, here is the university data:\n\n${universityDetails}\n\nFormulate a helpful and concise natural language answer for the user based *only* on this data. Do not add outside information or disclaimers about data. Start directly with the answer.`
                );
                const finalResponse = await finalResponseResult.response;
                finalReply = finalResponse.text();
                action = 'query_result';
              } else {
                finalReply = `I couldn't find any information for a university named "${query.universityName}". Please check the spelling or try another name.`;
                action = 'query_result';
              }
              break;

            case 'GET_UNIVERSITIES_BY_SUBJECT_AND_COUNTRY':
              if (!query.subjectName && !query.academicFieldName) {
                finalReply = 'I need a subject or academic field to search for universities.';
                action = 'query_result';
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
                finalReply = finalResponse.text();
                action = 'query_result';
              } else {
                finalReply = `I couldn't find any universities offering "${
                  query.subjectName || query.academicFieldName || 'that field'
                }" ${query.country ? `in ${query.country}` : ''}.`;
                action = 'query_result';
              }
              break;

            case 'EXPORT_TOP_UNIVERSITIES_PDF':
              const pdfCountry = query.country;
              const pdfLimit = query.limit || 10;

              if (!pdfCountry) {
                finalReply = 'Please specify a country to export top universities to PDF.';
                action = 'error';
                break;
              }

              const universitiesForPdf: UniEntity[] = await this.universityDataService.getTopUniversitiesByCountry(
                pdfCountry,
                pdfLimit
              );

              if (universitiesForPdf.length > 0) {
                try {
                  // The PdfService.generateTopUniversitiesPdf should return a Promise<string> (filename)
                  // based on your last provided pdf.service.ts
                  const filename = await this.pdfService.generateTopUniversitiesPdf(
                    universitiesForPdf,
                    pdfCountry,
                    pdfLimit
                  );

                  // Construct the download URL that the frontend will call
                  const downloadUrl = `/api/chatbot/download-pdf/${filename}`;

                  finalReply = `I've prepared a list of the top ${universitiesForPdf.length} universities in ${pdfCountry}. You can download the PDF here: [Download PDF](${downloadUrl})`;
                  action = 'initiate_pdf_download';
                  data = {
                    country: pdfCountry,
                    limit: pdfLimit,
                    downloadUrl: downloadUrl,
                    filename: filename,
                  };
                  this.logger.log(`[Session ${sessionId}] PDF download initiated. URL: ${downloadUrl}`);
                } catch (pdfError) {
                  this.logger.error(
                    `[Session ${sessionId}] Error generating or saving PDF: ${pdfError.message}`,
                    pdfError.stack
                  );
                  finalReply = `I apologize, but I encountered an error while trying to generate the PDF. Please try again later.`;
                  action = 'error';
                }
              } else {
                finalReply = `I couldn't find any top universities for ${pdfCountry} to export to PDF.`;
                action = 'query_result';
              }
              break;

            case 'EXPORT_TOP_UNIVERSITIES_EXCEL': // Existing case for Excel export
              const excelCountry = query.country;
              const excelLimit = query.limit || 10;

              if (!excelCountry) {
                finalReply = 'Please specify a country to export top universities to Excel.';
                action = 'error';
                break;
              }

              const universitiesForExcel: UniEntity[] = await this.universityDataService.getTopUniversitiesByCountry(
                excelCountry,
                excelLimit
              );

              if (universitiesForExcel.length > 0) {
                try {
                  const filename = await this.excelService.generateTopUniversitiesExcel(
                    universitiesForExcel,
                    excelCountry,
                    excelLimit
                  );

                  const downloadUrl = `/api/chatbot/download-excel/${filename}`; // Excel download URL

                  finalReply = `I've prepared a list of the top ${universitiesForExcel.length} universities in ${excelCountry}. You can download the Excel file here: [Download Excel](${downloadUrl})`;
                  action = 'initiate_excel_download'; // Signal frontend for Excel download
                  data = {
                    country: excelCountry,
                    limit: excelLimit,
                    downloadUrl: downloadUrl,
                    filename: filename,
                  };
                  this.logger.log(`[Session ${sessionId}] Excel download initiated. URL: ${downloadUrl}`);
                } catch (excelError) {
                  this.logger.error(
                    `[Session ${sessionId}] Error generating or saving Excel: ${excelError.message}`,
                    excelError.stack
                  );
                  finalReply = `I apologize, but I encountered an error while trying to generate the Excel file. Please try again later.`;
                  action = 'error';
                }
              } else {
                finalReply = `I couldn't find any top universities for ${excelCountry} to export to Excel.`;
                action = 'query_result';
              }
              break;

            case 'EXPORT_TOP_UNIVERSITIES_CSV': // NEW: Case for CSV export
              const csvCountry = query.country;
              const csvLimit = query.limit || 10;

              if (!csvCountry) {
                finalReply = 'Please specify a country to export top universities to CSV.';
                action = 'error';
                break;
              }

              const universitiesForCsv: UniEntity[] = await this.universityDataService.getTopUniversitiesByCountry(
                csvCountry,
                csvLimit
              );

              if (universitiesForCsv.length > 0) {
                try {
                  // Call the CsvService to generate the file
                  const filename = await this.csvService.generateUniversityCsv(
                    universitiesForCsv,
                    csvCountry,
                    csvLimit
                  );

                  // Construct the download URL for the frontend
                  const downloadUrl = `/api/chatbot/download-csv/${filename}`;

                  finalReply = `I've prepared a list of the top ${universitiesForCsv.length} universities in ${csvCountry}. You can download the CSV file here: [Download CSV](${downloadUrl})`;
                  action = 'initiate_csv_download'; // Signal frontend for CSV download
                  data = {
                    country: csvCountry,
                    limit: csvLimit,
                    downloadUrl: downloadUrl,
                    filename: filename,
                  };
                  this.logger.log(`[Session ${sessionId}] CSV download initiated. URL: ${downloadUrl}`);
                } catch (csvError) {
                  this.logger.error(
                    `[Session ${sessionId}] Error generating or saving CSV: ${csvError.message}`,
                    csvError.stack
                  );
                  finalReply = `I apologize, but I encountered an error while trying to generate the CSV file. Please try again later.`;
                  action = 'error';
                }
              } else {
                finalReply = `I couldn't find any top universities for ${csvCountry} to export to CSV.`;
                action = 'query_result';
              }
              break;

            default:
              finalReply = 'I received a university data query, but the specific type of query is not yet supported.';
              action = 'error';
              break;
          }
        }
      } catch (jsonError) {
        this.logger.debug(
          `[Session ${sessionId}] Failed to parse extracted JSON or process query: ${jsonError.message}`
        );
        action = 'error';
        finalReply = 'I encountered an issue understanding your request. Could you please rephrase?';
      }
      this.logger.log(`[Session ${sessionId}] Final Bot Reply: "${finalReply}" (Action: ${action})`);
      return { reply: finalReply, sessionId, action, data };
    } catch (error) {
      this.logger.error(`Error communicating with Gemini API or processing query for session ${sessionId}:`, error);
      if (error.message && error.message.includes('Content was blocked')) {
        return {
          reply:
            'I am unable to answer that question as it violates my safety guidelines. Please ask a university-related question.',
          sessionId,
          action: 'error',
        };
      }
      return {
        reply: 'Something went wrong while processing your request. Please try again.',
        sessionId,
        action: 'error',
      };
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
