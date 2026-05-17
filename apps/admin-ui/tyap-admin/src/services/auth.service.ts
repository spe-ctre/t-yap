const API_URL = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://localhost:3001/api';

export interface LoginResponse {
  success: boolean;
  statusCode: number;
  data: {
    user: { id: string; email: string; phoneNumber: string; role: string };
    token: string;
    isEmailVerified: boolean;
    hasTransactionPin: boolean;
  };
}

export class AuthService {
  static async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  }

  static getToken(): string | null {
    return localStorage.getItem('tyap_token');
  }

  static getUser() {
    const user = localStorage.getItem('tyap_user');
    return user ? JSON.parse(user) : null;
  }

  static setSession(token: string, user: object) {
    localStorage.setItem('tyap_token', token);
    localStorage.setItem('tyap_user', JSON.stringify(user));
  }

  static logout() {
    localStorage.removeItem('tyap_token');
    localStorage.removeItem('tyap_user');
    window.location.href = '/login';
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }
}