import api from './api';
import type { Message } from '../types';

export interface MessagesResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

export const messagesService = {
  async getMessagesByTicket(
    ticketId: string,
    page = 1,
    limit = 20
  ): Promise<MessagesResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get<MessagesResponse>(
      `/messages/ticket/${ticketId}?${params.toString()}`
    );
    return response.data;
  },

  async sendTextMessage(
    ticketId: string,
    content: string
  ): Promise<{ message: string; data: any }> {
    const response = await api.post(`/messages/send-text/${ticketId}`, {
      content,
    });
    return response.data;
  },

  async sendMediaMessage(
    ticketId: string,
    fileBase64: string,
    fileName: string,
    mimeType: string,
    caption?: string
  ): Promise<{ message: string; data: any }> {
    const response = await api.post(
      `/messages/send-media/${ticketId}`,
      { fileBase64, fileName, mimeType, caption },
      { timeout: 300000 }
    );
    return response.data;
  },

  async sendAudioMessage(
    ticketId: string,
    audioBase64: string
  ): Promise<{ message: string; data: any }> {
    const response = await api.post(
      `/messages/send-audio/${ticketId}`,
      { audioBase64 },
      { timeout: 120000 }
    );
    return response.data;
  },

  async markAsRead(ticketId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/messages/mark-as-read/${ticketId}`);
    return response.data;
  },
};
