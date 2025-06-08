'use client';

import { useState, useEffect} from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
    Shield,
    Zap,
    DollarSign,
    Settings,
    PlusCircle,
    Trash2,
    BarChart3,
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    TrendingUp,
    Loader2,
    Info,
    ChevronRight,
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface FallbackChain {
    id: string;
    name: string;
    description?: string;
    type: 'standard' | 'cost_optimized' | 'high_availability' | 'performance';
    triggers: {
        onHttpError?: { enabled: boolean; codes?: number[] };
        onProviderError?: { enabled: boolean; errorTypes?: string[] };
        onLatency?: { enabled: boolean; thresholdMs?: number };
        onCost?: { enabled: boolean; thresholdUSD?: number };
    };
    steps: Array<{
        modelId: string;
        modelInfo?: {
            name: string;
            provider: { name: string; providerId: string };
        };
        conditions?: {
            skipIf?: string;
            onlyIf?: string;
        };
        timeout?: number;
        maxRetries?: number;
    }>;
    active: boolean;
    priority: number;
    executionCount: number;
    successCount: number;
    avgSavings?: number;
    lastExecuted?: string;
    stats?: {
        totalExecutions: number;
        successRate: string;
        avgSavings: string;
    };
}

interface Template {
    name: string;
    description: string;
    type: string;
    triggers: any;
    steps: any[];
}

interface Analytics {
    overview: {
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        successRate: string;
        totalCostSaved: number;
        avgLatency: number;
    };
    triggerBreakdown: Record<string, number>;
    modelUsage: Record<string, number>;
    dailyStats: Array<{
        date: string;
        executions: number;
        successes: number;
        costSaved: number;
    }>;
    topChains: Array<{
        name: string;
        executions: number;
        successes: number;
        totalSaved: number;
        successRate: string;
    }>;
}

const TRIGGER_TYPES = {
    onHttpError: {
        label: 'HTTP Errors',
        icon: AlertTriangle,
        description: 'Activate on specific HTTP error codes',
        color: 'text-red-500'
    },
    onProviderError: {
        label: 'Provider Errors',
        icon: AlertTriangle,
        description: 'Activate on provider-specific errors',
        color: 'text-orange-500'
    },
    onLatency: {
        label: 'High Latency',
        icon: Clock,
        description: 'Activate when response time exceeds threshold',
        color: 'text-yellow-500'
    },
    onCost: {
        label: 'Cost Threshold',
        icon: DollarSign,
        description: 'Activate when estimated cost exceeds limit',
        color: 'text-green-500'
    }
};

const CHAIN_TYPE_CONFIG = {
    standard: { icon: Shield, color: 'bg-gray-500' },
    high_availability: { icon: Activity, color: 'bg-blue-500' },
    cost_optimized: { icon: DollarSign, color: 'bg-green-500' },
    performance: { icon: Zap, color: 'bg-yellow-500' }
};

export default function FallbackChainsPage() {
    const [chains, setChains] = useState<FallbackChain[]>([]);
    const [templates, setTemplates] = useState<Record<string, Template>>({});
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [models, setModels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [analyticsOpen, setAnalyticsOpen] = useState(false);
    const [selectedChain, setSelectedChain] = useState<FallbackChain | null>(null);

    const [formData, setFormData] = useState<{
        name: string;
        description: string;
        type: 'standard' | 'cost_optimized' | 'high_availability' | 'performance';
        triggers: {
            onHttpError: { enabled: boolean; codes: number[] };
            onProviderError: { enabled: boolean; errorTypes: string[] };
            onLatency: { enabled: boolean; thresholdMs: number };
            onCost: { enabled: boolean; thresholdUSD: number };
        };
        steps: any[];
        active: boolean;
        priority: number;
    }>({
        name: '',
        description: '',
        type: 'standard',
        triggers: {
            onHttpError: { enabled: false, codes: [429, 500, 503] },
            onProviderError: { enabled: false, errorTypes: [] },
            onLatency: { enabled: false, thresholdMs: 5000 },
            onCost: { enabled: false, thresholdUSD: 1.0 }
        },
        steps: [],
        active: true,
        priority: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [chainsRes, templatesRes, modelsRes, analyticsRes] = await Promise.all([
                fetch('/api/fallback-chains?includeStats=true'),
                fetch('/api/fallback-chains/templates'),
                fetch('/api/models'),
                fetch('/api/fallback-chains/analytics?period=30d')
            ]);

            if (chainsRes.ok) {
                const chainsData = await chainsRes.json();
                setChains(chainsData);
            }

            if (templatesRes.ok) {
                const templatesData = await templatesRes.json();
                setTemplates(templatesData);
            }

            if (modelsRes.ok) {
                const modelsData = await modelsRes.json();
                const flatModels = modelsData.flatMap((provider: any) =>
                    provider.models.map((model: any) => ({
                        ...model,
                        providerName: provider.name
                    }))
                );
                setModels(flatModels);
            }

            if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json();
                setAnalytics(analyticsData);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };


    const handleCreateFromTemplate = (templateKey: string) => {
        const template = templates[templateKey];
        if (!template) return;

        setFormData({
            name: template.name,
            description: template.description,
            type: template.type as any,
            triggers: template.triggers,
            steps: template.steps,
            active: true,
            priority: 0
        });
        setSelectedChain(null);
        setDialogOpen(true);
    };

    const handleEdit = (chain: FallbackChain) => {
        setFormData({
            name: chain.name,
            description: chain.description || '',
            type: chain.type,
            triggers: {
                onHttpError: {
                    enabled: chain.triggers.onHttpError?.enabled || false,
                    codes: chain.triggers.onHttpError?.codes || [429, 500, 503]
                },
                onProviderError: {
                    enabled: chain.triggers.onProviderError?.enabled || false,
                    errorTypes: chain.triggers.onProviderError?.errorTypes || []
                },
                onLatency: {
                    enabled: chain.triggers.onLatency?.enabled || false,
                    thresholdMs: chain.triggers.onLatency?.thresholdMs || 5000
                },
                onCost: {
                    enabled: chain.triggers.onCost?.enabled || false,
                    thresholdUSD: chain.triggers.onCost?.thresholdUSD || 1.0
                }
            },
            steps: chain.steps,
            active: chain.active,
            priority: chain.priority
        });
        setSelectedChain(chain);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const url = selectedChain
                ? `/api/fallback-chains/${selectedChain.id}`
                : '/api/fallback-chains';

            const method = selectedChain ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save');
            }

            toast.success(selectedChain ? 'Chain updated' : 'Chain created');
            setDialogOpen(false);
            loadData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (chainId: string) => {
        if (!confirm('Are you sure you want to delete this fallback chain?')) return;

        try {
            const response = await fetch(`/api/fallback-chains/${chainId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete');

            toast.success('Chain deleted');
            loadData();
        } catch (error) {
            toast.error('Failed to delete chain');
        }
    };

    const addStep = () => {
        if (models.length === 0) {
            toast.error('No models available');
            return;
        }

        setFormData({
            ...formData,
            steps: [
                ...formData.steps,
                {
                    modelId: models[0].id,
                    timeout: 10000,
                    maxRetries: 1,
                    conditions: {}
                }
            ]
        });
    };

    const removeStep = (index: number) => {
        setFormData({
            ...formData,
            steps: formData.steps.filter((_, i) => i !== index)
        });
    };

    const updateStep = (index: number, updates: any) => {
        const newSteps = [...formData.steps];
        newSteps[index] = { ...newSteps[index], ...updates };
        setFormData({ ...formData, steps: newSteps });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[600px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Fallback Chains</h1>
                    <p className="mt-2 text-gray-600">
                        Configure intelligent fallback strategies for maximum reliability and cost efficiency
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setAnalyticsOpen(true)}
                        className="flex items-center gap-2"
                    >
                        <BarChart3 className="h-4 w-4" />
                        Analytics
                    </Button>
                    <Button
                        onClick={() => {
                            setFormData({
                                name: '',
                                description: '',
                                type: 'standard',
                                triggers: {
                                    onHttpError: { enabled: false, codes: [429, 500, 503] },
                                    onProviderError: { enabled: false, errorTypes: [] },
                                    onLatency: { enabled: false, thresholdMs: 5000 },
                                    onCost: { enabled: false, thresholdUSD: 1.0 }
                                },
                                steps: [],
                                active: true,
                                priority: 0
                            });
                            setSelectedChain(null);
                            setDialogOpen(true);
                        }}
                        className="flex items-center gap-2"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Create Chain
                    </Button>
                </div>
            </div>

            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Total Executions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{analytics.overview.totalExecutions}</p>
                            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Success Rate
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-green-600">
                                {analytics.overview.successRate}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {analytics.overview.successfulExecutions} successful
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Cost Saved
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-blue-600">
                                ${analytics.overview.totalCostSaved.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Through fallbacks</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Avg Latency
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold">{analytics.overview.avgLatency}ms</p>
                            <p className="text-xs text-gray-500 mt-1">Including fallbacks</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {Object.keys(templates).length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">Quick Start Templates</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(templates).map(([key, template]) => {
                            const config = CHAIN_TYPE_CONFIG[template.type as keyof typeof CHAIN_TYPE_CONFIG];
                            const Icon = config?.icon || Shield;

                            return (
                                <div
                                    key={key}
                                    className="cursor-pointer hover:shadow-lg transition-shadow"
                                    onClick={() => handleCreateFromTemplate(key)}
                                >
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div className={`p-2 rounded-lg ${config?.color || 'bg-gray-500'} bg-opacity-10`}>
                                                <Icon className={`h-6 w-6 ${config?.color.replace('bg-', 'text-')}`} />
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <CardTitle className="mt-4">{template.name}</CardTitle>
                                        <CardDescription>{template.description}</CardDescription>
                                    </CardHeader>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-lg font-semibold mb-4">Your Fallback Chains</h2>
                {chains.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">No fallback chains created yet</p>
                            <Button onClick={() => setDialogOpen(true)}>
                                Create Your First Chain
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {chains.map((chain) => {
                            const config = CHAIN_TYPE_CONFIG[chain.type];
                            const Icon = config?.icon || Shield;

                            return (
                                <Card key={chain.id} className="overflow-hidden">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${config?.color || 'bg-gray-500'} bg-opacity-10`}>
                                                    <Icon className={`h-5 w-5 ${config?.color.replace('bg-', 'text-')}`} />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">{chain.name}</CardTitle>
                                                    <CardDescription className="text-xs mt-1">
                                                        {chain.description || 'No description'}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <Badge variant={chain.active ? 'success' : 'secondary'}>
                                                {chain.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium mb-2">Active Triggers</p>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(chain.triggers).map(([key, config]) => {
                                                    if (!config.enabled) return null;
                                                    const triggerConfig = TRIGGER_TYPES[key as keyof typeof TRIGGER_TYPES];
                                                    const TriggerIcon = triggerConfig?.icon || AlertTriangle;

                                                    return (
                                                        <TooltipProvider key={key}>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <Badge variant="outline" className="flex items-center gap-1">
                                                                        <TriggerIcon className={`h-3 w-3 ${triggerConfig?.color}`} />
                                                                        {triggerConfig?.label}
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>{triggerConfig?.description}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium mb-2">
                                                Fallback Sequence ({chain.steps.length} steps)
                                            </p>
                                            <div className="space-y-1">
                                                {chain.steps.map((step, index) => (
                                                    <div key={index} className="flex items-center gap-2 text-sm">
                                                        <span className="text-gray-500">{index + 1}.</span>
                                                        <span className="font-medium">
                              {step.modelInfo?.name || step.modelId}
                            </span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {step.modelInfo?.provider.name || 'Unknown'}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {chain.stats && (
                                            <div className="flex items-center justify-between pt-2 border-t">
                                                <div className="flex items-center gap-4 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Activity className="h-4 w-4 text-gray-400" />
                                                        <span>{chain.stats.totalExecutions} runs</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                        <span>{chain.stats.successRate}</span>
                                                    </div>
                                                    {chain.stats.avgSavings !== 'N/A' && (
                                                        <div className="flex items-center gap-1">
                                                            <TrendingUp className="h-4 w-4 text-blue-500" />
                                                            <span>{chain.stats.avgSavings} avg saved</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>

                                    <CardFooter className="bg-gray-50 flex justify-between">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(chain)}
                                            className="flex items-center gap-1"
                                        >
                                            <Settings className="h-4 w-4" />
                                            Configure
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(chain.id)}
                                            className="text-red-600 hover:text-red-700 flex items-center gap-1"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedChain ? 'Edit Fallback Chain' : 'Create Fallback Chain'}
                        </DialogTitle>
                        <DialogDescription>
                            Configure triggers and fallback sequence for intelligent request handling
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="basic" className="mt-6">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="triggers">Triggers</TabsTrigger>
                            <TabsTrigger value="steps">Fallback Steps</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4 mt-4">
                            <div>
                                <Label htmlFor="name">Chain Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., High Availability Fallback"
                                />
                            </div>

                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe the purpose of this fallback chain..."
                                    rows={3}
                                />
                            </div>

                            <div>
                                <Label htmlFor="type">Chain Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="standard">Standard</SelectItem>
                                        <SelectItem value="high_availability">High Availability</SelectItem>
                                        <SelectItem value="cost_optimized">Cost Optimized</SelectItem>
                                        <SelectItem value="performance">Performance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="active">Active Status</Label>
                                    <p className="text-sm text-gray-500">
                                        Enable or disable this fallback chain
                                    </p>
                                </div>
                                <Switch
                                    id="active"
                                    checked={formData.active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="priority">Priority</Label>
                                <div className="flex items-center gap-4">
                                    <Slider
                                        id="priority"
                                        min={0}
                                        max={10}
                                        step={1}
                                        value={[formData.priority]}
                                        onValueChange={([value]) => setFormData({ ...formData, priority: value })}
                                        className="flex-1"
                                    />
                                    <span className="w-12 text-center font-medium">{formData.priority}</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    Higher priority chains are evaluated first
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="triggers" className="space-y-6 mt-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle className="h-5 w-5 text-red-500" />
                                            <div>
                                                <CardTitle className="text-base">HTTP Errors</CardTitle>
                                                <CardDescription className="text-sm">
                                                    Activate on specific HTTP error codes
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={formData.triggers.onHttpError.enabled}
                                            onCheckedChange={(checked) =>
                                                setFormData({
                                                    ...formData,
                                                    triggers: {
                                                        ...formData.triggers,
                                                        onHttpError: { ...formData.triggers.onHttpError, enabled: checked }
                                                    }
                                                })
                                            }
                                        />
                                    </div>
                                </CardHeader>
                                {formData.triggers.onHttpError.enabled && (
                                    <CardContent>
                                        <Label>Error Codes</Label>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {[429, 500, 502, 503, 504].map((code) => (
                                                <label key={code} className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.triggers.onHttpError.codes?.includes(code)}
                                                        onChange={(e) => {
                                                            const codes = e.target.checked
                                                                ? [...(formData.triggers.onHttpError.codes || []), code]
                                                                : formData.triggers.onHttpError.codes?.filter(c => c !== code) || [];
                                                            setFormData({
                                                                ...formData,
                                                                triggers: {
                                                                    ...formData.triggers,
                                                                    onHttpError: { ...formData.triggers.onHttpError, codes }
                                                                }
                                                            });
                                                        }}
                                                        className="rounded"
                                                    />
                                                    <span className="text-sm">{code}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Clock className="h-5 w-5 text-yellow-500" />
                                            <div>
                                                <CardTitle className="text-base">High Latency</CardTitle>
                                                <CardDescription className="text-sm">
                                                    Activate when response time exceeds threshold
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={formData.triggers.onLatency.enabled}
                                            onCheckedChange={(checked) =>
                                                setFormData({
                                                    ...formData,
                                                    triggers: {
                                                        ...formData.triggers,
                                                        onLatency: { ...formData.triggers.onLatency, enabled: checked }
                                                    }
                                                })
                                            }
                                        />
                                    </div>
                                </CardHeader>
                                {formData.triggers.onLatency.enabled && (
                                    <CardContent>
                                        <Label>Threshold (ms)</Label>
                                        <div className="flex items-center gap-4 mt-2">
                                            <Slider
                                                min={1000}
                                                max={10000}
                                                step={500}
                                                value={[formData.triggers.onLatency.thresholdMs || 5000]}
                                                onValueChange={([value]) =>
                                                    setFormData({
                                                        ...formData,
                                                        triggers: {
                                                            ...formData.triggers,
                                                            onLatency: { ...formData.triggers.onLatency, thresholdMs: value }
                                                        }
                                                    })
                                                }
                                                className="flex-1"
                                            />
                                            <span className="w-20 text-center font-medium">
                        {formData.triggers.onLatency.thresholdMs || 5000}ms
                      </span>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <DollarSign className="h-5 w-5 text-green-500" />
                                            <div>
                                                <CardTitle className="text-base">Cost Threshold</CardTitle>
                                                <CardDescription className="text-sm">
                                                    Activate when estimated cost exceeds limit
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={formData.triggers.onCost.enabled}
                                            onCheckedChange={(checked) =>
                                                setFormData({
                                                    ...formData,
                                                    triggers: {
                                                        ...formData.triggers,
                                                        onCost: { ...formData.triggers.onCost, enabled: checked }
                                                    }
                                                })
                                            }
                                        />
                                    </div>
                                </CardHeader>
                                {formData.triggers.onCost.enabled && (
                                    <CardContent>
                                        <Label>Max Cost per Request ($)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={formData.triggers.onCost.thresholdUSD || 1.0}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    triggers: {
                                                        ...formData.triggers,
                                                        onCost: {
                                                            ...formData.triggers.onCost,
                                                            thresholdUSD: parseFloat(e.target.value)
                                                        }
                                                    }
                                                })
                                            }
                                            className="mt-2"
                                        />
                                    </CardContent>
                                )}
                            </Card>
                        </TabsContent>

                        <TabsContent value="steps" className="space-y-4 mt-4">
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-sm text-gray-600">
                                    Define the sequence of models to try when triggers activate
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addStep}
                                    className="flex items-center gap-2"
                                >

                                    <PlusCircle className="h-4 w-4" />
                                    Add Step
                                </Button>
                            </div>

                            {formData.steps.length === 0 ? (
                                <Card className="text-center py-8">
                                    <CardContent>
                                        <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-600">
                                            No fallback steps configured yet. Add models to create your fallback sequence.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {formData.steps.map((step, index) => {
                                        const model = models.find(m => m.id === step.modelId);

                                        return (
                                            <Card key={index}>
                                                <CardHeader>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                              <span className="text-lg font-semibold text-gray-500">
                                {index + 1}
                              </span>
                                                            <div className="flex-1">
                                                                <Select
                                                                    value={step.modelId}
                                                                    onValueChange={(value) =>
                                                                        updateStep(index, { modelId: value })
                                                                    }
                                                                >
                                                                    <SelectTrigger className="w-full">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {models.map((model) => (
                                                                            <SelectItem key={model.id} value={model.id}>
                                                                                <div className="flex items-center justify-between w-full">
                                                                                    <span>{model.name}</span>
                                                                                    <Badge variant="outline" className="ml-2 text-xs">
                                                                                        {model.providerName}
                                                                                    </Badge>
                                                                                </div>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeStep(index)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label>Timeout (ms)</Label>
                                                            <Input
                                                                type="number"
                                                                min="1000"
                                                                max="60000"
                                                                step="1000"
                                                                value={step.timeout || 10000}
                                                                onChange={(e) =>
                                                                    updateStep(index, { timeout: parseInt(e.target.value) })
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label>Max Retries</Label>
                                                            <Select
                                                                value={String(step.maxRetries || 1)}
                                                                onValueChange={(value) =>
                                                                    updateStep(index, { maxRetries: parseInt(value) })
                                                                }
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="0">No retries</SelectItem>
                                                                    <SelectItem value="1">1 retry</SelectItem>
                                                                    <SelectItem value="2">2 retries</SelectItem>
                                                                    <SelectItem value="3">3 retries</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>

                                                    {model && (
                                                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                                            <div className="flex items-center gap-2">
                                                                <Info className="h-4 w-4" />
                                                                <span className="font-medium">Model Info:</span>
                                                            </div>
                                                            <div className="mt-1 space-y-1">
                                                                <p>Context: {model.contextWindow || 'N/A'}</p>
                                                                <p>Pricing: {model.pricing || 'Variable'}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!formData.name || formData.steps.length === 0}
                        >
                            {selectedChain ? 'Update Chain' : 'Create Chain'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Fallback Chain Analytics</DialogTitle>
                        <DialogDescription>
                            Performance metrics and insights for your fallback chains
                        </DialogDescription>
                    </DialogHeader>

                    {analytics && (
                        <div className="space-y-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Trigger Breakdown</CardTitle>
                                    <CardDescription>What&#39;s causing fallbacks to activate</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {Object.entries(analytics.triggerBreakdown).map(([trigger, count]) => {
                                            const total = analytics.overview.totalExecutions;
                                            const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;

                                            return (
                                                <div key={trigger} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                        <span className="font-medium">{trigger}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-32 bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="bg-orange-500 h-2 rounded-full"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm text-gray-600 w-16 text-right">
                              {count} ({percentage}%)
                            </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Fallback Model Usage</CardTitle>
                                    <CardDescription>Which models successfully handled fallback requests</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {Object.entries(analytics.modelUsage)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([modelId, count]) => {
                                                const model = models.find(m => m.id === modelId);
                                                const total = Object.values(analytics.modelUsage).reduce((sum, c) => sum + c, 0);
                                                const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;

                                                return (
                                                    <div key={modelId} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                            <span className="font-medium">
                                {model?.name || modelId}
                              </span>
                                                            {model && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {model.providerName}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-32 bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className="bg-green-500 h-2 rounded-full"
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm text-gray-600 w-16 text-right">
                                {count} ({percentage}%)
                              </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </CardContent>
                            </Card>

                            {analytics.topChains.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Top Performing Chains</CardTitle>
                                        <CardDescription>Chains saving the most costs through intelligent fallbacks</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {analytics.topChains.map((chain, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                                    <div>
                                                        <p className="font-medium">{chain.name}</p>
                                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                                            <span>{chain.executions} executions</span>
                                                            <span>{chain.successRate} success</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-green-600">
                                                            ${chain.totalSaved.toFixed(2)}
                                                        </p>
                                                        <p className="text-xs text-gray-500">saved</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}