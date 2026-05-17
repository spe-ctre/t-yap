import React, { useState, useEffect } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';

// Mock data generator for real-time effect
const generateMockTransactions = () => {
  const types = ['Passenger Deposit', 'Trip Fare', 'Agent Commission', 'Driver Withdrawal', 'VAS Payment'];
  const statuses = ['Completed', 'Completed', 'Completed', 'Pending', 'Failed'];
  return Array.from({ length: 10 }).map((_, i) => ({
    id: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    date: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toLocaleString(),
    type: types[Math.floor(Math.random() * types.length)],
    amount: Math.floor(Math.random() * 50000) + 500,
    status: statuses[Math.floor(Math.random() * statuses.length)],
  }));
};

const Ledger = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState('All Types');

  const fetchLedgerData = async (showSyncIcon = false) => {
    if (showSyncIcon) setIsSyncing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setTransactions(generateMockTransactions());
    setLastSync(new Date().toLocaleTimeString());
    setLoading(false);
    setIsSyncing(false);
  };

  // Real-time polling every 15 seconds
  useEffect(() => {
    fetchLedgerData();
    const interval = setInterval(() => {
      fetchLedgerData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    if (typeFilter === 'All Types') return true;
    return tx.type === typeFilter;
  });

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">System Ledger</h1>
          <p className="text-gray-500 mt-1">Real-time view of all T-Yap financial movements</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Last synced: {lastSync}
          </span>
          <button 
            onClick={() => fetchLedgerData(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-orange-500' : ''}`} />
            Sync Now
          </button>
        </div>
      </div>

      {/* Top Ledger Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Total Inflows */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">+2.4% today</span>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">TOTAL INFLOWS (24H)</p>
          <h3 className="text-2xl font-bold text-gray-800">₦12,450,000</h3>
        </div>

        {/* Total Outflows */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">-1.2% today</span>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">TOTAL OUTFLOWS (24H)</p>
          <h3 className="text-2xl font-bold text-gray-800">₦8,230,000</h3>
        </div>

        {/* T-Yap Revenue */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm opacity-90 font-medium mb-1">T-YAP REVENUE (24H)</p>
          <h3 className="text-2xl font-bold">₦450,200</h3>
        </div>

        {/* Escrow Balance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <AlertCircle className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">FUNDS IN ESCROW</p>
          <h3 className="text-2xl font-bold text-gray-800">₦45,890,000</h3>
        </div>

      </div>

      {/* Real-time Ledger Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Live Global Transactions</h2>
          <div className="flex gap-2">
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-orange-500 focus:ring-orange-500 bg-white px-3 py-1.5"
            >
              <option>All Types</option>
              <option>Passenger Deposit</option>
              <option>Trip Fare</option>
              <option>Agent Commission</option>
              <option>Driver Withdrawal</option>
              <option>VAS Payment</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ref ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Connecting to Ledger...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No transactions match this type.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-orange-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{tx.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{tx.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{tx.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {tx.type.includes('Deposit') ? '+' : tx.type.includes('Revenue') ? '+' : '-'}
                      ₦{tx.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${tx.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                          tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Ledger;
