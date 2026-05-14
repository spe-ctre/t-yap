const API_URL = 'https://t-yap-d0rj.onrender.com/api';

export interface AuditLogEntry {
  id: string;
  adminEmail: string;
  action: string;
  details: string;
  createdAt: string;
}

export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
  const token = localStorage.getItem('tyap_token');

  const response = await fetch(`${API_URL}/audit-logs`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch audit logs');
  }

  const data = await response.json();
  return data.data;
};