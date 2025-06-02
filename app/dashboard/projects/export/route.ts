import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    const authResult = await authMiddleware(req);

    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const user = authResult;

    try {
        const body = await req.json();
        const { projectIds, format = 'json', includeUsage = false } = body;

        const projects = await prisma.project.findMany({
            where: {
                id: {
                    in: projectIds,
                },
                userId: user.id,
            },
            include: {
                apiKeys: {
                    select: {
                        id: true,
                        name: true,
                        active: true,
                        created: true,
                        permissions: true,
                        models: true,
                    },
                },
                modelChains: true,

            },
        });

        if (projects.length !== projectIds.length) {
            return NextResponse.json(
                { error: 'Some projects not found or unauthorized' },
                { status: 403 }
            );
        }

        let exportData: any = {
            exportDate: new Date().toISOString(),
            projects: projects,
        };

        if (includeUsage) {
            const usage = await prisma.usage.findMany({
                where: {
                    projectId: {
                        in: projectIds,
                    },
                },
                select: {
                    timestamp: true,
                    provider: true,
                    model: true,
                    tokensInput: true,
                    tokensOutput: true,
                    totalCost: true,
                    success: true,
                    latency: true,
                    endpoint: true,
                },
                orderBy: {
                    timestamp: 'desc',
                },
                take: 10000,
            });

            exportData.usage = usage;
        }

        // Log the export
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'projects_exported',
                resource: 'project',
                details: {
                    projectIds,
                    format,
                    includeUsage,
                    recordCount: includeUsage ? exportData.usage.length : 0,
                },
            },
        });

        if (format === 'csv' && includeUsage) {
            // Convert to CSV format for usage data
            const csv = convertUsageToCSV(exportData.usage);
            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename=project-usage-export.csv',
                },
            });
        }

        return NextResponse.json(exportData);
    } catch (error) {
        console.error('Error exporting project data:', error);
        return NextResponse.json(
            { error: 'Failed to export project data' },
            { status: 500 }
        );
    }
}

function convertUsageToCSV(usage: any[]): string {
    if (usage.length === 0) return '';

    const headers = Object.keys(usage[0]).join(',');
    const rows = usage.map(row =>
        Object.values(row).map(val =>
            typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        ).join(',')
    );

    return [headers, ...rows].join('\n');
}