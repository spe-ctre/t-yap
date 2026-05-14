import React, { useState, useEffect } from 'react';
import { AlertCircle, Users, CheckCircle, X } from 'lucide-react';
import FinancialRequestsTab from '../../components/FinancialRequestsTab';
import FraudInvestigationTab from '../../components/FraudInvestigationTab';
import { supportService } from '../../services/support.service';

type TabType = 'help-desk' | 'financial-requests' | 'fraud-investigation';

interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  description: string;
  user: string;
  date: string;
}

const REQUIRED_KEYWORDS = ['contacted', 'fixed', 'resolved', 'escalated', 'refunded', 'reset', 'verified', 'closed'];

const Support: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('help-desk');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await supportService.getAllTickets();
        setTickets(data);
      } catch (error) {
        console.error('Failed to fetch tickets:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const hasKeyword = REQUIRED_KEYWORDS.some(keyword =>
    resolutionNote.toLowerCase().includes(keyword)
  );

  const isNoteValid = resolutionNote.trim().length >= 10 && hasKeyword;

  const handleResolve = async () => {
    if (!selectedTicket || !isNoteValid) return;
    setResolving(true);
    try {
      await supportService.resolveTicket(selectedTicket.id, resolutionNote);
      setTickets(prev =>
        prev.map(ticket =>
          ticket.id === selectedTicket.id
            ? { ...ticket, status: 'RESOLVED' as const }
            : ticket
        )
      );
      setSelectedTicket(null);
      setResolutionNote('');
    } catch (error) {
      console.error('Failed to resolve ticket:', error);
    } finally {
      setResolving(false);
    }
  };

  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;
  const activeCount = tickets.filter(t => t.status === 'OPEN').length;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Support</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-lg shadow p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">PENDING REVIEW</span>
          </div>
          <div className="text-3xl font-bold">{activeCount} Items</div>
        </div>
        <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-lg shadow p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">ACTIVE AGENTS</span>
          </div>
          <div className="text-3xl font-bold">8 Online</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-lg shadow p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">RESOLVED TODAY</span>
          </div>
          <div className="text-3xl font-bold">{resolvedCount} Issues</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['help-desk', 'financial-requests', 'fraud-investigation'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === tab
                ? 'bg-orange-100 text-orange-700 border-b-2 border-orange-500'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab === 'help-desk' ? 'Help Desk' : tab === 'financial-requests' ? 'Financial Requests' : 'Fraud Investigation'}
          </button>
        ))}
      </div>

      {/* Help Desk Tab */}
      {activeTab === 'help-desk' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading tickets...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-400">No tickets found.</td></tr>
              ) : tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{ticket.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">
                      {ticket.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{ticket.subject}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                      ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS' ? (
                      <button
                        onClick={() => { setSelectedTicket(ticket); setResolutionNote(''); }}
                        className="px-4 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
                      >
                        Resolve
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">✓ Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'financial-requests' && <FinancialRequestsTab />}
      {activeTab === 'fraud-investigation' && <FraudInvestigationTab />}

      {/* Resolution Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Resolve Ticket</h2>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-500">Ticket ID</span>
                <span className="text-sm font-bold text-gray-800">{selectedTicket.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-500">Subject</span>
                <span className="text-sm text-gray-800">{selectedTicket.subject}</span>
              </div>
              <div className="mt-2">
                <span className="text-sm font-semibold text-gray-500">Description</span>
                <p className="text-sm text-gray-700 mt-1">{selectedTicket.description}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">ℹ️ Your note must include at least one action keyword:</p>
              <div className="flex flex-wrap gap-1">
                {REQUIRED_KEYWORDS.map(keyword => (
                  <span key={keyword} className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    resolutionNote.toLowerCase().includes(keyword)
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
                Resolution Note <span className="text-red-500">*</span>
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="e.g. Contacted user and reset their password successfully..."
                rows={4}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  resolutionNote.length > 0 && !isNoteValid
                    ? 'border-red-400 focus:ring-red-300'
                    : isNoteValid
                    ? 'border-green-400 focus:ring-green-300'
                    : 'border-gray-300 focus:ring-orange-400'
                }`}
              />
              {resolutionNote.length > 0 && !hasKeyword && (
                <p className="text-xs text-red-500 mt-1">⚠️ Note must contain an action keyword</p>
              )}
              {isNoteValid && (
                <p className="text-xs text-green-600 mt-1">✓ Note looks good!</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTicket(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!isNoteValid || resolving}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {resolving ? 'Resolving...' : 'Confirm Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;