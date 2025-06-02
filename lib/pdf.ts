import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

export interface InvoiceData {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    period: {
        start: string;
        end: string;
    };
    company: {
        name: string;
        address: string;
        city: string;
        country: string;
        taxId: string;
        email: string;
        phone: string;
    };
    client: {
        name: string;
        email: string;
        address: string;
        city: string;
        country: string;
        taxId?: string;
        vatNumber?: string;
    };
    items: Array<{
        id: string;
        date: string;
        model: string;
        endpoint: string;
        tokens: number;
        inputTokens: number;
        outputTokens: number;
        costPerToken: number;
        baseCost: number;
        finalCost: number;
    }>;
    summary: {
        subtotal: number;
        markupRate: number;
        markupAmount: number;
        vatRate: number;
        vatAmount: number;
        total: number;
        totalTokens: number;
        totalApiCalls: number;
    };
    currency: string;
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer | null> {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;
        let yPosition = 30;

        const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: invoiceData.currency,
                minimumFractionDigits: 2,
            }).format(amount);
        };

        const formatDate = (dateString: string) => {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        };

        doc.setFontSize(24);
        doc.setTextColor(37, 99, 235);
        doc.text(invoiceData.company.name, margin, yPosition);

        yPosition += 10;
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(invoiceData.company.address, margin, yPosition);
        yPosition += 6;
        doc.text(`${invoiceData.company.city}, ${invoiceData.company.country}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Tax ID: ${invoiceData.company.taxId}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Email: ${invoiceData.company.email}`, margin, yPosition);
        if (invoiceData.company.phone) {
            yPosition += 6;
            doc.text(`Phone: ${invoiceData.company.phone}`, margin, yPosition);
        }

        yPosition += 20;
        doc.setFontSize(20);
        doc.setTextColor(37, 99, 235);
        doc.text('INVOICE', pageWidth - margin - 60, yPosition, { align: 'right' });

        yPosition += 8;
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(invoiceData.invoiceNumber, pageWidth - margin - 60, yPosition, { align: 'right' });

        yPosition += 15;
        const detailsStartY = yPosition;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Invoice Details:', margin, yPosition);
        doc.setFont('helvetica', 'normal');

        yPosition += 8;
        doc.text(`Issue Date: ${formatDate(invoiceData.issueDate)}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Due Date: ${formatDate(invoiceData.dueDate)}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Period: ${formatDate(invoiceData.period.start)} - ${formatDate(invoiceData.period.end)}`, margin, yPosition);

        yPosition = detailsStartY;
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To:', pageWidth / 2 + 10, yPosition);
        doc.setFont('helvetica', 'normal');

        yPosition += 8;
        doc.text(invoiceData.client.name, pageWidth / 2 + 10, yPosition);
        yPosition += 6;
        doc.text(invoiceData.client.email, pageWidth / 2 + 10, yPosition);
        yPosition += 6;
        doc.text(invoiceData.client.address, pageWidth / 2 + 10, yPosition);
        yPosition += 6;
        doc.text(`${invoiceData.client.city}, ${invoiceData.client.country}`, pageWidth / 2 + 10, yPosition);

        if (invoiceData.client.taxId) {
            yPosition += 6;
            doc.text(`Tax ID: ${invoiceData.client.taxId}`, pageWidth / 2 + 10, yPosition);
        }
        if (invoiceData.client.vatNumber) {
            yPosition += 6;
            doc.text(`VAT Number: ${invoiceData.client.vatNumber}`, pageWidth / 2 + 10, yPosition);
        }

        yPosition += 25;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Usage Summary', margin, yPosition);

        yPosition += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        const summaryData = [
            ['Total API Calls', invoiceData.summary.totalApiCalls.toLocaleString()],
            ['Total Tokens Processed', invoiceData.summary.totalTokens.toLocaleString()],
        ];

        doc.autoTable({
            startY: yPosition,
            head: [['Metric', 'Value']],
            body: summaryData,
            margin: { left: margin, right: margin },
            styles: { fontSize: 10 },
            headStyles: { fillColor: [37, 99, 235] },
            columnStyles: { 1: { halign: 'right' } },
            theme: 'grid',
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;

        if (invoiceData.items.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('Service Details', margin, yPosition);

            yPosition += 10;

            const groupedItems = invoiceData.items.reduce((acc, item) => {
                if (!acc[item.model]) {
                    acc[item.model] = {
                        model: item.model,
                        totalTokens: 0,
                        totalCalls: 0,
                        baseCost: 0,
                        finalCost: 0,
                    };
                }
                acc[item.model].totalTokens += item.tokens;
                acc[item.model].totalCalls += 1;
                acc[item.model].baseCost += item.baseCost;
                acc[item.model].finalCost += item.finalCost;
                return acc;
            }, {} as Record<string, any>);

            const tableData = Object.values(groupedItems).map((item: any) => [
                item.model,
                item.totalCalls.toLocaleString(),
                item.totalTokens.toLocaleString(),
                formatCurrency(item.baseCost),
                formatCurrency(item.finalCost),
            ]);

            doc.autoTable({
                startY: yPosition,
                head: [['Model', 'API Calls', 'Tokens', 'Base Cost', 'Final Cost']],
                body: tableData,
                margin: { left: margin, right: margin },
                styles: { fontSize: 9 },
                headStyles: { fillColor: [37, 99, 235] },
                columnStyles: {
                    1: { halign: 'right' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                    4: { halign: 'right' },
                },
                theme: 'grid',
            });

            yPosition = (doc as any).lastAutoTable.finalY + 15;
        }

        if (yPosition > doc.internal.pageSize.height - 80) {
            doc.addPage();
            yPosition = 30;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Cost Breakdown', margin, yPosition);

        yPosition += 10;

        const costBreakdownData = [
            ['API Costs (Subtotal)', formatCurrency(invoiceData.summary.subtotal)],
            [`Service Fee (${invoiceData.summary.markupRate}%)`, formatCurrency(invoiceData.summary.markupAmount)],
        ];

        if (invoiceData.summary.vatAmount > 0) {
            costBreakdownData.push([
                `VAT (${invoiceData.summary.vatRate}%)`,
                formatCurrency(invoiceData.summary.vatAmount)
            ]);
        }

        costBreakdownData.push([
            'TOTAL',
            formatCurrency(invoiceData.summary.total)
        ]);

        doc.autoTable({
            startY: yPosition,
            body: costBreakdownData,
            margin: { left: pageWidth / 2, right: margin },
            styles: { fontSize: 11 },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'right', fontStyle: 'bold' }
            },
            theme: 'plain',
            didParseCell: (data: any) => {
                if (data.row.index === costBreakdownData.length - 1) {
                    data.cell.styles.fillColor = [240, 240, 240];
                    data.cell.styles.fontSize = 13;
                }
            },
        });

        const footerY = doc.internal.pageSize.height - 30;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY + 6, { align: 'center' });

        const pdfArrayBuffer = doc.output('arraybuffer');
        return Buffer.from(pdfArrayBuffer);

    } catch (error) {
        console.error('Error generating PDF:', error);
        return null;
    }
}