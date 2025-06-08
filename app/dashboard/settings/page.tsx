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
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {Badge} from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Loader2,
    DollarSign,
} from 'lucide-react';

interface UserSettings {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
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
    const [loading, setLoading] = useState(true);
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
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

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
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
                } else {
                    toast.error("Failed to load settings. Please try again later.");
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
                toast.error("An error occurred while fetching your settings.");
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const updateProfile = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/settings/profile', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name: profileForm.name}),
            });

            if (response.ok) {
                await update();
                setUserSettings(prev => prev ? {...prev, name: profileForm.name} : null);
                toast.success('Name updated successfully!');
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update profile.');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const updatePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('New passwords do not match.');
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
                toast.success('Password updated successfully.');
                setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                });
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update password.');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
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
                toast.success('Notification settings updated successfully.');
            } else {
                throw new Error('Failed to update notification settings.');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !userSettings) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500"/>
            </div>
        );
    }

    if (!userSettings) {
        return (
            <div className="flex justify-center items-center h-64">
                <p>Could not load user settings.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Manage your account settings and preferences.
                </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="billing">Billing</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>
                                Update your account's public information.
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
                                    disabled
                                />
                                <p className="text-xs text-muted-foreground">
                                    Your email address cannot be changed.
                                </p>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <div>
                                    <p className="text-sm font-medium">Account Type</p>
                                    <Badge variant="outline" className="mt-1">{userSettings.role}</Badge>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Member Since</p>
                                    <p className="mt-1 text-sm text-gray-500">
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
                                Update your password to keep your account secure.
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
                                Add an extra layer of security to your account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">
                                This feature will be available in a future update.
                            </p>
                            <Button variant="outline" disabled>
                                Enable 2FA
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notifications</CardTitle>
                            <CardDescription>
                                Configure when and how you receive alerts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label className="font-medium">Email Alerts</Label>
                                    <p className="text-sm text-muted-foreground">Receive important notifications via email.</p>
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
                                <Label htmlFor="cost-threshold">Cost Alert Threshold ($)</Label>
                                <Input
                                    id="cost-threshold"
                                    type="number"
                                    value={notifications.costAlertThreshold}
                                    onChange={(e) => setNotifications({
                                        ...notifications,
                                        costAlertThreshold: parseFloat(e.target.value) || 0
                                    })}
                                    placeholder="100.00"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Get notified when your spending exceeds this amount.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="webhook-url">Webhook URL</Label>
                                <Input
                                    id="webhook-url"
                                    type="url"
                                    value={notifications.webhookUrl || ''}
                                    onChange={(e) => setNotifications({...notifications, webhookUrl: e.target.value})}
                                    placeholder="https://your-domain.com/webhook"
                                />
                                <p className="text-xs text-muted-foreground">
                                    POST requests with alert payloads will be sent to this URL.
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
                                Manage your plan and payment settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-start space-x-4 rounded-lg border bg-background p-4">
                                <DollarSign className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground"/>
                                <div className="flex-grow">
                                    <p className="font-semibold text-foreground">Pay-As-You-Go Plan</p>
                                    <p className="text-sm text-muted-foreground">
                                        You are on a flexible plan and will be invoiced monthly based on your usage.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium">Next Invoice Date</p>
                                    <p className="text-sm text-gray-500">
                                        {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Billing Email</p>
                                    <p className="text-sm text-gray-500">{userSettings.email}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
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