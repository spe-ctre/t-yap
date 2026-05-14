import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import { kycService } from '../services/kyc.service';

interface KYCAgent {
  id: string;
  user: { email: string; phoneNumber: string };
  firstName: string;
  lastName: string;
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  idDocumentUrl: string | null;
  createdAt: string;
}

const REJECTION_KEYWORDS = ['invalid', 'expired', 'unclear', 'fake', 'mismatch', 'incomplete', 'unreadable'];

const KYCReviewTab: React.FC = () => {
  const [agents, setAgents] = useState<KYCAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<KYCAgent | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchPendingKYC = async () => {
      try {
        const data = await kycService.getPendingKYC();
        setAgents(data);
      } catch (error) {
        console.error('Failed to fetch pending KYC:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPendingKYC();
  }, []);

  const hasKeyword = REJECTION_KEYWORDS.some(keyword =>
    rejectionReason.toLowerCase().includes(keyword)
  );
  const isReasonValid = rejectionReason.trim().length >= 10 && hasKeyword;

  const handleApprove = async () => {
    if (!selectedAgent) return;
    setProcessing(true);
    try {
      await kycService.approveKYC(selectedAgent.id);
      setAgents(prev => prev.filter(a => a.id !== selectedAgent.id));
      closeModal();
    } catch (error) {
      console.error('Failed to approve KYC:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAgent || !isReasonValid) return;
    setProcessing(true);
    try {
      await kycService.rejectKYC(selectedAgent.id, rejectionReason);
      setAgents(prev => prev.filter(a => a.id !== selectedAgent.id));
      closeModal();
    } catch (error) {
      console.error('Failed to reject KYC:', error);
    } finally {
      setProcessing(false);
    }
  };

  const closeModal = () => {
    setSelectedAgent(null);
    setAction(null);
    setRejectionReason('');
  };

  return (
    <div>
      {/* Warning Banner */}
      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-yellow-800">Pending Reviews</h3>
          <p className="text-sm text-yellow-700 mt-1">
            There are {agents.length} documents waiting for admin approval
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
            ) : agents.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-400">No pending KYC reviews.</td></tr>
            ) : agents.map((agent) => (
              <tr key={agent.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{agent.id.slice(0, 8).toUpperCase()}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{agent.user.email}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{agent.user.phoneNumber}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    {agent.kycStatus}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium space-x-2">
                  <button
                    onClick={() => { setSelectedAgent(agent); setAction('approve'); }}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => { setSelectedAgent(agent); setAction('reject'); }}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedAgent && action && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${action === 'approve' ? 'text-green-700' : 'text-red-700'}`}>
                {action === 'approve' ? '✓ Approve KYC' : '✗ Reject KYC'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-500">Email</span>
                <span className="text-sm text-gray-800">{selectedAgent.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-500">Phone</span>
                <span className="text-sm text-gray-800">{selectedAgent.user.phoneNumber}</span>
              </div>
            </div>

            {action === 'approve' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700">
                  You are about to approve this agent's KYC. This will activate their account.
                </p>
              </div>
            )}

            {action === 'reject' && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs font-semibold text-blue-700 mb-1">ℹ️ Reason must include a keyword:</p>
                  <div className="flex flex-wrap gap-1">
                    {REJECTION_KEYWORDS.map(keyword => (
                      <span key={keyword} className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        rejectionReason.toLowerCase().includes(keyword)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Document is expired and unreadable..."
                    rows={4}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      rejectionReason.length > 0 && !isReasonValid
                        ? 'border-red-400 focus:ring-red-300'
                        : isReasonValid
                        ? 'border-green-400 focus:ring-green-300'
                        : 'border-gray-300 focus:ring-orange-400'
                    }`}
                  />
                  {rejectionReason.length > 0 && !hasKeyword && (
                    <p className="text-xs text-red-500 mt-1">⚠️ Must include a keyword</p>
                  )}
                  {isReasonValid && (
                    <p className="text-xs text-green-600 mt-1">✓ Reason looks good!</p>
                  )}
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              {action === 'approve' ? (
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-40"
                >
                  {processing ? 'Approving...' : 'Confirm Approve'}
                </button>
              ) : (
                <button
                  onClick={handleReject}
                  disabled={!isReasonValid || processing}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {processing ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCReviewTab;