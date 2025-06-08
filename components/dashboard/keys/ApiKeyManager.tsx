'use client';

import React, {useState, useEffect, useMemo, FC} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Switch} from '@/components/ui/switch';
import {Checkbox} from '@/components/ui/checkbox';
import {
    Copy,
    Trash2,
    AlertTriangle,
    Globe,
    Shield,
    Server,
    KeyRound,
    DollarSign,
    Tag,
    Timer,
    Pencil,
    Clock,
    Calendar,
    Network,
    Loader2
} from 'lucide-react';
import {toast} from 'sonner';
import {format, formatDistanceToNow} from 'date-fns';
import {ProjectPermission} from '@/lib/permissions';
import {Skeleton} from "@/components/ui/skeleton";

interface RateLimitConfig {
    requests: number;
    interval: 'second' | 'minute' | 'hour';
}

interface ApiKey {
    id: string;
    name: string;
    keyPrefix: string;
    active: boolean;
    created: string;
    expires?: string | null;
    lastUsed?: string | null;
    totalUsageLimit?: number | null;
    monthlyUsageLimit?: number | null;
    dailyUsageLimit?: number | null;
    maxCostPerRequest?: number | null;
    permissions?: string[] | null;
    ipWhitelist: string[];
    domainWhitelist: string[];
    models: string[];
    projectId?: string;
    project?: { id: string; name: string; };
    rateLimitConfig?: RateLimitConfig | null;
    metadata?: any;
}

interface ApiKeyWithSecret extends ApiKey {
    rawKey: string;
}

interface Project {
    id: string;
    name: string;
}

interface Model {
    id: string;
    name: string;
    provider: string;
    providerId: string;
}

interface PermissionScope {
    id: string;
    name: string;
    subPermissions: { id: string; name: string; }[];
}

interface GroupedModels {
    [providerId: string]: { providerName: string; models: Model[]; };
}

const initialFormData = {
    name: '',
    keyPrefix: '',
    projectId: null as string | null,
    expires: '',
    totalUsageLimit: '',
    monthlyUsageLimit: '',
    dailyUsageLimit: '',
    maxCostPerRequest: '',
    ipWhitelist: '',
    domainWhitelist: '',
    permissions: [] as string[],
    models: [] as string[],
    rateLimitRequests: '',
    rateLimitInterval: 'minute' as RateLimitConfig['interval'],
    metadata: '',
};

interface ApiKeyManagerProps {
    projectId?: string;
    can: (permission: ProjectPermission) => boolean;
}

const DetailItem: FC<{
    icon: React.ElementType;
    label: string;
    value?: string | number | null;
    children?: React.ReactNode;
}> = ({icon: Icon, label, value, children}) => {
    if ((value === null || value === undefined || value === '') && !children) return null;
    return (<div className="flex items-start space-x-2"><TooltipProvider><Tooltip><TooltipTrigger asChild><Icon
        className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0"/></TooltipTrigger><TooltipContent><p>{label}</p>
    </TooltipContent></Tooltip></TooltipProvider>
        <div><p className="text-sm text-gray-500">{label}</p>
            <div className="font-medium text-sm">{children || value}</div>
        </div>
    </div>);
};

const UsageProgressBar: FC<{
    current: number;
    limit: number | null
    type: 'daily' | 'monthly' | 'total';
    status?: string;
}> = ({current, limit, type, status}) => {
    if (limit === null) return null;

    const percentage = Math.min((current / limit) * 100, 100);
    const remaining = Math.max(limit - current, 0);
    const isExceeded = current >= limit;

    const colorClass = isExceeded
        ? 'bg-red-500'
        : percentage > 80
            ? 'bg-yellow-500'
            : 'bg-green-500';

    const bgClass = isExceeded
        ? 'bg-red-100 dark:bg-red-950'
        : percentage > 80
            ? 'bg-yellow-100 dark:bg-yellow-950'
            : 'bg-gray-100 dark:bg-gray-800';

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400 capitalize">{type} Usage</span>
                <div className="flex items-center gap-2">
                    {isExceeded && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <AlertTriangle className="w-4 h-4 text-red-500"/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Limit exceeded - Key is inactive</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    <span className={`font-medium ${isExceeded ? 'text-red-600' : ''}`}>
                        ${current.toFixed(2)} / ${limit.toFixed(2)}
                    </span>
                </div>
            </div>
            <div className={`w-full h-2 rounded-full ${bgClass} overflow-hidden`}>
                <div
                    className={`h-full ${colorClass} transition-all duration-300 ease-out`}
                    style={{width: `${percentage}%`}}
                />
            </div>
            <p className="text-xs text-gray-500">
                {isExceeded
                    ? `Exceeded by $${(current - limit).toFixed(2)}`
                    : `$${remaining.toFixed(2)} remaining`}
            </p>
        </div>
    );
};


const KeyStatusIndicator: FC<{
    usage?: any;
    active: boolean;
    expires?: string | null;
}> = ({usage, active, expires}) => {
    const isExpired = expires && new Date(expires) < new Date();
    const hasLimitExceeded = usage?.limitExceeded?.any;

    if (!active || isExpired || hasLimitExceeded) {
        return (
            <div
                className="flex items-center gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-4 h-4 text-red-500"/>
                <span className="text-sm text-red-700 dark:text-red-300">
                    {isExpired
                        ? 'Key Expired'
                        : hasLimitExceeded
                            ? `Limit Exceeded (${usage.limitExceeded.daily ? 'Daily' : usage.limitExceeded.monthly ? 'Monthly' : 'Total'})`
                            : 'Key Inactive'}
                </span>
            </div>
        );
    }

    return null;
};
export const ApiKeyManager: FC<ApiKeyManagerProps> = ({projectId, can}) => {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyWithSecret | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [availableModels, setAvailableModels] = useState<Model[]>([]);
    const [groupedModels, setGroupedModels] = useState<GroupedModels>({});
    const [availablePermissions, setAvailablePermissions] = useState<PermissionScope[]>([]);

    const [keyUsageData, setKeyUsageData] = useState<Record<string, any>>({});
    const [loadingUsage, setLoadingUsage] = useState<Record<string, boolean>>({});

    const fetchKeyUsage = async (keyId: string) => {
        setLoadingUsage(prev => ({...prev, [keyId]: true}));
        try {
            const res = await fetch(`/api/keys/${keyId}/usage`);
            if (!res.ok) throw new Error('Failed to fetch usage');
            const data = await res.json();
            setKeyUsageData(prev => ({...prev, [keyId]: data}));
        } catch (error) {
            console.error(`Failed to fetch usage for key ${keyId}:`, error);
        } finally {
            setLoadingUsage(prev => ({...prev, [keyId]: false}));
        }
    };

    useEffect(() => {
        if (can('api-keys:read')) {
            setLoading(true);
            Promise.all([fetchApiKeys(projectId), fetchProjects(), fetchConfig()])
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [projectId, can]);

    useEffect(() => {
        if (keys.length > 0 && !loading) {
            keys.forEach(key => {
                if (!keyUsageData[key.id]) {
                    fetchKeyUsage(key.id);
                }
            });
        }
    }, [keys, loading]);

    const fetchApiKeys = async (id?: string) => {
        const url = id ? `/api/projects/${id}/keys` : '/api/keys';
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to fetch API keys`);
            const keysData = await res.json();
            setKeys(keysData);
            keysData.forEach((key: ApiKey) => fetchKeyUsage(key.id));
        } catch (error: any) {
            toast.error(error.message);
            setKeys([]);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            if (res.ok) {
                const data = await res.json();
                setProjects([...data.owned, ...data.memberOf]);
            }
        } catch (error) {
        }
    };
    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/keys/config');
            if (!res.ok) throw new Error('Failed to fetch config');
            const data = await res.json();
            setAvailableModels(data.models);
            setAvailablePermissions(data.permissions);
            const grouped = (data.models as Model[]).reduce<GroupedModels>((acc, model) => {
                const {providerId, provider} = model;
                if (!acc[providerId]) acc[providerId] = {providerName: provider, models: []};
                acc[providerId].models.push(model);
                return acc;
            }, {});
            setGroupedModels(grouped);
        } catch (error: any) {
            toast.error(error.message);
        }
    };
    const handleFormChange = (field: keyof typeof initialFormData, value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    const permissionScopeState = useMemo(() => {
        const state: Record<string, boolean | 'indeterminate'> = {};
        availablePermissions.forEach(scope => {
            const allSubIds = [scope.id, ...scope.subPermissions.map(p => p.id)];
            const selectedCount = allSubIds.filter(id => formData.permissions.includes(id)).length;
            if (selectedCount === 0) state[scope.id] = false; else if (selectedCount === allSubIds.length) state[scope.id] = true; else state[scope.id] = 'indeterminate';
        });
        return state;
    }, [formData.permissions, availablePermissions]);
    const handleScopeSelectionChange = (scope: PermissionScope, checked: boolean) => {
        const allSubIds = [scope.id, ...scope.subPermissions.map(p => p.id)];
        const newPermissions = checked ? [...new Set([...formData.permissions, ...allSubIds])] : formData.permissions.filter(p => !allSubIds.includes(p));
        handleFormChange('permissions', newPermissions);
    };
    const providerSelectionState = useMemo(() => {
        const state: Record<string, boolean | 'indeterminate'> = {};
        for (const providerId in groupedModels) {
            const providerModels = groupedModels[providerId].models.map(m => m.id);
            const selectedCount = providerModels.filter(mId => formData.models.includes(mId)).length;
            if (selectedCount === 0) state[providerId] = false; else if (selectedCount === providerModels.length) state[providerId] = true; else state[providerId] = 'indeterminate';
        }
        return state;
    }, [formData.models, groupedModels]);
    const handleProviderSelectionChange = (providerId: string, checked: boolean) => {
        const providerModelIds = groupedModels[providerId].models.map(m => m.id);
        const newModels = checked ? [...new Set([...formData.models, ...providerModelIds])] : formData.models.filter(mId => !providerModelIds.includes(mId));
        handleFormChange('models', newModels);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const toastId = toast.loading(editingKey ? 'Updating key...' : 'Creating key...');
        const rateLimitConfig = formData.rateLimitRequests ? {
            requests: parseInt(formData.rateLimitRequests),
            interval: formData.rateLimitInterval
        } : null;
        const metadataTags = formData.metadata.split(',').map(t => t.trim()).filter(Boolean);
        const body = {
            name: formData.name,
            keyPrefix: formData.keyPrefix || undefined,
            projectId: formData.projectId,
            expires: formData.expires ? new Date(formData.expires).toISOString() : null,
            totalUsageLimit: formData.totalUsageLimit ? parseFloat(formData.totalUsageLimit) : null,
            monthlyUsageLimit: formData.monthlyUsageLimit ? parseFloat(formData.monthlyUsageLimit) : null,
            dailyUsageLimit: formData.dailyUsageLimit ? parseFloat(formData.dailyUsageLimit) : null,
            maxCostPerRequest: formData.maxCostPerRequest ? parseFloat(formData.maxCostPerRequest) : null,
            ipWhitelist: formData.ipWhitelist.split(',').map(i => i.trim()).filter(Boolean),
            domainWhitelist: formData.domainWhitelist.split(',').map(d => d.trim()).filter(Boolean),
            permissions: formData.permissions,
            models: formData.models,
            rateLimitConfig,
            metadata: metadataTags.length > 0 ? metadataTags : null,
        };
        const method = editingKey ? 'PUT' : 'POST';
        let url = editingKey ? `/api/keys/${editingKey.id}` : '/api/keys';
        if (!editingKey && projectId) {
            url = `/api/projects/${projectId}/keys`;
        }
        if (editingKey && editingKey.projectId) {
            url = `/api/projects/${editingKey.projectId}/keys/${editingKey.id}`;
        }
        try {
            const res = await fetch(url, {
                method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Save failed');
            setDialogOpen(false);
            if (editingKey) {
                setKeys(keys.map(k => k.id === result.id ? {
                    ...k, ...result,
                    project: projects.find(p => p.id === result.projectId)
                } : k));
                toast.success('Key updated successfully', {id: toastId});
            } else {
                setNewlyCreatedKey(result as ApiKeyWithSecret);
                await fetchApiKeys(projectId);
                toast.success('Key created successfully!', {id: toastId});
            }
        } catch (error: any) {
            toast.error(error.message, {id: toastId});
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (key: ApiKey) => {
        const toastId = toast.loading('Updating status...');
        try {
            const url = key.projectId ? `/api/projects/${key.projectId}/keys/${key.id}` : `/api/keys/${key.id}`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({active: !key.active})
            });
            if (!response.ok) throw new Error('Failed to update key status');
            const updatedKey = await response.json();
            setKeys(keys.map(k => k.id === key.id ? {...k, active: updatedKey.active} : k));
            toast.success(`Key ${updatedKey.active ? 'activated' : 'deactivated'}`, {id: toastId});
        } catch {
            toast.error('Failed to update key status', {id: toastId});
        }
    };
    const handleRevokeKey = async (key: ApiKey) => {
        const toastId = toast.loading('Revoking key...');
        try {
            const url = key.projectId ? `/api/projects/${key.projectId}/keys/${key.id}` : `/api/keys/${key.id}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({active: false}),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to revoke API key');
            setKeys(keys.filter((k) => k.id !== key.id));
            toast.success('API key revoked successfully', {id: toastId});
        } catch (error: any) {
            toast.error(error.message, {id: toastId});
        }
    };
    const copyToClipboard = (text: string, secret: boolean = false) => {
        navigator.clipboard.writeText(text);
        if (secret) toast.success('Secret key copied to clipboard!'); else toast.info('Copied to clipboard');
    };
    const openCreate = () => {
        setEditingKey(null);
        setFormData({...initialFormData, projectId: projectId || null});
        setDialogOpen(true);
    };
    const openEdit = (key: ApiKey) => {
        setEditingKey(key);
        setFormData({
            name: key.name,
            keyPrefix: key.keyPrefix,
            projectId: key.projectId ?? null,
            expires: key.expires ? format(new Date(key.expires), "yyyy-MM-dd'T'HH:mm") : '',
            totalUsageLimit: key.totalUsageLimit?.toString() ?? '',
            monthlyUsageLimit: key.monthlyUsageLimit?.toString() ?? '',
            dailyUsageLimit: key.dailyUsageLimit?.toString() ?? '',
            maxCostPerRequest: key.maxCostPerRequest?.toString() ?? '',
            ipWhitelist: (key.ipWhitelist || []).join(', '),
            domainWhitelist: (key.domainWhitelist || []).join(', '),
            permissions: key.permissions ?? [],
            models: key.models ?? [],
            rateLimitRequests: key.rateLimitConfig?.requests.toString() ?? '',
            rateLimitInterval: key.rateLimitConfig?.interval ?? 'minute',
            metadata: Array.isArray(key.metadata) ? key.metadata.join(', ') : '',
        });
        setDialogOpen(true);
    };
    const formatDate = (dateString?: string | null) => !dateString ? 'N/A' : format(new Date(dateString), 'MMM d, yyyy');
    const formatRelativeDate = (dateString?: string | null) => !dateString ? 'never' : formatDistanceToNow(new Date(dateString), {addSuffix: true});

    if (!can('api-keys:read')) {
        return (<Card> <CardHeader><CardTitle>Permission Denied</CardTitle></CardHeader> <CardContent><p>You do not have
            permission to view or manage API keys for this project.</p></CardContent> </Card>);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold">API Keys</h1><p
                    className="mt-1 text-sm text-gray-600">{projectId ? `Manage API keys for this project.` : `Manage your personal and project API keys.`}</p>
                </div>
                {can('api-keys:create') && (
                    <Button onClick={openCreate}><KeyRound className="w-4 h-4 mr-2"/>Create New Key</Button>)}
            </div>
            <div className="grid gap-6">
                {loading ? Array.from({length: 2}).map((_, i) => <Card key={i}><CardHeader
                        className="border-b pb-4"><Skeleton className="h-6 w-1/3"/></CardHeader><CardContent
                        className="pt-6"><Skeleton className="h-24 w-full"/></CardContent></Card>) :
                    keys.map((key) => (
                        <Card key={key.id}>
                            <CardHeader className="flex flex-row justify-between items-start pb-4 border-b">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">{key.name}
                                        <Badge
                                            variant={key.active ? 'success' : 'destructive'}>{key.active ? 'Active' : 'Inactive'}</Badge></CardTitle>
                                    <div className="flex items-center space-x-2 mt-2"><Input readOnly
                                                                                             value={`${key.keyPrefix}••••••••••••••••••••••••`}
                                                                                             className="font-mono bg-gray-100 dark:bg-gray-800 h-8 w-auto"/><Button
                                        size="icon" variant="ghost" className="h-8 w-8"
                                        onClick={() => copyToClipboard(`${key.keyPrefix}... (prefix copied)`)}><Copy
                                        className="w-4 h-4"/></Button></div>
                                </div>
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                    {can('api-keys:update') &&
                                        <Switch id={`active-switch-${key.id}`} checked={key.active}
                                                onCheckedChange={() => handleToggleActive(key)}/>}
                                    {can('api-keys:update') &&
                                        <Button variant="outline" size="sm" onClick={() => openEdit(key)}><Pencil
                                            className="h-4 w-4 mr-0 md:mr-2"/> <span
                                            className="hidden md:inline">Edit</span></Button>}
                                    {can('api-keys:revoke') && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon" className="h-9 w-9"><Trash2
                                                    className="h-4 w-4"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Revoke API Key
                                                    "{key.name}"?</AlertDialogTitle><AlertDialogDescription>This action
                                                    is irreversible. The API key will be permanently
                                                    deleted.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction
                                                    onClick={() => handleRevokeKey(key)}
                                                    className="bg-red-600 hover:bg-red-700">Yes, Revoke
                                                    Key</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-4">
                                    <DetailItem icon={Calendar} label="Created" value={formatDate(key.created)}/>
                                    <DetailItem icon={Clock} label="Last Used"
                                                value={formatRelativeDate(key.lastUsed)}/>
                                    <DetailItem icon={Calendar} label="Expires"
                                                value={key.expires ? formatDate(key.expires) : 'Never'}/>
                                    {key.projectId &&
                                        <DetailItem icon={Server} label="Project" value={key.project?.name}/>}
                                    {key.rateLimitConfig && <DetailItem icon={Timer} label="Rate Limit"
                                                                        value={`${key.rateLimitConfig.requests} / ${key.rateLimitConfig.interval}`}/>}
                                    {key.monthlyUsageLimit != null &&
                                        <DetailItem icon={DollarSign} label="Monthly Limit"
                                                    value={`$${key.monthlyUsageLimit.toLocaleString()}`}/>}
                                    {key.dailyUsageLimit != null && <DetailItem icon={DollarSign} label="Daily Limit"
                                                                                value={`$${key.dailyUsageLimit.toLocaleString()}`}/>}
                                    {key.totalUsageLimit != null && <DetailItem icon={DollarSign} label="Total Limit"
                                                                                value={`$${key.totalUsageLimit.toLocaleString()}`}/>}
                                    {key.maxCostPerRequest != null &&
                                        <DetailItem icon={DollarSign} label="Max Cost/Request"
                                                    value={`$${key.maxCostPerRequest.toFixed(2)}`}/>}
                                    {key.ipWhitelist && key.ipWhitelist.length > 0 &&
                                        <DetailItem icon={Network} label="IP Whitelist">{key.ipWhitelist.map(ip =>
                                            <Badge key={ip} variant="outline"
                                                   className="mr-1 mb-1">{ip}</Badge>)}</DetailItem>}
                                    {key.domainWhitelist && key.domainWhitelist.length > 0 &&
                                        <DetailItem icon={Globe} label="Domain Whitelist">{key.domainWhitelist.map(d =>
                                            <Badge key={d} variant="outline"
                                                   className="mr-1 mb-1">{d}</Badge>)}</DetailItem>}
                                    {key.metadata && Array.isArray(key.metadata) && key.metadata.length > 0 &&
                                        <DetailItem icon={Tag} label="Tags">{key.metadata.map(tag => <Badge key={tag}
                                                                                                            variant="secondary"
                                                                                                            className="mr-1 mb-1">{tag}</Badge>)}</DetailItem>}
                                </div>
                                <div className="space-y-2">
                                    {key.permissions && key.permissions.length > 0 && (
                                        <div><h4 className="text-sm font-semibold mb-1">Permissions</h4>
                                            <div className="flex flex-wrap gap-1">{key.permissions.map(p => <Badge
                                                key={p} variant="secondary"><Shield className="w-3 h-3 mr-1.5"/>{p}
                                            </Badge>)}</div>
                                        </div>)}
                                    {key.models && key.models.length > 0 && (
                                        <div><h4 className="text-sm font-semibold mb-1">Allowed Models</h4>
                                            <div className="flex flex-wrap gap-1">{key.models.map(m => <Badge key={m}
                                                                                                              variant="outline">{availableModels.find(am => am.id === m)?.name || m}</Badge>)}</div>
                                        </div>)}
                                </div>
                                {keyUsageData[key.id] && (
                                    <div className="mt-4 pt-4 border-t space-y-3">
                                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4"/>
                                            Usage Limits
                                            {loadingUsage[key.id] && <Loader2 className="w-3 h-3 animate-spin"/>}
                                        </h4>

                                        <KeyStatusIndicator
                                            usage={keyUsageData[key.id]}
                                            active={key.active}
                                            expires={key.expires}
                                        />

                                        <div className="space-y-3">
                                            {key.dailyUsageLimit !== null && (
                                                <UsageProgressBar
                                                    current={keyUsageData[key.id].usage.daily ?? 0}
                                                    limit={key.dailyUsageLimit||null}
                                                    type="daily"
                                                    status={keyUsageData[key.id].status}
                                                />
                                            )}
                                            {key.monthlyUsageLimit !== null && (
                                                <UsageProgressBar
                                                    current={keyUsageData[key.id].usage.total ?? 0}
                                                    limit={key.totalUsageLimit||null}
                                                    type="total"
                                                    status={keyUsageData[key.id].status}
                                                />
                                            )}
                                            {key.totalUsageLimit !== null && (
                                                <UsageProgressBar
                                                    current={keyUsageData[key.id].usage.total}
                                                    limit={key.totalUsageLimit||null}
                                                    type="total"
                                                    status={keyUsageData[key.id].status}
                                                />
                                            )}
                                        </div>

                                        {keyUsageData[key.id].limitExceeded.any && (
                                            <div className="text-xs text-gray-500 mt-2">
                                                {keyUsageData[key.id].limitExceeded.daily && (
                                                    <p>Daily limit resets at midnight</p>
                                                )}
                                                {keyUsageData[key.id].limitExceeded.monthly && (
                                                    <p>Monthly limit resets on the 1st</p>
                                                )}
                                                {keyUsageData[key.id].limitExceeded.total && (
                                                    <p>Total limit reached - increase limit to reactivate</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
            </div>

            {keys.length === 0 && !loading &&
                <Card className="text-center py-12"><CardContent><p className="text-gray-500 mb-4">No API keys have been
                    created yet.</p><Button onClick={openCreate}>Create Your First Key</Button></CardContent></Card>}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader><DialogTitle>{editingKey ? 'Edit API Key' : 'Create New API Key'}</DialogTitle><DialogDescription>Configure
                        the key's settings, limits, and permissions.</DialogDescription></DialogHeader>
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-5"><TabsTrigger value="general">General</TabsTrigger><TabsTrigger
                            value="limits">Limits</TabsTrigger><TabsTrigger
                            value="security">Security</TabsTrigger><TabsTrigger
                            value="permissions">Permissions</TabsTrigger><TabsTrigger
                            value="advanced">Advanced</TabsTrigger></TabsList>
                        <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                            <TabsContent value="general" className="mt-0 space-y-4">
                                <div><Label htmlFor="name">Key Name</Label><Input id="name" value={formData.name}
                                                                                  onChange={e => handleFormChange('name', e.target.value)}
                                                                                  placeholder="e.g., Production Backend Key"/>
                                </div>
                                {!editingKey && <div><Label htmlFor="keyPrefix">Custom Prefix (Optional)</Label><Input
                                    id="keyPrefix" value={formData.keyPrefix}
                                    onChange={e => handleFormChange('keyPrefix', e.target.value)}
                                    placeholder="e.g., myapp_"/><p className="text-sm text-gray-500 mt-1">If blank,
                                    defaults to "uai_".</p></div>}
                                <div><Label htmlFor="project">Project (Optional)</Label><Select
                                    value={formData.projectId ?? 'none'}
                                    onValueChange={v => handleFormChange('projectId', v === 'none' ? null : v)}
                                    disabled={!!projectId}><SelectTrigger><SelectValue
                                    placeholder="No project"/></SelectTrigger><SelectContent><SelectItem value="none">No
                                    Project</SelectItem>{projects.map(p => <SelectItem key={p.id}
                                                                                       value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent></Select></div>
                                <div><Label htmlFor="expires">Expiration Date (Optional)</Label><Input id="expires"
                                                                                                       type="datetime-local"
                                                                                                       value={formData.expires}
                                                                                                       onChange={e => handleFormChange('expires', e.target.value)}/>
                                </div>
                            </TabsContent>
                            <TabsContent value="limits" className="mt-0 space-y-4">
                                <p className="text-sm text-gray-500">Set spending limits to control costs. Leave blank
                                    for no limit.</p>
                                <div><Label htmlFor="monthlyUsageLimit">Monthly Limit ($)</Label><Input
                                    id="monthlyUsageLimit" type="number" value={formData.monthlyUsageLimit}
                                    onChange={e => handleFormChange('monthlyUsageLimit', e.target.value)}
                                    placeholder="e.g., 500"/></div>
                                <div><Label htmlFor="dailyUsageLimit">Daily Limit ($)</Label><Input id="dailyUsageLimit"
                                                                                                    type="number"
                                                                                                    value={formData.dailyUsageLimit}
                                                                                                    onChange={e => handleFormChange('dailyUsageLimit', e.target.value)}
                                                                                                    placeholder="e.g., 50"/>
                                </div>
                                <div><Label htmlFor="totalUsageLimit">Total Usage Limit ($)</Label><Input
                                    id="totalUsageLimit" type="number" value={formData.totalUsageLimit}
                                    onChange={e => handleFormChange('totalUsageLimit', e.target.value)}
                                    placeholder="e.g., 1000"/></div>
                                <div><Label htmlFor="maxCostPerRequest">Max Cost Per Request ($)</Label><Input
                                    id="maxCostPerRequest" type="number" value={formData.maxCostPerRequest}
                                    onChange={e => handleFormChange('maxCostPerRequest', e.target.value)}
                                    placeholder="e.g., 1.50"/></div>
                                <div><Label>Rate Limiting (Optional)</Label>
                                    <div className="flex items-center space-x-2"><Input type="number"
                                                                                        value={formData.rateLimitRequests}
                                                                                        onChange={e => handleFormChange('rateLimitRequests', e.target.value)}
                                                                                        placeholder="e.g., 100"/><Select
                                        value={formData.rateLimitInterval}
                                        onValueChange={v => handleFormChange('rateLimitInterval', v as RateLimitConfig['interval'])}><SelectTrigger
                                        className="w-[120px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem
                                        value="second">/ second</SelectItem><SelectItem value="minute">/
                                        minute</SelectItem><SelectItem value="hour">/ hour</SelectItem></SelectContent></Select>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="security" className="mt-0 space-y-4">
                                <div><Label htmlFor="ipWhitelist">IP Whitelist (comma-separated)</Label><Input
                                    id="ipWhitelist" value={formData.ipWhitelist}
                                    onChange={e => handleFormChange('ipWhitelist', e.target.value)}
                                    placeholder="1.1.1.1, 2.2.2.2/24"/><p className="text-sm text-gray-500 mt-1">Leave
                                    empty to allow all IPs. CIDR notation is supported.</p></div>
                                <div><Label htmlFor="domainWhitelist">Domain Whitelist (comma-separated)</Label><Input
                                    id="domainWhitelist" value={formData.domainWhitelist}
                                    onChange={e => handleFormChange('domainWhitelist', e.target.value)}
                                    placeholder="example.com, api.example.com"/><p
                                    className="text-sm text-gray-500 mt-1">For client-side usage, restricts requests to
                                    these domains. Leave empty to allow all.</p></div>
                            </TabsContent>
                            <TabsContent value="permissions" className="mt-0 space-y-4">
                                <div><Label>Permissions</Label><p className="text-sm text-gray-500 mb-2">Select the
                                    scopes this key will have access to.</p>
                                    <div
                                        className="space-y-4 border rounded-md p-4">{availablePermissions.map(scope => (
                                        <div key={scope.id}>
                                            <div className="flex items-center space-x-3"><Checkbox
                                                id={`scope-${scope.id}`} checked={permissionScopeState[scope.id]}
                                                onCheckedChange={(c) => handleScopeSelectionChange(scope, c === true)}/><Label
                                                htmlFor={`scope-${scope.id}`}
                                                className="font-semibold">{scope.name}</Label></div>
                                            <div className="pl-8 pt-2 space-y-2">{scope.subPermissions.map(sub => (
                                                <div key={sub.id} className="flex items-center space-x-3"><Checkbox
                                                    id={sub.id} checked={formData.permissions.includes(sub.id)}
                                                    onCheckedChange={(c) => {
                                                        const newPerms = c === true ? [...formData.permissions, sub.id] : formData.permissions.filter(p => p !== sub.id);
                                                        handleFormChange('permissions', newPerms);
                                                    }}/><Label htmlFor={sub.id}
                                                               className="font-normal text-gray-600 dark:text-gray-400">{sub.id}</Label><span
                                                    className="text-sm text-gray-500">{sub.name}</span></div>))}</div>
                                        </div>))}</div>
                                </div>
                                <div><Label>Model Access</Label><p className="text-sm text-gray-500 mb-2">Restrict this
                                    key to specific models. Leave all unchecked to allow all models.</p>
                                    <div
                                        className="space-y-4 border rounded-md p-4 max-h-60 overflow-y-auto">{Object.entries(groupedModels).map(([providerId, data]) => (
                                        <div key={providerId}>
                                            <div className="flex items-center space-x-3"><Checkbox
                                                id={`provider-${providerId}`}
                                                checked={providerSelectionState[providerId]}
                                                onCheckedChange={(c) => handleProviderSelectionChange(providerId, c === true)}/><Label
                                                htmlFor={`provider-${providerId}`}
                                                className="font-semibold">{data.providerName}</Label></div>
                                            <div className="pl-8 pt-2 space-y-2">{data.models.map(model => (
                                                <div key={model.id} className="flex items-center space-x-3"><Checkbox
                                                    id={model.id} checked={formData.models.includes(model.id)}
                                                    onCheckedChange={(c) => {
                                                        const newModels = c === true ? [...formData.models, model.id] : formData.models.filter(m => m !== model.id);
                                                        handleFormChange('models', newModels);
                                                    }}/><Label htmlFor={model.id}
                                                               className="font-normal">{model.name}</Label>
                                                </div>))}</div>
                                        </div>))}</div>
                                </div>
                            </TabsContent>
                            <TabsContent value="advanced" className="mt-0 space-y-4">
                                <div><Label htmlFor="metadata">Tags (comma-separated)</Label><p
                                    className="text-sm text-gray-500 mb-2">Attach simple text tags to this key for
                                    organization.</p><Input id="metadata"
                                                            placeholder="e.g., backend, analytics, staging"
                                                            value={formData.metadata}
                                                            onChange={e => handleFormChange('metadata', e.target.value)}/>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}
                                disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name}>{isSubmitting ?
                            <Loader2
                                className="w-4 h-4 mr-2 animate-spin"/> : null}{editingKey ? 'Save Changes' : 'Create Key'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!newlyCreatedKey} onOpenChange={() => setNewlyCreatedKey(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-xl">API Key Created Successfully!</DialogTitle>
                        <DialogDescription>
                            <div
                                className="py-2 px-3 mt-2 bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200">
                                <AlertTriangle className="inline-block w-5 h-5 mr-2"/>Please copy your new API key now.
                                You will not be able to see it again.
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 pt-2">
                        <Label>New API Key</Label>
                        <div className="flex items-center space-x-2"><Input readOnly value={newlyCreatedKey?.rawKey}
                                                                            className="font-mono"/><Button
                            variant="outline" size="icon"
                            onClick={() => copyToClipboard(newlyCreatedKey?.rawKey ?? '', true)}><Copy
                            className="w-4 h-4"/></Button></div>
                    </div>
                    <DialogFooter><Button onClick={() => setNewlyCreatedKey(null)}>I have copied my
                        key</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};