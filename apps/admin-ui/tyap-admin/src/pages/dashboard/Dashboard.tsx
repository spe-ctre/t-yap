import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboard.service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, X, Eye } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
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

  // Compute overall system health status from the latest trend data
  const getOverallHealth = () => {
    const trends = stats?.healthTrends?.[period];
    if (!trends || !trends.length) return { label: 'No Data', color: 'gray' };
    const latest = trends[trends.length - 1];
    if (latest.health >= 95) return { label: 'Optimal', color: 'green' };
    if (latest.health >= 80) return { label: 'Stable', color: 'blue' };
    if (latest.health >= 50) return { label: 'Warning', color: 'orange' };
    return { label: 'Critical', color: 'red' };
  };

  const healthStatus = getOverallHealth();

  // Mock fraud alerts (will be replaced with live API when fraud detection is implemented)
  const fraudAlerts = [
    { id: 1, message: 'Multiple failed logins - ACC-8821', severity: 'High', time: '10 mins ago', details: 'User account ACC-8821 has had 5 consecutive failed login attempts from different IP addresses. This may indicate a brute-force attack or credential stuffing.' },
    { id: 2, message: 'Terminal offline > 24h - POS-992', severity: 'Medium', time: '10 mins ago', details: 'POS terminal POS-992 located at Berger Park has been offline for over 24 hours. Last heartbeat recorded at 2:14 AM. May require physical inspection.' },
    { id: 3, message: 'Unusual transaction pattern - ACC-4401', severity: 'High', time: '25 mins ago', details: 'Account ACC-4401 has processed 12 transactions in rapid succession totaling ₦145,000. This exceeds the normal velocity threshold of 5 transactions per hour.' },
  ].filter(a => !dismissedAlerts.includes(a.id));

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
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-gray-900">
              {loading ? 'Loading...' : `₦${(stats?.analytics?.totalWallet?.value || stats?.totalTransactionVolume || 0).toLocaleString()}`}
            </div>
            {!loading && stats?.analytics?.totalWallet?.delta !== undefined && (
              <span className={`text-xs font-medium ${stats.analytics.totalWallet.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.analytics.totalWallet.delta >= 0 ? '+' : ''}{stats.analytics.totalWallet.delta}%
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">Live from System Flow</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Users</span>
            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">📈</span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-green-600">
              {loading ? 'Loading...' : (stats?.totalUsers || 0).toLocaleString()}
            </div>
            {!loading && stats?.analytics?.totalUsers?.delta !== undefined && (
              <span className={`text-xs font-medium ${stats.analytics.totalUsers.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.analytics.totalUsers.delta >= 0 ? '+' : ''}{stats.analytics.totalUsers.delta}%
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">Active Pax & Drivers</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active Agents</span>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">🏢</span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-blue-600">
              {loading ? 'Loading...' : (stats?.totalAgents || 0).toLocaleString()}
            </div>
            {!loading && stats?.analytics?.revenue?.delta !== undefined && (
              <span className={`text-xs font-medium ${stats.analytics.revenue.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.analytics.revenue.delta >= 0 ? '+' : ''}{stats.analytics.revenue.delta}%
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">Verified Partners</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Success Rate</span>
            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">✅</span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-purple-600">
              {loading ? 'Loading...' : `${stats?.analytics?.successRate?.value || 0}%`}
            </div>
            {!loading && stats?.analytics?.successRate?.delta !== undefined && (
              <span className={`text-xs font-medium ${stats.analytics.successRate.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.analytics.successRate.delta >= 0 ? '+' : ''}{stats.analytics.successRate.delta}%
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">System Health Score</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex flex-col gap-6">
        {/* Full Width Line Chart - Top Row */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">System Health Trend</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setPeriod('monthly')}
                className={`text-xs px-4 py-1.5 rounded transition-all ${period === 'monthly' ? 'bg-orange-100 text-orange-600 font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setPeriod('weekly')}
                className={`text-xs px-4 py-1.5 rounded transition-all ${period === 'weekly' ? 'bg-orange-100 text-orange-600 font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Weekly
              </button>
              <button 
                onClick={() => setPeriod('daily')}
                className={`text-xs px-4 py-1.5 rounded transition-all ${period === 'daily' ? 'bg-orange-100 text-orange-600 font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Daily
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={stats?.healthTrends?.[period] || []} margin={{ left: 10, right: 30, top: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="time"
                height={50}
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                stroke="#cbd5e1"
                interval={period === 'daily' ? 1 : 0}
                tickLine={{ stroke: '#cbd5e1' }}
                axisLine={{ stroke: '#cbd5e1' }}
                label={{ value: period === 'daily' ? 'Hour' : 'Timeline', position: 'insideBottomRight', offset: -10, fontSize: 11, fill: '#64748b', fontWeight: 600 }}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} 
                stroke="#cbd5e1"
                tickLine={{ stroke: '#cbd5e1' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
              />
              <Line
                type="monotone"
                dataKey="health"
                stroke="#fb923c"
                strokeWidth={3}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.status === 'Warning') {
                    return <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                  }
                  return <circle cx={cx} cy={cy} r={4} fill="#fb923c" stroke="#fff" strokeWidth={2} />;
                }}
                activeDot={{ r: 7, strokeWidth: 0 }}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Row - 3 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* System Health Status */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gray-700" />
                  System Health
                </h2>
                <span className={`text-xs bg-${healthStatus.color}-100 text-${healthStatus.color}-600 px-3 py-1 rounded-full font-medium`}>
                  {healthStatus.label}
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { icon: '👥', label: 'Active User (Pax+Driver)', val: (stats?.totalUsers || 0).toLocaleString(), status: 'Healthy', color: 'green' },
                  { icon: '🏢', label: 'Active Agent', val: (stats?.totalAgents || 0).toLocaleString(), status: 'Healthy', color: 'green' },
                  { icon: '🖥️', label: 'Active Terminal', val: '0', status: 'Offline', color: 'gray' },
                  { icon: '📄', label: 'Pending KYC', val: (stats?.pendingKYC || 0).toLocaleString(), status: stats?.pendingKYC > 0 ? 'Action Req.' : 'Clear', color: stats?.pendingKYC > 0 ? 'orange' : 'green' },
                  { icon: '🎫', label: 'Open Tickets', val: (stats?.openTickets || 0).toLocaleString(), status: stats?.openTickets > 0 ? 'Action Req.' : 'Clear', color: stats?.openTickets > 0 ? 'red' : 'green' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center justify-between py-2.5 ${i !== 4 ? 'border-b border-gray-50' : ''}`}>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-xs">{item.icon}</span>
                      {item.label}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-gray-900">{item.val}</div>
                      <div className={`text-[10px] font-medium text-${item.color}-600 uppercase tracking-wider`}>{item.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fraud Alerts */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Fraud Alerts
              </h2>
              <button 
                onClick={() => setDismissedAlerts([])}
                className="text-xs text-red-600 font-medium hover:underline transition-colors"
              >
                {dismissedAlerts.length > 0 ? 'Restore All' : `${fraudAlerts.length} Active`}
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              {fraudAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-sm text-gray-500 font-medium">All alerts dismissed</div>
                </div>
              ) : (
                fraudAlerts.map((alert) => (
                  <div key={alert.id} className="p-3.5 bg-red-50/50 rounded-xl border border-red-100 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900 leading-tight">{alert.message}</div>
                        <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          {alert.time}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                          alert.severity === 'High' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-red-100/50">
                      <button 
                        onClick={() => setSelectedAlert(alert)}
                        className="text-[10px] text-red-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View Details
                      </button>
                      <button 
                        onClick={() => setDismissedAlerts(prev => [...prev, alert.id])}
                        className="text-[10px] text-gray-400 font-semibold hover:text-gray-600 flex items-center gap-1 ml-auto"
                      >
                        <X className="w-3 h-3" /> Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Commission Split */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-lg font-semibold">Commission Split</h2>
              <span className="text-xs bg-gray-50 rounded-lg px-3 py-1 font-medium text-gray-500">
                All Time
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center">
              {/* Circular Progress */}
              <div className="relative w-40 h-40 mb-6 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="85" fill="none" stroke="#f8fafc" strokeWidth="22" />
                  <circle
                    cx="100" cy="100" r="85" fill="none" stroke="#fb923c" strokeWidth="22"
                    strokeDasharray="534"
                    strokeDashoffset={534 - (534 * (stats?.revenueSplit?.find((s: any) => s.name === 'T-Yap')?.percentage || 10)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Revenue</div>
                  <div className="text-lg font-black text-gray-900">₦{(stats?.analytics?.revenue?.value || 0).toLocaleString()}</div>
                </div>
              </div>

              {/* Legend */}
              <div className="w-full space-y-2 flex-shrink-0">
                {(stats?.revenueSplit || [
                  { name: 'Drivers', percentage: 85 },
                  { name: 'Banks', percentage: 5 },
                  { name: 'T-Yap', percentage: 10 },
                ]).map((split: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${split.name === 'T-Yap' ? 'bg-orange-500' : split.name === 'Drivers' ? 'bg-blue-400' : 'bg-gray-300'}`}></div>
                      <span className="text-xs font-semibold text-gray-600">{split.name}</span>
                    </div>
                    <div className="text-xs font-bold text-gray-900">{split.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fraud Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAlert(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Alert Details
              </h3>
              <button onClick={() => setSelectedAlert(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Alert</div>
                <div className="text-sm font-semibold text-gray-900">{selectedAlert.message}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Severity</div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  selectedAlert.severity === 'High' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {selectedAlert.severity}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Details</div>
                <div className="text-sm text-gray-700 leading-relaxed">{selectedAlert.details}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Reported</div>
                <div className="text-sm text-gray-700">{selectedAlert.time}</div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setDismissedAlerts(prev => [...prev, selectedAlert.id]);
                  setSelectedAlert(null);
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
              >
                Dismiss Alert
              </button>
              <button
                onClick={() => setSelectedAlert(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;