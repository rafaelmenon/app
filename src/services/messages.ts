import api from './api';
import type { Message } from '../types';

export interface MessagesResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

// Interface para progresso de upload via socket
export interface MediaUploadProgress {
  ticketId: string;
  userId: string;
  companyId: string;
  fileName: string;
  fileSize: number;
  stage: 'uploading' | 's3_uploading' | 's3_completed' | 'whatsapp_sending' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
  timestamp: string;
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
    content: string,
    isWhisper: boolean = false,
  ): Promise<{ message: string; data: any }> {
    const payload: any = { content };
    payload.isWhisper = isWhisper;
    const response = await api.post(`/messages/send-text/${ticketId}`, payload);
    return response.data;
  },

  // Envio de mídia usando FormData (mais eficiente que Base64)
  async sendMediaMessage(
    ticketId: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    caption?: string,
    onUploadProgress?: (progress: number) => void
  ): Promise<{ message: string; data: any }> {
    const formData = new FormData();

    // Adicionar arquivo ao FormData
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    if (caption) {
      formData.append('caption', caption);
    }

    const response = await api.post(
      `/messages/send-media/${ticketId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 600000, // 10 minutos para arquivos grandes
        onUploadProgress: (progressEvent) => {
          if (onUploadProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onUploadProgress(percentCompleted);
          }
        },
      }
    );
    return response.data;
  },

  // Método legado com Base64 (mantido para compatibilidade)
  async sendMediaMessageBase64(
    ticketId: string,
    fileBase64: string,
    fileName: string,
    mimeType: string,
    caption?: string
  ): Promise<{ message: string; data: any }> {
    const response = await api.post(
      `/messages/send-media/${ticketId}`,
      { fileBase64, fileName, mimeType, caption },
      { timeout: 600000 }
    );
    return response.data;
  },

  async sendAudioMessage(
    ticketId: string,
    audioUri: string
  ): Promise<{ message: string; data: any }> {
    const formData = new FormData();

    formData.append('file', {
      uri: audioUri,
      name: `audio_${Date.now()}.m4a`,
      type: 'audio/mp4',
    } as any);

    const response = await api.post(
      `/messages/send-media/${ticketId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutos
      }
    );
    return response.data;
  },

  // Método legado com Base64 para áudio (mantido para compatibilidade)
  async sendAudioMessageBase64(
    ticketId: string,
    audioBase64: string
  ): Promise<{ message: string; data: any }> {
    const response = await api.post(
      `/messages/send-audio/${ticketId}`,
      { audioBase64 },
      { timeout: 300000 }
    );
    return response.data;
  },

  async markAsRead(ticketId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/messages/mark-as-read/${ticketId}`);
    return response.data;
  },
};
