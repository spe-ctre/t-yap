import { AuthService } from './auth.service';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const accountsService = {
  getAllUsers: async () => {
    const token = AuthService.getToken();
    const response = await fetch(`${API_URL}/admin/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
};