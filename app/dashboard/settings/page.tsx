'use client';

import {useState, useEffect} from 'react';
import {useSession} from 'next-auth/react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Progress} from '@/components/ui/progress';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {Badge} from '@/components/ui/badge';
import {Alert, AlertDescription} from '@/components/ui/alert';
import { toast } from 'sonner';
import {
    User,
    Shield,
    CreditCard,
    Bell,
    Key,
    Globe,
    AlertTriangle,
    Check,
    X,
    Loader2,
    Mail,
    Lock,
    Webhook,
    DollarSign,
} from 'lucide-react';

interface UserSettings {
    id: string;
    email: string;
    name: string | null;
    autoModelEnabled: boolean;
    role: string;
    createdAt: string;
}

interface SpendingLimit {
    id: string;
    type: 'global' | 'project';
    projectId?: string;
    projectName?: string;
    limit: number;
    period: 'daily' | 'weekly' | 'monthly';
    currentSpend: number;
}

interface NotificationSettings {
    emailAlerts: boolean;
    costAlertThreshold: number;
    webhookUrl: string | null;
    alertTypes: {
        spending: boolean;
        apiErrors: boolean;
        usage: boolean;
        security: boolean;
    };
}

export default function SettingsPage() {
    const {data: session, update} = useSession();
    const [loading, setLoading] = useState(false);
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    const [spendingLimits, setSpendingLimits] = useState<SpendingLimit[]>([]);
    const [notifications, setNotifications] = useState<NotificationSettings>({
        emailAlerts: true,
        costAlertThreshold: 100,
        webhookUrl: null,
        alertTypes: {
            spending: true,
            apiErrors: true,
            usage: false,
            security: true,
        },
    });

    const [profileForm, setProfileForm] = useState({
        name: '',
        email: '',
    });
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [newSpendingLimit, setNewSpendingLimit] = useState({
        type: 'global',
        projectId: '',
        limit: 0,
        period: 'monthly',
    });

    useEffect(() => {
        fetchSettings();
        fetchSpendingLimits();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings');
            if (response.ok) {
                const data = await response.json();
                setUserSettings(data.user);
                setNotifications(data.notifications || notifications);
                setProfileForm({
                    name: data.user.name || '',
                    email: data.user.email,
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const fetchSpendingLimits = async () => {
        try {
            const response = await fetch('/api/settings/spending-limits');
            if (response.ok) {
                const data = await response.json();
                setSpendingLimits(data);
            }
        } catch (error) {
            console.error('Failed to fetch spending limits:', error);
        }
    };

    const updateProfile = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/settings/profile', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(profileForm),
            });

            if (response.ok) {
                await update();

                toast.success('Profile updated successfully');
                fetchSettings();
            } else {
                throw new Error('Failed to update profile');
            }
        } catch (error) {

            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const updatePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/settings/password', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                }),
            });

            if (response.ok) {
                toast.success('Password updated successfully');
                setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                });
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update password');
            }
        } catch (error: any) {
            toast.error('Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const toggleAutoModel = async () => {
        if (!userSettings) return;

        try {
            const response = await fetch('/api/settings/auto-model', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    enabled: !userSettings.autoModelEnabled,
                }),
            });

            if (response.ok) {
                setUserSettings({
                    ...userSettings,
                    autoModelEnabled: !userSettings.autoModelEnabled,
                });

                toast.success(`Auto model selection ${!userSettings.autoModelEnabled ? 'enabled' : 'disabled'}`);
            }
        } catch (error) {
            toast.error('Failed to update auto model setting');
        }
    };

    const addSpendingLimit = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/settings/spending-limits', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(newSpendingLimit),
            });

            if (response.ok) {
                toast.success('Spending limit added successfully');
                fetchSpendingLimits();
                setNewSpendingLimit({
                    type: 'global',
                    projectId: '',
                    limit: 0,
                    period: 'monthly',
                });
            } else {
                throw new Error('Failed to add spending limit');
            }
        } catch (error) {
            toast.error('Failed to add spending limit');
        } finally {
            setLoading(false);
        }
    };

    const removeSpendingLimit = async (id: string) => {
        try {
            const response = await fetch(`/api/settings/spending-limits/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {

                toast.success('Spending limit removed successfully');
                fetchSpendingLimits();
            }
        } catch (error) {
            toast.error('Failed to remove spending limit');
        }
    };

    const updateNotifications = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/settings/notifications', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(notifications),
            });

            if (response.ok) {
                toast.success('Notification settings updated successfully');
            } else {
                throw new Error('Failed to update notifications');
            }
        } catch (error) {
            toast.error('Failed to update notification settings');
        } finally {
            setLoading(false);
        }
    };

    const generateApiDocs = async () => {
        window.open('/api/docs', '_blank');
    };

    if (!userSettings) {
        return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Manage your account settings and preferences
                </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="api">API Settings</TabsTrigger>
                    <TabsTrigger value="spending">Spending Limits</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="billing">Billing</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>
                                Update your account information
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={profileForm.name}
                                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                                    placeholder="Enter your name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={profileForm.email}
                                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                                    placeholder="Enter your email"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Account Type</p>
                                    <p className="text-sm text-gray-500">
                                        <Badge variant="outline">{userSettings.role}</Badge>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Member Since</p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(userSettings.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <Button onClick={updateProfile} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Save Changes
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>
                                Update your password to keep your account secure
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm({
                                        ...passwordForm,
                                        currentPassword: e.target.value
                                    })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({
                                        ...passwordForm,
                                        confirmPassword: e.target.value
                                    })}
                                />
                            </div>
                            <Button onClick={updatePassword} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Update Password
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Two-Factor Authentication</CardTitle>
                            <CardDescription>
                                Add an extra layer of security to your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertTriangle className="h-4 w-4"/>
                                <AlertDescription>
                                    Two-factor authentication will be available in a future update
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="api" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Auto Model Selection</CardTitle>
                            <CardDescription>
                                Automatically select the most cost-effective model based on your request
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Enable Auto Model Selection</p>
                                    <p className="text-sm text-gray-500">
                                        Let the system choose the best model for each request based on cost and
                                        performance
                                    </p>
                                </div>
                                <Switch
                                    checked={userSettings.autoModelEnabled}
                                    onCheckedChange={toggleAutoModel}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>API Documentation</CardTitle>
                            <CardDescription>
                                Access API documentation and integration guides
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={generateApiDocs} variant="outline">
                                <Globe className="mr-2 h-4 w-4"/>
                                View API Documentation
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="spending" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Spending Limits</CardTitle>
                            <CardDescription>
                                Set limits to control your API usage costs
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                {spendingLimits.map((limit) => (
                                    <div key={limit.id}
                                         className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <p className="font-medium">
                                                {limit.type === 'global' ? 'Global Limit' : `Project: ${limit.projectName}`}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                ${limit.limit} / {limit.period}
                                            </p>
                                            <Progress
                                                value={(limit.currentSpend / limit.limit) * 100}
                                                className="mt-2 h-2 w-32"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                ${limit.currentSpend.toFixed(2)} spent
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSpendingLimit(limit.id)}
                                        >
                                            <X className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-4">Add New Spending Limit</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select
                                            value={newSpendingLimit.type}
                                            onValueChange={(value) => setNewSpendingLimit({
                                                ...newSpendingLimit,
                                                type: value as any
                                            })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="global">Global</SelectItem>
                                                <SelectItem value="project">Project</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Period</Label>
                                        <Select
                                            value={newSpendingLimit.period}
                                            onValueChange={(value) => setNewSpendingLimit({
                                                ...newSpendingLimit,
                                                period: value as any
                                            })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="daily">Daily</SelectItem>
                                                <SelectItem value="weekly">Weekly</SelectItem>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Limit Amount ($)</Label>
                                        <Input
                                            type="number"
                                            value={newSpendingLimit.limit}
                                            onChange={(e) => setNewSpendingLimit({
                                                ...newSpendingLimit,
                                                limit: parseFloat(e.target.value)
                                            })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <Button onClick={addSpendingLimit} disabled={loading}>
                                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                            Add Limit
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Notifications</CardTitle>
                            <CardDescription>
                                Configure when you receive email alerts
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Email Alerts</p>
                                    <p className="text-sm text-gray-500">Receive important notifications via email</p>
                                </div>
                                <Switch
                                    checked={notifications.emailAlerts}
                                    onCheckedChange={(checked) => setNotifications({
                                        ...notifications,
                                        emailAlerts: checked
                                    })}
                                />
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium">Alert Types</h4>
                                {Object.entries({
                                    spending: 'Spending alerts',
                                    apiErrors: 'API error notifications',
                                    usage: 'Usage reports',
                                    security: 'Security alerts',
                                }).map(([key, label]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <Label htmlFor={key} className="text-sm font-normal cursor-pointer">
                                            {label}
                                        </Label>
                                        <Switch
                                            id={key}
                                            checked={notifications.alertTypes[key as keyof typeof notifications.alertTypes]}
                                            onCheckedChange={(checked) =>
                                                setNotifications({
                                                    ...notifications,
                                                    alertTypes: {
                                                        ...notifications.alertTypes,
                                                        [key]: checked,
                                                    },
                                                })
                                            }
                                            disabled={!notifications.emailAlerts}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label>Cost Alert Threshold ($)</Label>
                                <Input
                                    type="number"
                                    value={notifications.costAlertThreshold}
                                    onChange={(e) => setNotifications({
                                        ...notifications,
                                        costAlertThreshold: parseFloat(e.target.value)
                                    })}
                                    placeholder="100.00"
                                />
                                <p className="text-xs text-gray-500">Get notified when your spending exceeds this
                                    amount</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Webhook Notifications</CardTitle>
                            <CardDescription>
                                Send alerts to your own endpoints
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Webhook URL</Label>
                                <Input
                                    type="url"
                                    value={notifications.webhookUrl || ''}
                                    onChange={(e) => setNotifications({...notifications, webhookUrl: e.target.value})}
                                    placeholder="https://your-domain.com/webhook"
                                />
                                <p className="text-xs text-gray-500">
                                    POST requests will be sent to this URL for important events
                                </p>
                            </div>

                            <Button onClick={updateNotifications} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Save Notification Settings
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="billing" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Billing Information</CardTitle>
                            <CardDescription>
                                Manage your billing and payment settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium">Current Balance</p>
                                    <p className="text-2xl font-bold">$0.00</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Next Invoice</p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <Alert>
                                <DollarSign className="h-4 w-4"/>
                                <AlertDescription>
                                    You are on a pay-as-you-go plan. You will be invoiced monthly for your usage.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <p className="text-sm font-medium">Billing Email</p>
                                <p className="text-sm text-gray-500">{userSettings.email}</p>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline">
                                    View Invoices
                                </Button>
                                <Button variant="outline">
                                    Download Tax Documents
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}