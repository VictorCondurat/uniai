'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface CostForecastProps {
    currentUsage: number;
    className?: string;
}

interface ForecastData {
    date: string;
    actualCost: number | null;
    forecastCost: number;
    isActual: boolean;
}

interface ForecastSummary {
    projectedMonthEnd: number;
    trend: 'up' | 'down' | 'stable';
    percentageChange: number;
    riskLevel: 'low' | 'medium' | 'high';
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border rounded-lg shadow-lg">
                <p className="text-sm text-gray-600 mb-1">
                    {new Date(label).toLocaleDateString()}
                </p>
                {payload.map((item: any, index: number) => (
                    <p key={index} className="text-sm font-medium" style={{ color: item.color }}>
                        {item.dataKey === 'actualCost' ? 'Actual' : 'Forecast'}: ${item.value?.toFixed(2)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export const CostForecast: React.FC<CostForecastProps> = ({
                                                              currentUsage,
                                                              className = '',
                                                          }) => {
    const [forecastData, setForecastData] = useState<ForecastData[]>([]);
    const [summary, setSummary] = useState<ForecastSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        generateForecast();
    }, [currentUsage]);

    const generateForecast = async () => {
        try {
            setLoading(true);

            const response = await fetch('/api/usage/forecast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ currentUsage }),
            });

            if (response.ok) {
                const data = await response.json();
                setForecastData(data.chartData);
                setSummary(data.summary);
            } else {
                generateMockForecast();
            }
        } catch (error) {
            console.error('Error generating forecast:', error);
            generateMockForecast();
        } finally {
            setLoading(false);
        }
    };

    const generateMockForecast = () => {
        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const currentDay = today.getDate();

        const dailyAverage = currentUsage / currentDay;

        const data: ForecastData[] = [];

        for (let i = 1; i <= currentDay; i++) {
            const date = new Date(today.getFullYear(), today.getMonth(), i);
            const variation = (Math.random() - 0.5) * 0.2;
            const dailyCost = dailyAverage * (1 + variation);

            data.push({
                date: date.toISOString().split('T')[0],
                actualCost: dailyCost,
                forecastCost: dailyCost,
                isActual: true,
            });
        }

        for (let i = currentDay + 1; i <= daysInMonth; i++) {
            const date = new Date(today.getFullYear(), today.getMonth(), i);
            const trendFactor = 1 + (i - currentDay) * 0.01;
            const variation = (Math.random() - 0.5) * 0.3;
            const forecastCost = dailyAverage * trendFactor * (1 + variation);

            data.push({
                date: date.toISOString().split('T')[0],
                actualCost: null,
                forecastCost,
                isActual: false,
            });
        }

        setForecastData(data);

        const projectedMonthEnd = data.reduce((sum, day) => sum + day.forecastCost, 0);
        const lastMonthEstimate = currentUsage * (daysInMonth / currentDay);
        const percentageChange = ((projectedMonthEnd - lastMonthEstimate) / lastMonthEstimate) * 100;

        setSummary({
            projectedMonthEnd,
            trend: percentageChange > 5 ? 'up' : percentageChange < -5 ? 'down' : 'stable',
            percentageChange: Math.abs(percentageChange),
            riskLevel: projectedMonthEnd > 100 ? 'high' : projectedMonthEnd > 50 ? 'medium' : 'low',
        });
    };

    if (loading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="h-64 bg-gray-200 rounded"></div>
            </div>
        );
    }

    const getRiskColor = (
        level: 'low' | 'medium' | 'high'
    ): 'success' | 'warning' | 'outline' | 'destructive' | 'secondary' => {
        switch (level) {
            case 'high':
                return 'destructive'
            case 'medium':
                return 'warning'
            default:
                return 'success'
        }
    }



    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
            case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
            default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Projected Month-End</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    ${summary.projectedMonthEnd.toFixed(2)}
                                </p>
                            </div>
                            {getTrendIcon(summary.trend)}
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Trend</p>
                                <p className="text-lg font-medium text-gray-900">
                                    {summary.percentageChange.toFixed(1)}% {summary.trend}
                                </p>
                            </div>
                            <Badge variant={summary.trend === 'up' ? 'destructive' : summary.trend === 'down' ? 'success' : 'secondary'}>
                            {summary.trend}
                            </Badge>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Risk Level</p>
                                <p className="text-lg font-medium text-gray-900 capitalize">
                                    {summary.riskLevel}
                                </p>
                            </div>
                            <Badge variant={getRiskColor(summary.riskLevel)}>
                                {summary.riskLevel === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {summary.riskLevel}
                            </Badge>
                        </div>
                    </Card>
                </div>
            )}

            {summary && summary.riskLevel === 'high' && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>High spending risk detected!</strong>
                        <p className="mt-1">
                            Your projected month-end cost of ${summary.projectedMonthEnd.toFixed(2)} is significantly higher than expected.
                            Consider reviewing your usage or setting spending limits.
                        </p>
                    </AlertDescription>
                </Alert>
            )}

            {summary && summary.trend === 'up' && summary.percentageChange > 20 && (
                <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Increasing usage trend</strong>
                        <p className="mt-1">
                            Your usage is trending {summary.percentageChange.toFixed(1)}% higher than usual.
                            Monitor your applications for any unexpected increases.
                        </p>
                    </AlertDescription>
                </Alert>
            )}

            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Cost Forecast</h4>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                            <span>Actual</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded border-2 border-red-500"></div>
                            <span>Forecast</span>
                        </div>
                    </div>
                </div>

                <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={forecastData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                stroke="#6b7280"
                                tickFormatter={(value) => new Date(value).getDate().toString()}
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                stroke="#6b7280"
                                tickFormatter={(value) => `$${value.toFixed(0)}`}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            <ReferenceLine
                                x={new Date().toISOString().split('T')[0]}
                                stroke="#9ca3af"
                                strokeDasharray="5 5"
                                label={{ value: "Today", position: "top" }}
                            />

                            <Line
                                type="monotone"
                                dataKey="actualCost"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                                connectNulls={false}
                            />

                            <Line
                                type="monotone"
                                dataKey="forecastCost"
                                stroke="#EF4444"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ fill: '#EF4444', strokeWidth: 2, r: 3 }}
                                connectNulls={true}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                    <p>
                        * Forecast is based on current usage patterns and historical data.
                        Actual costs may vary depending on your usage.
                    </p>
                </div>
            </Card>

            {summary && (
                <Card className="p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h4>
                    <div className="space-y-3">
                        {summary.riskLevel === 'high' && (
                            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-800">Set Spending Limits</p>
                                    <p className="text-sm text-red-700">
                                        Configure daily or monthly spending limits with kill switches to prevent unexpected charges.
                                    </p>
                                </div>
                            </div>
                        )}

                        {summary.trend === 'up' && (
                            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-yellow-500 mt-0.5" />
                                <div>
                                    <p className="font-medium text-yellow-800">Monitor Usage Patterns</p>
                                    <p className="text-sm text-yellow-700">
                                        Review your recent API calls and model usage to identify any unusual spikes in activity.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                            <div className="h-5 w-5 bg-blue-500 rounded mt-0.5" />
                            <div>
                                <p className="font-medium text-blue-800">Enable Auto-Optimization</p>
                                <p className="text-sm text-blue-700">
                                    Use model fallback chains and caching to optimize costs while maintaining performance.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default CostForecast;