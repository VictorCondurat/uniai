'use client';

import {useState, useEffect} from 'react';
import axios from 'axios';
import {Card} from '@/components/ui/card';
import {motion} from 'framer-motion';
import {
    Activity, Database, CreditCard, Key, ArrowUpRight, ArrowDownRight,
    AlertCircle, Zap, CheckCircle, AlertTriangle, Sparkle, Wind,
} from 'lucide-react';
import {Progress} from "@/components/ui/progress";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import Link from 'next/link';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';

interface PercentageChanges {
    cost: number;
    requests: number;
    tokens: number;
}

interface KeyStats {
    total: number;
    active: number;
    inactive: number;
}

interface TopModel {
    model: string;
    count: number;
}

interface CachePerformance {
    hits: number;
    costSaved: number;
}

interface RecentFailure {
    model: string;
    timestamp: string;
    endpoint: string;
}

interface Latency {
    p50: number;
    p90: number;
    p95: number;
}

interface OverviewData {
    totalRequests: number;
    totalTokens: number;
    currentCost: number;
    keysInUse: number;
    percentageChanges: PercentageChanges;
    keyStats: KeyStats;
    topModels: TopModel[];
    cachePerformance: CachePerformance;
    recentFailures: RecentFailure[];
    latency: Latency;
}

const StatCard = ({title, value, icon: Icon, color, children}: {
    title: string; value: string | number; icon: React.ElementType; color: string; children?: React.ReactNode;
}) => (
    <motion.div variants={{hidden: {opacity: 0, y: 20}, visible: {opacity: 1, y: 0}}} className="relative">
        <Card
            className="p-5 h-full relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 group">
            <div
                className={`absolute -top-4 -right-4 w-28 h-28 bg-gradient-to-bl ${color} rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300`}/>
            <div className="relative flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center justify-between mb-2"><h3
                        className="text-sm font-medium text-gray-600">{title}</h3><Icon
                        className={`w-6 h-6 ${color.replace('from-', 'text-').split(' ')[0]} flex-shrink-0`}/></div>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                </div>
                <div className="mt-1">{children}</div>
            </div>
        </Card>
    </motion.div>
);

const formatPercentageChange = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) return <p className="text-sm text-gray-500">vs last month</p>;
    const isPositive = value >= 0;
    const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    return <p className={`text-sm ${colorClass} flex items-center gap-1 font-medium`}><Icon
        className="w-4 h-4"/>{value.toFixed(1)}% vs last month</p>;
};

export function DashboardOverview() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<OverviewData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOverviewData = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await axios.get<OverviewData>('/api/dashboard/overview');
                setData(response.data);
            } catch (err) {
                const message = axios.isAxiosError(err) && err.response ? `Failed to load data: ${err.response.statusText}` : 'An unexpected error occurred.';
                setError(message);
                console.error('Error fetching overview data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOverviewData();
    }, []);

    const cardContainerVariants = {visible: {transition: {staggerChildren: 0.07}}};

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                    <Card key={i}
                          className={cn("p-5 shadow-sm animate-pulse min-h-[140px]", i >= 4 && "lg:col-span-2")}>
                        <div className="h-5 bg-gray-200 rounded w-3/5 mb-3"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </Card>
                ))}
            </div>
        );
    }
    if (error) {
        return <motion.div initial={{opacity: 0, y: -20}} animate={{opacity: 1, y: 0}}
                           className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0"/><span className="font-medium">{error}</span></motion.div>;
    }
    if (!data) {
        return <div className="text-center py-20 bg-gray-50 rounded-xl"><Zap
            className="mx-auto w-12 h-12 text-gray-300"/><h3 className="mt-2 text-lg font-medium text-gray-800">No
            Activity Yet</h3><p className="mt-1 text-sm text-gray-500">Once you make API calls, your overview stats will
            appear here.</p><Link href="/dashboard/dev-console"><Button className="mt-4">Run Simulation</Button></Link>
        </div>;
    }

    const totalTopModelRequests = data.topModels.reduce((sum, m) => sum + m.count, 0) || 1;

    return (
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" initial="hidden" animate="visible"
                    variants={cardContainerVariants}>
            <StatCard title="Total Requests" value={data.totalRequests.toLocaleString()} icon={Activity}
                      color="from-blue-400">{formatPercentageChange(data.percentageChanges.requests)}</StatCard>
            <StatCard title="Total Tokens"
                      value={data.totalTokens >= 1_000_000 ? `${(data.totalTokens / 1_000_000).toFixed(1)}M` : `${(data.totalTokens / 1_000).toFixed(1)}K`}
                      icon={Database}
                      color="from-purple-400">{formatPercentageChange(data.percentageChanges.tokens)}</StatCard>
            <StatCard title="Current Month Cost" value={`$${data.currentCost.toFixed(2)}`} icon={CreditCard}
                      color="from-green-400">{formatPercentageChange(data.percentageChanges.cost)}</StatCard>

            <StatCard title="API Health" value={data.recentFailures.length > 0 ? "Warning" : "Healthy"}
                      icon={data.recentFailures.length > 0 ? AlertTriangle : CheckCircle}
                      color={data.recentFailures.length > 0 ? "from-red-400" : "from-teal-400"}>
                <TooltipProvider><Tooltip><TooltipTrigger asChild><p
                    className="text-sm text-gray-600 flex items-center gap-1">P90: <span
                    className="font-bold">{data.latency.p90}ms</span></p></TooltipTrigger><TooltipContent><p>90% of
                    requests in the last 24h were faster than this.</p></TooltipContent></Tooltip></TooltipProvider>
            </StatCard>
            <motion.div variants={{hidden: {opacity: 0, y: 20}, visible: {opacity: 1, y: 0}}} className="lg:col-span-2">
                <Card className="p-5 h-full shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-100 rounded-lg"><Key className="w-5 h-5 text-emerald-600"/></div>
                        <h3 className="font-semibold text-gray-800">Key Management</h3></div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Active Keys</span>
                            <span className="font-bold">{data.keyStats.active} / {data.keyStats.total}</span>
                        </div>
                        <Progress value={(data.keyStats.active / (data.keyStats.total || 1)) * 100} className="h-2"/>
                        <div className="text-xs text-gray-500 flex justify-between">
                            <span>{data.keysInUse} used this month</span>
                            <span>{data.keyStats.inactive} inactive</span>
                        </div>
                    </div>
                </Card>
            </motion.div>

            <motion.div variants={{hidden: {opacity: 0, y: 20}, visible: {opacity: 1, y: 0}}} className="lg:col-span-2">
                <Card className="p-5 h-full shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-cyan-100 rounded-lg"><Sparkle className="w-5 h-5 text-cyan-600"/></div>
                        <h3 className="font-semibold text-gray-800">Top Models (This Month)</h3></div>
                    <div className="space-y-2">
                        {data.topModels.length > 0 ? data.topModels.map(model => (
                            <TooltipProvider key={model.model}><Tooltip><TooltipTrigger className="w-full text-left">
                                <div className="flex items-center text-sm">
                                    <span className="w-1/3 truncate text-gray-600">{model.model}</span>
                                    <div className="w-2/3"><Progress
                                        value={(model.count / totalTopModelRequests) * 100}
                                        className="[&>[data-state='complete']]:bg-cyan-500"
                                    /></div>
                                </div>
                            </TooltipTrigger><TooltipContent><p>{model.count.toLocaleString()} requests</p>
                            </TooltipContent></Tooltip></TooltipProvider>
                        )) : <p className="text-sm text-gray-500 text-center py-4">No model usage this month.</p>}
                    </div>
                </Card>
            </motion.div>

            <motion.div variants={{hidden: {opacity: 0, y: 20}, visible: {opacity: 1, y: 0}}} className="lg:col-span-4">
                <Card
                    className="p-5 h-full shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-center bg-gray-50/50">
                    <div className="lg:col-span-1 flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 rounded-lg"><Wind className="w-6 h-6 text-indigo-600"/></div>
                        <div><h3 className="font-semibold text-gray-800">Cache Performance</h3><p
                            className="text-xs text-gray-500">Your built-in cost-saver</p></div>
                    </div>
                    <div className="text-center"><p className="text-sm text-gray-500">Cache Hits</p><p
                        className="text-2xl font-bold text-indigo-600">{data.cachePerformance.hits.toLocaleString()}</p>
                    </div>
                    <div className="text-center"><p className="text-sm text-gray-500">Est. Cost Saved</p><p
                        className="text-2xl font-bold text-green-600">${data.cachePerformance.costSaved.toFixed(2)}</p>
                    </div>
                    {data.recentFailures.length > 0 && (
                        <div
                            className="text-center md:col-span-2 lg:col-span-1 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-4 border-dashed">
                            <p className="text-sm text-red-500 font-semibold">Recent Failures</p><p
                            className="text-xs text-gray-500">{data.recentFailures.length} in last 7d. <Link
                            href="/dashboard/audit-logs" className="underline hover:text-red-600">View logs</Link></p>
                        </div>
                    )}
                </Card>
            </motion.div>
        </motion.div>
    );
}