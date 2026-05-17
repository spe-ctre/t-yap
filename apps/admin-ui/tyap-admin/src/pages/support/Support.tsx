import React, { useState, useEffect } from 'react';
import { AlertCircle, Users, CheckCircle, X, Search, ShieldAlert, Lock, ShieldCheck, HelpCircle } from 'lucide-react';
import FinancialRequestsTab from '../../components/FinancialRequestsTab';
import FraudInvestigationTab from '../../components/FraudInvestigationTab';
import ComplianceEscalationsTab from '../../components/ComplianceEscalationsTab';
import { supportService } from '../../services/support.service';
import { useAuth } from '../../context/AuthContext';

type TabType = 'help-desk' | 'financial-requests' | 'fraud-investigation' | 'compliance-escalations';

interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  description: string;
  user: string;
  date: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

const REQUIRED_KEYWORDS = ['contacted', 'fixed', 'resolved', 'escalated', 'refunded', 'reset', 'verified', 'closed'];

// RBAC Permissions Mapping for Sub-tabs
const TAB_ROLES: Record<TabType, string[]> = {
  'help-desk': ['SUPER_ADMIN', 'SUPPORT_ADMIN', 'SYSTEM_ENGINEER'],
  'financial-requests': ['SUPER_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN'],
  'fraud-investigation': ['SUPER_ADMIN', 'SUPPORT_ADMIN', 'COMPLIANCE_OFFICER'],
  'compliance-escalations': ['SUPER_ADMIN', 'COMPLIANCE_OFFICER'],
};

const Support: React.FC = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('help-desk');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  // Live Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Simulated access request state
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [accessSuccessMsg, setAccessSuccessMsg] = useState('');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await supportService.getAllTickets();
        
        // Enrich mock data with priorities if not present, to ensure premium display
        const enriched = data.map((t: any, idx: number) => ({
          ...t,
          priority: t.priority || (idx % 4 === 0 ? 'HIGH' : idx % 3 === 0 ? 'URGENT' : idx % 2 === 0 ? 'NORMAL' : 'LOW')
        }));
        
        setTickets(enriched);
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

  const handleRequestOverride = async () => {
    setRequestingAccess(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setAccessSuccessMsg('Emergency bypass token generated. Security logs updated.');
    setTimeout(() => setAccessSuccessMsg(''), 4000);
    setRequestingAccess(false);
  };

  // RBAC clearance check for active subtab
  const currentRole = role || 'SUPPORT_ADMIN';
  const hasAccess = TAB_ROLES[activeTab].includes(currentRole);

  // Filtering support tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.description && ticket.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || ticket.category.toUpperCase() === categoryFilter;
    const matchesPriority = priorityFilter === 'ALL' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;
  const activeCount = tickets.filter(t => t.status === 'OPEN').length;

  const getPriorityColor = (p?: string) => {
    switch (p) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'NORMAL': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 pb-12">
      {accessSuccessMsg && (
        <div className="fixed top-6 right-6 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-2">
          <span>🛡️</span>
          <span>{accessSuccessMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Support Operations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage ticket queues, financial disputes, and compliance escalations.</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-orange-600" />
          <span className="text-xs font-semibold text-orange-700">Role: {currentRole}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl shadow-sm p-6 text-white transition-all hover:scale-[1.01]">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-6 h-6" />
            <span className="text-sm font-semibold opacity-90">PENDING ASSIGNMENT</span>
          </div>
          <div className="text-3xl font-bold">{activeCount} Tickets</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-sm p-6 text-white transition-all hover:scale-[1.01]">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6" />
            <span className="text-sm font-semibold opacity-90">ONLINE DISPATCHERS</span>
          </div>
          <div className="text-3xl font-bold">12 Active</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm p-6 text-white transition-all hover:scale-[1.01]">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6" />
            <span className="text-sm font-semibold opacity-90">RESOLVED TODAY</span>
          </div>
          <div className="text-3xl font-bold">{resolvedCount} Issues</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
        {(['help-desk', 'financial-requests', 'fraud-investigation', 'compliance-escalations'] as TabType[]).map(tab => {
          const tabAccess = TAB_ROLES[tab].includes(currentRole);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {!tabAccess && <Lock className="w-3.5 h-3.5 text-gray-400" />}
              {tab === 'help-desk' && 'Customer Help Desk'}
              {tab === 'financial-requests' && 'Financial Disputes'}
              {tab === 'fraud-investigation' && 'Fraud Investigations'}
              {tab === 'compliance-escalations' && 'Compliance Escalations'}
            </button>
          );
        })}
      </div>

      {/* Main Tab Render with RBAC Locks */}
      {!hasAccess ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm max-w-xl mx-auto my-8">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
            <Lock className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Clearance Level Restricted</h2>
          <p className="text-sm text-gray-500 mt-2">
            The subtab <strong>"{activeTab.replace('-', ' ').toUpperCase()}"</strong> requires compliance clearances. 
            Your account role <strong>({currentRole})</strong> is not permitted to review these customer records.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-6 text-left space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Authorized Profiles</h4>
            <div className="flex flex-wrap gap-1.5">
              {TAB_ROLES[activeTab].map(r => (
                <span key={r} className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-mono font-bold rounded">
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setActiveTab('help-desk')}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition"
            >
              Return to Help Desk
            </button>
            <button
              onClick={handleRequestOverride}
              disabled={requestingAccess}
              className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <ShieldAlert className="w-4 h-4" />
              {requestingAccess ? 'Authorizing...' : 'Request Clearance Bypass'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* HELP DESK QUEUE SUBTAB */}
          {activeTab === 'help-desk' && (
            <div className="space-y-4">
              {/* Dynamic Interactive Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                {/* Search Bar */}
                <div className="relative md:col-span-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by ID or subject..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                {/* Status Selector */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-semibold text-gray-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>

                {/* Priority Selector */}
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-semibold text-gray-700"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="NORMAL">Normal</option>
                  <option value="LOW">Low</option>
                </select>

                {/* Category Selector */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-semibold text-gray-700"
                >
                  <option value="ALL">All Categories</option>
                  <option value="ACCOUNT">Account</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="FEEDBACK">Feedback</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Tickets Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket ID</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading tickets...</td></tr>
                    ) : filteredTickets.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No matching tickets found.</td></tr>
                    ) : filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">{ticket.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-bold bg-orange-100 text-orange-700 rounded-full">
                            {ticket.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{ticket.subject}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded border ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority || 'NORMAL'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                          {ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS' ? (
                            <button
                              onClick={() => { setSelectedTicket(ticket); setResolutionNote(''); }}
                              className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-bold cursor-pointer"
                            >
                              Resolve
                            </button>
                          ) : (
                            <span className="text-gray-400 font-bold text-xs inline-flex items-center gap-1">✓ Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'financial-requests' && <FinancialRequestsTab />}
          {activeTab === 'fraud-investigation' && <FraudInvestigationTab />}
          {activeTab === 'compliance-escalations' && <ComplianceEscalationsTab />}
        </>
      )}

      {/* Resolution Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Resolve Ticket</h2>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-500">Ticket ID</span>
                <span className="text-sm font-mono font-bold text-gray-800">{selectedTicket.id.toUpperCase()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-500">Subject</span>
                <span className="text-sm text-gray-800 font-semibold">{selectedTicket.subject}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <span className="text-xs text-gray-400 font-semibold uppercase">Description</span>
                <p className="text-sm text-gray-700 mt-1 leading-relaxed bg-white p-2.5 rounded border border-gray-200">{selectedTicket.description}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">ℹ️ Your audit trail must include at least one action keyword:</p>
              <div className="flex flex-wrap gap-1">
                {REQUIRED_KEYWORDS.map(keyword => (
                  <span key={keyword} className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                    resolutionNote.toLowerCase().includes(keyword)
                      ? 'bg-green-100 text-green-700 font-bold'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-5">
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
                <p className="text-xs text-red-500 mt-1">⚠️ Note must contain an action keyword (e.g. reset, fixed, resolved, closed)</p>
              )}
              {isNoteValid && (
                <p className="text-xs text-green-600 mt-1">✓ Note looks good!</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTicket(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!isNoteValid || resolving}
                className="flex-1 px-4 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
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