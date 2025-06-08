'use client';

import {useState, useEffect, useCallback} from 'react';
import axios from 'axios';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {Progress} from '@/components/ui/progress';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';
import {
    Download,
    Filter,
    TrendingUp,
    TrendingDown,
    DollarSign,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw,
    BarChart3,
    Activity,
    Database,
    Rocket,
    ThumbsUp,
    FastForward,
    ChevronDown,
} from 'lucide-react';
import {format} from 'date-fns';
import {toast} from 'sonner';

import {cn} from '@/lib/utils';
import {motion, AnimatePresence} from 'framer-motion';


interface UsageRecord {
    id: string;
    timestamp: string;
    provider: string;
    model: string;
    tokensInput: number;
    tokensOutput: number;
    cost: number;
    markup: number;
    totalCost: number;
    requestId: string;
    success: boolean;
    latency: number;
    endpoint: string;
    cached: boolean;
    cacheHit: boolean;
    project?: {
        id: string;
        name: string;
    };
    apiKey?: {
        id: string;
        name: string;
    };
}
interface ProjectData {
    owned: Project[];
    memberOf: Project[];
}
interface UsageStats {
    totalRequests: number;
    totalCost: number;
    totalTokens: number;
    avgLatency: number;
    successRate: number;
    cacheHitRate: number;
    costTrend: number;
    tokensTrend: number;
    requestsTrend: number;
}

interface ModelUsage {
    model: string;
    provider: string;
    requests: number;
    tokens: number;
    cost: number;
    avgLatency: number;
    costPer1KT: number;
}

interface DailyUsageDataPoint {
    date: string;
    cost: number;
    tokensInput: number;
    tokensOutput: number;
    requests: number;
    avgLatency: number;
}

interface Project {
    id: string;
    name: string;
}

const CHART_COLORS = {
    openai: '#10b981',
    anthropic: '#ef4444',
    google: '#2563eb',
    azure: '#f59e0b',
    default: '#8b5cf6',
    input: '#2563eb',
    output: '#10b981',
    successful: '#10b981',
    failed: '#ef4444',
    requests: '#06b6d4',
    latency: '#f59e0b',
};


interface StatCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
    trendValue?: number | null;
    isCostOrLatencyTrend?: boolean;
    subText?: React.ReactNode;
}

const StatCard = ({
                      title,
                      value,
                      icon: Icon,
                      color,
                      trendValue,
                      isCostOrLatencyTrend = false,
                      subText
                  }: StatCardProps) => {
    const formatTrend = (val: number | undefined, isBadTrend: boolean) => {
        if (typeof val !== 'number' || isNaN(val) || val === null) {
            return <p className="text-sm text-gray-500">N/A</p>;
        }
        const isPositive = val >= 0;
        const isGoodTrend = isBadTrend ? !isPositive : isPositive;
        const colorClass = isGoodTrend ? 'text-green-500' : 'text-red-500';
        const TrendIcon = isGoodTrend ? TrendingUp : TrendingDown;

        return (
            <p className={`text-sm ${colorClass} flex items-center gap-1 mt-1 font-medium`}>
                <TrendIcon className="w-4 h-4"/>
                {val.toFixed(1)}% vs previous period
            </p>
        );
    };

    return (
        <motion.div
            variants={{hidden: {opacity: 0, y: 20}, visible: {opacity: 1, y: 0}}}
            className="relative overflow-hidden"
        >
            <Card
                className="p-6 h-full relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                <div
                    className={cn("absolute top-0 right-0 w-32 h-32 rounded-bl-full", `bg-gradient-to-br ${color}/10`)}/>
                <div className="relative flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                        <Icon
                            className={cn("w-6 h-6 flex-shrink-0", `text-[${color.split(' ')[0].replace('from-', '')}]`)}/>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    {trendValue !== undefined && trendValue !== null ? formatTrend(trendValue, isCostOrLatencyTrend) : (
                        subText && typeof subText === 'string' ? (
                            <p className="text-sm text-gray-600 mt-1">{subText}</p>
                        ) : (
                            <div className="mt-1">{subText}</div>
                        )
                    )}
                </div>
            </Card>
        </motion.div>
    );
};


export default function UsagePage() {
    const [usage, setUsage] = useState<UsageRecord[]>([]);
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [modelUsage, setModelUsage] = useState<ModelUsage[]>([]);
    const [dailyUsage, setDailyUsage] = useState<DailyUsageDataPoint[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const [dateRange, setDateRange] = useState('7');
    const [projectFilter, setProjectFilter] = useState('all');
    const [providerFilter, setProviderFilter] = useState('all');
    const [modelFilter, setModelFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (dateRange !== 'custom') {
                params.append('days', dateRange);
            } else if (startDate && endDate) {
                params.append('startDate', startDate);
                params.append('endDate', endDate);
            }
            if (projectFilter !== 'all') params.append('projectId', projectFilter);
            if (providerFilter !== 'all') params.append('provider', providerFilter);
            if (modelFilter !== 'all') params.append('model', modelFilter);

            const [
                usageRes,
                statsRes,
                modelRes,
                dailyRes,
                projectsRes
            ] = await Promise.all([
                axios.get<UsageRecord[]>(`/api/usage?${params.toString()}`),
                axios.get<UsageStats>(`/api/usage/stats?${params.toString()}`),
                axios.get<ModelUsage[]>(`/api/usage/models?${params.toString()}`),
                axios.get<DailyUsageDataPoint[]>(`/api/usage/daily?${params.toString()}`),
                axios.get<ProjectData>('/api/projects'),
            ]);

            setUsage(usageRes.data);
            setStats(statsRes.data);

            const modelsWithCostPer1KT = modelRes.data.map(model => ({
                ...model,
                costPer1KT: model.tokens > 0 ? (model.cost / model.tokens) * 1000 : 0,
            }));
            setModelUsage(modelsWithCostPer1KT);

            setDailyUsage(dailyRes.data);

            const allProjects = [...projectsRes.data.owned, ...projectsRes.data.memberOf];
            setProjects(allProjects);

        } catch (err) {
            console.error('Error fetching usage data:', err);
            setError('Failed to load usage data. Please try again.');
            toast.error('Failed to load usage data');
        } finally {
            setLoading(false);
        }
    }, [dateRange, projectFilter, providerFilter, modelFilter, startDate, endDate]);
    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAllData();
    };

    const exportUsage = async (formatType: 'csv' | 'json') => {
        try {
            const params = new URLSearchParams();
            params.append('format', formatType);
            if (dateRange !== 'custom') {
                params.append('days', dateRange);
            } else if (startDate && endDate) {
                params.append('startDate', startDate);
                params.append('endDate', endDate);
            }
            if (projectFilter !== 'all') params.append('projectId', projectFilter);
            if (providerFilter !== 'all') params.append('provider', providerFilter);
            if (modelFilter !== 'all') params.append('model', modelFilter);

            const response = await axios.get(`/api/usage/export?${params.toString()}`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `uni-ai-usage-export-${new Date().toISOString().split('T')[0]}.${formatType}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Usage data exported successfully as ${formatType.toUpperCase()}.`);
        } catch (err) {
            console.error('Failed to export usage data:', err);
            toast.error('Failed to export usage data. ' + (axios.isAxiosError(err) && err.response ? `${err.response.status} - ${err.response.statusText}` : 'Please check your network connection.'));
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
        if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
        if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
        return new Intl.NumberFormat('en-US').format(num);
    };

    const formatDateShort = (dateString: string) => {
        return format(new Date(dateString), 'MMM dd');
    };

    const formatDateTime = (dateString: string) => {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
    };

    const getProviderBadgeColor = (provider: string) => {
        switch (provider.toLowerCase()) {
            case 'openai':
                return 'bg-green-100 text-green-700 ring-green-600/20';
            case 'anthropic':
                return 'bg-orange-100 text-orange-700 ring-orange-600/20';
            case 'google':
                return 'bg-blue-100 text-blue-700 ring-blue-600/20';
            default:
                return 'bg-gray-100 text-gray-700 ring-gray-600/20';
        }
    };

    const getProviderRechartsColor = (provider: string) => {
        return (CHART_COLORS as any)[provider.toLowerCase()] || CHART_COLORS.default;
    };

    const costByProviderData = modelUsage.reduce((acc, curr) => {
        const existing = acc.find(item => item.provider === curr.provider);
        if (existing) {
            existing.cost += curr.cost;
        } else {
            acc.push({provider: curr.provider, cost: curr.cost});
        }
        return acc;
    }, [] as { provider: string; cost: number }[]);

    const requestStatusData = [
        {name: 'Successful', value: usage.filter(u => u.success).length, color: CHART_COLORS.successful},
        {name: 'Failed', value: usage.filter(u => !u.success).length, color: CHART_COLORS.failed},
    ];

    if (loading) {
        return (
            <div className="flex-1 p-6 lg:p-8 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 animate-pulse">
                    <div>
                        <div className="h-10 bg-gray-200 rounded w-64 mb-2"></div>
                        <div className="h-5 bg-gray-200 rounded w-96"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
                        <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
                        <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
                    </div>
                </div>

                <Card className="p-4 shadow-sm animate-pulse">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-24"></div>
                                <div className="h-10 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i}
                              className="p-6 h-full relative overflow-hidden shadow-sm animate-pulse min-h-[120px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-bl-full"/>
                            <div className="relative space-y-3">
                                <div className="h-5 bg-gray-200 rounded w-3/5"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="h-96 bg-gray-100 rounded-xl animate-pulse"></div>
            </div>
        );
    }

    if (error) {
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
            className="flex-1 p-6 lg:p-8 space-y-8"
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}
        >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div
                            className="w-12 h-12 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                            <BarChart3 className="w-7 h-7 text-white"/>
                        </div>
                        Usage Analytics
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Monitor your API usage, costs, and performance metrics across all models and projects.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{scale: 1.02}}
                        whileTap={{scale: 0.98}}
                        onClick={() => exportUsage('csv')}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4"/>
                        Export CSV
                    </motion.button>
                    <motion.button
                        whileHover={{scale: 1.02}}
                        whileTap={{scale: 0.98}}
                        onClick={() => exportUsage('json')}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4"/>
                        Export JSON
                    </motion.button>
                    <motion.button
                        whileHover={{scale: 1.02}}
                        whileTap={{scale: 0.98}}
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={cn(
                            "px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 flex items-center gap-2",
                            refreshing && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")}/>
                        Refresh Data
                    </motion.button>
                </div>
            </div>

            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: 0.1, duration: 0.5}}
            >
                <Card className="p-4 shadow-sm border border-gray-200">
                    <CardHeader className="pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-600"/>
                            Filter Usage Data
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowFilters(!showFilters)}
                            className="text-gray-500 hover:bg-gray-100"
                        >
                            <ChevronDown className={cn("w-5 h-5 transition-transform", showFilters && "rotate-180")}/>
                        </Button>
                    </CardHeader>
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{height: 0, opacity: 0}}
                                animate={{height: 'auto', opacity: 1}}
                                exit={{height: 0, opacity: 0}}
                                transition={{duration: 0.3, ease: 'easeInOut'}}
                                className="overflow-hidden"
                            >
                                <CardContent className="pt-4 border-t border-gray-200">
                                    <div
                                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                        <div>
                                            <Label htmlFor="dateRange"
                                                   className="text-sm font-medium text-gray-700 mb-2 block">Date
                                                Range</Label>
                                            <Select value={dateRange} onValueChange={setDateRange}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select date range"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">Last 24 hours</SelectItem>
                                                    <SelectItem value="7">Last 7 days</SelectItem>
                                                    <SelectItem value="30">Last 30 days</SelectItem>
                                                    <SelectItem value="90">Last 90 days</SelectItem>
                                                    <SelectItem value="custom">Custom Range</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {dateRange === 'custom' && (
                                            <>
                                                <div>
                                                    <Label htmlFor="startDate"
                                                           className="text-sm font-medium text-gray-700 mb-2 block">Start
                                                        Date</Label>
                                                    <Input
                                                        type="date"
                                                        id="startDate"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="focus-visible:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="endDate"
                                                           className="text-sm font-medium text-gray-700 mb-2 block">End
                                                        Date</Label>
                                                    <Input
                                                        type="date"
                                                        id="endDate"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        className="focus-visible:ring-blue-500"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <Label htmlFor="project"
                                                   className="text-sm font-medium text-gray-700 mb-2 block">Project</Label>
                                            <Select value={projectFilter} onValueChange={setProjectFilter}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="All projects"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Projects</SelectItem>
                                                    {projects.map((project) => (
                                                        <SelectItem key={project.id} value={project.id}>
                                                            {project.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label htmlFor="provider"
                                                   className="text-sm font-medium text-gray-700 mb-2 block">Provider</Label>
                                            <Select value={providerFilter} onValueChange={setProviderFilter}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="All providers"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Providers</SelectItem>
                                                    {Array.from(new Set(usage.map(u => u.provider))).map((p) => (
                                                        <SelectItem key={p} value={p}>
                                                            {p}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label htmlFor="model"
                                                   className="text-sm font-medium text-gray-700 mb-2 block">Model</Label>
                                            <Select value={modelFilter} onValueChange={setModelFilter}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="All models"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Models</SelectItem>
                                                    {Array.from(new Set(usage.map(u => u.model))).map((m) => (
                                                        <SelectItem key={m} value={m}>
                                                            {m}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </motion.div>

            {stats && (
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6" // Adjusted for 6 cards
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: {
                            transition: {
                                staggerChildren: 0.08,
                            },
                        },
                    }}
                >
                    <StatCard
                        title="Total Requests"
                        value={formatNumber(stats.totalRequests)}
                        icon={Activity}
                        color="from-blue-500 to-cyan-500"
                        trendValue={stats.requestsTrend}
                        isCostOrLatencyTrend={false}
                    />
                    <StatCard
                        title="Total Cost"
                        value={formatCurrency(stats.totalCost)}
                        icon={DollarSign}
                        color="from-green-500 to-emerald-500"
                        trendValue={stats.costTrend}
                        isCostOrLatencyTrend={true}
                    />
                    <StatCard
                        title="Total Tokens"
                        value={formatNumber(stats.totalTokens)}
                        icon={Database}
                        color="from-purple-500 to-pink-500"
                        trendValue={stats.tokensTrend}
                        isCostOrLatencyTrend={false}
                    />
                    <StatCard
                        title="Avg Latency"
                        value={`${stats.avgLatency.toFixed(0)}ms`}
                        icon={Rocket}
                        color="from-orange-500 to-amber-500"
                        trendValue={null}
                        subText="Average response time"
                    />
                    <StatCard
                        title="Success Rate"
                        value={`${stats.successRate.toFixed(1)}%`}
                        icon={ThumbsUp}
                        color="from-green-500 to-lime-500"
                        trendValue={null}
                        subText={<Progress
                            value={stats.successRate}
                            className="h-1 mt-1 bg-green-200
             [&>div]:bg-gradient-to-r [&>div]:from-green-500 [&>div]:to-lime-500"
                        />
                        }
                    />
                    <StatCard
                        title="Cache Hit Rate"
                        value={`${stats.cacheHitRate.toFixed(1)}%`}
                        icon={FastForward}
                        color="from-teal-500 to-blue-500"
                        trendValue={null}
                        subText={<Progress value={stats.cacheHitRate} className="h-1 mt-1 bg-blue-200"/>}
                    />
                </motion.div>
            )}

            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: 0.2, duration: 0.5}}
            >
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList
                        className="grid w-full lg:w-fit grid-cols-2 md:grid-cols-4 bg-gray-100 rounded-xl p-1 shadow-inner">
                        <TabsTrigger
                            value="overview"
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all duration-300 rounded-lg py-2"
                        >
                            Overview
                        </TabsTrigger>
                        <TabsTrigger
                            value="models"
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all duration-300 rounded-lg py-2"
                        >
                            Models
                        </TabsTrigger>
                        <TabsTrigger
                            value="timeline"
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all duration-300 rounded-lg py-2"
                        >
                            Timeline
                        </TabsTrigger>
                        <TabsTrigger
                            value="details"
                            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-slate-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all duration-300 rounded-lg py-2"
                        >
                            Detailed Logs
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="shadow-sm border border-gray-200">
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold text-gray-900">Daily Cost
                                        Trend</CardTitle>
                                    <CardDescription className="text-gray-500">Cost breakdown over
                                        time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {dailyUsage.length === 0 ? (
                                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                                            No daily cost data available for this period.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <AreaChart data={dailyUsage}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={formatDateShort}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    className="text-xs text-gray-500"
                                                />
                                                <YAxis
                                                    tickFormatter={(value) => `$${value}`}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    className="text-xs text-gray-500"
                                                />
                                                <Tooltip
                                                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                                                    contentStyle={{
                                                        borderRadius: '0.75rem',
                                                        borderColor: '#e5e7eb',
                                                        background: '#fff',
                                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                    }}
                                                    labelFormatter={(label) => `Date: ${format(new Date(label), 'PPP')}`}
                                                    formatter={(value: number, name: string) => [`${formatCurrency(value)}`, 'Cost']}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="cost"
                                                    stroke={CHART_COLORS.google}
                                                    fill={CHART_COLORS.google}
                                                    fillOpacity={0.3}
                                                    name="Daily Cost"
                                                    strokeWidth={2}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border border-gray-200">
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold text-gray-900">Token Usage by
                                        Day</CardTitle>
                                    <CardDescription className="text-gray-500">Input and output tokens over
                                        time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {dailyUsage.length === 0 ? (
                                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                                            No daily token data available for this period.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={dailyUsage} barCategoryGap="15%">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false}/>
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={formatDateShort}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    className="text-xs text-gray-500"
                                                />
                                                <YAxis
                                                    tickFormatter={(value) => `${formatNumber(value)}`}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    className="text-xs text-gray-500"
                                                />
                                                <Tooltip
                                                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                                                    contentStyle={{
                                                        borderRadius: '0.75rem',
                                                        borderColor: '#e5e7eb',
                                                        background: '#fff',
                                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                    }}
                                                    labelFormatter={(label) => `Date: ${format(new Date(label), 'PPP')}`}
                                                    formatter={(value: number, name: string) => [`${formatNumber(value)} tokens`, name === 'tokensInput' ? 'Input Tokens' : 'Output Tokens']}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{paddingTop: '10px'}}/>
                                                <Bar dataKey="tokensInput" stackId="a" fill={CHART_COLORS.input}
                                                     name="Input Tokens" radius={[4, 4, 0, 0]}/>
                                                <Bar dataKey="tokensOutput" stackId="a" fill={CHART_COLORS.output}
                                                     name="Output Tokens" radius={[4, 4, 0, 0]}/>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="shadow-sm border border-gray-200">
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold text-gray-900">Cost by
                                        Provider</CardTitle>
                                    <CardDescription className="text-gray-500">Distribution of costs across
                                        providers</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {costByProviderData.length === 0 || costByProviderData.every(d => d.cost === 0) ? (
                                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                                            No cost data by provider for this period.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={costByProviderData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({
                                                                provider,
                                                                percent
                                                            }) => `${provider} (${(percent * 100).toFixed(0)}%)`}
                                                    outerRadius={100}
                                                    innerRadius={60}
                                                    paddingAngle={2}
                                                    dataKey="cost"
                                                    nameKey="provider"
                                                    stroke="none"
                                                >
                                                    {costByProviderData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`}
                                                              fill={getProviderRechartsColor(entry.provider)}/>
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: '0.75rem',
                                                        borderColor: '#e5e7eb',
                                                        background: '#fff',
                                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                    }}
                                                    formatter={(value: number) => formatCurrency(value)}
                                                />
                                                <Legend iconType="circle" layout="vertical" align="right"
                                                        verticalAlign="middle" wrapperStyle={{paddingLeft: '20px'}}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border border-gray-200">
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold text-gray-900">Request Status
                                        Distribution</CardTitle>
                                    <CardDescription className="text-gray-500">Success vs. failure rates for API
                                        calls</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {requestStatusData.every(d => d.value === 0) ? (
                                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                                            No request status data available for this period.
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={requestStatusData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({
                                                                name,
                                                                percent
                                                            }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                    outerRadius={100}
                                                    innerRadius={60}
                                                    paddingAngle={2}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    nameKey="name"
                                                    stroke="none"
                                                >
                                                    {requestStatusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color}/>
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        borderRadius: '0.75rem',
                                                        borderColor: '#e5e7eb',
                                                        background: '#fff',
                                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                    }}
                                                    formatter={(value: number) => `${formatNumber(value)} requests`}
                                                />
                                                <Legend iconType="circle" layout="vertical" align="right"
                                                        verticalAlign="middle" wrapperStyle={{paddingLeft: '20px'}}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="models" className="space-y-4">
                        <Card className="shadow-sm border border-gray-200">
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold text-gray-900">Model Performance &
                                    Costs</CardTitle>
                                <CardDescription className="text-gray-500">Detailed breakdown by AI
                                    model</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-gray-50">
                                            <TableRow>
                                                <TableHead className="font-semibold text-gray-700">Provider</TableHead>
                                                <TableHead className="font-semibold text-gray-700">Model</TableHead>
                                                <TableHead
                                                    className="text-right font-semibold text-gray-700">Requests</TableHead>
                                                <TableHead
                                                    className="text-right font-semibold text-gray-700">Tokens</TableHead>
                                                <TableHead
                                                    className="text-right font-semibold text-gray-700">Cost</TableHead>
                                                <TableHead className="text-right font-semibold text-gray-700">Avg
                                                    Latency</TableHead>
                                                <TableHead className="text-right font-semibold text-gray-700">Cost/1K
                                                    Tokens</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {modelUsage.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                                                        No model usage data for selected filters.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                modelUsage.map((model) => (
                                                    <TableRow key={`${model.provider}-${model.model}`}
                                                              className="hover:bg-gray-50 transition-colors duration-150">
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className={cn("w-2.5 h-2.5 rounded-full", getProviderBadgeColor(model.provider).split(' ')[0])}/>
                                                                <span
                                                                    className="font-medium text-gray-800">{model.provider}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell
                                                            className="font-medium text-gray-900">{model.model}</TableCell>
                                                        <TableCell
                                                            className="text-right text-gray-700">{formatNumber(model.requests)}</TableCell>
                                                        <TableCell
                                                            className="text-right text-gray-700">{formatNumber(model.tokens)}</TableCell>
                                                        <TableCell
                                                            className="text-right text-gray-700">{formatCurrency(model.cost)}</TableCell>
                                                        <TableCell
                                                            className="text-right text-gray-700">{model.avgLatency.toFixed(0)}ms</TableCell>
                                                        <TableCell className="text-right text-gray-700">
                                                            {formatCurrency(model.costPer1KT)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="timeline" className="space-y-4">
                        <Card className="shadow-sm border border-gray-200">
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold text-gray-900">Usage Timeline
                                    (Daily)</CardTitle>
                                <CardDescription className="text-gray-500">Daily distribution of API calls and average
                                    latency</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {dailyUsage.length === 0 ? (
                                    <div className="h-[400px] flex items-center justify-center text-gray-500">
                                        No daily usage data available for this period.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart data={dailyUsage}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={formatDateShort}
                                                axisLine={false}
                                                tickLine={false}
                                                className="text-xs text-gray-500"
                                            />
                                            <YAxis
                                                yAxisId="requests"
                                                orientation="left"
                                                tickFormatter={(value) => formatNumber(value)}
                                                axisLine={false}
                                                tickLine={false}
                                                className="text-xs text-gray-500"
                                                domain={[0, 'auto']}
                                            />
                                            <YAxis
                                                yAxisId="latency"
                                                orientation="right"
                                                tickFormatter={(value) => `${value}ms`}
                                                axisLine={false}
                                                tickLine={false}
                                                className="text-xs text-gray-500"
                                                domain={[0, 'auto']}
                                            />
                                            <Tooltip
                                                cursor={{strokeDasharray: '3 3'}}
                                                contentStyle={{
                                                    borderRadius: '0.75rem',
                                                    borderColor: '#e5e7eb',
                                                    background: '#fff',
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                }}
                                                labelFormatter={(label) => `Date: ${format(new Date(label), 'PPP')}`}
                                                formatter={(value: number, name: string) => {
                                                    if (name === 'requests') return [`${formatNumber(value)}`, 'Requests'];
                                                    if (name === 'avgLatency') return [`${value.toFixed(0)}ms`, 'Avg Latency'];
                                                    return [`${value}`, name];
                                                }}
                                            />
                                            <Legend iconType="circle" wrapperStyle={{paddingTop: '10px'}}/>
                                            <Line
                                                yAxisId="requests"
                                                type="monotone"
                                                dataKey="requests"
                                                stroke={CHART_COLORS.requests}
                                                name="Daily Requests"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                            <Line
                                                yAxisId="latency"
                                                type="monotone"
                                                dataKey="avgLatency"
                                                stroke={CHART_COLORS.latency}
                                                name="Avg Latency"
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="details" className="space-y-4">
                        <Card className="shadow-sm border border-gray-200">
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold text-gray-900">Detailed Usage
                                    Logs</CardTitle>
                                <CardDescription className="text-gray-500">Individual API call records with full
                                    details</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-gray-50">
                                            <TableRow>
                                                <TableHead
                                                    className="font-semibold text-gray-700 min-w-[140px]">Timestamp</TableHead>
                                                <TableHead className="font-semibold text-gray-700 min-w-[120px]">Request
                                                    ID</TableHead>
                                                <TableHead
                                                    className="font-semibold text-gray-700 min-w-[160px]">Model</TableHead>
                                                <TableHead
                                                    className="font-semibold text-gray-700 min-w-[120px]">Project</TableHead>
                                                <TableHead
                                                    className="text-right font-semibold text-gray-700 min-w-[140px]">Tokens</TableHead>
                                                <TableHead
                                                    className="text-right font-semibold text-gray-700 min-w-[100px]">Cost</TableHead>
                                                <TableHead
                                                    className="text-right font-semibold text-gray-700 min-w-[100px]">Latency</TableHead>
                                                <TableHead
                                                    className="text-center font-semibold text-gray-700 min-w-[80px]">Status</TableHead>
                                                <TableHead
                                                    className="text-center font-semibold text-gray-700 min-w-[80px]">Cache</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {usage.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="h-24 text-center text-gray-500">
                                                        No detailed usage logs for selected filters.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                usage.slice(0, 100).map((record) => (
                                                    <TableRow key={record.id}
                                                              className="hover:bg-gray-50 transition-colors duration-150">
                                                        <TableCell
                                                            className="text-xs text-gray-700">{formatDateTime(record.timestamp)}</TableCell>
                                                        <TableCell className="font-mono text-xs text-gray-700">
                                                            <span
                                                                title={record.requestId}>{record.requestId.slice(0, 8)}...</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getProviderBadgeColor(record.provider))}
                                                                >
                                                                    {record.provider}
                                                                </Badge>
                                                                <span
                                                                    className="text-sm font-medium text-gray-900">{record.model}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-gray-700">
                                                            {record.project?.name ||
                                                                <span className="text-gray-400">-</span>}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-right text-gray-700">
                                                            <div className="flex flex-col items-end leading-tight">
                                                                <span
                                                                    className="text-blue-600 font-medium">↓ {formatNumber(record.tokensInput)}</span>
                                                                <span
                                                                    className="text-green-600">↑ {formatNumber(record.tokensOutput)}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell
                                                            className="text-sm text-right font-medium text-gray-900">{formatCurrency(record.totalCost)}</TableCell>
                                                        <TableCell
                                                            className="text-sm text-right text-gray-700">{record.latency.toFixed(0)}ms</TableCell>
                                                        <TableCell className="text-center">
                                                            {record.success ? (
                                                                <span title="Success">
      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" aria-label="Success"/>
    </span>
                                                            ) : (
                                                                <span title="Failed">
      <XCircle className="w-5 h-5 text-red-500 mx-auto" aria-label="Failed"/>
    </span>
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="text-center">
                                                            {record.cached ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "text-xs font-medium px-2 py-0.5 rounded-full",
                                                                        record.cacheHit ? 'bg-purple-100 text-purple-700 ring-purple-600/20' : 'bg-gray-100 text-gray-700 ring-gray-600/20'
                                                                    )}
                                                                >
                                                                    {record.cacheHit ? 'Hit' : 'Miss'}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {usage.length > 100 && (
                                    <div className="mt-4 text-center text-sm text-gray-500">
                                        Showing first 100 of {usage.length} records. Apply filters or export for full
                                        data.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </motion.div>
    );
}