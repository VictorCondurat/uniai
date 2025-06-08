import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('50'),
    action: z.string().optional(),
    resource: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
    projectId: z.string().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = querySchema.parse(Object.fromEntries(searchParams));

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

        if (query.action) {
            where.action = query.action;
        }

        if (query.resource) {
            where.resource = query.resource;
        }

        if (query.projectId) {
            const membership = await prisma.projectMember.findFirst({
                where: {
                    projectId: query.projectId,
                    userId: session.user.id,
                },
            });

            if (!membership) {
                return NextResponse.json({ error: 'Access denied to project' }, { status: 403 });
            }

            where.OR = [
                { userId: session.user.id, resource: 'project', resourceId: query.projectId },
                {
                    details: {
                        path: ['projectId'],
                        equals: query.projectId,
                    },
                },
            ];
        }

        if (query.startDate || query.endDate) {
            where.timestamp = {};
            if (query.startDate) {
                where.timestamp.gte = new Date(query.startDate);
            }
            if (query.endDate) {
                where.timestamp.lte = new Date(query.endDate);
            }
        }

        if (query.search) {
            where.OR = [
                ...where.OR,
                { action: { contains: query.search, mode: 'insensitive' } },
                { resource: { contains: query.search, mode: 'insensitive' } },
                { resourceId: { contains: query.search, mode: 'insensitive' } },
                { ipAddress: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        const total = await prisma.auditLog.count({ where });

        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
            orderBy: { timestamp: 'desc' },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        });

        return NextResponse.json({
            logs,
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                pages: Math.ceil(total / query.limit),
            },
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
