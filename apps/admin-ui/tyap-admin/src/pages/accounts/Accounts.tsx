import React, { useState, useEffect } from 'react';
import { accountsService } from '../../services/accounts.service';
import { Search } from 'lucide-react';
import AgentPerformanceTab from '../../components/AgentPerformanceTab';

type TabType = 'all-users' | 'agent-performance';

interface Account {
  name: string;
  role: string;
  compliance: string;
  status: string;
  lastLogin: string;
}

const mockAccounts: Account[] = [
  { name: 'John Doe', role: 'Passenger', compliance: 'KYC Verified', status: 'Active', lastLogin: '2 hours ago' },
  { name: 'Jane Smith', role: 'Driver', compliance: 'KYC Pending', status: 'Active', lastLogin: '5 hours ago' },
  { name: 'Mike Johnson', role: 'Agent', compliance: 'KYC Verified', status: 'Suspended', lastLogin: '1 day ago' },
  { name: 'Sarah Williams', role: 'Passenger', compliance: 'KYC Verified', status: 'Active', lastLogin: '3 hours ago' },
];

const Accounts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all-users');
  const [users, setUsers] = useState<any[]>(mockAccounts);
  const [loading, setLoading] = useState(true);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await accountsService.getAllUsers();
        if (data && data.length > 0) {
          setUsers(data);
        }
      } catch (error) {
        console.warn('Failed to fetch users, using mock data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Reactive filtering logic
  const filteredUsers = users.filter((user) => {
    const nameOrEmail = (user.email || user.name || '').toLowerCase();
    const role = (user.role || '').toLowerCase();
    
    // Normalize status mapping
    const isActive = user.isPhoneVerified || user.status === 'Active';
    const statusStr = isActive ? 'active' : (user.status || 'inactive').toLowerCase();

    const matchesSearch = nameOrEmail.includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All Roles' || role === roleFilter.toLowerCase();
    const matchesStatus = statusFilter === 'All Status' || statusStr === statusFilter.toLowerCase();

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Accounts</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('all-users')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'all-users'
              ? 'bg-orange-100 text-orange-600 font-bold shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Users
        </button>
        <button
          onClick={() => setActiveTab('agent-performance')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'agent-performance'
              ? 'bg-orange-100 text-orange-600 font-bold shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Agent Performance
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'all-users' && (
        <div>
          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option>All Roles</option>
              <option>Passenger</option>
              <option>Driver</option>
              <option>Agent</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Suspended</option>
              <option>Inactive</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Account Name / Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Compliance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                      No users match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((account, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {account.email || account.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {account.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                          (account.isEmailVerified || account.compliance === 'KYC Verified')
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(account.isEmailVerified || account.compliance === 'KYC Verified') ? 'KYC Verified' : 'KYC Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                          (account.isPhoneVerified || account.status === 'Active')
                            ? 'bg-green-100 text-green-800'
                            : account.status === 'Suspended'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {(account.isPhoneVerified || account.status === 'Active') ? 'Active' : account.status || 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : account.lastLogin}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'agent-performance' && <AgentPerformanceTab />}
    </div>
  );
};

export default Accounts;