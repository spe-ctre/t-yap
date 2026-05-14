import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const LoginSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto redirect to dashboard after 2 seconds
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-12 w-full max-w-md text-center">
        {/* Orange Checkmark Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-orange-500" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Login Successful
        </h1>
        <p className="text-gray-500">
          Thank you, you have been verified
        </p>

        {/* Loading indicator */}
        <div className="mt-8">
          <div className="inline-block">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSuccess;