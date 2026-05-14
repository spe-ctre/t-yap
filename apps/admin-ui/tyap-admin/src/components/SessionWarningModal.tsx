import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SessionWarningModal = () => {
  const { showWarning, logout, extendSession } = useAuth();

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-500" />
          <h2 className="text-xl font-bold text-gray-800">Session Expiring Soon</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Your session will expire in <strong>5 minutes</strong> due to inactivity. Would you like to stay logged in?
        </p>
        <div className="flex gap-3">
          <button
            onClick={extendSession}
            className="flex-1 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
          >
            Stay Logged In
          </button>
          <button
            onClick={logout}
            className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;