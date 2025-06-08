'use client';

import {ProjectRole} from '@prisma/client';
import {rolePermissions, ProjectPermission} from '@/lib/permissions';

export const useProjectPermissions = (
    userRole: ProjectRole | undefined,
    userPermissions: Record<string, boolean> = {}
) => {

    const can = (permission: ProjectPermission): boolean => {
        if (!userRole) {
            return false;
        }

        if (userPermissions[permission] !== undefined) {
            return userPermissions[permission];
        }

        const permissionsForRole = rolePermissions[userRole];
        if (permissionsForRole.includes('*')) {
            return true;
        }
        return (permissionsForRole as ProjectPermission[]).includes(permission);
    };

    return {can};
};