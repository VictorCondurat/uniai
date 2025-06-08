import { ProjectRole } from '@prisma/client';

export const ALL_PERMISSIONS = [
    'project:read',
    'project:update',
    'project:delete',
    'project:transfer-ownership',
    'project:manage-models',
    'project:manage-spending-limits',

    'members:read',
    'members:invite',
    'members:remove',
    'members:update-role',

    'api-keys:create',
    'api-keys:read',
    'api-keys:update',
    'api-keys:revoke',

    'fallbacks:create',
    'fallbacks:read',
    'fallbacks:update',
    'fallbacks:delete',
    'fallbacks:set-default',

    'usage:read',
    'audit-logs:read',

    'billing:read',
    'billing:manage',

    '*',
] as const;

export type ProjectPermission = typeof ALL_PERMISSIONS[number];

export const rolePermissions: Record<ProjectRole, ProjectPermission[] | ['*']> = {

    OWNER: ['*'],

    ADMIN: [
        'project:read', 'project:update', 'project:manage-models', 'project:manage-spending-limits',
        'members:read', 'members:invite', 'members:remove', 'members:update-role',
        'api-keys:create', 'api-keys:read', 'api-keys:update', 'api-keys:revoke',
        'fallbacks:create', 'fallbacks:read', 'fallbacks:update', 'fallbacks:delete', 'fallbacks:set-default',
        'usage:read',
        'audit-logs:read',
        'billing:read',
    ],

    MEMBER: [
        'project:read',
        'members:read',
        'api-keys:create',
        'api-keys:read',
        'api-keys:update',
        'api-keys:revoke',
        'fallbacks:create',
        'fallbacks:read',
        'fallbacks:update',
        'fallbacks:delete',
        'usage:read',
        'audit-logs:read',
    ],
    BILLING: [
        'project:read',
        'members:read',
        'usage:read',
        'audit-logs:read',
        'billing:read',
        'billing:manage',
    ],

    VIEWER: [
        'project:read',
        'members:read',
        'api-keys:read',
        'fallbacks:read',
        'usage:read',
        'audit-logs:read',
        'billing:read',
    ],
};


export function roleHasPermission(role: ProjectRole, permission: ProjectPermission): boolean {
    const permissions = rolePermissions[role];

    if (!permissions) {
        return false;
    }

    if (permissions.includes('*')) {
        return true;
    }

    return (permissions as ProjectPermission[]).includes(permission);
}