/// <reference path="../../shared/types/express" />
import { Request, Response, NextFunction } from 'express';
import { ChatbotService } from '../services/chatbot.service';
import { AppError } from '../../shared/utils/errors';

export class ChatbotController {
  private chatbotService: ChatbotService;

  constructor() {
    this.chatbotService = new ChatbotService();
  }

  /**
   * POST /api/support/chatbot
   * Send a message to Nick the chatbot
   */
  getResponse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message } = req.body;
      if (!message) {
        throw new AppError('Message is required', 400);
      }
      
      const response = await this.chatbotService.getResponse(message);
      res.json({ 
        success: true, 
        statusCode: 200, 
        data: response 
      });
    } catch (error) {
      next(error);
    }
  };
}
