import React, { useState, useEffect } from 'react';
import { walletsService } from '../../services/wallets.service';
import { Wallet, TrendingUp, TrendingDown, Lock } from 'lucide-react';

const Wallets = () => {
  const [walletData, setWalletData] = useState<any>({ wallets: [], totalBalance: 0 });
  const [walletStats, setWalletStats] = useState<any>({ inflow: 0, outflow: 0, reserved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
   const fetchWallets = async () => {
      try {
        const [wallets, stats] = await Promise.all([
          walletsService.getAllWallets(),
          walletsService.getWalletStats(),
        ]);
        setWalletData(wallets);
        setWalletStats(stats);
      } catch (error) {
        console.error('Failed to fetch wallets:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWallets();
  }, []);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const wallets = [
    { id: 'WAL-001', owner: 'John Doe', type: 'Passenger', balance: '₦45,000.00', reserved: '₦5,000.00', status: 'Active' },
    { id: 'WAL-002', owner: 'Jane Smith', type: 'Driver', balance: '₦125,000.00', reserved: '₦15,000.00', status: 'Active' },
    { id: 'WAL-003', owner: 'Mike Johnson', type: 'Agent', balance: '₦85,000.00', reserved: '₦10,000.00', status: 'Active' },
    { id: 'WAL-004', owner: 'Sarah Williams', type: 'Passenger', balance: '₦32,000.00', reserved: '₦2,000.00', status: 'Active' },
    { id: 'WAL-005', owner: 'Park Manager A', type: 'Park Manager', balance: '₦250,000.00', reserved: '₦50,000.00', status: 'Active' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Wallets</h1>

      {/* Top Stats - Orange Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-lg shadow-lg p-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold bg-white bg-opacity-20 px-3 py-1 rounded-full">
              TOTAL
            </span>
          </div>
          <p className="text-sm opacity-90 mb-2">TOTAL SYSTEM BALANCE</p>
          <h2 className="text-4xl font-bold">{loading ? 'Loading...' : `₦${walletData.totalBalance.toLocaleString()}`}</h2>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold bg-white bg-opacity-20 px-3 py-1 rounded-full">
              TODAY
            </span>
          </div>
          <p className="text-sm opacity-90 mb-2">INFLOW (TODAY)</p>
          <h2 className="text-4xl font-bold">₦{walletStats.inflow.toLocaleString()}</h2>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">RESERVED FUNDS</p>
              <h3 className="text-2xl font-bold text-gray-800">₦{walletStats.reserved.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">OUTFLOW (TODAY)</p>
              <h3 className="text-2xl font-bold text-gray-800">₦{walletStats.outflow.toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">All Wallets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Wallet ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Owner / Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Current Balance</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reserved</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
  <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading wallets...</td></tr>
) : walletData.wallets.map((wallet: any, index: number) => (
                <tr key={wallet.id} className="hover:bg-gray-50">
  <td className="px-6 py-4 text-sm text-gray-800 font-mono">{wallet.id.slice(0, 8).toUpperCase()}</td>
  <td className="px-6 py-4">
    <div>
      <p className="text-sm font-semibold text-gray-800">{wallet.email}</p>
      <p className="text-xs text-gray-500">{wallet.role}</p>
    </div>
  </td>
  <td className="px-6 py-4 text-sm font-semibold text-gray-800">₦{wallet.walletBalance.toLocaleString()}</td>
  <td className="px-6 py-4 text-sm text-gray-600">₦0.00</td>
  <td className="px-6 py-4">
    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      Active
    </span>
  </td>
</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Wallets;