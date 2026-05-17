import React, { useState, useEffect } from 'react';
import { Shield, FileSearch, AlertTriangle, UserX, Activity, X, Ban, CheckCircle, AlertCircle } from 'lucide-react';
import KYCReviewTab from '../../components/KYCReviewTab';
import FraudInvestigationTab from '../../components/FraudInvestigationTab';
import { kycService } from '../../services/kyc.service';

type ComplianceTab = 'kyc' | 'fraud' | 'flagged';

// Flagged Accounts mock data (will be replaced by live API data)
interface FlaggedAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  reason: string;
  severity: 'High' | 'Medium' | 'Low';
  flagDate: string;
  status: 'Under Review' | 'Suspended' | 'Cleared';
}

const initialFlaggedAccounts: FlaggedAccount[] = [
  { id: 'USR-3041', name: 'Ibrahim Musa', email: 'ibrahim@email.com', role: 'Driver', reason: 'Multiple failed withdrawal attempts with different bank accounts', severity: 'High', flagDate: new Date(Date.now() - 7200000).toLocaleString(), status: 'Under Review' },
  { id: 'USR-5612', name: 'Grace Okonkwo', email: 'grace.ok@email.com', role: 'Agent', reason: 'KYC documents appear altered or forged', severity: 'High', flagDate: new Date(Date.now() - 86400000).toLocaleString(), status: 'Suspended' },
  { id: 'USR-1287', name: 'Samuel Adewale', email: 'sam.adew@email.com', role: 'Park Manager', reason: 'Unusually high volume of cash collections not matching trip records', severity: 'Medium', flagDate: new Date(Date.now() - 172800000).toLocaleString(), status: 'Under Review' },
  { id: 'USR-8834', name: 'Fatima Yusuf', email: 'fatima.y@email.com', role: 'Passenger', reason: 'Account used from multiple geographic locations simultaneously', severity: 'Low', flagDate: new Date(Date.now() - 345600000).toLocaleString(), status: 'Cleared' },
];

const Compliance = () => {
  const [activeTab, setActiveTab] = useState<ComplianceTab>('kyc');
  const [flaggedAccounts, setFlaggedAccounts] = useState<FlaggedAccount[]>(initialFlaggedAccounts);
  const [pendingKycCount, setPendingKycCount] = useState<number>(0);

  useEffect(() => {
    const fetchPendingKYC = async () => {
      try {
        const data = await kycService.getPendingKYC();
        setPendingKycCount(data.length);
      } catch (error) {
        console.error('Failed to fetch pending KYC count:', error);
      }
    };
    fetchPendingKYC();
  }, []);

  // Modal state for Flagged Accounts actions
  const [selectedAccount, setSelectedAccount] = useState<FlaggedAccount | null>(null);
  const [flagAction, setFlagAction] = useState<'suspend' | 'clear' | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isProcessingFlag, setIsProcessingFlag] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const activeFlags = flaggedAccounts.filter(a => a.status !== 'Cleared');

  const tabs = [
    { id: 'kyc' as ComplianceTab, label: 'KYC Reviews', icon: FileSearch, count: pendingKycCount },
    { id: 'fraud' as ComplianceTab, label: 'Fraud Cases', icon: AlertTriangle, count: 4 },
    { id: 'flagged' as ComplianceTab, label: 'Flagged Accounts', icon: UserX, count: activeFlags.length },
  ];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-orange-100 text-orange-800';
      case 'Low': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Under Review': return 'bg-blue-100 text-blue-800';
      case 'Suspended': return 'bg-red-100 text-red-800';
      case 'Cleared': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openFlagModal = (account: FlaggedAccount, action: 'suspend' | 'clear') => {
    setSelectedAccount(account);
    setFlagAction(action);
    setSuspendReason('');
  };

  const closeFlagModal = () => {
    setSelectedAccount(null);
    setFlagAction(null);
    setSuspendReason('');
  };

  const handleFlagAction = async () => {
    if (!selectedAccount || !flagAction) return;
    if (flagAction === 'suspend' && suspendReason.trim().length < 10) return;
    
    setIsProcessingFlag(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1200));

    const newStatus = flagAction === 'suspend' ? 'Suspended' : 'Cleared';
    setFlaggedAccounts(prev => prev.map(acc =>
      acc.id === selectedAccount.id ? { ...acc, status: newStatus as FlaggedAccount['status'] } : acc
    ));

    setIsProcessingFlag(false);
    closeFlagModal();
    setSuccessMsg(`Account successfully ${newStatus === 'Suspended' ? 'suspended' : 'cleared'}.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="p-8 pb-10">
      {/* Global Success Toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-2">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Compliance Hub</h1>
          </div>
          <p className="text-gray-500 mt-1 ml-11">Monitor KYC reviews, fraud investigations, and flagged accounts.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4 text-green-500" />
          System monitoring active
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 font-medium">PENDING KYC</p>
          <h2 className="text-2xl font-bold text-indigo-600 mt-1">{pendingKycCount}</h2>
          <p className="text-xs text-gray-400 mt-1">Awaiting document review</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 font-medium">OPEN FRAUD CASES</p>
          <h2 className="text-2xl font-bold text-red-600 mt-1">4</h2>
          <p className="text-xs text-gray-400 mt-1">Active investigations</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 font-medium">FLAGGED ACCOUNTS</p>
          <h2 className="text-2xl font-bold text-orange-600 mt-1">{activeFlags.length}</h2>
          <p className="text-xs text-gray-400 mt-1">Requires attention</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 font-medium">COMPLIANCE SCORE</p>
          <h2 className="text-2xl font-bold text-green-600 mt-1">94%</h2>
          <p className="text-xs text-gray-400 mt-1">Regulatory readiness</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'kyc' && <KYCReviewTab />}
          {activeTab === 'fraud' && <FraudInvestigationTab />}
          {activeTab === 'flagged' && (
            <div>
              {/* Flagged Accounts Warning */}
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800">Flagged Accounts</h3>
                  <p className="text-sm text-red-700 mt-1">
                    These accounts have been automatically or manually flagged for suspicious activity. Review each case and take appropriate action.
                  </p>
                </div>
              </div>

              {/* Flagged Accounts Table */}
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Flagged</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {flaggedAccounts.map((account) => (
                    <tr key={account.id} className={`transition-colors ${
                      account.status === 'Suspended' ? 'bg-red-50/30' : 
                      account.status === 'Cleared' ? 'bg-green-50/30' : 'hover:bg-gray-50'
                    }`}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-800">{account.name}</p>
                        <p className="text-xs text-gray-500">{account.email}</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 bg-gray-100 text-gray-600">
                          {account.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm text-gray-700 leading-snug">{account.reason}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getSeverityBadge(account.severity)}`}>
                          {account.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.flagDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(account.status)}`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {account.status === 'Cleared' ? (
                          <span className="text-gray-400 text-xs italic">No action needed</span>
                        ) : (
                          <div className="flex gap-2">
                            {account.status !== 'Suspended' && (
                              <button 
                                onClick={() => openFlagModal(account, 'suspend')}
                                className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                              >
                                Suspend
                              </button>
                            )}
                            <button 
                              onClick={() => openFlagModal(account, 'clear')}
                              className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition-colors cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ====== FLAGGED ACCOUNT ACTION MODAL ====== */}
      {selectedAccount && flagAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className={`p-6 text-center ${flagAction === 'suspend' ? 'bg-red-500' : 'bg-green-500'}`}>
              {flagAction === 'suspend' ? (
                <Ban className="w-12 h-12 text-white mx-auto mb-2" />
              ) : (
                <CheckCircle className="w-12 h-12 text-white mx-auto mb-2" />
              )}
              <h3 className="text-xl font-bold text-white">
                {flagAction === 'suspend' ? 'Suspend Account' : 'Clear Account'}
              </h3>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Account Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-5 border border-gray-100">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">User:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedAccount.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Email:</span>
                  <span className="text-sm text-gray-800">{selectedAccount.email}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500">Role:</span>
                  <span className="text-sm text-gray-800">{selectedAccount.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Severity:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getSeverityBadge(selectedAccount.severity)}`}>
                    {selectedAccount.severity}
                  </span>
                </div>
              </div>

              {/* Flag Reason */}
              <div className="mb-5 bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-orange-700 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                  Flag Reason:
                </p>
                <p className="text-sm text-orange-800">{selectedAccount.reason}</p>
              </div>

              {/* Suspend: Require reason */}
              {flagAction === 'suspend' && (
                <div className="mb-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Suspension Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Provide a detailed reason for suspending this account..."
                    rows={3}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      suspendReason.length > 0 && suspendReason.trim().length < 10
                        ? 'border-red-400 focus:ring-red-300'
                        : suspendReason.trim().length >= 10
                        ? 'border-green-400 focus:ring-green-300'
                        : 'border-gray-300 focus:ring-indigo-400'
                    }`}
                  />
                  {suspendReason.length > 0 && suspendReason.trim().length < 10 && (
                    <p className="text-xs text-red-500 mt-1">⚠️ Reason must be at least 10 characters</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    This will immediately freeze the user's ability to transact on T-Yap.
                  </p>
                </div>
              )}

              {/* Clear: Confirmation message */}
              {flagAction === 'clear' && (
                <div className="mb-5 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700">
                    You are about to clear this flag. This confirms the account has been investigated and found <strong>not guilty</strong> of suspicious activity. The user will continue operating normally.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeFlagModal}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFlagAction}
                  disabled={isProcessingFlag || (flagAction === 'suspend' && suspendReason.trim().length < 10)}
                  className={`flex-1 px-4 py-3 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                    flagAction === 'suspend'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isProcessingFlag ? (
                    'Processing...'
                  ) : flagAction === 'suspend' ? (
                    <><Ban className="w-4 h-4" /> Confirm Suspension</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Confirm Clear</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compliance;
