const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export class TwoFactorService {

  static async setup2FA(token: string) {
    const response = await fetch(`${API_URL}/2fa/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to setup 2FA');
    return response.json();
  }

  static async verify2FA(token: string, code: string) {
    const response = await fetch(`${API_URL}/2fa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ code })
    });
    if (!response.ok) throw new Error('Invalid verification code');
    return response.json();
  }

  static async validate2FA(userId: string, code: string) {
    const response = await fetch(`${API_URL}/2fa/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code })
    });
    if (!response.ok) throw new Error('Invalid 2FA code');
    return response.json();
  }

  static async disable2FA(token: string) {
    const response = await fetch(`${API_URL}/2fa/disable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to disable 2FA');
    return response.json();
  }
}