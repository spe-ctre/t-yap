import React, { useState } from 'react';
import { X, CheckCircle, Search, AlertCircle } from 'lucide-react';

interface FraudCase {
  walletId: string;
  category: 'APP ISSUE' | 'FRAUD' | 'SUSPICIOUS ACTIVITY';
  subject: string;
  status: 'Open' | 'Investigating' | 'Resolved';
}

const initialFraudCases: FraudCase[] = [
  {
    walletId: '8015357586',
    category: 'APP ISSUE',
    subject: 'Unable to login to driver app',
    status: 'Open',
  },
  {
    walletId: '8015357586',
    category: 'APP ISSUE',
    subject: 'Payment not reflecting',
    status: 'Open',
  },
  {
    walletId: '8015357586',
    category: 'APP ISSUE',
    subject: 'Biometric scan failed',
    status: 'Open',
  },
  {
    walletId: '8015357586',
    category: 'APP ISSUE',
    subject: 'Incorrect Password',
    status: 'Open',
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Open':
      return 'bg-green-100 text-green-700';
    case 'Investigating':
      return 'bg-yellow-100 text-yellow-700';
    case 'Resolved':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const FraudInvestigationTab: React.FC = () => {
  const [cases, setCases] = useState<FraudCase[]>(initialFraudCases);

  // Modal state for Resolve action
  const [selectedCase, setSelectedCase] = useState<FraudCase | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Modal state for Investigate action
  const [showInvestigateModal, setShowInvestigateModal] = useState(false);

  const handleStartInvestigation = (fraudCase: FraudCase) => {
    setSelectedCase(fraudCase);
    setShowInvestigateModal(true);
  };

  const confirmInvestigation = async () => {
    if (!selectedCase) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    setCases(prev => prev.map(c =>
      c.walletId === selectedCase.walletId && c.subject === selectedCase.subject
        ? { ...c, status: 'Investigating' as const }
        : c
    ));

    console.log(`Investigation started for case: ${selectedCase.subject}`);
    setIsProcessing(false);
    setShowInvestigateModal(false);
    setSelectedCase(null);
    setSuccessMsg('Investigation started successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleResolve = (fraudCase: FraudCase) => {
    setSelectedCase(fraudCase);
    setResolutionNotes('');
    setShowResolveModal(true);
  };

  const confirmResolve = async () => {
    if (!selectedCase || resolutionNotes.trim().length < 10) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    setCases(prev => prev.map(c =>
      c.walletId === selectedCase.walletId && c.subject === selectedCase.subject
        ? { ...c, status: 'Resolved' as const }
        : c
    ));

    console.log(`Case resolved: ${selectedCase.subject}. Notes: ${resolutionNotes}`);
    setIsProcessing(false);
    setShowResolveModal(false);
    setSelectedCase(null);
    setResolutionNotes('');
    setSuccessMsg('Case resolved successfully.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const closeModal = () => {
    setShowResolveModal(false);
    setShowInvestigateModal(false);
    setSelectedCase(null);
    setResolutionNotes('');
  };

  return (
    <div>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wallet ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cases.map((fraudCase, index) => (
              <tr key={index} className={`transition-colors ${
                fraudCase.status === 'Resolved' ? 'bg-blue-50/30' : 
                fraudCase.status === 'Investigating' ? 'bg-yellow-50/30' : 'hover:bg-gray-50'
              }`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {fraudCase.walletId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs font-semibold text-orange-600 uppercase">
                    {fraudCase.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {fraudCase.subject}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {fraudCase.status === 'Open' ? (
                    <button
                      onClick={() => handleStartInvestigation(fraudCase)}
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:ring-2 hover:ring-green-300 transition-all ${getStatusBadge(fraudCase.status)}`}
                      title="Click to start investigation"
                    >
                      {fraudCase.status}
                    </button>
                  ) : (
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(fraudCase.status)}`}
                    >
                      {fraudCase.status}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {fraudCase.status === 'Resolved' ? (
                    <span className="text-gray-400 text-xs italic">Case closed</span>
                  ) : (
                    <button 
                      onClick={() => handleResolve(fraudCase)}
                      className="text-green-600 hover:text-green-900 font-semibold cursor-pointer hover:underline"
                    >
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ====== INVESTIGATE MODAL ====== */}
      {showInvestigateModal && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-yellow-500 p-6 text-center">
              <Search className="w-12 h-12 text-white mx-auto mb-2" />
              <h3 className="text-xl font-bold text-white">Start Investigation</h3>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-100">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Wallet ID:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedCase.walletId}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Category:</span>
                  <span className="text-xs font-semibold text-orange-600 uppercase">{selectedCase.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Subject:</span>
                  <span className="text-sm text-gray-800">{selectedCase.subject}</span>
                </div>
              </div>

              <div className="mb-5 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Setting this case to <strong>"Investigating"</strong> assigns it to you. Other officers will see it's being actively worked on.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmInvestigation}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-yellow-500 text-white font-semibold rounded-xl hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {isProcessing ? 'Updating...' : <><Search className="w-4 h-4" /> Begin Investigation</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== RESOLVE MODAL ====== */}
      {showResolveModal && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-green-500 p-6 text-center">
              <CheckCircle className="w-12 h-12 text-white mx-auto mb-2" />
              <h3 className="text-xl font-bold text-white">Resolve Case</h3>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-100">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Wallet ID:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedCase.walletId}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Category:</span>
                  <span className="text-xs font-semibold text-orange-600 uppercase">{selectedCase.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Subject:</span>
                  <span className="text-sm text-gray-800">{selectedCase.subject}</span>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Resolution Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Document how this case was resolved (e.g., 'User confirmed password reset via support call. Issue was a typo in email address.')..."
                  rows={4}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    resolutionNotes.length > 0 && resolutionNotes.trim().length < 10
                      ? 'border-red-400 focus:ring-red-300'
                      : resolutionNotes.trim().length >= 10
                      ? 'border-green-400 focus:ring-green-300'
                      : 'border-gray-300 focus:ring-green-400'
                  }`}
                />
                {resolutionNotes.length > 0 && resolutionNotes.trim().length < 10 && (
                  <p className="text-xs text-red-500 mt-1">⚠️ Notes must be at least 10 characters for audit purposes</p>
                )}
                {resolutionNotes.trim().length >= 10 && (
                  <p className="text-xs text-green-600 mt-1">✓ Resolution notes look good</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResolve}
                  disabled={isProcessing || resolutionNotes.trim().length < 10}
                  className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Resolving...' : <><CheckCircle className="w-4 h-4" /> Confirm Resolution</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FraudInvestigationTab;