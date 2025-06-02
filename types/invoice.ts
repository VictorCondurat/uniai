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

export interface InvoiceRecord {
    id: string;
    userId: string;
    invoiceNumber: string;
    amount: number;
    subtotal: number;
    vatAmount: number;
    markupAmount: number;
    currency: string;
    status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    issueDate: Date;
    dueDate: Date;
    periodStart: Date;
    periodEnd: Date;
    data: InvoiceData;
    emailSent: boolean;
    emailId?: string;
    createdAt: Date;
    updatedAt: Date;
}