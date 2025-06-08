import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/auth';
import { gatherUsageDataForInvoice, formatInvoiceData } from '@/lib/invoice-data';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';
export async function POST(request: NextRequest) {
    try {
        const startTime = Date.now();
        const authResult = await authMiddleware(request);
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const authenticatedUser = authResult;
        if (!authenticatedUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authenticatedUser.id;

        const body = await request.json();
        const { startDate, endDate } = body;

        const now = new Date();
        const period = {
            start: startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1),
            end: endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        };

        const lineItems = await gatherUsageDataForInvoice(prisma, userId, period);

        if (lineItems.length === 0) {
            return NextResponse.json({
                success: true,
                data: null,
                message: 'No usage data found for the specified period'
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const clientInfo = {
            name: user.name || 'N/A',
            email: user.email,
            address: 'Address not provided',
            city: 'City not provided',
            country: 'Romania',
            taxId: undefined,
            vatNumber: undefined,
        };

        const invoiceData = formatInvoiceData(
            user,
            clientInfo,
            lineItems,
            period,
            {
                currency: process.env.INVOICE_CURRENCY || 'USD',
                notes: process.env.INVOICE_NOTES || "Thank you for your business! Payments are due within 30 days.",
            }
        );
        await auditHelpers.logUserAction(
            userId,
            AUDIT_ACTIONS.ROUTE_ACCESSED,
            {
                action: 'invoice_preview_generated',
                periodStart: period.start.toISOString(),
                periodEnd: period.end.toISOString(),
                lineItemsCount: lineItems.length,
                totalAmount: invoiceData.summary.total,
                currency: invoiceData.currency,
                duration: Date.now() - startTime,
            },
            request
        );
        return NextResponse.json({
            success: true,
            data: invoiceData,
        });

    } catch (error) {
        console.error('Error generating invoice preview:', error);

        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json(
            { error: 'Failed to generate invoice preview', details: errorMessage },
            { status: 500 }
        );
    }
}