import api from './api';
import type { User } from '../types';

export const usersService = {
  async getByCompanyId(companyId: string): Promise<User[]> {
    const response = await api.get<User[]>(`/companies/${companyId}/users`);
    return response.data;
  },
};
