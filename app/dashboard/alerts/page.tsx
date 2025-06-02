'use client';

import {useState, useEffect, useCallback} from 'react';
import axios from 'axios';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {Badge} from '@/components/ui/badge';
import {
    AlertCircle,
    Bell,
    DollarSign,
    Plus,
    Trash2,
    TrendingUp,
    Mail,
    Webhook as WebhookIcon,
    Clock,
    Calendar as CalendarIcon,
    CheckCircle,
    Thermometer,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {motion, AnimatePresence} from 'framer-motion';
import {format, formatDistanceToNow} from 'date-fns';
import {toast} from 'sonner';

interface Alert {
    id: string;
    type: string;
    threshold: number;
    message: string;
    triggered: boolean;
    createdAt: string;
    updatedAt: string;
}

interface CostAlert {
    id: string;
    name: string;
    type: string;
    threshold: number;
    currentSpend: number;
    active: boolean;
    lastTriggered?: string | null;
    webhookUrl?: string | null;
    emailAlert: boolean;
    createdAt: string;
    updatedAt: string;
}

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
    subText?: React.ReactNode;
}

const StatCard = ({title, value, icon: Icon, color, subText}: StatCardProps) => {
    const iconColorName = color.split(' ')[0].replace('from-', '');
    const iconTextColorClass = `text-${iconColorName}`;

    return (
        <motion.div
            variants={{hidden: {opacity: 0, y: 20}, visible: {opacity: 1, y: 0}}}
            className="relative overflow-hidden"
        >
            <Card
                className="p-6 h-full relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
                <div
                    className={cn("absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10", `bg-gradient-to-br ${color}`)}/>
                <div className="relative flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                        <Icon className={cn("w-6 h-6 flex-shrink-0", iconTextColorClass)}/>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    {subText && typeof subText === 'string' ? (
                        <p className="text-sm text-gray-600 mt-1">{subText}</p>
                    ) : (
                        <div className="mt-1 text-sm text-gray-600">{subText}</div>
                    )}
                </div>
            </Card>
        </motion.div>
    );
};


export default function AlertsPage() {

    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [costAlerts, setCostAlerts] = useState<CostAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [activeDialogTab, setActiveDialogTab] = useState('general');
    const [currentMainTab, setCurrentMainTab] = useState('general');

    const [formData, setFormData] = useState({
        type: 'budget',
        threshold: '',
        message: '',
        name: '',
        costType: 'monthly',
        costThreshold: '',
        webhookUrl: '',
        emailAlert: true,
    });

    const fetchAllAlerts = useCallback(async () => {
        setLoading(true);
        try {
            const [generalRes, costRes] = await Promise.all([
                axios.get<Alert[]>('/api/alerts'),
                axios.get<CostAlert[]>('/api/alerts/cost-alerts'),
            ]);
            setAlerts(generalRes.data);
            setCostAlerts(costRes.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch alerts data:', err);
            let errorMessage = 'An unexpected error occurred.';
            if (axios.isAxiosError(err)) {
                const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message;
                errorMessage = `Failed to load alerts: ${serverMsg || 'Server communication error.'}`;
            } else if (err instanceof Error) {
                errorMessage = `Failed to load alerts: ${err.message}`;
            }
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllAlerts();
    }, [fetchAllAlerts]);

    const getApiErrorMessage = (err: unknown, defaultMessage: string): string => {
        if (axios.isAxiosError(err)) {
            return err.response?.data?.error || err.response?.data?.message || err.message || defaultMessage;
        }
        if (err instanceof Error) return err.message;
        return defaultMessage;
    };

    const handleCreateGeneralAlert = async () => {
        if (!formData.threshold) {
            toast.error('Please enter a valid threshold value.');
            return;
        }
        try {
            const response = await axios.post<Alert>('/api/alerts', {
                type: formData.type,
                threshold: parseFloat(formData.threshold),
                message: formData.message,
            });
            setAlerts((prev) => [response.data, ...prev]);
            setCreateDialogOpen(false);
            toast.success('General alert created successfully.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to create general alert.'));
        }
    };

    const handleCreateCostAlert = async () => {
        if (!formData.name || !formData.costThreshold) {
            toast.error('Name and Threshold are required.');
            return;
        }
        try {
            const response = await axios.post<CostAlert>('/api/alerts/cost-alerts', {
                name: formData.name, type: formData.costType, threshold: parseFloat(formData.costThreshold),
                webhookUrl: formData.webhookUrl || null, emailAlert: formData.emailAlert,
            });
            setCostAlerts((prev) => [response.data, ...prev]);
            setCreateDialogOpen(false);
            toast.success('Cost alert created successfully.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to create cost alert.'));
        }
    };

    const handleDeleteAlert = async (alertId: string) => {
        try {
            await axios.delete(`/api/alerts/${alertId}`);
            setAlerts((prev) => prev.filter((a) => a.id !== alertId));
            toast.success('General alert deleted successfully.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to delete general alert.'));
        }
    };

    const handleDeleteCostAlert = async (alertId: string) => {
        try {
            await axios.delete(`/api/alerts/cost-alerts/${alertId}`);
            setCostAlerts((prev) => prev.filter((a) => a.id !== alertId));
            toast.success('Cost alert deleted successfully.');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to delete cost alert.'));
        }
    };

    const handleToggleCostAlert = async (alertId: string, active: boolean) => {
        try {
            const response = await axios.patch<CostAlert>(`/api/alerts/cost-alerts/${alertId}`, {active});
            setCostAlerts((prev) => prev.map((alert) => alert.id === alertId ? {
                ...alert,
                active: response.data.active
            } : alert));
            toast.success(`Cost alert ${active ? 'activated' : 'deactivated'}.`);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to update cost alert status.'));
        }
    };

    const resetForm = () => {
        setFormData({
            type: 'budget', threshold: '', message: '', name: '', costType: 'monthly',
            costThreshold: '', webhookUrl: '', emailAlert: true,
        });
        setActiveDialogTab('general');
    };

    const formatDateFull = (dateStr: string | undefined | null) => dateStr ? format(new Date(dateStr), 'MMM dd, yyyy HH:mm:ss') : 'N/A';
    const formatRelativeDate = (dateStr: string | undefined | null) => dateStr ? formatDistanceToNow(new Date(dateStr), {addSuffix: true}) : 'Never';

    const getAlertTypeDetails = (type: string) => {
        const baseBadge = "px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset";
        switch (type) {
            case 'budget':
                return {
                    icon: DollarSign,
                    color: 'text-green-600',
                    badgeColor: `${baseBadge} bg-green-50 text-green-700 ring-green-600/20`,
                    label: 'Budget'
                };
            case 'usage':
                return {
                    icon: TrendingUp,
                    color: 'text-blue-600',
                    badgeColor: `${baseBadge} bg-blue-50 text-blue-700 ring-blue-600/20`,
                    label: 'Usage'
                };
            case 'anomaly':
                return {
                    icon: AlertCircle,
                    color: 'text-red-600',
                    badgeColor: `${baseBadge} bg-red-50 text-red-700 ring-red-600/20`,
                    label: 'Anomaly'
                };
            default:
                return {
                    icon: Bell,
                    color: 'text-gray-600',
                    badgeColor: `${baseBadge} bg-gray-50 text-gray-700 ring-gray-600/20`,
                    label: 'General'
                };
        }
    };

    const getCostAlertTypeDetails = (type: string) => {
        const baseBadge = "px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset";
        switch (type) {
            case 'daily':
                return {
                    icon: CalendarIcon,
                    color: 'text-purple-600',
                    badgeColor: `${baseBadge} bg-purple-50 text-purple-700 ring-purple-600/20`,
                    label: 'Daily Spend'
                };
            case 'weekly':
                return {
                    icon: CalendarIcon,
                    color: 'text-indigo-600',
                    badgeColor: `${baseBadge} bg-indigo-50 text-indigo-700 ring-indigo-600/20`,
                    label: 'Weekly Spend'
                };
            case 'monthly':
                return {
                    icon: CalendarIcon,
                    color: 'text-cyan-600',
                    badgeColor: `${baseBadge} bg-cyan-50 text-cyan-700 ring-cyan-600/20`,
                    label: 'Monthly Spend'
                };
            case 'threshold':
                return {
                    icon: Thermometer,
                    color: 'text-orange-600',
                    badgeColor: `${baseBadge} bg-orange-50 text-orange-700 ring-orange-600/20`,
                    label: 'Threshold'
                };
            default:
                return {
                    icon: Clock,
                    color: 'text-gray-600',
                    badgeColor: `${baseBadge} bg-gray-50 text-gray-700 ring-gray-600/20`,
                    label: 'Cost'
                };
        }
    };

    const calculateSpendingPercentage = (currentSpend: number, threshold: number) => {
        if (threshold <= 0) return 0;
        return Math.min(Math.max(0, (currentSpend / threshold) * 100), 100);
    };

    if (loading) {
        return (
            <div className="flex-1 p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 animate-pulse">
                    <div>
                        <div className="h-10 bg-gray-200 rounded w-64 mb-2"></div>
                        <div className="h-5 bg-gray-200 rounded w-96"></div>
                    </div>
                    <div className="h-10 w-40 bg-gray-200 rounded-xl"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded-xl animate-pulse w-full lg:w-fit "></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}
                              className="p-6 h-full relative overflow-hidden shadow-sm animate-pulse min-h-[200px] bg-white border-gray-200">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-bl-full"/>
                            <div className="relative space-y-3">
                                <div className="h-5 bg-gray-200 rounded w-3/5 mb-3"></div>
                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-10 bg-gray-200 rounded-xl ml-auto w-24"></div>
                            </div>
                        </Card>
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}
                              className="p-6 h-full relative overflow-hidden shadow-sm animate-pulse min-h-[120px] bg-white border-gray-200">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-bl-full"/>
                            <div className="relative space-y-3">
                                <div className="h-5 bg-gray-200 rounded w-3/5"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error && !loading) {
        return (
            <motion.div
                initial={{opacity: 0, y: -20}}
                animate={{opacity: 1, y: 0}}
                className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm mx-6 lg:mx-8 mt-6"
            >
                <AlertCircle className="w-5 h-5 flex-shrink-0"/>
                <span className="font-medium">{error}</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="flex-1 p-6 lg:p-8 space-y-8 bg-gray-50 min-h-screen"
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.3}}
        >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <span
                            className="w-12 h-12 bg-gradient-to-tr from-red-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
                            <Bell className="w-7 h-7 text-white"/>
                        </span>
                        Alerts & Notifications
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Configure automated alerts for usage and spending thresholds.
                    </p>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={(open) => {
                    setCreateDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button size="lg"
                                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium">
                            <Plus className="w-5 h-5 mr-2"/> Create Alert
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md p-6 bg-white rounded-xl shadow-2xl border">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold text-gray-800">Create New Alert</DialogTitle>
                            <DialogDescription className="text-gray-600 mt-1">
                                Set up alerts to monitor your API usage and spending.
                            </DialogDescription>
                        </DialogHeader>
                        <Tabs value={activeDialogTab} onValueChange={setActiveDialogTab} className="mt-4">
                            <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-xl p-1">
                                <TabsTrigger value="general"
                                             className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md py-1.5 text-gray-600 font-medium">General</TabsTrigger>
                                <TabsTrigger value="cost"
                                             className="data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm rounded-md py-1.5 text-gray-600 font-medium">Cost</TabsTrigger>
                            </TabsList>
                            <TabsContent value="general" className="space-y-4 pt-4">
                                <div>
                                    <Label htmlFor="type" className="text-sm font-medium text-gray-700 mb-1.5 block">Alert
                                        Type</Label>
                                    <Select value={formData.type}
                                            onValueChange={(value) => setFormData({...formData, type: value})}>
                                        <SelectTrigger className="w-full focus:ring-blue-500"><SelectValue
                                            placeholder="Select type"/></SelectTrigger>
                                        <SelectContent><SelectItem value="budget">Budget</SelectItem><SelectItem
                                            value="usage">Usage</SelectItem><SelectItem
                                            value="anomaly">Anomaly</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="threshold"
                                           className="text-sm font-medium text-gray-700 mb-1.5 block">Threshold</Label>
                                    <Input id="threshold" type="number" value={formData.threshold}
                                           onChange={(e) => setFormData({...formData, threshold: e.target.value})}
                                           placeholder={formData.type === 'budget' ? 'e.g., 500.00' : 'e.g., 100000'}
                                           className="focus:ring-blue-500"/>
                                </div>
                                <div>
                                    <Label htmlFor="message" className="text-sm font-medium text-gray-700 mb-1.5 block">Message
                                        (Optional)</Label>
                                    <Input id="message" value={formData.message}
                                           onChange={(e) => setFormData({...formData, message: e.target.value})}
                                           placeholder="Custom alert message" className="focus:ring-blue-500"/>
                                </div>
                            </TabsContent>
                            <TabsContent value="cost" className="space-y-4 pt-4">
                                <div><Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1.5 block">Alert
                                    Name</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({
                                    ...formData,
                                    name: e.target.value
                                })} placeholder="e.g., Monthly API Spend" className="focus:ring-green-500"/></div>
                                <div><Label htmlFor="costType"
                                            className="text-sm font-medium text-gray-700 mb-1.5 block">Period</Label><Select
                                    value={formData.costType} onValueChange={(value) => setFormData({
                                    ...formData,
                                    costType: value
                                })}><SelectTrigger className="w-full focus:ring-green-500"><SelectValue
                                    placeholder="Select period"/></SelectTrigger><SelectContent><SelectItem
                                    value="daily">Daily</SelectItem><SelectItem
                                    value="weekly">Weekly</SelectItem><SelectItem
                                    value="monthly">Monthly</SelectItem><SelectItem
                                    value="threshold">One-time</SelectItem></SelectContent></Select></div>
                                <div><Label htmlFor="costThreshold"
                                            className="text-sm font-medium text-gray-700 mb-1.5 block">Threshold
                                    ($)</Label><Input id="costThreshold" type="number" value={formData.costThreshold}
                                                      onChange={(e) => setFormData({
                                                          ...formData,
                                                          costThreshold: e.target.value
                                                      })} placeholder="e.g., 100.00" className="focus:ring-green-500"/>
                                </div>
                                <div><Label htmlFor="webhookUrl"
                                            className="text-sm font-medium text-gray-700 mb-1.5 block">Webhook
                                    (Optional)</Label><Input id="webhookUrl" value={formData.webhookUrl}
                                                             onChange={(e) => setFormData({
                                                                 ...formData,
                                                                 webhookUrl: e.target.value
                                                             })} placeholder="https://your-webhook.com"
                                                             className="focus:ring-green-500"/></div>
                                <div className="flex items-center space-x-2 pt-2"><Switch id="emailAlert"
                                                                                          checked={formData.emailAlert}
                                                                                          onCheckedChange={(checked) => setFormData({
                                                                                              ...formData,
                                                                                              emailAlert: checked
                                                                                          })}/><Label
                                    htmlFor="emailAlert" className="text-sm text-gray-700">Email Notification</Label>
                                </div>
                            </TabsContent>
                        </Tabs>
                        <DialogFooter className="mt-6"><Button variant="outline"
                                                               onClick={() => setCreateDialogOpen(false)}>Cancel</Button><Button
                            onClick={activeDialogTab === 'general' ? handleCreateGeneralAlert : handleCreateCostAlert}
                            className="bg-blue-600 hover:bg-blue-700 text-white">Create Alert</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs value={currentMainTab} onValueChange={setCurrentMainTab} className="space-y-6">
                <TabsList className="grid w-full lg:w-fit grid-cols-2 bg-gray-200 rounded-lg p-1">
                    <TabsTrigger value="general"
                                 className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-md py-2 px-4 text-gray-700 font-semibold"><Bell
                        className="w-4 h-4 mr-2 inline-block"/>General ({alerts.length})</TabsTrigger>
                    <TabsTrigger value="cost"
                                 className="data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm rounded-md py-2 px-4 text-gray-700 font-semibold"><DollarSign
                        className="w-4 h-4 mr-2 inline-block"/>Cost ({costAlerts.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    {alerts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {alerts.map((alert, index) => {
                                    const {icon: AlertIcon, color, label, badgeColor} = getAlertTypeDetails(alert.type);
                                    return (
                                        <motion.div key={alert.id} initial={{opacity: 0, y: 20}}
                                                    animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}}
                                                    transition={{delay: index * 0.05}}>
                                            <Card
                                                className="shadow-sm border bg-white hover:shadow-md transition-shadow h-full">
                                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                                    <div className="flex items-center space-x-3">
                                                        <span
                                                            className={cn("p-2 rounded-lg", color.replace('text-', 'bg-') + "/10")}><AlertIcon
                                                            className={cn("w-5 h-5", color)}/></span>
                                                        <CardTitle
                                                            className="text-lg font-semibold text-gray-800 capitalize">{label} Alert</CardTitle>
                                                    </div>
                                                    <Badge
                                                        className={cn(alert.triggered ? "bg-red-100 text-red-700 ring-red-600/20" : "bg-green-50 text-green-700 ring-green-600/20", "px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset")}>{alert.triggered ? 'TRIGGERED' : 'ACTIVE'}</Badge>
                                                </CardHeader>
                                                <CardContent className="space-y-3 text-sm">
                                                    <div><p className="text-gray-500">Threshold</p><p
                                                        className="font-medium text-gray-700">{alert.type === 'budget' ? `$${alert.threshold.toFixed(2)}` : `${alert.threshold.toLocaleString()}`}</p>
                                                    </div>
                                                    {alert.message && <div><p className="text-gray-500">Message</p><p
                                                        className="text-gray-700">{alert.message}</p></div>}
                                                    <div><p className="text-gray-500">Created</p><p
                                                        className="text-gray-700">{formatDateFull(alert.createdAt)}</p>
                                                    </div>
                                                    <div className="flex justify-end pt-2 border-t mt-3">
                                                        <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost"
                                                                                                         size="sm"
                                                                                                         className="text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2
                                                            className="w-4 h-4 mr-1.5"/>Delete</Button></AlertDialogTrigger>
                                                            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete
                                                                Alert</AlertDialogTitle><AlertDialogDescription>Are you
                                                                sure? This cannot be
                                                                undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction
                                                                onClick={() => handleDeleteAlert(alert.id)}
                                                                className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <motion.div initial={{opacity: 0}} animate={{opacity: 1}}
                                    className="bg-white rounded-lg border text-center py-12 shadow-sm">
                            <CardContent className="flex flex-col items-center"><Bell
                                className="w-12 h-12 text-gray-300 mb-3"/><p
                                className="text-gray-700 text-lg font-medium mb-2">No General Alerts Yet</p><p
                                className="text-gray-500 text-sm mb-5 max-w-xs">Create alerts for budgets, usage, or
                                anomalies to stay informed.</p><Button onClick={() => {
                                setActiveDialogTab('general');
                                setCreateDialogOpen(true);
                            }} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2"/>New General
                                Alert</Button></CardContent>
                        </motion.div>
                    )}
                </TabsContent>

                <TabsContent value="cost" className="space-y-4">
                    {costAlerts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {costAlerts.map((alert, index) => {
                                    const {icon: CostAlertIcon, color, label} = getCostAlertTypeDetails(alert.type);
                                    const spendingProgress = calculateSpendingPercentage(alert.currentSpend, alert.threshold);
                                    let progressBarColor = 'bg-green-500';
                                    if (spendingProgress >= 90) progressBarColor = 'bg-red-500';
                                    else if (spendingProgress >= 75) progressBarColor = 'bg-yellow-500';

                                    return (
                                        <motion.div key={alert.id} initial={{opacity: 0, y: 20}}
                                                    animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}}
                                                    transition={{delay: index * 0.05}}>
                                            <Card
                                                className="shadow-sm border bg-white hover:shadow-md transition-shadow h-full">
                                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                                    <div className="flex items-center space-x-3">
                                                        <span
                                                            className={cn("p-2 rounded-lg", color.replace('text-', 'bg-') + "/10")}><CostAlertIcon
                                                            className={cn("w-5 h-5", color)}/></span>
                                                        <div><CardTitle
                                                            className="text-lg font-semibold text-gray-800">{alert.name}</CardTitle><CardDescription
                                                            className="text-xs text-gray-500 capitalize">{label} alert</CardDescription>
                                                        </div>
                                                    </div>
                                                    <Switch checked={alert.active}
                                                            onCheckedChange={(checked) => handleToggleCostAlert(alert.id, checked)}/>
                                                </CardHeader>
                                                <CardContent className="space-y-3 text-sm">
                                                    <div>
                                                        <div className="flex justify-between items-baseline mb-1"><span
                                                            className="text-gray-500">Spend</span><span
                                                            className="font-medium text-gray-700">${alert.currentSpend.toFixed(2)} / ${alert.threshold.toFixed(2)}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                            <div className={cn("h-full rounded-full", progressBarColor)}
                                                                 style={{width: `${spendingProgress}%`}}/>
                                                        </div>
                                                        <p className={cn("text-xs mt-1 text-right", spendingProgress >= 90 ? 'text-red-600' : spendingProgress >= 75 ? 'text-yellow-600' : 'text-gray-500')}>{spendingProgress.toFixed(0)}%
                                                            of threshold</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                        <div><p className="text-gray-500">Period</p><p
                                                            className="font-medium text-gray-700 capitalize">{alert.type}</p>
                                                        </div>
                                                        <div><p className="text-gray-500">Last Triggered</p><p
                                                            className="font-medium text-gray-700">{formatRelativeDate(alert.lastTriggered)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2 pt-1">
                                                        {alert.emailAlert && <Badge variant="outline"
                                                                                    className="text-xs font-normal"><Mail
                                                            className="w-3 h-3 mr-1.5"/>Email</Badge>}
                                                        {alert.webhookUrl && <Badge variant="outline"
                                                                                    className="text-xs font-normal"><WebhookIcon
                                                            className="w-3 h-3 mr-1.5"/>Webhook</Badge>}
                                                    </div>
                                                    <div
                                                        className="flex justify-between items-center pt-2 border-t mt-3">
                                                        <p className="text-xs text-gray-500">Created {formatDateFull(alert.createdAt)}</p>
                                                        <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost"
                                                                                                         size="sm"
                                                                                                         className="text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2
                                                            className="w-4 h-4 mr-1.5"/>Delete</Button></AlertDialogTrigger>
                                                            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete
                                                                Cost Alert</AlertDialogTitle><AlertDialogDescription>Are
                                                                you sure? This cannot be
                                                                undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction
                                                                onClick={() => handleDeleteCostAlert(alert.id)}
                                                                className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <motion.div initial={{opacity: 0}} animate={{opacity: 1}}
                                    className="bg-white rounded-lg border text-center py-12 shadow-sm">
                            <CardContent className="flex flex-col items-center"><DollarSign
                                className="w-12 h-12 text-gray-300 mb-3"/><p
                                className="text-gray-700 text-lg font-medium mb-2">No Cost Alerts Yet</p><p
                                className="text-gray-500 text-sm mb-5 max-w-xs">Set up alerts to monitor spending and
                                avoid unexpected costs.</p><Button onClick={() => {
                                setActiveDialogTab('cost');
                                setCreateDialogOpen(true);
                            }} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2"/>New Cost Alert</Button></CardContent>
                        </motion.div>
                    )}
                </TabsContent>
            </Tabs>

            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" initial="hidden"
                        animate="visible" variants={{visible: {transition: {staggerChildren: 0.08}}}}>
                <StatCard title="Total Alerts" value={(alerts.length + costAlerts.length).toLocaleString()} icon={Bell}
                          color="from-purple-500 to-pink-500" subText="General & Cost Alerts"/>
                <StatCard title="Active Cost Alerts" value={costAlerts.filter(a => a.active).length.toLocaleString()}
                          icon={CheckCircle} color="from-green-500 to-emerald-500" subText="Actively monitoring spend"/>
                <StatCard title="Triggered General" value={alerts.filter(a => a.triggered).length.toLocaleString()}
                          icon={AlertCircle} color="from-red-500 to-rose-500" subText="Alerts needing attention"/>
                <StatCard title="Near Threshold (Cost)"
                          value={costAlerts.filter(a => a.active && calculateSpendingPercentage(a.currentSpend, a.threshold) >= 80 && calculateSpendingPercentage(a.currentSpend, a.threshold) < 100).length.toLocaleString()}
                          icon={TrendingUp} color="from-yellow-500 to-orange-500" subText="Approaching spend limits"/>
            </motion.div>
        </motion.div>
    );
}