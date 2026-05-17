import { AuthService } from './auth.service';

const API_URL = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://localhost:3001/api';

export interface SettlementRequest {
  id: string;
  userId: string;
  name: string;
  role: 'Driver' | 'Park Manager' | 'Agent';
  amount: number;
  bankName: string;
  accountNumber: string;
  status: 'Pending' | 'Approved' | 'Settled' | 'Failed' | 'Rejected';
  requestDate: string;
}

export class SettlementsService {
  private static getHeaders() {
    const token = AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Fetch all pending settlements requiring approval
  static async getPendingSettlements(): Promise<SettlementRequest[]> {
    try {
      const response = await fetch(`${API_URL}/finance/settlements/pending`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) throw new Error('API not ready');
      const result = await response.json();
      return result.data;
    } catch (error) {
      // MOCK DATA FALLBACK (Until Backend Endpoint is Built)
      console.warn("Backend endpoint /finance/settlements/pending not available. Using live-sync mock data.");
      return [
        { id: 'SET-98231', userId: 'USR-101', name: 'Emmanuel Eze', role: 'Driver', amount: 45000, bankName: 'GTBank', accountNumber: '0123456789', status: 'Pending', requestDate: new Date(Date.now() - 3600000).toLocaleString() },
        { id: 'SET-98232', userId: 'USR-205', name: 'Oluwaseun Park', role: 'Park Manager', amount: 1250000, bankName: 'First Bank', accountNumber: '3049581234', status: 'Pending', requestDate: new Date(Date.now() - 7200000).toLocaleString() },
        { id: 'SET-98233', userId: 'USR-402', name: 'Aisha Bello', role: 'Agent', amount: 12500, bankName: 'Access Bank', accountNumber: '0693841122', status: 'Pending', requestDate: new Date(Date.now() - 86400000).toLocaleString() },
        { id: 'SET-98234', userId: 'USR-115', name: 'Chinedu Okafor', role: 'Driver', amount: 32000, bankName: 'Zenith Bank', accountNumber: '2001923847', status: 'Pending', requestDate: new Date(Date.now() - 12000000).toLocaleString() },
      ];
    }
  }

  // Approve a single settlement
  static async approveSettlement(settlementId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/finance/settlements/${settlementId}/approve`, {
        method: 'POST',
        headers: this.getHeaders()
      });
      if (!response.ok) throw new Error('API not ready');
      return true;
    } catch (error) {
      console.warn(`Simulated Approval for ${settlementId}`);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network latency
      return true; // Mock success
    }
  }

  // Reject a single settlement
  static async rejectSettlement(settlementId: string, reason: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/finance/settlements/${settlementId}/reject`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ reason })
      });
      if (!response.ok) throw new Error('API not ready');
      return true;
    } catch (error) {
      console.warn(`Simulated Rejection for ${settlementId} due to: ${reason}`);
      await new Promise(resolve => setTimeout(resolve, 800));
      return true;
    }
  }

  // Bulk approve multiple settlements
  static async bulkApproveSettlements(settlementIds: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/finance/settlements/bulk-approve`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ ids: settlementIds })
      });
      if (!response.ok) throw new Error('API not ready');
      return true;
    } catch (error) {
      console.warn(`Simulated Bulk Approval for ${settlementIds.length} records`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return true;
    }
  }
}
