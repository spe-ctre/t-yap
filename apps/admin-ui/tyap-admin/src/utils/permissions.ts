export type AdminRole = 
  | 'SUPER_ADMIN' 
  | 'FINANCE_ADMIN' 
  | 'SUPPORT_ADMIN' 
  | 'OPERATIONS_ADMIN';

export type PageName = 
  | 'dashboard'
  | 'accounts'
  | 'wallets'
  | 'transport'
  | 'revenue'
  | 'support'
  | 'audit-log';

export const ROLE_PERMISSIONS: Record<AdminRole, PageName[]> = {
  SUPER_ADMIN: ['dashboard', 'accounts', 'wallets', 'transport', 'revenue', 'support', 'audit-log'],
  FINANCE_ADMIN: ['wallets', 'revenue'],
  SUPPORT_ADMIN: ['support', 'accounts'],
  OPERATIONS_ADMIN: ['transport', 'dashboard'],
};

export const canAccess = (role: AdminRole, page: PageName): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(page) ?? false;
};