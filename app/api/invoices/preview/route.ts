import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/auth';

interface GroupedUsageItem {
    key: string;
    id: string;
    date: string;
    model: string;
    endpoint: string;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    costPerToken: number;
    calls: number;
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await authMiddleware(request);
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const authenticatedUser = authResult;
        if (!authenticatedUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authenticatedUser.id;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // End of the last day of the month

        const usageData = await prisma.usage.findMany({
            where: {
                userId,
                timestamp: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
        });

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const groupedUsage = usageData.reduce((acc: GroupedUsageItem[], usage) => {
            const date = usage.timestamp.toISOString().split('T')[0];
            const key = `${date}-${usage.model}-${usage.endpoint}`;

            const existing = acc.find(item => item.key === key);
            if (existing) {
                existing.inputTokens += usage.tokensInput || 0;
                existing.outputTokens += usage.tokensOutput || 0;
                existing.totalTokens = existing.inputTokens + existing.outputTokens;
                existing.cost += usage.cost || 0;
                existing.calls += 1;
            } else {
                const inputTokens = usage.tokensInput || 0;
                const outputTokens = usage.tokensOutput || 0;
                acc.push({ // This object now correctly matches GroupedUsageItem
                    key,
                    id: usage.id,
                    date,
                    model: usage.model,
                    endpoint: usage.endpoint,
                    inputTokens,
                    outputTokens,
                    totalTokens: inputTokens + outputTokens,
                    cost: usage.cost || 0,
                    costPerToken: 0,
                    calls: 1,
                });
            }
            return acc;
        }, []);

        const clientInfo = {
            name: user.name || 'N/A',
            email: user.email,
            address: 'Address not provided',
            city: 'City not provided',
            country: 'Country not provided',
            taxId: undefined,
            vatNumber: undefined,
        };

        const subtotal = groupedUsage.reduce((sum, item) => sum + item.cost, 0);

        const markupRate = parseFloat(process.env.INVOICE_MARKUP_RATE || "25.0");
        const markupAmount = subtotal * (markupRate / 100);

        const vatRate = getVATRate(clientInfo.country);
        const vatAmount = vatRate > 0 ? (subtotal + markupAmount) * (vatRate / 100) : 0;

        const total = subtotal + markupAmount + vatAmount;
        const totalTokens = groupedUsage.reduce((sum, item) => sum + item.totalTokens, 0);

        const invoiceData = {
            invoiceNumber: generateInvoiceNumber(),
            issueDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Due in 30 days
            period: {
                start: startOfMonth.toISOString(),
                end: endOfMonth.toISOString(),
            },
            company: {
                name: process.env.COMPANY_NAME || 'AI Services Inc.',
                address: process.env.COMPANY_ADDRESS || '123 Tech Avenue',
                city: process.env.COMPANY_CITY || 'Innovation City',
                country: process.env.COMPANY_COUNTRY || 'Defaultland',
                taxId: process.env.COMPANY_TAX_ID || 'TAXID12345',
                vatNumber: process.env.COMPANY_VAT_NUMBER || undefined,
                email: process.env.COMPANY_EMAIL || 'billing@aiservices.com',
                phone: process.env.COMPANY_PHONE || '+1-800-555-AIHI',
            },
            client: clientInfo,
            items: groupedUsage.map(item => ({
                id: item.id,
                date: item.date,
                description: `API Usage - Model: ${item.model}, Endpoint: ${item.endpoint}`,
                model: item.model,
                endpoint: item.endpoint,
                tokens: item.totalTokens,
                inputTokens: item.inputTokens,
                outputTokens: item.outputTokens,
                costPerToken: item.costPerToken,
                baseCost: parseFloat(item.cost.toFixed(4)),
                finalCost: parseFloat((item.cost * (1 + markupRate / 100)).toFixed(4)),
            })),
            summary: {
                subtotal: parseFloat(subtotal.toFixed(2)),
                markupRate,
                markupAmount: parseFloat(markupAmount.toFixed(2)),
                vatRate,
                vatAmount: parseFloat(vatAmount.toFixed(2)),
                total: parseFloat(total.toFixed(2)),
                totalTokens,
                totalApiCalls: groupedUsage.reduce((sum, item) => sum + item.calls, 0),
            },
            currency: process.env.INVOICE_CURRENCY || 'USD',
            notes: process.env.INVOICE_NOTES || "Thank you for your business! Payments are due within 30 days.",
        };

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

function getVATRate(country: string): number {
    const vatRates: Record<string, number> = {
        'Romania': 19, 'Germany': 19, 'France': 20, 'United Kingdom': 20,
        'Italy': 22, 'Spain': 21, 'Netherlands': 21, 'Belgium': 21,
        'Austria': 20, 'Poland': 23,
        'United States': 0, 'Canada': 0,
    };
    const normalizedCountry = country?.trim() || "";
    return vatRates[normalizedCountry] || 0;
}

function generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-${year}${month}-${randomSuffix}`;
}