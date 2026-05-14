import { AuthService } from './auth.service';
const API_URL = 'https://t-yap-d0rj.onrender.com/api';

export const agentService = {
  getAgents: async () => {
    const token = AuthService.getToken();
    const response = await fetch(`${API_URL}/admin/agents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
};