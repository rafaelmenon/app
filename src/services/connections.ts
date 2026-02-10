import api from './api';

export interface WhatsAppConnection {
  id: string;
  name: string;
  color: string;
  evolutionName: string;
  status: string;
  isDefault: boolean;
}

export const connectionsService = {
  async list(): Promise<WhatsAppConnection[]> {
    const response = await api.get<{ connections: WhatsAppConnection[] }>('/whatsapp-connections');
    const connections = response.data.connections || [];
    return connections.filter((conn) => conn.status === 'CONNECTED');
  },
};
