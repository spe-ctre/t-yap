import React, { useState, useEffect } from 'react';
import { supportService } from '../services/support.service';
import { CheckCircle, X, AlertCircle } from 'lucide-react';

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
  const [successMsg, setSuccessMsg] = useState('');

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<FinancialRequest | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);

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

  const openResolveModal = (request: FinancialRequest) => {
    setSelectedRequest(request);
    setShowResolveModal(true);
  };

  const closeResolveModal = () => {
    setSelectedRequest(null);
    setShowResolveModal(false);
  };

  const handleResolve = async () => {
    if (!selectedRequest) return;
    setResolvingId(selectedRequest.id);
    try {
      await supportService.resolveTicket(selectedRequest.id, 'resolved by admin');
      setRequests(prev =>
        prev.map(r => r.id === selectedRequest.id ? { ...r, status: 'RESOLVED' } : r)
      );
      setSuccessMsg(`Ticket ${selectedRequest.ticketId || selectedRequest.id?.substring(0, 8).toUpperCase()} successfully resolved.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('Failed to resolve request:', error);
    } finally {
      setResolvingId(null);
      closeResolveModal();
    }
  };

  return (
    <>
      {/* Local Success Toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-2">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

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
              <tr key={request.id} className={`transition-colors ${request.status === 'RESOLVED' ? 'bg-green-50/30' : 'hover:bg-gray-50'}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.ticketId || request.id?.substring(0, 8).toUpperCase()}</td>
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
                  {request.amount ? `₦${request.amount.toLocaleString()}` : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {request.status === 'RESOLVED' || request.status === 'CLOSED' || request.status === 'Reversed' || request.status === 'Completed' ? (
                    <span className="text-gray-400 italic text-xs">✓ Resolved</span>
                  ) : (
                    <button
                      onClick={() => openResolveModal(request)}
                      disabled={resolvingId === request.id}
                      className="text-green-600 hover:text-green-900 font-semibold cursor-pointer hover:underline disabled:opacity-40"
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

      {/* ====== RESOLVE MODAL ====== */}
      {showResolveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-green-500 p-6 text-center">
              <CheckCircle className="w-12 h-12 text-white mx-auto mb-2" />
              <h3 className="text-xl font-bold text-white">Resolve Financial Request</h3>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-100">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Ticket ID:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedRequest.ticketId || selectedRequest.id?.substring(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Category:</span>
                  <span className="text-xs font-semibold text-orange-600 uppercase">{selectedRequest.category}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Subject:</span>
                  <span className="text-sm text-gray-800">{selectedRequest.subject}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="text-sm text-gray-500">Amount:</span>
                  <span className="text-sm font-bold text-orange-600">{selectedRequest.amount ? `₦${selectedRequest.amount.toLocaleString()}` : 'N/A'}</span>
                </div>
              </div>

              <div className="mb-5 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Marking this request as resolved will update the ticket status. The user will be notified.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeResolveModal}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={resolvingId !== null}
                  className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {resolvingId ? 'Processing...' : <><CheckCircle className="w-4 h-4" /> Confirm Resolve</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FinancialRequestsTab;