import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, checkProjectPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;
    const body = await req.json();

    try {
        const { projectIds, format = 'json', includeUsage = false } = body;

        if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
            return NextResponse.json({ error: 'projectIds must be a non-empty array' }, { status: 400 });
        }

        for (const projectId of projectIds) {
            const hasPermission = await checkProjectPermission(user.id, projectId, 'usage:read');
            if (!hasPermission) {
                return NextResponse.json(
                    { error: `You are not authorized to export data for project ${projectId}` },
                    { status: 403 }
                );
            }
        }

        const projects = await prisma.project.findMany({
            where: {
                id: { in: projectIds },
            },
            include: {
                apiKeys: {
                    select: { id: true, name: true, active: true, created: true, permissions: true, models: true },
                },
                fallbackChains: true,
            },
        });

        let exportData: any = {
            exportDate: new Date().toISOString(),
            projects: projects,
        };

        if (includeUsage) {
            const usage = await prisma.usage.findMany({
                where: { projectId: { in: projectIds } },
                select: {
                    timestamp: true, provider: true, model: true, tokensInput: true,
                    tokensOutput: true, totalCost: true, success: true, latency: true, endpoint: true,
                },
                orderBy: { timestamp: 'desc' },
                take: 10000,
            });
            exportData.usage = usage;
        }

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'projects_exported',
                resource: 'project',
                details: { projectIds, format, includeUsage, recordCount: includeUsage ? exportData.usage?.length || 0 : 0 },
            },
        });
        await auditHelpers.logUserAction(
            user.id,
            AUDIT_ACTIONS.ROUTE_ACCESSED,
            {
                action: 'projects_exported',
                projectIds,
                projectsCount: projectIds.length,
                format,
                includeUsage,
                recordCount: includeUsage ? exportData.usage?.length || 0 : 0,
                exportSizeKB: Math.round(JSON.stringify(exportData).length / 1024),
                duration: Date.now() - startTime,
            },
            req
        );
        if (format === 'csv' && includeUsage && exportData.usage?.length > 0) {
            const csv = convertUsageToCSV(exportData.usage);
            return new NextResponse(csv, {
                headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=project-usage-export.csv' },
            });
        }

        return NextResponse.json(exportData);
    } catch (error) {
        console.error('Error exporting project data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logUserAction(
            user.id,
            'projects_export_failed' as any,
            {
                error: errorMessage,
                projectIds: body?.projectIds,
                duration: Date.now() - startTime,
            },
            req
        );

        return NextResponse.json({ error: 'Failed to export project data' }, { status: 500 });
    }
}

function convertUsageToCSV(usage: any[]): string {
    if (usage.length === 0) return '';
    const headers = Object.keys(usage[0]).join(',');
    const rows = usage.map(row => Object.values(row).map(val => typeof val === 'string' && val.includes(',') ? `"${val}"` : val).join(','));
    return [headers, ...rows].join('\n');
}