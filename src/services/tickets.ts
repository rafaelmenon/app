import api from './api';
import type { Ticket, TicketStatus } from '../types';

export interface TicketsResponse {
  tickets: Ticket[];
  total: number;
  hasMore: boolean;
}

export const ticketsService = {
  async getTickets(
    status?: TicketStatus,
    page = 1,
    limit = 15,
    isGroup?: boolean,
    showAll = false,
    queueIds?: string[],
    includeNoQueue = false
  ): Promise<TicketsResponse> {
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }
    if (isGroup !== undefined) {
      params.append('isGroup', isGroup.toString());
    }
    if (showAll) {
      params.append('showAll', 'true');
    }
    // SEMPRE enviar queueIds quando definido (mesmo se vazio) para que o backend
    // saiba que é uma seleção consciente do usuário e respeite o includeNoQueue
    if (queueIds !== undefined) {
      params.append('queueIds', queueIds.join(','));
    }
    if (includeNoQueue) {
      params.append('includeNoQueue', 'true');
    }
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const url = `/tickets${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get<TicketsResponse>(url);
    return response.data;
  },

  async updateTicket(id: string, data: { status?: TicketStatus; queueId?: string | null; userId?: string | null }): Promise<Ticket> {
    const response = await api.put<{ ticket: Ticket }>(`/tickets/${id}`, data);
    return response.data.ticket;
  },

  async updateStatus(id: string, status: TicketStatus): Promise<Ticket> {
    const response = await api.patch<{ ticket: Ticket }>(
      `/tickets/${id}/status`,
      { status }
    );
    return response.data.ticket;
  },

  async closeTicket(id: string, sendClosingMessage?: boolean, sendRatingMessage?: boolean): Promise<Ticket> {
    const response = await api.patch<{ ticket: Ticket }>(
      `/tickets/${id}/close`,
      { sendClosingMessage, sendRatingMessage }
    );
    return response.data.ticket;
  },

  async searchGlobal(query: string, limit = 50): Promise<Ticket[]> {
    const params = new URLSearchParams();
    params.append('query', query);
    params.append('limit', limit.toString());
    params.append('searchMessages', 'false');
    const response = await api.get<Ticket[]>(`/tickets/search?${params.toString()}`);
    return response.data;
  },

  async markAsRead(id: string): Promise<Ticket> {
    const response = await api.patch<{ ticket: Ticket }>(
      `/tickets/${id}/mark-read`
    );
    return response.data.ticket;
  },

  async transferTicket(
    id: string,
    data: {
      userId?: string | null;
      queueId?: string | null;
      observation?: string;
    }
  ): Promise<Ticket> {
    const response = await api.post<{ ticket: Ticket }>(
      `/tickets/${id}/transfer`,
      data
    );
    return response.data.ticket;
  },

  async findOrCreateByContact(
    contactId: string,
    queueId?: string,
    connectionId?: string
  ): Promise<{
    ticket: Ticket;
    created: boolean;
    reopened?: boolean;
    alreadyOpen?: boolean;
    message?: string;
  }> {
    const response = await api.post<{
      ticket: Ticket;
      created: boolean;
      reopened?: boolean;
      alreadyOpen?: boolean;
      message?: string;
    }>('/tickets/find-or-create', { contactId, queueId, connectionId });
    return response.data;
  },
};
