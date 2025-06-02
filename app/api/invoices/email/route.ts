import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import { generateInvoicePDF } from '@/lib/pdf';

export async function POST(request: NextRequest) {
    try {
        const user = await authMiddleware(request);
        if (user instanceof NextResponse) {
            return user;
        }

        const body = await request.json();
        const { invoiceData, sendEmail = true, saveToDatabase = true } = body;

        if (!invoiceData) {
            return NextResponse.json(
                { error: 'Invoice data is required' },
                { status: 400 }
            );
        }

        const pdfBuffer = await generateInvoicePDF(invoiceData);

        if (!pdfBuffer) {
            return NextResponse.json(
                { error: 'Failed to generate PDF' },
                { status: 500 }
            );
        }

        let emailResult = null;
        let invoiceRecord = null;

        if (sendEmail) {
            emailResult = await sendInvoiceEmail(invoiceData, pdfBuffer);

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
                    invoiceNumber: invoiceData.invoiceNumber,
                    amount: invoiceData.summary.total,
                    subtotal: invoiceData.summary.subtotal,
                    vatAmount: invoiceData.summary.vatAmount,
                    markupAmount: invoiceData.summary.markupAmount,
                    currency: invoiceData.currency,
                    status: 'SENT',
                    issueDate: new Date(invoiceData.issueDate),
                    dueDate: new Date(invoiceData.dueDate),
                    periodStart: new Date(invoiceData.period.start),
                    periodEnd: new Date(invoiceData.period.end),
                    details: invoiceData,
                    emailSent: sendEmail,
                    emailId: emailResult?.data?.id || null,
                },
            });

        }

        return NextResponse.json({
            success: true,
            message: 'Invoice processed successfully',
            data: {
                invoiceNumber: invoiceData.invoiceNumber,
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