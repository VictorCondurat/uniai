import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { subDays } from 'date-fns';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const format = searchParams.get('format') || 'csv';
        const days = searchParams.get('days') || '7';
        const projectId = searchParams.get('projectId');
        const provider = searchParams.get('provider');
        const model = searchParams.get('model');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                timestamp: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            };
        } else {
            dateFilter = {
                timestamp: {
                    gte: subDays(new Date(), parseInt(days)),
                },
            };
        }

        const where: any = {
            userId: user.id,
            ...dateFilter,
        };

        if (projectId && projectId !== 'all') {
            where.projectId = projectId;
        }
        if (provider && provider !== 'all') {
            where.provider = provider;
        }
        if (model && model !== 'all') {
            where.model = model;
        }

        const usage = await prisma.usage.findMany({
            where,
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                apiKey: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
        });

        if (format === 'json') {
            const filename = `usage-export-${new Date().toISOString().split('T')[0]}.json`;
            return new NextResponse(JSON.stringify(usage, null, 2), {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            });
        } else {
            const headers = [
                'Timestamp',
                'Request ID',
                'Provider',
                'Model',
                'Project',
                'API Key',
                'Input Tokens',
                'Output Tokens',
                'Cost',
                'Markup',
                'Total Cost',
                'Latency (ms)',
                'Success',
                'Cached',
                'Cache Hit',
                'Endpoint',
            ];

            const rows = usage.map(record => [
                record.timestamp,
                record.requestId,
                record.provider,
                record.model,
                record.project?.name || '',
                record.apiKey?.name || '',
                record.tokensInput,
                record.tokensOutput,
                record.cost,
                record.markup,
                record.totalCost,
                record.latency,
                record.success,
                record.cached,
                record.cacheHit,
                record.endpoint,
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => {
                    const str = String(cell);
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                }).join(','))
            ].join('\n');

            const filename = `usage-export-${new Date().toISOString().split('T')[0]}.csv`;
            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            });
        }
    } catch (error) {
        console.error('Failed to export usage:', error);
        return NextResponse.json({ error: 'Failed to export usage' }, { status: 500 });
    }
}