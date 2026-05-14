import React, { useState, useEffect } from 'react';
import { accountsService } from '../../services/accounts.service';
import { Search } from 'lucide-react';
import KYCReviewTab from '../../components/KYCReviewTab';
import AgentPerformanceTab from '../../components/AgentPerformanceTab';

type TabType = 'all-users' | 'kyc-review' | 'agent-performance';

interface Account {
  name: string;
  role: string;
  compliance: string;
  status: string;
  lastLogin: string;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockAccounts: Account[] = [
  { name: 'John Doe', role: 'Passenger', compliance: 'KYC Verified', status: 'Active', lastLogin: '2 hours ago' },
  { name: 'Jane Smith', role: 'Driver', compliance: 'KYC Pending', status: 'Active', lastLogin: '5 hours ago' },
  { name: 'Mike Johnson', role: 'Agent', compliance: 'KYC Verified', status: 'Suspended', lastLogin: '1 day ago' },
  { name: 'Sarah Williams', role: 'Passenger', compliance: 'KYC Verified', status: 'Active', lastLogin: '3 hours ago' },
];

const Accounts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all-users');
const [users, setUsers] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchUsers = async () => {
    try {
      const data = await accountsService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };
  fetchUsers();
}, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Accounts</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('all-users')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'all-users'
              ? 'bg-gray-200 text-gray-900'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Users
        </button>
        <button
          onClick={() => setActiveTab('kyc-review')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'kyc-review'
              ? 'bg-gray-200 text-gray-900'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          KYC Review
        </button>
        <button
          onClick={() => setActiveTab('agent-performance')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'agent-performance'
              ? 'bg-gray-200 text-gray-900'
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
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>All Roles</option>
              <option>Passenger</option>
              <option>Driver</option>
              <option>Agent</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compliance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
  <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading users...</td></tr>
) : users.map((account, index) => (
    <tr key={index} className="hover:bg-gray-50">
  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
    {account.email}
  </td>
  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
    {account.role}
  </td>
  <td className="px-6 py-4 whitespace-nowrap">
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
      account.isEmailVerified
        ? 'bg-green-100 text-green-800'
        : 'bg-yellow-100 text-yellow-800'
    }`}>
      {account.isEmailVerified ? 'KYC Verified' : 'KYC Pending'}
    </span>
  </td>
  <td className="px-6 py-4 whitespace-nowrap">
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
      account.isPhoneVerified
        ? 'bg-green-100 text-green-800'
        : 'bg-red-100 text-red-800'
    }`}>
      {account.isPhoneVerified ? 'Active' : 'Inactive'}
    </span>
  </td>
  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
    {new Date(account.createdAt).toLocaleDateString()}
  </td>
</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'kyc-review' && <KYCReviewTab />}
      
      {activeTab === 'agent-performance' && <AgentPerformanceTab />}
    </div>
  );
};

export default Accounts;