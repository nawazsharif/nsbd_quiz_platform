'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { authAPI } from '@/lib/auth-utils';
import { Permission, UserRole } from '@/lib/auth';
import { isApiAvailable } from '@/lib/apiBase';

interface UsePermissionsReturn {
  permissions: Permission[];
  roles: UserRole[];
  allPermissions: Permission[];
  isLoading: boolean;
  error: string | null;
  refreshPermissions: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
}

export function usePermissions(): UsePermissionsReturn {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    // Don't make API calls if backend is not available
    if (!isApiAvailable()) {
      setPermissions([]);
      setRoles([]);
      setAllPermissions([]);
      setIsLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (session as any)?.accessToken;
    if (!accessToken) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Always try to get user permissions first
      const permissionsData = await authAPI.getUserPermissions(accessToken);
      setPermissions(permissionsData.permissions || []);

      // Try to get roles and all permissions, but don't fail if user doesn't have access
      const promises = [
        authAPI.getAllRoles(accessToken).catch(() => ({ roles: [] })),
        authAPI.getAllPermissions(accessToken).catch(() => ({ permissions: [] })),
      ];

      const [rolesData, allPermissionsData] = await Promise.all(promises);

      setRoles(rolesData.roles || []);
      setAllPermissions(allPermissionsData.permissions || []);
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
      // Set empty arrays on error to prevent crashes
      setPermissions([]);
      setRoles([]);
      setAllPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const refreshPermissions = useCallback(async () => {
    await fetchPermissions();
  }, [fetchPermissions]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const hasAnyPermission = useCallback((requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.some(permission => permissions.includes(permission));
  }, [permissions]);

  return {
    permissions,
    roles,
    allPermissions,
    isLoading,
    error,
    refreshPermissions,
    hasPermission,
    hasAnyPermission,
  };
}
