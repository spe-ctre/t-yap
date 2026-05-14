import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboard.service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';

// Mock data for the line chart
const chartData = [
  { month: 'Jan', value: 400 },
  { month: 'Feb', value: 300 },
  { month: 'Mar', value: 600 },
  { month: 'Apr', value: 450 },
  { month: 'May', value: 700 },
  { month: 'Jun', value: 550 },
  { month: 'July', value: 800 },
  { month: 'Aug', value: 650 },
  { month: 'Sept', value: 900 },
  { month: 'Oct', value: 500 },
  { month: 'Nov', value: 850 },
  { month: 'Dec', value: 950 },
];

// Mock fraud alerts data
const fraudAlerts = [
  { id: 1, message: 'Multiple failed logins - ACC-8821', severity: 'High', time: '10 mins ago' },
  { id: 2, message: 'Terminal offline > 24h - POS-992', severity: 'Medium', time: '10 mins ago' },
  { id: 3, message: 'Multiple failed logins - ACC-8821', severity: 'High', time: '10 mins ago' },
];

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardService.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Wallet Balance</span>
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">📊</span>
          </div>
         <div className="text-2xl font-bold text-gray-900">{loading ? 'Loading...' : `₦${stats?.totalTransactionVolume || 0}`}</div>
          <div className="text-xs text-green-600 mt-1">Live</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total System Inflow</span>
            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">📈</span>
          </div>
         <div className="text-2xl font-bold text-green-600">{loading ? 'Loading...' : stats?.totalUsers || 0}</div>
          <div className="text-xs text-green-600 mt-1">Total Users</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total System Outflow</span>
            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">📉</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{loading ? 'Loading...' : stats?.totalAgents || 0}</div>
          <div className="text-xs text-red-600 mt-1">Active Agents</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Net Revenue T-Yap</span>
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">💰</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">{loading ? 'Loading...' : stats?.pendingKYC || 0}</div>
          <div className="text-xs text-orange-600 mt-1">Pending KYC</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - System Health & Fraud Alerts */}
        <div className="lg:col-span-1 space-y-6">
          {/* System Health */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                System Health
              </h2>
              <span className="text-xs bg-green-100 text-green-600 px-3 py-1 rounded-full font-medium">
                Optimal
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">👥</span>
                  Active User (Pax+Driver)
                </div>
                <div className="text-right">
                  <div className="font-bold">42,500</div>
                  <div className="text-xs text-green-600">Healthy</div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">🏢</span>
                  Active Agent
                </div>
                <div className="text-right">
                  <div className="font-bold">1,240</div>
                  <div className="text-xs text-green-600">Healthy</div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">🖥️</span>
                  Active Terminal
                </div>
                <div className="text-right">
                  <div className="font-bold">8,450</div>
                  <div className="text-xs text-green-600">98% Online</div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">📄</span>
                  Pending KYC
                </div>
                <div className="text-right">
                  <div className="font-bold">145</div>
                  <div className="text-xs text-orange-600">Action Req.</div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center">👥</span>
                  Active User (Pax+Driver)
                </div>
                <div className="text-right">
                  <div className="font-bold">32</div>
                  <div className="text-xs text-red-600">Investigating</div>
                </div>
              </div>
            </div>
          </div>

          {/* Fraud Alerts */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Fraud Alerts
              </h2>
              <button className="text-xs text-red-600 hover:underline">View All</button>
            </div>

            <div className="space-y-3">
              {fraudAlerts.map((alert) => (
                <div key={alert.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{alert.message}</div>
                      <div className="text-xs text-gray-500 mt-1">{alert.time}</div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        alert.severity === 'High'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">System Health Trend</h2>
              <div className="flex gap-2">
                <button className="text-xs px-3 py-1 rounded bg-orange-100 text-orange-600 font-medium">
                  Monthly
                </button>
                <button className="text-xs px-3 py-1 rounded text-gray-600 hover:bg-gray-100">
                  Weekly
                </button>
                <button className="text-xs px-3 py-1 rounded text-gray-600 hover:bg-gray-100">
                  Daily
                </button>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  stroke="#999"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#999" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#fb923c"
                  strokeWidth={2}
                  dot={{ fill: '#fb923c', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Commission Split - Circular Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Commission Split</h2>
              <select className="text-xs border rounded px-2 py-1">
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
              </select>
            </div>

            <div className="flex items-center justify-center gap-8">
              {/* Circular Progress */}
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  {/* Background circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="20"
                  />
                  {/* Progress circle (70% = 252 degrees) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#fb923c"
                    strokeWidth="20"
                    strokeDasharray="352"
                    strokeDashoffset="105"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-xs text-gray-500">TOTAL REV</div>
                  <div className="text-2xl font-bold">₦2.4M</div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-sm font-medium">T-Yap Share (70%)</span>
                  </div>
                  <div className="text-lg font-bold">₦1,680,000</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                    <span className="text-sm font-medium">Bank Share (30%)</span>
                  </div>
                  <div className="text-lg font-bold">₦720,000</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;