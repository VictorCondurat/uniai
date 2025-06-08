'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { useProjectContext } from '@/contexts/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, BarChart3, Clock, Zap, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

const StatCard = ({ title, value, icon: Icon, description }: {
    title: string;
    value: string;
    icon: React.ElementType;
    description?: string;
}) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </CardContent>
    </Card>
);

const SpendingLimitCard = ({ stats }: { stats: any }) => {
    if (!stats?.overview?.totalSpendingLimit) return null;

    const { totalSpent, totalSpendingLimit, percentageOfLimit, spendingLimitExceeded } = stats.overview;
    const remaining = Math.max(totalSpendingLimit - totalSpent, 0);
    const percentage = Math.min(percentageOfLimit || 0, 100);

    const colorClass = spendingLimitExceeded
        ? 'text-red-600'
        : percentage > 80
            ? 'text-yellow-600'
            : 'text-green-600';

    return (
        <Card className={spendingLimitExceeded ? 'border-red-500' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    Spending Limit
                    {spendingLimitExceeded && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                        <span className={`text-2xl font-bold ${colorClass}`}>
                            ${totalSpent.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            of ${totalSpendingLimit.toFixed(2)}
                        </span>
                    </div>
                    <div className="space-y-1">
                        <Progress
                            value={percentage}
                            className="h-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{percentage.toFixed(1)}% used</span>
                            <span>
                                {spendingLimitExceeded
                                    ? `Exceeded by $${(totalSpent - totalSpendingLimit).toFixed(2)}`
                                    : `$${remaining.toFixed(2)} remaining`
                                }
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default function ProjectUsagePage() {
    const { project, can } = useProjectContext();
    const [days, setDays] = useState(30);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjectStats = useCallback(async () => {
        if (!project?.id || !can('usage:read')) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${project.id}/stats?days=${days}`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to fetch statistics');
            }
            setStats(await res.json());
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
            setError(errorMessage);
            toast.error('Failed to load stats', { description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, [project?.id, days, can]);

    useEffect(() => {
        fetchProjectStats();
    }, [fetchProjectStats]);

    const dailyUsageData = useMemo(() => {
        if (!stats?.dailyUsage) return [];
        return stats.dailyUsage.map((d: any) => ({
            date: format(new Date(d.date), 'MMM dd'),
            Cost: parseFloat(d.cost).toFixed(4),
            Requests: d.requests,
        })).reverse();
    }, [stats]);

    const totalCostForPeriod = useMemo(() => {
        if (!stats?.overview?.periodCost) return 0;
        return stats.overview.periodCost;
    }, [stats]);

    if (!can('usage:read')) {
        return (
            <Card>
                <CardHeader><CardTitle>Permission Denied</CardTitle></CardHeader>
                <CardContent><p>You do not have permission to view usage for this project.</p></CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Usage Analytics</h2>
                    <p className="text-muted-foreground">Showing data for the last {days} days.</p>
                </div>
                <div className="flex items-center gap-2">
                    {[7, 30, 90].map(d => (
                        <Button key={d} variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>{d} Days</Button>
                    ))}
                </div>
            </div>
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
            ) : error ? (
                <div className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> {error}
                </div>
            ) : stats && (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total Requests"
                            value={stats.overview.totalRequests.toLocaleString()}
                            icon={Zap}
                        />
                        <StatCard
                            title={`Cost (${days} days)`}
                            value={`$${totalCostForPeriod.toFixed(2)}`}
                            icon={BarChart3}
                            description={`All-time: $${stats.overview.totalSpent.toFixed(2)}`}
                        />
                        <StatCard
                            title="Avg. Latency"
                            value={`${stats.overview.averageLatency.toFixed(0)} ms`}
                            icon={Clock}
                        />
                        <StatCard
                            title="Success Rate"
                            value={`${stats.overview.successRate.toFixed(1)}%`}
                            icon={Zap}
                        />
                    </div>

                    {stats.overview.totalSpendingLimit && (
                        <SpendingLimitCard stats={stats} />
                    )}

                    {stats.costProjection && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Cost Projections</CardTitle>
                                <CardDescription>Based on current usage patterns</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Daily Average</p>
                                        <p className="text-xl font-bold">${stats.costProjection.daily.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Weekly Projection</p>
                                        <p className="text-xl font-bold">${stats.costProjection.weekly.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Monthly Projection</p>
                                        <p className="text-xl font-bold">${stats.costProjection.monthly.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Yearly Projection</p>
                                        <p className="text-xl font-bold">${stats.costProjection.yearly.toFixed(2)}</p>
                                    </div>
                                </div>
                                {stats.overview.totalSpendingLimit && (
                                    <p className="text-sm text-muted-foreground mt-4">
                                        At current rate, spending limit will be reached in approximately{' '}
                                        <span className="font-semibold">
                                            {Math.max(
                                                Math.floor((stats.overview.totalSpendingLimit - stats.overview.totalSpent) / stats.costProjection.daily),
                                                0
                                            )} days
                                        </span>
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Daily Activity</CardTitle>
                    <CardDescription>Cost and request volume over time.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    {isLoading ? <Skeleton className="h-full w-full" /> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyUsageData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip formatter={(value, name) => name === 'Cost' ? `$${parseFloat(value as string).toFixed(4)}` : value} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="Cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="right" dataKey="Requests" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Usage by Model</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Model</TableHead>
                                <TableHead>Provider</TableHead>
                                <TableHead className="text-right">Requests</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && stats?.usageByModel.map((item: any) => (
                                <TableRow key={item.model}>
                                    <TableCell className="font-medium">{item.model}</TableCell>
                                    <TableCell>{item.provider}</TableCell>
                                    <TableCell className="text-right">{item._count.id.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">${item._sum.totalCost.toFixed(4)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}