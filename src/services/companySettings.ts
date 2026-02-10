import api from './api';

export interface CompanySettings {
  enableClosingMessage: boolean;
  askBeforeSendingRating: boolean;
  chooseConnection?: boolean;
}

export const companySettingsService = {
  async getSettings(): Promise<CompanySettings> {
    const response = await api.get('/company-settings');
    return response.data;
  },

  async getPublicSettings(): Promise<CompanySettings> {
    const response = await api.get<{ settings: CompanySettings }>('/company-settings/public');
    return response.data.settings;
  },
};
