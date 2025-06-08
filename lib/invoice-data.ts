import { generateInvoiceNumber, InvoiceData, getVATRate } from "@/lib/pdf";

export function calculateInvoiceTotals(items: any[], vatRate: number = 0, discountRate: number = 0) {
    const subtotal = items.reduce((sum, item) => sum + item.baseCost, 0);
    const totalMarkupAmount = items.reduce((sum, item) => sum + item.markup, 0);
    const subtotalWithMarkup = items.reduce((sum, item) => sum + item.finalCost, 0);

    const markupRate = subtotal > 0 ? (totalMarkupAmount / subtotal) * 100 : 0;

    const discountAmount = subtotalWithMarkup * (discountRate / 100);
    const subtotalAfterDiscount = subtotalWithMarkup - discountAmount;

    const vatAmount = subtotalAfterDiscount * (vatRate / 100);
    const total = subtotalAfterDiscount + vatAmount;

    const totalTokens = items.reduce((sum, item) => sum + item.tokens, 0);
    const totalApiCalls = items.reduce((sum, item) => sum + item.requests, 0);
    const successfulCalls = items.reduce((sum, item) => sum + (item.successRate > 0 ? item.requests : 0), 0);
    const failedCalls = totalApiCalls - successfulCalls;
    const avgLatency = totalApiCalls > 0 ? items.reduce((sum, item) => sum + item.avgLatency, 0) / totalApiCalls : 0;

    const projects = new Set(items.map(item => item.project).filter(Boolean));
    const apiKeys = new Set(items.map(item => item.apiKey).filter(Boolean));

    return {
        subtotal,
        markupRate,
        markupAmount: totalMarkupAmount,
        vatRate,
        vatAmount,
        discountRate,
        discountAmount,
        total,
        totalTokens,
        totalApiCalls,
        successfulCalls,
        failedCalls,
        avgLatency,
        totalProjects: projects.size,
        totalApiKeys: apiKeys.size
    };
}
export async function gatherUsageDataForInvoice(
    prisma: any,
    userId: string,
    period: { start: Date; end: Date }
) {
    const [personalUsage, projectUsage] = await Promise.all([
        prisma.usage.findMany({
            where: {
                userId,
                timestamp: {
                    gte: period.start,
                    lte: period.end
                },
                apiKey: {
                    projectId: null
                }
            },
            include: {
                apiKey: {
                    select: {
                        name: true,
                        keyPrefix: true
                    }
                }
            }
        }),

        prisma.usage.findMany({
            where: {
                project: {
                    ownerId: userId
                },
                timestamp: {
                    gte: period.start,
                    lte: period.end
                }
            },
            include: {
                project: {
                    select: {
                        name: true,
                        id: true
                    }
                },
                apiKey: {
                    select: {
                        name: true,
                        keyPrefix: true
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })
    ]);

    const allUsage = [...personalUsage, ...projectUsage];

    const lineItems = allUsage.map(usage => ({
        id: usage.id,
        date: usage.timestamp.toISOString(),
        description: `API Call - ${usage.endpoint}`,
        model: usage.model,
        provider: usage.provider,
        endpoint: usage.endpoint,
        project: usage.project?.name || 'Personal',
        apiKey: usage.apiKey?.name || 'Unknown Key',
        tokens: usage.tokensInput + usage.tokensOutput,
        inputTokens: usage.tokensInput,
        outputTokens: usage.tokensOutput,
        requests: 1,
        successRate: usage.success ? 100 : 0,
        avgLatency: usage.latency,
        baseCost: usage.cost,
        markup: usage.markup,
        finalCost: usage.totalCost
    }));

    return lineItems;
}
export function formatInvoiceData(
    user: any,
    client: any,
    items: any[],
    period: { start: Date; end: Date },
    options: {
        vatRate?: number;
        discountRate?: number;
        currency?: string;
        paymentTerms?: string;
        notes?: string;
        status?: string;
    } = {}
): InvoiceData {
    const vatRate = options.vatRate ?? getVATRate(client.country || 'Romania');

    const summary = calculateInvoiceTotals(
        items,
        vatRate,
        options.discountRate || 0
    );

    return {
        invoiceNumber: generateInvoiceNumber(),
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        period: {
            start: period.start.toISOString(),
            end: period.end.toISOString()
        },
        company: {
            name: 'AI Gateway Service',
            address: '123 Tech Street',
            city: 'San Francisco',
            country: 'United States',
            email: 'billing@aigateway.com',
            website: 'https://aigateway.com',
            bankDetails: {
                bankName: 'Tech Bank',
                accountName: 'AI Gateway Inc',
                accountNumber: '1234567890',
                routingNumber: '123456789',
                swift: 'TECHIUS33'
            }
        },
        client: {
            name: client.name || user.name || 'Unknown',
            email: client.email || user.email,
            address: client.address,
            city: client.city,
            country: client.country || 'United States',
            taxId: client.taxId,
            vatNumber: client.vatNumber,
            companyNumber: client.companyNumber
        },
        items,
        summary,
        currency: options.currency || 'USD',
        notes: options.notes,
        paymentTerms: options.paymentTerms || 'Net 30',
        status: options.status || 'pending'
    };
}