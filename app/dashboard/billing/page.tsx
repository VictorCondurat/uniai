'use client';

import {useState, useEffect} from 'react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {CostChart} from '@/components/dashboard/charts/cost-chart';
import {toast} from 'sonner';
import {Download, Eye} from 'lucide-react';

interface UsageData {
    currentMonth: number;
    lastMonth: number;
    total: number;
    dailyUsage: Array<{ date: string; cost: number }>;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    amount: number;
    subtotal: number;
    vatAmount: number;
    markupAmount: number;
    currency: string;
    status: 'paid' | 'pending' | 'overdue';
    emailSent: boolean;
    paidAt?: string;
}

export default function BillingPage() {
    const [usageData, setUsageData] = useState<UsageData | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvoicePreview, setShowInvoicePreview] = useState(false);
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('current');

    useEffect(() => {
        fetchBillingData();
    }, []);

    const fetchBillingData = async () => {
        try {
            setLoading(true);

            const usageResponse = await fetch('/api/usage?type=summary');
            const usage = await usageResponse.json();
            setUsageData(usage);

            const invoicesResponse = await fetch('/api/invoices');
            const invoicesResult = await invoicesResponse.json();

            if (invoicesResult.success && invoicesResult.data) {
                setInvoices(invoicesResult.data);
            }

        } catch (error) {
            console.error('Error fetching billing data:', error);
            toast.error('Failed to load billing data');
        } finally {
            setLoading(false);
        }
    };

    const generateInvoicePreview = async () => {
        try {
            const now = new Date();
            const startDate = selectedPeriod === 'current'
                ? new Date(now.getFullYear(), now.getMonth(), 1)
                : new Date(now.getFullYear(), now.getMonth() - 1, 1);

            const endDate = selectedPeriod === 'current'
                ? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
                : new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

            const response = await fetch('/api/invoices/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                })
            });

            const data = await response.json();

            if (response.ok && data.data) {
                setInvoiceData(data.data);
                setShowInvoicePreview(true);
            } else if (data.message === 'No usage data found for the specified period') {
                toast.info('No usage data found for the selected period');
            } else {
                throw new Error(data.error || 'Failed to generate preview');
            }
        } catch (error) {
            toast.error('Failed to generate invoice preview');
        }
    };

    const downloadInvoicePDF = async (invoice?: Invoice) => {
        setIsGeneratingPDF(true);
        try {
            let pdfInvoiceData = invoiceData;

            if (invoice) {
                const response = await fetch(`/api/invoices?id=${invoice.id}`);
                const result = await response.json();
                if (result.success && result.data) {
                    pdfInvoiceData = result.data.details;
                }
            }

            const response = await fetch('/api/invoices/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({invoiceData: pdfInvoiceData}),
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${pdfInvoiceData.invoiceNumber}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                toast.success('PDF downloaded successfully');
            } else {
                throw new Error('Failed to generate PDF');
            }
        } catch (error) {
            toast.error('Failed to download PDF');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const sendInvoiceEmail = async () => {
        if (!invoiceData) return;

        setIsSendingEmail(true);
        try {
            const response = await fetch('/api/invoices/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invoiceData,
                    sendEmail: true,
                    saveToDatabase: true,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Invoice sent and saved successfully');
                setShowInvoicePreview(false);
                fetchBillingData();
            } else {
                throw new Error(data.error || 'Failed to send invoice');
            }
        } catch (error) {
            toast.error('Failed to send invoice email');
        } finally {
            setIsSendingEmail(false);
        }
    };

    const viewInvoiceDetails = async (invoice: Invoice) => {
        try {
            const response = await fetch(`/api/invoices?id=${invoice.id}`);
            const result = await response.json();

            if (result.success && result.data) {
                setInvoiceData(result.data.details);
                setShowInvoicePreview(true);
            }
        } catch (error) {
            toast.error('Failed to load invoice details');
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Manage your usage and invoices
                    </p>
                </div>
                <div className="animate-pulse space-y-4">
                    <div className="h-32 bg-gray-200 rounded"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Manage your usage and invoices
                    </p>
                </div>
                <div className="flex gap-2 items-center">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-40">
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="current">Current Month</SelectItem>
                            <SelectItem value="previous">Previous Month</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={generateInvoicePreview}>
                        Generate Invoice
                    </Button>
                </div>
            </div>

            <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded">
                        <p className="text-2xl font-bold text-gray-900">
                            ${usageData?.currentMonth?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-gray-600">This month</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                        <p className="text-2xl font-bold text-gray-900">
                            ${usageData?.lastMonth?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-gray-600">Last month</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                        <p className="text-2xl font-bold text-gray-900">
                            ${usageData?.total?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-gray-600">Total all time</p>
                    </div>
                </div>
            </Card>

            {usageData?.dailyUsage && (
                <Card className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Usage Trend</h3>
                    <CostChart data={usageData.dailyUsage}/>
                </Card>
            )}

            <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invoices</h3>

                {invoices.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">No invoices generated yet</p>
                        <Button onClick={generateInvoicePreview} variant="outline">
                            Generate Your First Invoice
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice Number</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                    <TableCell>
                                        {new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        {invoice.currency} {invoice.amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                invoice.status === 'paid' ? 'success' :
                                                    invoice.status === 'pending' ? 'secondary' :
                                                        'destructive'
                                            }
                                        >
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => viewInvoiceDetails(invoice)}
                                            >
                                                <Eye className="h-4 w-4"/>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => downloadInvoicePDF(invoice)}
                                            >
                                                <Download className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <Dialog open={showInvoicePreview} onOpenChange={setShowInvoicePreview}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Invoice Details</DialogTitle>
                    </DialogHeader>
                    {invoiceData && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border rounded">
                                    <p className="text-sm text-gray-600">Invoice Number</p>
                                    <p className="font-medium">{invoiceData.invoiceNumber}</p>
                                </div>
                                <div className="p-4 border rounded">
                                    <p className="text-sm text-gray-600">Total Amount</p>
                                    <p className="font-medium text-lg">
                                        {invoiceData.currency} {invoiceData.summary.total.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 border rounded">
                                <p className="text-sm text-gray-600 mb-2">Billing Period</p>
                                <p className="font-medium">
                                    {new Date(invoiceData.period.start).toLocaleDateString()} - {new Date(invoiceData.period.end).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="p-4 border rounded">
                                <p className="text-sm text-gray-600 mb-2">Breakdown</p>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span>{invoiceData.currency} {invoiceData.summary.subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Service Fee ({invoiceData.summary.markupRate.toFixed(1)}%):</span>
                                        <span>{invoiceData.currency} {invoiceData.summary.markupAmount.toFixed(2)}</span>
                                    </div>
                                    {invoiceData.summary.vatAmount > 0 && (
                                        <div className="flex justify-between">
                                            <span>VAT ({invoiceData.summary.vatRate}%):</span>
                                            <span>{invoiceData.currency} {invoiceData.summary.vatAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold pt-2 border-t">
                                        <span>Total:</span>
                                        <span>{invoiceData.currency} {invoiceData.summary.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border rounded">
                                <p className="text-sm text-gray-600 mb-2">Usage Summary</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-gray-600">Total API Calls:</span>
                                        <span className="ml-2 font-medium">{invoiceData.summary.totalApiCalls}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Total Tokens:</span>
                                        <span
                                            className="ml-2 font-medium">{invoiceData.summary.totalTokens.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    onClick={() => downloadInvoicePDF()}
                                    disabled={isGeneratingPDF}
                                    variant="outline"
                                >
                                    {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
                                </Button>
                                {!invoiceData.id && (
                                    <Button
                                        onClick={sendInvoiceEmail}
                                        disabled={isSendingEmail}
                                    >
                                        {isSendingEmail ? 'Sending...' : 'Send & Save Invoice'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}