import { NextRequest, NextResponse } from 'next/server';
import { ALL_PERMISSIONS } from '@/lib/permissions';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';
function getStructuredPermissions() {
    const structure: Record<string, { name: string; description: string; scopes: Record<string, string> }> = {
        project: { name: "Project Settings", description: "Manage project name, description, and high-level settings.", scopes: {} },
        members: { name: "Members", description: "Manage project members and their roles.", scopes: {} },
        'api-keys': { name: "API Keys", description: "Manage project-specific API keys.", scopes: {} },
        fallbacks: { name: "Fallback Chains", description: "Manage the logic for model fallbacks and retries.", scopes: {} },
        usage: { name: "Analytics", description: "View usage and cost dashboards.", scopes: {} },
        billing: { name: "Billing", description: "View and manage billing details and invoices.", scopes: {} },
        'audit-logs': { name: "Audit Logs", description: "View the project's activity log.", scopes: {} },
    };

    const actionDescriptions: Record<string, string> = {
        'read': 'View', 'update': 'Update', 'delete': 'Delete', 'create': 'Create',
        'invite': 'Invite', 'remove': 'Remove', 'update-role': 'Update Role', 'revoke': 'Revoke',
        'transfer-ownership': 'Transfer Ownership', 'manage-models': 'Manage Allowed Models',
        'manage-spending-limits': 'Manage Spending Limits', 'set-default': 'Set as Default', 'manage': 'Manage'
    };

    ALL_PERMISSIONS.forEach(permission => {
        const [resource, action] = permission.split(':');
        if (structure[resource]) {
            const friendlyResource = resource.replace(/-/g, ' ');
            const friendlyAction = action.replace(/-/g, ' ');
            const description = `${actionDescriptions[action] || friendlyAction.charAt(0).toUpperCase() + friendlyAction.slice(1)} ${friendlyResource}`;
            structure[resource].scopes[permission] = description;
        }
    });

    return Object.values(structure).filter(group => Object.keys(group.scopes).length > 0);
}

export async function GET(req: NextRequest) {
    const startTime = Date.now();
    const structuredPermissions = getStructuredPermissions();
    await auditHelpers.logUserAction(
        'anonymous',
        AUDIT_ACTIONS.ROUTE_ACCESSED,
        {
            action: 'project_permissions_viewed',
            permissionsCount: structuredPermissions.length,
            duration: Date.now() - startTime,
        },
        req
    );
    return NextResponse.json(structuredPermissions);
}