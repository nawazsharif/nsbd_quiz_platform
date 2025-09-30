'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { UserRole, Permission, USER_ROLES, CustomUser } from '@/lib/auth';
import { usePermissions } from '@/hooks/usePermissions';

interface AuthContextType {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    permissions: Permission[];
  } | null;
  isLoading: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isUser: boolean;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { permissions: dynamicPermissions, isLoading: permissionsLoading } = usePermissions();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== 'loading') {
      setIsLoading(false);
    }
  }, [status]);

  const sessionUser = session?.user as CustomUser & { id?: string; name?: string; email?: string; image?: string };
  const user = sessionUser ? {
    id: sessionUser.id || '',
    name: sessionUser.name || '',
    email: sessionUser.email || '',
    role: sessionUser.role || USER_ROLES.USER,
    avatar: sessionUser.image || '',
    permissions: dynamicPermissions.length > 0 ? dynamicPermissions : (sessionUser.permissions || [])
  } : null;

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return user.permissions?.includes(permission) || false;
  };

  const hasRole = (role: UserRole): boolean => {
    if (!user) return role === USER_ROLES.GUEST;
    return user.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user) return roles.includes(USER_ROLES.GUEST);
    return roles.includes(user.role);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user) return false;
    return permissions.some(permission => user.permissions?.includes(permission));
  };

  const isAdmin = hasAnyRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]);
  const isSuperAdmin = hasRole(USER_ROLES.SUPER_ADMIN);
  const isUser = hasRole(USER_ROLES.USER);
  const isGuest = !user || hasRole(USER_ROLES.GUEST);

  const value: AuthContextType = {
    user,
    isLoading: isLoading || (session ? permissionsLoading : false),
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAnyPermission,
    isAdmin,
    isSuperAdmin,
    isUser,
    isGuest,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
