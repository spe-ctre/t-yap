import React, { useState } from 'react';
import { Battery, Signal, HardDrive, X, RotateCw, Download, AlertTriangle } from 'lucide-react';

interface Terminal {
  id: string;
  location: string;
  battery: number;
  firmware: string;
  status: 'Online' | 'Offline';
  signal: string;
  storage: string;
}

const initialTerminals: Terminal[] = [
  { id: 'TERM-001', location: 'Iyana Ipaja Park', battery: 85, firmware: 'v1.2.0', status: 'Online', signal: '4G LTE', storage: '120GB Free' },
  { id: 'TERM-002', location: 'Ojota Terminal', battery: 92, firmware: 'v1.2.0', status: 'Online', signal: '4G LTE', storage: '115GB Free' },
  { id: 'TERM-003', location: 'Berger Park', battery: 15, firmware: 'v1.1.8', status: 'Offline', signal: 'No Signal', storage: '100GB Free' },
  { id: 'TERM-004', location: 'Ketu Park', battery: 78, firmware: 'v1.2.0', status: 'Online', signal: '4G LTE', storage: '125GB Free' },
  { id: 'TERM-005', location: 'Mile 12 Terminal', battery: 68, firmware: 'v1.2.0', status: 'Online', signal: '3G', storage: '110GB Free' },
];

const Transport = () => {
  const [terminals, setTerminals] = useState<Terminal[]>(initialTerminals);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [actionModal, setActionModal] = useState<'restart' | 'firmware' | 'unlink' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const onlineCount = terminals.filter(t => t.status === 'Online').length;
  const offlineCount = terminals.filter(t => t.status === 'Offline').length;

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return 'text-green-600';
    if (battery > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleAction = (action: 'restart' | 'firmware' | 'unlink') => {
    setActionLoading(true);
    setTimeout(() => {
      setActionLoading(false);
      setActionModal(null);

      if (action === 'restart' && selectedTerminal) {
        setActionSuccess(`${selectedTerminal.id} has been restarted successfully!`);
      } else if (action === 'firmware' && selectedTerminal) {
        setTerminals(prev =>
          prev.map(t => t.id === selectedTerminal.id ? { ...t, firmware: 'v1.3.0' } : t)
        );
        setActionSuccess(`${selectedTerminal.id} firmware updated to v1.3.0!`);
      } else if (action === 'unlink' && selectedTerminal) {
        setTerminals(prev => prev.filter(t => t.id !== selectedTerminal.id));
        setSelectedTerminal(null);
        setActionSuccess(`${selectedTerminal.id} has been unlinked from the system!`);
      }

      setTimeout(() => setActionSuccess(''), 4000);
    }, 2000);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Transport</h1>

      {/* Success Toast */}
      {actionSuccess && (
        <div className="fixed top-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <span>✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-br from-green-400 to-orange-400 rounded-lg shadow-lg p-8 text-white">
          <p className="text-sm opacity-90 mb-2">ONLINE</p>
          <h2 className="text-5xl font-bold">{onlineCount}</h2>
          <p className="text-sm mt-2 opacity-90">Terminals Active</p>
        </div>
        <div className="bg-gradient-to-br from-red-400 to-red-500 rounded-lg shadow-lg p-8 text-white">
          <p className="text-sm opacity-90 mb-2">OFFLINE</p>
          <h2 className="text-5xl font-bold">{offlineCount}</h2>
          <p className="text-sm mt-2 opacity-90">Terminals Inactive</p>
        </div>
      </div>

      {/* Terminals Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">All Terminals</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Terminal ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location / Park</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Battery</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Firmware</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {terminals.map((terminal) => (
                <tr key={terminal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-800 font-mono">{terminal.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{terminal.location}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Battery className={`w-5 h-5 ${getBatteryColor(terminal.battery)}`} />
                      <span className={`text-sm font-semibold ${getBatteryColor(terminal.battery)}`}>{terminal.battery}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{terminal.firmware}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${terminal.status === 'Online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className={`text-sm font-semibold ${terminal.status === 'Online' ? 'text-green-700' : 'text-red-700'}`}>
                        {terminal.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedTerminal(terminal)}
                      className="text-orange-500 hover:text-orange-600 font-semibold text-sm"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Terminal Detail Modal */}
      {selectedTerminal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedTerminal.id}</h3>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedTerminal.status === 'Online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {selectedTerminal.status}
                </span>
              </div>
              <button onClick={() => setSelectedTerminal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Battery className={`w-8 h-8 mx-auto mb-2 ${getBatteryColor(selectedTerminal.battery)}`} />
                  <p className="text-xs text-gray-500">Battery</p>
                  <p className="text-lg font-bold text-gray-800">{selectedTerminal.battery}%</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Signal className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-xs text-gray-500">Signal</p>
                  <p className="text-sm font-bold text-gray-800">{selectedTerminal.signal}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <HardDrive className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-xs text-gray-500">Storage</p>
                  <p className="text-sm font-bold text-gray-800">{selectedTerminal.storage}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Remote Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setActionModal('restart')}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                  >
                    <RotateCw className="w-5 h-5" />
                    <span className="font-semibold">Restart Device</span>
                  </button>
                  <button
                    onClick={() => setActionModal('firmware')}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    <span className="font-semibold">Update Firmware</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Advanced</h4>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Firmware Version</span>
                  <span className="text-sm font-mono font-semibold text-gray-800">{selectedTerminal.firmware}</span>
                </div>
                <button
                  onClick={() => setActionModal('unlink')}
                  className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg transition-colors"
                >
                  Unlink Device
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modals */}
      {actionModal && selectedTerminal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">

            {/* Restart */}
            {actionModal === 'restart' && (
              <>
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <RotateCw className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Restart Device?</h2>
                  <p className="text-sm text-gray-500 mt-1">This will restart <strong>{selectedTerminal.id}</strong> at {selectedTerminal.location}. It will be temporarily offline during restart.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setActionModal(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={() => handleAction('restart')} disabled={actionLoading} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                    {actionLoading ? 'Restarting...' : 'Confirm Restart'}
                  </button>
                </div>
              </>
            )}

            {/* Firmware */}
            {actionModal === 'firmware' && (
              <>
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Download className="w-6 h-6 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Update Firmware?</h2>
                  <p className="text-sm text-gray-500 mt-1">This will update <strong>{selectedTerminal.id}</strong> from <strong>{selectedTerminal.firmware}</strong> to <strong>v1.3.0</strong>. Device will restart after update.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setActionModal(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={() => handleAction('firmware')} disabled={actionLoading} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                    {actionLoading ? 'Updating...' : 'Confirm Update'}
                  </button>
                </div>
              </>
            )}

            {/* Unlink */}
            {actionModal === 'unlink' && (
              <>
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-red-700">⚠️ Unlink Device?</h2>
                  <p className="text-sm text-gray-500 mt-2">This will <strong>permanently remove</strong> <strong>{selectedTerminal.id}</strong> from the system. This action <strong>cannot be undone!</strong></p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setActionModal(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={() => handleAction('unlink')} disabled={actionLoading} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
                    {actionLoading ? 'Unlinking...' : 'Yes, Unlink'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Transport;
