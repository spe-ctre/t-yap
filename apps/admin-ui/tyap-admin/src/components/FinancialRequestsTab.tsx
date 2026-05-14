import React, { useState, useEffect } from 'react';
import { supportService } from '../services/support.service';

interface FinancialRequest {
  id: string;
  ticketId: string;
  category: string;
  subject: string;
  status: string;
  amount: number;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Pending':
    case 'OPEN':
      return 'bg-red-100 text-red-700';
    case 'Reversed':
    case 'RESOLVED':
      return 'bg-green-100 text-green-700';
    case 'Completed':
    case 'CLOSED':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const FinancialRequestsTab: React.FC = () => {
  const [requests, setRequests] = useState<FinancialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await supportService.getFinancialRequests();
        setRequests(data);
      } catch (error) {
        console.error('Failed to fetch financial requests:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const handleResolve = async (id: string) => {
    if (!window.confirm('Are you sure you want to resolve this request?')) return;
    setResolvingId(id);
    try {
      await supportService.resolveTicket(id, 'resolved by admin');
      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: 'RESOLVED' } : r)
      );
    } catch (error) {
      console.error('Failed to resolve request:', error);
      alert('Failed to resolve. Please try again.');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
          ) : requests.length === 0 ? (
            <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400">No financial requests found.</td></tr>
          ) : requests.map((request) => (
            <tr key={request.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.ticketId}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-xs font-semibold text-orange-600 uppercase">{request.category}</span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">{request.subject}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(request.status)}`}>
                  {request.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {request.amount.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {request.status === 'RESOLVED' || request.status === 'CLOSED' || request.status === 'Reversed' || request.status === 'Completed' ? (
                  <span className="text-gray-400">✓ Resolved</span>
                ) : (
                  <button
                    onClick={() => handleResolve(request.id)}
                    disabled={resolvingId === request.id}
                    className="text-green-600 hover:text-green-900 disabled:opacity-40"
                  >
                    {resolvingId === request.id ? 'Resolving...' : 'Resolve'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FinancialRequestsTab;