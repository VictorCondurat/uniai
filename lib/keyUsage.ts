import { prisma } from '@/lib/prisma';
import { startOfDay, startOfMonth } from 'date-fns';
import { checkProjectPermission } from '@/lib/auth';

export interface KeyUsageStatus {
    keyId: string;
    usage: {
        daily: number;
        monthly: number;
        total: number;
    };
    limits: {
        daily: number | null;
        monthly: number | null;
        total: number | null;
    };
    limitExceeded: {
        daily: boolean;
        monthly: boolean;
        total: boolean;
        any: boolean;
    };
    status: 'ok' | 'limit_exceeded' | 'inactive' | 'expired' | 'not_found';
}

export async function getKeyUsageStatus(keyId: string): Promise<KeyUsageStatus | null> {
    const apiKey = await prisma.apiKey.findUnique({
        where: { id: keyId },
        include: {
            project: { select: { ownerId: true } }
        }
    });

    if (!apiKey) {
        return null;
    }

    if (!apiKey.active) {
        return {
            keyId: apiKey.id,
            usage: { daily: 0, monthly: 0, total: 0 },
            limits: {
                daily: apiKey.dailyUsageLimit,
                monthly: apiKey.monthlyUsageLimit,
                total: apiKey.totalUsageLimit,
            },
            limitExceeded: { daily: false, monthly: false, total: false, any: false },
            status: 'inactive'
        };
    }

    if (apiKey.expires && new Date(apiKey.expires) < new Date()) {
        return {
            keyId: apiKey.id,
            usage: { daily: 0, monthly: 0, total: 0 },
            limits: {
                daily: apiKey.dailyUsageLimit,
                monthly: apiKey.monthlyUsageLimit,
                total: apiKey.totalUsageLimit,
            },
            limitExceeded: { daily: false, monthly: false, total: false, any: false },
            status: 'expired'
        };
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const thisMonthStart = startOfMonth(now);

    const [dailyUsage, monthlyUsage, totalUsage] = await Promise.all([
        prisma.usage.aggregate({
            where: { apiKeyId: keyId, timestamp: { gte: todayStart } },
            _sum: { totalCost: true }
        }),
        prisma.usage.aggregate({
            where: { apiKeyId: keyId, timestamp: { gte: thisMonthStart } },
            _sum: { totalCost: true }
        }),
        prisma.usage.aggregate({
            where: { apiKeyId: keyId },
            _sum: { totalCost: true }
        }),
    ]);

    const usage = {
        daily: dailyUsage._sum.totalCost ?? 0,
        monthly: monthlyUsage._sum.totalCost ?? 0,
        total: totalUsage._sum.totalCost ?? 0,
    };

    const limits = {
        daily: apiKey.dailyUsageLimit,
        monthly: apiKey.monthlyUsageLimit,
        total: apiKey.totalUsageLimit,
    };

    const limitExceeded = {
        daily: limits.daily !== null && usage.daily >= limits.daily,
        monthly: limits.monthly !== null && usage.monthly >= limits.monthly,
        total: limits.total !== null && usage.total >= limits.total,
        any: false
    };
    limitExceeded.any = limitExceeded.daily || limitExceeded.monthly || limitExceeded.total;

    return {
        keyId: apiKey.id,
        usage,
        limits,
        limitExceeded,
        status: limitExceeded.any ? 'limit_exceeded' : 'ok',
    };
}

export async function checkKeyAuthorization(keyId: string, userId: string): Promise<boolean> {
    const apiKey = await prisma.apiKey.findUnique({
        where: { id: keyId },
        include: {
            project: { select: { ownerId: true } }
        }
    });

    if (!apiKey) return false;

    if (!apiKey.projectId && apiKey.userId === userId) {
        return true;
    }

    if (apiKey.projectId && apiKey.project) {
        if (apiKey.project.ownerId === userId) {
            return true;
        }
        return await checkProjectPermission(userId, apiKey.projectId, 'api-keys:read');
    }

    return false;
}