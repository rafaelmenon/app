import api from './api';
import type { Queue } from '../types';

export const queuesService = {
  async getQueues(): Promise<Queue[]> {
    const response = await api.get<{ queues: Queue[] }>('/queues');
    return response.data.queues;
  },

  async getMyQueues(): Promise<Queue[]> {
    const response = await api.get<{ queues: Queue[] }>('/queues/me');
    return response.data.queues;
  },

  async list(): Promise<Queue[]> {
    const response = await api.get<{ queues: Queue[] }>('/queues');
    return response.data.queues;
  },

  async getByUserId(userId: string): Promise<Queue[]> {
    const response = await api.get<{ queues: Queue[] }>(`/queues/user/${userId}`);
    return response.data.queues;
  },
};
