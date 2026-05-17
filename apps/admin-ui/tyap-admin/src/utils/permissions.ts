export type AdminRole = 
  | 'SUPER_ADMIN' 
  | 'FINANCE_ADMIN' 
  | 'SUPPORT_ADMIN' 
  | 'OPERATIONS_ADMIN'
  | 'COMPLIANCE_OFFICER'
  | 'SYSTEM_ENGINEER';

export type PageName = 
  | 'dashboard'
  | 'accounts'
  | 'wallets'
  | 'transport'
  | 'revenue'
  | 'ledger'
  | 'settlements'
  | 'support'
  | 'audit-log'
  | 'compliance';

export const ROLE_PERMISSIONS: Record<AdminRole, PageName[]> = {
  SUPER_ADMIN: ['dashboard', 'accounts', 'wallets', 'ledger', 'settlements', 'transport', 'revenue', 'support', 'audit-log', 'compliance'],
  FINANCE_ADMIN: ['wallets', 'ledger', 'settlements', 'revenue'],
  SUPPORT_ADMIN: ['support', 'accounts'],
  OPERATIONS_ADMIN: ['transport'],
  COMPLIANCE_OFFICER: ['compliance', 'accounts', 'audit-log'],
  SYSTEM_ENGINEER: ['dashboard', 'audit-log'],
};

export const canAccess = (role: AdminRole, page: PageName): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(page) ?? false;
};