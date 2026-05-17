import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, AlertTriangle, Eye, ShieldCheck } from 'lucide-react';

interface ComplianceEscalation {
  id: string;
  agentEmail: string;
  issueType: 'BIOMETRIC_MISMATCH' | 'DOCUMENT_ALTERED' | 'HIGH_RISK_IP';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  flagDate: string;
  status: 'PENDING_REVIEW' | 'BYPASSED' | 'REJECTED';
}

const initialEscalations: ComplianceEscalation[] = [
  {
    id: 'ESC-7701',
    agentEmail: 'bello.a@tyap-agent.com',
    issueType: 'BIOMETRIC_MISMATCH',
    severity: 'CRITICAL',
    description: 'Face match similarity score returned 42% (required >= 80%) on third attempt.',
    flagDate: new Date(Date.now() - 3600000).toLocaleString(),
    status: 'PENDING_REVIEW',
  },
  {
    id: 'ESC-7702',
    agentEmail: 'chinedu.o@tyap-agent.com',
    issueType: 'DOCUMENT_ALTERED',
    severity: 'HIGH',
    description: 'Metadata anomaly detected in NIN document image. Possible copy-paste modification.',
    flagDate: new Date(Date.now() - 7200000).toLocaleString(),
    status: 'PENDING_REVIEW',
  },
  {
    id: 'ESC-7703',
    agentEmail: 'samuel.d@tyap-agent.com',
    issueType: 'HIGH_RISK_IP',
    severity: 'MEDIUM',
    description: 'Agent registration initiated from an active VPN / anonymous Tor node.',
    flagDate: new Date(Date.now() - 86400000).toLocaleString(),
    status: 'PENDING_REVIEW',
  },
];

const ComplianceEscalationsTab: React.FC = () => {
  const [escalations, setEscalations] = useState<ComplianceEscalation[]>(initialEscalations);
  const [selectedEsc, setSelectedEsc] = useState<ComplianceEscalation | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showActionConfirm, setShowActionConfirm] = useState<'bypass' | 'reject' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const openReviewModal = (esc: ComplianceEscalation) => {
    setSelectedEsc(esc);
    setShowReviewModal(true);
  };

  const closeModals = () => {
    setSelectedEsc(null);
    setShowReviewModal(false);
    setShowActionConfirm(null);
    setActionReason('');
  };

  const handleAction = async () => {
    if (!selectedEsc || !showActionConfirm) return;
    if (actionReason.trim().length < 10) {
      alert('Audit trail reason must be at least 10 characters.');
      return;
    }

    setProcessing(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const finalStatus = showActionConfirm === 'bypass' ? 'BYPASSED' : 'REJECTED';
    
    setEscalations((prev) =>
      prev.map((e) => (e.id === selectedEsc.id ? { ...e, status: finalStatus as any } : e))
    );

    setSuccessMsg(`Escalation ${selectedEsc.id} successfully ${finalStatus.toLowerCase()}.`);
    setTimeout(() => setSuccessMsg(''), 3000);
    setProcessing(false);
    closeModals();
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      {successMsg && (
        <div className="fixed top-6 right-6 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-2">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Warning Alert Banner */}
      <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-pulse" />
        <div>
          <h3 className="font-semibold text-red-800">Critical Compliance Violations Awaiting Action</h3>
          <p className="text-sm text-red-700 mt-1">
            These escalations involve failed automatic onboarding biometric scans and suspected document modifications. Bypass requests must include a valid audit trail reason.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Escalation ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Violation Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Flagged</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {escalations.map((esc) => (
              <tr key={esc.id} className={`hover:bg-gray-50 transition-colors ${
                esc.status === 'BYPASSED' ? 'bg-green-50/20' : esc.status === 'REJECTED' ? 'bg-red-50/20' : ''
              }`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-800">
                  {esc.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {esc.agentEmail}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs font-semibold text-orange-600 font-mono">
                    {esc.issueType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded border ${getSeverityColor(esc.severity)}`}>
                    {esc.severity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {esc.flagDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {esc.status !== 'PENDING_REVIEW' ? (
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                      esc.status === 'BYPASSED' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {esc.status === 'BYPASSED' ? '✓ BYPASSED' : '✗ REJECTED'}
                    </span>
                  ) : (
                    <button
                      onClick={() => openReviewModal(esc)}
                      className="inline-flex items-center gap-1 bg-orange-100 hover:bg-orange-200 text-orange-600 px-3 py-1.5 rounded-lg transition-colors font-bold"
                    >
                      <Eye className="w-4 h-4" />
                      Review Escalation
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ====== DETAILED REVIEW MODAL ====== */}
      {showReviewModal && selectedEsc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-red-500 to-orange-600 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="text-xl font-bold">Compliance Dispute Review</h3>
              </div>
              <button onClick={closeModals} className="text-white hover:text-gray-200">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-semibold">Agent Account:</span>
                  <span className="font-bold text-gray-800">{selectedEsc.agentEmail}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-semibold">Escalation ID:</span>
                  <span className="font-mono text-gray-700">{selectedEsc.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-semibold">Violation Type:</span>
                  <span className="text-orange-600 font-bold">{selectedEsc.issueType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-semibold">Severity:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getSeverityColor(selectedEsc.severity)}`}>
                    {selectedEsc.severity}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500 font-semibold uppercase">System Diagnostic Details</span>
                  <p className="text-sm text-gray-700 mt-1 font-medium bg-white p-2.5 rounded border border-gray-200">
                    {selectedEsc.description}
                  </p>
                </div>
              </div>

              {!showActionConfirm ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowActionConfirm('reject')}
                    className="flex-1 px-4 py-3 border border-red-300 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
                  >
                    Reject Bypass
                  </button>
                  <button
                    onClick={() => setShowActionConfirm('bypass')}
                    className="flex-1 px-4 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
                  >
                    Approve Bypass
                  </button>
                </div>
              ) : (
                <div className="space-y-4 border-t border-gray-200 pt-4 animate-fade-in">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {showActionConfirm === 'bypass'
                        ? 'Reason for Overriding Biometric Lock'
                        : 'Reason for Upholding Compliance Suspension'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="e.g. Manually checked original physical ID document and matching photo. Verification is valid."
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {actionReason.trim().length < 10
                        ? '⚠️ Enter at least 10 characters for audit logs.'
                        : '✓ Reason length validated.'}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowActionConfirm(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleAction}
                      disabled={processing || actionReason.trim().length < 10}
                      className={`flex-1 px-4 py-2 text-white font-bold rounded-lg transition disabled:opacity-40 flex items-center justify-center gap-2 ${
                        showActionConfirm === 'bypass' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {processing ? 'Processing...' : 'Confirm Compliance Action'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ComplianceEscalationsTab;
