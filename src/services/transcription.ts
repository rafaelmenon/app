import api from './api';

export interface TranscriptionResult {
  success: boolean;
  transcription: string;
  usageLimitExceeded?: boolean;
  remainingTranscriptions?: number;
}

export const transcriptionService = {
  async transcribeAudio(messageId: string): Promise<TranscriptionResult> {
    const response = await api.post<TranscriptionResult>(
      `/transcription/transcribe/${messageId}`,
      {},
      { timeout: 60000 }
    );
    return response.data;
  },

  async getTranscription(messageId: string): Promise<string | null> {
    try {
      const response = await api.get<{ transcription: string }>(
        `/transcription/transcription/${messageId}`
      );
      return response.data.transcription || null;
    } catch {
      return null;
    }
  },
};
