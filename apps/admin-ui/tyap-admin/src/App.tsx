import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import OTPVerification from './pages/auth/OTPVerification';
import LoginSuccess from './pages/auth/LoginSuccess';
import AccessDenied from './pages/auth/AccessDenied';
import Dashboard from './pages/dashboard/Dashboard';
import Accounts from './pages/accounts/Accounts';
import Wallets from './pages/wallets/Wallets';
import Transport from './pages/transport/Transport';
import Revenue from './pages/revenue/Revenue';
import Support from './pages/support/Support';
import TwoFactorSetup from './pages/settings/TwoFactorSetup';
import AuditLog from './pages/audit/AuditLog';
import Ledger from './pages/ledger/Ledger';
import Settlements from './pages/settlements/Settlements';
import Compliance from './pages/compliance/Compliance';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth Routes (No Layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/otp-verification" element={<OTPVerification />} />
          <Route path="/login-success" element={<LoginSuccess />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Protected Dashboard Routes (With Layout) */}
          <Route path="/dashboard" element={<ProtectedRoute page="dashboard"><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute page="accounts"><Layout><Accounts /></Layout></ProtectedRoute>} />
          <Route path="/wallets" element={<ProtectedRoute page="wallets"><Layout><Wallets /></Layout></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute page="ledger"><Layout><Ledger /></Layout></ProtectedRoute>} />
          <Route path="/settlements" element={<ProtectedRoute page="settlements"><Layout><Settlements /></Layout></ProtectedRoute>} />
          <Route path="/transport" element={<ProtectedRoute page="transport"><Layout><Transport /></Layout></ProtectedRoute>} />
          <Route path="/revenue" element={<ProtectedRoute page="revenue"><Layout><Revenue /></Layout></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute page="support"><Layout><Support /></Layout></ProtectedRoute>} />
          <Route path="/settings/2fa" element={<ProtectedRoute><Layout><TwoFactorSetup /></Layout></ProtectedRoute>} />
          <Route path="/audit-log" element={<ProtectedRoute page="audit-log"><Layout><AuditLog /></Layout></ProtectedRoute>} />
          <Route path="/compliance" element={<ProtectedRoute page="compliance"><Layout><Compliance /></Layout></ProtectedRoute>} />

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;