import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AuthService } from '../services/auth.service';
import { AdminRole } from '../utils/permissions';

interface User {
  id: string;
  email: string;
  phoneNumber: string;
  role: AdminRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  role: AdminRole | null;
  showWarning: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const WARNING_TIME = 25 * 60 * 1000;  // 25 minutes
const LOGOUT_TIME = 30 * 60 * 1000;   // 30 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(AuthService.getUser());
  const [showWarning, setShowWarning] = useState(false);
  const warningTimer = useRef<NodeJS.Timeout | null>(null);
  const logoutTimer = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(() => {
    AuthService.logout();
    setUser(null);
    setShowWarning(false);
  }, []);

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);

    // Don't set timers if not logged in
    if (!AuthService.getToken()) return;

    setShowWarning(false);

    // Show warning at 25 minutes
    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
    }, WARNING_TIME);

    // Auto logout at 30 minutes
    logoutTimer.current = setTimeout(() => {
      logout();
    }, LOGOUT_TIME);
  }, [logout]);

  const extendSession = useCallback(() => {
    setShowWarning(false);
    resetTimers();
  }, [resetTimers]);

  // Reset timers on any user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => resetTimers();
    
    events.forEach(event => window.addEventListener(event, handleActivity));
    resetTimers(); // Start timers on login

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, [user, resetTimers]);

  const login = async (username: string, password: string) => {
    const response = await AuthService.login(username, password);
    AuthService.setSession(response.data.token, response.data.user);
    setUser(response.data.user as User);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, role: user?.role ?? null, showWarning, login, logout, extendSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};