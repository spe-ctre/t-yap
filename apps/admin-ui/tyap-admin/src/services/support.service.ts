import { AuthService } from './auth.service';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const supportService = {
  getAllTickets: async () => {
    const token = AuthService.getToken();
    const response = await fetch(`${API_URL}/admin/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  getFinancialRequests: async () => {
  const token = AuthService.getToken();
  const response = await fetch(`${API_URL}/admin/tickets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.message);
  return data.data;
},

  resolveTicket: async (ticketId: string, resolutionNote: string) => {
    const token = AuthService.getToken();
    const response = await fetch(`${API_URL}/admin/tickets/${ticketId}/resolve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resolutionNote }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
};