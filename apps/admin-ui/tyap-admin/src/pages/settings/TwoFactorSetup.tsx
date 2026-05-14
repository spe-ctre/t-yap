import React, { useState } from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import { TwoFactorService } from '../../services/twoFactor.service';
import { AuthService } from '../../services/auth.service';

const TwoFactorSetup = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'start' | 'scan' | 'done'>('start');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken()!;
      const response = await TwoFactorService.setup2FA(token);
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setStep('scan');
    } catch (err) {
      setError('Failed to setup 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);
      setError('');
      const token = AuthService.getToken()!;
      await TwoFactorService.verify2FA(token, code);
      setStep('done');
    } catch (err) {
      setError('Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white rounded-xl shadow p-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-800">Two-Factor Authentication</h1>
      </div>

      {step === 'start' && (
        <div>
          <p className="text-gray-600 mb-6">
            Add an extra layer of security to your account. Once enabled, you'll need to enter a code from Google Authenticator every time you log in.
          </p>
          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
          >
            {loading ? 'Setting up...' : 'Set Up 2FA'}
          </button>
        </div>
      )}

      {step === 'scan' && (
        <div>
          <p className="text-gray-600 mb-4">
            Scan this QR code with <strong>Google Authenticator</strong>, then enter the 6-digit code below to confirm.
          </p>
          {qrCode && (
            <div className="flex justify-center mb-4">
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
            </div>
          )}
          <p className="text-xs text-gray-400 text-center mb-4">
            Can't scan? Use this key: <span className="font-mono text-gray-600">{secret}</span>
          </p>
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-2xl tracking-widest mb-4 focus:outline-none focus:border-orange-500"
          />
          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Confirm & Enable 2FA'}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">2FA Enabled!</h2>
          <p className="text-gray-600">Your account is now protected with two-factor authentication.</p>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSetup;