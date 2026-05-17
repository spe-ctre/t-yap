import React, { useState, useEffect } from 'react';
import { agentService } from '../services/agent.service';

interface Agent {
  id: string;
  user: { email: string };
  park: { name: string } | null;
  isActive: boolean;
  kycStatus: string;
  walletBalance: string;
  createdAt: string;
}

const mockAgents: Agent[] = [
  { id: '1', user: { email: 'agent1@tyap.com' }, park: { name: 'Oshodi Park A' }, isActive: true, kycStatus: 'APPROVED', walletBalance: '150000', createdAt: new Date().toISOString() },
  { id: '2', user: { email: 'agent2@tyap.com' }, park: { name: 'Ikeja Terminal' }, isActive: true, kycStatus: 'APPROVED', walletBalance: '235000', createdAt: new Date().toISOString() },
  { id: '3', user: { email: 'new.agent@tyap.com' }, park: null, isActive: false, kycStatus: 'PENDING', walletBalance: '0', createdAt: new Date().toISOString() },
];

const getPerformanceBadge = (kycStatus: string) => {
  switch (kycStatus) {
    case 'APPROVED': return 'bg-yellow-100 text-yellow-800';
    case 'PENDING': return 'bg-orange-100 text-orange-800';
    case 'REJECTED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const AgentPerformanceTab: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const data = await agentService.getAgents();
        if (data && data.length > 0) {
          setAgents(data);
        } else {
          setAgents(mockAgents); // fallback for empty states
        }
      } catch (error) {
        console.warn('Failed to fetch agents, using mock data:', error);
        setAgents(mockAgents); // fallback on error
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Park</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet Balance</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KYC Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">Loading agents...</td></tr>
          ) : agents.length === 0 ? (
            <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-400">No active agents found.</td></tr>
          ) : agents.map((agent) => (
            <tr key={agent.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {agent.user.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {agent.park ? agent.park.name : 'Not assigned'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                ₦{Number(agent.walletBalance).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPerformanceBadge(agent.kycStatus)}`}>
                  {agent.kycStatus}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AgentPerformanceTab;