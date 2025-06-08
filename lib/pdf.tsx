import  {Document, Page, Text, View, StyleSheet, pdf} from '@react-pdf/renderer';
import {format} from 'date-fns';

export interface InvoiceData {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    period: { start: string; end: string };
    company: {
        name: string;
        address: string;
        city: string;
        country: string;
        taxId?: string;
        vatNumber?: string;
        email: string;
        phone?: string;
        website?: string;
        bankDetails?: {
            bankName: string;
            accountName: string;
            accountNumber: string;
            routingNumber?: string;
            swift?: string;
            iban?: string;
        };
    };
    client: {
        name: string;
        email: string;
        address?: string;
        city?: string;
        country?: string;
        taxId?: string;
        vatNumber?: string;
        companyNumber?: string;
    };
    items: Array<{
        id: string;
        date: string;
        description: string;
        model: string;
        provider: string;
        endpoint: string;
        project?: string;
        apiKey?: string;
        tokens: number;
        inputTokens: number;
        outputTokens: number;
        requests: number;
        successRate: number;
        avgLatency: number;
        baseCost: number;
        markup: number;
        finalCost: number;
    }>;
    summary: {
        subtotal: number;
        markupRate: number;
        markupAmount: number;
        vatRate: number;
        vatAmount: number;
        discountRate?: number;
        discountAmount?: number;
        total: number;
        totalTokens: number;
        totalApiCalls: number;
        successfulCalls: number;
        failedCalls: number;
        avgLatency: number;
        totalProjects: number;
        totalApiKeys: number;
    };
    currency: string;
    notes?: string;
    paymentTerms?: string;
    latePaymentFee?: number;
    status?: string;
}

const colors = {
    primary: process.env.BRAND_PRIMARY_COLOR || '#1e40af',
    secondary: process.env.BRAND_SECONDARY_COLOR || '#3730a3',
    accent: process.env.BRAND_ACCENT_COLOR || '#7c3aed',
    text: '#1f2937',
    muted: '#6b7280',
    light: '#f3f4f6',
    border: '#e5e7eb',
    success: '#10b981',
    danger: '#ef4444',
    white: '#ffffff'
};



const getCompanyData = () => ({
    name: process.env.COMPANY_NAME || 'Your Company',
    address: process.env.COMPANY_ADDRESS || '',
    city: process.env.COMPANY_CITY || '',
    country: process.env.COMPANY_COUNTRY || '',
    taxId: process.env.COMPANY_TAX_ID || '',
    vatNumber: process.env.COMPANY_VAT_NUMBER || '',
    email: process.env.COMPANY_EMAIL || '',
    phone: process.env.COMPANY_PHONE || '',
    website: process.env.COMPANY_WEBSITE || '',
    bankDetails: {
        bankName: process.env.BANK_NAME || '',
        accountName: process.env.BANK_ACCOUNT_NAME || '',
        accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
        routingNumber: process.env.BANK_ROUTING_NUMBER || '',
        swift: process.env.BANK_SWIFT || '',
        iban: process.env.BANK_IBAN || '',
    }
});

const getTermsText = () => [
    process.env.TERMS_TEXT_1 || 'Payment is due within 30 days of invoice date unless otherwise specified.',
    process.env.TERMS_TEXT_2 || 'Late payments may incur a fee of 1.5% per month on outstanding balances.',
    process.env.TERMS_TEXT_3 || 'All services are provided subject to our standard terms of service available on our website.',
    process.env.TERMS_TEXT_4 || 'This invoice is computer-generated and is valid without signature.'
];

const styles = StyleSheet.create({
    page: {
        position: 'relative',
        backgroundColor: colors.white,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        backgroundColor: colors.primary,
    },
    headerContent: {
        position: 'absolute',
        top: 40,
        left: 50,
    },
    companyName: {
        fontSize: 28,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: colors.white,
    },
    companyAddress: {
        fontSize: 9,
        color: colors.white,
        marginTop: 10,
    },
    invoiceBadge: {
        position: 'absolute',
        right: 50,
        top: 35,
        backgroundColor: colors.white,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 3,
        width: 105,
        height: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    invoiceBadgeText: {
        fontSize: 16,
        color: colors.primary,
    },
    invoiceNumberDate: {
        position: 'absolute',
        right: 50,
        top: 80,
    },
    invoiceNumberText: {
        fontSize: 10,
        color: colors.white,
    },
    invoiceDateText: {
        fontSize: 10,
        color: colors.white,
        marginTop: 5,
    },
    content: {
        marginTop: 140,
        paddingHorizontal: 50,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    billToBox: {
        width: 250,
        height: 100,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'solid',
        borderRadius: 3,
        padding: 10,
    },

    invoiceDetailsBox: {
        width: 225,
        height: 100,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'solid',
        borderRadius: 3,
        padding: 10,
        marginLeft: 20,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 10,
    },
    clientName: {
        fontSize: 11,
        color: colors.text,
        marginTop: 10,
    },
    clientEmail: {
        fontSize: 9,
        color: colors.muted,
        marginTop: 5,
    },
    clientAddress: {
        fontSize: 9,
        color: colors.muted,
        marginTop: 3,
    },
    detailRow: {
        flexDirection: 'row',
        marginTop: 10,
    },
    detailLabel: {
        fontSize: 9,
        color: colors.muted,
        width: 90,
    },
    detailValue: {
        fontSize: 9,
        color: colors.text,
        flex: 1,
    },
    executiveSummaryTitle: {
        fontSize: 14,
        color: colors.primary,
        marginTop: 20,
        marginBottom: 25,
    },
    summaryCardsRow: {
        flexDirection: 'row',
    },
    summaryCard: {
        width: 120,
        height: 60,
        borderRadius: 3,
        padding: 10,
        marginRight: 12,
        backgroundColor: colors.light,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'solid',
        justifyContent: 'space-between',
    },
    summaryCardHighlight: {
        backgroundColor: colors.primary,
    },
    summaryCardTitle: {
        fontSize: 8,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    summaryCardValue: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 5,
    },
    summaryCardSubtitle: {
        fontSize: 7,
        textAlign: 'center',
        marginTop: 5,
    },
    whiteText: {
        color: colors.white,
    },
    normalText: {
        color: colors.text,
    },
    detailedBreakdownTitle: {
        fontSize: 14,
        color: colors.primary,
        marginTop: 20,
        marginBottom: 25,
    },
    tableContainer: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        padding: 8,
        height: 25,
    },
    tableHeaderCell: {
        color: colors.white,
        fontSize: 9,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        borderBottomStyle: 'solid',
        padding: 8,
        minHeight: 30,
    },
    tableRowEven: {
        backgroundColor: colors.light,
    },
    providerCell: {
        width: 150,
        paddingLeft: 5,
    },
    requestsCell: {
        width: 60,
        textAlign: 'center',
    },
    tokensCell: {
        width: 100,
        textAlign: 'center',
    },
    costCell: {
        width: 70,
        textAlign: 'center',
    },
    totalCostCell: {
        width: 80,
        textAlign: 'center',
    },
    providerText: {
        fontSize: 9,
        color: colors.text,
    },
    modelText: {
        fontSize: 8,
        color: colors.muted,
        marginTop: 2,
    },
    cellText: {
        fontSize: 9,
        color: colors.text,
    },
    tokenMainText: {
        fontSize: 8,
        color: colors.text,
    },
    tokenDetailText: {
        fontSize: 7,
        color: colors.muted,
        marginTop: 2,
    },
    costBreakdownTitle: {
        fontSize: 14,
        color: colors.primary,
        marginTop: 20,
        marginBottom: 25,
    },
    financialRow: {
        flexDirection: 'row',
    },
    paymentInfoBox: {
        width: 230,
        height: 180,
        backgroundColor: colors.light,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'solid',
        borderRadius: 3,
        padding: 15,
    },
    summaryBox: {
        width: 300,
        height: 180,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'solid',
        borderRadius: 3,
        padding: 15,
        marginLeft: 15,
    },
    paymentTitle: {
        fontSize: 11,
        color: colors.primary,
        marginBottom: 20,
    },
    bankDetailRow: {
        marginBottom: 15,
    },
    bankDetailLabel: {
        fontSize: 8,
        color: colors.muted,
    },
    bankDetailValue: {
        fontSize: 9,
        color: colors.text,
        marginTop: 2,
    },
    costItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    costLabel: {
        fontSize: 10,
        color: colors.muted,
    },
    costValue: {
        fontSize: 10,
        color: colors.text,
    },
    costValueDiscount: {
        color: colors.success,
        fontSize: 10
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        borderBottomStyle: 'solid',
        marginBottom: 15,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 12,
        color: colors.text,
    },
    totalAmount: {
        fontSize: 18,
        color: colors.primary,
        fontWeight: 'bold',
    },
    analyticsTitle: {
        fontSize: 14,
        color: colors.primary,
        marginTop: 20,
        marginBottom: 25,
    },
    projectTitle: {
        fontSize: 10,
        color: colors.text,
        marginBottom: 20,
    },
    projectRow: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    projectName: {
        fontSize: 9,
        color: colors.text,
        width: 150,
    },
    projectDetails: {
        fontSize: 9,
        color: colors.muted,
        width: 250,
    },
    projectCost: {
        fontSize: 9,
        color: colors.text,
        width: 70,
        textAlign: 'right',
    },
    projectPercent: {
        fontSize: 9,
        color: colors.muted,
        width: 50,
        textAlign: 'right',
    },
    termsSection: {
        position: 'absolute',
        bottom: 120,
        left: 50,
        right: 50,
    },
    termsTitle: {
        fontSize: 8,
        color: colors.text,
        marginBottom: 12,
    },
    termsText: {
        fontSize: 7,
        color: colors.muted,
        marginBottom: 10,
    },
    notesTitle: {
        fontSize: 8,
        color: colors.text,
        marginTop: 15,
    },
    notesText: {
        fontSize: 7,
        color: colors.muted,
        marginTop: 5,
        width: 495,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 50,
        right: 50,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        borderTopStyle: 'solid',
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerText: {
        fontSize: 8,
        color: colors.muted,
    },
    footerWebsite: {
        fontSize: 8,
        color: colors.muted,
        textAlign: 'right',
    },
    pageNumber: {
        position: 'absolute',
        bottom: 50,
        left: 250,
        width: 95,
        textAlign: 'center',
        fontSize: 7,
        color: colors.muted,
    },
    watermark: {
        position: 'absolute',
        top: '40%',
        left: '25%',
        fontSize: 60,
        color: colors.danger,
        opacity: 0.1,
        transform: 'rotate(-45deg)',
    },
});
const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

const formatNumber = (num: number, decimals: number = 0) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num);
};

const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
};

const InvoiceDocument = ({invoiceData}: { invoiceData: InvoiceData }) => {
    const companyData = {
        ...getCompanyData(),
        ...invoiceData.company
    };

    const currency = invoiceData.currency || process.env.DEFAULT_CURRENCY || 'USD';
    const paymentTerms = invoiceData.paymentTerms || process.env.DEFAULT_PAYMENT_TERMS || 'Net 30';
    const notes = invoiceData.notes || process.env.DEFAULT_NOTES || '';
    const termsText = getTermsText();

    const groupedItems = invoiceData.items.reduce((acc, item) => {
        const key = `${item.provider}|${item.model}`;
        if (!acc[key]) {
            acc[key] = {
                provider: item.provider,
                model: item.model,
                items: [],
                totals: {
                    requests: 0,
                    tokens: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    baseCost: 0,
                    markup: 0,
                    finalCost: 0,
                    projects: new Set(),
                    apiKeys: new Set()
                }
            };
        }

        acc[key].items.push(item);
        acc[key].totals.requests += item.requests;
        acc[key].totals.tokens += item.tokens;
        acc[key].totals.inputTokens += item.inputTokens;
        acc[key].totals.outputTokens += item.outputTokens;
        acc[key].totals.baseCost += item.baseCost;
        acc[key].totals.markup += item.markup;
        acc[key].totals.finalCost += item.finalCost;

        if (item.project) acc[key].totals.projects.add(item.project);
        if (item.apiKey) acc[key].totals.apiKeys.add(item.apiKey);

        return acc;
    }, {} as Record<string, any>);

    const projectBreakdown = invoiceData.items.reduce((acc, item) => {
        if (!item.project) return acc;
        if (!acc[item.project]) {
            acc[item.project] = {
                requests: 0,
                tokens: 0,
                cost: 0
            };
        }
        acc[item.project].requests += item.requests;
        acc[item.project].tokens += item.tokens;
        acc[item.project].cost += item.finalCost;
        return acc;
    }, {} as Record<string, any>);

    const sortedProjects = Object.entries(projectBreakdown)
        .sort(([, a], [, b]) => b.cost - a.cost)
        .slice(0, 5);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.headerGradient}/>

                <View style={styles.headerContent}>
                    <Text style={styles.companyName}>{companyData.name.toUpperCase()}</Text>
                    <Text style={styles.companyAddress}>{companyData.address}</Text>
                    <Text style={styles.companyAddress}>{`${companyData.city}, ${companyData.country}`}</Text>
                    {companyData.taxId && (
                        <Text style={styles.companyAddress}>Tax ID: {companyData.taxId}</Text>
                    )}
                </View>

                <View style={styles.invoiceBadge}>
                    <Text style={styles.invoiceBadgeText}>INVOICE</Text>
                </View>

                <View style={styles.invoiceNumberDate}>
                    <Text style={styles.invoiceNumberText}>{invoiceData.invoiceNumber}</Text>
                    <Text style={styles.invoiceDateText}>
                        {format(new Date(invoiceData.issueDate), 'MMM dd, yyyy')}
                    </Text>
                </View>

                <View style={styles.content}>
                    <View style={styles.row}>
                        <View style={styles.billToBox}>
                            <Text style={styles.sectionTitle}>BILL TO</Text>
                            <Text style={styles.clientName}>{invoiceData.client.name}</Text>
                            <Text style={styles.clientEmail}>{invoiceData.client.email}</Text>
                            {invoiceData.client.address && (
                                <Text style={styles.clientAddress}>{invoiceData.client.address}</Text>
                            )}
                            {invoiceData.client.city && invoiceData.client.country && (
                                <Text style={styles.clientAddress}>
                                    {`${invoiceData.client.city}, ${invoiceData.client.country}`}
                                </Text>
                            )}
                            {invoiceData.client.taxId && (
                                <Text style={styles.clientAddress}>Tax ID: {invoiceData.client.taxId}</Text>
                            )}
                        </View>

                        <View style={styles.invoiceDetailsBox}>
                            <Text style={styles.sectionTitle}>INVOICE DETAILS</Text>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Invoice Date:</Text>
                                <Text style={styles.detailValue}>
                                    {format(new Date(invoiceData.issueDate), 'MMM dd, yyyy')}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Due Date:</Text>
                                <Text style={styles.detailValue}>
                                    {format(new Date(invoiceData.dueDate), 'MMM dd, yyyy')}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Payment Terms:</Text>
                                <Text style={styles.detailValue}>{paymentTerms}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Billing Period:</Text>
                                <Text style={styles.detailValue}>
                                    {`${format(new Date(invoiceData.period.start), 'MMM dd')} - ${format(new Date(invoiceData.period.end), 'MMM dd, yyyy')}`}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.executiveSummaryTitle}>EXECUTIVE SUMMARY</Text>

                    <View style={styles.summaryCardsRow}>
                        <View style={styles.summaryCard}>
                            <Text style={[styles.summaryCardTitle, styles.normalText]}>TOTAL API CALLS</Text>
                            <Text style={[styles.summaryCardValue, styles.normalText]}>
                                {formatNumber(invoiceData.summary.totalApiCalls)}
                            </Text>
                            <Text style={[styles.summaryCardSubtitle, styles.normalText]}>
                                {formatPercent((invoiceData.summary.successfulCalls / invoiceData.summary.totalApiCalls) * 100)} Success Rate
                            </Text>
                        </View>

                        <View style={styles.summaryCard}>
                            <Text style={[styles.summaryCardTitle, styles.normalText]}>TOTAL TOKENS</Text>
                            <Text style={[styles.summaryCardValue, styles.normalText]}>
                                {formatNumber(invoiceData.summary.totalTokens)}
                            </Text>
                            <Text style={[styles.summaryCardSubtitle, styles.normalText]}>
                                {`Across ${String(invoiceData.summary.totalProjects)} Projects`}
                            </Text>
                        </View>

                        <View style={styles.summaryCard}>
                            <Text style={[styles.summaryCardTitle, styles.normalText]}>AVG LATENCY</Text>
                            <Text style={[styles.summaryCardValue, styles.normalText]}>
                                {formatNumber(invoiceData.summary.avgLatency)}ms
                            </Text>
                            <Text style={[styles.summaryCardSubtitle, styles.normalText]}>Response Time</Text>
                        </View>

                        <View style={[styles.summaryCard, styles.summaryCardHighlight]}>
                            <Text style={[styles.summaryCardTitle, styles.whiteText]}>TOTAL AMOUNT</Text>
                            <Text style={[styles.summaryCardValue, styles.whiteText]}>
                                {formatCurrency(invoiceData.summary.total, currency)}
                            </Text>
                            <Text style={[styles.summaryCardSubtitle, styles.whiteText]}>
                                {invoiceData.summary.vatAmount > 0 ? 'Inc. VAT' : 'No VAT'}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.detailedBreakdownTitle}>DETAILED USAGE BREAKDOWN</Text>

                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, styles.providerCell]}>Provider/Model</Text>
                            <Text style={[styles.tableHeaderCell, styles.requestsCell]}>Requests</Text>
                            <Text style={[styles.tableHeaderCell, styles.tokensCell]}>Tokens (In/Out)</Text>
                            <Text style={[styles.tableHeaderCell, styles.costCell]}>Base Cost</Text>
                            <Text style={[styles.tableHeaderCell, styles.costCell]}>Markup</Text>
                            <Text style={[styles.tableHeaderCell, styles.totalCostCell]}>Total Cost</Text>
                        </View>

                        {Object.values(groupedItems).map((group: any, index: number) => (
                            <View
                                key={index}
                                style={index % 2 !== 0 ? [styles.tableRow, styles.tableRowEven] : styles.tableRow}
                            >
                                <View style={styles.providerCell}>
                                    <Text style={styles.providerText}>{group.provider}</Text>
                                    <Text style={styles.modelText}>{group.model}</Text>
                                </View>
                                <Text style={[styles.cellText, styles.requestsCell]}>
                                    {formatNumber(group.totals.requests)}
                                </Text>
                                <View style={styles.tokensCell}>
                                    <Text style={styles.tokenMainText}>{formatNumber(group.totals.tokens)}</Text>
                                    <Text style={styles.tokenDetailText}>
                                        {`${formatNumber(group.totals.inputTokens)} / ${formatNumber(group.totals.outputTokens)}`}
                                    </Text>
                                </View>
                                <Text style={[styles.cellText, styles.costCell]}>
                                    {formatCurrency(group.totals.baseCost, currency)}
                                </Text>
                                <Text style={[styles.cellText, styles.costCell]}>
                                    {formatCurrency(group.totals.markup, currency)}
                                </Text>
                                <Text style={[styles.cellText, styles.totalCostCell]}>
                                    {formatCurrency(group.totals.finalCost, currency)}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.costBreakdownTitle}>COST BREAKDOWN</Text>

                    <View style={styles.financialRow}>
                        <View style={styles.paymentInfoBox}>
                            <Text style={styles.paymentTitle}>PAYMENT INFORMATION</Text>
                            {companyData.bankDetails && (
                                <>
                                    <View style={styles.bankDetailRow}>
                                        <Text style={styles.bankDetailLabel}>Bank Name:</Text>
                                        <Text style={styles.bankDetailValue}>{companyData.bankDetails.bankName}</Text>
                                    </View>
                                    <View style={styles.bankDetailRow}>
                                        <Text style={styles.bankDetailLabel}>Account Name:</Text>
                                        <Text style={styles.bankDetailValue}>{companyData.bankDetails.accountName}</Text>
                                    </View>
                                    <View style={styles.bankDetailRow}>
                                        <Text style={styles.bankDetailLabel}>Account Number:</Text>
                                        <Text style={styles.bankDetailValue}>{companyData.bankDetails.accountNumber}</Text>
                                    </View>
                                    {companyData.bankDetails.iban && (
                                        <View style={styles.bankDetailRow}>
                                            <Text style={styles.bankDetailLabel}>IBAN:</Text>
                                            <Text style={styles.bankDetailValue}>{companyData.bankDetails.iban}</Text>
                                        </View>
                                    )}
                                    {companyData.bankDetails.swift && (
                                        <View style={styles.bankDetailRow}>
                                            <Text style={styles.bankDetailLabel}>SWIFT/BIC:</Text>
                                            <Text style={styles.bankDetailValue}>{companyData.bankDetails.swift}</Text>
                                        </View>
                                    )}
                                </>
                            )}
                        </View>

                        <View style={styles.summaryBox}>
                            <View style={styles.costItem}>
                                <Text style={styles.costLabel}>API Usage Costs</Text>
                                <Text style={styles.costValue}>
                                    {formatCurrency(invoiceData.summary.subtotal, currency)}
                                </Text>
                            </View>
                            <View style={styles.costItem}>
                                <Text style={styles.costLabel}>
                                    {`Service Fee (${String(invoiceData.summary.markupRate.toFixed(1))}%)`}
                                </Text>
                                <Text style={styles.costValue}>
                                    {formatCurrency(invoiceData.summary.markupAmount, currency)}
                                </Text>
                            </View>
                            {invoiceData.summary.discountAmount && invoiceData.summary.discountAmount > 0 && (
                                <View style={styles.costItem}>
                                    <Text style={styles.costLabel}>
                                        {`Discount (${String(invoiceData.summary.discountRate || 0)}%)`}
                                    </Text>
                                    <Text style={styles.costValueDiscount}>
                                        {`-${formatCurrency(invoiceData.summary.discountAmount, currency)}`}
                                    </Text>
                                </View>
                            )}
                            {invoiceData.summary.vatAmount > 0 && (
                                <View style={styles.costItem}>
                                    <Text style={styles.costLabel}>
                                        {`VAT (${String(invoiceData.summary.vatRate)}%)`}
                                    </Text>
                                    <Text style={styles.costValue}>
                                        {formatCurrency(invoiceData.summary.vatAmount, currency)}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.divider}/>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>TOTAL AMOUNT DUE</Text>
                                <Text style={styles.totalAmount}>
                                    {formatCurrency(invoiceData.summary.total, currency)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {sortedProjects.length > 0 && (
                        <>
                            <Text style={styles.analyticsTitle}>USAGE ANALYTICS</Text>
                            <Text style={styles.projectTitle}>Cost by Project</Text>
                            {sortedProjects.map(([project, data]: [string, any]) => {
                                const percentage = (data.cost / invoiceData.summary.total) * 100;
                                return (
                                    <View key={project} style={styles.projectRow}>
                                        <Text style={styles.projectName}>{project}</Text>
                                        <Text style={styles.projectDetails}>
                                            {`${formatNumber(data.requests)} requests, ${formatNumber(data.tokens)} tokens`}
                                        </Text>
                                        <Text style={styles.projectCost}>
                                            {formatCurrency(data.cost, currency)}
                                        </Text>
                                        <Text style={styles.projectPercent}>
                                            {`(${formatPercent(percentage)})`}
                                        </Text>
                                    </View>
                                );
                            })}
                        </>
                    )}
                </View>

                <View style={styles.termsSection}>
                    <Text style={styles.termsTitle}>TERMS & CONDITIONS</Text>
                    {termsText.map((term, index) => (
                        <Text key={index} style={styles.termsText}>
                            {`${index + 1}. ${term}`}
                        </Text>
                    ))}

                    {notes && (
                        <>
                            <Text style={styles.notesTitle}>NOTES:</Text>
                            <Text style={styles.notesText}>{notes}</Text>
                        </>
                    )}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        {`${companyData.name} | ${companyData.email}`}
                    </Text>
                    {companyData.website && (
                        <Text style={styles.footerWebsite}>{companyData.website}</Text>
                    )}
                </View>

                <Text
                    style={styles.pageNumber}
                    render={({pageNumber, totalPages}) =>
                        `Page ${pageNumber} of ${totalPages}`
                    }
                />

                {(invoiceData.status === 'pending' || invoiceData.status === 'overdue') && (
                    <Text style={styles.watermark}>
                        {invoiceData.status === 'overdue' ? 'OVERDUE' : 'UNPAID'}
                    </Text>
                )}
            </Page>
        </Document>
    );
};

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
    try {
        const blob = await pdf(<InvoiceDocument invoiceData={invoiceData}/>).toBlob();
        const arrayBuffer = await blob.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        throw error;
    }
}

export function getVATRate(country: string): number {
    const vatRates: Record<string, number> = {
        'Austria': 20,
        'Belgium': 21,
        'Bulgaria': 20,
        'Croatia': 25,
        'Cyprus': 19,
        'Czech Republic': 21,
        'Denmark': 25,
        'Estonia': 20,
        'Finland': 24,
        'France': 20,
        'Germany': 19,
        'Greece': 24,
        'Hungary': 27,
        'Ireland': 23,
        'Italy': 22,
        'Latvia': 21,
        'Lithuania': 21,
        'Luxembourg': 17,
        'Malta': 18,
        'Netherlands': 21,
        'Poland': 23,
        'Portugal': 23,
        'Romania': 19,
        'Slovakia': 20,
        'Slovenia': 22,
        'Spain': 21,
        'Sweden': 25,
        'United Kingdom': 20,
        'Norway': 25,
        'Switzerland': 7.7,
        'Canada': 0,
        'United States': 0,
        'Australia': 10,
        'New Zealand': 15,
        'Japan': 10,
        'South Korea': 10,
        'Singapore': 8,
        'India': 18,
        'Mexico': 16,
        'Brazil': 0,
        'Argentina': 21,
        'Chile': 19,
        'Colombia': 19,
        'South Africa': 15,
        'UAE': 5,
        'Saudi Arabia': 15,
        'Israel': 17,
        'Turkey': 18,
        'Russia': 20,
        'China': 13,
    };

    return vatRates[country] || 0;
}

export function generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-${year}${month}${day}-${randomSuffix}`;
}