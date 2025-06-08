import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

interface GeoLocation {
    city?: string;
    country?: string;
    [key: string]: any;
}

function isGeoLocation(value: any): value is GeoLocation {
    return value && typeof value === 'object' && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const projectId = searchParams.get('projectId');
        const format_type = searchParams.get('format') || 'csv';

        const where: any = {
            OR: [
                { userId: session.user.id },
                {
                    resource: 'project',
                    resourceId: {
                        in: await prisma.projectMember
                            .findMany({
                                where: { userId: session.user.id },
                                select: { projectId: true },
                            })
                            .then(members => members.map(m => m.projectId)),
                    },
                },
            ],
        };

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) where.timestamp.lte = new Date(endDate);
        }

        if (projectId) {
            const membership = await prisma.projectMember.findFirst({
                where: { projectId, userId: session.user.id },
            });

            if (!membership) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            where.OR = [
                { userId: session.user.id, resource: 'project', resourceId: projectId },
                {
                    details: {
                        path: ['projectId'],
                        equals: projectId,
                    },
                },
            ];
        }

        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { timestamp: 'desc' },
            take: 10000,
        });

        if (format_type === 'json') {
            return NextResponse.json(logs);
        }

        const csvHeaders = [
            'Timestamp',
            'User Name',
            'User Email',
            'Action',
            'Resource',
            'Resource ID',
            'IP Address',
            'User Agent',
            'Request Type',
            'Location',
            'Details',
        ];

        const csvRows = logs.map(log => {
            let locationString = '';
            if (log.geoLocation && isGeoLocation(log.geoLocation)) {
                const city = log.geoLocation.city || '';
                const country = log.geoLocation.country || '';
                locationString = city || country ? `${city}, ${country}` : '';
            }

            return [
                format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                log.user?.name || 'Unknown',
                log.user?.email || 'Unknown',
                log.action,
                log.resource,
                log.resourceId || '',
                log.ipAddress || '',
                log.userAgent || '',
                log.requestType || '',
                locationString,
                JSON.stringify(log.details || {}),
            ];
        });

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
            },
        });
    } catch (error) {
        console.error('Error exporting audit logs:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}