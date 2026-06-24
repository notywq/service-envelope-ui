import type { AuthRole } from '../types';

export const isRole = (role: string | undefined, target: AuthRole): boolean => role === target;

export const isAdminRole = (role?: string): boolean => role === 'admin' || role === 'super_admin';

export const isSuperAdmin = (role?: string): boolean => role === 'super_admin';

export const isRequester = (role?: string): boolean => role === 'requester';

export const isOrchestrator = (role?: string): boolean => role === 'orchestrator';

export const canViewRequestList = (role?: string): boolean => isAdminRole(role);

export const canUseAdminTools = (role?: string): boolean => isAdminRole(role);

export const canManageAuthUsers = (role?: string): boolean => isSuperAdmin(role);

export const canSubmitRequests = (role?: string): boolean => {
  return role === 'requester' || isAdminRole(role);
};

