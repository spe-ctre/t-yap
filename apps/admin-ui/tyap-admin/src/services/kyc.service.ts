import { AuthService } from './auth.service';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const kycService = {
  getPendingKYC: async () => {
    const token = AuthService.getToken();
    const response = await fetch(`${API_URL}/admin/kyc-pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  approveKYC: async (agentId: string) => {
    const token = AuthService.getToken();
    const response = await fetch(`${API_URL}/admin/kyc/${agentId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  rejectKYC: async (agentId: string, reason: string) => {
    const token = AuthService.getToken();
    const response = await fetch(`${API_URL}/admin/kyc/${agentId}/reject`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
};