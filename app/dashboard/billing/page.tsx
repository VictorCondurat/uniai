'use client';

import {useState, useEffect} from 'react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {CostChart} from '@/components/dashboard/charts/cost-chart';
import {CostForecast} from '@/components/dashboard/alerts/cost-forecast';
import {toast} from 'sonner';

interface UsageData {
    currentMonth: number;
    lastMonth: number;
    total: number;
    dailyUsage: Array<{ date: string; cost: number }>;
}

interface Invoice {
    id: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'overdue';
    downloadUrl: string;
}

interface SpendingLimit {
    id: string;
    amount: number;
    period: 'daily' | 'monthly';
    alertThreshold: number;
    killSwitchEnabled: boolean;
}

interface BillingAlert {
    id: string;
    type: 'warning' | 'danger';
    message: string;
    threshold: number;
    currentUsage: number;
}

export default function BillingPage() {
    const [usageData, setUsageData] = useState<UsageData | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [spendingLimits, setSpendingLimits] = useState<SpendingLimit[]>([]);
    const [alerts, setAlerts] = useState<BillingAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [showInvoicePreview, setShowInvoicePreview] = useState(false);
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [newLimit, setNewLimit] = useState({
        amount: '',
        period: 'monthly' as 'daily' | 'monthly',
        alertThreshold: '80',
        killSwitchEnabled: false
    });

    useEffect(() => {
        fetchBillingData();
    }, []);

    const fetchBillingData = async () => {
        try {
            setLoading(true);

            const usageResponse = await fetch('/api/usage');
            const usage = await usageResponse.json();
            setUsageData(usage);

            const invoicesResponse = await fetch('/api/invoices');
            const invoicesData = await invoicesResponse.json();
            setInvoices(invoicesData);

            const limitsResponse = await fetch('/api/alerts/spending-limits');
            const limitsData = await limitsResponse.json();
            setSpendingLimits(limitsData);

            const alertsResponse = await fetch('/api/alerts?type=billing');
            const alertsData = await alertsResponse.json();
            setAlerts(alertsData);

        } catch (error) {
            console.error('Error fetching billing data:', error);
            toast.error('Failed to load billing data');
        } finally {
            setLoading(false);
        }
    };

    const generateInvoicePreview = async () => {
        try {
            const response = await fetch('/api/invoices/preview', {
                method: 'POST'
            });
            const data = await response.json();

            if (response.ok) {
                setInvoiceData(data.data);
                setShowInvoicePreview(true);
                toast.success('Invoice preview generated successfully');
            } else {
                throw new Error(data.error || 'Failed to generate preview');
            }
        } catch (error) {
            toast.error('Failed to generate invoice preview' +error)
        }
    };

    const downloadInvoicePDF = async () => {
        if (!invoiceData) return;

        setIsGeneratingPDF(true);
        try {
            const response = await fetch('/api/invoices/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({invoiceData}),
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${invoiceData.invoiceNumber}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                toast.success('PDF generated successfully');
            } else {
                throw new Error('Failed to generate PDF');
            }
        } catch (error) {
            toast.error('Failed to download PDF: ' + error);
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

                toast.success('Invoice email sent successfully');
                setShowInvoicePreview(false);
            } else {
                throw new Error(data.error || 'Failed to send invoice');
            }
        } catch (error) {
            toast.error('Failed to send invoice email: ' + error);
        } finally {
            setIsSendingEmail(false);
        }
    };

    const createSpendingLimit = async () => {
        try {
            const response = await fetch('/api/alerts/spending-limits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: parseFloat(newLimit.amount),
                    period: newLimit.period,
                    alertThreshold: parseFloat(newLimit.alertThreshold),
                    killSwitchEnabled: newLimit.killSwitchEnabled
                }),
            });

            if (response.ok) {
                await fetchBillingData();
                setShowLimitModal(false);
                setNewLimit({
                    amount: '',
                    period: 'monthly',
                    alertThreshold: '80',
                    killSwitchEnabled: false
                });

                toast.success('Spending limit created successfully');
            }
        } catch (error) {
            toast.error('Failed to create spending limit: ' + error);
        }
    };

    const toggleKillSwitch = async (limitId: string, enabled: boolean) => {
        try {
            const response = await fetch(`/api/alerts/spending-limits/${limitId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({killSwitchEnabled: enabled}),
            });

            if (response.ok) {
                await fetchBillingData();

                toast.success(`Kill switch ${enabled ? 'enabled' : 'disabled'} successfully`);
            }
        } catch (error) {
            toast.error('Failed to update kill switch: ' + error);
        }
    };

    const downloadInvoice = async (invoiceId: string) => {
        try {
            const response = await fetch(`/api/invoices/${invoiceId}/download`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `invoice-${invoiceId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            toast.error('Failed to download invoice: ' + error);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Manage your billing and invoices
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
                        Manage your billing and invoices
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={generateInvoicePreview} variant="outline">
                        Preview Invoice
                    </Button>
                    <Button onClick={() => setShowLimitModal(true)}>
                        Set Spending Limit
                    </Button>
                </div>
            </div>

            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((alert) => (
                        <Alert key={alert.id} variant={alert.type === 'danger' ? 'destructive' : 'default'}>
                            <AlertDescription>
                                <div className="flex justify-between items-center">
                                    <span>{alert.message}</span>
                                    <Badge variant={alert.type === 'danger' ? 'destructive' : 'secondary'}>
                                        {((alert.currentUsage / alert.threshold) * 100).toFixed(1)}%
                                    </Badge>
                                </div>
                            </AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}

            <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Current Usage</h3>
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
                        <p className="text-sm text-gray-600">Total</p>
                    </div>
                </div>
            </Card>

            {usageData?.dailyUsage && (
                <Card className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Trends</h3>
                    <CostChart data={usageData.dailyUsage}/>
                </Card>
            )}

            <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Forecast</h3>
                <CostForecast currentUsage={usageData?.currentMonth || 0}/>
            </Card>

            <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Spending Limits</h3>
                    <Button onClick={() => setShowLimitModal(true)} size="sm">
                        Add Limit
                    </Button>
                </div>

                {spendingLimits.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No spending limits configured</p>
                ) : (
                    <div className="space-y-4">
                        {spendingLimits.map((limit) => (
                            <div key={limit.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <p className="font-medium">${limit.amount} / {limit.period}</p>
                                    <p className="text-sm text-gray-600">
                                        Alert at {limit.alertThreshold}%
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`killswitch-${limit.id}`} className="text-sm">
                                            Kill Switch
                                        </Label>
                                        <Switch
                                            id={`killswitch-${limit.id}`}
                                            checked={limit.killSwitchEnabled}
                                            onCheckedChange={(checked) => toggleKillSwitch(limit.id, checked)}
                                        />
                                    </div>
                                    <Badge variant={limit.killSwitchEnabled ? 'destructive' : 'secondary'}>
                                        {limit.killSwitchEnabled ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice History</h3>

                {invoices.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No invoices available</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.map((invoice) => (
                                <TableRow key={invoice.id}>
                                    <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                                    <TableCell>${invoice.amount.toFixed(2)}</TableCell>
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
                                    <TableCell>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => downloadInvoice(invoice.id)}
                                        >
                                            Download
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <Dialog open={showInvoicePreview} onOpenChange={setShowInvoicePreview}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Invoice Preview</DialogTitle>
                    </DialogHeader>
                    {invoiceData && (
                        <div className="space-y-4">
                            <div className="p-4 border rounded bg-gray-50">
                                <p>Invoice Number: {invoiceData.invoiceNumber}</p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    onClick={downloadInvoicePDF}
                                    disabled={isGeneratingPDF}
                                    variant="outline"
                                >
                                    {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
                                </Button>
                                <Button
                                    onClick={sendInvoiceEmail}
                                    disabled={isSendingEmail}
                                >
                                    {isSendingEmail ? 'Sending...' : 'Send Email'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Spending Limit</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="amount">Amount ($)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={newLimit.amount}
                                onChange={(e) => setNewLimit({...newLimit, amount: e.target.value})}
                                placeholder="100.00"
                            />
                        </div>

                        <div>
                            <Label htmlFor="period">Period</Label>
                            <Select
                                value={newLimit.period}
                                onValueChange={(value: 'daily' | 'monthly') =>
                                    setNewLimit({...newLimit, period: value})
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="threshold">Alert Threshold (%)</Label>
                            <Input
                                id="threshold"
                                type="number"
                                value={newLimit.alertThreshold}
                                onChange={(e) => setNewLimit({...newLimit, alertThreshold: e.target.value})}
                                placeholder="80"
                                min="1"
                                max="100"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch
                                id="killswitch"
                                checked={newLimit.killSwitchEnabled}
                                onCheckedChange={(checked) => setNewLimit({...newLimit, killSwitchEnabled: checked})}
                            />
                            <Label htmlFor="killswitch">Enable Kill Switch</Label>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowLimitModal(false)}>
                                Cancel
                            </Button>
                            <Button onClick={createSpendingLimit}>
                                Create Limit
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}