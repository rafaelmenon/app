import api from './api';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  countryCode: string;
  profilePicture?: string | null;
  isValidated: boolean;
}

export interface CreateContactData {
  name: string;
  phone: string;
  countryCode: string;
}

export interface ContactsResponse {
  contacts: Contact[];
  total?: number;
}

export const contactsService = {
  async list(search?: string, limit = 50): Promise<Contact[]> {
    const params = new URLSearchParams();
    params.append('page', '1');
    params.append('limit', limit.toString());
    if (search?.trim()) {
      params.append('search', search.trim());
    }
    const response = await api.get(`/contacts?${params.toString()}`);
    const data = response.data;
    return data.contacts || [];
  },

  async create(data: CreateContactData): Promise<Contact> {
    const response = await api.post<{ contact: Contact }>('/contacts', data);
    return response.data.contact;
  },
};
