import React, { useState } from 'react';
import { Edit2, Trash2, Plus, X } from 'lucide-react';

interface RevenueStream {
  id: number;
  name: string;
  fee: string;
  unit: string;
  status: 'Active' | 'Inactive';
}

const initialStreams: RevenueStream[] = [
  { id: 1, name: 'Biometric Onboarding', fee: '₦200', unit: 'Flat Fee', status: 'Active' },
  { id: 2, name: 'Passenger Transaction', fee: '₦20', unit: 'Flat Fee', status: 'Active' },
  { id: 3, name: 'Driver Withdrawal', fee: '₦20', unit: 'Flat Fee', status: 'Active' },
  { id: 4, name: 'Agent/Agent Payment', fee: '2%', unit: 'Percentage', status: 'Active' },
  { id: 5, name: 'POS Terminal Lease', fee: '₦1,500', unit: 'Flat Fee', status: 'Active' },
];

const emptyForm = { name: '', fee: '', unit: 'Flat Fee', status: 'Active' as 'Active' | 'Inactive' };

const Revenue = () => {
  const [streams, setStreams] = useState<RevenueStream[]>(initialStreams);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editStream, setEditStream] = useState<RevenueStream | null>(null);
  const [deleteStream, setDeleteStream] = useState<RevenueStream | null>(null);
  const [form, setForm] = useState(emptyForm);

  const isFormValid = form.name.trim() !== '' && form.fee.trim() !== '';

  const handleAdd = () => {
    const newStream: RevenueStream = {
      id: Date.now(),
      ...form,
    };
    setStreams(prev => [...prev, newStream]);
    setShowAddModal(false);
    setForm(emptyForm);
  };

  const handleEdit = () => {
    if (!editStream) return;
    setStreams(prev =>
      prev.map(s => s.id === editStream.id ? { ...editStream, ...form } : s)
    );
    setEditStream(null);
    setForm(emptyForm);
  };

  const handleDelete = () => {
    if (!deleteStream) return;
    setStreams(prev => prev.filter(s => s.id !== deleteStream.id));
    setDeleteStream(null);
  };

  const openEdit = (stream: RevenueStream) => {
    setEditStream(stream);
    setForm({ name: stream.name, fee: stream.fee, unit: stream.unit, status: stream.status });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-800">Revenue</h1>
          <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">NEW MODULE</span>
        </div>
      </div>

      {/* Revenue Streams Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Revenue Streams</h2>
          <button
            onClick={() => { setShowAddModal(true); setForm(emptyForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Stream
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stream Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fee Value</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {streams.map((stream) => (
                <tr key={stream.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">{stream.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{stream.fee}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{stream.unit}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      stream.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {stream.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(stream)}
                        className="text-blue-500 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteStream(stream)}
                        className="text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Revenue Streams</p>
              <p className="text-2xl font-bold text-gray-800">{streams.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Active Streams</p>
              <p className="text-2xl font-bold text-green-600">{streams.filter(s => s.status === 'Active').length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Estimated Monthly Revenue</p>
              <p className="text-2xl font-bold text-orange-500">₦2,450,000</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editStream) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editStream ? 'Edit Revenue Stream' : 'Add Revenue Stream'}
              </h2>
              <button onClick={() => { setShowAddModal(false); setEditStream(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Stream Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Biometric Onboarding"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fee Value <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.fee}
                  onChange={(e) => setForm({ ...form, fee: e.target.value })}
                  placeholder="e.g. ₦200 or 2%"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option>Flat Fee</option>
                  <option>Percentage</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Inactive' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setEditStream(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={editStream ? handleEdit : handleAdd}
                disabled={!isFormValid}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editStream ? 'Save Changes' : 'Add Stream'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteStream && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Delete Stream?</h2>
              <p className="text-sm text-gray-500 mt-1">
                Are you sure you want to delete <strong>{deleteStream.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteStream(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Revenue;
