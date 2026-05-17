import React, { useState } from 'react';
import { Truck, MapPin, Radio, Activity, Navigation, Settings, Edit3, Route, X, Battery, Signal, HardDrive, RotateCw, Download, AlertTriangle } from 'lucide-react';

// --- Types ---
type TransportTab = 'trips' | 'terminals' | 'parks';

// --- Sub-Components ---

const LiveTripsTab = () => {
  const mockTrips = [
    { id: 'TRP-1092', driver: 'Ahmed Bakare', route: 'Oshodi ➔ Ikeja', status: 'In Transit', passengers: 14, eta: '12 mins' },
    { id: 'TRP-1093', driver: 'Chinedu Eze', route: 'Berger ➔ Yaba', status: 'Boarding', passengers: 8, eta: 'N/A' },
    { id: 'TRP-1094', driver: 'Oluwaseun Ade', route: 'Ketu ➔ CMS', status: 'In Transit', passengers: 18, eta: '45 mins' },
    { id: 'TRP-1095', driver: 'Musa Ibrahim', route: 'Mile 12 ➔ Oshodi', status: 'Completed', passengers: 14, eta: 'Arrived' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-bold text-gray-800">Live Fleet Tracking</h3>
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Live Updates Active
        </span>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trip ID</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Route</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Driver</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">ETA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {mockTrips.map((trip) => (
            <tr key={trip.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-mono text-sm font-semibold text-indigo-600">{trip.id}</td>
              <td className="px-6 py-4 text-sm font-medium text-gray-800 flex items-center gap-2">
                <Route className="w-4 h-4 text-gray-400" /> {trip.route}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {trip.driver} <span className="text-xs text-gray-400 block">{trip.passengers} pax</span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  trip.status === 'In Transit' ? 'bg-blue-100 text-blue-700' :
                  trip.status === 'Boarding' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {trip.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 font-medium">{trip.eta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ParksTab = () => {
  const [mockParks] = useState([
    { id: 'PK-01', name: 'Oshodi Central Terminal', manager: 'Samuel Adewale', routes: 12, dailyVolume: '₦1.2M' },
    { id: 'PK-02', name: 'Berger Mega Park', manager: 'Tunde Olatunji', routes: 8, dailyVolume: '₦850K' },
    { id: 'PK-03', name: 'CMS Marina Hub', manager: 'Unassigned', routes: 15, dailyVolume: '₦2.1M' },
  ]);

  const [showAddPark, setShowAddPark] = useState(false);
  const [editingPricing, setEditingPricing] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSavePark = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowAddPark(false);
      setSuccessMsg('New park successfully added.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }, 1000);
  };

  const handleUpdatePricing = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setEditingPricing(null);
      setSuccessMsg('Route pricing updated successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }, 1000);
  };

  return (
    <>
      {/* Local Success Toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-2">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-800">Park Management</h3>
          <button 
            onClick={() => setShowAddPark(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            + Add New Park
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Park Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Manager</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Active Routes</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Daily Volume</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mockParks.map((park) => (
              <tr key={park.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-bold text-gray-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-500" /> {park.name}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium ${park.manager === 'Unassigned' ? 'text-red-500 italic' : 'text-gray-700'}`}>
                    {park.manager}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 font-semibold">{park.routes} routes</td>
                <td className="px-6 py-4 text-sm text-green-600 font-bold">{park.dailyVolume}</td>
                <td className="px-6 py-4 text-sm flex items-center">
                  <button 
                    onClick={() => setEditingPricing(park.id)}
                    className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    Edit Pricing <Edit3 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add New Park Modal */}
      {showAddPark && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Park</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Park Name</label>
                <input type="text" className="w-full border rounded-lg px-3 py-2" placeholder="e.g. Yaba Terminal" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Assign Manager</label>
                <select className="w-full border rounded-lg px-3 py-2">
                  <option>Select a Manager</option>
                  <option>Unassigned</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddPark(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button 
                onClick={handleSavePark} 
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isProcessing ? 'Saving...' : 'Save Park'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pricing Modal */}
      {editingPricing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Route Pricing</h2>
            <p className="text-sm text-gray-500 mb-4">Update base fares for routes originating from this park.</p>
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm font-medium">Route 1 (CMS)</span>
                <input type="text" className="w-24 border rounded px-2 py-1 text-right" defaultValue="₦800" />
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-sm font-medium">Route 2 (Ikeja)</span>
                <input type="text" className="w-24 border rounded px-2 py-1 text-right" defaultValue="₦500" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditingPricing(null)} className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button 
                onClick={handleUpdatePricing} 
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isProcessing ? 'Updating...' : 'Update Prices'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Terminals Code Wrapped into a Component
const TerminalsTab = () => {
  const [terminals] = useState([
    { id: 'TERM-001', location: 'Iyana Ipaja Park', status: 'Online', battery: 85, signal: '4G LTE', firmware: 'v1.2.0', storage: '120GB Free' },
    { id: 'TERM-002', location: 'Ojota Terminal', status: 'Online', battery: 92, signal: '4G LTE', firmware: 'v1.2.0', storage: '115GB Free' },
    { id: 'TERM-003', location: 'Berger Park', status: 'Offline', battery: 15, signal: 'No Signal', firmware: 'v1.1.8', storage: '100GB Free' },
  ]);

  const [selectedTerminal, setSelectedTerminal] = useState<any | null>(null);
  const [actionModal, setActionModal] = useState<'restart' | 'firmware' | 'unlink' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
      setSelectedTerminal(null); // Close the detail modal too on success
    }, 1500);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-800">IoT Ticketing Terminals</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Terminal ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Battery</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {terminals.map((terminal) => (
              <tr key={terminal.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-mono font-bold text-gray-700">{terminal.id}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{terminal.location}</td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Battery className={`w-4 h-4 ${getBatteryColor(terminal.battery)}`} />
                      <span className={`text-sm font-semibold ${getBatteryColor(terminal.battery)}`}>{terminal.battery}%</span>
                    </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-max ${
                    terminal.status === 'Online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${terminal.status === 'Online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {terminal.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <button 
                    onClick={() => setSelectedTerminal(terminal)}
                    className="text-orange-500 hover:text-orange-700 font-semibold"
                  >
                    Config
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                  <button onClick={() => setActionModal('restart')} className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors">
                    <RotateCw className="w-5 h-5" />
                    <span className="font-semibold">Restart Device</span>
                  </button>
                  <button onClick={() => setActionModal('firmware')} className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors">
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">

            {/* Restart */}
            {actionModal === 'restart' && (
              <>
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <RotateCw className="w-6 h-6 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Restart Device?</h2>
                  <p className="text-sm text-gray-500 mt-1">This will restart <strong>{selectedTerminal.id}</strong> at {selectedTerminal.location}. It will be temporarily offline.</p>
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
                  <p className="text-sm text-gray-500 mt-1">This will update <strong>{selectedTerminal.id}</strong> to the latest firmware version.</p>
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
                  <p className="text-sm text-gray-500 mt-2">This will <strong>permanently remove</strong> <strong>{selectedTerminal.id}</strong> from the system. This cannot be undone.</p>
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
    </>
  );
};


// --- Main Component ---
const Transport = () => {
  const [activeTab, setActiveTab] = useState<TransportTab>('trips');

  const tabs = [
    { id: 'trips' as TransportTab, label: 'Live Trips', icon: Navigation },
    { id: 'parks' as TransportTab, label: 'Parks & Routes', icon: MapPin },
    { id: 'terminals' as TransportTab, label: 'IoT Terminals', icon: Radio },
  ];

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Operations Hub</h1>
          </div>
          <p className="text-gray-500 mt-1 ml-11">Manage live trips, physical parks, routes, and ticketing terminals.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Activity className="w-4 h-4 text-green-500" />
          Network operating normally
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow p-5 text-white">
          <p className="text-sm opacity-90 font-medium">ACTIVE TRIPS</p>
          <h2 className="text-3xl font-bold mt-1">124</h2>
          <p className="text-xs mt-1 opacity-80">Currently on the road</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 font-medium">REGISTERED PARKS</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">18</h2>
          <p className="text-xs text-gray-400 mt-1">Across 3 zones</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-500 font-medium">TICKET VOLUME (TODAY)</p>
          <h2 className="text-2xl font-bold text-green-600 mt-1">8,432</h2>
          <p className="text-xs text-gray-400 mt-1">Passengers boarded</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">TERMINAL STATUS</p>
            <h2 className="text-2xl font-bold text-gray-800 mt-1">45 / 48</h2>
            <p className="text-xs text-gray-400 mt-1">Online Devices</p>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
            <Radio className="w-6 h-6 text-green-500" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'trips' && <LiveTripsTab />}
        {activeTab === 'parks' && <ParksTab />}
        {activeTab === 'terminals' && <TerminalsTab />}
      </div>
    </div>
  );
};

export default Transport;
