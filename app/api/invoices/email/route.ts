import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import { generateInvoicePDF } from '@/lib/pdf';
import { gatherUsageDataForInvoice, formatInvoiceData } from '@/lib/invoice-data';

export async function POST(request: NextRequest) {
    try {
        const user = await authMiddleware(request);
        if (user instanceof NextResponse) {
            return user;
        }

        const body = await request.json();
        const { invoiceData, sendEmail = true, saveToDatabase = true, period, clientInfo } = body;

        let finalInvoiceData = invoiceData;

        if (!invoiceData && period) {
            const lineItems = await gatherUsageDataForInvoice(
                prisma,
                user.id,
                {
                    start: new Date(period.start),
                    end: new Date(period.end)
                }
            );

            if (lineItems.length === 0) {
                return NextResponse.json(
                    { error: 'No usage data found for the specified period' },
                    { status: 400 }
                );
            }

            const client = clientInfo || {
                name: user.name || 'N/A',
                email: user.email,
                country: 'Romania'
            };

            finalInvoiceData = formatInvoiceData(
                user,
                client,
                lineItems,
                {
                    start: new Date(period.start),
                    end: new Date(period.end)
                }
            );
        }

        if (!finalInvoiceData) {
            return NextResponse.json(
                { error: 'Invoice data is required' },
                { status: 400 }
            );
        }

        const pdfBuffer = await generateInvoicePDF(finalInvoiceData);

        if (!pdfBuffer) {
            return NextResponse.json(
                { error: 'Failed to generate PDF' },
                { status: 500 }
            );
        }

        let emailResult = null;
        let invoiceRecord = null;

        if (sendEmail) {
            emailResult = await sendInvoiceEmail(finalInvoiceData, pdfBuffer);

            if (!emailResult.success) {
                return NextResponse.json(
                    { error: 'Failed to send invoice email', details: emailResult.error },
                    { status: 500 }
                );
            }
        }

        if (saveToDatabase) {
            invoiceRecord = await prisma.invoice.create({
                data: {
                    userId: user.id,
                    invoiceNumber: finalInvoiceData.invoiceNumber,
                    amount: finalInvoiceData.summary.total,
                    subtotal: finalInvoiceData.summary.subtotal,
                    vatAmount: finalInvoiceData.summary.vatAmount,
                    markupAmount: finalInvoiceData.summary.markupAmount,
                    currency: finalInvoiceData.currency,
                    status: 'pending',
                    issueDate: new Date(finalInvoiceData.issueDate),
                    dueDate: new Date(finalInvoiceData.dueDate),
                    periodStart: new Date(finalInvoiceData.period.start),
                    periodEnd: new Date(finalInvoiceData.period.end),
                    details: finalInvoiceData,
                    emailSent: sendEmail,
                    emailId: emailResult?.data?.id || null,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Invoice processed successfully',
            data: {
                invoiceNumber: finalInvoiceData.invoiceNumber,
                emailSent: sendEmail ? emailResult?.success : false,
                invoiceId: invoiceRecord?.id,
                pdfGenerated: true,
            },
        });

    } catch (error) {
        console.error('Error processing invoice:', error);
        return NextResponse.json(
            { error: 'Failed to process invoice' },
            { status: 500 }
        );
    }
}


export async function GET(request: NextRequest) {
    try {
        const user = await authMiddleware(request);
        if (user instanceof NextResponse) {
            return user;
        }

        const { searchParams } = new URL(request.url);
        const invoiceId = searchParams.get('id');
        const invoiceNumber = searchParams.get('number');

        if (!invoiceId && !invoiceNumber) {
            return NextResponse.json(
                { error: 'Invoice ID or number is required' },
                { status: 400 }
            );
        }

        const invoice = await prisma.invoice.findFirst({
            where: {
                userId: user.id,
                ...(invoiceId ? { id: invoiceId } : { invoiceNumber: invoiceNumber! }),
            },
        });

        if (!invoice) {
            return NextResponse.json(
                { error: 'Invoice not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: invoice,
        });

    } catch (error) {
        console.error('Error fetching invoice:', error);
        return NextResponse.json(
            { error: 'Failed to fetch invoice' },
            { status: 500 }
        );
    }
}