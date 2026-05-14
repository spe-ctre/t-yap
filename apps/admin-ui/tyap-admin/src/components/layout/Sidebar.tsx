import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Truck,
  TrendingUp,
  Headphones,
  ClipboardList,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canAccess, AdminRole, PageName } from '../../utils/permissions';

const Sidebar = () => {
  const { logout, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, page: 'dashboard' as PageName },
    { name: 'Accounts', path: '/accounts', icon: Users, page: 'accounts' as PageName },
    { name: 'Wallets', path: '/wallets', icon: Wallet, page: 'wallets' as PageName },
    { name: 'Transport', path: '/transport', icon: Truck, page: 'transport' as PageName },
    { name: 'Revenue', path: '/revenue', icon: TrendingUp, page: 'revenue' as PageName },
    { name: 'Support', path: '/support', icon: Headphones, page: 'support' as PageName },
    { name: 'Audit Log', path: '/audit-log', icon: ClipboardList, page: 'audit-log' as PageName },
  ];

  // Only show nav items the current role has access to
  const navItems = allNavItems.filter(item => 
    role ? canAccess(role as AdminRole, item.page) : false
  );

  return (
    <div className="w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <img src="/tyap-logo.svg" alt="T-YAP Logo" className="h-12 w-auto mb-2" />
        <div className="text-xs text-gray-400">Admin Dashboard</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-orange-50 text-orange-500 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-gray-600 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;