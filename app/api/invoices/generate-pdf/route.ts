import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/nextAuthOptions';
import { generateInvoicePDF } from '@/lib/pdf';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { invoiceData } = body;

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

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${invoiceData.invoiceNumber}.pdf"`,
            },
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        return NextResponse.json(
            { error: 'Failed to generate PDF' },
            { status: 500 }
        );
    }
}