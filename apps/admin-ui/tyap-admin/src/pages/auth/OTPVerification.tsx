import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OTPVerification = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const countdown = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(countdown);
    }
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    console.log('OTP submitted:', otpCode);
    
    // Navigate to success page
    navigate('/login-success');
  };

  const handleResend = () => {
    setTimer(60);
    console.log('Resending OTP...');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Verify</h1>
          <p className="text-sm text-gray-500 mt-2">
            Check your mail for the verification code
          </p>
        </div>

        <form onSubmit={handleVerify}>
          {/* OTP Input Boxes */}
          <div className="flex justify-center gap-3 mb-6">
            {otp.map((digit, index) => (
                <input
      key={index}
      ref={(el) => { 
        if (el) inputRefs.current[index] = el; 
      }}
      type="text"
      maxLength={1}
      value={digit}
      onChange={(e) => handleChange(index, e.target.value)}
      onKeyDown={(e) => handleKeyDown(index, e)}
      className="w-12 h-12 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
    />
                            
  ))}
          </div>

          {/* Resend Timer */}
          <div className="text-center mb-6">
            {timer > 0 ? (
              <p className="text-sm text-gray-500">
                Resend code in{' '}
                <span className="font-semibold text-orange-500">
                  {timer}s
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-sm text-orange-500 font-semibold hover:underline"
              >
                Resend Code
              </button>
            )}
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition duration-200"
          >
            Verify
          </button>
        </form>
      </div>
    </div>
  );
};

export default OTPVerification;