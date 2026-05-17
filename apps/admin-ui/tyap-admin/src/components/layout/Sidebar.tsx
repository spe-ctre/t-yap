import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Truck,
  TrendingUp,
  Headphones,
  ClipboardList,
  LogOut,
  BookOpen,
  CheckSquare,
  Shield,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canAccess, AdminRole, PageName } from '../../utils/permissions';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  page: PageName;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const Sidebar = () => {
  const { logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate('/login');
  };

  const groupedNavs: NavGroup[] = [
    {
      title: 'Core Hub',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, page: 'dashboard' },
        { name: 'Accounts', path: '/accounts', icon: Users, page: 'accounts' },
      ]
    },
    {
      title: 'Financial Suite',
      items: [
        { name: 'Wallets', path: '/wallets', icon: Wallet, page: 'wallets' },
        { name: 'Ledger', path: '/ledger', icon: BookOpen, page: 'ledger' },
        { name: 'Settlements', path: '/settlements', icon: CheckSquare, page: 'settlements' },
        { name: 'Revenue', path: '/revenue', icon: TrendingUp, page: 'revenue' },
      ]
    },
    {
      title: 'Logistics',
      items: [
        { name: 'Transport', path: '/transport', icon: Truck, page: 'transport' },
      ]
    },
    {
      title: 'Administration',
      items: [
        { name: 'Support', path: '/support', icon: Headphones, page: 'support' },
        { name: 'Audit Log', path: '/audit-log', icon: ClipboardList, page: 'audit-log' },
        { name: 'Compliance', path: '/compliance', icon: Shield, page: 'compliance' },
      ]
    }
  ];

  // Filter out items the current role doesn't have access to
  // If a group has no accessible items, we won't render the group header at all.
  const accessibleGroups = groupedNavs.map(group => {
    const allowedItems = group.items.filter(item => 
      role ? canAccess(role as AdminRole, item.page) : false
    );
    return { ...group, items: allowedItems };
  }).filter(group => group.items.length > 0);

  // Auto-expand the group that contains the current active route
  useEffect(() => {
    accessibleGroups.forEach(group => {
      const hasActive = group.items.some(p => location.pathname.startsWith(p.path));
      if (hasActive) {
        setExpandedGroups(prev => prev.includes(group.title) ? prev : [...prev, group.title]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => 
      prev.includes(title) ? prev.filter(g => g !== title) : [...prev, title]
    );
  };

  return (
    <div className="w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-200 flex flex-col shadow-sm z-40">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100 flex-shrink-0">
        <img src="/tyap-logo.svg" alt="T-YAP Logo" className="h-12 w-auto mb-2" />
        <div className="text-xs font-semibold text-orange-600 tracking-wider">ADMIN PORTAL</div>
      </div>

      {/* Navigation - Scrollable Area */}
      <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-6">
          {accessibleGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.title);
            
            return (
              <div key={group.title} className="space-y-2">
                {/* Category Header (Dropdown Toggle) */}
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between text-sm font-bold text-gray-400 uppercase tracking-wider px-2 hover:text-gray-600 transition-colors"
                >
                  <span>{group.title}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Nested Links */}
                <ul className={`space-y-1 transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                  {group.items.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                            isActive
                              ? 'bg-orange-50 text-orange-600 font-bold shadow-sm border border-orange-100'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                          }`
                        }
                      >
                        <item.icon className={`w-5 h-5 ${location.pathname.startsWith(item.path) ? 'text-orange-500' : 'text-gray-400'}`} />
                        <span className="text-base font-medium">{item.name}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Logout - Pinned to Bottom */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center gap-3 px-4 py-3 w-full text-gray-600 font-semibold hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-base">Logout</span>
        </button>
      </div>
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in border border-gray-100">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
              <LogOut className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Confirm Logout</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to end your session? You will need to sign in again to access the admin portal.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-sm hover:shadow"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;