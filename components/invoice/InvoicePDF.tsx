import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from '@react-pdf/renderer';
import { InvoiceData } from '@/types/invoice';

Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
    ]
});

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Roboto',
        fontSize: 10,
        paddingTop: 30,
        paddingLeft: 40,
        paddingRight: 40,
        paddingBottom: 60,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        borderBottomWidth: 2,
        borderBottomColor: '#3B82F6',
        paddingBottom: 20,
    },
    logo: {
        width: 80,
        height: 80,
    },
    companyInfo: {
        fontSize: 10,
        lineHeight: 1.4,
    },
    companyName: {
        fontSize: 18,
        fontWeight: 700,
        color: '#1F2937',
        marginBottom: 8,
    },
    invoiceTitle: {
        fontSize: 32,
        fontWeight: 700,
        color: '#3B82F6',
        textAlign: 'right',
    },
    invoiceNumber: {
        fontSize: 12,
        fontWeight: 500,
        textAlign: 'right',
        marginTop: 8,
        color: '#6B7280',
    },
    billingSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    billingBox: {
        width: '45%',
        padding: 15,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    billingTitle: {
        fontSize: 12,
        fontWeight: 700,
        color: '#374151',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    billingText: {
        fontSize: 10,
        lineHeight: 1.4,
        color: '#6B7280',
    },
    periodSection: {
        backgroundColor: '#EFF6FF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 25,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    periodTitle: {
        fontSize: 12,
        fontWeight: 700,
        color: '#1E40AF',
        marginBottom: 5,
    },
    table: {
        marginBottom: 25,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#3B82F6',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    tableHeaderText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: 700,
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingVertical: 8,
        paddingHorizontal: 8,
        backgroundColor: '#FFFFFF',
    },
    tableRowAlt: {
        backgroundColor: '#F9FAFB',
    },
    tableCell: {
        fontSize: 8,
        textAlign: 'center',
        paddingHorizontal: 2,
    },
    summarySection: {
        marginTop: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryBox: {
        width: '45%',
        backgroundColor: '#F3F4F6',
        padding: 15,
        borderRadius: 8,
    },
    summaryTitle: {
        fontSize: 12,
        fontWeight: 700,
        color: '#374151',
        marginBottom: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    summaryLabel: {
        fontSize: 10,
        color: '#6B7280',
    },
    summaryValue: {
        fontSize: 10,
        fontWeight: 500,
        color: '#374151',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#D1D5DB',
        paddingTop: 8,
        marginTop: 8,
    },
    totalLabel: {
        fontSize: 12,
        fontWeight: 700,
        color: '#1F2937',
    },
    totalValue: {
        fontSize: 12,
        fontWeight: 700,
        color: '#059669',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 15,
    },
    footerText: {
        fontSize: 8,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 1.4,
    },
});

interface InvoicePDFProps {
    data: InvoiceData;
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ data }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: data.currency,
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.companyName}>{data.company.name}</Text>
                        <View style={styles.companyInfo}>
                            <Text>{data.company.address}</Text>
                            <Text>{data.company.city}, {data.company.country}</Text>
                            <Text>Tax ID: {data.company.taxId}</Text>
                            <Text>Email: {data.company.email}</Text>
                            <Text>Phone: {data.company.phone}</Text>
                        </View>
                    </View>
                    <View>
                        <Text style={styles.invoiceTitle}>INVOICE</Text>
                        <Text style={styles.invoiceNumber}>#{data.invoiceNumber}</Text>
                        <Text style={[styles.invoiceNumber, { marginTop: 4 }]}>
                            Issued: {new Date(data.issueDate).toLocaleDateString()}
                        </Text>
                        <Text style={[styles.invoiceNumber, { marginTop: 2 }]}>
                            Due: {new Date(data.dueDate).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                <View style={styles.billingSection}>
                    <View style={styles.billingBox}>
                        <Text style={styles.billingTitle}>Bill To:</Text>
                        <View style={styles.billingText}>
                            <Text style={{ fontWeight: 500, marginBottom: 4 }}>{data.client.name}</Text>
                            <Text>{data.client.address}</Text>
                            <Text>{data.client.city}, {data.client.country}</Text>
                            <Text>{data.client.email}</Text>
                            {data.client.taxId && <Text>Tax ID: {data.client.taxId}</Text>}
                            {data.client.vatNumber && <Text>VAT: {data.client.vatNumber}</Text>}
                        </View>
                    </View>

                    <View style={styles.billingBox}>
                        <Text style={styles.billingTitle}>Service Details:</Text>
                        <View style={styles.billingText}>
                            <Text>AI API Usage Services</Text>
                            <Text>Model Access & Processing</Text>
                            <Text>Token-based Billing</Text>
                            <Text>Professional Service Fee: {data.summary.markupRate}%</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.periodSection}>
                    <Text style={styles.periodTitle}>Billing Period</Text>
                    <Text style={{ fontSize: 10, color: '#1E40AF' }}>
                        {new Date(data.period.start).toLocaleDateString()} - {new Date(data.period.end).toLocaleDateString()}
                    </Text>
                    <Text style={{ fontSize: 9, color: '#3730A3', marginTop: 4 }}>
                        Total API Calls: {formatNumber(data.summary.totalApiCalls)} |
                        Total Tokens: {formatNumber(data.summary.totalTokens)}
                    </Text>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, { width: '12%' }]}>Date</Text>
                        <Text style={[styles.tableHeaderText, { width: '18%' }]}>Model</Text>
                        <Text style={[styles.tableHeaderText, { width: '15%' }]}>Endpoint</Text>
                        <Text style={[styles.tableHeaderText, { width: '12%' }]}>Input Tokens</Text>
                        <Text style={[styles.tableHeaderText, { width: '12%' }]}>Output Tokens</Text>
                        <Text style={[styles.tableHeaderText, { width: '10%' }]}>Rate</Text>
                        <Text style={[styles.tableHeaderText, { width: '10%' }]}>Base Cost</Text>
                        <Text style={[styles.tableHeaderText, { width: '11%' }]}>Final Cost</Text>
                    </View>

                    {data.items.map((item, index) => (
                        <View
                            key={item.id}
                            style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
                        >
                            <Text style={[styles.tableCell, { width: '12%' }]}>
                                {new Date(item.date).toLocaleDateString('en-GB')}
                            </Text>
                            <Text style={[styles.tableCell, { width: '18%', fontSize: 7 }]}>
                                {item.model}
                            </Text>
                            <Text style={[styles.tableCell, { width: '15%', fontSize: 7 }]}>
                                {item.endpoint}
                            </Text>
                            <Text style={[styles.tableCell, { width: '12%' }]}>
                                {formatNumber(item.inputTokens)}
                            </Text>
                            <Text style={[styles.tableCell, { width: '12%' }]}>
                                {formatNumber(item.outputTokens)}
                            </Text>
                            <Text style={[styles.tableCell, { width: '10%' }]}>
                                ${item.costPerToken.toFixed(6)}
                            </Text>
                            <Text style={[styles.tableCell, { width: '10%' }]}>
                                {formatCurrency(item.baseCost)}
                            </Text>
                            <Text style={[styles.tableCell, { width: '11%', fontWeight: 500 }]}>
                                {formatCurrency(item.finalCost)}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.summarySection}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryTitle}>Usage Summary</Text>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total API Calls:</Text>
                            <Text style={styles.summaryValue}>{formatNumber(data.summary.totalApiCalls)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Total Tokens:</Text>
                            <Text style={styles.summaryValue}>{formatNumber(data.summary.totalTokens)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Average Cost/Token:</Text>
                            <Text style={styles.summaryValue}>
                                ${(data.summary.subtotal / data.summary.totalTokens).toFixed(6)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryTitle}>Cost Breakdown</Text>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>API Costs (Subtotal):</Text>
                            <Text style={styles.summaryValue}>{formatCurrency(data.summary.subtotal)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Service Fee ({data.summary.markupRate}%):</Text>
                            <Text style={styles.summaryValue}>{formatCurrency(data.summary.markupAmount)}</Text>
                        </View>
                        {data.summary.vatAmount > 0 && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>VAT ({data.summary.vatRate}%):</Text>
                                <Text style={styles.summaryValue}>{formatCurrency(data.summary.vatAmount)}</Text>
                            </View>
                        )}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>TOTAL:</Text>
                            <Text style={styles.totalValue}>{formatCurrency(data.summary.total)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Payment Terms: Net 30 days from invoice date.
                        Late payments may incur additional charges.{'\n'}
                        For questions regarding this invoice, please contact: {data.company.email}
                        {'\n\n'}
                        Thank you for choosing our AI services!
                    </Text>
                </View>
            </Page>
        </Document>
    );
};