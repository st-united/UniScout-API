// src/modules/chatbot/chatbot.service.ts
import { Injectable, Logger } from '@nestjs/common';
// IMPORTANT: Use '@google/generative-ai', NOT '@google/genai'
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory, GenerativeModel, ChatSession, Part, Content } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private genAI: GoogleGenerativeAI;
  // Use the exact model name from your AI Studio snippet
  private readonly modelName = 'gemini-1.5-flash';

  // Using a Map for simple in-memory session management. For production, consider a database or Redis.
  // The ChatSession type helps with autocompletion and type safety
  private chatSessions: Map<string, ChatSession> = new Map();

  // Define your initial history and system instruction as a constant
  // This will be used to initialize *each new chat session*
  private readonly initialChatHistory: Content[] = [
    // Your AI Studio's 'System Instruction' or initial Model response can go here.
    // The format is { role: 'user' | 'model', parts: [{ text: '...' }] }
    // The very first user message in AI Studio often represents the system instruction
    // if you didn't have a dedicated system instruction box.
    // Based on your snippet, your initial "user" part looks like your system instruction.
    {
      role: 'user',
      parts: [
        {
          text: `You are a helpful and friendly university information assistant named UniBot.
Your purpose is to answer questions about universities information.
Be concise, accurate, and professional.
If you don't know the answer, politely state that you cannot assist with that specific query.
Avoid giving personal opinions or financial advice.`,
        },
      ],
    },
    {
      role: 'model',
      parts: [
        {
          text: `Okay, I understand!

Hello! I am UniBot, your friendly university information assistant. I'm here to help answer your questions about universities based on the information in our database.

Please feel free to ask me anything related to university programs, admissions, campus life, or other relevant topics. I'll do my best to provide concise, accurate, and professional responses. If I don't have the information you're looking for, I'll let you know that I cannot assist with that specific query.

How can I assist you today?`,
        },
      ],
    },
    // Add your other examples here from the `contents` array of your AI Studio snippet
    // For example, the user asking about top 10 universities and the model's response:
    {
      role: 'user',
      parts: [
        { text: `what is the top 10 universities in korea` },
      ],
    },
    {
      role: 'model',
      parts: [
        { text: `I do not have access to university ranking information at this time. Therefore, I cannot provide a list of the top 10 universities in Korea.\n\nIs there anything else I can help you with regarding university information that might be in our database?` },
      ],
    },
    {
      role: 'user',
      parts: [
        { text: `who is the president of singapore` },
      ],
    },
    {
      role: 'model',
      parts: [
        { text: `I am designed to provide information about universities. Therefore, I cannot assist with your query about the president of Singapore.\n\nIs there anything university-related I can help you with?` },
      ],
    },
  ];

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY'); // Access key directly from process.env via ConfigService
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not set in environment variables or config.');
      throw new Error('Gemini API key is missing.');
    }
    // Initialize the Generative AI client
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // Method to start a new chat session, pre-loading with the defined initial history
  private async createNewChatSession(sessionId: string): Promise<ChatSession> {
    const model: GenerativeModel = this.genAI.getGenerativeModel({ model: this.modelName });

    const chat = model.startChat({
      history: [...this.initialChatHistory], // Use spread to create a copy for each new session
      generationConfig: {
        // Copy these values from your AI Studio snippet's 'config' or 'generationConfig' if it had one
        // Your snippet shows 'responseMimeType: text/plain' in 'config', which is fine.
        // For conversational responses, you usually want default text/plain.
        // If AI Studio displayed temperature/topK/topP/maxOutputTokens in its 'Get code'
        // section, include them here as they were.
        // Example:
        temperature: 1, // Adjust this based on your AI Studio settings (e.g., you previously had 1.0)
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 65536,
      },
      safetySettings: [
        // Include any safety settings you configured in AI Studio here
        // Example:
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

  // Method to send a message within a specific chat session
  async sendChatMessage(sessionId: string, message: string): Promise<string> {
    let chat = this.chatSessions.get(sessionId);

    // If session doesn't exist, create a new one
    if (!chat) {
      chat = await this.createNewChatSession(sessionId);
    }

    try {
      this.logger.debug(`Sending message to Gemini for session ${sessionId}: "${message}"`);
      // The core call to Gemini
      const result = await chat.sendMessage(message);
      const response = await result.response;
      const text = response.text();
      this.logger.log(`Gemini response for session ${sessionId}: "${text}"`);
      return text;
    } catch (error) {
      this.logger.error(`Error sending chat message to Gemini API for session ${sessionId}: ${error.message}`, error.stack);
      // Log the full error from Gemini if available for debugging
      if (error.response && error.response.candidates && error.response.candidates.length > 0) {
        this.logger.error('Gemini Candidate Block Reason:', JSON.stringify(error.response.candidates[0].safetyRatings, null, 2));
      }
      throw new Error('Failed to get response from AI chatbot. Please try again.');
    }
  }

  // Optional: If you only need single-turn messages without persistent history per session
  async getSingleResponse(message: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      // The content here should be the initial system instruction + the user's message
      const contents: Content[] = [
        ...this.initialChatHistory, // Include initial persona/history
        { role: 'user', parts: [{ text: message }] }
      ];

      const result = await model.generateContent({
        contents: contents,
        generationConfig: {
          temperature: 1, // You can adjust this for single-turn too
          topK: 1,
          topP: 0.95,
          maxOutputTokens: 65536,
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