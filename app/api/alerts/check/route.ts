import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendHighUsageAlert } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const alerts = await prisma.alert.findMany({
            where: {
                triggered: false,
            },
            include: {
                user: true,
            },
        });

        for (const alert of alerts) {
            let shouldTrigger = false;

            switch (alert.type) {
                case 'budget':
                    const monthlyUsage = await prisma.usage.aggregate({
                        where: {
                            userId: alert.userId,
                            timestamp: {
                                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                            },
                        },
                        _sum: {
                            totalCost: true,
                        },
                    });

                    if ((monthlyUsage._sum.totalCost || 0) >= alert.threshold) {
                        shouldTrigger = true;
                    }
                    break;

            }

            if (shouldTrigger) {
                await prisma.alert.update({
                    where: { id: alert.id },
                    data: { triggered: true },
                });
            }
        }

        const costAlerts = await prisma.costAlert.findMany({
            where: {
                active: true,
            },
            include: {
                user: true,
            },
        });

        for (const alert of costAlerts) {
            let currentSpend = 0;
            const now = new Date();

            switch (alert.type) {
                case 'daily':
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dailyUsage = await prisma.usage.aggregate({
                        where: {
                            userId: alert.userId,
                            timestamp: {
                                gte: today,
                            },
                        },
                        _sum: {
                            totalCost: true,
                        },
                    });
                    currentSpend = dailyUsage._sum.totalCost || 0;
                    break;

                case 'weekly':
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    const weeklyUsage = await prisma.usage.aggregate({
                        where: {
                            userId: alert.userId,
                            timestamp: {
                                gte: weekAgo,
                            },
                        },
                        _sum: {
                            totalCost: true,
                        },
                    });
                    currentSpend = weeklyUsage._sum.totalCost || 0;
                    break;

                case 'monthly':
                case 'threshold':
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const monthlyUsage = await prisma.usage.aggregate({
                        where: {
                            userId: alert.userId,
                            timestamp: {
                                gte: startOfMonth,
                            },
                        },
                        _sum: {
                            totalCost: true,
                        },
                    });
                    currentSpend = monthlyUsage._sum.totalCost || 0;
                    break;
            }

            await prisma.costAlert.update({
                where: { id: alert.id },
                data: { currentSpend },
            });

            if (currentSpend >= alert.threshold) {
                const shouldSendAlert = !alert.lastTriggered ||
                    (now.getTime() - alert.lastTriggered.getTime()) > 24 * 60 * 60 * 1000;

                if (shouldSendAlert) {
                    if (alert.emailAlert && alert.user?.email) {
                        await sendHighUsageAlert(
                            alert.user.email,
                            currentSpend,
                            alert.threshold,
                            alert.user.name || undefined
                        );
                    }

                    if (alert.webhookUrl) {
                        try {
                            await fetch(alert.webhookUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    alertId: alert.id,
                                    alertName: alert.name,
                                    type: alert.type,
                                    threshold: alert.threshold,
                                    currentSpend,
                                    userId: alert.userId,
                                    timestamp: now.toISOString(),
                                }),
                            });
                        } catch (webhookError) {
                            console.error('Failed to send webhook:', webhookError);
                        }
                    }

                    await prisma.costAlert.update({
                        where: { id: alert.id },
                        data: { lastTriggered: now },
                    });

                    await prisma.auditLog.create({
                        data: {
                            userId: alert.userId,
                            action: 'cost_alert_triggered',
                            resource: 'cost_alert',
                            resourceId: alert.id,
                            details: {
                                alertName: alert.name,
                                threshold: alert.threshold,
                                currentSpend,
                                type: alert.type,
                            },
                        },
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            alertsChecked: alerts.length,
            costAlertsChecked: costAlerts.length,
        });
    } catch (error) {
        console.error('Error checking alerts:', error);
        return NextResponse.json(
            { error: 'Failed to check alerts' },
            { status: 500 }
        );
    }
}