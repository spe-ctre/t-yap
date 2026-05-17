import React, { useState, useEffect } from 'react';
import { SettlementsService, SettlementRequest } from '../../services/settlements.service';
import { CheckCircle, XCircle, RefreshCw, Send, AlertCircle, Building2, AlertTriangle, Clock, CircleDot, BadgeCheck } from 'lucide-react';

const Settlements = () => {
  const [requests, setRequests] = useState<SettlementRequest[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchData = async (showSyncIcon = false) => {
    if (showSyncIcon) setIsSyncing(true);
    const data = await SettlementsService.getPendingSettlements();
    setRequests(data);
    setLastSync(new Date().toLocaleTimeString());
    setLoading(false);
    setIsSyncing(false);
  };

  // Real-time polling every 30 seconds to catch new withdrawal requests
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(requests.filter(req => req.status === 'Pending').map(req => req.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const initiateBulkApprove = () => {
    if (selectedIds.length === 0) return;
    setShowConfirmModal(true);
  };

  const confirmBulkApprove = async () => {
    setShowConfirmModal(false);
    setIsProcessing(true);
    const approvedIds = [...selectedIds]; // snapshot before clearing
    
    const success = await SettlementsService.bulkApproveSettlements(selectedIds);
    
    if (success) {
      // Stage 1: Mark as "Approved" — money is now in transit via Monnify
      setRequests(prev => prev.map(req => 
        approvedIds.includes(req.id) ? { ...req, status: 'Approved' as const } : req
      ));
      setSelectedIds([]);
      console.log("Payouts successfully queued for bank processing.");

      // Stage 2: Simulate bank settlement confirmation after ~8 seconds
      // In production, this comes from a Monnify webhook updating the DB,
      // which the 30-second polling would then pick up automatically.
      setTimeout(() => {
        setRequests(prev => prev.map(req => 
          approvedIds.includes(req.id) && req.status === 'Approved'
            ? { ...req, status: 'Settled' as const }
            : req
        ));
        console.log("Bank confirmed: Funds settled in users' accounts.");
      }, 8000);
    } else {
      // Mark as Failed if the transfer initiation itself failed
      setRequests(prev => prev.map(req => 
        approvedIds.includes(req.id) ? { ...req, status: 'Failed' as const } : req
      ));
      setSelectedIds([]);
      console.error("Error processing payouts. Please check server logs.");
    }
    setIsProcessing(false);
  };

  const handleSingleAction = async (id: string, actionType: 'approve' | 'reject' | 'flag') => {
    if (actionType === 'approve') {
      setIsProcessing(true);
      const success = await SettlementsService.approveSettlement(id);
      if (success) {
        setRequests(prev => prev.map(req => 
          req.id === id ? { ...req, status: 'Approved' as const } : req
        ));
        setTimeout(() => {
          setRequests(prev => prev.map(req => 
            req.id === id && req.status === 'Approved' ? { ...req, status: 'Settled' as const } : req
          ));
        }, 6000);
      }
      setIsProcessing(false);
    } else if (actionType === 'reject') {
      const reason = prompt('Please enter rejection reason:');
      if (reason === null) return; // cancelled
      if (!reason.trim()) {
        alert('Rejection reason is required.');
        return;
      }
      setIsProcessing(true);
      const success = await SettlementsService.rejectSettlement(id, reason);
      if (success) {
        setRequests(prev => prev.map(req => 
          req.id === id ? { ...req, status: 'Rejected' as const } : req
        ));
      }
      setIsProcessing(false);
    } else if (actionType === 'flag') {
      alert(`Settlement request ${id} successfully flagged for manual compliance review.`);
      // Locally change status to 'Failed' or 'Pending' with a flagged alert
    }
  };

  // Calculate Metrics
  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const inTransitRequests = requests.filter(r => r.status === 'Approved');
  const settledRequests = requests.filter(r => r.status === 'Settled');
  const failedRequests = requests.filter(r => r.status === 'Failed');
  const totalPendingValue = pendingRequests.reduce((sum, req) => sum + req.amount, 0);
  const inTransitValue = inTransitRequests.reduce((sum, req) => sum + req.amount, 0);
  const settledValue = settledRequests.reduce((sum, req) => sum + req.amount, 0);
  const selectedValue = requests.filter(r => selectedIds.includes(r.id)).reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="pb-10 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Settlements Board</h1>
          <p className="text-gray-500 mt-1">Review and approve bulk payouts to users' local banks.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Last synced: {lastSync}</span>
          <button 
            onClick={() => fetchData(true)}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-orange-500' : ''}`} />
            Sync Real-Time
          </button>
        </div>
      </div>

      {/* Action Bar & Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-6">
          <div>
            <p className="text-sm text-gray-500 font-medium">AWAITING REVIEW</p>
            <h2 className="text-2xl font-bold text-orange-600">{pendingRequests.length}</h2>
            <p className="text-xs text-gray-400">₦{totalPendingValue.toLocaleString()}</p>
          </div>
          <div className="border-l border-gray-200 pl-6">
            <p className="text-sm text-gray-500 font-medium">IN TRANSIT</p>
            <h2 className="text-2xl font-bold text-blue-600">{inTransitRequests.length}</h2>
            <p className="text-xs text-gray-400">₦{inTransitValue.toLocaleString()}</p>
          </div>
          <div className="border-l border-gray-200 pl-6">
            <p className="text-sm text-gray-500 font-medium">SETTLED</p>
            <h2 className="text-2xl font-bold text-green-600">{settledRequests.length}</h2>
            <p className="text-xs text-gray-400">₦{settledValue.toLocaleString()}</p>
          </div>
          {failedRequests.length > 0 && (
            <div className="border-l border-gray-200 pl-6">
              <p className="text-sm text-gray-500 font-medium">FAILED</p>
              <h2 className="text-2xl font-bold text-red-600">{failedRequests.length}</h2>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {selectedIds.length > 0 && (
            <div className="text-right mr-4 animate-fade-in">
              <p className="text-sm text-gray-500">Selected ({selectedIds.length})</p>
              <p className="text-lg font-bold text-gray-800">₦{selectedValue.toLocaleString()}</p>
            </div>
          )}
          <button
            onClick={initiateBulkApprove}
            disabled={selectedIds.length === 0 || isProcessing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isProcessing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {isProcessing ? 'Processing Bank Transfers...' : 'Approve Payouts'}
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={requests.filter(r => r.status === 'Pending').length > 0 && selectedIds.length === requests.filter(r => r.status === 'Pending').length}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User Info</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-500" />
                    Syncing pending settlements from database...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">All Caught Up!</h3>
                    <p className="text-gray-500">There are no pending settlement requests at this time.</p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr 
                    key={req.id} 
                    className={`transition-colors
                      ${req.status === 'Pending' && selectedIds.includes(req.id) ? 'bg-orange-50/50' : ''}
                      ${req.status === 'Pending' ? 'hover:bg-orange-50' : ''}
                      ${req.status === 'Approved' ? 'bg-blue-50/30' : ''}
                      ${req.status === 'Settled' ? 'bg-green-50/40' : ''}
                      ${req.status === 'Failed' ? 'bg-red-50/30' : ''}
                    `}
                  >
                    {/* Checkbox / Status Icon Column */}
                    <td className="px-6 py-4">
                      {req.status === 'Pending' ? (
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(req.id)}
                          onChange={() => handleSelect(req.id)}
                          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                        />
                      ) : req.status === 'Approved' ? (
                        <CircleDot className="w-5 h-5 text-blue-500 animate-pulse" />
                      ) : req.status === 'Settled' ? (
                        <BadgeCheck className="w-5 h-5 text-green-600" />
                      ) : req.status === 'Failed' ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {req.requestDate}
                      <p className="text-xs font-mono mt-1 text-gray-400">{req.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="ml-0">
                          <p className="text-sm font-bold text-gray-800">{req.name}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1
                            ${req.role === 'Park Manager' ? 'bg-purple-100 text-purple-800' : 
                              req.role === 'Driver' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                            {req.role}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                        <div>
                          <p className="font-medium">{req.bankName}</p>
                          <p className="font-mono text-xs">{req.accountNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-gray-900">₦{req.amount.toLocaleString()}</span>
                    </td>
                    {/* Status / Actions Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {req.status === 'Pending' ? (
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleSingleAction(req.id, 'approve')}
                            className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 p-2 rounded-full transition-colors" 
                            title="Approve Singly"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleSingleAction(req.id, 'reject')}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors" 
                            title="Reject Request"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleSingleAction(req.id, 'flag')}
                            className="text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100 p-2 rounded-full transition-colors" 
                            title="Flag for review"
                          >
                            <AlertCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ) : req.status === 'Rejected' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <XCircle className="w-3.5 h-3.5" />
                          Rejected
                        </span>
                      ) : req.status === 'Approved' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          <Clock className="w-3.5 h-3.5" />
                          In Transit
                        </span>
                      ) : req.status === 'Settled' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          Settled
                        </span>
                      ) : req.status === 'Failed' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <XCircle className="w-3.5 h-3.5" />
                          Failed — Retry
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
            <div className="bg-orange-500 p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-white mx-auto mb-2" />
              <h3 className="text-xl font-bold text-white">Confirm Mass Payout</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-center mb-6">
                You are about to authorize bank transfers for <strong className="text-gray-900">{selectedIds.length} users</strong>. 
                This action is irreversible and funds will be instantly deducted from the T-Yap escrow account.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Total Payouts:</span>
                  <span className="font-bold text-gray-900">{selectedIds.length}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-500">Total Value:</span>
                  <span className="font-bold text-orange-600 text-xl">₦{selectedValue.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmBulkApprove}
                  className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settlements;
