import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { prisma } from '@/lib/prisma';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';

export async function GET(request: NextRequest) {
    const startTime = Date.now();
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
        const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

        if (id) {
            const invoice = await prisma.invoice.findFirst({
                where: {
                    id,
                    userId: user.id
                }
            });

            if (!invoice) {
                return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
            }
            await auditHelpers.logInvoiceAction(
                user.id,
                AUDIT_ACTIONS.ROUTE_ACCESSED,
                invoice.id,
                {
                    action: 'invoice_viewed',
                    invoiceNumber: invoice.invoiceNumber,
                    invoiceStatus: invoice.status,
                    duration: Date.now() - startTime,
                },
                request
            );
            return NextResponse.json({
                success: true,
                data: invoice
            });
        }

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where: { userId: user.id },
                orderBy: { issueDate: 'desc' },
                take: limit,
                skip: offset
            }),
            prisma.invoice.count({
                where: { userId: user.id }
            })
        ]);
        await auditHelpers.logUserAction(
            user.id,
            AUDIT_ACTIONS.ROUTE_ACCESSED,
            {
                action: 'invoices_list_viewed',
                invoicesCount: invoices.length,
                totalInvoices: total,
                limit,
                offset,
                duration: Date.now() - startTime,
            },
            request
        );
        return NextResponse.json({
            success: true,
            data: invoices,
            pagination: {
                total,
                limit,
                offset
            }
        });

    } catch (error) {
        console.error('Failed to fetch invoices:', error);

        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }
}